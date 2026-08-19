#!/usr/bin/env node
// Implements: P-MUST-49
/**
 * Tests for the machine-readable route invocation policy contract.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { parseSimpleYaml } = require('../lib/intent');
const invocationPolicy = require('../lib/invocation-policy');
const { test, report } = require('./test-harness');

const projectRoot = path.resolve(__dirname, '..');

console.log('\n  Invocation policy tests\n');

test('P-MUST-49: routing schema requires the closed invocation policy enum', () => {
  const schema = JSON.parse(fs.readFileSync(path.join(projectRoot, 'schema/routing.v1.json'), 'utf8'));
  const metadata = schema.properties.metadata;
  assert(metadata.required.includes('invocation-policy'));
  assert.deepEqual(metadata.properties['invocation-policy'].enum, [
    'explicit-only',
    'suggestible',
    'auto-local',
    'auto-bounded',
    'approval-required'
  ]);
});

test('P-MUST-49: autonomous and party modes remain explicit only', () => {
  assert.equal(invocationPolicy.expectedPolicy('/god-mode'), 'explicit-only');
  assert.equal(invocationPolicy.expectedPolicy('/god-party'), 'explicit-only');
});

test('P-MUST-49: documented local and bounded automation has narrow policies', () => {
  for (const command of [
    '/god-next',
    '/god-status',
    '/god-progress',
    '/god-context-scan',
    '/god-automation-status'
  ]) {
    assert.equal(invocationPolicy.expectedPolicy(command), 'auto-local', command);
  }
  for (const command of [
    '/god-context',
    '/god-design',
    '/god-docs',
    '/god-harden',
    '/god-preflight',
    '/god-reconcile',
    '/god-scan',
    '/god-sync',
    '/god-test-runtime'
  ]) {
    assert.equal(invocationPolicy.expectedPolicy(command), 'auto-bounded', command);
  }
});

test('P-MUST-49: external, destructive, dependency, recovery, and release actions require approval', () => {
  for (const command of [
    '/god-automation-setup',
    '/god-cache-clear',
    '/god-connect',
    '/god-deploy',
    '/god-export-otel',
    '/god-extension-add',
    '/god-extension-remove',
    '/god-launch',
    '/god-observe',
    '/god-pr-branch',
    '/god-redo',
    '/god-repair',
    '/god-restore',
    '/god-review-changes',
    '/god-rollback',
    '/god-ship',
    '/god-skip',
    '/god-smite',
    '/god-suite-release',
    '/god-undo',
    '/god-update-deps',
    '/god-upgrade'
  ]) {
    assert.equal(invocationPolicy.expectedPolicy(command), 'approval-required', command);
  }
});

test('P-MUST-49: ordinary and unknown commands are suggestible but never auto-run', () => {
  assert.equal(invocationPolicy.expectedPolicy('/god-prd'), 'suggestible');
  assert.equal(invocationPolicy.expectedPolicy('/god-feature'), 'suggestible');
  assert.equal(invocationPolicy.expectedPolicy('/god-launch-now'), 'suggestible');
  assert.equal(invocationPolicy.expectedPolicy(null), 'suggestible');
});

test('P-MUST-49: all 124 core routes declare their deterministic policy', () => {
  const routeFiles = fs.readdirSync(path.join(projectRoot, 'routing'))
    .filter((file) => /^god.*\.yaml$/.test(file));
  assert.equal(routeFiles.length, 124);
  for (const file of routeFiles) {
    const route = parseSimpleYaml(fs.readFileSync(path.join(projectRoot, 'routing', file), 'utf8'));
    const command = route.metadata && route.metadata.command;
    assert(command, `${file} has no metadata.command`);
    assert.equal(
      route.metadata['invocation-policy'],
      invocationPolicy.expectedPolicy(command),
      `${command} has the wrong invocation policy`
    );
  }
});

test('P-MUST-49: policy validator rejects close spellings and non-strings', () => {
  assert.equal(invocationPolicy.isValidPolicy('auto-local'), true);
  assert.equal(invocationPolicy.isValidPolicy('auto'), false);
  assert.equal(invocationPolicy.isValidPolicy('approval_required'), false);
  assert.equal(invocationPolicy.isValidPolicy(['suggestible']), false);
});

report();
