#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const gate = require('../lib/gate');
const artifactMap = require('../lib/artifact-map');
const state = require('../lib/state');
const { test, asyncTest, assert, mkProject, writeRel, report } = require('./test-harness');

const ROOT = path.resolve(__dirname, '..');
const EXAMPLE = path.join(ROOT, 'examples', 'saas-mrr-tracker');

function gateResult(tier, projectRoot) {
  return gate.check({ tier, projectRoot, today: '2026-06-10' });
}

function errorSummary(result) {
  return JSON.stringify(result.findings.filter((finding) => finding.severity === 'error'));
}

function initState(project, mutate) {
  const current = state.init(project, 'gate-state-project');
  mutate(current);
  state.write(project, current, { refreshViews: false });
  return current;
}

test('green planning gates pass against example artifacts', () => {
  for (const tier of ['prd', 'design', 'arch', 'roadmap', 'stack']) {
    const result = gateResult(tier, EXAMPLE);
    assert(result.verdict === 'pass', `${tier} failed: ${errorSummary(result)}`);
    assert(Array.isArray(result.artifacts), `${tier} artifacts should be an array`);
    assert(result.checks.every((check) => check.id && check.status && 'artifact' in check && check.reason),
      `${tier} checks should have stable shape`);
  }
});

test('artifact map normalizes command names and reports required artifacts', () => {
  assert(artifactMap.normalizeTier('/god-prd') === 'prd', 'command tier should normalize');
  assert(artifactMap.normalizeTier(null) === null, 'empty tier should return null');
  assert(artifactMap.tiers().includes('harden'), 'tiers should include harden');
  assert(artifactMap.artifactsForTier('missing') === null, 'unknown tier should return null artifacts');
  const required = artifactMap.requiredArtifactsForTier('design');
  assert(required.length === 2, `design should have 2 required artifacts, got ${required.length}`);
  assert(required.some((artifact) => artifact.path === '.godpowers/state.json'),
    'design gate should require state.json evidence');
  assert(!required.some((artifact) => artifact.path === '.godpowers/design/STATE.mdx'),
    'design gate should not require markdown state');
  const buildArtifacts = artifactMap.requiredArtifactsForTier('build');
  assert(buildArtifacts.length === 1 && buildArtifacts[0].path === '.godpowers/state.json',
    `build gate should require only state.json evidence, got ${JSON.stringify(buildArtifacts)}`);
  const buildStep = artifactMap.stateStepForTier('build');
  assert(buildStep.tierKey === 'tier-2' && buildStep.subStepKey === 'build',
    `unexpected build state step: ${JSON.stringify(buildStep)}`);
});

test('design gate passes when optional PRODUCT artifact is absent', () => {
  const project = mkProject('godpowers-gate-design-');
  writeRel(project, 'DESIGN.md', [
    '---',
    'name: Gate Design',
    '---',
    '',
    '## Overview',
    '',
    '[DECISION] Gate Design exists only to prove optional PRODUCT handling.'
  ].join('\n'));
  writeRel(project, '.godpowers/design/STATE.mdx', [
    '# Design State',
    '',
    '[DECISION] This markdown state view is present but not gate-authoritative.'
  ].join('\n'));
  initState(project, (current) => {
    current.tiers['tier-1'].design = {
      status: 'done',
      artifact: 'design/STATE.mdx',
      updated: '2026-06-10T18:05:00.000Z'
    };
  });
  const result = gateResult('design', project);
  assert(result.verdict === 'pass', `design gate should pass: ${errorSummary(result)}`);
  assert(result.checks.some((check) => check.status === 'skipped' && check.artifact === 'PRODUCT.md'),
    'optional PRODUCT.md should be skipped');
  assert(result.checks.some((check) => check.id === 'state:design:status' && check.status === 'pass'),
    'design state status check should pass');
});

test('design gate returns a valid not-required result from state', () => {
  const project = mkProject('godpowers-gate-design-not-required-');
  initState(project, (current) => {
    current.tiers['tier-1'].design = {
      status: 'not-required',
      updated: '2026-07-13T12:00:00.000Z'
    };
  });
  const result = gateResult('design', project);
  assert(result.verdict === 'pass', `design not-required should pass: ${errorSummary(result)}`);
  assert(result.summary.designRequired === false, JSON.stringify(result.summary));
  assert(result.checks.some((check) => check.id === 'design-requirement' && check.status === 'pass'),
    'design requirement check should record not-required');
  assert(result.artifacts.some((artifact) => artifact.path === 'DESIGN.md' && artifact.required === false),
    'DESIGN.md should be non-required for this result');
});

test('repo build and harden gates pass against fixture projects', () => {
  for (const tier of ['repo', 'build', 'harden']) {
    const project = path.join(ROOT, 'fixtures', 'gate', `${tier}-pass`);
    const result = gateResult(tier, project);
    assert(result.verdict === 'pass', `${tier} failed: ${errorSummary(result)}`);
  }
});

test('missing required artifact fails the gate', () => {
  const project = mkProject('godpowers-gate-missing-');
  const result = gateResult('prd', project);
  assert(result.verdict === 'fail', 'missing PRD should fail');
  assert(result.summary.missing === 1, `missing count should be 1, got ${result.summary.missing}`);
  assert(result.findings.some((finding) => finding.id.includes('missing-artifact')),
    'missing artifact finding absent');
});

test('artifact lint error fails the gate', () => {
  const project = mkProject('godpowers-gate-lint-');
  writeRel(project, '.godpowers/prd/PRD.mdx', [
    '# Bad PRD',
    '',
    '[DECISION] This PRD contains an em dash ' + String.fromCharCode(0x2014) + ' which must fail.',
    '',
    '## Scope and No-Gos',
    '',
    '### Explicitly NOT in scope',
    '',
    '- [DECISION] Nothing else.',
    '',
    '## Success Metrics',
    '',
    '- [DECISION] Within 30 days, one founder completes review, measured via events.'
  ].join('\n'));
  const result = gateResult('prd', project);
  assert(result.verdict === 'fail', 'lint error should fail');
  assert(result.findings.some((finding) => finding.code === 'U-08'), 'U-08 finding absent');
});

test('harden gate fails unresolved Critical findings', () => {
  const project = mkProject('godpowers-gate-harden-');
  writeRel(project, '.godpowers/harden/FINDINGS.mdx', [
    '# Security Findings',
    '',
    '| Severity | Count |',
    '|---|---:|',
    '| Critical | 1 |',
    '',
    '[DECISION] Launch gate: BLOCKED.',
    '',
    '### [CRITICAL-001] Auth bypass',
    '',
    '- [DECISION] Status: Open.'
  ].join('\n'));
  const result = gateResult('harden', project);
  assert(result.verdict === 'fail', 'Critical harden finding should fail');
  assert(result.checks.some((check) => check.id === 'harden-critical-findings' && check.status === 'fail'),
    'critical check should fail');
});

test('harden gate fails without executed verification evidence', () => {
  const project = mkProject('godpowers-gate-harden-evidence-');
  // No Critical findings, so only the new executed-evidence requirement blocks.
  writeRel(project, '.godpowers/harden/FINDINGS.mdx', [
    '# Security Findings',
    '',
    '[DECISION] The harden run found no unresolved Critical findings.',
    '',
    '| Severity | Count |',
    '|---|---:|',
    '| Critical | 0 |',
    '',
    '[DECISION] Launch gate: PASSED.'
  ].join('\n'));
  initState(project, (current) => {
    current.tiers['tier-3'].harden = {
      status: 'done',
      updated: '2026-06-10T18:06:00.000Z',
      verification: { commands: [] }
    };
  });
  const result = gateResult('harden', project);
  assert(result.verdict === 'fail', 'harden without executed evidence should fail');
  assert(result.findings.some((finding) => finding.id === 'harden-verification-evidence'),
    'harden evidence finding absent');
  assert(result.checks.some((check) => check.id === 'harden-critical-findings' && check.status === 'pass'),
    'criticals should pass so the evidence requirement is what blocks');
});

test('harden gate passes with no criticals and an executed pass', () => {
  const project = mkProject('godpowers-gate-harden-evidence-pass-');
  writeRel(project, '.godpowers/harden/FINDINGS.mdx', [
    '# Security Findings',
    '',
    '[DECISION] The harden run found no unresolved Critical findings.',
    '',
    '| Severity | Count |',
    '|---|---:|',
    '| Critical | 0 |',
    '',
    '[DECISION] Launch gate: PASSED.',
    '',
    '| Category | Manual procedure | Result | Evidence or finding |',
    '|---|---|---|---|',
    '| A01:2025 Broken Access Control | authorization probe | pass | test evidence |',
    '| A02:2025 Security Misconfiguration | configuration probe | pass | test evidence |',
    '| A03:2025 Software Supply Chain Failures | supply-chain probe | pass | test evidence |',
    '| A04:2025 Cryptographic Failures | cryptography probe | pass | test evidence |',
    '| A05:2025 Injection | injection probe | pass | test evidence |',
    '| A06:2025 Insecure Design | abuse-case probe | pass | test evidence |',
    '| A07:2025 Authentication Failures | authentication scope review | Not Applicable, no auth surface | test evidence |',
    '| A08:2025 Software or Data Integrity Failures | integrity probe | pass | test evidence |',
    '| A09:2025 Security Logging and Alerting Failures | alert exercise | pass | test evidence |',
    '| A10:2025 Mishandling of Exceptional Conditions | failure injection | pass | test evidence |'
  ].join('\n'));
  initState(project, (current) => {
    current.tiers['tier-3'].harden = {
      status: 'done',
      updated: '2026-06-10T18:06:00.000Z',
      verification: {
        commands: [
          { command: 'npm audit --omit=dev', status: 'pass', exitCode: 0, ranAt: '2026-06-10T18:05:00.000Z' }
        ]
      }
    };
  });
  const result = gateResult('harden', project);
  assert(result.verdict === 'pass', `harden with evidence should pass: ${errorSummary(result)}`);
  assert(result.summary.hardenVerificationCommands.includes('npm audit --omit=dev'),
    'harden passed commands should be reported');
});

test('build gate fails without passed command evidence', () => {
  const project = mkProject('godpowers-gate-build-');
  initState(project, (current) => {
    current.tiers['tier-2'].build = {
      status: 'done',
      updated: '2026-06-10T18:06:00.000Z',
      verification: { commands: [] }
    };
  });
  const result = gateResult('build', project);
  assert(result.verdict === 'fail', 'missing build command evidence should fail');
  assert(result.findings.some((finding) => finding.id === 'build-verification-evidence'),
    'build evidence finding absent');
});

test('build gate ignores markdown state and fails from state.json failed command evidence', () => {
  const project = mkProject('godpowers-gate-build-failed-command-');
  writeRel(project, '.godpowers/build/STATE.mdx', [
    '# Build State',
    '',
    '[DECISION] This markdown view claims every verification command passed.'
  ].join('\n'));
  initState(project, (current) => {
    current.tiers['tier-2'].build = {
      status: 'done',
      updated: '2026-06-10T18:07:00.000Z',
      verification: {
        commands: [
          { command: 'npm install', status: 'pass', exitCode: 0, ranAt: '2026-06-10T18:06:00.000Z' },
          { command: 'npm test', status: 'fail', exitCode: 1, ranAt: '2026-06-10T18:06:30.000Z', diagnostics: 'unit failure' },
          { command: 'node --check cli.js', status: 'pass', exitCode: 0, ranAt: '2026-06-10T18:07:00.000Z' }
        ]
      }
    };
  });
  const result = gateResult('build', project);
  assert(result.verdict === 'fail', 'failed command should fail build gate');
  assert(result.findings.some((finding) => finding.id === 'build-verification-failed-command'),
    'failed command finding absent');
  assert(result.summary.buildVerificationFailedCommands.includes('npm test'),
    'npm test should be recorded as failed');
});

test('JSON shape remains stable', () => {
  const result = gateResult('stack', EXAMPLE);
  for (const key of ['tier', 'verdict', 'artifacts', 'checks', 'findings', 'summary']) {
    assert(Object.prototype.hasOwnProperty.call(result, key), `missing key ${key}`);
  }
  assert(result.artifacts[0].path === '.godpowers/stack/DECISION.mdx', 'unexpected stack artifact path');
  assert(result.summary.checkedArtifacts >= 1, 'checked artifact count missing');
});

test('unknown tier produces stable failure and render output', () => {
  const result = gateResult('nope', EXAMPLE);
  assert(result.verdict === 'fail', 'unknown tier should fail');
  assert(gate.exitCode(result) === 1, 'unknown tier exit code should be 1');
  const rendered = gate.render(result);
  assert(rendered.includes('Godpowers Gate: nope'), 'render should name requested gate');
  assert(rendered.includes('Findings:'), 'render should include findings');
});

test('render covers passing gates and labeled command evidence', () => {
  const commands = gate.extractPassedCommands('command: npm test status: passed\n`npm run lint`: green\n`npm test`: passed');
  assert(commands.length === 2, `expected deduped commands, got ${commands.join(',')}`);
  const failed = gate.extractFailedCommands([
    '- [DECISION] Exact executed command: `npm test`.',
    '- [DECISION] Status: FAIL with exit code 1.'
  ].join('\n'));
  assert(failed.length === 1 && failed[0] === 'npm test',
    `expected failed npm test command, got ${failed.join(',')}`);
  const result = gateResult('build', path.join(ROOT, 'fixtures', 'gate', 'build-pass'));
  assert(gate.exitCode(result) === 0, 'passing gate exit code should be 0');
  const rendered = gate.render(result);
  assert(rendered.includes('+ .godpowers/state.json'), 'render should include state artifact marker');
  assert(rendered.includes('Summary:'), 'render should include summary');
});

asyncTest('async gate API mirrors sync API', async () => {
  const sync = gateResult('repo', path.join(ROOT, 'fixtures', 'gate', 'repo-pass'));
  const asyncResult = await gate.checkAsync({
    tier: 'repo',
    projectRoot: path.join(ROOT, 'fixtures', 'gate', 'repo-pass')
  });
  assert(asyncResult.verdict === sync.verdict, 'async verdict should match sync verdict');
});

test('CLI gate exit code is zero for pass and one for fail', () => {
  const pass = spawnSync(process.execPath, [
    'bin/install.js',
    'gate',
    '--tier=prd',
    `--project=${EXAMPLE}`,
    '--json'
  ], { cwd: ROOT, encoding: 'utf8' });
  assert(pass.status === 0, `pass exit code should be 0, got ${pass.status}: ${pass.stderr}`);
  const parsed = JSON.parse(pass.stdout);
  assert(parsed.verdict === 'pass', 'CLI JSON verdict should pass');

  const project = mkProject('godpowers-gate-cli-');
  const fail = spawnSync(process.execPath, [
    'bin/install.js',
    'gate',
    '--tier=prd',
    `--project=${project}`,
    '--json'
  ], { cwd: ROOT, encoding: 'utf8' });
  assert(fail.status === 1, `fail exit code should be 1, got ${fail.status}`);
  const failed = JSON.parse(fail.stdout);
  assert(failed.verdict === 'fail', 'CLI JSON verdict should fail');
});

report('Gate tests');
