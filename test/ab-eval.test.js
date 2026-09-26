const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ab = require('../scripts/ab-eval');
const { tempDir, write, gitRepo } = require('./helpers');

const CLAUDE_RESULT = JSON.stringify({ type: 'result', num_turns: 4, total_cost_usd: 0.42, usage: { input_tokens: 1200, output_tokens: 300, cache_read_input_tokens: 9000, cache_creation_input_tokens: 800 } });

function config(repo, overrides = {}) {
  const agents = tempDir('gp-agents-');
  const writer = write(agents, 'writer.js', "require('fs').writeFileSync('out.txt', 'x'); console.log(process.argv[2]);\n");
  const reporter = write(agents, 'reporter.js', `console.log(${JSON.stringify(CLAUDE_RESULT)});\n`);
  return {
    tasks: [{ id: 'task one', repo, prompt: "add a file named out.txt, don't ask", verify: 'test -f out.txt' }],
    arms: {
      native: { command: `node ${ab.shellQuote(writer)} {prompt}` },
      godpowers: { command: `node ${ab.shellQuote(reporter)} {prompt}`, prompt: '/god {prompt}', env: { GODPOWERS_GATE: 'on' } }
    },
    ...overrides
  };
}

test('quoting, templating, and usage extraction', () => {
  assert.equal(ab.shellQuote("it's"), "'it'\\''s'");
  assert.equal(ab.fill('/god {prompt} and {prompt}', 'x'), '/god x and x');
  assert.deepEqual(ab.extractUsage(CLAUDE_RESULT), { input: 1200, output: 300, cacheRead: 9000, cacheWrite: 800, costUsd: 0.42, turns: 4 });
  const codexEvents = [
    JSON.stringify({ type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: 50, output_tokens: 5, cached_input_tokens: 40 } } } }),
    'plain log line',
    '{not json',
    JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 10, output_tokens: 2, cached_input_tokens: 1 } })
  ].join('\n');
  assert.deepEqual(ab.extractUsage(codexEvents), { input: 60, output: 7, cacheRead: 41, cacheWrite: null, costUsd: null, turns: null });
  assert.deepEqual(ab.extractUsage(''), { input: null, output: null, cacheRead: null, cacheWrite: null, costUsd: null, turns: null });
});

test('config validation and run planning', () => {
  const dir = tempDir();
  const bad = (content, pattern) => {
    const file = write(dir, `c-${Math.random()}.json`, JSON.stringify(content));
    assert.throws(() => ab.loadConfig(file), pattern);
  };
  bad({ arms: {} }, /non-empty "tasks"/);
  bad({ tasks: [{ id: 'a', repo: '.', prompt: 'p', verify: 'v' }] }, /"arms" object/);
  bad({ tasks: [{ id: 'a', repo: '.', prompt: 'p' }], arms: { x: { command: '{prompt}' } } }, /missing "verify"/);
  bad({ tasks: [{ id: 'a', repo: '.', prompt: 'p', verify: 'v' }], arms: { x: { command: 'claude -p' } } }, /containing \{prompt\}/);
  const file = write(dir, 'ok.json', JSON.stringify(config('/repo', { repeat: 2 })));
  const runs = ab.planRuns(ab.loadConfig(file));
  assert.equal(runs.length, 4);
  assert.equal(runs[2].prompt, "/god add a file named out.txt, don't ask");
  assert.match(runs[2].command, /'\/god add a file named out\.txt, don'\\''t ask'$/);
});

test('runs each arm in its own worktree and writes results and a summary', () => {
  const repo = gitRepo();
  const dir = tempDir();
  const cfg = config(repo, { review: 'echo reviewed' });
  cfg.arms.godpowers.setup = 'node -e "require(\'fs\').writeFileSync(\'armsetup.txt\', \'x\')"';
  cfg.tasks[0].verify = 'test -f out.txt && echo verified';
  const file = write(dir, 'config.json', JSON.stringify(cfg));
  const out = path.join(dir, 'out');
  let log = '';
  const code = ab.main([file, '--out', out], { write: text => { log += text; } });
  assert.equal(code, 0);
  assert.match(log, /running task one \/ native #1/);
  const results = JSON.parse(fs.readFileSync(path.join(out, 'results.json'), 'utf8'));
  const [native, god] = results;
  assert.equal(native.verify, 'pass');
  assert.equal(native.diff.files, 1);
  assert.equal(god.verify, 'fail');
  assert.deepEqual(god.setupExits, [0]);
  assert.equal(god.diff.files, 1, 'the arm setup ran in its own worktree');
  assert.deepEqual(native.setupExits, []);
  assert.match(fs.readFileSync(path.join(out, 'task_one-native-1.verify.txt'), 'utf8'), /verified/);
  assert.equal(god.usage.costUsd, 0.42);
  assert.equal(god.worktree, null);
  assert.match(fs.readFileSync(path.join(out, god.reviewFile), 'utf8'), /reviewed/);
  const summary = fs.readFileSync(path.join(out, 'summary.md'), 'utf8');
  assert.match(summary, /\| task one \| godpowers \| 1 \| fail \|/);
  assert.match(summary, /Interventions \| Ship\? \|/);
  assert.equal(fs.readdirSync(path.join(out, 'worktrees')).length, 0, 'worktrees are removed');
  assert.equal(fs.existsSync(path.join(repo, 'out.txt')), false, 'the source repo is untouched');
});

test('dry run, keep, usage, and worktree errors', () => {
  const repo = gitRepo();
  const dir = tempDir();
  const file = write(dir, 'config.json', JSON.stringify(config(repo)));
  let log = '';
  assert.equal(ab.main([file, '--dry-run'], { write: text => { log += text; } }), 0);
  assert.match(log, /task one \/ godpowers #1: \(in .* @ HEAD\) node '.*reporter\.js' '\/god add/);
  let usage = '';
  assert.equal(ab.main([], { write: text => { usage += text; } }), 2);
  assert.match(usage, /usage: node scripts\/ab-eval\.js/);
  const kept = path.join(dir, 'kept');
  ab.main([file, '--keep', '--out', kept], { write: () => {} });
  const results = JSON.parse(fs.readFileSync(path.join(kept, 'results.json'), 'utf8'));
  assert.ok(fs.existsSync(results[0].worktree));
  const broken = write(dir, 'broken.json', JSON.stringify(config(repo, { tasks: [{ id: 'x', repo, ref: 'no-such-ref', prompt: 'p', verify: 'true' }] })));
  assert.throws(() => ab.main([broken, '--out', path.join(dir, 'broken')], { write: () => {} }), /git worktree add failed/);
});
