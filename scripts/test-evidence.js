#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const evidence = require('../lib/evidence');
const state = require('../lib/state');
const stateLock = require('../lib/state-lock');
const events = require('../lib/events');
const sync = require('./sync-evidence-engine');
const { test, assert, mkProject, report } = require('./test-harness');

function ledgerRecords(project) {
  const file = path.join(project, '.godpowers', 'ledger', 'verifications.jsonl');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function buildCommands(project) {
  const current = state.read(project);
  const build = current.tiers['tier-2'].build;
  return (build.verification && build.verification.commands) || [];
}

function latestRunEvents(project) {
  const runs = events.listRuns(project);
  if (runs.length === 0) return { runId: null, events: [] };
  const runId = runs[runs.length - 1];
  return { runId, events: events.readRun(project, runId) };
}

// ---------------------------------------------------------------------------
// evidence.verify: passing executed verification
// ---------------------------------------------------------------------------

test('verify records an executed pass: ledger + rollup + gate.pass event', () => {
  const project = mkProject('godpowers-evidence-pass-');
  state.init(project, 'evidence-pass');

  const result = evidence.verify('true', {
    substep: 'tier-2.build',
    claim: 'smoke',
    projectRoot: project
  });

  assert(result.verified === true, 'true should verify');
  assert(result.record.kind === 'executed', `kind: ${result.record.kind}`);
  assert(result.record.exit_code === 0, `exit_code: ${result.record.exit_code}`);
  assert(result.record.claim === 'smoke', `claim: ${result.record.claim}`);
  assert(result.record.substep === 'tier-2.build', `substep: ${result.record.substep}`);
  assert(result.record.substep_status === 'pending', `substep_status: ${result.record.substep_status}`);

  const records = ledgerRecords(project);
  assert(records.length === 1, `ledger records: ${records.length}`);
  assert(records[0].command === 'true', 'ledger command mismatch');
  assert(typeof records[0].stdout_tail === 'string', 'stdout_tail missing');

  const commands = buildCommands(project);
  assert(commands.length === 1, `rollup commands: ${commands.length}`);
  assert(commands[0].command === 'true', 'rollup command mismatch');
  assert(commands[0].status === 'pass', `rollup status: ${commands[0].status}`);
  assert(commands[0].exitCode === 0, `rollup exitCode: ${commands[0].exitCode}`);
  assert(typeof commands[0].ranAt === 'string', 'rollup ranAt missing');
  assert(Number.isInteger(commands[0].durationMs) && commands[0].durationMs >= 0, `durationMs: ${commands[0].durationMs}`);
  assert(commands[0].diagnostics === '', 'pass diagnostics should be empty');

  assert(result.rollup.applied === true, `rollup applied: ${result.rollup.reason}`);

  const run = latestRunEvents(project);
  const gatePass = run.events.find((e) => e.name === 'gate.pass');
  assert(gatePass, 'gate.pass event missing');
  assert(gatePass.attrs.substep === 'tier-2.build', 'event substep mismatch');
  assert(gatePass.attrs.tier === 'tier-2', `event tier: ${gatePass.attrs.tier}`);
  assert(events.verifyChain(events.eventsPath(project, run.runId)).valid, 'event chain broke');

  const log = path.join(project, '.godpowers', 'ledger', 'LEDGER-LOG.md');
  assert(fs.existsSync(log), 'LEDGER-LOG.md missing');
  assert(fs.readFileSync(log, 'utf8').includes('verify PASS'), 'log missing PASS line');
});

// ---------------------------------------------------------------------------
// evidence.verify: failing executed verification
// ---------------------------------------------------------------------------

test('verify records an executed fail: failed rollup entry + gate.fail event', () => {
  const project = mkProject('godpowers-evidence-fail-');
  state.init(project, 'evidence-fail');

  evidence.verify('true', { substep: 'tier-2.build', projectRoot: project });
  const result = evidence.verify('false', { substep: 'tier-2.build', projectRoot: project });

  assert(result.verified === false, 'false should not verify');
  assert(result.record.exit_code === 1, `exit_code: ${result.record.exit_code}`);

  const records = ledgerRecords(project);
  assert(records.length === 2, `ledger records: ${records.length}`);

  const commands = buildCommands(project);
  assert(commands.length === 2, `rollup commands: ${commands.length}`);
  const failed = commands.find((c) => c.command === 'false');
  assert(failed && failed.status === 'fail', 'false should roll up as fail');
  assert(failed.diagnostics.length > 0, 'fail diagnostics should be populated');

  const run = latestRunEvents(project);
  const names = run.events.map((e) => e.name);
  assert(names.includes('gate.pass'), 'expected the earlier gate.pass');
  assert(names.includes('gate.fail'), 'expected a gate.fail');
  assert(events.verifyChain(events.eventsPath(project, run.runId)).valid, 'event chain broke after fail');
});

// ---------------------------------------------------------------------------
// Rollup keeps the latest verdict per command string
// ---------------------------------------------------------------------------

test('verify rolls up the latest verdict per command string', () => {
  const project = mkProject('godpowers-evidence-latest-');
  state.init(project, 'evidence-latest');

  evidence.verify('true', { substep: 'tier-2.build', projectRoot: project });
  evidence.verify('true', { substep: 'tier-2.build', projectRoot: project });
  let commands = buildCommands(project);
  assert(commands.length === 1, `same command should not duplicate: ${commands.length}`);

  evidence.verify('false', { substep: 'tier-2.build', projectRoot: project });
  commands = buildCommands(project);
  assert(commands.length === 2, `distinct commands tracked separately: ${commands.length}`);
});

// ---------------------------------------------------------------------------
// gate.js consumes the rollup
// ---------------------------------------------------------------------------

test('gate build evidence reads the verify rollup', () => {
  const gate = require('../lib/gate');
  const project = mkProject('godpowers-evidence-gate-');
  state.init(project, 'evidence-gate');

  let result = gate.check({ tier: 'build', projectRoot: project });
  const before = result.findings.find((f) => f.id === 'build-verification-evidence');
  assert(before, 'build gate should demand evidence before any verify');

  evidence.verify('true', { substep: 'tier-2.build', claim: 'tests', projectRoot: project });
  result = gate.check({ tier: 'build', projectRoot: project });
  const evidenceCheck = result.checks.find((c) => c.id === 'build-verification-evidence');
  assert(evidenceCheck && evidenceCheck.status === 'pass', 'build evidence check should pass after verify');
  assert(Array.isArray(result.summary.buildVerificationCommands), 'gate should report passed commands');
  assert(result.summary.buildVerificationCommands.includes('true'), 'gate missing the verified command');
});

// ---------------------------------------------------------------------------
// verify without a substep still records the ledger and emits, but does not roll up
// ---------------------------------------------------------------------------

test('verify without substep records the ledger but skips the rollup', () => {
  const project = mkProject('godpowers-evidence-nosub-');
  state.init(project, 'evidence-nosub');

  const result = evidence.verify('true', { projectRoot: project });
  assert(result.verified === true, 'should still verify');
  assert(result.rollup.applied === false, 'rollup should be skipped');
  assert(result.rollup.reason === 'no-substep', `reason: ${result.rollup.reason}`);
  assert(ledgerRecords(project).length === 1, 'ledger should still record');
  const run = latestRunEvents(project);
  assert(run.events.some((e) => e.name === 'gate.pass'), 'event should still emit');
});

// ---------------------------------------------------------------------------
// verify in a project without state.json
// ---------------------------------------------------------------------------

test('verify in a project with no state records the ledger and emits only', () => {
  const project = mkProject('godpowers-evidence-nostate-');
  assert(state.read(project) === null, 'precondition: no state.json');

  const result = evidence.verify('true', { substep: 'tier-2.build', projectRoot: project });
  assert(result.rollup.applied === false, 'rollup should not apply without state');
  assert(result.rollup.reason === 'no-state', `reason: ${result.rollup.reason}`);
  assert(ledgerRecords(project).length === 1, 'ledger should record');
  assert(result.record.substep === 'tier-2.build', 'substep token preserved without state');
  assert(result.record.substep_status === null, 'substep_status null without state');
  const run = latestRunEvents(project);
  assert(run.events.some((e) => e.name === 'gate.pass'), 'event should still emit');
});

// ---------------------------------------------------------------------------
// verify attaches the event to an existing run rather than starting a new one
// ---------------------------------------------------------------------------

test('verify appends the gate event to the latest existing run', () => {
  const project = mkProject('godpowers-evidence-run-');
  state.init(project, 'evidence-run');
  const handle = events.startRun(project, { workflow: 'full-arc' });

  evidence.verify('true', { substep: 'tier-2.build', projectRoot: project });

  const runs = events.listRuns(project);
  assert(runs.length === 1, `expected to reuse the run, got ${runs.length}`);
  const all = events.readRun(project, handle.runId);
  assert(all.some((e) => e.name === 'workflow.run'), 'root span lost');
  assert(all.some((e) => e.name === 'gate.pass'), 'gate.pass not appended to run');
  assert(events.verifyChain(handle.file).valid, 'reused-run chain broke');
});

// ---------------------------------------------------------------------------
// timeout handling
// ---------------------------------------------------------------------------

test('verify marks a timed-out command unverified with exit -1', () => {
  const project = mkProject('godpowers-evidence-timeout-');
  state.init(project, 'evidence-timeout');

  const result = evidence.verify('sleep 2', { substep: 'tier-2.build', timeout: 0.3, projectRoot: project });
  assert(result.verified === false, 'timeout should not verify');
  assert(result.record.exit_code === -1, `exit_code: ${result.record.exit_code}`);
  assert(/timed out/.test(result.record.stderr_tail), 'stderr should note the timeout');
  const run = latestRunEvents(project);
  assert(run.events.some((e) => e.name === 'gate.fail'), 'timeout should emit gate.fail');
});

// ---------------------------------------------------------------------------
// verifyClaim: attested, never rolled up, never emitted
// ---------------------------------------------------------------------------

test('verifyClaim records a second-class attested record', () => {
  const project = mkProject('godpowers-evidence-attest-');
  state.init(project, 'evidence-attest');

  const result = evidence.verifyClaim('PRD rationale is sound', 'reviewed by PM', {
    substep: 'tier-1.prd',
    projectRoot: project
  });
  assert(result.verified === null, 'attested verified must be null');
  assert(result.record.kind === 'attested', `kind: ${result.record.kind}`);
  assert(result.record.evidence === 'reviewed by PM', 'evidence not recorded');

  const records = ledgerRecords(project);
  assert(records.length === 1 && records[0].kind === 'attested', 'attested record not in ledger');

  const current = state.read(project);
  const prd = current.tiers['tier-1'].prd;
  assert(!prd.verification, 'attested record must not roll up into state.json');

  assert(events.listRuns(project).length === 0, 'attested record must not emit a gate event');
});

test('verify and verifyClaim reject empty input', () => {
  const project = mkProject('godpowers-evidence-empty-');
  state.init(project, 'evidence-empty');
  let threw = false;
  try { evidence.verify('   ', { substep: 'tier-2.build', projectRoot: project }); } catch (_) { threw = true; }
  assert(threw, 'empty command should throw');
  threw = false;
  try { evidence.verifyClaim('', 'x', { projectRoot: project }); } catch (_) { threw = true; }
  assert(threw, 'empty claim should throw');
});

// ---------------------------------------------------------------------------
// history
// ---------------------------------------------------------------------------

test('history filters by substep and limits to recent', () => {
  const project = mkProject('godpowers-evidence-history-');
  state.init(project, 'evidence-history');

  evidence.verify('true', { substep: 'tier-2.build', projectRoot: project });
  evidence.verify('false', { substep: 'tier-2.build', projectRoot: project });
  evidence.verifyClaim('prd ok', 'note', { substep: 'tier-1.prd', projectRoot: project });

  const all = evidence.history({ projectRoot: project });
  assert(all.length === 3, `history all: ${all.length}`);

  const build = evidence.history({ substep: 'tier-2.build', projectRoot: project });
  assert(build.length === 2, `history build: ${build.length}`);
  assert(build.every((r) => r.substep === 'tier-2.build'), 'history substep filter leaked');

  const recent = evidence.history({ substep: 'tier-2.build', recent: 1, projectRoot: project });
  assert(recent.length === 1 && recent[0].command === 'false', 'recent should be the last record');
});

// ---------------------------------------------------------------------------
// rollup is robust to a held state lock
// ---------------------------------------------------------------------------

test('verify still records when the state lock is held by another holder', () => {
  const project = mkProject('godpowers-evidence-lock-');
  state.init(project, 'evidence-lock');

  const acquired = stateLock.acquire(project, { holder: 'someone-else', scope: 'all' });
  assert(acquired.acquired, 'precondition: foreign lock acquired');

  const result = evidence.verify('true', { substep: 'tier-2.build', projectRoot: project });
  assert(result.rollup.applied === false, 'rollup should defer under a held lock');
  assert(result.rollup.reason === 'lock-unavailable', `reason: ${result.rollup.reason}`);
  assert(ledgerRecords(project).length === 1, 'ledger should still record under a held lock');

  stateLock.release(project, 'someone-else');
});

// ---------------------------------------------------------------------------
// provenance + internals
// ---------------------------------------------------------------------------

test('provenance is recorded and points at the upstream engine', () => {
  const prov = evidence.provenance();
  assert(prov && prov.version === '3.6.3', `version: ${prov && prov.version}`);
  assert(prov.commit && prov.commit.length >= 7, 'commit missing');
  assert(Array.isArray(prov.adaptations) && prov.adaptations.length > 0, 'adaptations missing');
  assert(prov.upstreamRecordShape && Array.isArray(prov.upstreamRecordShape.executed), 'recorded shape missing');
});

test('toStateCommand maps the Mythify record to the gate shape', () => {
  const passed = evidence._toStateCommand({ command: 'npm test', verified: true, exit_code: 0, timestamp: 'T', duration_seconds: 12.4 });
  assert(passed.status === 'pass' && passed.exitCode === 0 && passed.durationMs === 12400 && passed.diagnostics === '', 'pass mapping wrong');
  const failed = evidence._toStateCommand({ command: 'npm test', verified: false, exit_code: 2, timestamp: 'T', duration_seconds: 0.001, stderr_tail: 'boom' });
  assert(failed.status === 'fail' && failed.exitCode === 2 && failed.durationMs >= 0, 'fail mapping wrong');
  assert(failed.diagnostics.includes('boom'), 'fail diagnostics should carry stderr');
});

// ---------------------------------------------------------------------------
// sync-evidence-engine pure helpers
// ---------------------------------------------------------------------------

const UPSTREAM_FIXTURE = [
  'const VERSION = "9.9.9";',
  'function verificationStepContext() {',
  '  return {',
  '    plan: null,',
  '    step_id: null,',
  '    step_title: null,',
  '    step_status: null,',
  '  };',
  '}',
  'function run() {',
  '  const record = {',
  '    kind: "executed",',
  '    claim: claim,',
  '    command,',
  '    exit_code: exitCode,',
  '    duration_seconds: Number(durationSeconds.toFixed(3)),',
  '    stdout_tail: stdoutTail,',
  '    stderr_tail: stderrTail,',
  '    verified,',
  '    timestamp: isoNow(),',
  '    ...verificationStepContext(),',
  '  };',
  '  appendJsonl(verificationsPath(), record);',
  '}',
  'function claim() {',
  '  const record = {',
  '    kind: "attested",',
  '    claim,',
  '    evidence,',
  '    verified: null,',
  '    timestamp: isoNow(),',
  '    ...verificationStepContext(),',
  '  };',
  '  appendJsonl(verificationsPath(), record);',
  '}'
].join('\n');

test('extractRecordShape reads executed and attested record keys', () => {
  const shape = sync.extractRecordShape(UPSTREAM_FIXTURE);
  assert(JSON.stringify(shape.executed) === JSON.stringify([
    'kind', 'claim', 'command', 'exit_code', 'duration_seconds',
    'stdout_tail', 'stderr_tail', 'verified', 'timestamp',
    'plan', 'step_id', 'step_title', 'step_status'
  ]), `executed shape: ${JSON.stringify(shape.executed)}`);
  assert(JSON.stringify(shape.attested) === JSON.stringify([
    'kind', 'claim', 'evidence', 'verified', 'timestamp',
    'plan', 'step_id', 'step_title', 'step_status'
  ]), `attested shape: ${JSON.stringify(shape.attested)}`);
});

test('extractRecordShape matches the recorded provenance shape', () => {
  const prov = evidence.provenance();
  const shape = sync.extractRecordShape(UPSTREAM_FIXTURE);
  assert(JSON.stringify(shape.executed) === JSON.stringify(prov.upstreamRecordShape.executed),
    'recorded executed shape drifted from the fixture-shaped record');
  assert(JSON.stringify(shape.attested) === JSON.stringify(prov.upstreamRecordShape.attested),
    'recorded attested shape drifted from the fixture-shaped record');
});

test('diffShapes detects added and removed keys', () => {
  const same = sync.diffShapes(['a', 'b'], ['a', 'b']);
  assert(!same.changed, 'identical shapes should not be flagged');
  const drift = sync.diffShapes(['a', 'b'], ['a', 'c']);
  assert(drift.changed && drift.added.includes('c') && drift.removed.includes('b'), 'diff did not flag drift');
});

test('checkLocalAdaptations passes on the vendored module', () => {
  const localSource = fs.readFileSync(path.join(__dirname, '..', 'lib', 'evidence.js'), 'utf8');
  assert(sync.checkLocalAdaptations(localSource).length === 0, 'vendored module should satisfy adaptations');
  const broken = sync.checkLocalAdaptations('writes under .mythify/ only');
  assert(broken.length > 0, 'a .mythify/ reference should be flagged');
});

test('buildReport flags no drift when the upstream fixture matches the recorded shape', () => {
  const project = mkProject('godpowers-evidence-sync-');
  const upstream = path.join(project, 'index.js');
  fs.writeFileSync(upstream, UPSTREAM_FIXTURE);
  const { report: r } = sync.buildReport({ source: upstream });
  assert(r.upstreamFound === true, 'fixture upstream should be found');
  assert(r.shapeChanged === false, 'matching fixture should not flag a shape change');
  assert(r.adaptationProblems.length === 0, 'adaptations should hold');
  assert(r.ok === true, 'report should be in sync');
  assert(typeof sync.renderReport(r) === 'string', 'renderReport should produce text');
});

test('buildReport flags drift when the upstream fixture adds a key', () => {
  const project = mkProject('godpowers-evidence-sync-drift-');
  const upstream = path.join(project, 'index.js');
  fs.writeFileSync(upstream, UPSTREAM_FIXTURE.replace('    verified,', '    verified,\n    new_field: 1,'));
  const { report: r } = sync.buildReport({ source: upstream });
  assert(r.shapeChanged === true, 'added key should flag a shape change');
  assert(r.shapeDiff.executed.added.includes('new_field'), 'diff should name the new key');
  assert(r.ok === false, 'report should not be in sync after drift');
});

report('Evidence engine tests');
