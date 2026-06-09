#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const installer = require('../bin/install');
const { COMMANDS } = require('../lib/installer-args');
const { test, assert, mkProject, report } = require('./test-harness');

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
    assert(typeof installer.COMMAND_RUNNERS[command] === 'function', `${command} missing dispatch runner`);
  }
});

test('status and next commands dispatch through the dashboard branch', () => {
  const project = mkProject('godpowers-cli-dispatch-');
  for (const command of ['status', 'next']) {
    const result = capture(() => installer.runCommand({
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
  const result = capture(() => installer.runCommand({
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
    const result = capture(() => installer.runCommand({
      command,
      project,
      json: true
    }));
    assert(result.value === true, `${command} did not dispatch`);
    assert(result.output.includes('{'), `${command} did not emit JSON`);
  }
});

test('dogfood command dispatches through dogfood branch', () => {
  const result = capture(() => installer.runCommand({
    command: 'dogfood',
    json: true
  }));
  assert(result.value === true, 'dogfood did not dispatch');
  assert(result.output.includes('"status"'), 'dogfood output missing status');
});

test('extension-scaffold command dispatches through scaffold branch', () => {
  const output = mkProject('godpowers-cli-extension-');
  const result = capture(() => installer.runCommand({
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

test('unknown command returns false', () => {
  const result = capture(() => installer.runCommand({ command: 'unknown' }));
  assert(result.value === false, 'unknown command should not dispatch');
});

report('CLI dispatch tests');
