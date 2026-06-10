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

function stateViewFile(root, relPath) {
  return path.join(root, relPath);
}

function readStateView(root, relPath) {
  return fs.readFileSync(stateViewFile(root, relPath), 'utf8');
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

test('state init leaves pending per-tier STATE.md views absent', () => {
  const tmp = mkProject('godpowers-state-views-tier-');
  state.init(tmp, 'tier-view-demo');

  for (const relPath of stateViews.TIER_STATE_VIEW_PATHS) {
    assert(!fs.existsSync(stateViewFile(tmp, relPath)), `${relPath} should not exist for plain pending state`);
  }
});

test('state write materializes managed per-tier STATE.md views with valid checksums', () => {
  const tmp = mkProject('godpowers-state-views-tier-materialize-');
  const current = state.init(tmp, 'tier-view-demo');
  for (const view of stateViews.TIER_STATE_VIEW_STEPS) {
    if (!current.tiers[view.tierKey]) current.tiers[view.tierKey] = {};
    current.tiers[view.tierKey][view.subStepKey] = {
      ...(current.tiers[view.tierKey][view.subStepKey] || {}),
      status: 'done',
      artifact: view.relPath.replace(/^\.godpowers\//, ''),
      updated: '2026-06-10T18:07:00.000Z'
    };
  }
  state.write(tmp, current);

  for (const relPath of stateViews.TIER_STATE_VIEW_PATHS) {
    const file = stateViewFile(tmp, relPath);
    const content = readStateView(tmp, relPath);
    const parsed = stateViews.parseManaged(file);

    assert(content.includes(stateViews.FENCE_BEGIN), `${relPath} managed fence begin missing`);
    assert(content.includes(stateViews.FENCE_END), `${relPath} managed fence end missing`);
    assert(content.includes(stateViews.CHECKSUM_PREFIX), `${relPath} checksum line missing`);
    assert(parsed.validChecksum === true, `${relPath} checksum should validate`);
    assert(content.includes('- [DECISION] This file is a generated human-readable view of `.godpowers/state.json`.'),
      `${relPath} generated view statement missing`);
  }
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

test('tampered managed per-tier state fence emits a warning and is replaced', () => {
  const tmp = mkProject('godpowers-state-views-tier-tamper-');
  state.init(tmp, 'tier-tamper-demo');
  state.updateSubStep(tmp, 'tier-2', 'build', { status: 'in-flight' });
  const current = state.read(tmp);
  const relPath = '.godpowers/build/STATE.md';
  const file = stateViewFile(tmp, relPath);
  const tampered = readStateView(tmp, relPath).replace('Build State', 'Tampered Build State');
  fs.writeFileSync(file, tampered);
  const warnings = [];

  const result = stateViews.writeAll(tmp, current, {
    onWarning: warning => warnings.push(warning)
  });
  const repaired = readStateView(tmp, relPath);
  const parsed = stateViews.parseManaged(file);

  assert(result.some(entry => entry.path === file && entry.written === true),
    'tampered tier state fence should be rewritten');
  assert(warnings.length === 1, `warning count: ${warnings.length}`);
  assert(warnings[0].includes('.godpowers/build/STATE.md'), `warning: ${warnings[0]}`);
  assert(parsed.validChecksum === true, 'repaired checksum should validate');
  assert(repaired.includes('Build State'), 'expected managed body missing');
  assert(!repaired.includes('Tampered Build State'), 'tampered body survived');
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

test('state.updateSubStep refreshes per-tier STATE.md from state.json', () => {
  const tmp = mkProject('godpowers-state-views-tier-refresh-');
  state.init(tmp, 'tier-refresh-demo');
  state.updateSubStep(tmp, 'tier-2', 'build', {
    status: 'done',
    artifact: 'build/STATE.md',
    verification: {
      commands: [
        {
          command: 'npm test',
          status: 'pass',
          exitCode: 0,
          ranAt: '2026-06-10T18:07:00.000Z'
        }
      ]
    }
  });
  const content = readStateView(tmp, '.godpowers/build/STATE.md');
  const parsed = stateViews.parseManaged(stateViewFile(tmp, '.godpowers/build/STATE.md'));

  assert(content.includes('| Step | tier-2.build |'), 'step field was not refreshed');
  assert(content.includes('| Status | `done` |'), 'status field was not refreshed');
  assert(content.includes('| Recorded artifact | `build/STATE.md` |'), 'artifact field was not refreshed');
  assert(content.includes('| npm test | pass | 0 | 2026-06-10T18:07:00.000Z | - |'),
    'verification command table was not refreshed');
  assert(parsed.validChecksum === true, 'tier state checksum should validate');
});

asyncTest('state.writeAsync refreshes PROGRESS.md from state.json', async () => {
  const tmp = mkProject('godpowers-state-views-async-');
  await state.writeAsync(tmp, {
    project: { name: 'async-view' },
    tiers: {
      'tier-1': {
        prd: { status: 'done' }
      },
      'tier-2': {
        build: { status: 'done' }
      }
    }
  });
  const content = readProgress(tmp);
  const parsed = stateViews.parseManaged(progressFile(tmp));

  assert(content.includes('- [DECISION] Project: async-view.'), 'async view project missing');
  assert(content.includes('Workflow progress is 100 percent with 2 of 2 tracked steps complete.'),
    'async progress summary missing');
  assert(parsed.validChecksum === true, 'async checksum should validate');
  const tierParsed = stateViews.parseManaged(stateViewFile(tmp, '.godpowers/build/STATE.md'));
  assert(tierParsed.validChecksum === true, 'async tier checksum should validate');
});

report('State view behavioral tests');
