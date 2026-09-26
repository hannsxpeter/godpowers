#!/usr/bin/env node

/**
 * A/B harness: run the same tasks with and without Godpowers and compare.
 *
 *   node scripts/ab-eval.js <config.json> [--dry-run] [--keep] [--out <dir>]
 *
 * Each task runs once per arm (times `repeat`) in its own detached git
 * worktree. For every run the harness records wall time, the agent's token and
 * cost report when its output includes one, the task's verify result, the
 * diff size, and the optional reviewer output. It writes results.json and a
 * summary.md with blank columns for what only a person can judge: how often
 * they had to step in, and whether they would ship the result.
 * See docs/ab-eval.md for the config format.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function shellQuote(text) {
  return `'${String(text).replace(/'/g, `'\\''`)}'`;
}

function fill(template, prompt) {
  return String(template).split('{prompt}').join(prompt);
}

function sh(command, { cwd, env, timeoutMs }) {
  const started = Date.now();
  const result = spawnSync(command, {
    cwd,
    shell: true,
    encoding: 'utf8',
    env: { ...process.env, ...(env || {}) },
    timeout: timeoutMs,
    maxBuffer: 256 * 1024 * 1024
  });
  return {
    exit: typeof result.status === 'number' ? result.status : -1,
    timedOut: Boolean(result.error && result.error.code === 'ETIMEDOUT'),
    ms: Date.now() - started,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
}

function jsonObjects(text) {
  const found = [];
  const whole = text.trim();
  if (!whole) return found;
  try {
    found.push(JSON.parse(whole));
    return found;
  } catch (_) {
    // Fall back to one JSON object per line (JSONL output).
  }
  for (const line of whole.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    try {
      found.push(JSON.parse(trimmed));
    } catch (_) {
      // Not JSON; ignore.
    }
  }
  return found;
}

/**
 * Pull token and cost numbers out of agent output. Understands Claude Code's
 * `--output-format json` result object and Codex `exec --json` token events.
 */
function extractUsage(stdout) {
  const usage = { input: null, output: null, cacheRead: null, cacheWrite: null, costUsd: null, turns: null };
  for (const obj of jsonObjects(stdout)) {
    if (obj.type === 'result' && obj.usage) {
      usage.input = obj.usage.input_tokens ?? usage.input;
      usage.output = obj.usage.output_tokens ?? usage.output;
      usage.cacheRead = obj.usage.cache_read_input_tokens ?? usage.cacheRead;
      usage.cacheWrite = obj.usage.cache_creation_input_tokens ?? usage.cacheWrite;
      usage.costUsd = obj.total_cost_usd ?? usage.costUsd;
      usage.turns = obj.num_turns ?? usage.turns;
    }
    const info = (obj.payload && obj.payload.info) || obj.info || (obj.msg && obj.msg.info);
    const total = info && info.total_token_usage;
    if (total) {
      usage.input = total.input_tokens ?? usage.input;
      usage.output = total.output_tokens ?? usage.output;
      usage.cacheRead = total.cached_input_tokens ?? usage.cacheRead;
    }
    if (obj.type === 'turn.completed' && obj.usage) {
      usage.input = (usage.input || 0) + (obj.usage.input_tokens || 0);
      usage.output = (usage.output || 0) + (obj.usage.output_tokens || 0);
      usage.cacheRead = (usage.cacheRead || 0) + (obj.usage.cached_input_tokens || 0);
    }
  }
  return usage;
}

function diffStat(worktree) {
  sh('git add -A', { cwd: worktree });
  const stat = sh('git diff --cached --shortstat', { cwd: worktree }).stdout.trim();
  const number = re => {
    const match = re.exec(stat);
    return match ? Number(match[1]) : 0;
  };
  return { files: number(/(\d+) files? changed/), insertions: number(/(\d+) insertions?/), deletions: number(/(\d+) deletions?/) };
}

function loadConfig(file) {
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(config.tasks) || !config.tasks.length) throw new Error('config needs a non-empty "tasks" array');
  if (!config.arms || !Object.keys(config.arms).length) throw new Error('config needs an "arms" object');
  for (const task of config.tasks) {
    for (const key of ['id', 'repo', 'prompt', 'verify']) {
      if (!task[key]) throw new Error(`task is missing "${key}"`);
    }
  }
  for (const [name, arm] of Object.entries(config.arms)) {
    if (!arm.command || !arm.command.includes('{prompt}')) throw new Error(`arm "${name}" needs a command containing {prompt}`);
  }
  return { repeat: 1, ...config };
}

function planRuns(config) {
  const runs = [];
  for (const task of config.tasks) {
    for (const [armName, arm] of Object.entries(config.arms)) {
      for (let n = 1; n <= config.repeat; n++) {
        const prompt = fill(arm.prompt || '{prompt}', task.prompt);
        runs.push({ task, armName, arm, n, prompt, command: fill(arm.command, shellQuote(prompt)) });
      }
    }
  }
  return runs;
}

function runOne(run, config, outDir, { keep = false } = {}) {
  const { task, armName, arm, n } = run;
  const slug = `${task.id}-${armName}-${n}`.replace(/[^A-Za-z0-9_.-]/g, '_');
  const worktree = path.join(outDir, 'worktrees', slug);
  const add = sh(`git worktree add --detach ${shellQuote(worktree)} ${shellQuote(task.ref || 'HEAD')}`, { cwd: task.repo });
  if (add.exit !== 0) throw new Error(`git worktree add failed for ${slug}: ${add.stderr.trim()}`);
  try {
    if (task.setup) sh(task.setup, { cwd: worktree, timeoutMs: 30 * 60 * 1000 });
    const timeoutMs = (task.timeoutMinutes || config.timeoutMinutes || 60) * 60 * 1000;
    const agent = sh(run.command, { cwd: worktree, env: arm.env, timeoutMs });
    fs.writeFileSync(path.join(outDir, `${slug}.agent.txt`), `${agent.stdout}\n--- stderr ---\n${agent.stderr}`);
    const verify = sh(task.verify, { cwd: worktree, timeoutMs: 30 * 60 * 1000 });
    const diff = diffStat(worktree);
    let reviewFile = null;
    if (config.review) {
      const review = sh(config.review, { cwd: worktree, timeoutMs: 60 * 60 * 1000 });
      reviewFile = `${slug}.review.txt`;
      fs.writeFileSync(path.join(outDir, reviewFile), `${review.stdout}\n--- stderr ---\n${review.stderr}`);
    }
    return {
      task: task.id,
      arm: armName,
      n,
      agentExit: agent.exit,
      agentTimedOut: agent.timedOut,
      minutes: Math.round(agent.ms / 600) / 100,
      usage: extractUsage(agent.stdout),
      verify: verify.exit === 0 ? 'pass' : 'fail',
      diff,
      reviewFile,
      worktree: keep ? worktree : null
    };
  } finally {
    if (!keep) sh(`git worktree remove --force ${shellQuote(worktree)}`, { cwd: task.repo });
  }
}

function summarize(results) {
  const fmt = value => (value === null || value === undefined ? '-' : String(value));
  const lines = [
    '# A/B results',
    '',
    'Fill in the last two columns yourself: how many times you had to step in, and whether you would ship the result.',
    '',
    '| Task | Arm | Run | Verify | Minutes | Input tok | Output tok | Cache read | Cost USD | Files | +/- | Review | Interventions | Ship? |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'
  ];
  for (const r of results) {
    lines.push(`| ${r.task} | ${r.arm} | ${r.n} | ${r.verify} | ${r.minutes} | ${fmt(r.usage.input)} | ${fmt(r.usage.output)} | ${fmt(r.usage.cacheRead)} | ${fmt(r.usage.costUsd)} | ${r.diff.files} | +${r.diff.insertions}/-${r.diff.deletions} | ${r.reviewFile || '-'} |  |  |`);
  }
  return `${lines.join('\n')}\n`;
}

function parseCli(argv) {
  const opts = { dryRun: false, keep: false, out: null, config: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') opts.dryRun = true;
    else if (argv[i] === '--keep') opts.keep = true;
    else if (argv[i] === '--out') opts.out = argv[++i];
    else opts.config = argv[i];
  }
  return opts;
}

function main(argv = process.argv.slice(2), out = process.stdout) {
  const opts = parseCli(argv);
  if (!opts.config) {
    out.write('usage: node scripts/ab-eval.js <config.json> [--dry-run] [--keep] [--out <dir>]\n');
    return 2;
  }
  const config = loadConfig(opts.config);
  const runs = planRuns(config);
  if (opts.dryRun) {
    for (const run of runs) out.write(`${run.task.id} / ${run.armName} #${run.n}: (in ${run.task.repo} @ ${run.task.ref || 'HEAD'}) ${run.command}\n`);
    return 0;
  }
  const outDir = path.resolve(opts.out || path.join(os.tmpdir(), `godpowers-ab-${Date.now()}`));
  fs.mkdirSync(path.join(outDir, 'worktrees'), { recursive: true });
  const results = [];
  for (const run of runs) {
    out.write(`running ${run.task.id} / ${run.armName} #${run.n}\n`);
    results.push(runOne(run, config, outDir, { keep: opts.keep }));
  }
  fs.writeFileSync(path.join(outDir, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, 'summary.md'), summarize(results));
  out.write(`\nWrote ${path.join(outDir, 'summary.md')}\n`);
  return 0;
}

if (require.main === module) process.exitCode = main();

module.exports = { shellQuote, fill, extractUsage, loadConfig, planRuns, runOne, summarize, main };
