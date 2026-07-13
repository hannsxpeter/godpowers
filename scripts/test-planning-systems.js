#!/usr/bin/env node
/**
 * Behavioral tests for planning-system migration and source sync-back.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const planningSystems = require('../lib/planning-systems');
const sourceSync = require('../lib/source-sync');
const state = require('../lib/state');
const { test, report } = require('./test-harness');


function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function mkProject() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-planning-systems-'));
  fs.mkdirSync(path.join(tmp, '.godpowers'), { recursive: true });
  state.init(tmp, 'planning-systems-test');
  return tmp;
}

console.log('\n  Planning-system migration tests\n');

test('detect finds legacy planning .planning artifacts', () => {
  const tmp = mkProject();
  write(path.join(tmp, '.planning', 'PROJECT.md'), '# Project\n\n## Users\n');
  write(path.join(tmp, '.planning', 'REQUIREMENTS.md'), '# Requirements\n\n## Functional Requirements\n');
  write(path.join(tmp, '.planning', 'ROADMAP.md'), '# Roadmap\n\n## Phase 1\n');

  const result = planningSystems.detect(tmp);
  const legacyPlanning = result.systems.find((system) => system.id === 'legacy-planning');
  assert(legacyPlanning, 'legacy planning not detected');
  assert(legacyPlanning.files.some((file) => file.path === '.planning/REQUIREMENTS.md'), 'requirements missing');
  assert(legacyPlanning.confidence === 'high', `unexpected confidence: ${legacyPlanning.confidence}`);
});

test('detect skips symlinked planning roots that escape the project', () => {
  const tmp = mkProject();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-planning-secret-'));
  write(path.join(outside, 'SECRET.md'), '# Secret\n\n- [ ] do not import\n');
  fs.symlinkSync(outside, path.join(tmp, '.planning'));

  const result = planningSystems.detect(tmp);
  const legacyPlanning = result.systems.find((system) => system.id === 'legacy-planning');
  assert(legacyPlanning, 'legacy planning marker not detected');
  assert(!legacyPlanning.files.some((file) => file.path.includes('SECRET.md')),
    'outside symlink target was imported');
});

test('detect finds BMAD v6 output artifacts', () => {
  const tmp = mkProject();
  write(path.join(tmp, '_bmad-output', 'planning-artifacts', 'PRD.md'), '# PRD\n\n## Goals\n');
  write(path.join(tmp, '_bmad-output', 'planning-artifacts', 'architecture.md'), '# Architecture\n\n## ADR\n');
  write(path.join(tmp, '_bmad-output', 'implementation-artifacts', 'sprint-status.yaml'), 'stories: []\n');

  const result = planningSystems.detect(tmp);
  const bmad = result.systems.find((system) => system.id === 'bmad');
  assert(bmad, 'BMAD not detected');
  assert(bmad.files.some((file) => file.path.includes('architecture.md')), 'architecture missing');
});

test('detect finds Superpowers specs and plans', () => {
  const tmp = mkProject();
  write(path.join(tmp, 'docs', 'superpowers', 'specs', '2026-05-16-feature-design.md'), '# Feature Design\n\n## Scope\n');
  write(path.join(tmp, 'docs', 'superpowers', 'plans', '2026-05-16-feature.md'), '# Plan\n\n- [ ] Write failing test\n');

  const result = planningSystems.detect(tmp);
  const superpowers = result.systems.find((system) => system.id === 'superpowers');
  assert(superpowers, 'Superpowers not detected');
  assert(superpowers.files.some((file) => file.path.includes('plans')), 'plan missing');
});

test('detect and import preserve Arc-Ready canonical artifact evidence', () => {
  const tmp = mkProject();
  write(path.join(tmp, '.arc-ready', 'PROGRESS.md'), '# Progress\n\nCurrent tier: build\n');
  write(path.join(tmp, '.prd-ready', 'PRD.md'), '# PRD\n\n## Acceptance criteria\n');
  write(path.join(tmp, '.architecture-ready', 'ARCH.md'), '# Architecture\n\n## Trust boundaries\n');
  write(path.join(tmp, '.roadmap-ready', 'ROADMAP.md'), '# Roadmap\n\n## Phase 1\n');
  write(path.join(tmp, '.stack-ready', 'STACK.md'), '# Stack\n\n## Runtime\n');
  write(path.join(tmp, '.harden-ready', 'FINDINGS.md'), '# Findings\n\n## Critical\n');

  const detection = planningSystems.detect(tmp);
  const arcReady = detection.systems.find((system) => system.id === 'arc-ready');
  assert(arcReady, 'Arc-Ready not detected');
  assert(arcReady.confidence === 'high', `unexpected confidence: ${arcReady.confidence}`);
  assert(arcReady.files.some((file) => file.path === '.prd-ready/PRD.md'), 'Arc-Ready PRD missing');

  const result = planningSystems.importPlanningContext(tmp, { detection });
  assert(result.writtenArtifacts.includes('prd/PRD.mdx'), 'Arc-Ready PRD seed missing');
  assert(result.writtenArtifacts.includes('arch/ARCH.mdx'), 'Arc-Ready architecture seed missing');
  assert(result.writtenArtifacts.includes('roadmap/ROADMAP.mdx'), 'Arc-Ready roadmap seed missing');
  assert(result.writtenArtifacts.includes('stack/DECISION.mdx'), 'Arc-Ready stack seed missing');
  assert(result.writtenArtifacts.includes('harden/FINDINGS.mdx'), 'Arc-Ready findings seed missing');
});

test('importPlanningContext writes prep context and Godpowers seed artifacts', () => {
  const tmp = mkProject();
  write(path.join(tmp, '.planning', 'REQUIREMENTS.md'), '# Requirements\n\n## Login\n');
  write(path.join(tmp, '.planning', 'ROADMAP.md'), '# Roadmap\n\n## Phase 1\n');

  const result = planningSystems.importPlanningContext(tmp);
  assert(result.importedContextPath === '.godpowers/prep/IMPORTED-CONTEXT.mdx', 'bad imported context path');
  assert(result.writtenArtifacts.includes('prd/PRD.mdx'), 'PRD seed not written');
  assert(result.writtenArtifacts.includes('roadmap/ROADMAP.mdx'), 'roadmap seed not written');

  const imported = fs.readFileSync(path.join(tmp, '.godpowers', 'prep', 'IMPORTED-CONTEXT.mdx'), 'utf8');
  assert(imported.includes('[DECISION] Source system: legacy planning.'), 'source not documented');
  assert(imported.includes('[HYPOTHESIS]'), 'hypothesis labels missing');

  const nextState = state.read(tmp);
  assert(Array.isArray(nextState['source-systems']), 'source-systems state missing');
  assert(nextState.tiers['tier-1'].prd.status === 'imported', 'PRD not marked imported');
});

test('importPlanningContext preserves existing Godpowers artifacts by default', () => {
  const tmp = mkProject();
  write(path.join(tmp, '.planning', 'REQUIREMENTS.md'), '# Requirements\n\n## Login\n');
  write(path.join(tmp, '.godpowers', 'prd', 'PRD.md'), '# Existing PRD\n\n- [DECISION] Keep me.\n');

  planningSystems.importPlanningContext(tmp);
  const prd = fs.readFileSync(path.join(tmp, '.godpowers', 'prd', 'PRD.md'), 'utf8');
  assert(prd.includes('Keep me'), 'existing PRD overwritten');
});

test('sourceSync writes companion file and preserves existing STATE.md prose', () => {
  const tmp = mkProject();
  write(path.join(tmp, '.planning', 'STATE.md'), '# legacy planning State\n\nNative state stays here.\n');
  write(path.join(tmp, '.planning', 'REQUIREMENTS.md'), '# Requirements\n\n## Login\n');
  planningSystems.importPlanningContext(tmp);

  const result = sourceSync.run(tmp);
  assert(result.results.length === 1, `unexpected sync count: ${result.results.length}`);
  assert(result.results[0].companion === '.planning/GODPOWERS-SYNC.md', 'wrong companion path');

  const companion = fs.readFileSync(path.join(tmp, '.planning', 'GODPOWERS-SYNC.md'), 'utf8');
  assert(companion.includes(sourceSync.FENCE_BEGIN), 'companion fence missing');
  assert(companion.includes('Godpowers Sync-Back'), 'sync content missing');

  const nativeState = fs.readFileSync(path.join(tmp, '.planning', 'STATE.md'), 'utf8');
  assert(nativeState.includes('Native state stays here.'), 'native prose lost');
  assert(nativeState.includes('.planning/GODPOWERS-SYNC.md'), 'pointer missing');
});

test('sourceSync is idempotent', () => {
  const tmp = mkProject();
  write(path.join(tmp, '.planning', 'REQUIREMENTS.md'), '# Requirements\n\n## Login\n');
  planningSystems.importPlanningContext(tmp);

  sourceSync.run(tmp);
  const first = fs.readFileSync(path.join(tmp, '.planning', 'GODPOWERS-SYNC.md'), 'utf8');
  sourceSync.run(tmp);
  const second = fs.readFileSync(path.join(tmp, '.planning', 'GODPOWERS-SYNC.md'), 'utf8');
  assert(first === second, 'sync-back changed on second run');
  const count = (second.match(/godpowers:source-sync:begin/g) || []).length;
  assert(count === 1, `expected one fence, got ${count}`);
});

test('sourceSync writes an Arc-Ready companion without changing canonical artifacts', () => {
  const tmp = mkProject();
  const progress = '# Arc-Ready Progress\n\nCanonical progress stays here.\n';
  write(path.join(tmp, '.arc-ready', 'PROGRESS.md'), progress);
  write(path.join(tmp, '.prd-ready', 'PRD.md'), '# PRD\n\n## Outcome\n');
  planningSystems.importPlanningContext(tmp);

  const result = sourceSync.run(tmp);
  const synced = result.results.find((entry) => entry.system === 'arc-ready');
  assert(synced, 'Arc-Ready sync result missing');
  assert(synced.companion === '.arc-ready/GODPOWERS-SYNC.md', 'wrong Arc-Ready companion');
  assert(synced.pointers.length === 0, 'Arc-Ready must not receive pointer edits');
  assert(fs.readFileSync(path.join(tmp, '.arc-ready', 'PROGRESS.md'), 'utf8') === progress,
    'Arc-Ready canonical progress was changed');
});

report();
