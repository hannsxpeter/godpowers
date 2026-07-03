#!/usr/bin/env node
/**
 * Behavioral tests for the state advance CLI mutation.
 */

const fs = require('fs');
const path = require('path');

const state = require('../lib/state');
const stateAdvance = require('../lib/state-advance');
const stateLock = require('../lib/state-lock');
const stateViews = require('../lib/state-views');
const { test, assert, mkProject, report } = require('./test-harness');

function progressFile(root) {
  return path.join(root, stateViews.PROGRESS_VIEW_PATH);
}

function stateViewFile(root, relPath) {
  return path.join(root, relPath);
}

console.log('\n  State advance behavioral tests\n');

test('advance updates a named step through state.json and refreshes PROGRESS.md', () => {
  const tmp = mkProject('godpowers-state-advance-');
  state.init(tmp, 'advance-demo');

  const result = stateAdvance.advance(tmp, {
    step: 'prd',
    status: 'done',
    holder: 'test-advance',
    now: '2026-06-10T17:30:00.000Z'
  });
  const current = state.read(tmp);
  const progress = fs.readFileSync(progressFile(tmp), 'utf8');

  assert(result.verdict === 'pass', `verdict: ${result.verdict}`);
  assert(result.previousStatus === 'pending', `previousStatus: ${result.previousStatus}`);
  assert(current.tiers['tier-1'].prd.status === 'done', 'state status not updated');
  assert(current.tiers['tier-1'].prd.updated === '2026-06-10T17:30:00.000Z', 'updated timestamp not stored');
  assert(current.lock == null, `lock was not released: ${JSON.stringify(current.lock)}`);
  assert(progress.includes('| 2 | Planning | PRD | done | - | 2026-06-10T17:30:00.000Z |'),
    'generated progress view was not refreshed');
});

test('advance accepts explicit tier step syntax', () => {
  const tmp = mkProject('godpowers-state-advance-tier-');
  state.init(tmp, 'advance-tier-demo');

  const result = stateAdvance.advance(tmp, {
    step: 'tier-2.build',
    status: 'in-flight',
    holder: 'test-advance-tier'
  });
  const current = state.read(tmp);

  assert(result.verdict === 'pass', `verdict: ${result.verdict}`);
  assert(result.step.tierKey === 'tier-2', `tierKey: ${result.step.tierKey}`);
  assert(result.step.subStepKey === 'build', `subStepKey: ${result.step.subStepKey}`);
  assert(current.tiers['tier-2'].build.status === 'in-flight', 'build status not updated');
});

test('advance returns fail results for invalid requests', () => {
  const tmp = mkProject('godpowers-state-advance-invalid-');
  state.init(tmp, 'advance-invalid-demo');

  const missingStep = stateAdvance.advance(tmp, { status: 'done' });
  const badStatus = stateAdvance.advance(tmp, { step: 'prd', status: 'complete' });
  const badStep = stateAdvance.advance(tmp, { step: 'missing', status: 'done' });

  assert(missingStep.verdict === 'fail', `missing step verdict: ${missingStep.verdict}`);
  assert(missingStep.findings[0].id === 'step-required', `missing step id: ${missingStep.findings[0].id}`);
  assert(badStatus.verdict === 'fail', `bad status verdict: ${badStatus.verdict}`);
  assert(badStatus.findings[0].id === 'status-invalid', `bad status id: ${badStatus.findings[0].id}`);
  assert(badStep.verdict === 'fail', `bad step verdict: ${badStep.verdict}`);
  assert(badStep.findings[0].id === 'step-not-found', `bad step id: ${badStep.findings[0].id}`);
});

test('advance refuses to mutate when a conflicting lock is active', () => {
  const tmp = mkProject('godpowers-state-advance-lock-');
  state.init(tmp, 'advance-lock-demo');
  stateLock.acquire(tmp, { holder: 'other-writer', scope: 'tier-1.prd' });

  const result = stateAdvance.advance(tmp, {
    step: 'prd',
    status: 'done',
    holder: 'test-advance-lock'
  });
  const current = state.read(tmp);

  assert(result.verdict === 'fail', `verdict: ${result.verdict}`);
  assert(result.findings[0].id === 'lock-unavailable', `id: ${result.findings[0].id}`);
  assert(current.tiers['tier-1'].prd.status === 'pending', 'state changed despite lock');
  assert(current.lock.holder === 'other-writer', `lock holder changed: ${current.lock.holder}`);
});

test('advance replaces tampered managed progress view and reports warning', () => {
  const tmp = mkProject('godpowers-state-advance-tamper-');
  state.init(tmp, 'advance-tamper-demo');
  const file = progressFile(tmp);
  const tampered = fs.readFileSync(file, 'utf8').replace('Workflow progress is', 'Tampered progress is');
  fs.writeFileSync(file, tampered);

  const result = stateAdvance.advance(tmp, {
    step: 'prd',
    status: 'done',
    holder: 'test-advance-tamper'
  });
  const repaired = fs.readFileSync(file, 'utf8');
  const parsed = stateViews.parseManaged(file);

  assert(result.verdict === 'pass', `verdict: ${result.verdict}`);
  assert(result.warnings.length === 1, `warnings: ${JSON.stringify(result.warnings)}`);
  assert(result.warnings[0].includes('checksum mismatch'), `warning: ${result.warnings[0]}`);
  assert(parsed.validChecksum === true, 'repaired checksum should validate');
  assert(!repaired.includes('Tampered progress is'), 'tampered text survived');
});

test('advance replaces tampered managed per-tier view and reports warning', () => {
  const tmp = mkProject('godpowers-state-advance-tier-tamper-');
  state.init(tmp, 'advance-tier-tamper-demo');
  const file = stateViewFile(tmp, '.godpowers/deploy/STATE.mdx');
  const tampered = fs.readFileSync(file, 'utf8').replace('Status: `pending`.', 'Status: `done`.');
  fs.writeFileSync(file, tampered);

  const result = stateAdvance.advance(tmp, {
    step: 'deploy',
    status: 'done',
    holder: 'test-advance-tier-tamper'
  });
  const repaired = fs.readFileSync(file, 'utf8');
  const parsed = stateViews.parseManaged(file);

  assert(result.verdict === 'pass', `verdict: ${result.verdict}`);
  assert(result.warnings.some(warning => warning.includes('.godpowers/deploy/STATE.mdx')),
    `warnings: ${JSON.stringify(result.warnings)}`);
  assert(result.summary.views.includes('.godpowers/deploy/STATE.mdx'),
    `views: ${JSON.stringify(result.summary.views)}`);
  assert(parsed.validChecksum === true, 'repaired per-tier checksum should validate');
  assert(repaired.includes('Status: `done`.'), 'advanced status missing from repaired per-tier view');
});

test('render shows pass and fail results', () => {
  const tmp = mkProject('godpowers-state-advance-render-');
  state.init(tmp, 'advance-render-demo');
  const pass = stateAdvance.render(stateAdvance.advance(tmp, {
    step: 'prd',
    status: 'done',
    holder: 'test-advance-render'
  }));
  const fail = stateAdvance.render(stateAdvance.advance(tmp, {
    step: 'missing',
    status: 'done',
    holder: 'test-advance-render'
  }));

  assert(pass.includes('Godpowers State Advance'), 'pass render missing title');
  assert(pass.includes('Status: pending to done'), `pass render: ${pass}`);
  assert(fail.includes('tracked step not found'), `fail render: ${fail}`);
});

report('State advance behavioral tests');
