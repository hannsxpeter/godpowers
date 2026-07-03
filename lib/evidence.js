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
 *   - The jsonl append uses O_APPEND (fs.appendFileSync) so concurrent writers
 *     never clobber each other's records; a torn line from an interleaved large
 *     write is tolerated by the reader, which skips unparseable records.
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
const os = require('os');
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
// Cap on captured stdout/stderr per verify command. Exceeding it makes
// spawnSync raise ENOBUFS and truncate output, so the verdict is unreliable.
const MAX_OUTPUT_BYTES = 16 * 1024 * 1024;

// Substeps whose close gate requires an executed, verified:true record (the
// runtime/executable-gated tiers). Other substeps (planning, repo, observe,
// launch) may close on an attested record plus gate.js's artifact and have-nots
// checks. This mirrors the build-only evidence requirement gate.js enforces
// today and the tier-appropriate split in docs/FUSION-ARCHITECTURE.md section 4.2.
const EXECUTED_REQUIRED_SUBSTEPS = new Set(['build', 'deploy', 'harden']);

// Reflection outcomes, mirroring the upstream reflect tool.
const REFLECTION_OUTCOMES = new Set(['success', 'partial', 'failure']);

// Memory categories, mirroring the upstream memory store.
const MEMORY_CATEGORIES = new Set(['fact', 'decision', 'discovery', 'state']);

// Lesson scopes, mirroring the upstream lessons store (project or global).
const LESSON_SCOPES = new Set(['project', 'global']);

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

function reflectionsPath(projectRoot) {
  return path.join(ledgerDir(projectRoot), 'reflections.jsonl');
}

function memoryPath(projectRoot) {
  return path.join(ledgerDir(projectRoot), 'memory.json');
}

function lessonsPath(projectRoot, scope) {
  if (scope === 'global') return path.join(os.homedir(), '.godpowers', 'lessons.jsonl');
  return path.join(ledgerDir(projectRoot), 'lessons.jsonl');
}

function outcomeDir(projectRoot, slug) {
  return path.join(ledgerDir(projectRoot), 'outcomes', slug);
}

function outcomeGoalPath(projectRoot, slug) {
  return path.join(outcomeDir(projectRoot, slug), 'goal.json');
}

function outcomeIterationsPath(projectRoot, slug) {
  return path.join(outcomeDir(projectRoot, slug), 'iterations.jsonl');
}

function logPath(projectRoot) {
  return path.join(ledgerDir(projectRoot), 'LEDGER-LOG.mdx');
}

function legacyLogPath(projectRoot) {
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

// Shared slug contract, mirroring the upstream engine: lowercase, collapse runs
// of non-alphanumerics to "-", strip edge "-", truncate to 40 characters.
function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

// SEC-003: mask obvious secret shapes before echoing a command into the
// human-readable LEDGER-LOG.mdx. The durable verifications.jsonl record keeps the
// exact command (it is the audit source of truth); this only protects the log
// echo. Output tails can still carry secrets, so SECURITY.md documents that
// .godpowers/ledger/ may capture sensitive output.
function redactSecrets(text) {
  return String(text == null ? '' : text)
    .replace(/\bgh[pousr]_[A-Za-z0-9]{16,}\b/g, 'gh*_***REDACTED***')
    .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, 'sk-***REDACTED***')
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, 'AKIA***REDACTED***')
    .replace(/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, 'xox*-***REDACTED***')
    .replace(/(--?(?:token|password|passwd|secret|api[-_]?key)[=\s])\S+/gi, '$1***REDACTED***');
}

// ---------------------------------------------------------------------------
// Ledger append (O_APPEND) and tolerant read
// ---------------------------------------------------------------------------

function appendJsonlAtomic(file, record) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // O_APPEND: each record is written at EOF in a single positioned write, so
  // two concurrent writers never overwrite each other's record. The previous
  // read-concat-rewrite was last-writer-wins (it lost records under concurrent
  // invocation) and rewrote the whole file on every append (O(n) per record).
  // A torn line from an interleaved oversized write is tolerated by readJsonl,
  // which skips unparseable records. Mirrors the append in lib/events.js.
  fs.appendFileSync(file, JSON.stringify(record) + '\n');
  return file;
}

// Reads the whole ledger into memory. This is bounded and acceptable for a CLI:
// each record caps its stdout/stderr tails (TAIL_CHARS) so growth is slow, and
// every consumer reads it once per command, never in a loop. If a long-lived
// project's ledger ever grows large, add an opt-in prune/size cap here (PERF-002).
function readJsonl(file) {
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

function appendRecord(projectRoot, record) {
  ensureLedgerDir(projectRoot);
  return appendJsonlAtomic(verificationsPath(projectRoot), record);
}

function appendLog(projectRoot, message) {
  ensureLedgerDir(projectRoot);
  const target = logPath(projectRoot);
  const legacy = legacyLogPath(projectRoot);
  // Migrate a legacy LEDGER-LOG.md once: carry its history into the .mdx.
  if (!fs.existsSync(target) && fs.existsSync(legacy)) {
    fs.renameSync(legacy, target);
  }
  fs.appendFileSync(target, `${isoNow()} ${message}\n`);
}

function readLedger(projectRoot) {
  return readJsonl(verificationsPath(projectRoot));
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
    maxBuffer: MAX_OUTPUT_BYTES
  });
  const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
  let stdoutTail = tail(run.stdout);
  let stderrTail = tail(run.stderr);
  const timedOut = Boolean(run.error && run.error.code === 'ETIMEDOUT');
  const bufferOverflow = Boolean(run.error && run.error.code === 'ENOBUFS');
  let exitCode;
  let verified;
  if (timedOut) {
    exitCode = -1;
    verified = false;
    stderrTail = stderrTail + (stderrTail ? '\n' : '') + `(timed out after ${timeoutSeconds} seconds)`;
  } else if (bufferOverflow) {
    // Output exceeded the capture buffer: spawnSync truncated stdout/stderr, so
    // we cannot trust the exit status. Surface this distinctly rather than
    // folding it into a plain command failure.
    exitCode = -1;
    verified = false;
    stderrTail = stderrTail + (stderrTail ? '\n' : '') +
      `(output exceeded ${Math.round(MAX_OUTPUT_BYTES / (1024 * 1024))} MB buffer; output truncated and verdict unreliable)`;
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
  return { exitCode, verified, durationSeconds, stdoutTail, stderrTail, timedOut, bufferOverflow };
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
    `verify ${record.verified ? 'PASS' : 'FAIL'} substep=${context.substep || '-'} exit=${record.exit_code} cmd=\`${redactSecrets(command)}\``
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

/**
 * The advisory close-freshness check, rebound from Mythify's completion rule
 * (cmd_step): a substep may close to done only when evidence bound to it since
 * it went in-flight supports the close. This is a read-only predicate. It does
 * NOT mutate state and is NOT wired into gate.js or the close path; that wiring
 * is a deliberate behavior change tracked as the rest of Phase 1. Until then it
 * is advisory discipline the orchestrator runs (via `can-close`), NOT the
 * mechanically enforced gate. The enforced gate is `gate.js`
 * (`npx godpowers gate`), which checks recorded pass/fail evidence but not the
 * since-in-flight freshness this predicate adds. Treat the two as distinct:
 * `gate` is the mechanical boundary, `can-close` is the stricter advisory one.
 *
 * Tier-appropriate (docs/FUSION-ARCHITECTURE.md section 4.2):
 *   - Executable-gated substeps (build, deploy, harden) require the latest
 *     executed record since in-flight to be verified:true.
 *   - Other substeps may close on an executed pass or an attested record since
 *     in-flight; a failed executed record still blocks (a red is a red).
 *
 * "Since in-flight" is the substep's last status-change timestamp
 * (state.json `updated`), which is when it most recently went in-flight.
 *
 * @param {string} substep Substep token such as tier-2.build or build.
 * @param {{ projectRoot?: string, executedRequired?: boolean }} [opts]
 * @returns {{ canClose: boolean, reason: string, strategy: string|null,
 *   record: Object|null, substep?: string, wentInFlightAt?: string|null }}
 */
function canClose(substep, opts = {}) {
  const projectRoot = path.resolve(opts.projectRoot || process.cwd());
  const state = stateStore.read(projectRoot);
  if (!state) return { canClose: false, reason: 'no-state', strategy: null, record: null };

  const target = resolveTarget(state, substep);
  if (!target) {
    return { canClose: false, reason: 'substep-not-found', strategy: null, record: null, substep };
  }
  const canonical = `${target.tierKey}.${target.subStepKey}`;
  const wentInFlightAt = target.updated || null;
  const sinceInFlight = (record) =>
    !wentInFlightAt || (record.timestamp && record.timestamp >= wentInFlightAt);

  const executedRequired = opts.executedRequired !== undefined
    ? Boolean(opts.executedRequired)
    : EXECUTED_REQUIRED_SUBSTEPS.has(target.subStepKey);
  const strategy = executedRequired ? 'executed' : 'attested-ok';

  const ledger = readLedger(projectRoot);
  const forSubstep = (record) => record && record.substep === canonical && sinceInFlight(record);
  const executed = ledger.filter((r) => forSubstep(r) && r.kind === 'executed');

  const verdict = (canCloseValue, reason, record) => ({
    canClose: canCloseValue,
    reason,
    strategy,
    record: record || null,
    substep: canonical,
    wentInFlightAt
  });

  if (executedRequired) {
    if (executed.length === 0) return verdict(false, 'no-executed-record-since-in-flight', null);
    const latest = executed[executed.length - 1];
    if (!latest.verified) return verdict(false, 'latest-executed-record-failed', latest);
    return verdict(true, 'executed-pass', latest);
  }

  const passing = executed.filter((r) => r.verified);
  if (passing.length > 0) return verdict(true, 'executed-pass', passing[passing.length - 1]);
  if (executed.length > 0) return verdict(false, 'executed-record-failed', executed[executed.length - 1]);

  const attested = ledger.filter((r) => forSubstep(r) && r.kind === 'attested');
  if (attested.length > 0) return verdict(true, 'attested', attested[attested.length - 1]);

  return verdict(false, 'no-record-since-in-flight', null);
}

/**
 * Record a structured reflection, rebound from the upstream reflect tool: what
 * was attempted, how it went, what was observed, the root cause when known, and
 * the next action. Appends to .godpowers/ledger/reflections.jsonl. Used after a
 * significant action or failure so course corrections rest on recorded
 * observations rather than guesswork.
 *
 * @param {{ action: string, outcome?: string, observation?: string,
 *   rootCause?: string, next?: string, lesson?: string }} reflection
 * @param {{ substep?: string, projectRoot?: string, now?: string }} [opts]
 * @returns {{ record: Object, reflections: string }}
 */
function reflect(reflection, opts = {}) {
  const input = reflection || {};
  if (typeof input.action !== 'string' || input.action.trim() === '') {
    throw new Error('evidence.reflect requires a non-empty action');
  }
  const projectRoot = path.resolve(opts.projectRoot || process.cwd());
  const outcome = REFLECTION_OUTCOMES.has(input.outcome) ? input.outcome : 'partial';
  const state = stateStore.read(projectRoot);
  const context = substepContext(state, opts.substep);
  const record = {
    action: input.action,
    outcome,
    observation: input.observation !== undefined && input.observation !== null ? input.observation : null,
    root_cause: input.rootCause !== undefined && input.rootCause !== null ? input.rootCause : null,
    next: input.next !== undefined && input.next !== null ? input.next : null,
    lesson: input.lesson !== undefined && input.lesson !== null ? input.lesson : null,
    timestamp: opts.now || isoNow(),
    ...context
  };
  ensureLedgerDir(projectRoot);
  appendJsonlAtomic(reflectionsPath(projectRoot), record);
  appendLog(projectRoot, `reflect outcome=${outcome} substep=${context.substep || '-'} action=\`${input.action}\``);
  let recordedLesson = null;
  if (record.lesson !== null && record.lesson.trim() !== '') {
    recordedLesson = lessonAdd(record.lesson, {
      detail: `Auto-recorded from a reflection (outcome: ${outcome}). Action: ${input.action}`,
      tags: ['auto-reflected'],
      scope: 'project',
      projectRoot,
      now: record.timestamp
    });
  }
  return { record, reflections: reflectionsPath(projectRoot), lesson: recordedLesson };
}

/**
 * Read reflection records, newest last. Optionally filtered to one substep and
 * limited to the most recent N.
 *
 * @param {{ substep?: string, recent?: number, projectRoot?: string }} [opts]
 * @returns {Object[]}
 */
function reflections(opts = {}) {
  const projectRoot = path.resolve(opts.projectRoot || process.cwd());
  let records = readJsonl(reflectionsPath(projectRoot));
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

// ---------------------------------------------------------------------------
// Memory store (rebound from the upstream memory.json)
// ---------------------------------------------------------------------------

function freshMemory(now) {
  return { entries: [], metadata: { created: now, last_updated: now, total_entries: 0 } };
}

function readMemory(projectRoot) {
  try {
    const parsed = JSON.parse(fs.readFileSync(memoryPath(projectRoot), 'utf8'));
    if (!parsed || !Array.isArray(parsed.entries)) return freshMemory(isoNow());
    return parsed;
  } catch (_) {
    return freshMemory(isoNow());
  }
}

function writeMemory(projectRoot, mem) {
  ensureLedgerDir(projectRoot);
  mem.metadata = mem.metadata || {};
  mem.metadata.last_updated = isoNow();
  mem.metadata.total_entries = mem.entries.length;
  atomic.writeJsonAtomic(memoryPath(projectRoot), mem);
  return mem;
}

function memorySet(key, value, opts = {}) {
  if (typeof key !== 'string' || key.trim() === '') {
    throw new Error('evidence.memory.set requires a non-empty key');
  }
  const projectRoot = path.resolve(opts.projectRoot || process.cwd());
  const category = MEMORY_CATEGORIES.has(opts.category) ? opts.category : 'fact';
  const now = opts.now || isoNow();
  const mem = readMemory(projectRoot);
  const existing = mem.entries.find((entry) => entry && entry.key === key);
  if (existing) {
    existing.value = value;
    existing.category = category;
    existing.updated = now;
  } else {
    mem.entries.push({ key, value, category, updated: now });
  }
  writeMemory(projectRoot, mem);
  appendLog(projectRoot, `memory set ${category} ${key}`);
  return { key, value, category, updated: now };
}

function memoryGet(key, opts = {}) {
  const projectRoot = path.resolve(opts.projectRoot || process.cwd());
  const mem = readMemory(projectRoot);
  return mem.entries.find((entry) => entry && entry.key === key) || null;
}

function memoryList(opts = {}) {
  const projectRoot = path.resolve(opts.projectRoot || process.cwd());
  const mem = readMemory(projectRoot);
  if (opts.category) return mem.entries.filter((entry) => entry && entry.category === opts.category);
  return mem.entries.slice();
}

function memoryClear(key, opts = {}) {
  const projectRoot = path.resolve(opts.projectRoot || process.cwd());
  const mem = readMemory(projectRoot);
  const before = mem.entries.length;
  if (key === undefined || key === null) {
    mem.entries = [];
  } else {
    mem.entries = mem.entries.filter((entry) => !(entry && entry.key === key));
  }
  writeMemory(projectRoot, mem);
  const removed = before - mem.entries.length;
  appendLog(projectRoot, `memory clear ${key || '(all)'} removed=${removed}`);
  return { removed };
}

const memory = { set: memorySet, get: memoryGet, list: memoryList, clear: memoryClear };

// ---------------------------------------------------------------------------
// Lessons store (rebound from the upstream lessons/*.json; project or global)
// ---------------------------------------------------------------------------

function lessonAdd(text, opts = {}) {
  if (typeof text !== 'string' || text.trim() === '') {
    throw new Error('evidence.lesson.add requires a non-empty lesson');
  }
  const projectRoot = path.resolve(opts.projectRoot || process.cwd());
  const scope = LESSON_SCOPES.has(opts.scope) ? opts.scope : 'project';
  const tags = Array.isArray(opts.tags) ? opts.tags : (opts.tags ? [opts.tags] : []);
  const record = {
    lesson: text,
    detail: opts.detail !== undefined && opts.detail !== null ? opts.detail : null,
    tags,
    scope,
    timestamp: opts.now || isoNow()
  };
  appendJsonlAtomic(lessonsPath(projectRoot, scope), record);
  if (scope === 'project') appendLog(projectRoot, `lesson add ${tags.length ? `[${tags.join(',')}] ` : ''}${text}`);
  return record;
}

function lessonList(opts = {}) {
  const projectRoot = path.resolve(opts.projectRoot || process.cwd());
  let records;
  if (opts.scope === 'global') {
    records = readJsonl(lessonsPath(projectRoot, 'global'));
  } else if (opts.scope === 'project') {
    records = readJsonl(lessonsPath(projectRoot, 'project'));
  } else {
    records = readJsonl(lessonsPath(projectRoot, 'project')).concat(readJsonl(lessonsPath(projectRoot, 'global')));
  }
  if (opts.recent !== undefined && Number.isFinite(Number(opts.recent))) {
    records = records.slice(-Math.max(0, Math.floor(Number(opts.recent))));
  }
  return records;
}

const lesson = { add: lessonAdd, list: lessonList };

// ---------------------------------------------------------------------------
// Outcome loops (rebound from the upstream outcomes/<slug>/ store)
// ---------------------------------------------------------------------------

function readGoal(projectRoot, slug) {
  try {
    return JSON.parse(fs.readFileSync(outcomeGoalPath(projectRoot, slug), 'utf8'));
  } catch (_) {
    return null;
  }
}

function outcomeStart(name, opts = {}) {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new Error('evidence.outcome.start requires a non-empty name');
  }
  const projectRoot = path.resolve(opts.projectRoot || process.cwd());
  const slug = slugify(name) || 'outcome';
  const budget = Number.isFinite(Number(opts.budget)) && Number(opts.budget) > 0
    ? Math.floor(Number(opts.budget))
    : 3;
  const now = opts.now || isoNow();
  const goal = {
    slug,
    title: typeof opts.goal === 'string' && opts.goal.trim() ? opts.goal : name,
    verifier: typeof opts.verifier === 'string' && opts.verifier.trim() ? opts.verifier : null,
    substep: opts.substep || null,
    budget,
    iterations: 0,
    status: 'active',
    created: now,
    last_updated: now
  };
  fs.mkdirSync(outcomeDir(projectRoot, slug), { recursive: true });
  atomic.writeJsonAtomic(outcomeGoalPath(projectRoot, slug), goal);
  appendLog(projectRoot, `outcome start ${slug} budget=${budget}`);
  return goal;
}

function outcomeCheck(name, opts = {}) {
  const projectRoot = path.resolve(opts.projectRoot || process.cwd());
  const slug = slugify(name) || 'outcome';
  const goal = readGoal(projectRoot, slug);
  if (!goal) return { ran: false, reason: 'outcome-not-found', slug };
  if (goal.status !== 'active') return { ran: false, reason: `outcome-${goal.status}`, goal };
  if (!goal.verifier) return { ran: false, reason: 'no-verifier', goal };

  // SEC-002: the verifier is a shell command read from goal.json on disk, not
  // from a live flag, so `outcome check` in a cloned untrusted repo would
  // otherwise execute a planted command silently. Surface what is about to run
  // and where it came from before executing. The notice is informational; the
  // CLI passes one that prints to stderr.
  if (typeof opts.notice === 'function') {
    opts.notice({ verifier: goal.verifier, source: outcomeGoalPath(projectRoot, slug) });
  }

  const result = verify(goal.verifier, {
    substep: goal.substep || undefined,
    claim: goal.title,
    timeout: opts.timeout,
    projectRoot
  });
  goal.iterations += 1;
  goal.last_updated = result.record.timestamp;
  let statusAfter;
  if (result.verified) statusAfter = 'succeeded';
  else if (goal.iterations >= goal.budget) statusAfter = 'failed';
  else statusAfter = 'active';
  goal.status = statusAfter;

  const iteration = {
    iteration: goal.iterations,
    verified: result.verified,
    verify: { exit_code: result.record.exit_code, duration_seconds: result.record.duration_seconds },
    status_after: statusAfter,
    timestamp: result.record.timestamp
  };
  appendJsonlAtomic(outcomeIterationsPath(projectRoot, slug), iteration);
  atomic.writeJsonAtomic(outcomeGoalPath(projectRoot, slug), goal);
  appendLog(projectRoot, `outcome check ${slug} iteration=${goal.iterations} verified=${result.verified} status=${statusAfter}`);
  return { ran: true, goal, iteration, verified: result.verified };
}

function outcomeStop(name, reason, opts = {}) {
  const projectRoot = path.resolve(opts.projectRoot || process.cwd());
  const slug = slugify(name) || 'outcome';
  const goal = readGoal(projectRoot, slug);
  if (!goal) return { stopped: false, reason: 'outcome-not-found', slug };
  goal.status = 'stopped';
  goal.stop_reason = reason !== undefined && reason !== null ? reason : null;
  goal.last_updated = opts.now || isoNow();
  atomic.writeJsonAtomic(outcomeGoalPath(projectRoot, slug), goal);
  appendLog(projectRoot, `outcome stop ${slug}: ${goal.stop_reason || ''}`);
  return { stopped: true, goal };
}

function outcomeStatus(name, opts = {}) {
  const projectRoot = path.resolve(opts.projectRoot || process.cwd());
  const slug = slugify(name) || 'outcome';
  const goal = readGoal(projectRoot, slug);
  if (!goal) return null;
  const iterations = readJsonl(outcomeIterationsPath(projectRoot, slug));
  return { goal, iterations };
}

const outcome = { start: outcomeStart, check: outcomeCheck, stop: outcomeStop, status: outcomeStatus };

function provenance() {
  return PROVENANCE;
}

module.exports = {
  verify,
  verifyClaim,
  canClose,
  reflect,
  reflections,
  memory,
  lesson,
  outcome,
  history,
  read: readLedger,
  provenance,
  ledgerDir,
  verificationsPath,
  reflectionsPath,
  memoryPath,
  lessonsPath,
  logPath,
  readJsonl,
  appendJsonlAtomic,
  EXECUTED_REQUIRED_SUBSTEPS,
  REFLECTION_OUTCOMES,
  MEMORY_CATEGORIES,
  LESSON_SCOPES,
  TAIL_CHARS,
  DEFAULT_TIMEOUT_SECONDS,
  // Internals exposed for tests and the re-sync script.
  _runCommand: runCommand,
  _redactSecrets: redactSecrets,
  _toStateCommand: toStateCommand,
  _substepContext: substepContext,
  _rollUp: rollUp,
  _emitGateEvent: emitGateEvent
};
