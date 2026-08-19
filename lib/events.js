/**
 * Events Manager
 *
 * Append OpenTelemetry-shape events to .godpowers/runs/<run-id>/events.jsonl.
 * Implements: P-MUST-25, P-MUST-48
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const contextBudget = require('./context-budget');

const MAX_CONTEXT_LOADOUT_EVENT_BYTES = 12 * 1024;
const MAX_DECISION_ATTRS = 12;
const MAX_DECISION_ATTR_STRING_LENGTH = 240;
const MAX_DECISION_EVIDENCE = 8;
const MAX_DECISION_REASON_LENGTH = 500;
const MIN_DECISION_LENGTH = 8;
const MAX_DECISION_METADATA_INTEGER = 10000;

const DECISION_METADATA_SCHEMA = Object.freeze({
  tier: Object.freeze({ type: 'string', maxLength: 64 }),
  agent: Object.freeze({ type: 'string', maxLength: 128 }),
  artifact: Object.freeze({ type: 'string', maxLength: MAX_DECISION_ATTR_STRING_LENGTH }),
  requirement: Object.freeze({ type: 'string', maxLength: 64 }),
  scope: Object.freeze({ type: 'string', maxLength: 120 }),
  category: Object.freeze({ type: 'string', maxLength: 64 }),
  status: Object.freeze({ type: 'string', maxLength: 64 }),
  note: Object.freeze({ type: 'string', maxLength: MAX_DECISION_ATTR_STRING_LENGTH }),
  attempts: Object.freeze({ type: 'integer', minimum: 0, maximum: MAX_DECISION_METADATA_INTEGER }),
  approved: Object.freeze({ type: 'boolean' })
});

const RAW_EVIDENCE_FIELDS = new Set([
  'stdout', 'stderr', 'raw', 'log', 'logs', 'env', 'environment',
  'authorization', 'cookie'
]);
const SECRET_FIELD_WORDS = new Set([
  'token', 'password', 'passwd', 'secret', 'credential', 'credentials'
]);
const PROTECTED_FIELD_SEQUENCES = [
  'token', 'password', 'passwd', 'secret', 'credential',
  'apikey', 'accesskey', 'privatekey', 'stdout', 'stderr'
];
const RAW_SECRET_VALUES = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\b(?:sk|rk|pk)-(?:proj-)?[A-Za-z0-9_-]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
  /\bBearer\s+(?!\[?REDACTED\]?|\*\*\*REDACTED\*\*\*)[A-Za-z0-9._~+/-]{8,}/i,
  /\b(?:token|password|passwd|secret|api[-_]?key|authorization|cookie)\s*[:=]\s*(?!\[?REDACTED\]?|\*\*\*REDACTED\*\*\*)\S{8,}/i,
  /\bnpm_[A-Za-z0-9_-]{20,}\b/,
  /\bglpat-[A-Za-z0-9_-]{20,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
  /\bAIza[A-Za-z0-9_-]{30,}\b/,
  /\bpypi-[A-Za-z0-9_-]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}\b/,
  /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/
];

const DECISION_CITATION_SCHEMA_PATTERN = "^(https://[A-Za-z0-9.-]+(:[0-9]{1,5})?(/[A-Za-z0-9._~!$&'()*+,;=:@%/\\-]*)?(#[A-Za-z0-9._:\\-]+)?|(event|command|artifact|git):[A-Za-z0-9_./:@#=+\\-]+|(\\.?\\.?/)?([A-Za-z0-9_.@\\-]+/)*[A-Za-z0-9_.@\\-]+\\.[A-Za-z0-9]+(:[A-Za-z0-9_.\\-]+)?(#[A-Za-z0-9_.:\\-]+)?)$";
const DECISION_CITATION_PATTERN = new RegExp(DECISION_CITATION_SCHEMA_PATTERN);

const VALID_EVENT_NAMES = new Set([
  'workflow.run', 'workflow.complete',
  'agent.start', 'agent.end', 'agent.pause', 'agent.yolo-resolve',
  'user.resolve',
  'tool.call', 'tool.result',
  'model.call',
  'decision.route', 'decision.recorded',
  'artifact.created', 'artifact.updated', 'artifact.hash',
  'have-nots.check',
  'gate.fail', 'gate.pass',
  // Change lifecycle (loop-engineering accepted-change-rate signal). A reviewer
  // or executor may emit these explicitly; lib/change-metrics.js also derives
  // the same rate from gate.pass/gate.fail/state.rollback when they are absent.
  'change.proposed', 'change.accepted', 'change.rejected',
  'tier.skip',
  'state.repair', 'state.rollback',
  'local-helper.run', 'local-helper.complete',
  'dashboard.render',
  'host-capabilities.detect',
  'dogfood.run',
  'source-system.import', 'source-system.sync-back',
  'repo-doc-sync.detect', 'repo-surface-sync.detect',
  'extension.install', 'extension.activate',
  // Cost / cache / budget (v0.14 token cost saver)
  'cost.recorded', 'cache.hit', 'cache.miss', 'budget.exceeded',
  'context.loadout',
  // Learning loop (lib/learning-metrics.js). lesson.recorded marks a lesson
  // entering the evidence store; lesson.recalled marks a planner injecting
  // recalled lessons (attrs.count carries how many). Never reuse change.* or
  // gate.* for learning activity: those feed the product accepted-change rate.
  'lesson.recorded', 'lesson.recalled',
  // Improvement proposals (lib/improvement-proposals.js): drafted prompt
  // changes and their human decisions. A separate family from change.* on
  // purpose, so self-improvement decisions never pollute the product
  // accepted-change rate.
  'proposal.proposed', 'proposal.accepted', 'proposal.rejected',
  'error', 'warn'
]);

function generateTraceId() {
  return crypto.randomBytes(16).toString('hex');
}

function generateSpanId() {
  return crypto.randomBytes(8).toString('hex');
}

function eventsPath(projectRoot, runId) {
  return path.join(projectRoot, '.godpowers', 'runs', runId, 'events.jsonl');
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isRawSecretField(key) {
  const words = String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const normalized = words.join('');
  return words.some((word) => RAW_EVIDENCE_FIELDS.has(word)
    || SECRET_FIELD_WORDS.has(word))
    || PROTECTED_FIELD_SEQUENCES.some((sequence) => normalized.includes(sequence));
}

function containsRawSecret(value, key = '') {
  if (key && isRawSecretField(key)) return true;
  if (typeof value === 'string') {
    return RAW_SECRET_VALUES.some((pattern) => pattern.test(value));
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsRawSecret(item));
  }
  if (!isPlainObject(value)) return false;
  return Object.entries(value).some(([childKey, child]) =>
    containsRawSecret(child, childKey));
}

function normalizedText(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function validateBoundedText(value, field, minimum, maximum) {
  if (typeof value !== 'string' || value.length > maximum) {
    throw new Error(`Decision record ${field} is outside its schema bound`);
  }
  const normalized = normalizedText(value);
  if (normalized.length < minimum || normalized.length > maximum) {
    throw new Error(`Decision record ${field} is outside its schema bound`);
  }
  return normalized;
}

function validDecisionCitation(citation) {
  if (!citation.startsWith('https://')) return DECISION_CITATION_PATTERN.test(citation);
  let parsed;
  try {
    parsed = new URL(citation);
  } catch (err) {
    return false;
  }
  const beforeFragment = citation.split('#', 1)[0];
  return parsed.protocol === 'https:'
    && parsed.username === ''
    && parsed.password === ''
    && parsed.search === ''
    && !beforeFragment.includes('?')
    && DECISION_CITATION_PATTERN.test(citation);
}

function validateDecisionMetadata(metadata) {
  if (metadata === undefined) return {};
  if (!isPlainObject(metadata)) {
    throw new Error('Decision record attrs must be a plain object');
  }
  const keys = Object.keys(metadata);
  if (keys.length > MAX_DECISION_ATTRS) {
    throw new Error('Decision record attrs exceed the schema bound');
  }
  if (keys.some((key) => isRawSecretField(key))) {
    throw new Error('Unsafe decision record contains a raw secret field or value');
  }
  const normalized = {};
  let unknownKey = false;
  for (const key of keys.sort()) {
    const rule = DECISION_METADATA_SCHEMA[key];
    if (!rule) {
      unknownKey = true;
      continue;
    }
    const value = metadata[key];
    if (rule.type === 'string') {
      normalized[key] = validateBoundedText(value, `attrs.${key}`, 1, rule.maxLength);
    } else if (rule.type === 'integer') {
      if (!Number.isInteger(value) || value < rule.minimum || value > rule.maximum) {
        throw new Error(`Decision record attrs.${key} is outside its schema bound`);
      }
      normalized[key] = value;
    } else if (rule.type === 'boolean') {
      if (typeof value !== 'boolean') {
        throw new Error(`Decision record attrs.${key} has the wrong schema type`);
      }
      normalized[key] = value;
    }
  }
  if (containsRawSecret(normalized)) {
    throw new Error('Unsafe decision record contains a raw secret field or value');
  }
  if (unknownKey) throw new Error('Decision record attrs contain a non-allowlisted key');
  return normalized;
}

function validateDecisionRecord(record) {
  if (!isPlainObject(record)) {
    throw new Error('Decision record must be a plain object');
  }

  const recordKeys = Object.keys(record).sort();
  const allowedRecordKeys = new Set(['decision', 'reason', 'evidence', 'result', 'attrs']);
  if (recordKeys.some((key) => isRawSecretField(key))) {
    throw new Error('Unsafe decision record contains a raw secret field or value');
  }
  if (recordKeys.some((key) => !allowedRecordKeys.has(key))) {
    throw new Error('Decision record contains a non-allowlisted key');
  }

  const decision = validateBoundedText(
    record.decision, 'decision', MIN_DECISION_LENGTH, MAX_DECISION_ATTR_STRING_LENGTH);
  const reason = validateBoundedText(record.reason, 'reason', 1, MAX_DECISION_REASON_LENGTH);
  const result = validateBoundedText(
    record.result, 'result', 1, MAX_DECISION_ATTR_STRING_LENGTH);
  const genericDecision = /^(?:yes|no|done|none|n\/?a|unknown)$/i.test(decision);
  if (genericDecision) {
    throw new Error('Decision record requires a material decision, reason, cited evidence, and result');
  }
  if (!Array.isArray(record.evidence) || record.evidence.length === 0
    || record.evidence.length > MAX_DECISION_EVIDENCE) {
    throw new Error('Decision record evidence is outside its schema bound');
  }
  const evidence = record.evidence.map((citation) => {
    return validateBoundedText(
      citation, 'evidence citation', 1, MAX_DECISION_ATTR_STRING_LENGTH);
  });
  const metadata = validateDecisionMetadata(record.attrs);
  const boundedRecord = { decision, reason, evidence, result, attrs: metadata };
  if (containsRawSecret(boundedRecord)) {
    throw new Error('Unsafe decision record contains a raw secret field or value');
  }
  if (evidence.some((citation) => !validDecisionCitation(citation))) {
    throw new Error('Decision record evidence citation has invalid syntax');
  }

  return {
    decision,
    reason,
    evidence,
    result,
    ...metadata
  };
}

function decisionRecordFromAttrs(attrs) {
  if (!isPlainObject(attrs)) return attrs;
  const metadata = Object.fromEntries(Object.entries(attrs).filter(([key]) =>
    !['decision', 'reason', 'evidence', 'result'].includes(key)));
  return {
    decision: attrs.decision,
    reason: attrs.reason,
    evidence: attrs.evidence,
    result: attrs.result,
    attrs: metadata
  };
}

function readLastNonEmptyLine(file) {
  const raw = fs.readFileSync(file, 'utf8').trimEnd();
  if (!raw) return null;
  const i = raw.lastIndexOf('\n');
  return i >= 0 ? raw.slice(i + 1) : raw;
}

/**
 * Start a new run. Returns a run handle with trace_id and write functions.
 */
function startRun(projectRoot, attrs = {}) {
  const traceId = generateTraceId();
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${traceId.slice(0, 8)}`;
  const spanId = generateSpanId();

  const file = eventsPath(projectRoot, runId);
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const handle = {
    traceId,
    runId,
    rootSpanId: spanId,
    file,
    emit: (event) => emit(file, { trace_id: traceId, ...event }),
    spawn: (parentSpanId) => spawnSpan(traceId, parentSpanId || spanId, file)
  };

  handle.emit({
    span_id: spanId,
    ts: new Date().toISOString(),
    name: 'workflow.run',
    attrs
  });

  return handle;
}

function spawnSpan(traceId, parentSpanId, file) {
  const spanId = generateSpanId();
  return {
    traceId,
    spanId,
    parentSpanId,
    emit: (event) =>
      emit(file, {
        trace_id: traceId,
        span_id: spanId,
        parent: parentSpanId,
        ...event
      })
  };
}

/**
 * Append a single event to the events.jsonl file. Includes a hash chain:
 * each event carries `prev` = sha256 of the previous event line (or
 * 'genesis' for the first). This detects broken observed links. It does not
 * authenticate the workspace or detect a recomputed chain or tail removal.
 */
function emit(file, event) {
  if (!event.trace_id) throw new Error('event.trace_id required');
  if (!event.span_id) throw new Error('event.span_id required');
  if (!event.ts) event.ts = new Date().toISOString();
  if (!event.name) throw new Error('event.name required');
  if (!VALID_EVENT_NAMES.has(event.name)) {
    throw new Error(`Invalid event name: ${event.name}`);
  }
  if (event.name === 'decision.recorded') {
    event.attrs = validateDecisionRecord(decisionRecordFromAttrs(event.attrs));
  }
  if (event.name === 'context.loadout') {
    event.attrs = contextBudget.normalizeManifest(event.attrs);
  }

  // Compute prev hash from the last line of the file, if any.
  let prev = 'genesis';
  if (fs.existsSync(file)) {
    const stat = fs.statSync(file);
    if (stat.size > 0) {
      const line = readLastNonEmptyLine(file);
      if (line) {
        prev = 'sha256:' + crypto.createHash('sha256')
          .update(line)
          .digest('hex');
      }
    }
  }
  event.prev = prev;

  const serialized = JSON.stringify(event);
  if (event.name === 'context.loadout'
    && Buffer.byteLength(serialized, 'utf8') > MAX_CONTEXT_LOADOUT_EVENT_BYTES) {
    throw new Error(`context.loadout event exceeds ${MAX_CONTEXT_LOADOUT_EVENT_BYTES} UTF-8 bytes`);
  }
  fs.appendFileSync(file, serialized + '\n');
}

/**
 * Verify the hash chain in an events.jsonl file. Returns
 * { valid: bool, breakAt: number | null, expected, actual }.
 *
 * The chain is broken if any event's `prev` doesn't match the sha256
 * of the previous line's exact bytes. Genesis line must have
 * prev === 'genesis'.
 */
function verifyEventLines(lines, includeEvents) {
  let prev = 'genesis';
  const parsed = [];
  for (let i = 0; i < lines.length; i++) {
    let ev;
    try { ev = JSON.parse(lines[i]); }
    catch (e) { return { valid: false, breakAt: i, error: 'parse-error' }; }
    if (ev.prev !== prev) {
      return { valid: false, breakAt: i, expected: prev, actual: ev.prev };
    }
    if (includeEvents) parsed.push(ev);
    prev = 'sha256:' + crypto.createHash('sha256').update(lines[i]).digest('hex');
  }
  const result = { valid: true, lines: lines.length };
  if (includeEvents) result.events = parsed;
  return result;
}

function verifyChain(file) {
  if (!fs.existsSync(file)) return { valid: true, lines: 0 };
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(l => l.trim());
  return verifyEventLines(lines, false);
}

function readVerifiedRunSnapshot(projectRoot, runId) {
  const file = eventsPath(projectRoot, runId);
  if (!fs.existsSync(file)) return { valid: true, lines: 0, events: [] };
  const snapshot = fs.readFileSync(file, 'utf8');
  const lines = snapshot.split('\n').filter((line) => line.trim());
  return verifyEventLines(lines, true);
}

/**
 * Read all events for a run.
 */
function readRun(projectRoot, runId) {
  const file = eventsPath(projectRoot, runId);
  if (!fs.existsSync(file)) return [];
  const out = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line) continue;
    try {
      out.push(JSON.parse(line));
    } catch (e) {
      // Skip a torn or partial line (e.g. the process was killed mid-append).
      // Hash-chain integrity is verified separately by verifyChain.
    }
  }
  return out;
}

/**
 * List all runs in a project.
 */
function listRuns(projectRoot) {
  const runsDir = path.join(projectRoot, '.godpowers', 'runs');
  if (!fs.existsSync(runsDir)) return [];
  return fs.readdirSync(runsDir).sort();
}

function recordContextLoadout(handle, manifest) {
  if (!handle || typeof handle.emit !== 'function') {
    throw new Error('context loadout event handle required');
  }
  const bounded = contextBudget.normalizeManifest(manifest);
  let attrs = bounded;
  const spanId = handle.rootSpanId || handle.spanId;
  const probe = {
    trace_id: handle.traceId,
    span_id: spanId,
    ts: new Date(0).toISOString(),
    name: 'context.loadout',
    attrs,
    prev: `sha256:${'0'.repeat(64)}`
  };
  if (Buffer.byteLength(JSON.stringify(probe), 'utf8') > MAX_CONTEXT_LOADOUT_EVENT_BYTES) {
    attrs = {
      agent: bounded.agent,
      blocked: bounded.blocked,
      exceeded: bounded.exceeded,
      budget: bounded.budget,
      used: bounded.used,
      loaded: [],
      dropped: [],
      missing: [],
      sourceCounts: bounded.sourceCounts,
      omittedCounts: bounded.omittedCounts,
      truncated: true
    };
  }
  handle.emit({ span_id: spanId, name: 'context.loadout', attrs });
  return attrs;
}

function recordDecision(handle, record) {
  if (!handle || typeof handle.emit !== 'function'
    || (!handle.rootSpanId && !handle.spanId)) {
    throw new Error('Decision record handle required');
  }
  const attrs = validateDecisionRecord(record);
  handle.emit({
    span_id: handle.rootSpanId || handle.spanId,
    name: 'decision.recorded',
    attrs
  });
  return attrs;
}

module.exports = {
  startRun,
  emit,
  readRun,
  listRuns,
  verifyChain,
  generateTraceId,
  generateSpanId,
  eventsPath,
  readVerifiedRunSnapshot,
  recordContextLoadout,
  recordDecision,
  validateDecisionRecord,
  MAX_CONTEXT_LOADOUT_EVENT_BYTES,
  MAX_DECISION_ATTRS,
  MAX_DECISION_ATTR_STRING_LENGTH,
  MAX_DECISION_EVIDENCE,
  MAX_DECISION_REASON_LENGTH,
  DECISION_METADATA_SCHEMA,
  DECISION_CITATION_SCHEMA_PATTERN,
  VALID_EVENT_NAMES
};
