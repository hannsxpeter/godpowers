#!/usr/bin/env node

const outcomeMetrics = require('../lib/outcome-metrics');
const { test, assert, report } = require('./test-harness');

function event(name, ts, attrs = {}) {
  return { name, ts, trace_id: attrs.trace_id || 'trace-a', attrs };
}

test('derive reports user outcomes supported by event evidence', () => {
  const metrics = outcomeMetrics.derive([
    event('workflow.run', '2026-07-13T10:00:00.000Z', { resume: true }),
    event('change.proposed', '2026-07-13T10:01:00.000Z'),
    event('cost.recorded', '2026-07-13T10:02:00.000Z', { costUsd: 1.25 }),
    event('agent.pause', '2026-07-13T10:03:00.000Z'),
    event('user.resolve', '2026-07-13T10:04:00.000Z'),
    event('change.accepted', '2026-07-13T10:06:00.000Z'),
    event('gate.pass', '2026-07-13T10:07:00.000Z', { tier: 'deploy' }),
    event('state.rollback', '2026-07-13T10:08:00.000Z', { rollbackEvidence: 'npm run rollback:smoke' }),
    event('workflow.complete', '2026-07-13T10:09:00.000Z')
  ]);
  assert(metrics.timeToAcceptedChange.sampleCount === 1, JSON.stringify(metrics));
  assert(metrics.timeToAcceptedChange.averageMs === 300000, JSON.stringify(metrics));
  assert(metrics.cost.totalUsd === 1.25, JSON.stringify(metrics));
  assert(metrics.manualIntervention.resolutions === 1, JSON.stringify(metrics));
  assert(metrics.resumeSuccess.successful === 1, JSON.stringify(metrics));
  assert(metrics.deploymentCompletion.completed === 1, JSON.stringify(metrics));
  assert(metrics.rollbackProof.proven === 1, JSON.stringify(metrics));
});

test('derive reports unavailable metrics honestly when events cannot prove them', () => {
  const metrics = outcomeMetrics.derive([event('workflow.run', '2026-07-13T10:00:00.000Z')]);
  assert(metrics.timeToAcceptedChange.status === 'no-data', JSON.stringify(metrics));
  assert(metrics.cost.status === 'no-data', JSON.stringify(metrics));
  assert(metrics.resumeSuccess.status === 'no-data', JSON.stringify(metrics));
  assert(metrics.deploymentCompletion.status === 'no-data', JSON.stringify(metrics));
  assert(metrics.rollbackProof.status === 'no-data', JSON.stringify(metrics));
  assert(outcomeMetrics.render(metrics).includes('Cost: no event evidence'), outcomeMetrics.render(metrics));
});

test('derive never accepts a proposal with an event from another trace', () => {
  const metrics = outcomeMetrics.derive([
    event('change.proposed', '2026-07-13T10:00:00.000Z', { trace_id: 'trace-a' }),
    event('gate.pass', '2026-07-13T10:01:00.000Z', { trace_id: 'trace-b' }),
    event('change.accepted', '2026-07-13T10:04:00.000Z', { trace_id: 'trace-a' })
  ]);
  assert(metrics.timeToAcceptedChange.sampleCount === 1, JSON.stringify(metrics));
  assert(metrics.timeToAcceptedChange.averageMs === 240000, JSON.stringify(metrics));
});

test('derive does not correlate malformed events without trace identity', () => {
  const metrics = outcomeMetrics.derive([
    { name: 'change.proposed', ts: '2026-07-13T10:00:00.000Z', attrs: {} },
    { name: 'change.accepted', ts: '2026-07-13T10:05:00.000Z', attrs: {} }
  ]);
  assert(metrics.timeToAcceptedChange.status === 'no-data', JSON.stringify(metrics));
  assert(metrics.timeToAcceptedChange.sampleCount === 0, JSON.stringify(metrics));
});

report('Outcome metrics behavioral tests');
