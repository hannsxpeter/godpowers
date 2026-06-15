#!/usr/bin/env node

const fs = require('fs');

const workReport = require('../lib/work-report');
const evidence = require('../lib/evidence');
const state = require('../lib/state');
const { test, assert, mkProject, report } = require('./test-harness');

function project(prefix) {
  const dir = mkProject(prefix);
  state.init(dir, prefix.replace(/[^a-z0-9]+/gi, '-'));
  return dir;
}

test('report on an empty ledger is empty', () => {
  const dir = project('godpowers-report-empty-');
  const result = workReport.report({ projectRoot: dir });
  assert(result.records.length === 0, 'no records expected');
  assert(result.summary.total === 0, 'summary total should be 0');
  assert(workReport.render(result).includes('Nothing new'), 'render should say nothing new');
});

test('report summarizes passed, failed, and attested records', () => {
  const dir = project('godpowers-report-summary-');
  evidence.verify('true', { substep: 'tier-2.build', claim: 'tests', projectRoot: dir });
  evidence.verify('false', { substep: 'tier-2.build', claim: 'lint', projectRoot: dir });
  evidence.verifyClaim('prd rationale', 'reviewed', { substep: 'tier-1.prd', projectRoot: dir });

  const result = workReport.report({ since: 'all', peek: true, projectRoot: dir });
  assert(result.summary.total === 3, `total: ${result.summary.total}`);
  assert(result.summary.passed === 1, `passed: ${result.summary.passed}`);
  assert(result.summary.failed === 1, `failed: ${result.summary.failed}`);
  assert(result.summary.attested === 1, `attested: ${result.summary.attested}`);
  assert(result.attention.length === 1, `attention: ${result.attention.length}`);
  assert(result.attention[0].command === 'false', 'attention should hold the failed record');
  const text = workReport.render(result);
  assert(text.includes('Attention'), 'render should include an Attention section');
});

test('report advances a cursor so the next report shows only new records', () => {
  const dir = project('godpowers-report-cursor-');
  evidence.verify('true', { substep: 'tier-2.build', now: '2026-06-15T10:00:00.000Z', projectRoot: dir });

  const first = workReport.report({ since: 'last', projectRoot: dir });
  assert(first.records.length === 1, `first window: ${first.records.length}`);
  assert(fs.existsSync(workReport.cursorPath(dir)), 'cursor file should be written');

  const second = workReport.report({ since: 'last', projectRoot: dir });
  assert(second.records.length === 0, 'second report should be empty after advancing');

  evidence.verify('true', { substep: 'tier-2.build', now: '2026-06-15T11:00:00.000Z', projectRoot: dir });
  const third = workReport.report({ since: 'last', projectRoot: dir });
  assert(third.records.length === 1, `third window should show the new record: ${third.records.length}`);
});

test('peek does not advance the cursor', () => {
  const dir = project('godpowers-report-peek-');
  evidence.verify('true', { substep: 'tier-2.build', now: '2026-06-15T10:00:00.000Z', projectRoot: dir });

  const peek1 = workReport.report({ since: 'last', peek: true, projectRoot: dir });
  const peek2 = workReport.report({ since: 'last', peek: true, projectRoot: dir });
  assert(peek1.records.length === 1 && peek2.records.length === 1, 'peek should not advance the cursor');
  assert(peek1.cursor.previous === null, 'first peek previous cursor should be null');
});

test('report does not mutate state.json', () => {
  const dir = project('godpowers-report-readonly-');
  evidence.verify('true', { substep: 'tier-2.build', projectRoot: dir });
  const before = JSON.stringify(state.read(dir));
  workReport.report({ since: 'all', projectRoot: dir });
  const after = JSON.stringify(state.read(dir));
  assert(before === after, 'report must not mutate state.json');
});

report('Work report tests');
