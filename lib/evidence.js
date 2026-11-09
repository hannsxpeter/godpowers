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
const os = require('os');
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

// name = value, where the value is quoted (in full, spaces included) or one word.
const SECRET_ASSIGNMENT = /((?:api[_-]?key|token|secret|password|passwd|aws_secret_access_key)["']?\s*[:=]\s*)(?:"(?:\\.|[^"\\])+"|'(?:\\.|[^'\\])+'|["']?[^\s"',;]{6,})/gi;

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
    .replace(/\bAIza[A-Za-z0-9_-]{35}/g, '[redacted]')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/-]{10,}=*/g, '$1[redacted]')
    .replace(/(Authorization["']?\s*[:=]\s*["']?Basic\s+)[A-Za-z0-9._~+/-]{6,}=*/gi, '$1[redacted]')
    .replace(SECRET_ASSIGNMENT, (found, prefix) => {
      const quote = /^["']/.exec(found.slice(prefix.length));
      return `${prefix}${quote ? quote[0] : ''}[redacted]${quote ? quote[0] : ''}`;
    });
}

/**
 * The machine-local key: 32 random bytes in hex at `$GODPOWERS_HOME/local.key`
 * (default `~/.godpowers`). It never leaves this machine, is not in the repo,
 * and signs the verify records this machine ran, so a record that arrived
 * with a clone or a merge is never taken for one it ran itself.
 */
const KEY_FILE = 'local.key';
const KEY_PATTERN = /^[0-9a-f]{64}$/;

function homeDir() {
  if (process.env.GODPOWERS_HOME) return path.resolve(process.env.GODPOWERS_HOME);
  const home = os.homedir();
  return home ? path.join(home, '.godpowers') : null;
}

/** The key if the file is ours, private, a regular file, and well formed; else null. Never throws. */
function readKey(file) {
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile()) return null;
    if (process.platform !== 'win32') {
      if (stat.mode & 0o077) return null;
      if (typeof process.getuid === 'function' && stat.uid !== process.getuid()) return null;
    }
    const text = fs.readFileSync(file, 'utf8').trim();
    return KEY_PATTERN.test(text) ? text : null;
  } catch (_) {
    return null;
  }
}

/**
 * The local key, or null when there is none to trust. With `create`, a
 * missing key is made (directory 0700, file 0600, exclusive create). Any
 * failure gives null, and callers then run checks without reuse.
 */
function localKey({ create = false } = {}) {
  try {
    const dir = homeDir();
    if (!dir) return null;
    const file = path.join(dir, KEY_FILE);
    const existing = readKey(file);
    if (existing || !create) return existing;
    if (!fs.existsSync(file)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      try {
        fs.writeFileSync(file, crypto.randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 });
      } catch (error) {
        if (error.code !== 'EEXIST') return null;
      }
    }
    // Another process may have won the race and still be writing its key.
    for (let attempt = 0; attempt < 5; attempt++) {
      const key = readKey(file);
      if (key) return key;
      sleep(20);
    }
    return null;
  } catch (_) {
    return null;
  }
}

/** HMAC over a record's fields (all but `digest` and `local`) and the exact, unredacted command. */
function localTag(key, record, command) {
  const { digest, local, ...rest } = record;
  return crypto.createHmac('sha256', Buffer.from(key, 'hex')).update(canonical({ record: rest, command: String(command) }), 'utf8').digest('hex');
}

const TAG_PATTERN = /^[0-9a-f]{64}$/;
const IDENTITY_PATTERN = /^(?:sha256|hmac):[0-9a-f]{64}$/;

/** Constant-time equality of two signatures; anything that is not 64 lowercase hex digits is never equal. */
function sameTag(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !TAG_PATTERN.test(a) || !TAG_PATTERN.test(b)) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

/**
 * The identity of the exact command, for matching a verify record to the
 * declared check. The stored `command` is redacted, so two commands that differ
 * only in a secret share it; the identity tells them apart. Without secret
 * shapes it is `sha256:<hex>` of the command, which any machine computes. With
 * them it is `hmac:<hex>` keyed by the machine-local key (so the secret cannot
 * be guessed from the ledger), or null when there is no key.
 */
function commandIdentity(command, { key } = {}) {
  const exact = String(command);
  if (redact(exact) === exact) return `sha256:${crypto.createHash('sha256').update(exact, 'utf8').digest('hex')}`;
  if (!key) return null;
  return `hmac:${crypto.createHmac('sha256', Buffer.from(key, 'hex')).update(canonical({ command: exact }), 'utf8').digest('hex')}`;
}

/**
 * A test `record => boolean` for "this verify record ran `command`". A record
 * counts only through its `cmd` identity: a record without one (written by
 * 7.0, which kept only the redacted text) or with a null or malformed one
 * never does, and a command with secrets needs this machine's key. With no
 * command (nothing declared, or `none`) any record with a well-formed identity
 * counts. `key` is read from the machine when not given.
 */
function commandMatcher(command, { key } = {}) {
  const hasCommand = Boolean(command) && command !== 'none';
  const exact = hasCommand ? String(command) : '';
  const secret = hasCommand && redact(exact) !== exact;
  const identity = hasCommand ? commandIdentity(exact, { key: secret && key === undefined ? localKey() : key }) : null;
  return record => {
    if (typeof record.cmd !== 'string' || !IDENTITY_PATTERN.test(record.cmd)) return false;
    return !hasCommand || (identity !== null && record.cmd === identity);
  };
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

/**
 * Append one record. With `localCommand` (the exact command a verify ran) and
 * a usable local key, the record is signed with `local`.
 */
function append(root, fields, { localCommand } = {}) {
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
    const key = localCommand === undefined ? null : localKey({ create: true });
    if (key) record.local = localTag(key, record, localCommand);
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
 * With `args` (POSIX only) the command is a script for `/bin/sh -c` and `args`
 * are its positional parameters (`"$@"`), passed to the process as an argument
 * list, so they are never part of the shell's source text.
 */
function runCommand(command, { cwd, timeoutSeconds, args } = {}) {
  const seconds = normalizeTimeout(timeoutSeconds);
  return new Promise(resolve => {
    const started = Date.now();
    let output = '';
    let timedOut = false;
    let done = false;
    const options = {
      cwd,
      detached: process.platform !== 'win32',
      env: { ...process.env, GODPOWERS_VERIFY: '1' },
      stdio: ['ignore', 'pipe', 'pipe']
    };
    const child = args === undefined
      ? spawn(command, { ...options, shell: true })
      : spawn('/bin/sh', ['-c', command, 'godpowers-fast', ...args], options);
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
async function verify(root, command, { claim, timeoutSeconds, tree } = {}) {
  if (!command || !String(command).trim()) throw new Error('verify needs a command, for example: godpowers verify "npm test"');
  normalizeTimeout(timeoutSeconds);
  const treeBefore = tree !== undefined ? tree : gitTools.treeFingerprint(root);
  const exact = String(command);
  const run = await runCommand(command, { cwd: root, timeoutSeconds });
  const treeAfter = gitTools.treeFingerprint(root);
  const record = append(root, {
    kind: 'verify',
    tree: treeBefore,
    ...(treeBefore !== treeAfter ? { treeAfter, changedDuringRun: true } : {}),
    command: redact(command),
    cmd: commandIdentity(exact, { key: redact(exact) === exact ? null : localKey({ create: true }) }),
    claim: claim ? redact(claim).slice(0, 500) : null,
    exit: run.exit,
    ok: run.ok,
    timedOut: run.timedOut,
    ms: run.ms,
    tail: run.tail
  }, { localCommand: command });
  return { record, run };
}

function waive(root, reason) {
  if (!reason || !String(reason).trim()) throw new Error('waive needs a reason');
  return append(root, { kind: 'waive', tree: gitTools.treeFingerprint(root), reason: redact(reason).slice(0, 500) });
}

const MAX_DISMISSED = 20;
const MAX_DISMISSED_CHARS = 300;

function cleanDismissed(list) {
  return (Array.isArray(list) ? list : [list])
    .map(item => redact(item === true ? '' : item).trim().slice(0, MAX_DISMISSED_CHARS))
    .filter(Boolean)
    .slice(0, MAX_DISMISSED);
}

const MAX_REVIEWER_CHARS = 100;

/** The size of the change since `base` ({ ref, sha } or null) as stored on a review record, or null. */
function reviewDiff(root, base) {
  const stat = base && base.sha ? gitTools.diffStat(root, base.sha) : null;
  return stat ? { base: base.sha, ...stat } : null;
}

/**
 * Record a review, security, or ship outcome for the current code. `reviewer`
 * (review and harden only) names who judged it; it is redacted and capped
 * like the summary and left out when empty. A review also stores the size of
 * the change since `base` ({ ref, sha }), or `diff: null` without a base.
 */
function attest(root, kind, { pass, summary, dismissed, reviewer, base }) {
  if (!ATTEST_KINDS.includes(kind)) throw new Error(`record kind must be one of: ${ATTEST_KINDS.join(', ')}`);
  if (typeof pass !== 'boolean') throw new Error('record needs --pass or --fail');
  if (!summary || !String(summary).trim()) throw new Error('record needs --summary "<one line>"');
  if (dismissed !== undefined && kind !== 'review') throw new Error('--dismiss only applies to record review');
  if (reviewer !== undefined && kind !== 'review' && kind !== 'harden') throw new Error('--reviewer only applies to record review or harden');
  const notes = dismissed === undefined ? [] : cleanDismissed(dismissed);
  const who = reviewer === undefined || reviewer === true ? '' : redact(reviewer).trim().slice(0, MAX_REVIEWER_CHARS);
  return append(root, {
    kind,
    tree: gitTools.treeFingerprint(root),
    head: gitTools.headCommit(root),
    verdict: pass ? 'pass' : 'fail',
    summary: redact(summary).slice(0, 500),
    ...(who ? { reviewer: who } : {}),
    ...(kind === 'review' ? { diff: reviewDiff(root, base) } : {}),
    ...(notes.length ? { dismissed: notes } : {})
  });
}

/**
 * The latest verify record of `command` on `tree`, when it can stand in for a
 * new run. `ledger` is what `readAll` returns. Everything must hold: the
 * ledger has no integrity errors anywhere; the record is the latest for this
 * tree, fingerprint version, and command; it passed and was not cut short;
 * and its `local` signature verifies with this machine's key over the exact
 * command (the stored command is redacted, so two commands can share it), and
 * it has this command's `cmd` identity, the same test the gates apply (a signed
 * record without one, from an earlier build, is not reusable). Without a usable
 * key nothing is reusable.
 */
function findReusable(ledger, tree, command, { key = localKey() } = {}) {
  if (!ledger || !Array.isArray(ledger.records) || !tree || !command || !key) return null;
  if ((ledger.problems || []).some(problem => problem.severity === 'error')) return null;
  const wanted = redact(command);
  let latest = null;
  for (const record of ledger.records) {
    if (record.kind === 'verify' && record.tree === tree && (record.fp || 0) === FP_VERSION && record.command === wanted) latest = record;
  }
  if (!latest || !latest.ok || latest.changedDuringRun || latest.timedOut) return null;
  if (!commandMatcher(command, { key })(latest)) return null;
  return sameTag(latest.local, localTag(key, latest, command)) ? latest : null;
}

/**
 * Review rounds: `rounds` are the review records after the last passing one
 * (all of them failed), so `failedSinceLastPass` is their count.
 */
function reviewHistory(records) {
  const reviews = records.filter(record => record.kind === 'review');
  let lastIndex = -1;
  reviews.forEach((record, index) => { if (record.verdict === 'pass') lastIndex = index; });
  const rounds = reviews.slice(lastIndex + 1);
  return { lastPass: lastIndex === -1 ? null : reviews[lastIndex], rounds, failedSinceLastPass: rounds.length };
}

/**
 * Evidence status for one fingerprint:
 *   check:  'pass' | 'fail' | 'waived' | 'none'   (last counted verify or waive)
 *   review, harden, ship: 'pass' | 'fail' | 'none' (last attestation)
 * Every record counts only on the exact `tree`: any edit, documentation
 * included, voids it. Verify records count only through their `cmd` identity
 * (see `commandMatcher`): when `command` is given (the project's declared
 * check), only records of that exact command count, and records without the
 * identity never do; other checks are recorded but do not satisfy gates.
 * `key` is the machine-local key, read when not given. `last` holds the
 * attestation record each judgment came from.
 */
function statusFor(records, tree, { command, key } = {}) {
  const result = { check: 'none', review: 'none', harden: 'none', ship: 'none', lastCheck: null, last: { review: null, harden: null, ship: null } };
  if (!tree) return result;
  const ranDeclared = commandMatcher(command, { key });
  for (const record of records) {
    if ((record.fp || 0) !== FP_VERSION || record.tree !== tree) continue;
    if (ATTEST_KINDS.includes(record.kind)) {
      result[record.kind] = record.verdict === 'pass' ? 'pass' : 'fail';
      result.last[record.kind] = record;
    } else if (record.kind === 'verify') {
      if (!ranDeclared(record)) continue;
      result.check = record.ok ? 'pass' : 'fail';
      result.lastCheck = record;
    } else if (record.kind === 'waive') {
      result.check = 'waived';
      result.lastCheck = record;
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
  localKey,
  localTag,
  commandIdentity,
  commandMatcher,
  readAll,
  append,
  finalTail,
  normalizeTimeout,
  runCommand,
  verify,
  waive,
  attest,
  findReusable,
  reviewHistory,
  statusFor
};
