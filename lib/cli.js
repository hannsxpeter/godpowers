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

const SRC_DIR = path.resolve(__dirname, '..');
const VERSION = require('../package.json').version;
const VALUE_OPTIONS = new Set(['project', 'name', 'goal', 'verify', 'claim', 'timeout', 'summary', 'waive']);
// Options `verify` keeps for itself after a quoted command.
const VERIFY_OPTIONS = new Set(['claim', 'timeout', 'waive', 'project', 'json']);
const COMMANDS = ['init', 'status', 'verify', 'record', 'gate', 'lint', 'migrate', 'clean', 'doctor', 'budget', 'hook', 'help', 'version'];

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
  verify --waive "<reason>"             record that no automated check covers the current code
  record <review|harden|ship> --pass|--fail --summary "<text>"
  gate ship [--json]                    release gate: checks, review, security, open critical risks
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
        if (eq !== -1) opts[key] = token.slice(eq + 1);
        else if (i + 1 < argv.length) opts[key] = argv[++i];
        else throw new Error(`--${key} needs a value`);
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

/** Quote one shell word so the command runs exactly as it was typed. */
function quoteArg(arg) {
  if (/^[A-Za-z0-9_/.,:=@%+-]+$/.test(arg)) return arg;
  if (process.platform === 'win32') return `"${arg.replace(/"/g, '\\"')}"`;
  return `'${arg.replace(/'/g, "'\\''")}'`;
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
      const { record, run } = await evidence.verify(root, cmd, { claim: opts.claim, timeoutSeconds: opts.timeout });
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
      const record = evidence.attest(projectRoot(opts), kind, { pass: opts.pass === true, summary: opts.summary });
      print(io.out, asJson ? record : `Recorded ${kind} ${record.verdict} (${record.id}) for the current code.`, asJson);
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
      const result = gate.shipGate(root);
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
