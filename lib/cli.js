/**
 * Command-line interface. `bin/godpowers.js` calls `main`.
 */

const fs = require('fs');
const path = require('path');
const tty = require('tty');

const { RUNTIMES, runtimeKeys } = require('./runtimes');
const install = require('./install');
const { findProjectRoot, cliCommand } = require('./paths');
const initTools = require('./init');
const migrateTools = require('./migrate');
const evidence = require('./evidence');
const gate = require('./gate');
const lint = require('./lint');
const status = require('./status');
const doctorTools = require('./doctor');
const budget = require('./budget');
const hooks = require('./hooks');
const stateStore = require('./state');
const context = require('./context');
const gitTools = require('./git');
const reviewTools = require('./reviews');
const statsTools = require('./stats');
const docs = require('./docs');
const fastTools = require('./fast');
const testGuard = require('./testguard');
const riskTools = require('./risk');

const { quoteArg } = fastTools;

const SRC_DIR = path.resolve(__dirname, '..');
const VERSION = require('../package.json').version;
const VALUE_OPTIONS = new Set(['project', 'name', 'goal', 'verify', 'claim', 'timeout', 'summary', 'waive', 'dismiss', 'base']);
// Value options that may repeat; their values collect into an array.
const LIST_OPTIONS = new Set(['dismiss']);
// Options `verify` keeps for itself after a quoted command.
const VERIFY_OPTIONS = new Set(['claim', 'timeout', 'waive', 'project', 'json', 'force']);
const NO_BASE = 'No base to compare against: no v* tag is reachable from HEAD. Pass --base <ref>.';
const COMMANDS = ['init', 'status', 'verify', 'record', 'gate', 'lint', 'migrate', 'clean', 'doctor', 'budget', 'reviews', 'stats', 'fast', 'tests', 'risk', 'hook', 'help', 'version'];

const HELP = `godpowers ${VERSION}: durable project state, evidence-backed "done", and gates enforced by hooks.

Install (default: Claude Code, global):
  npx godpowers --claude --global       also --codex, --cursor, ... or --all; --local for this directory
  npx godpowers --claude --uninstall

Project commands (run inside a repo):
  init [--verify "<cmd>"] [--goal "<text>"] [--no-agents-md]   create .godpowers/
  migrate [--dry-run]                   move a 6.x project to the 7 layout (archives, deletes nothing)
  clean [--dry-run]                     remove 6.x instruction blocks from AGENTS.md, CLAUDE.md, rule files
  status [--json]                       stage, evidence freshness, open risks, next step
  verify "<cmd>" [--claim "<text>"]     run a check and record the result against the current code
  verify "<cmd>" --force                run even if the same check already passed on this code
  verify --waive "<reason>"             record that no automated check covers the current code
  record <review|harden|ship> --pass|--fail --summary "<text>"
  record review ... --dismiss "<finding>: <reason>"   (repeatable) note a finding you chose not to fix
  reviews [--json]                      review rounds since the last passing review
  stats [--json]                        check runs, recovery time, waivers, and review rounds from the ledger
  fast [files...] [--timeout s] [--json]  run the STATE.md "fast:" check on the files (default: changed and untracked); never recorded
  fast --hook                           PostToolUse handler: reads the hook JSON on stdin, checks the edited file, silent unless it fails (exit 2)
  tests [--base <ref>] [--json]         flag deleted tests, fewer tests or assertions, and added skip markers since the base (default: latest v* tag)
  risk [--base <ref>] [--json]          classify the change since the base as low, normal, or high risk
  gate ship [--base <ref>] [--json]     release gate by risk tier: check, then review (normal), then security (high), open critical risks
  lint [--notes] [--json]               validate .godpowers/ files (the commit hook runs this)
  doctor [--json]                       installed hosts, registered hooks, 6.x leftovers
  budget [--json]                       prompt size of the shipped skills and agents

Options: --project <path> (default: nearest directory with .godpowers/), --json, -h, --version
Docs: https://github.com/hannsxpeter/godpowers#readme`;

/**
 * Parse argv into { command, args, opts, runtimes, verifyMode }.
 *
 * `verify` takes its command in one of two forms:
 *   quoted: `verify "npm test" --claim x`   the first argument is the whole
 *           command; later godpowers options still apply
 *   split:  `verify pytest -k "not slow"`   everything after the first word
 *           belongs to the command, including flags such as --timeout
 */
function parseArgs(argv) {
  const opts = {};
  const args = [];
  const runtimes = [];
  let command = null;
  let verifyMode = null;
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (verifyMode === 'split') {
      args.push(token);
      continue;
    }
    if (token === '--') {
      args.push(...argv.slice(i + 1));
      break;
    }
    if (token.startsWith('--')) {
      const eq = token.indexOf('=');
      const key = eq === -1 ? token.slice(2) : token.slice(2, eq);
      if (verifyMode === 'quoted' && !VERIFY_OPTIONS.has(key)) {
        args.push(token);
      } else if (RUNTIMES[key]) {
        runtimes.push(key);
      } else if (VALUE_OPTIONS.has(key)) {
        let value;
        if (eq !== -1) value = token.slice(eq + 1);
        else if (i + 1 < argv.length) value = argv[++i];
        else throw new Error(`--${key} needs a value`);
        if (LIST_OPTIONS.has(key)) opts[key] = [...(opts[key] || []), value];
        else opts[key] = value;
      } else if (eq !== -1) {
        throw new Error(`--${key} does not take a value`);
      } else {
        opts[key] = true;
      }
      continue;
    }
    if (/^-[a-z]$/.test(token) && !verifyMode) {
      const map = { '-g': 'global', '-l': 'local', '-u': 'uninstall', '-h': 'help', '-v': 'version' };
      if (!map[token]) throw new Error(`unknown option ${token}`);
      opts[map[token]] = true;
      continue;
    }
    if (command === null && args.length === 0) {
      command = token;
      continue;
    }
    args.push(token);
    if (command === 'verify' && !verifyMode) verifyMode = /\s/.test(token) ? 'quoted' : 'split';
  }
  return { command, args, opts, runtimes, verifyMode };
}

/** Rebuild the command string for `verify` from parsed arguments. */
function verifyCommand(parsed) {
  const { args, verifyMode } = parsed;
  if (!args.length) return null;
  if (verifyMode === 'quoted') return [args[0], ...args.slice(1).map(quoteArg)].join(' ');
  return args.map(quoteArg).join(' ');
}

function projectRoot(opts) {
  return opts.project ? path.resolve(String(opts.project)) : findProjectRoot(process.cwd());
}

function print(out, value, asJson) {
  out.write(`${asJson ? JSON.stringify(value, null, 2) : value}\n`);
}

/**
 * `fast --hook`: the handler for a PostToolUse hook the user registers. It
 * stays silent and exits 0 unless the check fails (exit 2, with the output on
 * stderr, which Claude Code shows to the agent). Any internal error fails open.
 */
async function runFastHook(opts, io) {
  try {
    const root = projectRoot(opts);
    const file = fastTools.hookFile(root, io.readStdin());
    const result = await fastTools.fast(root, { files: file ? [file] : [], timeoutSeconds: opts.timeout });
    if (!result.declared || result.skipped || result.run.ok) return 0;
    const { command, files, run } = result;
    const noun = `${files.length} file${files.length === 1 ? '' : 's'}`;
    const how = run.timedOut ? 'timed out' : `exit ${run.exit}`;
    io.err.write(`${run.tail ? `${run.tail.trimEnd()}\n\n` : ''}godpowers fast FAILED: ${command} (${noun}, ${how})\n`);
    return 2;
  } catch (error) {
    io.err.write(`godpowers fast --hook: skipped (${error.message})\n`);
    return 0;
  }
}

function runInstall(parsed, io) {
  const { opts } = parsed;
  let keys = opts.all ? runtimeKeys() : parsed.runtimes;
  if (!keys.length) {
    if (!io.isTTY) throw new Error('no host selected. Re-run with a target, for example: npx godpowers --claude --global');
    keys = ['claude'];
  }
  const base = opts.local && !opts.global ? process.cwd() : undefined;
  for (const key of keys) {
    if (opts.uninstall) {
      const result = install.uninstall(key, { base });
      io.out.write(`${result.runtime.name}: ${result.removed.length ? `removed ${result.removed.join(', ')}` : 'nothing to remove'}\n`);
      continue;
    }
    const result = install.install(key, { srcDir: SRC_DIR, base, local: Boolean(base) });
    io.out.write(`${result.runtime.name}: ${result.skills.length} skills -> ${result.runtime.skillsDir}, ${result.agents.length} agents -> ${result.runtime.agentsDir}\n`);
    if (result.hooks) io.out.write(`  hooks registered in ${result.hooks}${key === 'codex' ? ' (open /hooks in Codex once to trust them)' : ''}\n`);
    if (result.legacy.length) io.out.write(`  removed 6.x leftovers: ${result.legacy.length}\n`);
  }
  if (!opts.uninstall) io.out.write(`\nDone. In a repo, run /god-init (or: npx godpowers init), then /god.\n`);
  return 0;
}

async function runCommand(parsed, io) {
  const { command, args, opts } = parsed;
  const asJson = Boolean(opts.json);
  switch (command) {
    case 'help':
      print(io.out, HELP);
      return 0;
    case 'version':
      print(io.out, VERSION);
      return 0;
    case 'init': {
      const root = opts.project ? path.resolve(String(opts.project)) : process.cwd();
      const result = initTools.init(root, { project: opts.name, goal: opts.goal, verify: opts.verify, agentsMd: !opts['no-agents-md'] });
      if (asJson) {
        print(io.out, result, true);
        return result.status === 'legacy' ? 1 : 0;
      }
      if (result.status === 'exists') print(io.out, 'Already initialized: .godpowers/STATE.md exists.');
      else if (result.status === 'legacy') print(io.out, `This is a Godpowers 6 project. Run \`${cliCommand()} migrate --dry-run\` first.`);
      else print(io.out, `Created .godpowers/ (STATE.md, DECISIONS.md, evidence.jsonl). AGENTS.md note: ${result.agents}.\nVerify command: ${result.verify || '(none detected; set "verify:" in STATE.md)'}`);
      return result.status === 'legacy' ? 1 : 0;
    }
    case 'migrate': {
      const root = projectRoot(opts);
      const result = migrateTools.migrate(root, { dryRun: Boolean(opts['dry-run']), agentsMd: !opts['no-agents-md'] });
      if (asJson) {
        print(io.out, result, true);
        return result.ok ? 0 : 1;
      }
      if (!result.ok) {
        print(io.out, `Nothing to migrate: ${result.reason}.`);
        return 1;
      }
      const lines = [
        `${opts['dry-run'] ? 'Would migrate' : 'Migrated'} ${result.project} to the Godpowers 7 layout.`,
        `  stage: ${result.stage}; verify: ${result.verify || '(none detected)'}`,
        `  archive: ${result.moves.length} item(s) -> ${path.relative(root, result.archiveDir)}/`,
        ...result.context.map(a => `  ${a.action} ${a.file}`)
      ];
      if (opts['dry-run']) lines.push('Run again without --dry-run to apply.');
      print(io.out, lines.join('\n'));
      return 0;
    }
    case 'clean': {
      const root = opts.project ? path.resolve(String(opts.project)) : process.cwd();
      const actions = context.cleanLegacy(root, { dryRun: Boolean(opts['dry-run']) });
      if (asJson) print(io.out, actions, true);
      else if (!actions.length) print(io.out, 'No Godpowers 6 instruction blocks found.');
      else print(io.out, `${actions.map(a => `${opts['dry-run'] ? 'would be ' : ''}${a.action} ${a.file}`).join('\n')}`);
      return 0;
    }
    case 'status': {
      const info = status.collect(projectRoot(opts));
      print(io.out, asJson ? info : status.formatStatus(info), asJson);
      return 0;
    }
    case 'verify': {
      const root = projectRoot(opts);
      if (opts.waive !== undefined) {
        const record = evidence.waive(root, opts.waive === true ? '' : opts.waive);
        print(io.out, asJson ? record : `Recorded waiver ${record.id} for the current code.`, asJson);
        return 0;
      }
      const cmd = verifyCommand(parsed) || (stateStore.read(root) || { data: {} }).data.verify;
      if (!cmd || cmd === 'none') throw new Error('verify needs a command, for example: godpowers verify "npm test"');
      const { tree, code } = gitTools.fingerprints(root, docs.forRoot(root));
      if (!opts.force) {
        const reused = evidence.findReusable(evidence.readAll(root).records, tree, cmd);
        if (reused) {
          print(io.out, asJson ? { reused: true, record: reused } : `Reused passing record ${reused.id} from ${reused.time}: ${cmd} already passed on this code. Use --force to run it again.`, asJson);
          return 0;
        }
      }
      const { record, run } = await evidence.verify(root, cmd, { claim: opts.claim, timeoutSeconds: opts.timeout, tree, code });
      if (asJson) {
        print(io.out, record, true);
        return record.ok ? 0 : 1;
      }
      const verdict = record.ok ? 'PASS' : 'FAIL';
      const notes = [
        record.tree ? '' : ' (not a git repo: not bound to code)',
        record.changedDuringRun ? '\nFiles changed while the check ran, so this result covers the code as it was before. Run verify again to cover the current code.' : ''
      ].join('');
      print(io.out, `${run.tail ? `${run.tail.trimEnd()}\n\n` : ''}${verdict}: ${cmd} (exit ${record.exit}, ${(record.ms / 1000).toFixed(1)}s) recorded as ${record.id}${notes}`);
      return record.ok ? 0 : 1;
    }
    case 'record': {
      const kind = args[0];
      if (Boolean(opts.pass) === Boolean(opts.fail)) throw new Error('record needs exactly one of --pass or --fail');
      const root = projectRoot(opts);
      const before = kind === 'review' ? evidence.reviewHistory(evidence.readAll(root).records) : null;
      const record = evidence.attest(root, kind, { pass: opts.pass === true, summary: opts.summary, dismissed: opts.dismiss });
      if (asJson) {
        print(io.out, record, true);
        return 0;
      }
      const lines = [`Recorded ${kind} ${record.verdict} (${record.id}) for the current code.`];
      if (before) {
        lines[0] += ` Review round ${before.rounds.length + 1} since the last pass.`;
        const warning = record.verdict === 'fail' ? reviewTools.roundsWarning(before.failedSinceLastPass + 1) : '';
        if (warning) lines.push(warning);
      }
      print(io.out, lines.join('\n'));
      return 0;
    }
    case 'reviews': {
      const history = evidence.reviewHistory(evidence.readAll(projectRoot(opts)).records);
      print(io.out, asJson ? history : reviewTools.formatReviews(history), asJson);
      return 0;
    }
    case 'stats': {
      const root = projectRoot(opts);
      const stats = statsTools.compute(evidence.readAll(root).records, { command: (stateStore.read(root) || { data: {} }).data.verify });
      print(io.out, asJson ? stats : statsTools.formatStats(stats), asJson);
      return 0;
    }
    case 'fast': {
      if (opts.hook) return runFastHook(opts, io);
      const root = projectRoot(opts);
      const result = await fastTools.fast(root, { files: args, timeoutSeconds: opts.timeout });
      if (!result.declared) {
        print(io.out, asJson ? { command: null, error: fastTools.HOW_TO_DECLARE } : fastTools.HOW_TO_DECLARE, asJson);
        return 2;
      }
      const { command, files, run } = result;
      if (result.skipped) {
        print(io.out, asJson ? { command, files, exit: 0, ok: true, timedOut: false, ms: 0, tail: '' } : 'No changed files: nothing to check.', asJson);
        return 0;
      }
      if (asJson) {
        print(io.out, { command, files, exit: run.exit, ok: run.ok, timedOut: run.timedOut, ms: run.ms, tail: run.tail }, true);
      } else {
        const noun = `${files.length} file${files.length === 1 ? '' : 's'}`;
        const seconds = (run.ms / 1000).toFixed(1);
        const verdict = run.ok ? `PASS: ${command} (${noun}, ${seconds}s)` : `FAIL: ${command} (${noun}, ${seconds}s, ${run.timedOut ? 'timed out' : `exit ${run.exit}`})`;
        print(io.out, `${run.tail ? `${run.tail.trimEnd()}\n\n` : ''}${verdict}`);
      }
      return run.ok ? 0 : run.exit > 0 ? run.exit : 1;
    }
    case 'tests': {
      const root = projectRoot(opts);
      const base = gitTools.baseFor(root, opts.base);
      if (!base) {
        print(io.out, asJson ? { base: null, findings: [], error: NO_BASE } : NO_BASE, asJson);
        return 2;
      }
      const findings = testGuard.compute(root, base);
      print(io.out, asJson ? { base, findings } : testGuard.formatReport(base, findings), asJson);
      return findings.length ? 1 : 0;
    }
    case 'risk': {
      const root = projectRoot(opts);
      const result = riskTools.classify(root, { base: gitTools.baseFor(root, opts.base) });
      print(io.out, asJson ? result : riskTools.formatRisk(result), asJson);
      return 0;
    }
    case 'gate': {
      const name = args[0] || 'ship';
      const root = projectRoot(opts);
      if (name === 'stop') {
        const result = gate.stopGate(root);
        print(io.out, asJson ? result : result.block ? result.reason : `ok: ${result.reason}`, asJson);
        return result.block ? 1 : 0;
      }
      if (name !== 'ship') throw new Error('gate must be "ship" or "stop"');
      const result = gate.shipGate(root, { base: opts.base });
      if (asJson) {
        print(io.out, result, true);
        return result.ok ? 0 : 1;
      }
      const mark = { ok: '+', error: 'x', warning: '!' };
      print(io.out, [...result.checks.map(c => `${mark[c.severity]} ${c.name.padEnd(10)} ${c.detail}`), '', result.ok ? 'Ship gate: PASS' : 'Ship gate: BLOCKED'].join('\n'));
      return result.ok ? 0 : 1;
    }
    case 'lint': {
      const result = lint.lintProject(projectRoot(opts));
      print(io.out, asJson ? result : lint.formatLint(result, { showNotes: Boolean(opts.notes) }), asJson);
      return result.errors ? 1 : 0;
    }
    case 'doctor': {
      const result = doctorTools.doctor({ srcDir: SRC_DIR, project: projectRoot(opts) });
      print(io.out, asJson ? result : doctorTools.formatDoctor(result), asJson);
      return 0;
    }
    case 'budget': {
      const result = budget.measure(SRC_DIR);
      print(io.out, asJson ? result : budget.formatBudget(result), asJson);
      return result.violations.length ? 1 : 0;
    }
    case 'hook': {
      const result = hooks.runHook(args[0], io.readStdin());
      if (result.stdout) io.out.write(`${result.stdout}\n`);
      return 0;
    }
    default:
      throw new Error(`unknown command "${command}". Run: npx godpowers --help`);
  }
}

// Read hook input from fd 0. Touching process.stdin would switch the fd to
// non-blocking mode and make large or late payloads read as empty, so this
// reads the descriptor directly and waits out EAGAIN for up to 10 seconds.
function readStdin() {
  if (tty.isatty(0)) return '';
  const chunks = [];
  const buffer = Buffer.alloc(1 << 16);
  const deadline = Date.now() + 10000;
  for (;;) {
    let bytes;
    try {
      bytes = fs.readSync(0, buffer, 0, buffer.length, null);
    } catch (error) {
      if (error.code === 'EAGAIN' && Date.now() < deadline) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
        continue;
      }
      break;
    }
    if (bytes === 0) break;
    chunks.push(Buffer.from(buffer.subarray(0, bytes)));
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function main(argv = process.argv.slice(2), io = {}) {
  const streams = { out: io.out || process.stdout, err: io.err || process.stderr, isTTY: io.isTTY !== undefined ? io.isTTY : tty.isatty(0), readStdin: io.readStdin || readStdin };
  let parsed;
  try {
    parsed = parseArgs(argv);
    if (parsed.opts.help) {
      print(streams.out, HELP);
      return 0;
    }
    if (parsed.opts.version && !parsed.command) {
      print(streams.out, VERSION);
      return 0;
    }
    if (parsed.command && !COMMANDS.includes(parsed.command)) {
      throw new Error(`unknown command "${parsed.command}". Run: npx godpowers --help`);
    }
    if (!parsed.command) return runInstall(parsed, streams);
    return await runCommand(parsed, streams);
  } catch (error) {
    streams.err.write(`godpowers: ${error.message}\n`);
    return 2;
  }
}

module.exports = { HELP, COMMANDS, parseArgs, quoteArg, verifyCommand, readStdin, main };
