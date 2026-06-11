#!/usr/bin/env node
/**
 * Behavioral tests for lib/artifact-map.js.
 */

const artifactMap = require('../lib/artifact-map');
const { test, assert, report } = require('./test-harness');

console.log('\n  Artifact map behavioral tests\n');

test('primary paths expose canonical planning artifacts', () => {
  assert(artifactMap.primaryPath('prd') === '.godpowers/prd/PRD.md',
    `prd: ${artifactMap.primaryPath('prd')}`);
  assert(artifactMap.primaryPath('roadmap') === '.godpowers/roadmap/ROADMAP.md',
    `roadmap: ${artifactMap.primaryPath('roadmap')}`);
});

test('tier grouping preserves bridge execution order', () => {
  const tier1 = artifactMap.byTier('tier-1').map((item) => item.key);
  assert(tier1.join(',') === 'prd,design,arch,roadmap,stack',
    `tier-1: ${tier1.join(',')}`);
  const tier2 = artifactMap.byTier('tier-2').map((item) => item.key);
  assert(tier2.join(',') === 'repo,build', `tier-2: ${tier2.join(',')}`);
});

test('design artifact paths include root outputs and compatibility paths on request', () => {
  const direct = artifactMap.paths('design');
  assert(direct.includes('DESIGN.md'), `paths: ${direct.join(',')}`);
  assert(direct.includes('PRODUCT.md'), `paths: ${direct.join(',')}`);
  assert(!direct.includes('.godpowers/design/DESIGN.md'),
    `paths: ${direct.join(',')}`);
  const compatibility = artifactMap.paths('design', { includeCompatibility: true });
  assert(compatibility.includes('.godpowers/design/DESIGN.md'),
    `compatibility: ${compatibility.join(',')}`);
});

test('unknown artifact keys fail loudly', () => {
  let failed = false;
  try {
    artifactMap.primaryPath('missing');
  } catch (e) {
    failed = /Unknown Godpowers artifact key/.test(e.message);
  }
  assert(failed, 'unknown key should throw');
});

report('Artifact map behavioral tests');
