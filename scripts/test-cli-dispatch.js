#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const installer = require('../bin/install');
const cliDispatch = require('../lib/cli-dispatch');
const state = require('../lib/state');
const { COMMANDS, parseArgs } = require('../lib/installer-args');
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

function captureWithExit(fn) {
  const originalExit = process.exit;
  let exitCode = null;
  process.exit = (code) => {
    exitCode = code;
    throw new Error(`process.exit:${code}`);
  };
  try {
    const result = capture(fn);
    return { ...result, exitCode };
  } catch (e) {
    return { value: null, output: e.message, exitCode };
  } finally {
    process.exit = originalExit;
  }
}

test('CLI dispatch table covers every parsed subcommand', () => {
  for (const command of COMMANDS) {
    assert(typeof installer.COMMAND_RUNNERS[command] === 'function', `${command} missing dispatch runner`);
    assert(typeof cliDispatch.COMMAND_RUNNERS[command] === 'function', `${command} missing lib dispatch runner`);
  }
});

test('installer re-exports lib CLI dispatch table', () => {
  assert(installer.COMMAND_RUNNERS === cliDispatch.COMMAND_RUNNERS, 'installer should re-export dispatch table');
  assert(installer.runCommand === cliDispatch.runCommand, 'installer should re-export runCommand');
});

test('parseArgs accepts state advance mutation options', () => {
  const parsed = parseArgs([
    'node',
    'bin',
    'state',
    'advance',
    '--step=prd',
    '--status=done',
    '--project=.'
  ], process.cwd());
  assert(parsed.command === 'state', `command: ${parsed.command}`);
  assert(parsed.stateAction === 'advance', `stateAction: ${parsed.stateAction}`);
  assert(parsed.step === 'prd', `step: ${parsed.step}`);
  assert(parsed.status === 'done', `status: ${parsed.status}`);
});

test('parseArgs accepts surface profile options', () => {
  const parsed = parseArgs([
    'node',
    'bin',
    'surface',
    '--profile=builder',
    '--runtime=codex',
    '--dry-run',
    '--project=.'
  ], process.cwd());
  assert(parsed.command === 'surface', `command: ${parsed.command}`);
  assert(parsed.profile === 'builder', `profile: ${parsed.profile}`);
  assert(parsed.runtimes.includes('codex'), `runtimes: ${parsed.runtimes.join(',')}`);
  assert(parsed.dryRun === true, 'dryRun flag missing');
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

test('next command renders text suggestion through dashboard branch', () => {
  const project = mkProject('godpowers-cli-next-text-');
  const result = capture(() => cliDispatch.runCommand({
    command: 'next',
    project,
    json: false,
    brief: true
  }));
  assert(result.value === true, 'next text did not dispatch');
  assert(result.output.includes('Suggested next command:'), 'next text output missing suggestion');
});

test('demo command dispatches through quick proof branch', () => {
  const project = mkProject('godpowers-cli-demo-');
  const result = capture(() => installer.runCommand({
    command: 'demo',
    project,
    json: false
  }));
  assert(result.value === true, 'demo did not dispatch');
  assert(result.output.includes('Godpowers Quick Proof'), 'demo output missing proof title');
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

test('mcp-info command dispatches through read-only info branch', () => {
  const project = mkProject('godpowers-cli-mcp-info-');
  const result = capture(() => installer.runCommand({
    command: 'mcp-info',
    project,
    json: false
  }));
  assert(result.value === true, 'mcp-info did not dispatch');
  assert(result.output.includes('Godpowers MCP'), 'mcp-info output missing title');
  assert(result.output.includes('@godpowers/mcp'), 'mcp-info output missing package');
  assert(result.output.includes('Automatic registration: disabled'), 'mcp-info output should stay read-only');
});

test('mcp-info command emits JSON setup details', () => {
  const project = mkProject('godpowers-cli-mcp-info-json-');
  const result = capture(() => cliDispatch.runCommand({
    command: 'mcp-info',
    project,
    json: true
  }));
  const parsed = JSON.parse(result.output);
  assert(result.value === true, 'mcp-info JSON did not dispatch');
  assert(parsed.package === '@godpowers/mcp', `package: ${parsed.package}`);
  assert(parsed.automaticRegistration === false, 'mcp-info should not auto-register');
});

test('state advance command dispatches through state branch', () => {
  const project = mkProject('godpowers-cli-state-');
  state.init(project, 'cli-state-demo');
  const result = capture(() => cliDispatch.runCommand({
    command: 'state',
    stateAction: 'advance',
    project,
    step: 'prd',
    status: 'done',
    json: true
  }));
  const parsed = JSON.parse(result.output);
  const current = state.read(project);

  assert(result.value === true, 'state advance did not dispatch');
  assert(parsed.verdict === 'pass', `verdict: ${parsed.verdict}`);
  assert(parsed.step.subStepKey === 'prd', `subStepKey: ${parsed.step.subStepKey}`);
  assert(current.tiers['tier-1'].prd.status === 'done', 'state was not advanced');
});

test('state command rejects missing action', () => {
  process.exitCode = 0;
  const project = mkProject('godpowers-cli-state-missing-');
  state.init(project, 'cli-state-missing-demo');
  const result = capture(() => cliDispatch.runCommand({
    command: 'state',
    project,
    step: 'prd',
    status: 'done',
    json: false
  }));

  assert(result.value === true, 'state missing action did not dispatch');
  assert(result.output.includes('state requires subcommand advance'), `output: ${result.output}`);
  assert(process.exitCode === 1, `exitCode: ${process.exitCode}`);
  process.exitCode = 0;
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

test('automation commands render text reports', () => {
  const project = mkProject('godpowers-cli-automation-text-');
  for (const command of ['automation-status', 'automation-setup']) {
    const result = capture(() => cliDispatch.runCommand({
      command,
      project,
      json: false
    }));
    assert(result.value === true, `${command} text did not dispatch`);
    assert(result.output.trim().length > 0, `${command} text output missing`);
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

test('dogfood command renders text report', () => {
  const result = capture(() => cliDispatch.runCommand({
    command: 'dogfood',
    json: false
  }));
  assert(result.value === true, 'dogfood text did not dispatch');
  assert(result.output.includes('Dogfood'), 'dogfood text output missing title');
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

test('extension-scaffold command renders text branch', () => {
  const output = mkProject('godpowers-cli-extension-text-');
  const result = capture(() => cliDispatch.runCommand({
    command: 'extension-scaffold',
    extensionName: '@godpowers/dispatch-text-test',
    extensionOutput: output,
    extensionSkill: 'god-dispatch-text-test',
    extensionAgent: 'god-dispatch-text-agent',
    extensionWorkflow: 'dispatch-text-workflow',
    json: false
  }));
  assert(result.value === true, 'extension-scaffold text did not dispatch');
  assert(result.output.includes('Scaffolded @godpowers/dispatch-text-test'), 'extension text output missing scaffold message');
  assert(result.output.includes('Extension manifest validates'), 'extension text output missing validation message');
});

test('extension-scaffold exits when name is missing', () => {
  const result = captureWithExit(() => cliDispatch.runCommand({
    command: 'extension-scaffold',
    extensionOutput: mkProject('godpowers-cli-extension-missing-')
  }));
  assert(result.exitCode === 1, `expected exit code 1, got ${result.exitCode}`);
});

test('gate command dispatches through gate branch', () => {
  const project = mkProject('godpowers-cli-gate-');
  fs.mkdirSync(path.join(project, '.godpowers', 'stack'), { recursive: true });
  fs.writeFileSync(path.join(project, '.godpowers', 'stack', 'DECISION.md'), [
    '# Stack Decision',
    '',
    '[DECISION] The dispatch test uses Node.js so the gate runner has a lint-clean artifact.'
  ].join('\n'));
  const result = capture(() => cliDispatch.runCommand({
    command: 'gate',
    project,
    tier: 'stack',
    json: true
  }));
  assert(result.value === true, 'gate did not dispatch');
  assert(result.output.includes('"verdict": "pass"'), 'gate output missing pass verdict');
});

test('gate command renders text and missing-tier branches', () => {
  const project = mkProject('godpowers-cli-gate-text-');
  fs.mkdirSync(path.join(project, '.godpowers', 'stack'), { recursive: true });
  fs.writeFileSync(path.join(project, '.godpowers', 'stack', 'DECISION.md'), [
    '# Stack Decision',
    '',
    '[DECISION] The dispatch text test uses Node.js for a passing gate.'
  ].join('\n'));
  const text = capture(() => cliDispatch.runCommand({
    command: 'gate',
    project,
    tier: 'stack',
    json: false
  }));
  assert(text.value === true, 'gate text did not dispatch');
  assert(text.output.includes('Verdict: pass'), 'gate text output missing pass verdict');

  process.exitCode = 0;
  const missing = capture(() => cliDispatch.runCommand({
    command: 'gate',
    project,
    json: false
  }));
  assert(missing.value === true, 'gate missing tier did not dispatch');
  assert(missing.output.includes('gate requires --tier=<name>'), 'missing tier output absent');
  assert(process.exitCode === 1, `missing tier should set exitCode, got ${process.exitCode}`);
  process.exitCode = 0;
});

test('parseArgs accepts verify options', () => {
  const parsed = parseArgs([
    'node',
    'bin',
    'verify',
    'npm test',
    '--substep=tier-2.build',
    '--claim=tests pass',
    '--timeout=120',
    '--project=.'
  ], process.cwd());
  assert(parsed.command === 'verify', `command: ${parsed.command}`);
  assert(parsed.verifyCommand === 'npm test', `verifyCommand: ${parsed.verifyCommand}`);
  assert(parsed.substep === 'tier-2.build', `substep: ${parsed.substep}`);
  assert(parsed.claim === 'tests pass', `claim: ${parsed.claim}`);
  assert(parsed.timeout === '120', `timeout: ${parsed.timeout}`);
});

test('parseArgs accepts verify attest options with spaced flags', () => {
  const parsed = parseArgs([
    'node',
    'bin',
    'verify',
    '--attest',
    '--claim',
    'rationale holds',
    '--evidence',
    'reviewed',
    '--substep',
    'tier-1.prd'
  ], process.cwd());
  assert(parsed.command === 'verify', `command: ${parsed.command}`);
  assert(parsed.attest === true, 'attest flag missing');
  assert(parsed.claim === 'rationale holds', `claim: ${parsed.claim}`);
  assert(parsed.evidence === 'reviewed', `evidence: ${parsed.evidence}`);
  assert(parsed.substep === 'tier-1.prd', `substep: ${parsed.substep}`);
});

test('verify command dispatches an executed pass through evidence', () => {
  const project = mkProject('godpowers-cli-verify-pass-');
  state.init(project, 'cli-verify-pass');
  const result = capture(() => cliDispatch.runCommand({
    command: 'verify',
    project,
    verifyCommand: 'true',
    substep: 'tier-2.build',
    claim: 'smoke',
    json: true
  }));
  const parsed = JSON.parse(result.output);
  assert(result.value === true, 'verify did not dispatch');
  assert(parsed.verdict === 'pass', `verdict: ${parsed.verdict}`);
  assert(parsed.kind === 'executed', `kind: ${parsed.kind}`);
  assert(parsed.rollup.applied === true, 'rollup should apply');
  assert(parsed.event.name === 'gate.pass', `event: ${parsed.event.name}`);
  const commands = state.read(project).tiers['tier-2'].build.verification.commands;
  assert(commands[0].status === 'pass', 'rollup status not pass');
});

test('verify command renders text and sets exit code on failure', () => {
  process.exitCode = 0;
  const project = mkProject('godpowers-cli-verify-fail-');
  state.init(project, 'cli-verify-fail');
  const result = capture(() => cliDispatch.runCommand({
    command: 'verify',
    project,
    verifyCommand: 'false',
    substep: 'tier-2.build',
    json: false
  }));
  assert(result.value === true, 'verify fail did not dispatch');
  assert(result.output.includes('Verdict: fail'), `output: ${result.output}`);
  assert(result.output.includes('gate.fail'), 'text output missing gate.fail');
  assert(process.exitCode === 1, `exitCode: ${process.exitCode}`);
  process.exitCode = 0;
});

test('verify command rejects a missing command and missing substep', () => {
  process.exitCode = 0;
  const project = mkProject('godpowers-cli-verify-missing-');
  state.init(project, 'cli-verify-missing');
  const noCommand = capture(() => cliDispatch.runCommand({ command: 'verify', project, json: false }));
  assert(noCommand.output.includes('verify requires a command'), `output: ${noCommand.output}`);
  assert(process.exitCode === 1, 'missing command should set exit code');

  process.exitCode = 0;
  const noSubstep = capture(() => cliDispatch.runCommand({
    command: 'verify',
    project,
    verifyCommand: 'true',
    json: false
  }));
  assert(noSubstep.output.includes('verify requires --substep'), `output: ${noSubstep.output}`);
  assert(process.exitCode === 1, 'missing substep should set exit code');
  process.exitCode = 0;
});

test('verify --attest records an attested claim through evidence', () => {
  const project = mkProject('godpowers-cli-verify-attest-');
  state.init(project, 'cli-verify-attest');
  const result = capture(() => cliDispatch.runCommand({
    command: 'verify',
    project,
    attest: true,
    claim: 'launch copy approved',
    evidence: 'sign-off recorded',
    substep: 'tier-3.launch',
    json: true
  }));
  const parsed = JSON.parse(result.output);
  assert(result.value === true, 'verify attest did not dispatch');
  assert(parsed.kind === 'attested', `kind: ${parsed.kind}`);
  assert(parsed.verified === null, 'attested verified should be null');
  assert(parsed.record.kind === 'attested', 'attested ledger record missing');

  const attestMissingClaim = capture(() => cliDispatch.runCommand({
    command: 'verify',
    project,
    attest: true,
    json: false
  }));
  assert(attestMissingClaim.output.includes('--attest requires --claim'), `output: ${attestMissingClaim.output}`);
  process.exitCode = 0;
});

test('can-close command reports verdict and exit code through evidence', () => {
  process.exitCode = 0;
  const project = mkProject('godpowers-cli-canclose-');
  state.init(project, 'cli-canclose');

  // No evidence yet -> cannot close, exit 1.
  const blocked = capture(() => cliDispatch.runCommand({
    command: 'can-close',
    project,
    substep: 'tier-2.build',
    json: true
  }));
  const blockedResult = JSON.parse(blocked.output);
  assert(blocked.value === true, 'can-close did not dispatch');
  assert(blockedResult.canClose === false, 'should not close without evidence');
  assert(process.exitCode === 1, `blocked exit code: ${process.exitCode}`);

  // Record a pass, then it can close, exit 0.
  process.exitCode = 0;
  require('../lib/evidence').verify('true', { substep: 'tier-2.build', projectRoot: project });
  const ok = capture(() => cliDispatch.runCommand({
    command: 'can-close',
    project,
    substep: 'tier-2.build',
    json: false
  }));
  assert(ok.output.includes('Can close: yes'), `text output: ${ok.output}`);
  assert(process.exitCode === 0, `ok exit code: ${process.exitCode}`);
  process.exitCode = 0;
});

test('can-close command requires a substep', () => {
  process.exitCode = 0;
  const project = mkProject('godpowers-cli-canclose-missing-');
  state.init(project, 'cli-canclose-missing');
  const result = capture(() => cliDispatch.runCommand({ command: 'can-close', project, json: false }));
  assert(result.value === true, 'can-close missing substep did not dispatch');
  assert(result.output.includes('can-close requires --substep'), `output: ${result.output}`);
  assert(process.exitCode === 1, `exit code: ${process.exitCode}`);
  process.exitCode = 0;
});

test('unknown command returns false', () => {
  const result = capture(() => cliDispatch.runCommand({ command: 'unknown' }));
  assert(result.value === false, 'unknown command should not dispatch');
});

report('CLI dispatch tests');
