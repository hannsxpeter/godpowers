#!/usr/bin/env node
// Implements: P-MUST-36, P-MUST-42
/**
 * Behavioral tests for lib/feature-awareness.js.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const state = require('../lib/state');
const awareness = require('../lib/feature-awareness');
const contextWriter = require('../lib/context-writer');
const { test, report, assert } = require('./test-harness');


function mkProject() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-feature-awareness-'));
  fs.mkdirSync(path.join(tmp, '.godpowers'), { recursive: true });
  return tmp;
}


console.log('\n  Feature-awareness behavioral tests\n');

test('P-MUST-36 and P-MUST-42: awareness exposes blast-radius review on existing commands', () => {
  const feature = awareness.FEATURES.find((entry) => entry.id === 'blast-radius-safety-case');
  assert(feature, 'blast-radius-safety-case feature missing');
  assert(feature.since === '6.2.0', `unexpected since version ${feature.since}`);
  assert(feature.commands.includes('/god-review'), '/god-review awareness missing');
  assert(feature.commands.includes('/god-build'), '/god-build awareness missing');
  assert(feature.description.includes('ledger-backed'), 'executed-evidence behavior missing');
  assert(feature.description.includes('wide changes'), 'conditional multi-review behavior missing');
});

test('detect reports uninitialized projects without writing files', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-feature-awareness-empty-'));
  const result = awareness.detect(tmp, { runtimeVersion: '9.9.9' });
  assert(result.initialized === false, 'expected uninitialized result');
  assert(result.missingFeatures.includes('feature-awareness'), 'missing feature list incomplete');
  assert(!fs.existsSync(path.join(tmp, 'AGENTS.md')), 'detect wrote AGENTS.md');
});

test('detect flags stale feature record and missing context fence', () => {
  const tmp = mkProject();
  const s = state.init(tmp, 'aware-demo');
  s['godpowers-features'] = {
    'feature-set-version': 1,
    'runtime-version': '1.6.14',
    known: ['planning-system-migration']
  };
  state.write(tmp, s);
  const result = awareness.detect(tmp, { runtimeVersion: '1.6.16' });
  assert(result.actions.includes('record-runtime-version'), 'runtime action missing');
  assert(result.actions.includes('record-feature-set'), 'feature action missing');
  assert(result.actions.includes('refresh-context'), 'context action missing');
});

test('run records current feature set and writes AGENTS context', () => {
  const tmp = mkProject();
  state.init(tmp, 'aware-write');
  const result = awareness.run(tmp, {
    runtimeVersion: '1.6.16',
    now: '2026-05-16T12:00:00.000Z'
  });
  const current = state.read(tmp);
  assert(result.applied === true, 'run not applied');
  assert(result.stateWritten === true, 'state not written');
  assert(current['godpowers-features']['runtime-version'] === '1.6.16', 'runtime not recorded');
  assert(current['godpowers-features'].known.includes('feature-awareness'), 'feature not recorded');
  assert(contextWriter.hasFence(path.join(tmp, 'AGENTS.md')), 'AGENTS fence missing');
  const agents = fs.readFileSync(path.join(tmp, 'AGENTS.md'), 'utf8');
  assert(agents.includes('/god-migrate'), 'new command awareness missing');
});

test('run is idempotent after state and context are current', () => {
  const tmp = mkProject();
  state.init(tmp, 'aware-idempotent');
  awareness.run(tmp, {
    runtimeVersion: '1.6.16',
    now: '2026-05-16T12:00:00.000Z'
  });
  const firstState = fs.readFileSync(path.join(tmp, '.godpowers', 'state.json'), 'utf8');
  const firstAgents = fs.readFileSync(path.join(tmp, 'AGENTS.md'), 'utf8');
  const second = awareness.run(tmp, {
    runtimeVersion: '1.6.16',
    now: '2026-05-16T12:05:00.000Z'
  });
  const secondState = fs.readFileSync(path.join(tmp, '.godpowers', 'state.json'), 'utf8');
  const secondAgents = fs.readFileSync(path.join(tmp, 'AGENTS.md'), 'utf8');
  assert(second.stateWritten === false, 'state should be unchanged');
  assert(firstState === secondState, 'state content changed');
  assert(firstAgents === secondAgents, 'AGENTS content changed');
});

test('detect suggests /god-migrate when foreign planning artifacts exist', () => {
  const tmp = mkProject();
  state.init(tmp, 'aware-migrate');
  fs.mkdirSync(path.join(tmp, '.planning'), { recursive: true });
  fs.writeFileSync(path.join(tmp, '.planning', 'PRD.md'), '# Legacy PRD\n\n- [ ] Build import.\n');
  const result = awareness.detect(tmp, { runtimeVersion: '1.6.16' });
  assert(result.actions.includes('suggest-god-migrate'), 'migration action missing');
  assert(result.migrationCandidates.some((system) => system.id === 'legacy-planning'), 'legacy planning candidate missing');
});

test('detect recommends god-greenfieldifier for low confidence source systems', () => {
  const tmp = mkProject();
  const s = state.init(tmp, 'aware-spawn');
  s['source-systems'] = [{
    id: 'legacy-planning',
    name: 'legacy planning',
    confidence: 'low',
    markers: ['.planning'],
    files: ['.planning/PRD.md'],
    'import-hash': 'sha256:' + 'a'.repeat(64),
    'sync-back-enabled': true
  }];
  state.write(tmp, s);
  const result = awareness.detect(tmp, { runtimeVersion: '1.6.16' });
  assert(result.spawnRecommendation, 'spawn recommendation missing');
  assert(result.spawnRecommendation.agent === 'god-greenfieldifier', 'wrong agent');
});

report();
