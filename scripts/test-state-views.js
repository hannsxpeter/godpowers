#!/usr/bin/env node
/**
 * Behavioral tests for generated state markdown views.
 */

const fs = require('fs');
const path = require('path');

const state = require('../lib/state');
const stateViews = require('../lib/state-views');
const { test, asyncTest, assert, mkProject, report } = require('./test-harness');

function progressFile(root) {
  return path.join(root, stateViews.PROGRESS_VIEW_PATH);
}

function readProgress(root) {
  return fs.readFileSync(progressFile(root), 'utf8');
}

console.log('\n  State view behavioral tests\n');

test('state init writes managed PROGRESS.md with a valid checksum', () => {
  const tmp = mkProject('godpowers-state-views-');
  state.init(tmp, 'view-demo');
  const file = progressFile(tmp);
  const content = readProgress(tmp);
  const parsed = stateViews.parseManaged(file);

  assert(content.includes(stateViews.FENCE_BEGIN), 'managed fence begin missing');
  assert(content.includes(stateViews.FENCE_END), 'managed fence end missing');
  assert(content.includes(stateViews.CHECKSUM_PREFIX), 'checksum line missing');
  assert(parsed.validChecksum === true, 'checksum should validate');
  assert(content.includes('- [DECISION] Project: view-demo.'), 'project line missing');
});

test('managed progress view preserves user content outside the fence', () => {
  const tmp = mkProject('godpowers-state-views-preserve-');
  fs.writeFileSync(progressFile(tmp), '# User Progress Notes\n\nKeep this note.\n');
  const current = state.init(tmp, 'preserve-demo');
  const first = readProgress(tmp);
  const result = stateViews.writeAll(tmp, current);
  const second = readProgress(tmp);

  assert(first.startsWith('# User Progress Notes'), 'user heading was not preserved');
  assert(first.includes('Keep this note.'), 'user note was not preserved');
  assert(result[0].written === false, 'idempotent write should skip unchanged file');
  assert(first === second, 'idempotent write changed content');
});

test('tampered managed progress fence emits a warning and is replaced', () => {
  const tmp = mkProject('godpowers-state-views-tamper-');
  const current = state.init(tmp, 'tamper-demo');
  const file = progressFile(tmp);
  const tampered = readProgress(tmp).replace('Workflow progress is', 'Tampered progress is');
  fs.writeFileSync(file, tampered);
  const warnings = [];

  const result = stateViews.writeAll(tmp, current, {
    onWarning: warning => warnings.push(warning)
  });
  const repaired = readProgress(tmp);
  const parsed = stateViews.parseManaged(file);

  assert(result[0].written === true, 'tampered fence should be rewritten');
  assert(warnings.length === 1, `warning count: ${warnings.length}`);
  assert(warnings[0].includes('checksum mismatch'), `warning: ${warnings[0]}`);
  assert(parsed.validChecksum === true, 'repaired checksum should validate');
  assert(repaired.includes('Workflow progress is'), 'expected managed body missing');
  assert(!repaired.includes('Tampered progress is'), 'tampered body survived');
});

test('state.updateSubStep refreshes PROGRESS.md from state.json', () => {
  const tmp = mkProject('godpowers-state-views-refresh-');
  state.init(tmp, 'refresh-demo');
  state.updateSubStep(tmp, 'tier-0', 'orchestration', { status: 'done' });
  const content = readProgress(tmp);

  assert(content.includes('Workflow progress is 8 percent with 1 of 13 tracked steps complete.'),
    'progress summary was not refreshed');
  assert(content.includes('| 1 | Orchestration | Orchestration | done | - |'),
    'step table was not refreshed');
});

asyncTest('state.writeAsync refreshes PROGRESS.md from state.json', async () => {
  const tmp = mkProject('godpowers-state-views-async-');
  await state.writeAsync(tmp, {
    project: { name: 'async-view' },
    tiers: {
      'tier-1': {
        prd: { status: 'done' }
      }
    }
  });
  const content = readProgress(tmp);
  const parsed = stateViews.parseManaged(progressFile(tmp));

  assert(content.includes('- [DECISION] Project: async-view.'), 'async view project missing');
  assert(content.includes('Workflow progress is 100 percent with 1 of 1 tracked steps complete.'),
    'async progress summary missing');
  assert(parsed.validChecksum === true, 'async checksum should validate');
});

report('State view behavioral tests');
