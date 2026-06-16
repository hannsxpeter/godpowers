#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const evidence = require('../lib/evidence');
const state = require('../lib/state');
const { test, assert, mkProject, report } = require('./test-harness');

function proj(prefix) {
  const dir = mkProject(prefix);
  state.init(dir, prefix.replace(/[^a-z0-9]+/gi, '-'));
  return dir;
}

test('outcome.start writes a goal.json with budget and active status', () => {
  const dir = proj('godpowers-outcome-start-');
  const goal = evidence.outcome.start('Green Build', { goal: 'tests pass', verifier: 'true', budget: 3, substep: 'tier-2.build', projectRoot: dir });
  assert(goal.slug === 'green-build', `slug: ${goal.slug}`);
  assert(goal.status === 'active' && goal.budget === 3 && goal.iterations === 0, 'goal fields wrong');
  assert(goal.verifier === 'true' && goal.substep === 'tier-2.build', 'verifier/substep not stored');
  assert(fs.existsSync(path.join(dir, '.godpowers', 'ledger', 'outcomes', 'green-build', 'goal.json')), 'goal.json missing');
});

test('outcome.check succeeds on a passing verifier and writes the executed record to the ledger', () => {
  const dir = proj('godpowers-outcome-pass-');
  evidence.outcome.start('green', { verifier: 'true', budget: 3, substep: 'tier-2.build', projectRoot: dir });
  const result = evidence.outcome.check('green', { projectRoot: dir });
  assert(result.ran === true && result.verified === true, 'check should run and verify');
  assert(result.goal.status === 'succeeded', `status: ${result.goal.status}`);
  assert(result.iteration.iteration === 1, 'iteration count');

  // The check also wrote an executed record to the main verifications ledger.
  const ledger = evidence.read(dir);
  assert(ledger.length === 1 && ledger[0].command === 'true' && ledger[0].verified === true, 'executed record not written to the ledger');

  // iterations.jsonl recorded the iteration.
  const iters = fs.readFileSync(path.join(dir, '.godpowers', 'ledger', 'outcomes', 'green', 'iterations.jsonl'), 'utf8').trim().split('\n');
  assert(iters.length === 1, 'iterations.jsonl should hold one iteration');
});

test('outcome.check exhausts the budget and marks the outcome failed', () => {
  const dir = proj('godpowers-outcome-fail-');
  evidence.outcome.start('flaky', { verifier: 'false', budget: 2, substep: 'tier-2.build', projectRoot: dir });

  let result = evidence.outcome.check('flaky', { projectRoot: dir });
  assert(result.verified === false && result.goal.status === 'active', `after 1: ${result.goal.status}`);

  result = evidence.outcome.check('flaky', { projectRoot: dir });
  assert(result.verified === false && result.goal.status === 'failed', `after budget: ${result.goal.status}`);

  // Once failed, further checks do not run.
  const blocked = evidence.outcome.check('flaky', { projectRoot: dir });
  assert(blocked.ran === false && blocked.reason === 'outcome-failed', `blocked: ${blocked.reason}`);
});

test('outcome.stop marks the outcome stopped and check no longer runs', () => {
  const dir = proj('godpowers-outcome-stop-');
  evidence.outcome.start('paused', { verifier: 'true', projectRoot: dir });
  const stopped = evidence.outcome.stop('paused', 'no longer needed', { projectRoot: dir });
  assert(stopped.stopped === true && stopped.goal.status === 'stopped', 'stop did not mark stopped');
  assert(stopped.goal.stop_reason === 'no longer needed', 'stop reason not recorded');
  const after = evidence.outcome.check('paused', { projectRoot: dir });
  assert(after.ran === false && after.reason === 'outcome-stopped', `check after stop: ${after.reason}`);
});

test('outcome handles missing outcomes and a missing verifier', () => {
  const dir = proj('godpowers-outcome-missing-');
  assert(evidence.outcome.check('nope', { projectRoot: dir }).reason === 'outcome-not-found', 'missing outcome');
  assert(evidence.outcome.status('nope', { projectRoot: dir }) === null, 'status of missing outcome');
  evidence.outcome.start('noverify', { projectRoot: dir });
  assert(evidence.outcome.check('noverify', { projectRoot: dir }).reason === 'no-verifier', 'no-verifier guard');
  let threw = false;
  try { evidence.outcome.start('   ', { projectRoot: dir }); } catch (_) { threw = true; }
  assert(threw, 'empty name should throw');
});

test('outcome.status returns the goal and its iterations', () => {
  const dir = proj('godpowers-outcome-status-');
  evidence.outcome.start('s', { verifier: 'true', projectRoot: dir });
  evidence.outcome.check('s', { projectRoot: dir });
  const status = evidence.outcome.status('s', { projectRoot: dir });
  assert(status && status.goal.slug === 's' && status.iterations.length === 1, 'status shape wrong');
});

test('outcome.check announces the disk-sourced verifier before running it (SEC-002)', () => {
  const dir = proj('godpowers-outcome-notice-');
  evidence.outcome.start('announce', { verifier: 'true', substep: 'tier-2.build', projectRoot: dir });
  let notice = null;
  const result = evidence.outcome.check('announce', {
    projectRoot: dir,
    notice: (info) => { notice = info; }
  });
  assert(result.ran === true, 'check should run');
  assert(notice && notice.verifier === 'true', `notice should carry the verifier, got ${JSON.stringify(notice)}`);
  assert(notice.source && notice.source.endsWith(path.join('outcomes', 'announce', 'goal.json')),
    `notice source should point at the goal.json, got ${notice && notice.source}`);
});

test('outcome.check does not fire the notice when there is no verifier (SEC-002)', () => {
  const dir = proj('godpowers-outcome-notice-skip-');
  evidence.outcome.start('noverify', { projectRoot: dir });
  let fired = false;
  const result = evidence.outcome.check('noverify', { projectRoot: dir, notice: () => { fired = true; } });
  assert(result.reason === 'no-verifier', 'should report no-verifier');
  assert(fired === false, 'notice must not fire when nothing will be executed');
});

report('Outcome loop tests');
