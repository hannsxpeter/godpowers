#!/usr/bin/env node
/**
 * Behavioral tests for lib/state.js.
 *
 * The state module is load-bearing: it's the source of truth for tier
 * progress, artifact hashes, and mode storage. Tests assert:
 *   - init produces a shape that conforms to schema/state.v1.json
 *   - read/write round-trips preserve data
 *   - updateSubStep doesn't clobber peer sub-steps
 *   - hashFile is stable for identical content
 *   - detectDrift catches missing artifacts + hash mismatches
 *   - mode fields (added in v0.12 audit) survive round-trip
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const state = require('../lib/state');
const { test, asyncTest, assert, mkProject, report } = require('./test-harness');

console.log('\n  State module behavioral tests\n');

test('init produces a state with $schema, version, project, tiers', () => {
  const tmp = mkProject();
  const s = state.init(tmp, 'demo');
  assert(s.$schema === 'https://godpowers.dev/schema/state.v1.json',
    `unexpected $schema: ${s.$schema}`);
  assert(s.version && /^\d+\.\d+\.\d+$/.test(s.version),
    `bad version: ${s.version}`);
  assert(s.project && s.project.name === 'demo', 'project.name missing');
  assert(s.project.started, 'project.started missing');
  assert(s.tiers && s.tiers['tier-0'], 'tier-0 missing');
});

test('init persists to .godpowers/state.json', () => {
  const tmp = mkProject();
  state.init(tmp, 'demo');
  const f = path.join(tmp, '.godpowers', 'state.json');
  assert(fs.existsSync(f), 'state.json not written');
  const parsed = JSON.parse(fs.readFileSync(f, 'utf8'));
  assert(parsed.project.name === 'demo', 'persisted shape wrong');
});

test('read returns null on uninitialized project', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-state-empty-'));
  const s = state.read(tmp);
  assert(s === null, `expected null, got: ${JSON.stringify(s)}`);
});

test('isInitialized returns false before state.json exists', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-state-empty-'));
  assert(state.isInitialized(tmp) === false, 'empty project should not be initialized');
});

test('isInitialized returns true after init writes state.json', () => {
  const tmp = mkProject();
  state.init(tmp, 'initialized');
  assert(state.isInitialized(tmp) === true, 'initialized project should be true');
});

test('read round-trips written state', () => {
  const tmp = mkProject();
  const original = state.init(tmp, 'roundtrip');
  const got = state.read(tmp);
  assert(got.project.name === 'roundtrip', 'roundtrip name mismatch');
  assert(got.$schema === original.$schema, 'roundtrip schema mismatch');
});

asyncTest('async read/write round-trips written state', async () => {
  const tmp = mkProject();
  await state.writeAsync(tmp, {
    project: { name: 'async-roundtrip' },
    tiers: {}
  });
  const got = await state.readAsync(tmp);
  assert(got.project.name === 'async-roundtrip', 'async roundtrip name mismatch');
  assert(got.$schema === 'https://godpowers.dev/schema/state.v1.json',
    'async write did not normalize schema');
});

asyncTest('initAsync and updateSubStepAsync persist state', async () => {
  const tmp = mkProject();
  await state.initAsync(tmp, 'async-init');
  const updated = await state.updateSubStepAsync(tmp, 'tier-1', 'prd', { status: 'done' });
  assert(updated.status === 'done', 'async sub-step update failed');
  const got = await state.readAsync(tmp);
  assert(got.tiers['tier-1'].prd.status === 'done', 'async update not persisted');
});

test('write rejects state without project.name', () => {
  const tmp = mkProject();
  try {
    state.write(tmp, { project: {}, tiers: {} });
    throw new Error('write should have thrown');
  } catch (e) {
    assert(/project\.name/.test(e.message),
      `unexpected error: ${e.message}`);
  }
});

test('updateSubStep updates one sub-step without touching peers', () => {
  const tmp = mkProject();
  state.init(tmp, 'sub');
  state.updateSubStep(tmp, 'tier-1', 'prd', { status: 'done' });
  const s = state.read(tmp);
  assert(s.tiers['tier-1'].prd.status === 'done', 'prd not updated');
  assert(s.tiers['tier-1'].arch.status === 'pending',
    `arch was clobbered: ${s.tiers['tier-1'].arch.status}`);
});

test('updateSubStep throws on unknown tier', () => {
  const tmp = mkProject();
  state.init(tmp, 'badtier');
  try {
    state.updateSubStep(tmp, 'tier-99', 'x', { status: 'done' });
    throw new Error('should have thrown');
  } catch (e) {
    assert(/tier/i.test(e.message), `unexpected error: ${e.message}`);
  }
});

test('hashFile produces sha256: prefix and is stable', () => {
  const tmp = mkProject();
  const f = path.join(tmp, 'test.md');
  fs.writeFileSync(f, 'hello world');
  const h1 = state.hashFile(f);
  const h2 = state.hashFile(f);
  assert(h1 === h2, `hash not stable: ${h1} vs ${h2}`);
  assert(/^sha256:[a-f0-9]{64}$/.test(h1), `bad hash format: ${h1}`);
});

test('hashFile detects content change', () => {
  const tmp = mkProject();
  const f = path.join(tmp, 'test.md');
  fs.writeFileSync(f, 'hello world');
  const h1 = state.hashFile(f);
  fs.writeFileSync(f, 'hello WORLD');
  const h2 = state.hashFile(f);
  assert(h1 !== h2, 'hash did not change');
});

test('detectDrift reports missing artifact', () => {
  const tmp = mkProject();
  state.init(tmp, 'drift');
  state.updateSubStep(tmp, 'tier-1', 'prd', {
    status: 'done',
    artifact: 'prd/PRD.md',
    'artifact-hash': 'sha256:' + 'a'.repeat(64)
  });
  const drift = state.detectDrift(tmp);
  assert(Array.isArray(drift), 'drift should be an array');
  const missing = drift.find(d => d.kind === 'missing');
  assert(missing, `expected missing in drift; got ${JSON.stringify(drift)}`);
});

test('detectDrift reports hash mismatch when file changes', () => {
  const tmp = mkProject();
  state.init(tmp, 'driftmod');
  const f = path.join(tmp, '.godpowers', 'prd', 'PRD.md');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, 'original');
  const originalHash = state.hashFile(f);
  state.updateSubStep(tmp, 'tier-1', 'prd', {
    status: 'done',
    artifact: 'prd/PRD.md',
    'artifact-hash': originalHash
  });
  fs.writeFileSync(f, 'modified');
  const drift = state.detectDrift(tmp);
  const mismatch = drift.find(d => d.kind === 'modified');
  assert(mismatch, `expected modified in drift; got ${JSON.stringify(drift)}`);
});

test('mode + mode-d-suite fields survive round-trip', () => {
  const tmp = mkProject();
  const s = state.init(tmp, 'mode-test');
  s.mode = 'A';
  s['mode-d-suite'] = false;
  s['mode-detected-from'] = ['no-package-json-found'];
  s['mode-announced-as'] = 'greenfield';
  state.write(tmp, s);
  const got = state.read(tmp);
  assert(got.mode === 'A', `mode lost: ${got.mode}`);
  assert(got['mode-d-suite'] === false, `mode-d-suite lost`);
  assert(Array.isArray(got['mode-detected-from']), `detected-from lost`);
  assert(got['mode-announced-as'] === 'greenfield',
    `announced-as lost: ${got['mode-announced-as']}`);
});

test('progressSummary reports default 13-step arc position', () => {
  const tmp = mkProject();
  const s = state.init(tmp, 'progress');
  const p = state.progressSummary(s);
  assert(p.total === 13, `total: ${p.total}`);
  assert(p.completed === 0, `completed: ${p.completed}`);
  assert(p.percent === 0, `percent: ${p.percent}`);
  assert(p.currentStep === 1, `currentStep: ${p.currentStep}`);
  assert(p.current.tierKey === 'tier-0', `tier: ${p.current.tierKey}`);
  assert(p.current.subStepKey === 'orchestration',
    `substep: ${p.current.subStepKey}`);
});

test('progressSummary advances to first pending step after completed work', () => {
  const tmp = mkProject();
  state.init(tmp, 'progress-advance');
  state.updateSubStep(tmp, 'tier-0', 'orchestration', { status: 'done' });
  state.updateSubStep(tmp, 'tier-1', 'prd', { status: 'done' });
  const p = state.progressSummary(state.read(tmp));
  assert(p.total === 13, `total: ${p.total}`);
  assert(p.completed === 2, `completed: ${p.completed}`);
  assert(p.percent === 15, `percent: ${p.percent}`);
  assert(p.currentStep === 3, `currentStep: ${p.currentStep}`);
  assert(p.current.tierKey === 'tier-1', `tier: ${p.current.tierKey}`);
  assert(p.current.subStepKey === 'arch', `substep: ${p.current.subStepKey}`);
});

test('progressSummary treats skipped imported and not-required as complete', () => {
  const tmp = mkProject();
  state.init(tmp, 'progress-complete-statuses');
  state.updateSubStep(tmp, 'tier-1', 'design', { status: 'not-required' });
  state.updateSubStep(tmp, 'tier-1', 'product', { status: 'skipped' });
  state.updateSubStep(tmp, 'tier-2', 'repo', { status: 'imported' });
  const p = state.progressSummary(state.read(tmp));
  assert(p.completed === 3, `completed: ${p.completed}`);
  assert(p.percent === 23, `percent: ${p.percent}`);
});

test('renderProgressLine includes percent and current step', () => {
  const tmp = mkProject();
  state.init(tmp, 'progress-line');
  state.updateSubStep(tmp, 'tier-0', 'orchestration', { status: 'done' });
  const line = state.renderProgressLine(state.progressSummary(state.read(tmp)));
  assert(/Progress: 8%/.test(line), `line: ${line}`);
  assert(/1 of 13 steps complete/.test(line), `line: ${line}`);
  assert(/current step 2 of 13/.test(line), `line: ${line}`);
  assert(/Planning \/ PRD/.test(line), `line: ${line}`);
});

report('State module behavioral tests');
