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

function stateViewFile(root, relPath) {
  return path.join(root, relPath);
}

function readProgress(root) {
  return fs.readFileSync(progressFile(root), 'utf8');
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

test('state init writes managed per-tier STATE.md views with valid checksums', () => {
  const tmp = mkProject('godpowers-state-views-tier-');
  state.init(tmp, 'tier-view-demo');

  for (const relPath of [
    '.godpowers/design/STATE.mdx',
    '.godpowers/build/STATE.mdx',
    '.godpowers/deploy/STATE.mdx',
    '.godpowers/observe/STATE.mdx',
    '.godpowers/launch/STATE.mdx'
  ]) {
    const file = stateViewFile(tmp, relPath);
    const content = readStateView(tmp, relPath);
    const parsed = stateViews.parseManaged(file);

    assert(content.includes(stateViews.FENCE_BEGIN), `${relPath} managed fence begin missing`);
    assert(content.includes(stateViews.CHECKSUM_PREFIX), `${relPath} checksum line missing`);
    assert(parsed.validChecksum === true, `${relPath} checksum should validate`);
    assert(content.includes('- [DECISION] This file is a generated human-readable view of `.godpowers/state.json`'),
      `${relPath} generated view notice missing`);
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

test('managed per-tier state view preserves user content outside the fence', () => {
  const tmp = mkProject('godpowers-state-views-tier-preserve-');
  const relPath = '.godpowers/deploy/STATE.mdx';
  const file = stateViewFile(tmp, relPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '# User Deploy Notes\n\nKeep this deploy note.\n');
  state.init(tmp, 'deploy-preserve-demo');
  const first = readStateView(tmp, relPath);
  const result = stateViews.writeAll(tmp, state.read(tmp));
  const second = readStateView(tmp, relPath);

  assert(first.startsWith('# User Deploy Notes'), 'user deploy heading was not preserved');
  assert(first.includes('Keep this deploy note.'), 'user deploy note was not preserved');
  assert(result.every(item => item.written === false), 'idempotent write should skip unchanged files');
  assert(first === second, 'idempotent per-tier write changed content');
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
  const current = state.init(tmp, 'tier-tamper-demo');
  const relPath = '.godpowers/deploy/STATE.mdx';
  const file = stateViewFile(tmp, relPath);
  const tampered = readStateView(tmp, relPath).replace('Status: `pending`.', 'Status: `done`.');
  fs.writeFileSync(file, tampered);
  const warnings = [];

  const result = stateViews.writeAll(tmp, current, {
    onWarning: warning => warnings.push(warning)
  });
  const repaired = readStateView(tmp, relPath);
  const parsed = stateViews.parseManaged(file);

  assert(result.some(item => item.path === file && item.written === true),
    'tampered per-tier fence should be rewritten');
  assert(warnings.some(warning => warning.includes('.godpowers/deploy/STATE.mdx')),
    `warnings: ${JSON.stringify(warnings)}`);
  assert(parsed.validChecksum === true, 'repaired per-tier checksum should validate');
  assert(repaired.includes('Status: `pending`.'), 'expected per-tier managed body missing');
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

test('state.updateSubStep refreshes deploy STATE.md evidence from state.json', () => {
  const tmp = mkProject('godpowers-state-views-deploy-refresh-');
  state.init(tmp, 'deploy-refresh-demo');
  state.updateSubStep(tmp, 'tier-3', 'deploy', {
    status: 'done',
    artifact: 'deploy/STATE.mdx',
    'verified-target-type': 'local-staging',
    'rollback-evidence': 'npm run rollback:smoke',
    'external-access-deferral': '.godpowers/deploy/WAITING-FOR-EXTERNAL-ACCESS.mdx',
    verification: {
      commands: [
        {
          command: 'npm run smoke:deploy',
          status: 'pass',
          exitCode: 0,
          ranAt: '2026-06-10T19:10:00.000Z',
          durationMs: 1200
        }
      ]
    }
  });
  const content = readStateView(tmp, '.godpowers/deploy/STATE.mdx');
  const parsed = stateViews.parseManaged(stateViewFile(tmp, '.godpowers/deploy/STATE.mdx'));

  assert(parsed.validChecksum === true, 'deploy state view checksum should validate');
  assert(content.includes('- [DECISION] Status: `done`.'), 'deploy status was not refreshed');
  assert(content.includes('| npm run smoke:deploy | pass | 0 | 2026-06-10T19:10:00.000Z | 1200 | - |'),
    'deploy verification command missing');
  assert(content.includes('| verified-target-type | local-staging |'), 'deploy target evidence missing');
  assert(content.includes('| rollback-evidence | npm run rollback:smoke |'), 'deploy rollback evidence missing');
  assert(content.includes('| external-access-deferral | .godpowers/deploy/WAITING-FOR-EXTERNAL-ACCESS.mdx |'),
    'deploy external access deferral missing');
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

asyncTest('state.writeAsync refreshes per-tier STATE.md views from state.json', async () => {
  const tmp = mkProject('godpowers-state-views-tier-async-');
  await state.writeAsync(tmp, {
    project: { name: 'async-tier-view' },
    tiers: {
      'tier-2': {
        build: {
          status: 'done',
          verification: {
            commands: [
              {
                command: 'npm test',
                status: 'pass',
                exitCode: 0
              }
            ]
          }
        }
      }
    }
  });
  const content = readStateView(tmp, '.godpowers/build/STATE.mdx');
  const parsed = stateViews.parseManaged(stateViewFile(tmp, '.godpowers/build/STATE.mdx'));

  assert(content.includes('- [DECISION] Project: async-tier-view.'), 'async tier view project missing');
  assert(content.includes('| npm test | pass | 0 | - | - | - |'), 'async tier verification missing');
  assert(parsed.validChecksum === true, 'async tier checksum should validate');
});

report('State view behavioral tests');
