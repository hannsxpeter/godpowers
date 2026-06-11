#!/usr/bin/env node
/**
 * Behavioral tests for lib/gate.js.
 */

const path = require('path');
const { spawnSync } = require('child_process');

const gate = require('../lib/gate');
const { test, asyncTest, assert, mkProject, writeRel, report } = require('./test-harness');

console.log('\n  Gate behavioral tests\n');

const ROOT = path.resolve(__dirname, '..');

const CLEAN_PRD = `# Product Requirements Document

## Problem Statement

[DECISION] Acme billing operators need invoice reconciliation before month end.

## Target Users

[DECISION] Primary: Acme billing operators reconciling invoices for multi-location clinics.

## Success Metrics

- [DECISION] Reduce unresolved invoice mismatches by 40% within 30 days.

## Functional Requirements

### MUST (V1 launch blockers)
- [DECISION] User imports invoice CSV files. Acceptance: a valid CSV produces a parsed invoice table within 10 seconds.

## Non-Functional Requirements

| Category | Requirement | Source |
|----------|-------------|--------|
| Reliability | Import job succeeds for 99% of valid Acme CSV files. | [DECISION] |

## Scope and No-Gos

### In scope for V1
- [DECISION] Acme invoice CSV import.

### Explicitly NOT in scope
- [DECISION] Payroll reconciliation.

## Appetite

[DECISION] Time budget: 2 weeks.

## Open Questions

| Question | Owner | Due Date | Resolution |
|----------|-------|----------|------------|
| Which Acme CSV export is canonical? | maintainer | 2026-06-01 | |
`;

const CLEAN_BUILD_STATE = `# Build State

[DECISION] Verification command passed: \`npm test\`.
`;

const CLEAN_HARDEN = `# Harden Findings

[DECISION] Critical findings: 0.
[DECISION] Launch gate: PASSED.
`;

test('checkTier passes a clean PRD artifact', () => {
  const root = mkProject('gp-gate-prd-');
  writeRel(root, '.godpowers/prd/PRD.md', CLEAN_PRD);
  const result = gate.checkTier(root, 'prd', { today: '2026-06-11' });
  assert(result.tier === 'prd', `tier: ${result.tier}`);
  assert(result.verdict === 'pass', `verdict: ${result.verdict}`);
  assert(result.artifacts[0].path === '.godpowers/prd/PRD.md',
    `artifact: ${result.artifacts[0].path}`);
  assert(result.summary.failed === 0, `failed: ${result.summary.failed}`);
});

test('example planning artifacts pass PRD, DESIGN, ARCH, ROADMAP, and STACK gates', () => {
  const root = path.join(ROOT, 'examples', 'saas-mrr-tracker');
  for (const tier of ['prd', 'design', 'arch', 'roadmap', 'stack']) {
    const result = gate.checkTier(root, tier, { today: '2026-06-11' });
    assert(result.verdict === 'pass',
      `${tier} verdict: ${result.verdict}\n${JSON.stringify(result.findings, null, 2)}`);
  }
});

test('minimal gate fixtures pass repo, build, and harden adapters', () => {
  for (const tier of ['repo', 'build', 'harden']) {
    const root = path.join(ROOT, 'fixtures', 'gate', tier);
    const result = gate.checkTier(root, tier, { today: '2026-06-11' });
    assert(result.verdict === 'pass',
      `${tier} verdict: ${result.verdict}\n${JSON.stringify(result.checks, null, 2)}`);
  }
});

test('checkTier fails when required artifact is missing', () => {
  const root = mkProject('gp-gate-missing-');
  const result = gate.checkTier(root, 'roadmap', { today: '2026-06-11' });
  assert(result.verdict === 'fail', `verdict: ${result.verdict}`);
  assert(result.checks.some((check) => check.id === 'artifact.required.roadmap'
    && check.status === 'fail'), 'missing required check');
});

test('checkTier fails artifact lint errors', () => {
  const root = mkProject('gp-gate-lint-');
  writeRel(root, '.godpowers/prd/PRD.md', '# PRD\n\nThis is unlabeled prose with enough words to fail.\n');
  const result = gate.checkTier(root, 'prd', { today: '2026-06-11' });
  assert(result.verdict === 'fail', `verdict: ${result.verdict}`);
  assert(result.findings.some((finding) => finding.code === 'U-02'),
    `findings: ${JSON.stringify(result.findings)}`);
});

test('build gate fails missing verification evidence', () => {
  const root = mkProject('gp-gate-build-missing-evidence-');
  writeRel(root, '.godpowers/build/STATE.md', '# Build State\n\n[DECISION] Build artifact exists.\n');
  const result = gate.checkTier(root, 'build', { today: '2026-06-11' });
  assert(result.verdict === 'fail', `verdict: ${result.verdict}`);
  assert(result.checks.some((check) => check.id === 'build.verification-evidence'
    && check.status === 'fail'), 'missing build evidence failure');
});

test('build gate requires passing verification command evidence', () => {
  const root = mkProject('gp-gate-build-');
  writeRel(root, '.godpowers/build/STATE.md', CLEAN_BUILD_STATE);
  const result = gate.checkTier(root, 'build', { today: '2026-06-11' });
  assert(result.verdict === 'pass', `verdict: ${result.verdict}`);
  assert(result.checks.some((check) => check.id === 'build.verification-evidence'
    && check.status === 'pass'), 'missing build evidence pass');
});

test('harden gate fails unresolved Critical finding', () => {
  const root = mkProject('gp-gate-harden-critical-');
  writeRel(root, '.godpowers/harden/FINDINGS.md',
    '# Harden Findings\n\n[DECISION] Critical finding remains unresolved in Acme admin export.\n[DECISION] Launch gate: PASSED.\n');
  const result = gate.checkTier(root, 'harden', { today: '2026-06-11' });
  assert(result.verdict === 'fail', `verdict: ${result.verdict}`);
  assert(result.checks.some((check) => check.id === 'harden.no-unresolved-critical'
    && check.status === 'fail'), 'missing Critical finding failure');
});

test('harden gate fails blocked launch gate', () => {
  const root = mkProject('gp-gate-harden-');
  writeRel(root, '.godpowers/harden/FINDINGS.md',
    '# Harden Findings\n\n[DECISION] Critical findings: 0.\n[DECISION] Launch gate: BLOCKED.\n');
  const result = gate.checkTier(root, 'harden', { today: '2026-06-11' });
  assert(result.verdict === 'fail', `verdict: ${result.verdict}`);
  assert(result.checks.some((check) => check.id === 'harden.launch-gate'
    && check.status === 'fail'), 'missing launch gate failure');
});

test('gate JSON shape stays stable', () => {
  const root = mkProject('gp-gate-json-shape-');
  writeRel(root, '.godpowers/prd/PRD.md', CLEAN_PRD);
  const result = gate.checkTier(root, 'prd', { today: '2026-06-11' });
  for (const key of ['tier', 'verdict', 'artifacts', 'checks', 'findings', 'summary']) {
    assert(Object.prototype.hasOwnProperty.call(result, key), `missing ${key}`);
  }
  assert(Array.isArray(result.artifacts), 'artifacts should be an array');
  assert(Array.isArray(result.checks), 'checks should be an array');
  assert(Array.isArray(result.findings), 'findings should be an array');
  for (const key of ['verdict', 'passed', 'failed', 'skipped', 'errors', 'warnings']) {
    assert(Object.prototype.hasOwnProperty.call(result.summary, key), `summary missing ${key}`);
  }
  assert(result.artifacts.every((artifact) => artifact.key && artifact.path && artifact.status),
    'artifact rows should expose key, path, and status');
  assert(result.checks.every((check) => check.id && check.status && check.reason),
    'check rows should expose id, status, and reason');
});

test('gate CLI exits nonzero with JSON for missing artifact', () => {
  const root = mkProject('gp-gate-cli-exit-');
  const result = spawnSync(process.execPath, [
    path.join(ROOT, 'bin', 'install.js'),
    'gate',
    '--tier=roadmap',
    '--project',
    root,
    '--json'
  ], { encoding: 'utf8' });
  assert(result.status !== 0, 'missing roadmap gate should exit nonzero');
  const payload = JSON.parse(result.stdout);
  assert(payload.tier === 'roadmap', `tier: ${payload.tier}`);
  assert(payload.verdict === 'fail', `verdict: ${payload.verdict}`);
  assert(payload.summary.failed > 0, `failed: ${payload.summary.failed}`);
});

asyncTest('checkTierAsync mirrors sync API', async () => {
  const root = mkProject('gp-gate-async-');
  writeRel(root, '.godpowers/prd/PRD.md', CLEAN_PRD);
  const result = await gate.checkTierAsync(root, '/god-prd', { today: '2026-06-11' });
  assert(result.verdict === 'pass', `verdict: ${result.verdict}`);
  assert(result.tier === 'prd', `tier: ${result.tier}`);
});

test('unknown gate tiers fail loudly', () => {
  const root = mkProject('gp-gate-unknown-');
  let failed = false;
  try {
    gate.checkTier(root, 'missing');
  } catch (e) {
    failed = /Unknown Godpowers gate tier/.test(e.message);
  }
  assert(failed, 'unknown tier should throw');
});

report('Gate behavioral tests');
