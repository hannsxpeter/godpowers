#!/usr/bin/env node
/**
 * Behavioral tests for lib/sibling-artifacts.js (the godplans/godaudits
 * PLAN.mdx / AUDIT.json parser) and its integration seams: planning-systems
 * detection and import, linkage id grammars, cross-artifact impact rules,
 * source-sync companions, feature-awareness spawn exclusion, and state
 * drift on stale imports.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const siblingArtifacts = require('../lib/sibling-artifacts');
const planningSystems = require('../lib/planning-systems');
const sourceSync = require('../lib/source-sync');
const featureAwareness = require('../lib/feature-awareness');
const linkage = require('../lib/linkage');
const crossImpact = require('../lib/cross-artifact-impact');
const state = require('../lib/state');
const { test, assert, mkProject, writeRel, report } = require('./test-harness');

// Fixture strings follow the godplans/godaudits machine contract. The
// frontmatter progress/counts blocks are deliberately wrong so the tests
// prove that checkbox recounts beat frontmatter counters.
const PLAN_FIXTURE = [
  '---',
  'name: demo',
  'plan_version: 1',
  'status: executing',
  'created: 2026-07-01',
  'updated: 2026-07-02',
  'mode: greenfield',
  'archetype: cli-tool',
  'domains_applicable: [product, security]',
  'progress:',
  '  phases_total: 2',
  '  phases_done: 0',
  '  tasks_total: 99',
  '  tasks_done: 42',
  '---',
  '',
  '# Demo master plan',
  '',
  'Build a demo CLI.',
  '',
  '## Requirements',
  '',
  '1. R-1.1 WHEN a user runs the CLI THE SYSTEM SHALL print help.',
  '',
  '## Phases',
  '',
  '## Phase 1: Foundation',
  '',
  'Goal: lay the foundation.',
  '',
  '### Wave 1.1',
  '',
  '- [x] GP-101 [W1.1] Scaffold the repo',
  '  - Files: package.json',
  '  - Depends on: none',
  '  - Acceptance: package.json exists',
  '  - Verify: `test -f package.json`',
  '  - Requirements: R-1.1',
  '- [ ] GP-102 [P] [W1.1] Add security headers',
  '  - Files: src/server.js',
  '  - Depends on: GP-101',
  '  - Acceptance: helmet configured',
  '  - Verify: `grep -q helmet src/server.js`',
  '  - Requirements: R-SEC-3, R-1.1',
  '  - Note (2026-07-02): verify failed once; helmet not yet wired.',
  '',
  '~~- [ ] GP-103 [W1.1] Old header approach~~ superseded: replaced by GP-102.',
  '',
  'Checkpoint: repo scaffolded.',
  '',
  '## Open Questions',
  '',
  '- Q1 Which registry? Owner: user.',
  '- Q2 Which license? Owner: user.',
  '',
  '## Session log',
  '',
  '- 2026-07-01 planned phase 1.'
].join('\n');

function godplans11Plan(status = 'approved', taskCount = 1) {
  const taskLines = [];
  for (let number = 1; number <= taskCount; number++) {
    const id = `GP-${100 + number}`;
    taskLines.push(
      `- [ ] ${id} [W1.1] Verify release condition ${number}`,
      '  - Files: package.json',
      '  - Depends on: none',
      '  - Reuses: existing release check from package.json',
      '  - Acceptance: release check exits zero; package metadata remains valid',
      '  - Verify: `npm run release:check`',
      '  - Requirements: R-1.1, R-CODE-1, R-SEC-1',
      ''
    );
  }
  return [
    '---',
    'name: demo',
    'plan_version: 2',
    `status: ${status}`,
    'created: 2026-07-01',
    'updated: 2026-07-13',
    'mode: replan',
    'archetype: cli-tool',
    'domains_applicable: [product, security, code-quality]',
    'domains_excluded: []',
    'progress:',
    '  phases_total: 1',
    '  phases_done: 0',
    `  tasks_total: ${taskCount}`,
    '  tasks_done: 0',
    '---',
    '',
    '# Demo master plan',
    '',
    'Done means the release verification command passes.',
    '',
    '## Requirements',
    '',
    'R-1.1: WHEN the maintainer verifies the release THE SYSTEM SHALL exit zero.',
    '',
    '## Phases',
    '',
    '## Phase 1: Verification',
    '',
    '### Wave 1.1',
    '',
    ...taskLines,
    'Checkpoint: the release gate passes.',
    '',
    '## Open Questions',
    '',
    '## Rules for executing agents',
    '',
    'Run the validator before execution.',
    '',
    '## Session log',
    '',
    '- 2026-07-13 replanned with godplans v1.1.0.'
  ].join('\n');
}

const TEST_PLAN_VALIDATOR = '#!/usr/bin/env bash\nexit 0\n';

const AUDIT_FIXTURE = [
  '---',
  'name: demo',
  'audit_version: 1',
  'status: reported',
  'created: 2026-07-02',
  'updated: 2026-07-02',
  'mode: fresh',
  'plan_aware: true',
  'commit: abc1234',
  'archetype: cli-tool',
  'scale: side-project',
  'scores:',
  '  overall: 72',
  '  verdict: needs work',
  '  domains:',
  '    security: 60',
  '    code-quality: 80',
  'counts:',
  '  findings_total: 9',
  '  critical: 9',
  '  high: 9',
  '  medium: 9',
  '  low: 9',
  '  tasks_total: 9',
  '  tasks_done: 9',
  '---',
  '',
  '# Demo audit',
  '',
  'Needs work.',
  '',
  '## Findings',
  '',
  '### Security',
  '',
  '#### F-SEC-1 Session cookie lacks HttpOnly [Critical | Certain | S]',
  '',
  '- Where: src/server.js:42',
  '- Evidence: `cookie: { httpOnly: false }`',
  '- Impact: Session theft via XSS.',
  '- Fix: Set httpOnly true in the session config.',
  '- Verify the fix: `grep -q httpOnly src/server.js`',
  '- Checks: A-SEC-3, R-SEC-3',
  '- Status: open',
  '- Remediation: GA-101',
  '',
  '#### F-SEC-2 Passwords hashed with md5 [High | Firm | S]',
  '',
  '- Where: src/auth.js:10',
  '- Evidence: `md5(password)`',
  '- Impact: Weak password hashing.',
  '- Fix: Use bcrypt.',
  '- Verify the fix: `grep -q bcrypt src/auth.js`',
  '- Checks: A-SEC-5',
  '- Status: resolved',
  '- Remediation: GA-102',
  '',
  '## Remediation plan',
  '',
  '## Phase 1: Stop the bleeding',
  '',
  'Goal: close criticals.',
  '',
  '### Wave 1.1',
  '',
  '- [ ] GA-101 [P] [W1.1] Set session cookie HttpOnly',
  '  - Files: src/server.js',
  '  - Depends on: none',
  '  - Fixes: F-SEC-1',
  '  - Acceptance: httpOnly true in session config',
  '  - Verify: `grep -q httpOnly src/server.js`',
  '  - Checks: A-SEC-3, R-SEC-3',
  '- [x] GA-102 [W1.1] Replace md5 with bcrypt',
  '  - Files: src/auth.js',
  '  - Depends on: none',
  '  - Fixes: F-SEC-2',
  '  - Acceptance: bcrypt used for password hashing',
  '  - Verify: `grep -q bcrypt src/auth.js`',
  '  - Checks: A-SEC-5'
].join('\n');

const AUDIT_JSON_FIXTURE = JSON.stringify({
  schema_version: '2.0',
  audit: {
    name: 'demo',
    audit_version: 2,
    status: 'remediating',
    created: '2026-07-02',
    updated: '2026-07-13',
    mode: 're-audit',
    plan_aware: true,
    commit: 'def5678',
    archetype: 'cli-tool',
    scale: 'side-project',
    risk_profile: 'library',
    engine_version: '2.0.0',
    pack_version: '2.0.0',
    capabilities: ['static'],
    assumptions: []
  },
  compliance: {
    result: 'pass',
    screened: '2026-07-13',
    policy_pack: 'default'
  },
  domains: [
    {
      id: 'security',
      status: 'applicable',
      weight: 15,
      checks: [
        {
          id: 'A-SEC-3',
          outcome: 'fail',
          confidence: 'Certain',
          weight: 50,
          evidence: ['E-1'],
          finding_ids: ['F-SEC-1']
        },
        {
          id: 'A-SEC-5',
          outcome: 'pass',
          confidence: 'Firm',
          weight: 50,
          evidence: ['E-1'],
          finding_ids: []
        }
      ]
    }
  ],
  evidence: [
    {
      id: 'E-1',
      type: 'source',
      path: 'src/server.js',
      line: 42,
      quote: 'cookie config',
      sha256: 'a'.repeat(64),
      redacted: false
    }
  ],
  strengths: [],
  findings: [
    {
      id: 'F-SEC-1',
      domain: 'security',
      title: 'Session cookie lacks HttpOnly',
      severity: 'Critical',
      confidence: 'Certain',
      effort: 'S',
      evidence: ['E-1'],
      impact: 'Session theft via XSS.',
      fix: 'Set httpOnly true in the session config.',
      verify: 'node --test test/security.test.js',
      checks: ['A-SEC-3'],
      status: 'open',
      remediation: ['GA-101']
    }
  ],
  tasks: [
    {
      id: 'GA-101',
      phase: 1,
      wave: '1.1',
      title: 'Set session cookie HttpOnly',
      parallel: true,
      files: ['src/server.js'],
      depends_on: [],
      reuses: 'existing session configuration',
      fixes: ['F-SEC-1'],
      acceptance: ['httpOnly is true.', 'The security test passes.'],
      verify: 'node --test test/security.test.js',
      checks: ['A-SEC-3'],
      status: 'open'
    },
    {
      id: 'GA-102',
      phase: 2,
      wave: '2.1',
      title: 'Completed historical task',
      parallel: false,
      files: ['src/auth.js'],
      depends_on: ['GA-101'],
      reuses: 'existing auth tests',
      fixes: [],
      acceptance: ['History remains available.'],
      verify: 'true',
      checks: [],
      status: 'done'
    },
    {
      id: 'GA-103',
      phase: 2,
      wave: '2.2',
      title: 'Superseded historical task',
      parallel: false,
      files: [],
      depends_on: [],
      reuses: 'none',
      fixes: [],
      acceptance: ['History remains available.'],
      verify: 'true',
      checks: [],
      status: 'superseded'
    }
  ],
  accepted_risks: [],
  open_questions: [],
  session_log: [],
  computed: {
    coverage: {
      applicable: 414,
      evaluated: 402,
      passed: 401,
      failed: 1,
      unknown: 12,
      not_applicable: 0,
      percent: 97
    },
    domains: {
      security: { raw_score: 60, score: 60, cap: null },
      'code-quality': { raw_score: 80, score: 80, cap: null }
    },
    overall: {
      raw_score: 72,
      score: 72,
      verdict: 'needs work',
      coverage_cap: 100,
      critical_cap: 79,
      weak_domain_cap: 100
    },
    counts: {
      findings_total: 1,
      critical: 1,
      high: 0,
      medium: 0,
      low: 0,
      accepted_risk: 0,
      tasks_total: 2,
      tasks_done: 1
    }
  }
}, null, 2);

const AUDIT_V2_REPORT_FIXTURE = [
  '---',
  'name: "demo"',
  'schema_version: "2.0"',
  'overall: 72',
  'verdict: "needs work"',
  'coverage: 97',
  '---',
  '',
  '# demo audit',
  '',
  '## Compliance gate',
  '',
  'Result: pass. Screened 2026-07-13 with default.',
  '',
  '## Check ledger',
  '',
  '| Check | Outcome | Confidence | Weight | Evidence |',
  '|---|---|---|---:|---|',
  '| A-SEC-3 | fail | Certain | 50 | E-1 |',
  '| A-SEC-5 | pass | Firm | 50 | E-1 |',
  '',
  '## Remediation plan',
  '',
  '## Phase 1: Stop the bleeding',
  '',
  '### Wave 1.1',
  '',
  '- [ ] GA-101 [W1.1] [P] Set session cookie HttpOnly',
  '  - Files: src/server.js',
  '  - Depends on: none',
  '  - Reuses: existing session configuration',
  '  - Fixes: F-SEC-1',
  '  - Acceptance: httpOnly is true; the security test passes',
  '  - Verify: `node --test test/security.test.js`',
  '  - Checks: A-SEC-3'
].join('\n');

console.log('\n  Sibling-artifact tests\n');

test('parsePlan recounts tasks from checkboxes, not frontmatter', () => {
  const plan = siblingArtifacts.parsePlan(PLAN_FIXTURE);
  assert(plan.frontmatter.progress.tasks_total === 99, 'fixture frontmatter should lie');
  assert(plan.counts.total === 2, `total: ${plan.counts.total}`);
  assert(plan.counts.done === 1, `done: ${plan.counts.done}`);
  assert(plan.counts.open === 1, `open: ${plan.counts.open}`);
});

test('parsePlan reads frontmatter mode, archetype, and status', () => {
  const plan = siblingArtifacts.parsePlan(PLAN_FIXTURE);
  assert(plan.frontmatter.mode === 'greenfield', `mode: ${plan.frontmatter.mode}`);
  assert(plan.frontmatter.archetype === 'cli-tool', `archetype: ${plan.frontmatter.archetype}`);
  assert(plan.frontmatter.status === 'executing', `status: ${plan.frontmatter.status}`);
});

test('parsePlan extracts task fields, [P] flag, wave, and notes', () => {
  const plan = siblingArtifacts.parsePlan(PLAN_FIXTURE);
  const task = plan.tasks.find((entry) => entry.id === 'GP-102');
  assert(task, 'GP-102 missing');
  assert(task.done === false, 'GP-102 should be open');
  assert(task.parallel === true, 'GP-102 should be [P]');
  assert(task.wave === '1.1', `wave: ${task.wave}`);
  assert(task.title === 'Add security headers', `title: ${task.title}`);
  assert(task.files.join(',') === 'src/server.js', `files: ${task.files}`);
  assert(task.dependsOn.join(',') === 'GP-101', `dependsOn: ${task.dependsOn}`);
  assert(task.requirements.join(',') === 'R-SEC-3,R-1.1', `requirements: ${task.requirements}`);
  assert(task.verify === 'grep -q helmet src/server.js', `verify: ${task.verify}`);
  assert(task.notes.length === 1 && task.notes[0].date === '2026-07-02', 'note missing');
  const done = plan.tasks.find((entry) => entry.id === 'GP-101');
  assert(done.done === true, 'GP-101 should be done');
  assert(done.dependsOn.length === 0, 'Depends on: none should be empty');
});

test('parsePlan ignores superseded strikethrough tasks in counts', () => {
  const plan = siblingArtifacts.parsePlan(PLAN_FIXTURE);
  assert(plan.superseded.join(',') === 'GP-103', `superseded: ${plan.superseded}`);
  assert(!plan.tasks.some((task) => task.id === 'GP-103'), 'GP-103 counted as live task');
});

test('parsePlan reports requirement ids, open domains, and open questions', () => {
  const plan = siblingArtifacts.parsePlan(PLAN_FIXTURE);
  assert(plan.requirementIds.story.includes('R-1.1'), 'story id missing');
  assert(plan.requirementIds.domain.includes('R-SEC-3'), 'domain id missing');
  assert(plan.openRequirementDomains.join(',') === 'SEC', `open domains: ${plan.openRequirementDomains}`);
  assert(plan.openQuestions.length === 2, `open questions: ${plan.openQuestions.length}`);
});

test('parsePlan tolerates empty text and missing sections', () => {
  const empty = siblingArtifacts.parsePlan('');
  assert(empty.counts.total === 0, 'empty plan should have zero tasks');
  assert(empty.openQuestions.length === 0, 'empty plan should have no questions');
  const bare = siblingArtifacts.parsePlan('# Just a title\n\n- [ ] GP-201 [W2.1] Lone task\n');
  assert(bare.counts.open === 1, 'bare checkbox not counted');
  assert(Object.keys(bare.frontmatter).length === 0, 'missing frontmatter should be {}');
});

test('validatePlanText mirrors the Godplans 1.1 structural and lifecycle gate', () => {
  const valid = siblingArtifacts.validatePlanText(godplans11Plan('approved'));
  assert(valid.valid, `valid plan errors: ${valid.errors.join('; ')}`);
  assert(valid.derived.tasks_total === 1 && valid.derived.phases_total === 1,
    `derived counters: ${JSON.stringify(valid.derived)}`);

  const executionBlocked = siblingArtifacts.validatePlanText(
    godplans11Plan('planning'),
    { allowPlanning: false }
  );
  assert(executionBlocked.errors.some((error) => error.includes('execution requires status')),
    `execution lifecycle error missing: ${executionBlocked.errors.join('; ')}`);

  const missingReuse = godplans11Plan().replace(
    '  - Reuses: existing release check from package.json\n',
    ''
  );
  const invalid = siblingArtifacts.validatePlanText(missingReuse);
  assert(!invalid.valid && invalid.errors.includes('GP-101 missing required field: Reuses'),
    `Reuses validation missing: ${invalid.errors.join('; ')}`);
});

test('loadPlan verifies the two-artifact contract without executing shell', () => {
  const tmp = mkProject('godpowers-plan-contract-');
  writeRel(tmp, '.godplans/PLAN.mdx', godplans11Plan('approved'));

  let loaded = siblingArtifacts.loadPlan(tmp);
  assert(!loaded.contract.complete && loaded.contract.reason === 'validator-missing',
    `missing validator reason: ${loaded.contract.reason}`);

  writeRel(tmp, '.godplans/validate-plan.sh', TEST_PLAN_VALIDATOR);
  fs.chmodSync(path.join(tmp, '.godplans', 'validate-plan.sh'), 0o755);
  loaded = siblingArtifacts.loadPlan(tmp);
  assert(!loaded.contract.complete && loaded.contract.reason === 'validator-unsupported',
    `unknown validator reason: ${loaded.contract.reason}`);

  const hash = `sha256:${crypto.createHash('sha256').update(TEST_PLAN_VALIDATOR).digest('hex')}`;
  loaded = siblingArtifacts.loadPlan(tmp, {
    trustedValidatorHashes: { [hash]: 'test-1.1.0' }
  });
  assert(loaded.contract.complete && loaded.contract.executionEligible,
    `trusted contract: ${JSON.stringify(loaded.contract)}`);
  assert(loaded.contract.reason === 'ready-for-validator', `reason: ${loaded.contract.reason}`);
  assert(loaded.contract.validatorCommand === 'bash .godplans/validate-plan.sh .godplans/PLAN.mdx',
    `command: ${loaded.contract.validatorCommand}`);
});

test('loadPlan rejects non-executable and symlinked validator companions', () => {
  const tmp = mkProject('godpowers-plan-validator-safety-');
  writeRel(tmp, '.godplans/PLAN.mdx', godplans11Plan());
  writeRel(tmp, '.godplans/validate-plan.sh', TEST_PLAN_VALIDATOR);
  fs.chmodSync(path.join(tmp, '.godplans', 'validate-plan.sh'), 0o644);
  let loaded = siblingArtifacts.loadPlan(tmp);
  assert(loaded.contract.reason === 'validator-not-executable',
    `non-executable reason: ${loaded.contract.reason}`);

  fs.rmSync(path.join(tmp, '.godplans', 'validate-plan.sh'));
  const outside = mkProject('godpowers-plan-validator-outside-');
  writeRel(outside, 'validate-plan.sh', TEST_PLAN_VALIDATOR);
  fs.symlinkSync(
    path.join(outside, 'validate-plan.sh'),
    path.join(tmp, '.godplans', 'validate-plan.sh')
  );
  loaded = siblingArtifacts.loadPlan(tmp);
  assert(loaded.contract.reason === 'validator-unreadable-or-non-regular',
    `symlink reason: ${loaded.contract.reason}`);
});

test('planExecutionState blocks planning and done plans before GP dispatch', () => {
  const hash = `sha256:${crypto.createHash('sha256').update(TEST_PLAN_VALIDATOR).digest('hex')}`;
  const opts = { trustedValidatorHashes: { [hash]: 'test-1.1.0' } };
  for (const [status, reason] of [
    ['planning', 'awaiting-explicit-approval'],
    ['done', 'plan-closed']
  ]) {
    const tmp = mkProject(`godpowers-plan-${status}-`);
    let planText = godplans11Plan(status);
    if (status === 'done') {
      planText = planText
        .replace('  phases_done: 0', '  phases_done: 1')
        .replace('  tasks_done: 0', '  tasks_done: 1')
        .replace('- [ ] GP-101', '- [x] GP-101');
    }
    writeRel(tmp, '.godplans/PLAN.mdx', planText);
    writeRel(tmp, '.godplans/validate-plan.sh', TEST_PLAN_VALIDATOR);
    fs.chmodSync(path.join(tmp, '.godplans', 'validate-plan.sh'), 0o755);
    const execution = siblingArtifacts.planExecutionState(tmp, opts);
    assert(!execution.executionEligible && execution.reason === reason,
      `${status} gate: ${JSON.stringify(execution)}`);
    assert(execution.nextTasks.length === 0, `${status} dispatched GP work`);
  }
});

test('loadPlan rejects a done lifecycle that still has open tasks', () => {
  const tmp = mkProject('godpowers-plan-inconsistent-done-');
  writeRel(tmp, '.godplans/PLAN.mdx', godplans11Plan('done'));
  writeRel(tmp, '.godplans/validate-plan.sh', TEST_PLAN_VALIDATOR);
  fs.chmodSync(path.join(tmp, '.godplans', 'validate-plan.sh'), 0o755);
  const hash = `sha256:${crypto.createHash('sha256').update(TEST_PLAN_VALIDATOR).digest('hex')}`;
  const loaded = siblingArtifacts.loadPlan(tmp, {
    trustedValidatorHashes: { [hash]: 'test-1.1.0' }
  });
  assert(!loaded.contract.complete && loaded.contract.reason === 'lifecycle-inconsistent',
    `inconsistent done gate: ${JSON.stringify(loaded.contract)}`);
  assert(loaded.plan.lifecycle.errors.some((error) => error.includes('open task')),
    `lifecycle errors: ${loaded.plan.lifecycle.errors.join('; ')}`);
});

test('planExecutionState dispatches the first eligible task from an approved plan', () => {
  const tmp = mkProject('godpowers-plan-approved-dispatch-');
  writeRel(tmp, '.godplans/PLAN.mdx', godplans11Plan('approved', 2));
  writeRel(tmp, '.godplans/validate-plan.sh', TEST_PLAN_VALIDATOR);
  fs.chmodSync(path.join(tmp, '.godplans', 'validate-plan.sh'), 0o755);
  const hash = `sha256:${crypto.createHash('sha256').update(TEST_PLAN_VALIDATOR).digest('hex')}`;
  const execution = siblingArtifacts.planExecutionState(tmp, {
    trustedValidatorHashes: { [hash]: 'test-1.1.0' }
  });
  assert(execution.executionEligible && execution.reason === 'ready-for-validator',
    `approved execution gate: ${JSON.stringify(execution)}`);
  assert(execution.nextTasks.length === 1 && execution.nextTasks[0].id === 'GP-101',
    `next tasks: ${execution.nextTasks.map((task) => task.id).join(', ')}`);
});

test('the trusted Godplans validator catalog pins version 1.1.0', () => {
  const expected = 'sha256:cec8691bb32f272bfe29acdab435be6f95d55405a914fc6ff33277aca5c8eb6b';
  assert(siblingArtifacts.GODPLANS_VALIDATOR_HASHES[expected] === '1.1.0',
    'official Godplans 1.1.0 validator hash missing');
});

test('parseAudit recounts GA tasks and parses the finding grammar', () => {
  const audit = siblingArtifacts.parseAudit(AUDIT_FIXTURE);
  assert(audit.counts.total === 2 && audit.counts.done === 1 && audit.counts.open === 1,
    `counts: ${JSON.stringify(audit.counts)}`);
  assert(audit.findings.length === 2, `findings: ${audit.findings.length}`);
  const finding = audit.findings.find((entry) => entry.id === 'F-SEC-1');
  assert(finding.domain === 'SEC', `domain: ${finding.domain}`);
  assert(finding.severity === 'Critical' && finding.confidence === 'Certain' && finding.effort === 'S',
    'severity triple wrong');
  assert(finding.where === 'src/server.js:42', `where: ${finding.where}`);
  assert(finding.status === 'open', `status: ${finding.status}`);
  assert(finding.remediation === 'GA-101', `remediation: ${finding.remediation}`);
  assert(finding.verifyFix === 'grep -q httpOnly src/server.js', `verifyFix: ${finding.verifyFix}`);
  assert(finding.checks.join(',') === 'A-SEC-3,R-SEC-3', `checks: ${finding.checks}`);
  const resolved = audit.findings.find((entry) => entry.id === 'F-SEC-2');
  assert(resolved.status === 'resolved', 'F-SEC-2 should be resolved');
});

test('parseAudit counts open findings by severity and passes scores through', () => {
  const audit = siblingArtifacts.parseAudit(AUDIT_FIXTURE);
  assert(audit.openFindings.critical === 1, `critical: ${audit.openFindings.critical}`);
  assert(audit.openFindings.high === 0, `high: ${audit.openFindings.high}`);
  assert(audit.openFindings.total === 1, `total: ${audit.openFindings.total}`);
  assert(audit.scores.overall === 72, `overall: ${audit.scores.overall}`);
  assert(audit.scores.verdict === 'needs work', `verdict: ${audit.scores.verdict}`);
  assert(audit.scores.domains.security === 60, `security score: ${audit.scores.domains.security}`);
});

test('parseAudit extracts GA task Fixes and tolerates empty text', () => {
  const audit = siblingArtifacts.parseAudit(AUDIT_FIXTURE);
  const task = audit.tasks.find((entry) => entry.id === 'GA-101');
  assert(task.fixes.join(',') === 'F-SEC-1', `fixes: ${task.fixes}`);
  assert(task.checks.join(',') === 'A-SEC-3,R-SEC-3', `checks: ${task.checks}`);
  const empty = siblingArtifacts.parseAudit('');
  assert(empty.counts.total === 0 && empty.findings.length === 0, 'empty audit not tolerated');
  assert(empty.scores.overall === null, 'missing scores should be null');
});

test('parseAudit consumes canonical godaudits 2.0 JSON state', () => {
  const audit = siblingArtifacts.parseAudit(AUDIT_JSON_FIXTURE);
  assert(audit.sourceFormat === 'json', `format: ${audit.sourceFormat}`);
  assert(audit.schemaVersion === '2.0', `schema: ${audit.schemaVersion}`);
  assert(audit.frontmatter.pack_version === '2.0.0', 'pack version missing');
  assert(audit.counts.total === 2 && audit.counts.done === 1 && audit.counts.open === 1,
    `counts: ${JSON.stringify(audit.counts)}`);
  assert(audit.superseded.join(',') === 'GA-103', `superseded: ${audit.superseded}`);
  assert(audit.scores.overall === 72 && audit.scores.verdict === 'needs work',
    `scores: ${JSON.stringify(audit.scores)}`);
  assert(audit.scores.domains.security === 60, `security score: ${audit.scores.domains.security}`);
  assert(audit.coverage.percent === 97, `coverage: ${JSON.stringify(audit.coverage)}`);
  assert(audit.checks.length === 2 && audit.checkCounts.fail === 1 && audit.checkCounts.pass === 1,
    `checks: ${JSON.stringify(audit.checkCounts)}`);
  assert(audit.evidenceRecords.length === 1 && audit.evidenceRecords[0].sha256 === 'a'.repeat(64),
    `evidence: ${JSON.stringify(audit.evidenceRecords)}`);
  assert(!Object.prototype.hasOwnProperty.call(audit.evidenceRecords[0], 'quote'),
    'evidence quote should not be copied into the import view');
  assert(audit.compliance.result === 'pass', `compliance: ${JSON.stringify(audit.compliance)}`);
  assert(audit.scoreCaps.critical === 79, `score caps: ${JSON.stringify(audit.scoreCaps)}`);
  const finding = audit.findings[0];
  assert(finding.domain === 'SEC' && finding.domainId === 'security',
    `finding domains: ${finding.domain}/${finding.domainId}`);
  assert(finding.where === 'src/server.js:42', `where: ${finding.where}`);
  assert(finding.remediation === 'GA-101', `remediation: ${finding.remediation}`);
  const task = audit.tasks.find((entry) => entry.id === 'GA-101');
  assert(task.dependsOn.length === 0, `dependsOn: ${task.dependsOn}`);
  assert(task.acceptance.length === 2, `acceptance: ${task.acceptance}`);
});

test('parseAudit preserves accepted risks as active without calling them open', () => {
  const accepted = JSON.parse(AUDIT_JSON_FIXTURE);
  accepted.findings[0].status = 'accepted-risk';
  accepted.accepted_risks.push({
    finding: 'F-SEC-1',
    summary: 'Accepted temporarily.',
    owner: 'security lead',
    accepted_on: '2026-07-13',
    expires: '2026-08-13',
    review: 'node --test test/security.test.js'
  });
  const audit = siblingArtifacts.parseAudit(`\uFEFF${JSON.stringify(accepted)}`, '.godaudits/AUDIT.json');
  assert(audit.openFindings.total === 0, `open findings: ${audit.openFindings.total}`);
  assert(audit.activeFindings.total === 1 && audit.activeFindings.critical === 1,
    `active findings: ${JSON.stringify(audit.activeFindings)}`);
  assert(audit.acceptedRisks.length === 1, `accepted risks: ${audit.acceptedRisks.length}`);
});

test('parseAudit fails closed on malformed canonical JSON', () => {
  const audit = siblingArtifacts.parseAudit('{"schema_version":');
  assert(audit.sourceFormat === 'json', `format: ${audit.sourceFormat}`);
  assert(audit.parseError === 'invalid JSON', `parse error: ${audit.parseError}`);
  assert(audit.tasks.length === 0 && audit.findings.length === 0,
    'malformed JSON should not dispatch work');
});

test('parseAudit rejects unsupported canonical schema versions', () => {
  const unsupported = JSON.parse(AUDIT_JSON_FIXTURE);
  unsupported.schema_version = '3.0';
  const audit = siblingArtifacts.parseAudit(unsupported);
  assert(audit.parseError === 'unsupported schema version 3.0', `parse error: ${audit.parseError}`);
  assert(audit.tasks.length === 0 && audit.findings.length === 0,
    'unsupported JSON should not dispatch work');
});

test('parseAudit fails closed on invalid canonical task and evidence state', () => {
  const invalidTask = JSON.parse(AUDIT_JSON_FIXTURE);
  invalidTask.tasks[0].id = '<Task />';
  let audit = siblingArtifacts.parseAudit(invalidTask);
  assert(audit.parseError === 'invalid canonical task state', `task error: ${audit.parseError}`);
  assert(audit.tasks.length === 0, 'invalid task state should not dispatch work');

  const invalidEvidence = JSON.parse(AUDIT_JSON_FIXTURE);
  invalidEvidence.evidence[0] = null;
  audit = siblingArtifacts.parseAudit(invalidEvidence);
  assert(audit.parseError === 'invalid canonical evidence state',
    `evidence error: ${audit.parseError}`);
});

test('parseAudit reads the generated godaudits 2.0 MDX task grammar', () => {
  const audit = siblingArtifacts.parseAudit(AUDIT_V2_REPORT_FIXTURE);
  assert(audit.scores.overall === 72 && audit.scores.verdict === 'needs work',
    `scores: ${JSON.stringify(audit.scores)}`);
  assert(audit.coverage.percent === 97, `coverage: ${JSON.stringify(audit.coverage)}`);
  assert(audit.tasks.length === 1 && audit.tasks[0].parallel === true,
    `tasks: ${JSON.stringify(audit.tasks)}`);
  assert(audit.tasks[0].title === 'Set session cookie HttpOnly', `title: ${audit.tasks[0].title}`);
  assert(audit.checks.length === 2 && audit.checkCounts.fail === 1,
    `check ledger: ${JSON.stringify(audit.checkCounts)}`);
  assert(audit.compliance.result === 'pass', `compliance: ${JSON.stringify(audit.compliance)}`);
});

test('detect reports present sibling files with hashes and null when absent', () => {
  const tmp = mkProject('godpowers-sibling-');
  writeRel(tmp, '.godplans/PLAN.mdx', PLAN_FIXTURE);
  const detection = siblingArtifacts.detect(tmp);
  assert(detection.plan && detection.plan.present === true, 'plan not detected');
  assert(detection.plan.path === '.godplans/PLAN.mdx', `plan path: ${detection.plan.path}`);
  assert(/^sha256:[a-f0-9]{64}$/.test(detection.plan.hash), `plan hash: ${detection.plan.hash}`);
  assert(detection.audit === null, 'absent audit should be null');
});

test('detect falls back to a legacy .md twin', () => {
  const tmp = mkProject('godpowers-sibling-');
  writeRel(tmp, '.godaudits/AUDIT.md', AUDIT_FIXTURE);
  const detection = siblingArtifacts.detect(tmp);
  assert(detection.audit && detection.audit.path === '.godaudits/AUDIT.md',
    `audit path: ${detection.audit && detection.audit.path}`);
});

test('detect prefers canonical AUDIT.json over generated and legacy reports', () => {
  const tmp = mkProject('godpowers-sibling-');
  writeRel(tmp, '.godaudits/AUDIT.json', AUDIT_JSON_FIXTURE);
  writeRel(tmp, '.godaudits/AUDIT.mdx', AUDIT_FIXTURE);
  const detection = siblingArtifacts.detect(tmp);
  assert(detection.audit && detection.audit.path === '.godaudits/AUDIT.json',
    `audit path: ${detection.audit && detection.audit.path}`);
});

test('canonical sibling reads reject symlinks without following them', () => {
  const outside = mkProject('godpowers-sibling-outside-');
  writeRel(outside, 'AUDIT.json', AUDIT_JSON_FIXTURE);
  const tmp = mkProject('godpowers-sibling-');
  fs.mkdirSync(path.join(tmp, '.godaudits'), { recursive: true });
  fs.symlinkSync(
    path.join(outside, 'AUDIT.json'),
    path.join(tmp, '.godaudits', 'AUDIT.json')
  );
  assert(siblingArtifacts.detect(tmp).audit === null, 'symlinked audit should not be detected as a file');
  const loaded = siblingArtifacts.loadAudit(tmp);
  assert(loaded && loaded.audit.parseError === 'unreadable or non-regular audit source',
    `parse error: ${loaded && loaded.audit.parseError}`);
  assert(siblingArtifacts.remediationTasks(tmp).length === 0,
    'symlinked audit should not dispatch remediation');

  state.init(tmp, 'sibling-symlink-test');
  const result = planningSystems.importPlanningContext(tmp);
  assert(!result.writtenArtifacts.includes('harden/FINDINGS.mdx'),
    'symlinked audit seeded harden');
  assert(result.remediationTodos.reason === 'godaudits-state-unreadable',
    `todo reason: ${result.remediationTodos.reason}`);
});

test('remediationTasks returns only open GA tasks shaped for dispatch', () => {
  const tmp = mkProject('godpowers-sibling-');
  writeRel(tmp, '.godaudits/AUDIT.mdx', AUDIT_FIXTURE);
  const tasks = siblingArtifacts.remediationTasks(tmp);
  assert(tasks.length === 1, `open tasks: ${tasks.length}`);
  const task = tasks[0];
  assert(task.id === 'GA-101', `id: ${task.id}`);
  assert(task.title === 'Set session cookie HttpOnly', `title: ${task.title}`);
  assert(task.wave === '1.1' && task.parallel === true, 'wave/parallel wrong');
  assert(task.fixes.join(',') === 'F-SEC-1', `fixes: ${task.fixes}`);
  assert(task.verify === 'grep -q httpOnly src/server.js', `verify: ${task.verify}`);
  assert(task.files.join(',') === 'src/server.js', `files: ${task.files}`);
  assert(siblingArtifacts.remediationTasks(mkProject('godpowers-sibling-')).length === 0,
    'absent audit should yield no tasks');
});

test('remediationTasks prefers JSON and preserves typed execution fields', () => {
  const tmp = mkProject('godpowers-sibling-');
  writeRel(tmp, '.godaudits/AUDIT.json', AUDIT_JSON_FIXTURE);
  writeRel(tmp, '.godaudits/AUDIT.mdx', AUDIT_FIXTURE.replace('GA-101', 'GA-999'));
  const tasks = siblingArtifacts.remediationTasks(tmp);
  assert(tasks.length === 1, `open tasks: ${tasks.length}`);
  assert(tasks[0].id === 'GA-101', `id: ${tasks[0].id}`);
  assert(tasks[0].source === '.godaudits/AUDIT.json', `source: ${tasks[0].source}`);
  assert(tasks[0].priority === 'P0', `priority: ${tasks[0].priority}`);
  assert(tasks[0].acceptance.length === 2, `acceptance: ${tasks[0].acceptance}`);
  assert(tasks[0].checks.join(',') === 'A-SEC-3', `checks: ${tasks[0].checks}`);
});

test('remediation priority follows severity and final-gate semantics', () => {
  const low = {
    fixes: ['F-SEC-1'],
    finalGate: false
  };
  const gate = {
    fixes: [],
    finalGate: true
  };
  assert(siblingArtifacts._private.remediationPriority(
    low,
    new Map([['F-SEC-1', { severity: 'Low' }]])
  ) === 'P3', 'Low finding should map to P3');
  assert(siblingArtifacts._private.remediationPriority(gate, new Map()) === 'P1',
    'final gate should map to P1');
});

test('remediationTasks fails closed when canonical JSON contains MDX text', () => {
  const tmp = mkProject('godpowers-sibling-');
  writeRel(tmp, '.godaudits/AUDIT.json', AUDIT_FIXTURE);
  const tasks = siblingArtifacts.remediationTasks(tmp);
  assert(tasks.length === 0, 'invalid canonical JSON should not dispatch MDX tasks');
  assert(siblingArtifacts.summarize(tmp).includes('canonical godaudits state is unreadable'),
    'invalid canonical state should be surfaced');
});

test('importPlanningContext does not seed harden or todos from unreadable canonical JSON', () => {
  const tmp = mkProject('godpowers-sibling-');
  state.init(tmp, 'sibling-invalid-json-import-test');
  writeRel(tmp, '.godaudits/AUDIT.json', AUDIT_FIXTURE);
  const result = planningSystems.importPlanningContext(tmp);
  assert(!result.writtenArtifacts.includes('harden/FINDINGS.mdx'),
    'invalid canonical JSON seeded harden');
  assert(result.remediationTodos.reason === 'godaudits-state-unreadable',
    `todo reason: ${result.remediationTodos.reason}`);
  assert(!fs.existsSync(path.join(tmp, '.godpowers', 'todos', 'TODOS.mdx')),
    'invalid canonical JSON wrote todos');
});

test('summarize digests plan and audit signals with recounted numbers', () => {
  const tmp = mkProject('godpowers-sibling-');
  writeRel(tmp, '.godplans/PLAN.mdx', PLAN_FIXTURE);
  writeRel(tmp, '.godaudits/AUDIT.mdx', AUDIT_FIXTURE);
  const digest = siblingArtifacts.summarize(tmp);
  assert(digest.includes('## Executable Plan Signals'), 'plan section missing');
  assert(digest.includes('## Audit Signals'), 'audit section missing');
  assert(digest.includes('2 total, 1 done, 1 open'), 'recounted plan tasks missing');
  assert(digest.includes('Open requirement domains: SEC.'), 'open domains missing');
  assert(digest.includes('Open questions: 2.'), 'open questions missing');
  assert(digest.includes('Audit overall score: 72. Verdict: needs work.'), 'score line missing');
  assert(digest.includes('1 critical, 0 high, 0 medium, 0 low'), 'severity counts missing');
  assert(digest.includes('Open GA remediation tasks: 1.'), 'open GA count missing');
});

test('summarize reports compiled godaudits 2.0 coverage', () => {
  const tmp = mkProject('godpowers-sibling-');
  writeRel(tmp, '.godaudits/AUDIT.json', AUDIT_JSON_FIXTURE);
  const digest = siblingArtifacts.summarize(tmp);
  assert(digest.includes('AUDIT.json as canonical machine state'), 'canonical source missing');
  assert(digest.includes('Audit coverage: 97% (402 of 414 applicable checks evaluated).'),
    'compiled coverage missing');
  assert(digest.includes('Audit compliance gate: pass; policy pack: default.'),
    'compliance gate missing');
  assert(digest.includes('Audit score caps: coverage 100, critical 79, weak-domain 100.'),
    'score caps missing');
  assert(digest.includes('Audit check outcomes: 1 pass, 1 fail, 0 unknown, 0 not applicable.'),
    'check outcome ledger missing');
  assert(digest.includes('Audit evidence ledger: 1 records, 0 redacted.'),
    'evidence ledger missing');
});

test('summarize reports absence as hypothesis lines', () => {
  const digest = siblingArtifacts.summarize(mkProject('godpowers-sibling-'));
  assert(digest.includes('[HYPOTHESIS] No godplans master plan was detected.'), 'plan absence missing');
  assert(digest.includes('[HYPOTHESIS] No godaudits audit report was detected.'), 'audit absence missing');
});

test('staleness matches the recorded import hash and flags edits', () => {
  const tmp = mkProject('godpowers-sibling-');
  state.init(tmp, 'sibling-staleness-test');
  writeRel(tmp, '.godplans/PLAN.mdx', PLAN_FIXTURE);
  planningSystems.importPlanningContext(tmp);

  const fresh = siblingArtifacts.staleness(tmp, state.read(tmp));
  assert(fresh.length === 1 && fresh[0].id === 'godplans', 'godplans entry missing');
  assert(fresh[0].stale === false, 'unchanged plan reported stale');

  fs.appendFileSync(path.join(tmp, '.godplans', 'PLAN.mdx'), '\n- 2026-07-03 replanned.\n');
  const stale = siblingArtifacts.staleness(tmp, state.read(tmp));
  assert(stale[0].stale === true, 'edited plan not reported stale');
  assert(stale[0].recordedHash !== stale[0].currentHash, 'hashes should differ');
});

test('godplans staleness hashes PLAN and validator but ignores sync-back', () => {
  const tmp = mkProject('godpowers-plan-staleness-');
  state.init(tmp, 'godplans-contract-staleness-test');
  writeRel(tmp, '.godplans/PLAN.mdx', godplans11Plan());
  writeRel(tmp, '.godplans/validate-plan.sh', TEST_PLAN_VALIDATOR);
  fs.chmodSync(path.join(tmp, '.godplans', 'validate-plan.sh'), 0o755);
  planningSystems.importPlanningContext(tmp);

  writeRel(tmp, '.godplans/GODPOWERS-SYNC.mdx', '# Generated sync back\n');
  let drift = siblingArtifacts.staleness(tmp, state.read(tmp));
  assert(drift.length === 1 && drift[0].stale === false,
    'sync-back companion caused false Godplans drift');

  fs.chmodSync(path.join(tmp, '.godplans', 'validate-plan.sh'), 0o644);
  drift = siblingArtifacts.staleness(tmp, state.read(tmp));
  assert(drift[0].stale === true, 'validator executable-mode drift was missed');

  fs.chmodSync(path.join(tmp, '.godplans', 'validate-plan.sh'), 0o755);
  fs.appendFileSync(path.join(tmp, '.godplans', 'validate-plan.sh'), '# changed\n');
  drift = siblingArtifacts.staleness(tmp, state.read(tmp));
  assert(drift[0].stale === true, 'changed validator did not stale the import');
});

test('state.detectDrift emits WARN sibling-stale drift after a plan edit', () => {
  const tmp = mkProject('godpowers-sibling-');
  state.init(tmp, 'sibling-drift-test');
  writeRel(tmp, '.godplans/PLAN.mdx', PLAN_FIXTURE);
  planningSystems.importPlanningContext(tmp);
  assert(!state.detectDrift(tmp).some((entry) => entry.kind === 'sibling-stale'),
    'fresh import should not drift');

  fs.appendFileSync(path.join(tmp, '.godplans', 'PLAN.mdx'), '\n- 2026-07-03 replanned.\n');
  const drift = state.detectDrift(tmp).filter((entry) => entry.kind === 'sibling-stale');
  assert(drift.length === 1, `sibling drift entries: ${drift.length}`);
  assert(drift[0].severity === 'WARN', `severity: ${drift[0].severity}`);
  assert(drift[0].subStepKey === 'godplans', `subStepKey: ${drift[0].subStepKey}`);
  assert(drift[0].message.includes('run /god-migrate to re-import'), 'message missing action');
});

test('godaudits staleness follows canonical JSON and ignores generated MDX changes', () => {
  const tmp = mkProject('godpowers-sibling-');
  state.init(tmp, 'godaudits-staleness-test');
  writeRel(tmp, '.godaudits/AUDIT.json', AUDIT_JSON_FIXTURE);
  writeRel(tmp, '.godaudits/AUDIT.mdx', AUDIT_FIXTURE);
  planningSystems.importPlanningContext(tmp);

  fs.appendFileSync(path.join(tmp, '.godaudits', 'AUDIT.mdx'), '\nGenerated view refreshed.\n');
  let drift = siblingArtifacts.staleness(tmp, state.read(tmp));
  assert(drift.length === 1 && drift[0].stale === false, 'generated MDX caused false drift');

  const changed = JSON.parse(AUDIT_JSON_FIXTURE);
  changed.audit.updated = '2026-07-14';
  writeRel(tmp, '.godaudits/AUDIT.json', JSON.stringify(changed, null, 2));
  drift = siblingArtifacts.staleness(tmp, state.read(tmp));
  assert(drift[0].stale === true, 'canonical JSON change did not cause drift');
});

console.log('\n  Planning-system integration for sibling artifacts\n');

test('planning-systems reads Godplans beyond the foreign-file sampling cap', () => {
  const tmp = mkProject('godpowers-large-plan-');
  const filler = `${'Plan-specific context stays readable.\n'.repeat(4000)}\n`;
  const plan = godplans11Plan().replace('## Requirements', `${filler}## Requirements`);
  assert(Buffer.byteLength(plan) > 80 * 1024, 'large PLAN fixture is not large');
  writeRel(tmp, '.godplans/PLAN.mdx', plan);
  const detection = planningSystems.detect(tmp);
  const godplans = detection.systems.find((system) => system.id === 'godplans');
  const record = godplans && godplans.files.find((file) => file.path === '.godplans/PLAN.mdx');
  assert(record && record.bytes === Buffer.byteLength(plan),
    `PLAN bytes were truncated: ${record && record.bytes}`);
  assert(record.plan && record.plan.validation.valid,
    `large PLAN validation: ${record && record.plan.validation.errors.join('; ')}`);
});

test('plan-derived seeds preserve GP tasks beyond the old six-signal cap', () => {
  const tmp = mkProject('godpowers-plan-seed-depth-');
  state.init(tmp, 'godplans-seed-depth-test');
  writeRel(tmp, '.godplans/PLAN.mdx', godplans11Plan('approved', 10));
  planningSystems.importPlanningContext(tmp);
  const roadmap = fs.readFileSync(path.join(tmp, '.godpowers', 'roadmap', 'ROADMAP.mdx'), 'utf8');
  const build = fs.readFileSync(path.join(tmp, '.godpowers', 'prep', 'IMPORTED-BUILD-STATE.mdx'), 'utf8');
  const prd = fs.readFileSync(path.join(tmp, '.godpowers', 'prd', 'PRD.mdx'), 'utf8');
  assert(roadmap.includes('GP-110'), 'roadmap seed dropped the tenth GP task');
  assert(build.includes('GP-110'), 'build seed dropped the tenth GP task');
  assert(prd.includes('GP-110'), 'PRD seed dropped GP traceability');
  assert(roadmap.includes('Verify: npm run release:check'), 'Verify command was not preserved');
  assert(roadmap.includes('Reuses: existing release check'), 'Reuses field was not preserved');
});

test('planning-systems detects godplans with forced high confidence', () => {
  const tmp = mkProject('godpowers-sibling-');
  writeRel(tmp, '.godplans/PLAN.mdx', PLAN_FIXTURE);
  const result = planningSystems.detect(tmp);
  const godplans = result.systems.find((system) => system.id === 'godplans');
  assert(godplans, 'godplans not detected');
  assert(godplans.confidence === 'high', `confidence: ${godplans.confidence}`);
  assert(godplans.files.some((file) => file.path === '.godplans/PLAN.mdx'), 'PLAN.mdx missing from files');
});

test('planning-systems detects godaudits with forced high confidence', () => {
  const tmp = mkProject('godpowers-sibling-');
  writeRel(tmp, '.godaudits/AUDIT.json', AUDIT_JSON_FIXTURE);
  writeRel(tmp, '.godaudits/AUDIT.mdx', AUDIT_FIXTURE);
  const result = planningSystems.detect(tmp);
  const godaudits = result.systems.find((system) => system.id === 'godaudits');
  assert(godaudits, 'godaudits not detected');
  assert(godaudits.confidence === 'high', `confidence: ${godaudits.confidence}`);
  assert(godaudits.files.length === 1 && godaudits.files[0].path === '.godaudits/AUDIT.json',
    `files: ${godaudits.files.map((file) => file.path)}`);
});

test('planning-systems reads complete canonical audits beyond the foreign-file cap', () => {
  const tmp = mkProject('godpowers-sibling-');
  const large = JSON.parse(AUDIT_JSON_FIXTURE);
  large.evidence[0].quote = 'x'.repeat(96 * 1024);
  writeRel(tmp, '.godaudits/AUDIT.json', JSON.stringify(large, null, 2));
  const godaudits = planningSystems.detect(tmp).systems.find((system) => system.id === 'godaudits');
  assert(godaudits.files[0].bytes > 80 * 1024, `bytes: ${godaudits.files[0].bytes}`);
  assert(godaudits.files[0].signals.some((signal) => signal.includes('F-SEC-1')),
    `finding signals: ${godaudits.files[0].signals}`);
  assert(godaudits.files[0].signals.some((signal) => signal.includes('GA-101')),
    `task signals: ${godaudits.files[0].signals}`);
});

test('planning-systems keeps legacy godaudits MD fallback high confidence', () => {
  const tmp = mkProject('godpowers-sibling-');
  writeRel(tmp, '.godaudits/AUDIT.md', AUDIT_FIXTURE);
  const godaudits = planningSystems.detect(tmp).systems.find((system) => system.id === 'godaudits');
  assert(godaudits && godaudits.confidence === 'high',
    `confidence: ${godaudits && godaudits.confidence}`);
});

test('classifyFile maps GP/R ids to plan kinds and GA/A/F ids to audit', () => {
  const planKinds = planningSystems._private.classifyFile('.godplans/PLAN.mdx', PLAN_FIXTURE);
  assert(planKinds.includes('plan'), `plan kinds: ${planKinds}`);
  assert(planKinds.includes('requirements'), `plan kinds: ${planKinds}`);
  assert(planKinds.includes('roadmap'), `plan kinds: ${planKinds}`);
  const auditKinds = planningSystems._private.classifyFile('.godaudits/AUDIT.mdx', AUDIT_FIXTURE);
  assert(auditKinds.includes('audit'), `audit kinds: ${auditKinds}`);
  const auditJsonKinds = planningSystems._private.classifyFile('.godaudits/AUDIT.json', AUDIT_JSON_FIXTURE);
  assert(auditJsonKinds.includes('audit'), `audit JSON kinds: ${auditJsonKinds}`);
  const findingOnlyKinds = planningSystems._private.classifyFile(
    '.godaudits/AUDIT.json',
    JSON.stringify({ findings: [{ id: 'F-SEC-9', status: 'open' }], tasks: [] })
  );
  assert(findingOnlyKinds.includes('audit'), `finding-only JSON kinds: ${findingOnlyKinds}`);
});

test('importPlanningContext seeds harden findings from AUDIT.mdx', () => {
  const tmp = mkProject('godpowers-sibling-');
  state.init(tmp, 'sibling-import-test');
  writeRel(tmp, '.godaudits/AUDIT.mdx', AUDIT_FIXTURE);
  const result = planningSystems.importPlanningContext(tmp);
  assert(result.writtenArtifacts.includes('harden/FINDINGS.mdx'), 'harden seed not written');
  const seed = fs.readFileSync(path.join(tmp, '.godpowers', 'harden', 'FINDINGS.mdx'), 'utf8');
  assert(seed.includes('GA-101'), 'GA id not preserved verbatim in seed');
  assert(seed.includes('[DECISION] Imported signal'), 'audit signals should be decision-grade');
  const nextState = state.read(tmp);
  assert(nextState.tiers['tier-3'].harden.status === 'imported', 'harden not marked imported');
});

test('importPlanningContext seeds harden findings from canonical AUDIT.json', () => {
  const tmp = mkProject('godpowers-sibling-');
  state.init(tmp, 'sibling-json-import-test');
  writeRel(tmp, '.godaudits/AUDIT.json', AUDIT_JSON_FIXTURE);
  const result = planningSystems.importPlanningContext(tmp);
  assert(result.writtenArtifacts.includes('harden/FINDINGS.mdx'), 'harden seed not written');
  const seed = fs.readFileSync(path.join(tmp, '.godpowers', 'harden', 'FINDINGS.mdx'), 'utf8');
  assert(seed.includes('GA-101'), 'GA id not preserved from JSON');
  assert(seed.includes('F-SEC-1'), 'finding id not preserved from JSON');
});

test('importPlanningContext syncs open GA tasks into an idempotent managed todo section', () => {
  const tmp = mkProject('godpowers-sibling-');
  state.init(tmp, 'sibling-json-todo-test');
  writeRel(tmp, '.godaudits/AUDIT.json', AUDIT_JSON_FIXTURE);
  writeRel(tmp, '.godpowers/todos/TODOS.mdx', '# Todos\n\n- [ ] [P3] User-owned todo.\n');

  let result = planningSystems.importPlanningContext(tmp);
  assert(result.remediationTodos.written === true && result.remediationTodos.openCount === 1,
    `todo result: ${JSON.stringify(result.remediationTodos)}`);
  result = planningSystems.importPlanningContext(tmp);
  assert(result.remediationTodos.reason === 'unchanged',
    `idempotent result: ${JSON.stringify(result.remediationTodos)}`);
  let todos = fs.readFileSync(path.join(tmp, '.godpowers', 'todos', 'TODOS.mdx'), 'utf8');
  assert(todos.includes('- [ ] [P3] User-owned todo.'), 'user-owned todo was not preserved');
  assert((todos.match(/GODPOWERS:GODAUDITS-TODOS:BEGIN/g) || []).length === 1,
    'managed todo section duplicated');
  assert((todos.match(/GA-101/g) || []).length === 1, 'GA task duplicated');
  assert(todos.includes('- [ ] [P0] [DECISION] GA-101'), 'Critical task priority missing');
  assert(todos.includes('node --test test/security.test.js'), 'Verify command missing');

  const resolved = JSON.parse(AUDIT_JSON_FIXTURE);
  resolved.tasks.find((task) => task.id === 'GA-101').status = 'done';
  resolved.findings[0].status = 'resolved';
  writeRel(tmp, '.godaudits/AUDIT.json', JSON.stringify(resolved, null, 2));
  result = planningSystems.importPlanningContext(tmp);
  assert(result.remediationTodos.openCount === 0, `open count: ${result.remediationTodos.openCount}`);
  todos = fs.readFileSync(path.join(tmp, '.godpowers', 'todos', 'TODOS.mdx'), 'utf8');
  assert(!todos.includes('GA-101'), 'resolved GA task remained in managed todos');
  assert(todos.includes('no open GA remediation tasks'), 'empty managed state missing');
});

test('importPlanningContext escapes authored JSON before writing MDX artifacts', () => {
  const tmp = mkProject('godpowers-sibling-');
  state.init(tmp, 'sibling-json-mdx-safety-test');
  const unsafe = JSON.parse(AUDIT_JSON_FIXTURE);
  unsafe.findings[0].title = 'Unsafe {expression} <Finding />';
  unsafe.tasks[0].title = 'Fix [link] <Task />';
  unsafe.tasks[0].verify = 'node -e `unsafe` {expression}';
  writeRel(tmp, '.godaudits/AUDIT.json', JSON.stringify(unsafe, null, 2));
  planningSystems.importPlanningContext(tmp);
  const seed = fs.readFileSync(path.join(tmp, '.godpowers', 'harden', 'FINDINGS.mdx'), 'utf8');
  const todos = fs.readFileSync(path.join(tmp, '.godpowers', 'todos', 'TODOS.mdx'), 'utf8');
  assert(!seed.includes('<Finding') && !seed.includes('{expression}'), 'unsafe finding text reached MDX');
  assert(!todos.includes('<Task') && !todos.includes('`unsafe`'), 'unsafe task text reached MDX');
  assert(seed.includes('&lt;Finding /&gt;') && todos.includes('&lt;Task /&gt;'),
    'escaped MDX text missing');
});

test('writeGodauditsTodos preserves files with a corrupt managed boundary', () => {
  const tmp = mkProject('godpowers-sibling-');
  state.init(tmp, 'sibling-json-todo-boundary-test');
  writeRel(tmp, '.godaudits/AUDIT.json', AUDIT_JSON_FIXTURE);
  const original = '# Todos\n\n<!-- GODPOWERS:GODAUDITS-TODOS:BEGIN -->\n- [ ] User content.\n';
  writeRel(tmp, '.godpowers/todos/TODOS.mdx', original);
  const result = planningSystems.importPlanningContext(tmp);
  assert(result.remediationTodos.reason === 'managed-section-corrupt',
    `reason: ${result.remediationTodos.reason}`);
  const current = fs.readFileSync(path.join(tmp, '.godpowers', 'todos', 'TODOS.mdx'), 'utf8');
  assert(current === original, 'corrupt managed boundary should fail without writing');
});

test('importPlanningContext preserves GP/R ids in plan-derived seeds', () => {
  const tmp = mkProject('godpowers-sibling-');
  state.init(tmp, 'sibling-import-test');
  writeRel(tmp, '.godplans/PLAN.mdx', PLAN_FIXTURE);
  const result = planningSystems.importPlanningContext(tmp);
  assert(result.writtenArtifacts.includes('prd/PRD.mdx'), 'PRD seed not written');
  const seed = fs.readFileSync(path.join(tmp, '.godpowers', 'prd', 'PRD.mdx'), 'utf8');
  assert(seed.includes('GP-102'), 'GP id not preserved verbatim in seed');
  assert(seed.includes('[HYPOTHESIS] Imported signal'),
    'legacy plan without validator should remain hypothesis-grade');
});

test('IMPORTED-CONTEXT carries recounted sibling sections and enumeration', () => {
  const tmp = mkProject('godpowers-sibling-');
  state.init(tmp, 'sibling-context-test');
  writeRel(tmp, '.godplans/PLAN.mdx', PLAN_FIXTURE);
  writeRel(tmp, '.godaudits/AUDIT.mdx', AUDIT_FIXTURE);
  planningSystems.importPlanningContext(tmp);
  const imported = fs.readFileSync(path.join(tmp, '.godpowers', 'prep', 'IMPORTED-CONTEXT.mdx'), 'utf8');
  assert(imported.includes('## Executable Plan Signals'), 'plan section missing');
  assert(imported.includes('## Audit Signals'), 'audit section missing');
  assert(imported.includes('2 total, 1 done, 1 open'), 'plan recount missing');
  assert(imported.includes('[DECISION] Source system: godplans.'), 'godplans source missing');
  assert(imported.includes('godplans, or godaudits source documents'), 'sync-back enumeration missing');
});

test('IMPORTED-CONTEXT enumeration covers godplans/godaudits when nothing found', () => {
  const tmp = mkProject('godpowers-sibling-');
  state.init(tmp, 'sibling-empty-test');
  planningSystems.importPlanningContext(tmp);
  const imported = fs.readFileSync(path.join(tmp, '.godpowers', 'prep', 'IMPORTED-CONTEXT.mdx'), 'utf8');
  assert(imported.includes('No legacy planning, BMAD, Superpowers, Arc-Ready, godplans, or godaudits planning context was detected.'),
    'updated enumeration string missing');
  assert(imported.includes('No godplans master plan was detected.'), 'plan absence line missing');
});

test('source-sync writes .mdx companions for sibling systems, never PLAN.mdx', () => {
  const tmp = mkProject('godpowers-sibling-');
  state.init(tmp, 'sibling-sync-test');
  writeRel(tmp, '.godplans/PLAN.mdx', PLAN_FIXTURE);
  planningSystems.importPlanningContext(tmp);

  const result = sourceSync.run(tmp);
  const godplans = result.results.find((entry) => entry.system === 'godplans');
  assert(godplans, 'godplans sync target missing');
  assert(godplans.companion === '.godplans/GODPOWERS-SYNC.mdx', `companion: ${godplans.companion}`);
  assert(godplans.pointers.length === 0, 'sibling dirs must not receive pointer fences');
  assert(fs.existsSync(path.join(tmp, '.godplans', 'GODPOWERS-SYNC.mdx')), 'companion not written');
  const plan = fs.readFileSync(path.join(tmp, '.godplans', 'PLAN.mdx'), 'utf8');
  assert(plan === PLAN_FIXTURE, 'PLAN.mdx must never be rewritten by sync-back');
});

test('feature-awareness skips greenfieldifier spawn for sibling candidates', () => {
  const tmp = mkProject('godpowers-sibling-');
  state.init(tmp, 'sibling-awareness-test');
  // A .godplans dir without the canonical PLAN.mdx detects at low confidence;
  // sibling systems must still not route to the greenfieldifier judgment path.
  writeRel(tmp, '.godplans/notes.md', '# Notes\n\nScratch planning notes.\n');
  const result = featureAwareness.detect(tmp);
  const candidate = result.migrationCandidates.find((system) => system.id === 'godplans');
  assert(candidate, 'godplans migration candidate missing');
  assert(candidate.confidence === 'low', `confidence: ${candidate.confidence}`);
  assert(result.spawnRecommendation === null, 'sibling candidate should not spawn greenfieldifier');
});

console.log('\n  Linkage and impact integration\n');

test('linkage.classifyId knows the sibling id grammars', () => {
  assert(linkage.classifyId('GP-101') === 'planTask', 'GP id misclassified');
  assert(linkage.classifyId('R-SEC-12') === 'planRequirement', 'R-<DOM>-n misclassified');
  assert(linkage.classifyId('R-1.1') === 'planRequirement', 'R-n.n misclassified');
  assert(linkage.classifyId('A-SEC-3') === 'auditCheck', 'A id misclassified');
  assert(linkage.classifyId('F-SEC-1') === 'auditFinding', 'F id misclassified');
  assert(linkage.classifyId('GA-101') === 'remediation', 'GA id misclassified');
  assert(linkage.classifyId('P-MUST-01') === 'prd', 'existing prd grammar broken');
  assert(linkage.classifyId('R-XYZ-1') === 'unknown', 'non-domain R id should stay unknown');
});

test('cross-artifact-impact warns when plan ids are dropped', () => {
  const tmp = mkProject('godpowers-sibling-');
  const newPlan = PLAN_FIXTURE.split('\n')
    .filter((line) => !line.includes('GP-102'))
    .join('\n');
  const suggestions = crossImpact.suggestArtifactReviews(tmp, 'plan', PLAN_FIXTURE, newPlan);
  const prd = suggestions.find((entry) => entry.targetType === 'prd');
  assert(prd, 'prd suggestion missing');
  assert(prd.severity === 'warning', `severity: ${prd.severity}`);
  assert(prd.reason.includes('plan id(s)'), `reason: ${prd.reason}`);
  const roadmap = suggestions.find((entry) => entry.targetType === 'roadmap');
  assert(roadmap, 'roadmap suggestion missing');
  assert(crossImpact.suggestArtifactReviews(tmp, 'plan', PLAN_FIXTURE, PLAN_FIXTURE).length === 0,
    'unchanged plan should not suggest reviews');
});

test('cross-artifact-impact flags resolved GA ids for harden re-check', () => {
  const tmp = mkProject('godpowers-sibling-');
  const newAudit = AUDIT_FIXTURE.replace('- [ ] GA-101', '- [x] GA-101');
  const suggestions = crossImpact.suggestArtifactReviews(tmp, 'audit', AUDIT_FIXTURE, newAudit);
  const harden = suggestions.find((entry) => entry.targetType === 'harden');
  assert(harden, 'harden suggestion missing');
  assert(harden.severity === 'info', `severity: ${harden.severity}`);
  assert(harden.reason.includes('GA remediation id(s)'), `reason: ${harden.reason}`);
});

test('cross-artifact-impact detects typed JSON task completion', () => {
  const tmp = mkProject('godpowers-sibling-');
  const next = JSON.parse(AUDIT_JSON_FIXTURE);
  next.tasks.find((task) => task.id === 'GA-101').status = 'done';
  const suggestions = crossImpact.suggestArtifactReviews(
    tmp,
    'audit',
    AUDIT_JSON_FIXTURE,
    JSON.stringify(next, null, 2)
  );
  const harden = suggestions.find((entry) => entry.targetType === 'harden');
  assert(harden, 'harden suggestion missing for JSON completion');
});

report();
