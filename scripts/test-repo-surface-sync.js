#!/usr/bin/env node
/**
 * Behavioral tests for lib/repo-surface-sync.js.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

const repoSurfaceSync = require('../lib/repo-surface-sync');
const { test, report } = require('./test-harness');


function writeRel(root, relPath, text) {
  const file = path.join(root, relPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function readRel(root, relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function fixture() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-repo-surface-sync-'));
  writeRel(tmp, 'package.json', JSON.stringify({
    name: 'godpowers',
    version: '7.0.0',
    files: ['bin/', 'skills/', 'specialists/', 'routing/', 'workflows/', 'schema/', 'lib/', 'extensions/', 'RELEASE.md', 'SKILL.md', 'AGENTS.md', 'CHANGELOG.md', 'LICENSE'],
    scripts: { test: 'node scripts/test-repo-surface-sync.js' }
  }, null, 2));
  writeRel(tmp, 'package-lock.json', JSON.stringify({ name: 'godpowers', version: '7.0.0' }, null, 2));
  writeRel(tmp, 'scripts/check-package-contents.js',
    "const required = ['lib/feature-awareness.js', 'lib/repo-doc-sync.js'];\n");
  writeRel(tmp, 'skills/god-alpha.md', '---\nname: god-alpha\ndescription: |\n  Triggers on: alpha\n---\n# alpha\n');
  writeRel(tmp, 'skills/god-beta.md', '---\nname: god-beta\ndescription: |\n  Triggers on: beta\n---\n# beta\n');
  writeRel(tmp, 'routing/god-alpha.yaml',
    'apiVersion: godpowers/v1\nkind: CommandRouting\nmetadata:\n  command: /god-alpha\nexecution:\n  spawns: [god-missing]\n');
  writeRel(tmp, 'specialists/god-alpha-agent.md', '---\nname: god-alpha-agent\ndescription: x\ntools: Read\n---\n');
  writeRel(tmp, 'docs/agent-specs.md', 'god-alpha-agent\n');
  writeRel(tmp, 'workflows/full-arc.yaml', 'apiVersion: godpowers/v1\nname: full-arc\n');
  writeRel(tmp, 'routing/recipes/demo.yaml', 'apiVersion: godpowers/v1\ncommands:\n  - /god-alpha\n');
  writeRel(tmp, 'docs/recipes.md', '# Recipes\n\n## demo\n');
  writeRel(tmp, 'docs/command-flows.md', '/god-docs\n/god-sync\n');
  writeRel(tmp, 'README.md', '[![Version](https://img.shields.io/badge/version-7.0.0-blue)](CHANGELOG.md)\nall 2 skills + 1 agents\n');
  writeRel(tmp, 'USERS.md', 'The current source version is v7.0.0.\n');
  writeRel(tmp, 'ARCHITECTURE.md', 'STABLE v7.0.0\nCore: 2 skills, 1 agents, 1 workflows\n');
  writeRel(tmp, 'docs/ROADMAP.md', 'Current source: v7.0.0\n**2 slash commands**\n**1 specialist agents**\n');
  writeRel(tmp, 'docs/reference.md', 'reference for v7.0.0\nSlash commands (2 total)\nSpecialist agents (1 total)\n');
  writeRel(tmp, 'skills/god-version.md', 'Surface: 2 skills, 1 agents, 1 workflows, 1 recipes\n');
  writeRel(tmp, 'skills/god-doctor.md', '[OK] 2 skills installed\n[OK] 1 agents installed\n');
  writeRel(tmp, 'RELEASE.md', '# Godpowers 7.0.0 Release\n');
  writeRel(tmp, 'CHANGELOG.md', '# Changelog\n\n## [7.0.0] - 2026-05-16\n');
  writeRel(tmp, 'SECURITY.md', '| 7.0.x | Yes |\n');
  writeRel(tmp, 'CONTRIBUTING.md', 'repo documentation sync\n');
  writeRel(tmp, 'docs/RELEASE-CHECKLIST.md', '- Confirm repo-surface-sync is fresh.\n');
  writeRel(tmp, 'extensions/demo-pack/manifest.yaml',
    'apiVersion: godpowers.dev/v1\nkind: ExtensionManifest\nmetadata:\n  name: @godpowers/demo-pack\n  version: 1.0.0\nengines:\n  godpowers: ">=7.0.0"\nprovides:\n  skills:\n    - god-demo\n');
  writeRel(tmp, 'extensions/demo-pack/package.json', JSON.stringify({
    name: '@godpowers/demo-pack',
    version: '1.0.0',
    peerDependencies: { godpowers: '>=7.0.0' }
  }, null, 2));
  writeRel(tmp, 'extensions/demo-pack/skills/god-demo.md', '# demo\n');
  return tmp;
}

console.log('\n  Repo surface sync behavioral tests\n');

test('detect reports missing route, package check, and missing spawn target', () => {
  const tmp = fixture();
  const report = repoSurfaceSync.detect(tmp);
  assert.equal(report.status, 'stale');
  assert(report.stale.some((check) => check.id === 'route-for-god-beta'));
  assert(report.stale.some((check) => check.id.includes('package-check-lib-repo-surface-sync-js')));
  assert(report.stale.some((check) => check.id === 'missing-agent-god-missing'));
  assert(report.stale.some((check) => check.id === 'suite-test-gate'));
  assert(report.spawnRecommendations.some((rec) => rec.agent === 'god-auditor'));
  assert(report.spawnRecommendations.some((rec) => rec.agent === 'god-coordinator'));
});

test('run can create missing routing metadata when fixRouting is explicit', () => {
  const tmp = fixture();
  const result = repoSurfaceSync.run(tmp, { fixRouting: true });
  assert(result.applied.some((item) => item.path === 'routing/god-beta.yaml'));
  assert(readRel(tmp, 'routing/god-beta.yaml').includes('command: /god-beta'));
});

test('run writes a repo surface sync log', () => {
  const tmp = fixture();
  repoSurfaceSync.run(tmp, { log: true });
  const log = readRel(tmp, repoSurfaceSync.LOG_PATH);
  assert(log.includes('Repo Surface Sync Log'));
  assert(log.includes('[DECISION] Repo surface sync status before apply was stale.'));
  assert(!/[\u2013\u2014]/.test(log), 'log contains banned dash');
});

test('current repository surface is fresh', () => {
  const report = repoSurfaceSync.detect(path.resolve(__dirname, '..'));
  assert.equal(report.status, 'fresh');
});

report();
