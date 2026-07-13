#!/usr/bin/env node
/**
 * Behavioral tests for route, recipe, and release automation sync helpers.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

const routeQualitySync = require('../lib/route-quality-sync');
const recipeCoverageSync = require('../lib/recipe-coverage-sync');
const releaseSurfaceSync = require('../lib/release-surface-sync');
const { test, report } = require('./test-harness');


function writeRel(root, relPath, text) {
  const file = path.join(root, relPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function fixture() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-automation-surface-'));
  writeRel(tmp, 'package.json', JSON.stringify({ name: 'godpowers', version: '9.0.0' }, null, 2));
  writeRel(tmp, 'package-lock.json', JSON.stringify({ name: 'godpowers', version: '9.0.0' }, null, 2));
  writeRel(tmp, 'README.md', '[![Version](https://img.shields.io/badge/version-9.0.0-blue)](CHANGELOG.md)\n');
  writeRel(tmp, 'CHANGELOG.md', '## [9.0.0] - 2026-05-16\n');
  writeRel(tmp, 'RELEASE.md', '# Godpowers 9.0.0 Release\n');
  writeRel(tmp, 'docs/RELEASE-CHECKLIST.md', [
    '- Confirm route-quality-sync is fresh.',
    '- Confirm recipe-coverage-sync is fresh.',
    '- Confirm release-surface-sync is fresh.'
  ].join('\n'));
  writeRel(tmp, 'scripts/check-package-contents.js', [
    "'lib/artifact-map.js'",
    "'lib/cli-dispatch.js'",
    "'lib/command-families.js'",
    "'lib/gate.js'",
    "'lib/workflow-helper-groups.js'",
    "'lib/route-quality-sync.js'",
    "'lib/recipe-coverage-sync.js'",
    "'lib/release-surface-sync.js'"
  ].join('\n'));
  writeRel(tmp, 'specialists/god-planner.md', '---\nname: god-planner\n---\n');
  writeRel(tmp, 'specialists/god-executor.md', '---\nname: god-executor\n---\n');
  writeRel(tmp, 'specialists/god-spec-reviewer.md', '---\nname: god-spec-reviewer\n---\n');
  writeRel(tmp, 'specialists/god-quality-reviewer.md', '---\nname: god-quality-reviewer\n---\n');
  writeRel(tmp, 'specialists/god-writer.md', '---\nname: god-writer\n---\n');
  writeRel(tmp, 'routing/god-story-build.yaml', [
    'apiVersion: godpowers/v1',
    'kind: CommandRouting',
    'metadata:',
    '  command: /god-story-build',
    'execution:',
    '  spawns: [god-planner+god-executor+reviewers]',
    'success-path:',
    '  next-recommended: /god-story-verify'
  ].join('\n'));
  writeRel(tmp, 'routing/god-docs.yaml', [
    'apiVersion: godpowers/v1',
    'kind: CommandRouting',
    'metadata:',
    '  command: /god-docs',
    'execution:',
    '  spawns: [built-in]',
    'success-path:',
    '  next-recommended: /god-status'
  ].join('\n'));
  writeRel(tmp, 'routing/god-write.yaml', [
    'apiVersion: godpowers/v1',
    'kind: CommandRouting',
    'metadata:',
    '  command: /god-write',
    'execution:',
    '  spawns: [god-writer]',
    '  writes:',
    '    - .godpowers/write/REPORT.mdx',
    'success-path:',
    '  next-recommended: /god-status'
  ].join('\n'));
  writeRel(tmp, 'routing/recipes/docs-drift.yaml', [
    'apiVersion: godpowers/v1',
    'kind: Recipe',
    'metadata:',
    '  name: docs-drift',
    '  category: maintaining',
    'sequences:',
    '  default:',
    '    steps:',
    '      - command: "/god-docs"'
  ].join('\n'));
  return tmp;
}

console.log('\n  Automation surface sync behavioral tests\n');

test('route quality sync rejects symbolic spawn tokens', () => {
  const tmp = fixture();
  const report = routeQualitySync.detect(tmp);
  assert.equal(report.status, 'stale');
  assert(report.stale.some((check) => check.id.startsWith('symbolic-spawn')));
  assert(report.stale.some((check) => check.id.startsWith('missing-standards')));
});

test('route quality sync requires trace events for agent-spawning routes', () => {
  const tmp = fixture();
  const report = routeQualitySync.detect(tmp);
  assert(report.stale.some((check) => check.id === 'missing-trace-events--god-write'));
  assert(report.stale.some((check) => check.id === 'agent-trace-policy'));
});

test('route quality sync requires typed outcomes for contextual exits', () => {
  const tmp = fixture();
  writeRel(tmp, 'routing/god-next.yaml', [
    'apiVersion: godpowers/v1',
    'kind: CommandRouting',
    'metadata:',
    '  command: /god-next',
    'execution:',
    '  spawns: [built-in]',
    'success-path:',
    '  next-recommended: varies',
    'endoff:',
    '  state-update: tier-0 updated for /god-next'
  ].join('\n'));
  const report = routeQualitySync.detect(tmp);
  assert(report.stale.some((check) => check.id === 'missing-route-outcome--god-next'));
});

test('route quality sync requires gate commands for executable tier routes', () => {
  const tmp = fixture();
  writeRel(tmp, 'routing/god-prd.yaml', [
    'apiVersion: godpowers/v1',
    'kind: CommandRouting',
    'metadata:',
    '  command: /god-prd',
    'execution:',
    '  spawns: [built-in]',
    '  writes:',
    '    - .godpowers/prd/PRD.mdx',
    'standards:',
    '  substitution-test: true',
    '  three-label-test: true',
    'success-path:',
    '  next-recommended: /god-arch',
    'endoff:',
    '  events: [agent.start, artifact.created, agent.end]'
  ].join('\n'));
  const report = routeQualitySync.detect(tmp);
  assert(report.stale.some((check) => check.id === 'missing-gate-command--god-prd'));
  assert(report.stale.some((check) => check.id === 'gate-command-policy'));
});

test('recipe coverage sync finds missing high-frequency recipes', () => {
  const tmp = fixture();
  const report = recipeCoverageSync.detect(tmp);
  assert.equal(report.status, 'stale');
  assert(report.stale.some((check) => check.id === 'coverage-story-work'));
  assert(report.stale.some((check) => check.id === 'coverage-automation-setup'));
});

test('release surface sync catches missing package guardrails', () => {
  const tmp = fixture();
  writeRel(tmp, 'scripts/check-package-contents.js', "'lib/route-quality-sync.js'\n");
  const report = releaseSurfaceSync.detect(tmp);
  assert.equal(report.status, 'stale');
  assert(report.stale.some((check) => check.id.includes('recipe-coverage-sync')));
});

test('release surface sync requires dogfood, extension, suite, and install gates', () => {
  const tmp = fixture();
  const report = releaseSurfaceSync.detect(tmp);
  assert(report.stale.some((check) => check.id.includes('test-automation-surface-sync')));
  assert(report.stale.some((check) => check.id.includes('test-extensions-publish')));
  assert(report.stale.some((check) => check.id.includes('test-mode-d')));
  assert(report.stale.some((check) => check.id.includes('test-install-smoke')));
});

test('current repository automation surfaces are fresh', () => {
  const projectRoot = path.resolve(__dirname, '..');
  assert.equal(routeQualitySync.detect(projectRoot).status, 'fresh');
  assert.equal(recipeCoverageSync.detect(projectRoot).status, 'fresh');
  assert.equal(releaseSurfaceSync.detect(projectRoot).status, 'fresh');
});

// TEST-002: the run()/appendLog() write path of the three siblings was untested
// (only detect() was). Assert each writes a log and honors the no-banned-dash
// invariant, mirroring the repo-surface-sync run() test.
for (const mod of [routeQualitySync, recipeCoverageSync, releaseSurfaceSync]) {
  test(`${mod.LOG_PATH} run writes a log with no banned dash (TEST-002)`, () => {
    const tmp = fixture();
    const result = mod.run(tmp);
    assert.equal(result.applied.length, 0, 'run applies no fixes');
    assert.equal(result.logPath, mod.LOG_PATH, 'run reports its log path');
    const log = fs.readFileSync(path.join(tmp, mod.LOG_PATH), 'utf8');
    assert(log.length > 0, 'log was written');
    assert(!/[–—]/.test(log), 'log contains a banned em/en dash');
  });
}

report();
