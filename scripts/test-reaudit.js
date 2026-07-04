#!/usr/bin/env node
/**
 * Permission re-audit cadence tests.
 */

const reaudit = require('../lib/reaudit');
const { test, assert, mkProject, report } = require('./test-harness');

console.log('\n  Permission re-audit cadence tests\n');

const NOW = Date.parse('2026-07-03T00:00:00Z');

test('never-audited projects are always due', () => {
  const e = reaudit.evaluate({ lastAuditAt: null, now: NOW });
  assert(e.due === true, 'due');
  assert(e.verdict === 'never-audited', `verdict=${e.verdict}`);
  assert(e.ageDays === null, 'no age');
  assert(e.cadenceDays === 30, 'default cadence');
});

test('a recent audit is current and not due', () => {
  const e = reaudit.evaluate({ lastAuditAt: '2026-06-20T00:00:00Z', now: NOW });
  assert(e.ageDays === 13, `ageDays=${e.ageDays}`);
  assert(e.due === false, 'not due');
  assert(e.verdict === 'current', `verdict=${e.verdict}`);
  assert(e.nextDueAt.startsWith('2026-07-20'), `nextDueAt=${e.nextDueAt}`);
});

test('an old audit past the cadence is overdue', () => {
  const e = reaudit.evaluate({ lastAuditAt: '2026-05-01T00:00:00Z', now: NOW });
  assert(e.ageDays >= 30, `ageDays=${e.ageDays}`);
  assert(e.due === true, 'due');
  assert(e.verdict === 'overdue', `verdict=${e.verdict}`);
});

test('a custom cadence changes the boundary', () => {
  const e = reaudit.evaluate({ lastAuditAt: '2026-06-20T00:00:00Z', now: NOW, cadenceDays: 7 });
  assert(e.due === true, '13 days exceeds a 7-day cadence');
  assert(e.cadenceDays === 7, 'cadence honored');
});

test('an unparseable timestamp is treated as due', () => {
  const e = reaudit.evaluate({ lastAuditAt: 'not-a-date', now: NOW });
  assert(e.due === true && e.verdict === 'unparseable', JSON.stringify(e));
});

test('a future timestamp fails safe and forces a re-audit', () => {
  const future = new Date(NOW + 5 * 864e5).toISOString();
  const e = reaudit.evaluate({ lastAuditAt: future, now: NOW });
  assert(e.due === true, 'future timestamp must be due');
  assert(e.verdict === 'future-timestamp', `verdict=${e.verdict}`);
  assert(e.ageDays === null, 'age is unknown for a corrupt record');
});

test('invalid cadence falls back to the default', () => {
  const e = reaudit.evaluate({ lastAuditAt: null, now: NOW, cadenceDays: -5 });
  assert(e.cadenceDays === 30, 'negative cadence -> default');
});

test('status reads an empty project as never-audited', () => {
  const project = mkProject('godpowers-reaudit-empty-');
  const s = reaudit.status(project, { now: NOW });
  assert(s.verdict === 'never-audited', `verdict=${s.verdict}`);
  assert(s.due === true, 'due');
  assert(Array.isArray(s.scope) && s.scope.length === 0, 'no scope yet');
});

test('record then status round-trips through disk', () => {
  const project = mkProject('godpowers-reaudit-record-');
  const written = reaudit.record(project, { at: '2026-07-01T00:00:00Z', scope: ['connectors'] });
  assert(written.lastAuditAt === '2026-07-01T00:00:00Z', 'writes timestamp');
  const s = reaudit.status(project, { now: NOW });
  assert(s.verdict === 'current', `verdict=${s.verdict}`);
  assert(s.ageDays === 2, `ageDays=${s.ageDays}`);
  assert(s.scope.join(',') === 'connectors', `scope=${s.scope}`);
});

test('record uses a default scope and cadence when unspecified', () => {
  const project = mkProject('godpowers-reaudit-default-');
  const written = reaudit.record(project, { at: '2026-07-01T00:00:00Z' });
  assert(written.cadenceDays === 30, 'default cadence');
  assert(written.scope.includes('credentials'), 'default scope includes credentials');
});

test('readRecord tolerates a malformed file', () => {
  const project = mkProject('godpowers-reaudit-bad-');
  const fs = require('fs');
  fs.mkdirSync(require('path').dirname(reaudit.recordFile(project)), { recursive: true });
  fs.writeFileSync(reaudit.recordFile(project), '{ broken');
  assert(reaudit.readRecord(project) === null, 'malformed -> null');
});

test('render shows due and current states', () => {
  const due = reaudit.render(reaudit.evaluate({ lastAuditAt: null, now: NOW }));
  assert(due.includes('DUE'), 'shows DUE');
  const current = reaudit.render(reaudit.evaluate({ lastAuditAt: '2026-07-01T00:00:00Z', now: NOW }));
  assert(current.includes('current'), 'shows current');
  assert(current.includes('next due'), 'shows next due date');
});

report();
