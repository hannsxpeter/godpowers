/**
 * Events Manager
 *
 * Append OpenTelemetry-shape events to .godpowers/runs/<run-id>/events.jsonl.
 * Implements: P-MUST-25
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const contextBudget = require('./context-budget');

const MAX_CONTEXT_LOADOUT_EVENT_BYTES = 12 * 1024;

const VALID_EVENT_NAMES = new Set([
  'workflow.run', 'workflow.complete',
  'agent.start', 'agent.end', 'agent.pause', 'agent.yolo-resolve',
  'user.resolve',
  'tool.call', 'tool.result',
  'model.call',
  'decision.route',
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
 * 'genesis' for the first). Any truncation, reordering, or tampering
 * breaks the chain at that point and is detectable by
 * verifyChain(file).
 */
function emit(file, event) {
  if (!event.trace_id) throw new Error('event.trace_id required');
  if (!event.span_id) throw new Error('event.span_id required');
  if (!event.ts) event.ts = new Date().toISOString();
  if (!event.name) throw new Error('event.name required');
  if (!VALID_EVENT_NAMES.has(event.name)) {
    throw new Error(`Invalid event name: ${event.name}`);
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
function verifyChain(file) {
  if (!fs.existsSync(file)) return { valid: true, lines: 0 };
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(l => l.trim());
  let prev = 'genesis';
  for (let i = 0; i < lines.length; i++) {
    let ev;
    try { ev = JSON.parse(lines[i]); }
    catch (e) { return { valid: false, breakAt: i, error: 'parse-error' }; }
    if (ev.prev !== prev) {
      return { valid: false, breakAt: i, expected: prev, actual: ev.prev };
    }
    prev = 'sha256:' + crypto.createHash('sha256').update(lines[i]).digest('hex');
  }
  return { valid: true, lines: lines.length };
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

module.exports = {
  startRun,
  emit,
  readRun,
  listRuns,
  verifyChain,
  generateTraceId,
  generateSpanId,
  eventsPath,
  recordContextLoadout,
  MAX_CONTEXT_LOADOUT_EVENT_BYTES,
  VALID_EVENT_NAMES
};
