/**
 * Evidence engine (enforced producer of verification records).
 *
 * Vendored from mythify-mcp@3.6.3 (mcp-server/src/index.js@7cbd601, the
 * verify_run / verify_claim tools). Engine logic only; do not hand-edit the
 * record shapes. Re-sync the upstream engine with scripts/sync-evidence-engine.js.
 * Provenance of origin and the recorded adaptations live in
 * lib/evidence/.provenance.json.
 *
 * Adaptations from the upstream Node engine (see .provenance.json):
 *   - Mythify's plan/step context becomes Godpowers' arc/substep context.
 *   - The .mythify/ state dir becomes .godpowers/ledger/.
 *   - The jsonl append goes through lib/atomic-write.js (temp + rename) so a
 *     torn record is never visible.
 *
 * What this adds on top of the upstream engine (the Godpowers integration):
 *   1. .godpowers/ledger/verifications.jsonl: append-only, Mythify-shape record,
 *      the durable audit trail and source of truth.
 *   2. state.json substep verification.commands[]: a rollup of the latest verdict
 *      per command for that substep, in the existing Godpowers gate shape, written
 *      through lib/state.js so PROGRESS.md regenerates. Additive: status is never
 *      changed here (closing on evidence is Phase 1, not Phase 0).
 *   3. .godpowers/runs/<id>/events.jsonl: a gate.pass / gate.fail event on the
 *      existing hash-chained stream via lib/events.js.
 *
 * This module is a self-contained domain module, peer to lib/linkage.js.
 *
 * @typedef {Object} ExecutedRecord
 * @property {"executed"} kind Record class.
 * @property {string|null} claim The claim the command verifies.
 * @property {string} command The exact command executed.
 * @property {number} exit_code Process exit code (-1 for timeout or no exit).
 * @property {number} duration_seconds Wall-clock duration, three decimals.
 * @property {string} stdout_tail Last 4000 chars of stdout.
 * @property {string} stderr_tail Last 4000 chars of stderr.
 * @property {boolean} verified True only when not timed out and exit code 0.
 * @property {string} timestamp ISO-8601 timestamp.
 * @property {string|null} arc Active arc, when known.
 * @property {string|null} substep Canonical substep id such as tier-2.build.
 * @property {string|null} substep_status Substep status when the record was made.
 *
 * @typedef {Object} VerifyResult
 * @property {ExecutedRecord} record The ledger record that was appended.
 * @property {Object} rollup The state.json rollup outcome.
 * @property {Object} event The events.jsonl emission outcome.
 * @property {boolean} verified Convenience copy of record.verified.
 * @property {string} ledger Absolute path to verifications.jsonl.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const atomic = require('./atomic-write');
const stateStore = require('./state');
const stateLock = require('./state-lock');
const stateAdvance = require('./state-advance');
const events = require('./events');

const TAIL_CHARS = 4000;
const DEFAULT_TIMEOUT_SECONDS = 300;
const DIAGNOSTICS_LIMIT = 1000;

let PROVENANCE = null;
try {
  // eslint-disable-next-line global-require
  PROVENANCE = require('./evidence/.provenance.json');
} catch (_) {
  PROVENANCE = null;
}

// ---------------------------------------------------------------------------
// Paths (peer to lib/linkage.js path helpers)
// ---------------------------------------------------------------------------

function ledgerDir(projectRoot) {
  return path.join(projectRoot, '.godpowers', 'ledger');
}

function verificationsPath(projectRoot) {
  return path.join(ledgerDir(projectRoot), 'verifications.jsonl');
}

function logPath(projectRoot) {
  return path.join(ledgerDir(projectRoot), 'LEDGER-LOG.md');
}

function ensureLedgerDir(projectRoot) {
  const dir = ledgerDir(projectRoot);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ---------------------------------------------------------------------------
// Time and string helpers (lifted from the upstream engine)
// ---------------------------------------------------------------------------

function isoNow() {
  return new Date().toISOString();
}

function tail(text) {
  const s = String(text == null ? '' : text);
  return s.length > TAIL_CHARS ? s.slice(-TAIL_CHARS) : s;
}

function normalizeTimeout(timeout) {
  const n = Number(timeout);
  if (Number.isFinite(n) && n > 0) return n;
  return DEFAULT_TIMEOUT_SECONDS;
}

// ---------------------------------------------------------------------------
// Ledger append (atomic, via lib/atomic-write.js) and tolerant read
// ---------------------------------------------------------------------------

function appendRecord(projectRoot, record) {
  ensureLedgerDir(projectRoot);
  const file = verificationsPath(projectRoot);
  let existing = '';
  try {
    existing = fs.readFileSync(file, 'utf8');
  } catch (_) {
    existing = '';
  }
  atomic.writeFileAtomic(file, existing + JSON.stringify(record) + '\n');
  return file;
}

function appendLog(projectRoot, message) {
  ensureLedgerDir(projectRoot);
  fs.appendFileSync(logPath(projectRoot), `${isoNow()} ${message}\n`);
}

function readLedger(projectRoot) {
  const file = verificationsPath(projectRoot);
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (_) {
    return [];
  }
  const out = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    try {
      out.push(JSON.parse(trimmed));
    } catch (_) {
      // Skip a torn or partial jsonl record, matching the tolerant readers in
      // lib/events.js and the upstream engine.
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Substep context (rebinds the upstream verificationStepContext)
// ---------------------------------------------------------------------------

function resolveTarget(state, substepToken) {
  if (!state || !substepToken) return null;
  try {
    return stateAdvance.resolveStep(state, substepToken);
  } catch (_) {
    // Ambiguous or malformed token: leave the substep unresolved.
    return null;
  }
}

function substepContext(state, substepToken) {
  const context = {
    arc: state ? (state['active-arc'] || state.arc || null) : null,
    substep: substepToken || null,
    substep_status: null
  };
  const target = resolveTarget(state, substepToken);
  if (target) {
    context.substep = `${target.tierKey}.${target.subStepKey}`;
    context.substep_status = target.status || null;
  }
  return context;
}

function canonicalSubstep(projectRoot, token) {
  const target = resolveTarget(stateStore.read(projectRoot), token);
  return target ? `${target.tierKey}.${target.subStepKey}` : token;
}

// ---------------------------------------------------------------------------
// Command execution (field-for-field with the upstream verify_run)
// ---------------------------------------------------------------------------

function runCommand(command, timeoutSeconds) {
  const startedAt = process.hrtime.bigint();
  const run = spawnSync(command, {
    shell: true,
    encoding: 'utf8',
    timeout: Math.round(timeoutSeconds * 1000),
    maxBuffer: 16 * 1024 * 1024
  });
  const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
  let stdoutTail = tail(run.stdout);
  let stderrTail = tail(run.stderr);
  const timedOut = Boolean(run.error && run.error.code === 'ETIMEDOUT');
  let exitCode;
  let verified;
  if (timedOut) {
    exitCode = -1;
    verified = false;
    stderrTail = stderrTail + (stderrTail ? '\n' : '') + `(timed out after ${timeoutSeconds} seconds)`;
  } else if (typeof run.status === 'number') {
    exitCode = run.status;
    verified = exitCode === 0;
  } else {
    exitCode = -1;
    verified = false;
    const reason = run.error
      ? run.error.message
      : run.signal
        ? `terminated by signal ${run.signal}`
        : 'command did not produce an exit code';
    stderrTail = stderrTail + (stderrTail ? '\n' : '') + `(${reason})`;
  }
  return { exitCode, verified, durationSeconds, stdoutTail, stderrTail, timedOut };
}

// ---------------------------------------------------------------------------
// Rollup into state.json (Godpowers gate shape, through lib/state.js)
// ---------------------------------------------------------------------------

function commandName(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const value = entry.command || entry.cmd || entry.name;
  return value ? String(value).trim() : null;
}

function diagnosticsFor(record) {
  const detail = (record.stderr_tail && record.stderr_tail.trim()) ||
    (record.stdout_tail && record.stdout_tail.trim()) || '';
  let text = detail ? `exit ${record.exit_code}: ${detail}` : `exit ${record.exit_code}`;
  if (text.length > DIAGNOSTICS_LIMIT) text = text.slice(-DIAGNOSTICS_LIMIT);
  return text;
}

function toStateCommand(record) {
  return {
    command: record.command,
    status: record.verified ? 'pass' : 'fail',
    exitCode: record.exit_code,
    ranAt: record.timestamp,
    durationMs: Math.max(0, Math.round(record.duration_seconds * 1000)),
    diagnostics: record.verified ? '' : diagnosticsFor(record)
  };
}

function rollUp(projectRoot, substepToken, record) {
  const current = stateStore.read(projectRoot);
  if (!current) return { applied: false, reason: 'no-state' };
  if (!substepToken) return { applied: false, reason: 'no-substep' };

  let target;
  try {
    target = stateAdvance.resolveStep(current, substepToken);
  } catch (e) {
    if (e.code === 'AMBIGUOUS_STEP') {
      return { applied: false, reason: 'ambiguous-substep', matches: e.matches };
    }
    throw e;
  }
  if (!target) return { applied: false, reason: 'substep-not-found', substep: substepToken };

  const holder = `godpowers-evidence:${process.pid}`;
  const scope = `${target.tierKey}.${target.subStepKey}`;
  const lock = stateLock.acquire(projectRoot, { holder, scope });
  if (!lock.acquired) {
    return { applied: false, reason: 'lock-unavailable', holder: lock.holder, scope: lock.scope };
  }

  const warnings = [];
  try {
    const fresh = stateStore.read(projectRoot);
    if (!fresh.tiers[target.tierKey]) fresh.tiers[target.tierKey] = {};
    const sub = fresh.tiers[target.tierKey][target.subStepKey] || { status: 'pending' };
    const verification = (sub.verification && typeof sub.verification === 'object')
      ? { ...sub.verification }
      : {};
    const commands = Array.isArray(verification.commands) ? verification.commands.slice() : [];
    const entry = toStateCommand(record);
    const idx = commands.findIndex((existing) => commandName(existing) === record.command);
    if (idx >= 0) commands[idx] = entry;
    else commands.push(entry);
    verification.commands = commands;
    // Additive only: roll the verdict into the existing verification slot.
    // Do not touch sub.status; closing on evidence is Phase 1.
    fresh.tiers[target.tierKey][target.subStepKey] = { ...sub, verification };
    stateStore.write(projectRoot, fresh, { onStateViewWarning: (w) => warnings.push(w) });
    return {
      applied: true,
      tierKey: target.tierKey,
      subStepKey: target.subStepKey,
      substep: scope,
      command: record.command,
      status: entry.status,
      commands: commands.length,
      warnings
    };
  } catch (e) {
    return { applied: false, reason: 'write-error', error: e.message };
  } finally {
    stateLock.release(projectRoot, holder);
  }
}

// ---------------------------------------------------------------------------
// Event emission (gate.pass / gate.fail on the hash-chained stream)
// ---------------------------------------------------------------------------

function emitGateEvent(projectRoot, record, rollup, now) {
  const name = record.verified ? 'gate.pass' : 'gate.fail';
  const attrs = {
    tier: rollup && rollup.tierKey ? rollup.tierKey : 'evidence',
    substep: record.substep || (rollup && rollup.substep) || null,
    command: record.command,
    claim: record.claim,
    exitCode: record.exit_code,
    durationMs: Math.max(0, Math.round(record.duration_seconds * 1000)),
    verified: record.verified,
    kind: record.kind
  };
  try {
    const runs = events.listRuns(projectRoot);
    if (runs.length > 0) {
      const latest = runs[runs.length - 1];
      const file = events.eventsPath(projectRoot, latest);
      const existing = events.readRun(projectRoot, latest);
      const root = existing.find((entry) => entry && entry.trace_id);
      const traceId = root && root.trace_id ? root.trace_id : events.generateTraceId();
      const spanId = events.generateSpanId();
      const event = { trace_id: traceId, span_id: spanId, name, attrs };
      if (now) event.ts = now;
      events.emit(file, event);
      return { emitted: true, name, runId: latest, file, traceId, spanId };
    }
    const handle = events.startRun(projectRoot, { workflow: 'evidence' });
    const spanId = events.generateSpanId();
    const event = { span_id: spanId, name, attrs };
    if (now) event.ts = now;
    handle.emit(event);
    return { emitted: true, name, runId: handle.runId, file: handle.file, traceId: handle.traceId, spanId };
  } catch (e) {
    return { emitted: false, name, error: e.message };
  }
}

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

/**
 * Execute a command as an executed verification: append the ledger record, roll
 * the latest verdict into state.json, and emit gate.pass / gate.fail.
 *
 * @param {string} command Shell command to execute.
 * @param {{ substep?: string, claim?: string, timeout?: number, projectRoot?: string, now?: string }} [opts]
 * @returns {VerifyResult}
 */
function verify(command, opts = {}) {
  if (typeof command !== 'string' || command.trim() === '') {
    throw new Error('evidence.verify requires a non-empty command string');
  }
  const projectRoot = path.resolve(opts.projectRoot || process.cwd());
  const timeoutSeconds = normalizeTimeout(opts.timeout);
  const state = stateStore.read(projectRoot);
  const context = substepContext(state, opts.substep);

  const exec = runCommand(command, timeoutSeconds);
  const record = {
    kind: 'executed',
    claim: opts.claim !== undefined && opts.claim !== null ? opts.claim : null,
    command,
    exit_code: exec.exitCode,
    duration_seconds: Number(exec.durationSeconds.toFixed(3)),
    stdout_tail: exec.stdoutTail,
    stderr_tail: exec.stderrTail,
    verified: exec.verified,
    timestamp: opts.now || isoNow(),
    ...context
  };

  appendRecord(projectRoot, record);
  appendLog(
    projectRoot,
    `verify ${record.verified ? 'PASS' : 'FAIL'} substep=${context.substep || '-'} exit=${record.exit_code} cmd=\`${command}\``
  );

  const rollup = rollUp(projectRoot, opts.substep, record);
  const event = emitGateEvent(projectRoot, record, rollup, opts.now);

  return {
    record,
    rollup,
    event,
    verified: record.verified,
    ledger: verificationsPath(projectRoot)
  };
}

/**
 * Record a second-class attested verification. Never marked verified, never
 * rolled up into state.json, never emitted as a gate event.
 *
 * @param {string} claim The claim being attested.
 * @param {string} evidenceText Self-reported supporting evidence.
 * @param {{ substep?: string, projectRoot?: string, now?: string }} [opts]
 * @returns {{ record: Object, verified: null, ledger: string }}
 */
function verifyClaim(claim, evidenceText, opts = {}) {
  if (typeof claim !== 'string' || claim.trim() === '') {
    throw new Error('evidence.verifyClaim requires a non-empty claim');
  }
  const projectRoot = path.resolve(opts.projectRoot || process.cwd());
  const state = stateStore.read(projectRoot);
  const context = substepContext(state, opts.substep);
  const record = {
    kind: 'attested',
    claim,
    evidence: evidenceText !== undefined && evidenceText !== null ? evidenceText : null,
    verified: null,
    timestamp: opts.now || isoNow(),
    ...context
  };
  appendRecord(projectRoot, record);
  appendLog(projectRoot, `attest substep=${context.substep || '-'} claim=\`${claim}\``);
  return { record, verified: null, ledger: verificationsPath(projectRoot) };
}

/**
 * Read ledger records, newest last. Optionally filtered to one substep and
 * limited to the most recent N.
 *
 * @param {{ substep?: string, recent?: number, projectRoot?: string }} [opts]
 * @returns {Object[]}
 */
function history(opts = {}) {
  const projectRoot = path.resolve(opts.projectRoot || process.cwd());
  let records = readLedger(projectRoot);
  if (opts.substep) {
    const canonical = canonicalSubstep(projectRoot, opts.substep);
    records = records.filter((r) => r && (r.substep === canonical || r.substep === opts.substep));
  }
  if (opts.recent !== undefined && Number.isFinite(Number(opts.recent))) {
    const n = Math.max(0, Math.floor(Number(opts.recent)));
    records = records.slice(-n);
  }
  return records;
}

function provenance() {
  return PROVENANCE;
}

module.exports = {
  verify,
  verifyClaim,
  history,
  read: readLedger,
  provenance,
  ledgerDir,
  verificationsPath,
  logPath,
  TAIL_CHARS,
  DEFAULT_TIMEOUT_SECONDS,
  // Internals exposed for tests and the re-sync script.
  _runCommand: runCommand,
  _toStateCommand: toStateCommand,
  _substepContext: substepContext,
  _rollUp: rollUp,
  _emitGateEvent: emitGateEvent
};
