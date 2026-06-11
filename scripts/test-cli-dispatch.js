#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const installer = require('../bin/install');
const cliDispatch = require('../lib/cli-dispatch');
const { COMMANDS } = require('../lib/installer-args');
const { test, assert, mkProject, writeRel, report } = require('./test-harness');

const CLEAN_PRD = `# Product Requirements Document

## Problem Statement

[DECISION] Acme billing operators need invoice reconciliation before month end.

## Target Users

[DECISION] Primary: Acme billing operators reconciling invoices for multi-location clinics.

## Success Metrics

- [DECISION] Reduce unresolved invoice mismatches by 40% within 30 days.

## Functional Requirements

### MUST
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

function capture(fn) {
  const originalLog = console.log;
  const originalError = console.error;
  const lines = [];
  console.log = (...args) => lines.push(args.join(' '));
  console.error = (...args) => lines.push(args.join(' '));
  try {
    return { value: fn(), output: lines.join('\n') };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

test('CLI dispatch table covers every parsed subcommand', () => {
  for (const command of COMMANDS) {
    assert(typeof cliDispatch.COMMAND_RUNNERS[command] === 'function', `${command} missing dispatch runner`);
  }
});

test('installer binary export delegates to cli dispatch table', () => {
  assert(installer.COMMAND_RUNNERS === cliDispatch.COMMAND_RUNNERS,
    'installer should re-export the shared dispatch table');
  assert(installer.runCommand === cliDispatch.runCommand,
    'installer should re-export the shared runCommand');
});

test('status and next commands dispatch through the dashboard branch', () => {
  const project = mkProject('godpowers-cli-dispatch-');
  for (const command of ['status', 'next']) {
    const result = capture(() => cliDispatch.runCommand({
      command,
      project,
      json: true,
      brief: true
    }));
    assert(result.value === true, `${command} did not dispatch`);
    assert(result.output.includes('"state"'), `${command} did not render dashboard JSON`);
  }
});

test('quick-proof command dispatches through proof branch', () => {
  const project = mkProject('godpowers-cli-proof-');
  const result = capture(() => cliDispatch.runCommand({
    command: 'quick-proof',
    project,
    json: false,
    brief: true
  }));
  assert(result.value === true, 'quick-proof did not dispatch');
  assert(result.output.includes('Godpowers Quick Proof'), 'quick-proof output missing title');
});

test('automation commands dispatch through automation branch', () => {
  const project = mkProject('godpowers-cli-automation-');
  for (const command of ['automation-status', 'automation-setup']) {
    const result = capture(() => cliDispatch.runCommand({
      command,
      project,
      json: true
    }));
    assert(result.value === true, `${command} did not dispatch`);
    assert(result.output.includes('{'), `${command} did not emit JSON`);
  }
});

test('dogfood command dispatches through dogfood branch', () => {
  const result = capture(() => cliDispatch.runCommand({
    command: 'dogfood',
    json: true
  }));
  assert(result.value === true, 'dogfood did not dispatch');
  assert(result.output.includes('"status"'), 'dogfood output missing status');
});

test('extension-scaffold command dispatches through scaffold branch', () => {
  const output = mkProject('godpowers-cli-extension-');
  const result = capture(() => cliDispatch.runCommand({
    command: 'extension-scaffold',
    extensionName: '@godpowers/dispatch-test',
    extensionOutput: output,
    extensionSkill: 'god-dispatch-test',
    extensionAgent: 'god-dispatch-agent',
    extensionWorkflow: 'dispatch-workflow',
    json: true
  }));
  const scaffoldPath = path.join(output, 'godpowers-dispatch-test', 'manifest.yaml');
  assert(result.value === true, 'extension-scaffold did not dispatch');
  assert(fs.existsSync(scaffoldPath), 'extension scaffold manifest missing');
  assert(result.output.includes('"@godpowers/dispatch-test"'), 'extension output missing package name');
});

test('gate command dispatches through executable gate branch', () => {
  const project = mkProject('godpowers-cli-gate-');
  writeRel(project, '.godpowers/prd/PRD.md', CLEAN_PRD);
  const result = capture(() => cliDispatch.runCommand({
    command: 'gate',
    project,
    tier: 'prd',
    json: true
  }));
  assert(result.value === true, 'gate did not dispatch');
  const payload = JSON.parse(result.output);
  assert(payload.tier === 'prd', `tier: ${payload.tier}`);
  assert(payload.verdict === 'pass', `verdict: ${payload.verdict}`);
});

test('gate CLI exits zero for passing JSON gate', () => {
  const project = mkProject('godpowers-cli-gate-pass-');
  writeRel(project, '.godpowers/prd/PRD.md', CLEAN_PRD);
  const result = spawnSync(process.execPath, [
    path.join(__dirname, '..', 'bin', 'install.js'),
    'gate',
    '--tier=prd',
    '--project',
    project,
    '--json'
  ], { encoding: 'utf8' });
  assert(result.status === 0, `exit: ${result.status}\n${result.stderr}`);
  const payload = JSON.parse(result.stdout);
  assert(payload.verdict === 'pass', `verdict: ${payload.verdict}`);
  assert(Array.isArray(payload.checks), 'checks missing from JSON output');
});

test('gate CLI exits nonzero for failing JSON gate', () => {
  const project = mkProject('godpowers-cli-gate-fail-');
  const result = spawnSync(process.execPath, [
    path.join(__dirname, '..', 'bin', 'install.js'),
    'gate',
    '--tier=roadmap',
    '--project',
    project,
    '--json'
  ], { encoding: 'utf8' });
  assert(result.status !== 0, 'failing gate should exit nonzero');
  const payload = JSON.parse(result.stdout);
  assert(payload.verdict === 'fail', `verdict: ${payload.verdict}`);
  assert(payload.summary.failed > 0, `failed: ${payload.summary.failed}`);
});

test('unknown command returns false', () => {
  const result = capture(() => cliDispatch.runCommand({ command: 'unknown' }));
  assert(result.value === false, 'unknown command should not dispatch');
});

report('CLI dispatch tests');
