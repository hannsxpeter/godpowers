#!/usr/bin/env node
/**
 * Tests for lib/router.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const router = require('../lib/router');
const state = require('../lib/state');
const { test, report } = require('./test-harness');

console.log('\n  Router tests\n');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-router-test-'));

test('loadAll returns at least 30 routing definitions', () => {
  router.clearCache();
  const all = router.loadAll();
  const count = Object.keys(all).length;
  if (count < 30) throw new Error(`expected 30+, got ${count}`);
});

test('getRouting finds /god-prd', () => {
  router.clearCache();
  const r = router.getRouting('/god-prd');
  if (!r) throw new Error('not found');
  if (r.metadata.command !== '/god-prd') throw new Error('wrong command');
});

test('getRouting finds /god-mode', () => {
  router.clearCache();
  const r = router.getRouting('/god-mode');
  if (!r) throw new Error('not found');
});

test('getRouting returns null for unknown command', () => {
  router.clearCache();
  const r = router.getRouting('/god-nonexistent');
  if (r !== null) throw new Error('should be null');
});

test('Tier 3 route writes use state.json instead of generated state views', () => {
  router.clearCache();
  for (const command of ['/god-deploy', '/god-observe', '/god-launch']) {
    const routing = router.getRouting(command);
    const writes = routing.execution && routing.execution.writes;
    if (!Array.isArray(writes)) throw new Error(`${command} writes missing`);
    if (!writes.includes('.godpowers/state.json')) {
      throw new Error(`${command} does not write state.json`);
    }
    const generatedView = writes.find(item => /\.godpowers\/(?:deploy|observe|launch)\/STATE\.md$/.test(item));
    if (generatedView) throw new Error(`${command} writes generated view ${generatedView}`);
  }
});

test('/god-reconcile reads state.json instead of generated state views', () => {
  router.clearCache();
  const routing = router.getRouting('/god-reconcile');
  const reads = routing.execution && routing.execution.reads;
  if (!Array.isArray(reads)) throw new Error('/god-reconcile reads missing');
  if (!reads.includes('.godpowers/state.json')) throw new Error('/god-reconcile missing state.json read');
  const generatedView = reads.find(item => /\.godpowers\/(?:build|deploy|observe|launch)\/STATE\.md$/.test(item));
  if (generatedView) throw new Error(`/god-reconcile reads generated view ${generatedView}`);
});

test('getNextCommand returns next for /god-prd', () => {
  router.clearCache();
  const next = router.getNextCommand('/god-prd');
  if (next !== '/god-arch') throw new Error(`expected /god-arch, got ${next}`);
});

test('getNextCommand returns repo as the default after /god-stack', () => {
  router.clearCache();
  const next = router.getNextCommand('/god-stack');
  if (next !== '/god-repo') throw new Error(`expected /god-repo, got ${next}`);
});

test('getNextCommand returns test extension after /god-extension-scaffold', () => {
  router.clearCache();
  const next = router.getNextCommand('/god-extension-scaffold');
  if (next !== '/god-test-extension') throw new Error(`expected /god-test-extension, got ${next}`);
});

test('getStandards returns checks for /god-prd', () => {
  router.clearCache();
  const s = router.getStandards('/god-prd');
  if (!s) throw new Error('no standards');
  if (s['substitution-test'] !== true) throw new Error('substitution-test should be true');
  if (!s['have-nots']) throw new Error('no have-nots');
});

test('getSpawnedAgents includes primary for /god-prd', () => {
  router.clearCache();
  const agents = router.getSpawnedAgents('/god-prd');
  if (!agents.includes('god-pm')) throw new Error('should include god-pm');
});

test('deprecated roadmap check delegates to god-reconciler', () => {
  router.clearCache();
  const agents = router.getSpawnedAgents('/god-roadmap-check');
  if (!agents.includes('god-reconciler')) throw new Error('should include god-reconciler');
  if (agents.includes('god-roadmap-reconciler')) throw new Error('legacy roadmap reconciler should not be routed');
});

test('getSpawnedAgents includes secondary spawns for /god-build', () => {
  router.clearCache();
  const agents = router.getSpawnedAgents('/god-build');
  if (!agents.includes('god-planner')) throw new Error('should include god-planner');
  if (!agents.includes('god-executor')) throw new Error('should include god-executor');
});

test('getSpawnedAgents includes conditional parallel spawns for /god-harden', () => {
  router.clearCache();
  const agents = router.getSpawnedAgents('/god-harden');
  if (!agents.includes('god-harden-auditor')) throw new Error('should include god-harden-auditor');
  if (!agents.includes('god-browser-tester')) throw new Error('should include god-browser-tester');
});

test('checkPrerequisites: /god-init has no prereqs', () => {
  router.clearCache();
  const result = router.checkPrerequisites('/god-init', tmp);
  if (!result.satisfied) throw new Error('should be satisfied');
});

test('checkPrerequisites: /god-prd needs initialized state', () => {
  router.clearCache();
  // tmp has no .godpowers/, so prereq fails
  const result = router.checkPrerequisites('/god-prd', tmp);
  if (result.satisfied) throw new Error('should not be satisfied');
  if (result.missing.length === 0) throw new Error('should have missing');
  if (result.autoCompletable.length === 0) throw new Error('should have auto-completable');
  if (result.autoCompletable[0].autoCompleteCommand !== '/god-init') {
    throw new Error('auto-complete should be /god-init');
  }
});

test('checkPrerequisites: /god-prd uses state.json without PROGRESS.md', () => {
  router.clearCache();
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'router-initialized-test-'));
  state.init(proj, 'router-initialized-test');
  fs.rmSync(path.join(proj, '.godpowers', 'PROGRESS.md'), { force: true });

  const result = router.checkPrerequisites('/god-prd', proj);
  if (!result.satisfied) throw new Error(`expected initialized state to satisfy prereq, missing ${result.missing.join(',')}`);
  fs.rmSync(proj, { recursive: true, force: true });
});

test('suggestNext: empty project suggests /god-init', () => {
  router.clearCache();
  const s = router.suggestNext(tmp);
  if (s.command !== '/god-init') throw new Error(`expected /god-init, got ${s.command}`);
});

test('suggestNext: with PRD pending, suggests /god-prd', () => {
  router.clearCache();
  state.init(tmp, 'router-test');
  const s = router.suggestNext(tmp);
  if (s.command !== '/god-prd') throw new Error(`expected /god-prd, got ${s.command}`);
});

test('suggestNext: with PRD done, suggests /god-arch', () => {
  router.clearCache();
  state.updateSubStep(tmp, 'tier-1', 'prd', { status: 'done' });
  const s = router.suggestNext(tmp);
  if (s.command !== '/god-arch') throw new Error(`expected /god-arch, got ${s.command}`);
});

function markPreDeployDone(projectRoot) {
  state.init(projectRoot, 'router-safe-sync-test');
  for (const [tier, sub] of [
    ['tier-1', 'prd'],
    ['tier-1', 'arch'],
    ['tier-1', 'roadmap'],
    ['tier-1', 'stack'],
    ['tier-2', 'repo'],
    ['tier-2', 'build']
  ]) {
    state.updateSubStep(projectRoot, tier, sub, { status: 'done' });
  }
}

function writeSafeSyncPlan(projectRoot) {
  fs.mkdirSync(path.join(projectRoot, '.godpowers', 'sync'), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, '.godpowers', 'sync', 'SAFE-SYNC-PLAN.md'),
    '# Release Truth And Safe Sync\n\nMissing: safe sync against origin/main\n');
}

function markTier3Ready(projectRoot) {
  markPreDeployDone(projectRoot);
  state.updateSubStep(projectRoot, 'tier-3', 'deploy', { status: 'done' });
  state.updateSubStep(projectRoot, 'tier-3', 'observe', { status: 'done' });
  state.updateSubStep(projectRoot, 'tier-3', 'harden', { status: 'done' });
}

test('suggestNext: safe sync plan blocks deploy with reconcile route', () => {
  router.clearCache();
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'router-safe-sync-test-'));
  markPreDeployDone(proj);
  writeSafeSyncPlan(proj);

  const s = router.suggestNext(proj);
  if (s.command !== '/god-reconcile Release Truth And Safe Sync') {
    throw new Error(`expected safe-sync reconcile, got ${s.command}`);
  }
  if (s.blocker !== 'safe-sync') throw new Error('expected safe-sync blocker');
  if (s.evidence !== '.godpowers/sync/SAFE-SYNC-PLAN.md') {
    throw new Error(`expected plan evidence, got ${s.evidence}`);
  }
  fs.rmSync(proj, { recursive: true, force: true });
});

test('checkPrerequisites: /god-deploy requires safe sync clear', () => {
  router.clearCache();
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'router-safe-sync-test-'));
  markPreDeployDone(proj);
  writeSafeSyncPlan(proj);

  const result = router.checkPrerequisites('/god-deploy', proj);
  if (result.satisfied) throw new Error('deploy prereqs should fail');
  if (!result.missing.includes('safe-sync-clear')) {
    throw new Error(`expected safe-sync-clear missing, got ${result.missing.join(',')}`);
  }
  const auto = result.autoCompletable.find(item => item.check === 'safe-sync-clear');
  if (!auto) throw new Error('expected safe-sync auto-complete');
  if (auto.autoCompleteCommand !== '/god-reconcile Release Truth And Safe Sync') {
    throw new Error(`wrong auto-complete: ${auto.autoCompleteCommand}`);
  }
  fs.rmSync(proj, { recursive: true, force: true });
});

test('checkPrerequisites: safe sync blocks direct Tier 3 and god-mode routes', () => {
  router.clearCache();
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'router-safe-sync-test-'));
  markTier3Ready(proj);
  writeSafeSyncPlan(proj);

  for (const command of ['/god-deploy', '/god-observe', '/god-harden', '/god-launch', '/god-mode']) {
    const result = router.checkPrerequisites(command, proj);
    if (result.satisfied) throw new Error(`${command} prereqs should fail`);
    if (!result.missing.includes('safe-sync-clear')) {
      throw new Error(`${command} missing safe-sync-clear gate`);
    }
    const auto = result.autoCompletable.find(item => item.check === 'safe-sync-clear');
    if (!auto) throw new Error(`${command} missing safe-sync auto-complete`);
    if (auto.autoCompleteCommand !== '/god-reconcile Release Truth And Safe Sync') {
      throw new Error(`${command} wrong safe-sync auto-complete`);
    }
  }
  fs.rmSync(proj, { recursive: true, force: true });
});

test('suggestNext: resolved safe sync plan allows deploy route', () => {
  router.clearCache();
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'router-safe-sync-test-'));
  markPreDeployDone(proj);
  fs.mkdirSync(path.join(proj, '.godpowers', 'sync'), { recursive: true });
  fs.writeFileSync(path.join(proj, '.godpowers', 'sync', 'SAFE-SYNC-PLAN.md'),
    '# Release Truth And Safe Sync\n');
  fs.writeFileSync(path.join(proj, '.godpowers', 'sync', 'SAFE-SYNC-DONE.md'),
    '# Safe Sync Done\n');

  const s = router.suggestNext(proj);
  if (s.command !== '/god-deploy') throw new Error(`expected /god-deploy, got ${s.command}`);
  fs.rmSync(proj, { recursive: true, force: true });
});

test('suggestNext: checkpoint safe sync blocker routes to reconcile', () => {
  router.clearCache();
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'router-safe-sync-test-'));
  markPreDeployDone(proj);
  fs.writeFileSync(path.join(proj, '.godpowers', 'CHECKPOINT.md'),
    '# CHECKPOINT\n\nSafe sync remains the active red gate before deploy.\n');

  const s = router.suggestNext(proj);
  if (s.command !== '/god-reconcile Release Truth And Safe Sync') {
    throw new Error(`expected checkpoint reconcile, got ${s.command}`);
  }
  if (s.evidence !== '.godpowers/CHECKPOINT.md') {
    throw new Error(`expected checkpoint evidence, got ${s.evidence}`);
  }
  fs.rmSync(proj, { recursive: true, force: true });
});

test('checkPrerequisites: /god-launch blocks unresolved critical findings', () => {
  router.clearCache();
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'router-critical-test-'));
  markTier3Ready(proj);
  fs.mkdirSync(path.join(proj, '.godpowers', 'harden'), { recursive: true });
  fs.writeFileSync(path.join(proj, '.godpowers', 'harden', 'FINDINGS.md'), [
    '# Security Findings',
    '',
    '| Severity | Count |',
    '|----------|-------|',
    '| Critical | 1 |',
    '',
    '**Launch gate**: BLOCKED',
    '',
    '### [CRITICAL-001] Auth bypass',
    '- **Status**: Open'
  ].join('\n'));

  const result = router.checkPrerequisites('/god-launch', proj);
  if (result.satisfied) throw new Error('launch prereqs should fail');
  if (!result.missing.includes('no-critical-findings')) {
    throw new Error(`expected no-critical-findings missing, got ${result.missing.join(',')}`);
  }
  if (router.evaluateCheck('no-critical-findings', proj) !== false) {
    throw new Error('no-critical-findings should evaluate false');
  }
  fs.rmSync(proj, { recursive: true, force: true });
});

test('checkPrerequisites: /god-launch allows passed harden gate', () => {
  router.clearCache();
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'router-critical-test-'));
  markTier3Ready(proj);
  fs.mkdirSync(path.join(proj, '.godpowers', 'harden'), { recursive: true });
  fs.writeFileSync(path.join(proj, '.godpowers', 'harden', 'FINDINGS.md'), [
    '# Security Findings',
    '',
    '| Severity | Count |',
    '|----------|-------|',
    '| Critical | 0 |',
    '',
    '**Launch gate**: PASSED'
  ].join('\n'));

  const result = router.checkPrerequisites('/god-launch', proj);
  if (!result.satisfied) throw new Error(`launch prereqs should pass, missing ${result.missing.join(',')}`);
  if (router.evaluateCheck('no-critical-findings', proj) !== true) {
    throw new Error('no-critical-findings should evaluate true');
  }
  fs.rmSync(proj, { recursive: true, force: true });
});

test('evaluateCheck: file:path returns false for missing', () => {
  router.clearCache();
  if (router.evaluateCheck('file:nonexistent.txt', tmp) !== false) {
    throw new Error('should be false');
  }
});

test('evaluateCheck: file:path rejects traversal outside project', () => {
  router.clearCache();
  const outside = path.join(path.dirname(tmp), 'godpowers-router-outside.txt');
  fs.writeFileSync(outside, 'outside');
  try {
    const rel = path.relative(tmp, outside);
    if (router.evaluateCheck(`file:${rel}`, tmp) !== false) {
      throw new Error('relative traversal should be false');
    }
    if (router.evaluateCheck(`file:${outside}`, tmp) !== false) {
      throw new Error('absolute path should be false');
    }
  } finally {
    fs.rmSync(outside, { force: true });
  }
});

test('evaluateCheck: state:tier-1.prd.status == done', () => {
  router.clearCache();
  // PRD was set to done in earlier test
  if (router.evaluateCheck('state:tier-1.prd.status == done', tmp) !== true) {
    throw new Error('should be true');
  }
});

test('evaluateCheck: OR handles initialized state and greenfield predicates', () => {
  router.clearCache();
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'router-or-test-'));
  const ok = router.evaluateCheck('state:initialized == true OR mode-A-greenfield', proj);
  if (ok !== true) throw new Error('greenfield OR branch should pass');
});

test('evaluateCheck: mode-A greenfield does not pass when .godpowers exists without state', () => {
  router.clearCache();
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'router-or-test-'));
  fs.mkdirSync(path.join(proj, '.godpowers'), { recursive: true });
  const ok = router.evaluateCheck('state:initialized == true OR mode-A-greenfield', proj);
  if (ok !== false) throw new Error('missing state in .godpowers should not satisfy initialized route');
  fs.rmSync(proj, { recursive: true, force: true });
});

test('evaluateCheck: state:lifecycle-phase resolves from root state', () => {
  router.clearCache();
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'router-root-state-test-'));
  state.init(proj, 'router-root-state-test');
  const s = state.read(proj);
  s['lifecycle-phase'] = 'steady-state-active';
  state.write(proj, s);
  if (router.evaluateCheck('state:lifecycle-phase == steady-state-active', proj) !== true) {
    throw new Error('root lifecycle state should resolve');
  }
  fs.rmSync(proj, { recursive: true, force: true });
});

test('evaluateCheck: OR handles mixed state predicates', () => {
  router.clearCache();
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'router-or-test-'));
  state.init(proj, 'router-or-test');
  state.updateSubStep(proj, 'tier-1', 'arch', { status: 'done' });
  const ok = router.evaluateCheck(
    'state:lifecycle-phase == steady-state-active OR state:tier-1.arch.status == done',
    proj
  );
  if (ok !== true) throw new Error('second state OR branch should pass');
});

test('routing files all have apiVersion: godpowers/v1', () => {
  router.clearCache();
  const all = router.loadAll();
  for (const [cmd, r] of Object.entries(all)) {
    if (r.apiVersion !== 'godpowers/v1') {
      throw new Error(`${cmd} has wrong apiVersion: ${r.apiVersion}`);
    }
  }
});

test('routing files all have execution.spawns', () => {
  router.clearCache();
  const all = router.loadAll();
  for (const [cmd, r] of Object.entries(all)) {
    if (!r.execution || !r.execution.spawns) {
      throw new Error(`${cmd} missing execution.spawns`);
    }
  }
});

// Cleanup
fs.rmSync(tmp, { recursive: true, force: true });

// Phase audit: conditional-next routing
test('getNextCommand evaluates ui-detected condition', () => {
  // Set up a project root with React in package.json
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'router-cond-test-'));
  fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
    dependencies: { react: '^18.0.0' }
  }));
  // /god-stack has conditional-next: ui-detected -> /god-design, no-ui-detected -> /god-repo
  const next = router.getNextCommand('/god-stack', { projectRoot: tmp });
  if (next !== '/god-design') throw new Error('expected /god-design for UI project, got ' + next);
});

test('getNextCommand falls back to next-recommended when no condition', () => {
  // /god-prd has no conditional-next
  const next = router.getNextCommand('/god-prd');
  if (next !== '/god-arch') throw new Error('expected /god-arch, got ' + next);
});

test('getNextCommand evaluates no-ui-detected for backend project', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'router-cond-test-'));
  fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
    dependencies: { express: '^4.0.0' }
  }));
  const next = router.getNextCommand('/god-stack', { projectRoot: tmp });
  if (next !== '/god-repo') throw new Error('expected /god-repo for backend, got ' + next);
});

report('Router tests');
