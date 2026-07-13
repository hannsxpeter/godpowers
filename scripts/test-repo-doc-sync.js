#!/usr/bin/env node
/**
 * Behavioral tests for lib/repo-doc-sync.js.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

const repoDocSync = require('../lib/repo-doc-sync');
const { test, report } = require('./test-harness');


function writeRel(root, relPath, text) {
  const file = path.join(root, relPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function readRel(root, relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function mkFixture() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-repo-doc-sync-'));
  writeRel(tmp, 'package.json', JSON.stringify({
    name: 'godpowers',
    version: '9.8.7',
    description: 'AI-powered system: 1 slash commands and 1 specialist agents.'
  }, null, 2));
  writeRel(tmp, 'skills/god-one.md', '# one\n');
  writeRel(tmp, 'skills/god-two.md', '# two\n');
  writeRel(tmp, 'specialists/god-alpha.md', '# alpha\n');
  writeRel(tmp, 'specialists/god-beta.md', '# beta\n');
  writeRel(tmp, 'workflows/full.yaml', 'name: full\n');
  writeRel(tmp, 'routing/recipes/green.yaml', 'name: green\n');
  writeRel(tmp, 'README.md',
    '[![Version](https://img.shields.io/badge/version-0.0.1-blue)](CHANGELOG.md)\nall 1 skills + 1 agents\n');
  writeRel(tmp, 'USERS.md', 'Godpowers is at v0.0.1. Stable release.\n');
  writeRel(tmp, 'ARCHITECTURE.md', 'STABLE v0.0.1\nCore: 1 skills, 1 agents, 1 workflows\n');
  writeRel(tmp, 'docs/ROADMAP.md',
    'Current shipped: v0.0.1\n**1 slash commands**\n**1 specialist agents**\n');
  writeRel(tmp, 'docs/reference.md',
    'reference for v0.0.1\nSlash commands (1 total)\nSpecialist agents (1 total)\n');
  writeRel(tmp, 'skills/god-version.md', 'Surface: 1 skills, 1 agents, 1 workflows, 1 recipes\n');
  writeRel(tmp, 'skills/god-doctor.md', '[OK] 1 skills installed\n[OK] 1 agents installed\n');
  writeRel(tmp, 'RELEASE.md', '# Godpowers 0.0.1 Release\n');
  writeRel(tmp, 'CHANGELOG.md', '# Changelog\n\n## [0.0.1] - 2026-01-01\n');
  writeRel(tmp, 'SECURITY.md', '| 0.0.x | Yes |\n');
  writeRel(tmp, 'CONTRIBUTING.md', 'Releases are manual.\n');
  writeRel(tmp, 'AGENTS.md',
    '<!-- pillars:begin -->\n# Godpowers Project Context\nalways_load: true\nexcluded: []\n<!-- pillars:end -->\n');
  writeRel(tmp, 'agents/context.md',
    '---\npillar: context\nstatus: active\nalways_load: true\ncovers: [project]\ntriggers: []\n---\n');
  writeRel(tmp, 'agents/repo.md',
    '---\npillar: repo\nstatus: active\nalways_load: true\ncovers: [repo]\ntriggers: []\n---\n');
  return tmp;
}

console.log('\n  Repo documentation sync behavioral tests\n');

test('detect finds stale mechanical and prose documentation surfaces', () => {
  const tmp = mkFixture();
  const result = repoDocSync.detect(tmp);
  assert.equal(result.status, 'stale');
  assert.equal(result.counts.skills, 4);
  assert.equal(result.counts.agents, 2);
  assert(result.safeFixes.some((check) => check.id === 'readme-version-badge'));
  assert(result.prose.some((check) => check.id === 'changelog-version'));
  assert(result.spawnRecommendation);
  assert.equal(result.spawnRecommendation.agent, 'god-docs-writer');
});

test('run applies only safe mechanical updates and leaves narrative docs stale', () => {
  const tmp = mkFixture();
  const result = repoDocSync.run(tmp);
  assert(result.applied.some((item) => item.path === 'README.md'));
  assert(readRel(tmp, 'README.md').includes('version-9.8.7-blue'));
  assert(readRel(tmp, 'README.md').includes('all 4 skills + 2 agents'));
  assert(readRel(tmp, 'package.json').includes('4 slash commands and 2 specialist agents'));
  assert(readRel(tmp, 'USERS.md').includes('current source version is v9.8.7'));
  assert(readRel(tmp, 'docs/ROADMAP.md').includes('Current source: v9.8.7'));
  assert(readRel(tmp, 'RELEASE.md').includes('Godpowers 0.0.1'));
  assert(result.after.prose.some((check) => check.path === 'RELEASE.md'));
});

test('published versions cannot retain release-candidate architecture status', () => {
  const tmp = mkFixture();
  writeRel(tmp, 'USERS.md',
    'The current source version is v9.8.7, and the latest published release is v9.8.7.\n');
  writeRel(tmp, 'ARCHITECTURE.md',
    'STABLE v9.8.7 release candidate\nCore: 4 skills, 2 agents, 1 workflows\n');

  const before = repoDocSync.detect(tmp);
  assert(before.stale.some((check) => check.id === 'architecture-publication-status'));

  repoDocSync.run(tmp, { log: false });
  const architecture = readRel(tmp, 'ARCHITECTURE.md');
  assert(architecture.includes('STABLE v9.8.7 published release'));
  assert(!architecture.includes('release candidate'));
});

test('run writes a Godpowers repo-doc sync log', () => {
  const tmp = mkFixture();
  repoDocSync.run(tmp);
  const log = readRel(tmp, repoDocSync.LOG_PATH);
  assert(log.includes('Repo Documentation Sync Log'));
  assert(log.includes('[DECISION] Refreshed README.md'));
  assert(!/[\u2013\u2014]/.test(log), 'log contains banned dash');
});

test('detect creates Pillars sync plan for changed repo docs', () => {
  const tmp = mkFixture();
  const result = repoDocSync.detect(tmp, { changedFiles: ['README.md', 'docs/ROADMAP.md'] });
  assert(result.touchedDocs.includes('README.md'));
  assert(result.pillarSyncPlan.some((item) => item.pillar === 'context'));
});

test('adjacent opportunities document other autonomous sync candidates', () => {
  const opportunities = repoDocSync.adjacentOpportunities();
  assert(opportunities.some((item) => item.id === 'routing-surface-sync'));
  assert(opportunities.some((item) => item.id === 'package-installer-sync'));
});

report();
