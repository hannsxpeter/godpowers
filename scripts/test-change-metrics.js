#!/usr/bin/env node
/**
 * Accepted-change-rate metric tests.
 */

const path = require('path');
const changeMetrics = require('../lib/change-metrics');
const events = require('../lib/events');
const { test, assert, mkProject, report } = require('./test-harness');

console.log('\n  Accepted-change-rate metric tests\n');

test('classify counts gate signals when no explicit change events exist', () => {
  const summary = changeMetrics.classify([
    { name: 'gate.pass', ts: '2026-07-01T00:00:00Z' },
    { name: 'gate.pass', ts: '2026-07-01T00:01:00Z' },
    { name: 'gate.pass', ts: '2026-07-01T00:02:00Z' },
    { name: 'gate.fail', ts: '2026-07-01T00:03:00Z' }
  ]);
  assert(summary.accepted === 3, `accepted=${summary.accepted}`);
  assert(summary.rejected === 1, `rejected=${summary.rejected}`);
  assert(summary.decided === 4, `decided=${summary.decided}`);
  assert(summary.proposed === 4, `proposed=${summary.proposed}`);
  assert(summary.ratePercent === 75, `ratePercent=${summary.ratePercent}`);
  assert(summary.meetsTarget === true, 'should meet 50% target');
  assert(summary.verdict === 'healthy', `verdict=${summary.verdict}`);
});

test('state.rollback counts as a rejection', () => {
  const summary = changeMetrics.classify([
    { name: 'gate.pass' },
    { name: 'state.rollback' },
    { name: 'state.rollback' }
  ]);
  assert(summary.accepted === 1 && summary.rejected === 2, JSON.stringify(summary));
  assert(summary.verdict === 'thrashing', `verdict=${summary.verdict}`);
  assert(summary.meetsTarget === false, 'below target');
});

test('explicit change.* events take precedence for proposed count', () => {
  const summary = changeMetrics.classify([
    { name: 'change.proposed' },
    { name: 'change.proposed' },
    { name: 'change.proposed' },
    { name: 'change.accepted' },
    { name: 'change.accepted' },
    { name: 'change.rejected' }
  ]);
  assert(summary.proposed === 3, `proposed=${summary.proposed}`);
  assert(summary.accepted === 2 && summary.rejected === 1, JSON.stringify(summary));
});

test('empty ledger yields a null rate and no-data verdict', () => {
  const summary = changeMetrics.classify([]);
  assert(summary.rate === null, 'rate should be null');
  assert(summary.ratePercent === null, 'ratePercent should be null');
  assert(summary.meetsTarget === null, 'meetsTarget should be null');
  assert(summary.verdict === 'no-data', `verdict=${summary.verdict}`);
});

test('classify ignores malformed entries and unknown names', () => {
  const summary = changeMetrics.classify([null, {}, { name: 'agent.start' }, { name: 'gate.pass' }]);
  assert(summary.accepted === 1 && summary.decided === 1, JSON.stringify(summary));
});

test('a custom target changes the verdict boundary', () => {
  const summary = changeMetrics.classify(
    [{ name: 'gate.pass' }, { name: 'gate.pass' }, { name: 'gate.fail' }],
    { target: 0.9 }
  );
  assert(summary.rate > 0.66 && summary.rate < 0.67, `rate=${summary.rate}`);
  assert(summary.meetsTarget === false, 'should miss a 90% target');
});

test('parseSince understands relative, iso, numeric, and all', () => {
  assert(changeMetrics.parseSince('all') === null, 'all -> null');
  assert(changeMetrics.parseSince(null) === null, 'null -> null');
  assert(typeof changeMetrics.parseSince('7d') === 'number', '7d -> number');
  assert(typeof changeMetrics.parseSince('30m') === 'number', '30m -> number');
  assert(changeMetrics.parseSince('2026-01-01T00:00:00Z') === Date.parse('2026-01-01T00:00:00Z'), 'iso');
  assert(typeof changeMetrics.parseSince(60000) === 'number', 'numeric duration');
  assert(changeMetrics.parseSince('nonsense') === null, 'garbage -> null');
});

test('since window filters out older events', () => {
  const summary = changeMetrics.classify(
    [
      { name: 'gate.pass', ts: '2020-01-01T00:00:00Z' },
      { name: 'gate.pass', ts: '2099-01-01T00:00:00Z' },
      { name: 'gate.fail' }
    ],
    { since: '2026-01-01T00:00:00Z' }
  );
  // Old accepted dropped; future accepted kept; the fail has no ts so it is dropped.
  assert(summary.accepted === 1, `accepted=${summary.accepted}`);
  assert(summary.rejected === 0, `rejected=${summary.rejected}`);
});

test('compute reads a real project ledger from disk', () => {
  const project = mkProject('godpowers-change-metrics-');
  const run = events.startRun(project, { arc: 'test' });
  run.emit({ span_id: events.generateSpanId(), name: 'gate.pass' });
  run.emit({ span_id: events.generateSpanId(), name: 'gate.pass' });
  run.emit({ span_id: events.generateSpanId(), name: 'gate.fail' });
  run.emit({ span_id: events.generateSpanId(), name: 'change.accepted' });

  const metric = changeMetrics.compute(project);
  assert(metric.runs === 1, `runs=${metric.runs}`);
  assert(metric.accepted === 3, `accepted=${metric.accepted}`);
  assert(metric.rejected === 1, `rejected=${metric.rejected}`);
  assert(metric.window === 'all', `window=${metric.window}`);
  assert(metric.ratePercent === 75, `ratePercent=${metric.ratePercent}`);
});

test('compute on an empty project reports no data', () => {
  const project = mkProject('godpowers-change-metrics-empty-');
  const metric = changeMetrics.compute(project, { since: '1d' });
  assert(metric.runs === 0, `runs=${metric.runs}`);
  assert(metric.rate === null, 'no data');
  assert(metric.window === '1d', `window=${metric.window}`);
});

test('render shows a percentage when data exists and n/a otherwise', () => {
  const withData = changeMetrics.render(changeMetrics.compute.length
    ? { rate: 0.75, ratePercent: 75, proposed: 4, accepted: 3, rejected: 1, target: 0.5, meetsTarget: true, verdict: 'healthy', window: 'all', runs: 1 }
    : {});
  assert(withData.includes('75%'), 'shows percent');
  assert(withData.includes('above target'), 'shows status');
  const noData = changeMetrics.render({ rate: null, ratePercent: null, proposed: 0, accepted: 0, rejected: 0, target: 0.5, verdict: 'no-data', window: 'all', runs: 0 });
  assert(noData.includes('n/a'), 'shows n/a');
  assert(noData.includes('no data'), 'shows no data status');
});

report();
