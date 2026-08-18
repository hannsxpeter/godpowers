#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const handoff = require('../lib/slice-handoff');
const { test, assert, mkProject, report } = require('./test-harness');

function input(overrides = {}) {
  return {
    plan: {
      goal: 'Ship a deterministic handoff',
      constraints: ['No network', 'State remains authoritative'],
      requirementIds: ['P-MUST-27'],
      status: 'planned',
      nextAction: 'Start implementation',
      criticalRefs: ['.godpowers/build/PLAN.mdx'],
      evidenceRefs: {
        goal: '.godpowers/build/PLAN.mdx#slice-2-1',
        constraints: '.godpowers/arch/ARCH.mdx#trust-boundaries',
        requirementIds: '.godpowers/prd/PRD.mdx#p-must-27'
      }
    },
    state: {
      status: 'paused',
      completedWork: ['Program design validator completed'],
      inProgressWork: ['Handoff writer verification'],
      blockers: ['Awaiting focused test result'],
      changedFiles: ['lib/program-design.js', 'lib/slice-handoff.js'],
      decisions: ['Authoritative state wins conflicts'],
      nextAction: 'Run the focused handoff test',
      evidenceRefs: {
        status: '.godpowers/state.json#/tiers/tier-2/build/status',
        blockers: '.godpowers/state.json#/tiers/tier-2/build/blockers',
        nextAction: '.godpowers/state.json#/tiers/tier-2/build/next-action'
      }
    },
    events: [{ type: 'slice.paused', ref: '.godpowers/events.jsonl#event-4' }],
    linkage: {
      requirementIds: ['P-MUST-27'],
      evidenceRefs: { changedFiles: '.godpowers/linkage/map.json#/P-MUST-27' }
    },
    verification: [
      { command: 'node scripts/test-program-design.js', status: 'pass', evidenceRef: '.godpowers/ledger/verifications.jsonl#v1' },
      { command: 'node scripts/test-slice-handoff.js', status: 'fail', evidenceRef: '.godpowers/ledger/verifications.jsonl#v2' }
    ],
    ...overrides
  };
}

test('P-MUST-27: derive preserves every mandatory field and disk evidence references', () => {
  const result = handoff.derive(input());
  for (const field of [
    'goal', 'constraints', 'requirementIds', 'status', 'completedWork', 'inProgressWork',
    'blockers', 'changedFiles', 'verificationResults', 'decisions', 'nextAction', 'criticalRefs',
    'evidenceRefs', 'warnings'
  ]) {
    assert(Object.prototype.hasOwnProperty.call(result, field), `missing ${field}`);
  }
  assert(result.requirementIds.join(',') === 'P-MUST-27', JSON.stringify(result.requirementIds));
  assert(result.verificationResults.some((entry) => entry.status === 'fail'),
    JSON.stringify(result.verificationResults));
  assert(result.evidenceRefs.goal && result.evidenceRefs.nextAction && result.evidenceRefs.changedFiles,
    JSON.stringify(result.evidenceRefs));
});

test('derive projects linkage files and event decisions when state has no value', () => {
  const source = input();
  delete source.state.changedFiles;
  delete source.state.decisions;
  source.plan.changedFiles = [];
  source.plan.decisions = [];
  source.linkage.changedFiles = ['lib/linked-file.js'];
  source.events = [{
    type: 'decision.recorded',
    decision: 'Keep state authoritative',
    ref: '.godpowers/events.jsonl#event-9'
  }];
  const result = handoff.derive(source);
  assert(result.changedFiles.includes('lib/linked-file.js'), JSON.stringify(result.changedFiles));
  assert(result.decisions.includes('Keep state authoritative'), JSON.stringify(result.decisions));
});

test('authoritative state wins plan conflicts and records stable warnings', () => {
  const conflict = input();
  conflict.state.requirementIds = ['P-MUST-27'];
  conflict.plan.requirementIds = ['P-MUST-26'];
  const first = handoff.derive(conflict);
  const second = handoff.derive(conflict);
  assert(first.status === 'paused', `state status should win: ${first.status}`);
  assert(first.nextAction === 'Run the focused handoff test', `state next action should win: ${first.nextAction}`);
  assert(first.warnings.some((warning) => warning.field === 'status' && warning.authority === 'state'),
    JSON.stringify(first.warnings));
  assert(first.warnings.some((warning) => warning.field === 'nextAction' && warning.authority === 'state'),
    JSON.stringify(first.warnings));
  assert(first.requirementIds.join(',') === 'P-MUST-27', JSON.stringify(first.requirementIds));
  assert(first.warnings.some((warning) => warning.field === 'requirementIds' && warning.authority === 'state'),
    JSON.stringify(first.warnings));
  assert(first.evidenceRefs.events.includes('.godpowers/events.jsonl#event-4'),
    JSON.stringify(first.evidenceRefs));
  assert(handoff.serialize(first) === handoff.serialize(second), 'same normalized evidence must serialize identically');
});

test('authoritative state verification wins projected verification conflicts', () => {
  const conflict = input();
  conflict.state.verificationResults = [{
    command: 'node scripts/authoritative.js',
    status: 'failed',
    evidenceRef: '.godpowers/state.json#/verification'
  }];
  const result = handoff.derive(conflict);
  assert(result.verificationResults.length === 1, JSON.stringify(result.verificationResults));
  assert(result.verificationResults[0].command === 'node scripts/authoritative.js',
    JSON.stringify(result.verificationResults));
  assert(result.warnings.some(entry => entry.field === 'verificationResults'
    && entry.authority === 'state'), JSON.stringify(result.warnings));
});

test('serialize caps UTF-8 output at 8 KiB without losing protected evidence', () => {
  const large = input();
  large.state.completedWork = Array.from({ length: 180 }, (_, index) => `Completed detail ${index} ${'x'.repeat(100)}`);
  large.state.inProgressWork = Array.from({ length: 90 }, (_, index) => `In progress ${index} ${'y'.repeat(80)}`);
  large.state.decisions = Array.from({ length: 80 }, (_, index) => `Decision ${index} ${'z'.repeat(70)}`);
  const serialized = handoff.serialize(handoff.derive(large));
  const parsed = JSON.parse(serialized);
  assert(Buffer.byteLength(serialized, 'utf8') <= 8192, `handoff is ${Buffer.byteLength(serialized, 'utf8')} bytes`);
  assert(parsed.requirementIds.includes('P-MUST-27'), 'requirement id was trimmed');
  assert(parsed.blockers.includes('Awaiting focused test result'), 'blocker was trimmed');
  assert(parsed.verificationResults.some((entry) => entry.status === 'fail'), 'failed verification was trimmed');
  assert(parsed.nextAction === 'Run the focused handoff test', 'next action was trimmed');
  assert(parsed.criticalRefs.includes('.godpowers/build/PLAN.mdx'), 'critical reference was trimmed before optional detail');
});

test('serialize rejects a projection missing mandatory fields', () => {
  let rejected = false;
  try {
    handoff.serialize({ requirementIds: ['P-MUST-27'] });
  } catch (error) {
    rejected = /mandatory/i.test(error.message);
  }
  assert(rejected, 'incomplete handoff should be rejected');
});

test('verification trimming removes only passes and always retains failed verification', () => {
  const large = input();
  large.state.completedWork = [];
  large.state.inProgressWork = [];
  large.state.decisions = [];
  large.state.changedFiles = [];
  large.state.constraints = [];
  large.plan.constraints = [];
  large.verification = [
    ...Array.from({ length: 10 }, (_, index) => ({
      command: `node scripts/pass-${index}-${'p'.repeat(60)}.js`,
      status: 'pass',
      evidenceRef: `.godpowers/ledger/verifications.jsonl#pass-${index}-${'r'.repeat(40)}`
    })),
    {
      command: 'node scripts/failing-check.js',
      status: 'fail',
      evidenceRef: '.godpowers/ledger/verifications.jsonl#required-failure'
    },
    ...Array.from({ length: 130 }, (_, index) => ({
      command: `node scripts/later-pass-${index}.js`,
      status: 'pass',
      evidenceRef: `.godpowers/ledger/verifications.jsonl#later-${index}`
    }))
  ];
  const parsed = JSON.parse(handoff.serialize(handoff.derive(large)));
  assert(parsed.verificationResults.some((entry) => entry.status === 'fail' &&
    entry.command === 'node scripts/failing-check.js'), JSON.stringify(parsed.verificationResults));
});

test('verification trimming preserves every repository failure status', () => {
  for (const status of ['fail', 'failed', 'red', 'error']) {
    const large = input();
    large.state.completedWork = [];
    large.state.inProgressWork = [];
    large.state.decisions = [];
    large.state.changedFiles = [];
    large.plan.constraints = [];
    large.verification = [
      { command: `node scripts/${status}.js`, status, evidenceRef: `.godpowers/ledger/${status}` },
      ...Array.from({ length: 180 }, (_, index) => ({
        command: `node scripts/pass-${index}-${'x'.repeat(40)}.js`,
        status: 'pass',
        evidenceRef: `.godpowers/ledger/pass-${index}`
      }))
    ];
    const parsed = JSON.parse(handoff.serialize(handoff.derive(large)));
    assert(parsed.verificationResults.some(entry => entry.status === status),
      `${status} was trimmed: ${JSON.stringify(parsed.verificationResults)}`);
  }
});

test('write uses the validated run handoff path and rejects traversal or symlink escape', () => {
  const project = mkProject('godpowers-handoff-write-');
  const value = handoff.derive(input());
  const file = handoff.write(project, 'run-17', 'slice-2.1', value);
  assert(file === path.join(project, '.godpowers', 'runs', 'run-17', 'handoffs', 'slice-2.1.json'), file);
  assert(fs.existsSync(file), 'handoff file missing');
  assert(fs.readFileSync(file, 'utf8') === handoff.serialize(value), 'write must use deterministic serialization');
  assert(!fs.readdirSync(path.dirname(file)).some((name) => name.includes('.tmp')), 'atomic temp file remained');

  let traversalRejected = false;
  try {
    handoff.write(project, '../escape', 'slice-2.1', value);
  } catch (error) {
    traversalRejected = /run id/i.test(error.message);
  }
  assert(traversalRejected, 'run id traversal should be rejected');

  const outside = mkProject('godpowers-handoff-outside-');
  const runs = path.join(project, '.godpowers', 'runs');
  fs.mkdirSync(runs, { recursive: true });
  fs.symlinkSync(outside, path.join(runs, 'linked'));
  let symlinkRejected = false;
  try {
    handoff.write(project, 'linked', 'slice-2.1', value);
  } catch (error) {
    symlinkRejected = /outside|symlink|run root/i.test(error.message);
  }
  assert(symlinkRejected, 'symlink escape should be rejected');

  const linkedProject = mkProject('godpowers-handoff-project-link-');
  const linkedOutside = mkProject('godpowers-handoff-project-link-outside-');
  fs.rmSync(path.join(linkedProject, '.godpowers'), { recursive: true, force: true });
  fs.symlinkSync(linkedOutside, path.join(linkedProject, '.godpowers'));
  let projectSymlinkRejected = false;
  try {
    handoff.write(linkedProject, 'run-19', 'slice-2.1', value);
  } catch (error) {
    projectSymlinkRejected = /outside|project/i.test(error.message);
  }
  assert(projectSymlinkRejected, 'project state symlink escape should be rejected');
  assert(!fs.existsSync(path.join(linkedOutside, 'runs')), 'rejected state symlink must not create outside directories');
});

test('fresh process resume resolves the next action from handoff plus current state', () => {
  const project = mkProject('godpowers-handoff-resume-');
  const value = handoff.derive(input());
  const file = handoff.write(project, 'run-18', 'slice-2.1', value);
  const stateFile = path.join(project, '.godpowers', 'state.json');
  fs.writeFileSync(stateFile, JSON.stringify({
    status: 'in-progress',
    nextAction: 'Continue from authoritative state',
    blockers: []
  }));
  const modulePath = path.resolve(__dirname, '..', 'lib', 'slice-handoff.js');
  const script = [
    `const fs = require('fs');`,
    `const h = require(${JSON.stringify(modulePath)});`,
    `const prior = JSON.parse(fs.readFileSync(${JSON.stringify(file)}, 'utf8'));`,
    `const state = JSON.parse(fs.readFileSync(${JSON.stringify(stateFile)}, 'utf8'));`,
    `process.stdout.write(h.derive({ plan: prior, state, verification: prior.verificationResults }).nextAction);`
  ].join('');
  const child = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8' });
  assert(child.status === 0, child.stderr);
  assert(child.stdout === 'Continue from authoritative state', `unexpected resume action: ${child.stdout}`);
});

test('executor reviewer and runbook require structured handoffs at slice boundaries', () => {
  const root = path.resolve(__dirname, '..');
  const executor = fs.readFileSync(path.join(root, 'specialists', 'god-executor.md'), 'utf8');
  const reviewer = fs.readFileSync(path.join(root, 'specialists', 'god-spec-reviewer.md'), 'utf8');
  const runbook = fs.readFileSync(path.join(root, 'references', 'orchestration',
    'GOD-ORCHESTRATOR-RUNBOOK.md'), 'utf8');
  assert(/lib\/slice-handoff\.(?:derive|write)/.test(executor), 'executor must name handoff projection');
  assert(/completes, pauses, or changes owner/i.test(executor), 'executor must cover all handoff boundaries');
  assert(/structured handoff/i.test(reviewer), 'reviewer must consume the structured handoff');
  assert(/## Structured slice closeout and resume/.test(runbook), 'runbook handoff section missing');
});

report('Slice handoff tests');
