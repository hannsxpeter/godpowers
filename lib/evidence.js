/**
 * Evidence ledger: `.godpowers/evidence.jsonl`.
 *
 * Only the CLI writes this file. Each line is one record bound to the
 * fingerprint of the code it describes, and chained to the previous record by
 * digest so casual hand edits are detectable. The chain is tamper-evident, not
 * tamper-proof: anyone who can rewrite the file can recompute it. Chain breaks
 * from merging two branches are expected and reported as warnings.
 *
 * Record kinds:
 *   verify  a command that was actually executed, with its exit code
 *   waive   an explicit statement that no automated check covers this code
 *   review, harden, ship   attested outcomes of those stages (pass or fail)
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const { projectFiles } = require('./paths');
const gitTools = require('./git');

const KINDS = ['verify', 'waive', 'review', 'harden', 'ship'];
const ATTEST_KINDS = ['review', 'harden', 'ship'];
// Bumped whenever the fingerprint algorithm changes, so old records never
// match new fingerprints by accident.
const FP_VERSION = 1;
const TAIL_CHARS = 3000;
const DEFAULT_TIMEOUT_SECONDS = 900;
const MAX_TIMEOUT_SECONDS = 24 * 60 * 60;
const EXIT_GRACE_MS = 500;

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).filter(key => value[key] !== undefined).sort()
    .map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}

function digestOf(record) {
  const { digest, ...rest } = record;
  return `sha256:${crypto.createHash('sha256').update(canonical(rest), 'utf8').digest('hex')}`;
}

/** Mask common secret shapes before output lands on disk. Not exhaustive. */
function redact(text) {
  return String(text == null ? '' : text)
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----|$)/g, '[redacted private key]')
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, '[redacted]')
    .replace(/\bgithub_pat_[A-Za-z0-9_]{20,}/g, '[redacted]')
    .replace(/\bgh[pousr]_[A-Za-z0-9]{16,}/g, '[redacted]')
    .replace(/\b(sk|rk|pk)_(live|test)_[A-Za-z0-9]{10,}/g, '[redacted]')
    .replace(/\bsk-[A-Za-z0-9_-]{16,}/g, '[redacted]')
    .replace(/\bxox[baprs]-[A-Za-z0-9-]{10,}/g, '[redacted]')
    .replace(/\b(AKIA|ASIA)[0-9A-Z]{16}\b/g, '[redacted]')
    .replace(/\bnpm_[A-Za-z0-9]{30,}/g, '[redacted]')
    .replace(/(\b[a-z][a-z0-9+.-]*:\/\/)[^\s:/@]+:[^\s@/]+@/gi, '$1[redacted]@')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/-]{10,}=*/g, '$1[redacted]')
    .replace(/((?:api[_-]?key|token|secret|password|passwd|aws_secret_access_key)["']?\s*[:=]\s*["']?)[^\s"',;]{6,}/gi, '$1[redacted]');
}

/**
 * Read every record. Problems have a severity: 'error' for records that are
 * not valid or were edited, 'warning' for chain breaks (merges, removals).
 */
function readAll(root) {
  const file = projectFiles(root).evidence;
  const records = [];
  const problems = [];
  if (!fs.existsSync(file)) return { records, problems };
  let prev = null;
  fs.readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
    if (line.trim() === '') return;
    let record;
    try {
      record = JSON.parse(line);
    } catch (_) {
      problems.push({ line: index + 1, severity: 'error', message: 'not valid JSON' });
      return;
    }
    if (!record || typeof record !== 'object' || !KINDS.includes(record.kind) || !record.id || !record.time) {
      problems.push({ line: index + 1, severity: 'error', message: 'record is missing kind, id, or time' });
      return;
    }
    if (record.digest !== digestOf(record)) {
      problems.push({ line: index + 1, severity: 'error', message: 'digest does not match the record (edited by hand?)' });
    } else if ((record.prev || null) !== prev) {
      problems.push({ line: index + 1, severity: 'warning', message: 'chain break (usually a merge of two branches, or a removed record)' });
    }
    prev = record.digest || null;
    records.push(record);
  });
  return { records, problems };
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function withLock(file, fn) {
  const lock = `${file}.lock`;
  const deadline = Date.now() + 5000;
  for (;;) {
    try {
      fs.writeFileSync(lock, String(process.pid), { flag: 'wx' });
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const stat = fs.statSync(lock, { throwIfNoEntry: false });
      if (stat && Date.now() - stat.mtimeMs > 30000) fs.rmSync(lock, { force: true });
      else if (Date.now() > deadline) throw new Error(`evidence ledger is locked: ${lock}`);
      else sleep(50);
    }
  }
  try {
    return fn();
  } finally {
    fs.rmSync(lock, { force: true });
  }
}

function append(root, fields) {
  const file = projectFiles(root).evidence;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return withLock(file, () => {
    const { records } = readAll(root);
    const last = records[records.length - 1];
    const record = {
      v: 1,
      fp: FP_VERSION,
      id: `ev_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`,
      time: new Date().toISOString(),
      ...fields,
      prev: last ? last.digest || null : null
    };
    record.digest = digestOf(record);
    fs.appendFileSync(file, `${JSON.stringify(record)}\n`);
    return record;
  });
}

function keepTail(buffer, chunk) {
  const next = buffer + chunk;
  return next.length > TAIL_CHARS * 2 ? next.slice(-TAIL_CHARS * 2) : next;
}

/** Redact first, then cut, then drop a leading partial line. */
function finalTail(output) {
  const redacted = redact(output);
  if (redacted.length <= TAIL_CHARS) return redacted;
  const cut = redacted.slice(-TAIL_CHARS);
  const newline = cut.indexOf('\n');
  return newline === -1 ? cut : cut.slice(newline + 1);
}

function normalizeTimeout(value) {
  if (value === undefined || value === null) return DEFAULT_TIMEOUT_SECONDS;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > MAX_TIMEOUT_SECONDS) {
    throw new Error(`--timeout must be a number of seconds between 1 and ${MAX_TIMEOUT_SECONDS}`);
  }
  return seconds;
}

function killTree(child, signal) {
  try {
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F']);
    else process.kill(-child.pid, signal);
  } catch (_) {
    // The process group already exited.
  }
}

/**
 * Run a shell command, keeping only the output tail. The command runs in its
 * own process group; a timeout or a signal to this process ends the group.
 */
function runCommand(command, { cwd, timeoutSeconds } = {}) {
  const seconds = normalizeTimeout(timeoutSeconds);
  return new Promise(resolve => {
    const started = Date.now();
    let output = '';
    let timedOut = false;
    let done = false;
    const child = spawn(command, {
      cwd,
      shell: true,
      detached: process.platform !== 'win32',
      env: { ...process.env, GODPOWERS_VERIFY: '1' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];
    const onSignal = signal => {
      killTree(child, 'SIGTERM');
      process.exit(signal === 'SIGINT' ? 130 : 143);
    };
    for (const signal of signals) process.on(signal, onSignal);
    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child, 'SIGTERM');
      setTimeout(() => killTree(child, 'SIGKILL'), 5000).unref();
    }, seconds * 1000);
    child.stdout.on('data', chunk => { output = keepTail(output, chunk.toString('utf8')); });
    child.stderr.on('data', chunk => { output = keepTail(output, chunk.toString('utf8')); });
    const finish = (code, error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      for (const signal of signals) process.removeListener(signal, onSignal);
      let exit = typeof code === 'number' ? code : -1;
      if (timedOut) {
        exit = -1;
        output += `\n(timed out after ${seconds} seconds)`;
      }
      if (error) output += `\n(${error.message})`;
      child.stdout.destroy();
      child.stderr.destroy();
      resolve({ exit, ok: exit === 0 && !timedOut, timedOut, ms: Date.now() - started, tail: finalTail(output) });
    };
    child.on('error', error => finish(-1, error));
    child.on('close', code => finish(code));
    // A background process started by the command can hold the output pipes
    // open after the command itself exits; stop waiting shortly after exit.
    child.on('exit', code => setTimeout(() => finish(code), EXIT_GRACE_MS).unref());
  });
}

/**
 * Execute `command` in the project and record the result. The record is bound
 * to the code as it was when the check started; if files changed while it ran
 * (a formatter, or another agent), `changedDuringRun` is set and the check
 * must run again to cover the new state.
 */
async function verify(root, command, { claim, timeoutSeconds } = {}) {
  if (!command || !String(command).trim()) throw new Error('verify needs a command, for example: godpowers verify "npm test"');
  normalizeTimeout(timeoutSeconds);
  const treeBefore = gitTools.treeFingerprint(root);
  const run = await runCommand(command, { cwd: root, timeoutSeconds });
  const treeAfter = gitTools.treeFingerprint(root);
  const record = append(root, {
    kind: 'verify',
    tree: treeBefore,
    ...(treeBefore !== treeAfter ? { treeAfter, changedDuringRun: true } : {}),
    command: redact(command),
    claim: claim ? redact(claim).slice(0, 500) : null,
    exit: run.exit,
    ok: run.ok,
    timedOut: run.timedOut,
    ms: run.ms,
    tail: run.tail
  });
  return { record, run };
}

function waive(root, reason) {
  if (!reason || !String(reason).trim()) throw new Error('waive needs a reason');
  return append(root, { kind: 'waive', tree: gitTools.treeFingerprint(root), reason: redact(reason).slice(0, 500) });
}

function attest(root, kind, { pass, summary }) {
  if (!ATTEST_KINDS.includes(kind)) throw new Error(`record kind must be one of: ${ATTEST_KINDS.join(', ')}`);
  if (typeof pass !== 'boolean') throw new Error('record needs --pass or --fail');
  if (!summary || !String(summary).trim()) throw new Error('record needs --summary "<one line>"');
  return append(root, {
    kind,
    tree: gitTools.treeFingerprint(root),
    verdict: pass ? 'pass' : 'fail',
    summary: redact(summary).slice(0, 500)
  });
}

/**
 * Evidence status for one fingerprint:
 *   check:  'pass' | 'fail' | 'waived' | 'none'   (last counted verify or waive)
 *   review, harden, ship: 'pass' | 'fail' | 'none' (last attestation)
 * When `command` is given (the project's declared check), only verify records
 * of that command count; other checks are recorded but do not satisfy gates.
 */
function statusFor(records, tree, { command } = {}) {
  const result = { check: 'none', review: 'none', harden: 'none', ship: 'none', lastCheck: null };
  if (!tree) return result;
  const declared = command && command !== 'none' ? redact(command) : null;
  for (const record of records) {
    if (record.tree !== tree || (record.fp || 0) !== FP_VERSION) continue;
    if (record.kind === 'verify') {
      if (declared && record.command !== declared) continue;
      result.check = record.ok ? 'pass' : 'fail';
      result.lastCheck = record;
    } else if (record.kind === 'waive') {
      result.check = 'waived';
      result.lastCheck = record;
    } else if (ATTEST_KINDS.includes(record.kind)) {
      result[record.kind] = record.verdict === 'pass' ? 'pass' : 'fail';
    }
  }
  return result;
}

module.exports = {
  KINDS,
  ATTEST_KINDS,
  FP_VERSION,
  canonical,
  digestOf,
  redact,
  readAll,
  append,
  finalTail,
  normalizeTimeout,
  runCommand,
  verify,
  waive,
  attest,
  statusFor
};
