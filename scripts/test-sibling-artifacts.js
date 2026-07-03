#!/usr/bin/env node
/**
 * Behavioral tests for lib/sibling-artifacts.js (the godplans/godaudits
 * PLAN.mdx / AUDIT.mdx parser) and its integration seams: planning-systems
 * detection and import, linkage id grammars, cross-artifact impact rules,
 * source-sync companions, feature-awareness spawn exclusion, and state
 * drift on stale imports.
 */

const fs = require('fs');
const path = require('path');

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

console.log('\n  Planning-system integration for sibling artifacts\n');

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
  writeRel(tmp, '.godaudits/AUDIT.mdx', AUDIT_FIXTURE);
  const result = planningSystems.detect(tmp);
  const godaudits = result.systems.find((system) => system.id === 'godaudits');
  assert(godaudits, 'godaudits not detected');
  assert(godaudits.confidence === 'high', `confidence: ${godaudits.confidence}`);
});

test('classifyFile maps GP/R ids to plan kinds and GA/A/F ids to audit', () => {
  const planKinds = planningSystems._private.classifyFile('.godplans/PLAN.mdx', PLAN_FIXTURE);
  assert(planKinds.includes('plan'), `plan kinds: ${planKinds}`);
  assert(planKinds.includes('requirements'), `plan kinds: ${planKinds}`);
  assert(planKinds.includes('roadmap'), `plan kinds: ${planKinds}`);
  const auditKinds = planningSystems._private.classifyFile('.godaudits/AUDIT.mdx', AUDIT_FIXTURE);
  assert(auditKinds.includes('audit'), `audit kinds: ${auditKinds}`);
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

test('importPlanningContext preserves GP/R ids in plan-derived seeds', () => {
  const tmp = mkProject('godpowers-sibling-');
  state.init(tmp, 'sibling-import-test');
  writeRel(tmp, '.godplans/PLAN.mdx', PLAN_FIXTURE);
  const result = planningSystems.importPlanningContext(tmp);
  assert(result.writtenArtifacts.includes('prd/PRD.mdx'), 'PRD seed not written');
  const seed = fs.readFileSync(path.join(tmp, '.godpowers', 'prd', 'PRD.mdx'), 'utf8');
  assert(seed.includes('GP-102'), 'GP id not preserved verbatim in seed');
  assert(seed.includes('[DECISION] Imported signal'), 'plan signals should be decision-grade');
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
  assert(imported.includes('No legacy planning, BMAD, Superpowers, godplans, or godaudits planning context was detected.'),
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

report();
