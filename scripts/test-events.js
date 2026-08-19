#!/usr/bin/env node
/**
 * Behavioral tests for lib/events.js.
 *
 * Events.jsonl is the audit trail. If event writes fail silently or the
 * vocabulary drifts from the schema, recovery and observability both
 * lose their source of truth.
 *
 * Tests assert:
 *   - startRun creates the run directory + emits workflow.run
 *   - emit rejects events without trace_id / span_id / name
 *   - emit rejects events with unknown event name (vocabulary contract)
 *   - emit appends; multiple emits round-trip via readRun
 *   - spawn produces child spans with correct parent reference
 *   - listRuns enumerates created runs
 *   - vocabulary covers what schema/events.v1.json declares
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const events = require('../lib/events');
const { test, report, assert } = require('./test-harness');



function mkProject() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-events-test-'));
  fs.mkdirSync(path.join(tmp, '.godpowers'), { recursive: true });
  return tmp;
}

console.log('\n  Events module behavioral tests\n');

test('startRun creates run dir and emits workflow.run', () => {
  const tmp = mkProject();
  const handle = events.startRun(tmp, { workflow: 'full-arc' });
  assert(handle.traceId && /^[a-f0-9]{32}$/.test(handle.traceId),
    `bad traceId: ${handle.traceId}`);
  assert(handle.runId, 'runId missing');
  assert(fs.existsSync(handle.file), 'events.jsonl not created');
  const lines = fs.readFileSync(handle.file, 'utf8').trim().split('\n');
  assert(lines.length === 1, `expected 1 line, got ${lines.length}`);
  const first = JSON.parse(lines[0]);
  assert(first.name === 'workflow.run', `first event: ${first.name}`);
  assert(first.attrs.workflow === 'full-arc', 'attrs not threaded');
});

test('handle.emit appends events to the same file', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  h.emit({ span_id: 'aabbccdd00112233', name: 'agent.start' });
  h.emit({ span_id: 'aabbccdd00112234', name: 'agent.end' });
  const all = events.readRun(tmp, h.runId);
  assert(all.length === 3, `expected 3 events, got ${all.length}`);
  assert(all[1].name === 'agent.start', `wrong order`);
  assert(all[2].name === 'agent.end', `wrong order`);
});

test('large event lines still produce a valid hash chain', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  h.emit({ span_id: 'aabbccdd00112233', name: 'warn', attrs: { big: 'x'.repeat(5000) } });
  h.emit({ span_id: 'aabbccdd00112234', name: 'agent.end' });
  const r = events.verifyChain(h.file);
  assert(r.valid, `chain reported invalid: ${JSON.stringify(r)}`);
});

test('emit rejects event missing trace_id', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  try {
    events.emit(h.file, { span_id: 'x', name: 'agent.start' });
    throw new Error('should have thrown');
  } catch (e) {
    assert(/trace_id/.test(e.message), `unexpected error: ${e.message}`);
  }
});

test('emit rejects event missing span_id', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  try {
    events.emit(h.file, { trace_id: 'x', name: 'agent.start' });
    throw new Error('should have thrown');
  } catch (e) {
    assert(/span_id/.test(e.message), `unexpected error: ${e.message}`);
  }
});

test('emit rejects event missing name', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  try {
    events.emit(h.file, { trace_id: 'x', span_id: 'y' });
    throw new Error('should have thrown');
  } catch (e) {
    assert(/name/.test(e.message), `unexpected error: ${e.message}`);
  }
});

test('emit rejects unknown event name (vocabulary gate)', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  try {
    events.emit(h.file, {
      trace_id: 'x', span_id: 'y', name: 'agent.invented-event'
    });
    throw new Error('should have thrown');
  } catch (e) {
    assert(/invalid event name/i.test(e.message),
      `unexpected error: ${e.message}`);
  }
});

test('emit auto-fills ts when missing', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  h.emit({ span_id: 'aa', name: 'agent.start' });
  const all = events.readRun(tmp, h.runId);
  const ev = all[all.length - 1];
  assert(/^\d{4}-\d{2}-\d{2}T/.test(ev.ts), `bad ts: ${ev.ts}`);
});

test('spawn creates child span with parent reference', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  const child = h.spawn();
  child.emit({ name: 'agent.start' });
  const all = events.readRun(tmp, h.runId);
  const childEv = all.find(e => e.name === 'agent.start');
  assert(childEv, 'child event not written');
  assert(childEv.parent === h.rootSpanId,
    `child parent should be root span; got ${childEv.parent}`);
  assert(childEv.span_id !== h.rootSpanId, 'child span_id should differ from root');
});

test('listRuns returns created run ids', () => {
  const tmp = mkProject();
  events.startRun(tmp);
  // tiny stagger so the second runId differs
  events.startRun(tmp, { workflow: 'audit-only' });
  const runs = events.listRuns(tmp);
  assert(runs.length >= 1, `expected >=1 runs, got ${runs.length}`);
});

test('readRun returns [] for missing run', () => {
  const tmp = mkProject();
  const all = events.readRun(tmp, 'nonexistent');
  assert(Array.isArray(all) && all.length === 0,
    `expected empty array, got ${JSON.stringify(all)}`);
});

test('event readers and writers fail closed before loading oversized run files', () => {
  const project = mkProject();
  const h = events.startRun(project);
  fs.truncateSync(h.file, events.MAX_EVENTS_FILE_BYTES + 1);
  assert(events.readRun(project, h.runId).length === 0, 'oversized readRun was accepted');
  const snapshot = events.readVerifiedRunSnapshot(project, h.runId);
  assert(snapshot.valid === false && snapshot.error === 'events-resource-limit',
    JSON.stringify(snapshot));
  const chain = events.verifyChain(h.file);
  assert(chain.valid === false && chain.error === 'events-resource-limit', JSON.stringify(chain));
  let error = null;
  try {
    h.emit({ span_id: h.rootSpanId, name: 'warn', attrs: { note: 'bounded' } });
  } catch (err) {
    error = err;
  }
  assert(error && /exceeds/.test(error.message), 'writer accepted an oversized run file');
});

test('event reads reject traversal and symlinked run directories', () => {
  const tmp = mkProject();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-events-outside-'));
  fs.writeFileSync(path.join(outside, 'events.jsonl'), '{"outside":true}\n');
  assert(events.readRun(tmp, '../../../outside-run').length === 0,
    'traversal read escaped the project');

  const runsDir = path.join(tmp, '.godpowers', 'runs');
  fs.mkdirSync(runsDir, { recursive: true });
  fs.symlinkSync(outside, path.join(runsDir, 'linked-run'));
  assert(events.readRun(tmp, 'linked-run').length === 0,
    'symlinked run read escaped the project');
  assert(!events.listRuns(tmp).includes('linked-run'),
    'listRuns exposed a symlinked run directory');
});

test('VALID_EVENT_NAMES exposes the vocabulary set', () => {
  assert(events.VALID_EVENT_NAMES instanceof Set,
    'VALID_EVENT_NAMES should be a Set');
  assert(events.VALID_EVENT_NAMES.has('workflow.run'),
    'vocabulary missing workflow.run');
  assert(events.VALID_EVENT_NAMES.has('agent.start'),
    'vocabulary missing agent.start');
  assert(events.VALID_EVENT_NAMES.has('artifact.created'),
    'vocabulary missing artifact.created');
  assert(events.VALID_EVENT_NAMES.has('local-helper.run'),
    'vocabulary missing local-helper.run');
  assert(events.VALID_EVENT_NAMES.has('host-capabilities.detect'),
    'vocabulary missing host-capabilities.detect');
  assert(events.VALID_EVENT_NAMES.has('decision.recorded'),
    'vocabulary missing decision.recorded');
});

test('P-MUST-48: recordDecision emits a bounded decision through the hash chain', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  const recorded = events.recordDecision(h, {
    decision: 'Keep decision history in the existing event stream',
    reason: 'The event stream already provides append-only run identity and integrity checks.',
    evidence: ['lib/events.js:emit', 'schema/events.v1.json'],
    result: 'Accepted for the current release',
    attrs: {
      tier: ' tier-2 ',
      agent: 'god-architect',
      note: '  reviewed\nby release owner  ',
      attempts: 2,
      approved: true
    }
  });

  assert(recorded.tier === 'tier-2', `tier was not trimmed: ${recorded.tier}`);
  assert(recorded.note === 'reviewed by release owner',
    `note was not normalized: ${recorded.note}`);
  assert(!recorded.note.includes('\n'), 'note retained a newline');
  assert(recorded.attempts === 2 && recorded.approved === true,
    `scalar attrs changed: ${JSON.stringify(recorded)}`);

  const all = events.readRun(tmp, h.runId);
  const decision = all.find((event) => event.name === 'decision.recorded');
  assert(decision, 'decision.recorded was not written');
  assert(decision.attrs.decision === 'Keep decision history in the existing event stream',
    `decision changed: ${JSON.stringify(decision.attrs)}`);
  assert(Array.isArray(decision.attrs.evidence) && decision.attrs.evidence.length === 2,
    `evidence missing: ${JSON.stringify(decision.attrs)}`);
  assert(events.verifyChain(h.file).valid, 'recordDecision broke the hash chain');
});

test('P-MUST-48: recordDecision rejects malformed or missing-evidence records', () => {
  const invalid = [
    null,
    {},
    { decision: 'Use one store', reason: 'Consistency', evidence: [], result: 'Accepted' },
    { decision: 'Use one store', reason: 'Consistency', evidence: [''], result: 'Accepted' },
    { decision: 'yes', reason: 'Consistency', evidence: ['ARCH.mdx'], result: 'Accepted' },
    { decision: 'Use one store', reason: '', evidence: ['ARCH.mdx'], result: 'Accepted' },
    { decision: 'Use one store', reason: 'Consistency', evidence: ['ARCH.mdx'], result: '' },
    { decision: 'Use one store', reason: 'Consistency', evidence: ['ARCH.mdx'], result: 'Accepted', attrs: [] },
    { decision: 'Use one store', reason: 'Consistency', evidence: ['release command'], result: 'Accepted' },
    { decision: 'Use one store', reason: 'Consistency', evidence: Array(events.MAX_DECISION_EVIDENCE + 1).fill('ARCH.mdx'), result: 'Accepted' },
    { decision: 'x'.repeat(events.MAX_DECISION_ATTR_STRING_LENGTH + 1), reason: 'Consistency', evidence: ['ARCH.mdx'], result: 'Accepted' },
    { decision: 'Use one store', reason: 'x'.repeat(events.MAX_DECISION_REASON_LENGTH + 1), evidence: ['ARCH.mdx'], result: 'Accepted' },
    { decision: 'Use one store', reason: 'Consistency', evidence: ['ARCH.mdx'], result: 'x'.repeat(events.MAX_DECISION_ATTR_STRING_LENGTH + 1) },
    { decision: 'Use one store', reason: 'Consistency', evidence: ['ARCH.mdx'], result: 'Accepted', attrs: { unknownField: 'value' } },
    { decision: 'Use one store', reason: 'Consistency', evidence: ['ARCH.mdx'], result: 'Accepted', attrs: { note: { nested: true } } },
    { decision: 'Use one store', reason: 'Consistency', evidence: ['ARCH.mdx'], result: 'Accepted', attrs: { note: 'x'.repeat(events.MAX_DECISION_ATTR_STRING_LENGTH + 1) } }
  ];

  for (const record of invalid) {
    const tmp = mkProject();
    const h = events.startRun(tmp);
    let error = null;
    try {
      events.recordDecision(h, record);
    } catch (err) {
      error = err;
    }
    assert(error && /decision record/i.test(error.message),
      `record should fail safely: ${JSON.stringify(record)}`);
    assert(events.readRun(tmp, h.runId).length === 1,
      'invalid record appended an event');
  }
});

test('P-MUST-48: recordDecision rejects raw secret fields and values', () => {
  const unsafe = [
    {
      decision: 'Use protected credentials for publishing',
      reason: 'The registry requires authentication.',
      evidence: ['agents/release.md'],
      result: 'Use the host secret store',
      attrs: { token: 'not-even-a-real-token' }
    },
    {
      decision: 'Use protected credentials for publishing',
      reason: 'The registry requires authentication.',
      evidence: ['agents/release.md'],
      result: 'Use the host secret store',
      attrs: { note: 'Authorization: Bearer abcdefghijklmnop' }
    },
    {
      decision: 'Use protected credentials for publishing',
      reason: 'The registry requires authentication.',
      evidence: ['ghp_abcdefghijklmnopqrstuvwxyz123456'],
      result: 'Use the host secret store'
    }
  ];

  for (const record of unsafe) {
    const tmp = mkProject();
    const h = events.startRun(tmp);
    let error = null;
    try {
      events.recordDecision(h, record);
    } catch (err) {
      error = err;
    }
    assert(error && /unsafe decision record/i.test(error.message),
      `unsafe record should fail: ${JSON.stringify(record)}`);
    assert(events.readRun(tmp, h.runId).length === 1,
      'unsafe record appended an event');
  }
});

test('P-MUST-48: recordDecision requires a live run handle', () => {
  let error = null;
  try {
    events.recordDecision({}, {
      decision: 'Keep the existing event stream',
      reason: 'It is the current audit boundary.',
      evidence: ['lib/events.js'],
      result: 'Accepted'
    });
  } catch (err) {
    error = err;
  }
  assert(error && /handle/i.test(error.message), `unexpected error: ${error && error.message}`);
});

test('P-MUST-48: generic emit cannot bypass decision validation', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  let error = null;
  try {
    h.emit({
      span_id: h.rootSpanId,
      name: 'decision.recorded',
      attrs: {
        decision: 'Publish with a raw registry credential',
        reason: 'This event must be rejected before append.',
        evidence: ['release command'],
        result: 'rejected',
        password: 'unsafe-value'
      }
    });
  } catch (err) {
    error = err;
  }
  assert(error && /unsafe decision record/i.test(error.message),
    `unexpected error: ${error && error.message}`);
  assert(events.readRun(tmp, h.runId).length === 1,
    'generic emit appended an unsafe decision');
});

test('P-MUST-48: normalized protected field variants fail without value disclosure', () => {
  const secretFields = [
    'accessToken',
    'npm_token',
    'clientSecret',
    'credentials',
    'privateKey',
    'privateKeyPem',
    'apiKeyValue',
    'accessKeyValue',
    'rawStdout',
    'rawLogs',
    'stderrPath',
    'buildLog',
    'error_logs'
  ];
  for (const field of secretFields) {
    const secretValue = `value-for-${field}-must-not-appear`;
    const record = {
      decision: 'Keep credentials outside durable decision metadata',
      reason: 'Decision history is a durable audit surface.',
      evidence: ['agents/release.md'],
      result: 'Use the platform secret store',
      attrs: { [field]: secretValue }
    };

    for (const mode of ['recordDecision', 'emit']) {
      const tmp = mkProject();
      const h = events.startRun(tmp);
      let error = null;
      try {
        if (mode === 'recordDecision') {
          events.recordDecision(h, record);
        } else {
          h.emit({
            span_id: h.rootSpanId,
            name: 'decision.recorded',
            attrs: { ...record, ...record.attrs }
          });
        }
      } catch (err) {
        error = err;
      }
      assert(error && /unsafe decision record/i.test(error.message),
        `${mode} accepted secret field ${field}`);
      assert(!error.message.includes(secretValue),
        `${mode} disclosed the value for ${field}`);
      assert(events.readRun(tmp, h.runId).length === 1,
        `${mode} appended secret field ${field}`);
    }
  }
});

test('P-MUST-48: common registry and provider tokens fail without disclosure', () => {
  const providerTokens = [
    `npm_${'a'.repeat(36)}`,
    `glpat-${'b'.repeat(24)}`,
    `xoxb-${'1'.repeat(12)}-${'2'.repeat(12)}-${'c'.repeat(24)}`,
    `AIza${'D'.repeat(35)}`,
    `pypi-${'E'.repeat(40)}`,
    `github_pat_${'F'.repeat(30)}`
  ];
  for (const providerToken of providerTokens) {
    const record = {
      decision: 'Keep provider credentials outside decision history',
      reason: 'Decision events are durable project evidence.',
      evidence: ['agents/release.md'],
      result: 'Use the platform secret store',
      attrs: { note: providerToken }
    };
    for (const mode of ['recordDecision', 'emit']) {
      const tmp = mkProject();
      const h = events.startRun(tmp);
      let error = null;
      try {
        if (mode === 'recordDecision') {
          events.recordDecision(h, record);
        } else {
          h.emit({
            span_id: h.rootSpanId,
            name: 'decision.recorded',
            attrs: { ...record, ...record.attrs }
          });
        }
      } catch (err) {
        error = err;
      }
      assert(error && /unsafe decision record/i.test(error.message),
        `${mode} accepted a provider token`);
      assert(!error.message.includes(providerToken), `${mode} disclosed a provider token`);
    }
  }
});

test('P-MUST-48: decision event schema declares the runtime bounds and allowlist', () => {
  const schema = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'schema', 'events.v1.json'), 'utf8'));
  const decision = schema.$defs && schema.$defs.decisionAttrs;
  assert(decision && decision.additionalProperties === false,
    'schema omits the decision attrs allowlist');
  assert(decision.properties.decision.maxLength === events.MAX_DECISION_ATTR_STRING_LENGTH,
    'schema decision bound differs from runtime');
  assert(decision.properties.reason.maxLength === events.MAX_DECISION_REASON_LENGTH,
    'schema reason bound differs from runtime');
  assert(decision.properties.evidence.maxItems === events.MAX_DECISION_EVIDENCE,
    'schema evidence bound differs from runtime');
  assert(decision.properties.note.maxLength === events.MAX_DECISION_ATTR_STRING_LENGTH,
    'schema metadata bound differs from runtime');
  assert(decision.properties.evidence.items.pattern === events.DECISION_CITATION_SCHEMA_PATTERN,
    'schema citation syntax differs from runtime');
  assert(schema.allOf && schema.allOf.some((rule) =>
    rule.if && rule.if.properties && rule.if.properties.name.const === 'decision.recorded'),
  'schema does not apply decision attrs to decision.recorded');
});

test('P-MUST-48: HTTPS citations reject authority, query, and unsafe fragment data', () => {
  const invalidCitations = [
    'https://user:pass@example.com/proof',
    'https://example.com/proof?page=1',
    'https://example.com/proof?',
    'https://example.com/proof#access_token=abcdefghijklmno',
    'https://example.com/proof#X-Amz-Signature=abcdef0123456789',
    'https://example.com/proof#sig=abcdef0123456789'
  ];
  for (const citation of invalidCitations) {
    const tmp = mkProject();
    const h = events.startRun(tmp);
    let error = null;
    try {
      events.recordDecision(h, {
        decision: 'Keep citations free of embedded authority and query data',
        reason: 'Decision citations are durable and must remain non-sensitive.',
        evidence: [citation],
        result: 'rejected'
      });
    } catch (err) {
      error = err;
    }
    assert(error && /citation/i.test(error.message),
      `unsafe HTTPS citation passed: ${citation}`);
    assert(!error.message.includes(citation), 'citation error echoed the rejected value');
  }

  const tmp = mkProject();
  const h = events.startRun(tmp);
  const attrs = events.recordDecision(h, {
    decision: 'Use a query-free HTTPS citation for external evidence',
    reason: 'The host and path identify the public evidence source.',
    evidence: ['https://example.com/docs/release#proof'],
    result: 'accepted'
  });
  assert(attrs.evidence[0] === 'https://example.com/docs/release#proof',
    'valid HTTPS citation changed');
});

test('P-MUST-48: validator rejects oversized collections before scanning their contents', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  const evidence = Array(events.MAX_DECISION_EVIDENCE + 1).fill('ARCH.mdx');
  Object.defineProperty(evidence, events.MAX_DECISION_EVIDENCE, {
    enumerable: true,
    get() {
      throw new Error('unbounded evidence access');
    }
  });
  let error = null;
  try {
    events.recordDecision(h, {
      decision: 'Reject oversized evidence before inspecting extra items',
      reason: 'The validator must enforce collection bounds before content scans.',
      evidence,
      result: 'rejected'
    });
  } catch (err) {
    error = err;
  }
  assert(error && /schema bound/i.test(error.message),
    `validator inspected beyond its bound: ${error && error.message}`);
});

test('vocabulary and schema/events.v1.json enum are byte-for-byte in sync', () => {
  // Spot checks above cannot catch drift; this set-diffs the two
  // vocabularies both directions so a name added to one surface without the
  // other fails the suite (the lesson.*/proposal.* families drifted exactly
  // this way once).
  const schema = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'schema', 'events.v1.json'), 'utf8'));
  const schemaNames = new Set(schema.properties.name.enum);
  const missingFromSchema = [...events.VALID_EVENT_NAMES].filter((n) => !schemaNames.has(n));
  const missingFromRuntime = [...schemaNames].filter((n) => !events.VALID_EVENT_NAMES.has(n));
  assert(missingFromSchema.length === 0,
    `schema/events.v1.json enum missing: ${missingFromSchema.join(', ')}`);
  assert(missingFromRuntime.length === 0,
    `lib/events.js VALID_EVENT_NAMES missing: ${missingFromRuntime.join(', ')}`);
});

report();
