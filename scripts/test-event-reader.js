#!/usr/bin/env node
/**
 * Behavioral tests for lib/event-reader.js (v0.15 observability).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const events = require('../lib/events');
const reader = require('../lib/event-reader');
const { test, report, assert } = require('./test-harness');



function mkProject() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-evtreader-'));
  fs.mkdirSync(path.join(tmp, '.godpowers'), { recursive: true });
  return tmp;
}

function mkRun(tmp, sequence) {
  const h = events.startRun(tmp, { workflow: 'full-arc' });
  for (const ev of sequence) {
    h.emit(ev);
  }
  return h;
}

console.log('\n  Event reader behavioral tests\n');

test('timeline returns rows with parent durations on agent.end', () => {
  const tmp = mkProject();
  const h = mkRun(tmp, [
    { span_id: 'a1', name: 'agent.start', attrs: { tier: 'tier-1', agent: 'god-pm' } },
    { span_id: 'a1', name: 'agent.end',   attrs: { tier: 'tier-1', agent: 'god-pm' } }
  ]);
  const rows = reader.timeline(tmp, h.runId);
  const endRow = rows.find(r => r.name === 'agent.end');
  assert(endRow, 'no end row');
  assert(typeof endRow.durationMs === 'number',
    `no duration: ${JSON.stringify(endRow)}`);
});

test('timeline applies --filter', () => {
  const tmp = mkProject();
  const h = mkRun(tmp, [
    { span_id: 'a1', name: 'agent.start' },
    { span_id: 'a1', name: 'agent.end' },
    { span_id: 'b1', name: 'tool.call' }
  ]);
  const filtered = reader.timeline(tmp, h.runId, { filter: '^agent' });
  assert(filtered.every(r => /^agent/.test(r.name)),
    `filter leaked: ${JSON.stringify(filtered.map(r => r.name))}`);
});

test('timeline applies --limit', () => {
  const tmp = mkProject();
  const h = mkRun(tmp, Array.from({ length: 5 }, (_, i) => ({
    span_id: `s${i}`,
    name: 'agent.start'
  })));
  const rows = reader.timeline(tmp, h.runId, { limit: 3 });
  assert(rows.length === 3, `limit ignored: ${rows.length}`);
});

test('formatTimeline produces non-empty string', () => {
  const tmp = mkProject();
  const h = mkRun(tmp, [
    { span_id: 'a1', name: 'agent.start', attrs: { tier: 'tier-1', agent: 'god-pm' } }
  ]);
  const rows = reader.timeline(tmp, h.runId);
  const s = reader.formatTimeline(rows);
  assert(s.length > 0, 'formatted output empty');
  assert(/agent\.start/.test(s), 'agent.start not in output');
});

test('metrics counts agents per tier', () => {
  const tmp = mkProject();
  const h = mkRun(tmp, [
    { span_id: 'a1', name: 'agent.start', attrs: { tier: 'tier-1' } },
    { span_id: 'a1', name: 'agent.end',   attrs: { tier: 'tier-1' } },
    { span_id: 'b1', name: 'agent.start', attrs: { tier: 'tier-2' } },
    { span_id: 'b1', name: 'agent.end',   attrs: { tier: 'tier-2' } },
    { span_id: 'b2', name: 'agent.start', attrs: { tier: 'tier-2' } },
    { span_id: 'b2', name: 'agent.end',   attrs: { tier: 'tier-2' } }
  ]);
  const m = reader.metrics(tmp, [h.runId]);
  assert(m.perTier['tier-1'].count === 1, `tier-1 count: ${m.perTier['tier-1'].count}`);
  assert(m.perTier['tier-2'].count === 2, `tier-2 count: ${m.perTier['tier-2'].count}`);
});

test('metrics aggregates pauses + errors', () => {
  const tmp = mkProject();
  const h = mkRun(tmp, [
    { span_id: 'a1', name: 'agent.start', attrs: { tier: 'tier-1' } },
    { span_id: 'a1', name: 'agent.pause', attrs: { tier: 'tier-1' } },
    { span_id: 'a1', name: 'error',       attrs: { tier: 'tier-1' } }
  ]);
  const m = reader.metrics(tmp, [h.runId]);
  assert(m.totals.pauses === 1, `pauses: ${m.totals.pauses}`);
  assert(m.totals.errors === 1, `errors: ${m.totals.errors}`);
});

test('metrics across all runs when runIds is null', () => {
  const tmp = mkProject();
  mkRun(tmp, [
    { span_id: 'a', name: 'agent.start', attrs: { tier: 'tier-1' } },
    { span_id: 'a', name: 'agent.end',   attrs: { tier: 'tier-1' } }
  ]);
  // stagger so second runId differs
  mkRun(tmp, [
    { span_id: 'b', name: 'agent.start', attrs: { tier: 'tier-2' } },
    { span_id: 'b', name: 'agent.end',   attrs: { tier: 'tier-2' } }
  ]);
  const m = reader.metrics(tmp);
  assert(m.totals.agents >= 2, `agents: ${m.totals.agents}`);
  assert(m.totals.runs >= 2, `runs: ${m.totals.runs}`);
});

test('trace filters to one tier', () => {
  const tmp = mkProject();
  const h = mkRun(tmp, [
    { span_id: 'a1', name: 'agent.start', attrs: { tier: 'tier-1' } },
    { span_id: 'b1', name: 'agent.start', attrs: { tier: 'tier-2' } },
    { span_id: 'a1', name: 'agent.end',   attrs: { tier: 'tier-1' } }
  ]);
  const t1 = reader.trace(tmp, h.runId, 'tier-1');
  const t2 = reader.trace(tmp, h.runId, 'tier-2');
  assert(t1.length === 2, `tier-1: ${t1.length}`);
  assert(t2.length === 1, `tier-2: ${t2.length}`);
});

test('summarize computes agent/pause/error counts', () => {
  const tmp = mkProject();
  const h = mkRun(tmp, [
    { span_id: 'a', name: 'agent.start' },
    { span_id: 'a', name: 'agent.end' },
    { span_id: 'b', name: 'agent.pause' },
    { span_id: 'c', name: 'error' }
  ]);
  const all = reader.readAll(tmp, h.runId);
  const s = reader.summarize(all);
  assert(s.agentCount === 1, `agentCount: ${s.agentCount}`);
  assert(s.pauseCount === 1, `pauseCount: ${s.pauseCount}`);
  assert(s.errorCount === 1, `errorCount: ${s.errorCount}`);
});

function decisionRecord(overrides = {}) {
  return {
    decision: 'Keep durable decisions in the existing event stream',
    reason: 'The event stream already carries run identity and integrity evidence.',
    evidence: ['lib/events.js:emit'],
    result: 'accepted',
    attrs: { tier: 'tier-2', agent: 'god-architect' },
    ...overrides
  };
}

function rewriteChain(file, eventList) {
  let previous = 'genesis';
  const lines = eventList.map((event) => {
    const copy = JSON.parse(JSON.stringify(event));
    copy.prev = previous;
    const line = JSON.stringify(copy);
    previous = `sha256:${crypto.createHash('sha256').update(line).digest('hex')}`;
    return line;
  });
  fs.writeFileSync(file, lines.join('\n') + '\n');
}

function appendRehashedEvent(handle, attrs) {
  const current = fs.readFileSync(handle.file, 'utf8').trim().split('\n').map(JSON.parse);
  current.push({
    trace_id: handle.traceId,
    span_id: handle.rootSpanId,
    ts: new Date().toISOString(),
    name: 'decision.recorded',
    attrs
  });
  rewriteChain(handle.file, current);
}

test('P-MUST-48: decisions returns stable plain objects from valid runs', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  events.recordDecision(h, decisionRecord());
  h.emit({ span_id: 'other', name: 'warn', attrs: { tier: 'tier-2' } });

  const projection = reader.decisions(tmp, [h.runId]);
  assert(JSON.stringify(Object.keys(projection)) === JSON.stringify([
    'items', 'integrityFailures'
  ]), `projection envelope drifted: ${JSON.stringify(projection)}`);
  assert(projection.items.length === 1,
    `expected one decision, got ${projection.items.length}`);
  assert(projection.integrityFailures.length === 0,
    `valid run reported integrity failures: ${JSON.stringify(projection.integrityFailures)}`);
  assert(JSON.stringify(Object.keys(projection.items[0])) === JSON.stringify([
    'runId', 'ts', 'decision', 'reason', 'evidence', 'result', 'attrs'
  ]), `item shape drifted: ${JSON.stringify(projection.items[0])}`);
  assert(projection.items[0].runId === h.runId,
    `runId missing: ${JSON.stringify(projection.items[0])}`);
  assert(projection.items[0].decision === decisionRecord().decision,
    `decision changed: ${JSON.stringify(projection.items[0])}`);
  assert(projection.items[0].attrs.tier === 'tier-2'
    && projection.items[0].attrs.agent === 'god-architect',
  `attrs missing: ${JSON.stringify(projection.items[0])}`);
  assert(projection.items[0].attrs !== events.readRun(tmp, h.runId)[1].attrs,
    'projection leaked the event attrs object');
});

test('P-MUST-48: decisions excludes every event from a tampered run', () => {
  const tmp = mkProject();
  const valid = events.startRun(tmp, { workflow: 'valid' });
  events.recordDecision(valid, decisionRecord({ result: 'kept' }));
  const tampered = events.startRun(tmp, { workflow: 'tampered' });
  events.recordDecision(tampered, decisionRecord({ result: 'discarded' }));
  tampered.emit({ span_id: 'after', name: 'warn' });

  const lines = fs.readFileSync(tampered.file, 'utf8').trim().split('\n');
  const altered = JSON.parse(lines[1]);
  altered.attrs.result = 'changed after recording';
  lines[1] = JSON.stringify(altered);
  fs.writeFileSync(tampered.file, lines.join('\n') + '\n');

  const projection = reader.decisions(tmp, [valid.runId, tampered.runId]);
  assert(projection.items.length === 1,
    `tampered run leaked into projection: ${JSON.stringify(projection)}`);
  assert(projection.items[0].result === 'kept',
    `wrong decision survived: ${JSON.stringify(projection)}`);
  assert(JSON.stringify(projection.integrityFailures) === JSON.stringify([
    { runId: tampered.runId, reason: 'broken-chain' }
  ]), `broken chain was not surfaced safely: ${JSON.stringify(projection.integrityFailures)}`);
});

test('P-MUST-48: decisions rejects a symlinked run outside the project', () => {
  const tmp = mkProject();
  const outside = mkProject();
  const outsideRun = events.startRun(outside);
  events.recordDecision(outsideRun, decisionRecord({ result: 'must-not-cross-root' }));
  const runId = 'linked-external-run';
  fs.mkdirSync(path.join(tmp, '.godpowers', 'runs'), { recursive: true });
  fs.symlinkSync(path.dirname(outsideRun.file), path.join(tmp, '.godpowers', 'runs', runId));

  const projection = reader.decisions(tmp, runId);
  assert(projection.items.length === 0,
    `external decision crossed the project root: ${JSON.stringify(projection)}`);
  assert(JSON.stringify(projection.integrityFailures) === JSON.stringify([
    { runId, reason: 'unsafe-events-path' }
  ]), `unsafe run path was not diagnosed: ${JSON.stringify(projection)}`);
});

test('P-MUST-48: decisions supports exact filters and a bounded limit', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  events.recordDecision(h, decisionRecord({ result: 'accepted' }));
  events.recordDecision(h, decisionRecord({
    decision: 'Return a repeated design deviation to planning',
    result: 'returned',
    attrs: { tier: 'tier-2', agent: 'god-planner' }
  }));
  events.recordDecision(h, decisionRecord({
    decision: 'Require evidence before publishing the release',
    result: 'accepted',
    attrs: { tier: 'tier-5', agent: 'god-launch-strategist' }
  }));

  const filtered = reader.decisions(tmp, h.runId, {
    tier: 'tier-2',
    agent: 'god-planner',
    result: 'returned',
    since: '1970-01-01T00:00:00.000Z',
    limit: 5000
  });
  assert(filtered.items.length === 1, `filters did not compose: ${JSON.stringify(filtered)}`);
  assert(filtered.items[0].attrs.agent === 'god-planner',
    `wrong row: ${JSON.stringify(filtered)}`);

  const bounded = reader.decisions(tmp, h.runId, { limit: 5000 });
  assert(bounded.items.length <= reader.MAX_DECISION_RESULTS,
    `limit exceeded ${reader.MAX_DECISION_RESULTS}: ${bounded.items.length}`);
});

test('P-MUST-48: decisions bounds run selection and ignores malformed options', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  events.recordDecision(h, decisionRecord());
  const requested = [h.runId, ...Array.from(
    { length: reader.MAX_DECISION_RUNS + 10 },
    (_, index) => `missing-run-${index}`
  )];
  const projection = reader.decisions(tmp, requested, { limit: -1, since: 'not-a-date' });
  assert(projection.items.length === 1,
    `run selection changed projected items: ${JSON.stringify(projection)}`);
  assert(projection.integrityFailures.some((failure) => failure.reason === 'run-limit-exceeded'),
    `distinct run overflow was not surfaced: ${JSON.stringify(projection.integrityFailures)}`);

  const nullOptions = reader.decisions(tmp, h.runId, null);
  assert(nullOptions.items.length === 1,
    `null options should use safe defaults: ${JSON.stringify(nullOptions)}`);
});

test('P-MUST-48: decisions caps raw duplicate and invalid run selections before excess access', () => {
  assert(Number.isInteger(reader.MAX_DECISION_RUN_INPUTS),
    'raw run selection cap is not exported');
  const tmp = mkProject();
  const h = events.startRun(tmp);
  events.recordDecision(h, decisionRecord());

  for (const first of [h.runId, '../unsafe-run']) {
    const requested = Array(reader.MAX_DECISION_RUN_INPUTS + 1).fill(first);
    Object.defineProperty(requested, reader.MAX_DECISION_RUN_INPUTS, {
      enumerable: true,
      get() {
        throw new Error('unbounded run selection access');
      }
    });
    let projection;
    try {
      projection = reader.decisions(tmp, requested);
    } catch (err) {
      throw new Error(`raw run selection was not capped: ${err.message}`);
    }
    assert(projection.integrityFailures.some((failure) =>
      failure.reason === 'run-input-limit-exceeded'),
    `raw selection overflow was not diagnosed: ${JSON.stringify(projection)}`);
    if (first === h.runId) {
      assert(projection.items.length === 1, 'bounded duplicate selection lost its run');
    } else {
      assert(projection.items.length === 0, 'invalid run selection produced items');
    }
  }
});

test('P-MUST-48: explicit falsey run selections never widen to every run', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  events.recordDecision(h, decisionRecord());
  for (const selection of ['', 0, false]) {
    const projection = reader.decisions(tmp, selection);
    assert(projection.items.length === 0,
      `falsey selector widened to all runs: ${JSON.stringify(selection)}`);
    assert(projection.integrityFailures.some((failure) =>
      failure.reason === 'invalid-run-selection'),
    `falsey selector was not diagnosed: ${JSON.stringify(selection)}`);
  }
});

test('P-MUST-48: decisions reports bounded event snapshots as integrity failures', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  fs.truncateSync(h.file, events.MAX_EVENTS_FILE_BYTES + 1);
  const projection = reader.decisions(tmp, h.runId);
  assert(projection.items.length === 0, JSON.stringify(projection));
  assert(projection.integrityFailures.some((failure) =>
    failure.reason === 'events-resource-limit'), JSON.stringify(projection));
});

test('P-MUST-48: decisions rejects oversized exact filters without echoing them', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  events.recordDecision(h, decisionRecord());

  for (const [name, maximum] of Object.entries(reader.DECISION_FILTER_LIMITS)) {
    const oversized = 's'.repeat(maximum + 1);
    let error = null;
    try {
      reader.decisions(tmp, h.runId, { [name]: oversized });
    } catch (err) {
      error = err;
    }
    assert(error && new RegExp(`${name} filter`, 'i').test(error.message),
      `${name} filter did not fail closed`);
    assert(!error.message.includes(oversized),
      `${name} filter value leaked into the error`);
  }
});

test('P-MUST-48: projection rejects rehashed malformed and secret-bearing decisions', () => {
  const providerTokens = [
    `npm_${'a'.repeat(36)}`,
    `glpat-${'b'.repeat(24)}`,
    `xoxb-${'1'.repeat(12)}-${'2'.repeat(12)}-${'c'.repeat(24)}`,
    `AIza${'D'.repeat(35)}`
  ];
  const cases = [
    {
      decision: 'Keep invalid metadata outside the projection',
      reason: 'The reader must enforce the writer contract.',
      evidence: ['lib/events.js'],
      result: 'rejected',
      unknownMetadata: 'not allowlisted'
    },
    {
      decision: 'Keep nested secrets outside the projection',
      reason: 'The reader must scan the complete record.',
      evidence: ['lib/events.js'],
      result: 'rejected',
      note: { nested: { clientSecret: 'value-must-not-appear' } }
    },
    {
      decision: 'Keep oversized evidence outside the projection',
      reason: 'The reader must apply schema bounds.',
      evidence: Array(events.MAX_DECISION_EVIDENCE + 1).fill('lib/events.js'),
      result: 'rejected'
    },
    {
      decision: 'Keep malformed citations outside the projection',
      reason: 'Evidence must identify a source.',
      evidence: ['not a source citation'],
      result: 'rejected'
    },
    {
      decision: 'Keep citation userinfo outside the projection',
      reason: 'Durable citations cannot contain URL authority credentials.',
      evidence: ['https://user:pass@example.com/proof'],
      result: 'rejected'
    },
    {
      decision: 'Keep citation queries outside the projection',
      reason: 'Durable citations cannot contain query data.',
      evidence: ['https://example.com/proof?page=1'],
      result: 'rejected'
    },
    {
      decision: 'Keep credential-shaped fragments outside the projection',
      reason: 'Durable citations cannot contain secret-bearing fragment data.',
      evidence: ['https://example.com/proof#access_token=abcdefghijklmno'],
      result: 'rejected'
    },
    ...providerTokens.map((providerToken) => ({
      decision: 'Keep provider credentials outside the projection',
      reason: 'Decision history is durable.',
      evidence: ['agents/release.md'],
      result: 'rejected',
      note: providerToken
    }))
  ];

  for (const attrs of cases) {
    const tmp = mkProject();
    const h = events.startRun(tmp);
    appendRehashedEvent(h, attrs);
    assert(events.verifyChain(h.file).valid, 'fixture must have a recomputed valid chain');
    const projection = reader.decisions(tmp, h.runId);
    assert(projection.items.length === 0,
      `invalid rehashed event leaked: ${JSON.stringify(projection)}`);
    assert(projection.integrityFailures.some((failure) =>
      failure.reason === 'invalid-decision-record'),
    `invalid record was not surfaced: ${JSON.stringify(projection.integrityFailures)}`);
    for (const providerToken of providerTokens) {
      assert(!JSON.stringify(projection).includes(providerToken),
        'projection disclosed a provider token');
    }
  }
});

test('P-MUST-48: projection keeps only the bounded tail of matching decisions', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  for (let index = 0; index < reader.MAX_DECISION_RESULTS + 10; index++) {
    events.recordDecision(h, decisionRecord({
      decision: `Decision number ${index} remains in bounded history`,
      result: `accepted-${index}`
    }));
  }
  const projection = reader.decisions(tmp, h.runId, { limit: 10000 });
  assert(projection.items.length === reader.MAX_DECISION_RESULTS,
    `tail size is unbounded: ${projection.items.length}`);
  assert(projection.items[0].result === 'accepted-10',
    `projection did not retain the newest tail: ${projection.items[0].result}`);
  assert(projection.items[projection.items.length - 1].result === 'accepted-109',
    'projection lost the newest decision');
});

test('P-MUST-48: projection verifies and parses one file snapshot', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  events.recordDecision(h, decisionRecord());
  const originalRead = fs.readFileSync;
  let snapshotReads = 0;
  fs.readFileSync = function patchedRead(file, ...args) {
    if (path.resolve(String(file)) === path.resolve(h.file)) snapshotReads++;
    return originalRead.call(this, file, ...args);
  };
  try {
    const projection = reader.decisions(tmp, h.runId);
    assert(projection.items.length === 1, 'snapshot projection lost the decision');
  } finally {
    fs.readFileSync = originalRead;
  }
  assert(snapshotReads === 1, `run file was read ${snapshotReads} times`);
});

test('P-MUST-48: observed links do not claim tail-truncation detection', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  events.recordDecision(h, decisionRecord());
  h.emit({ span_id: 'tail', name: 'warn' });
  const lines = fs.readFileSync(h.file, 'utf8').trim().split('\n');
  fs.writeFileSync(h.file, lines.slice(0, -1).join('\n') + '\n');

  const projection = reader.decisions(tmp, h.runId);
  assert(projection.items.length === 1,
    'removing an unanchored tail should leave observed links internally valid');
  assert(projection.integrityFailures.length === 0,
    `tail truncation was overstated: ${JSON.stringify(projection.integrityFailures)}`);

  const skill = fs.readFileSync(path.join(__dirname, '..', 'skills', 'god-trace.md'), 'utf8');
  for (const phrase of ['observed hash links', 'tail truncation', 'full recomputation', 'workspace authentication']) {
    assert(skill.includes(phrase), `skill omits integrity limitation: ${phrase}`);
  }
});

test('P-MUST-48: omitted run selection still reports bounded integrity failures', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  events.recordDecision(h, decisionRecord());
  h.emit({ span_id: 'after', name: 'warn' });
  const lines = fs.readFileSync(h.file, 'utf8').trim().split('\n');
  const altered = JSON.parse(lines[1]);
  altered.attrs.result = 'replaced after append';
  lines[1] = JSON.stringify(altered);
  fs.writeFileSync(h.file, lines.join('\n') + '\n');

  const projection = reader.decisions(tmp);
  assert(projection.items.length === 0, 'implicit scan leaked a broken run');
  assert(JSON.stringify(projection.integrityFailures) === JSON.stringify([
    { runId: h.runId, reason: 'broken-chain' }
  ]), `implicit integrity failure missing: ${JSON.stringify(projection.integrityFailures)}`);
  assert(projection.integrityFailures.length <= reader.MAX_DECISION_INTEGRITY_FAILURES,
    'implicit integrity failures exceeded their bound');
});

test('P-MUST-48: omitted selection retains the newest bounded run window', () => {
  const tmp = mkProject();
  const runsDir = path.join(tmp, '.godpowers', 'runs');
  for (let index = 0; index <= reader.MAX_DECISION_RUNS; index++) {
    const h = events.startRun(tmp);
    events.recordDecision(h, decisionRecord({ result: `accepted-${index}` }));
    fs.renameSync(path.dirname(h.file), path.join(
      runsDir,
      `run-${String(index).padStart(3, '0')}`
    ));
  }

  const projection = reader.decisions(tmp);
  assert(projection.items.length === reader.MAX_DECISION_RUNS,
    `implicit run window has ${projection.items.length} items`);
  assert(projection.items[0].result === 'accepted-1',
    `implicit scan retained a stale run: ${projection.items[0].result}`);
  assert(projection.items[projection.items.length - 1].result === 'accepted-100',
    'implicit scan omitted the newest run');
  assert(projection.integrityFailures.some((failure) =>
    failure.reason === 'run-limit-exceeded'),
  `implicit run overflow was not diagnosed: ${JSON.stringify(projection)}`);
});

test('P-MUST-48: /god-trace documents decision projection without losing tier trace', () => {
  const root = path.join(__dirname, '..');
  const skill = fs.readFileSync(path.join(root, 'skills', 'god-trace.md'), 'utf8');
  const route = fs.readFileSync(path.join(root, 'routing', 'god-trace.yaml'), 'utf8');
  assert(skill.includes('/god-trace --decisions'), 'skill omits --decisions');
  assert(skill.includes('trace(projectRoot, runId, tier)'), 'skill lost tier trace contract');
  assert(skill.includes('decisions(projectRoot, runIds, opts)'), 'skill omits decisions API');
  assert(/decision\.recorded/.test(skill), 'skill omits decision event contract');
  assert(skill.includes('{ items, integrityFailures }'), 'skill omits stable projection shape');
  assert(/decision/.test(route), 'route does not describe decision trace behavior');
});

report();
