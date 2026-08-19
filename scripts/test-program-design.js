#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const programDesign = require('../lib/program-design');
const events = require('../lib/events');
const { test, assert, mkProject, writeRel, report } = require('./test-harness');

function completePlan(scale = 'large', approval = 'user-authorized') {
  return [
    '---',
    'stage: build-plan',
    `scale: ${scale}`,
    `program_design_approval: ${approval}`,
    '---',
    '',
    '# Build Plan: Example',
    '',
    '## Scale And Approval',
    '',
    `- [DECISION] Scale: ${scale}, because this changes two runtime boundaries.`,
    '- [DECISION] Approval: the user approved this program design.',
    '',
    '## Program Design',
    '',
    '### File Tree Delta',
    '',
    '- [DECISION] Add `lib/example.js` and `scripts/test-example.js`.',
    '',
    '### Module Boundaries',
    '',
    '- [DECISION] `lib/example.js` owns validation and no workflow state.',
    '',
    '### Public Contracts',
    '',
    '- [DECISION] Export `validate(input)` with a stable result.',
    '',
    '### Call And Data Flow',
    '',
    '1. [DECISION] The gate reads the plan and invokes validation.',
    '',
    '### Caller Usage',
    '',
    '- [DECISION] The build gate calls `validateText(plan)` and reads its plain-object verdict.',
    '',
    '### Interface Burden',
    '',
    '- [DECISION] Callers provide only plan text and do not configure parsing rules.',
    '',
    '### Seam Justification',
    '',
    '- [DECISION] Text validation is the seam because plans are Markdown while gates require deterministic checks.',
    '',
    '### Alternative Shapes',
    '',
    '- [DECISION] Alternative A: validate required headings only, which misses semantic omissions.',
    '- [DECISION] Alternative B: parse plans into a full AST, which adds dependency and maintenance cost.',
    '- [DECISION] Selected shape: validate bounded section semantics with the existing dependency-free parser.',
    '',
    '### Deviation Return Rule',
    '',
    '- [DECISION] When the same plan deviation occurs twice, stop production edits and return to planning.',
    '',
    '### Reused Patterns',
    '',
    '- [DECISION] Reuse `lib/frontmatter.js` and the test harness.',
    '',
    '### Non-Goals',
    '',
    '- [DECISION] Do not add a dependency or another state store.',
    '',
    '### Verification Points',
    '',
    '- [DECISION] Run `node scripts/test-example.js` before closeout.'
  ].join('\n');
}

function approvedPlanFile(project, text, rel = '.godpowers/build/PLAN.mdx') {
  writeRel(project, rel, text);
  const run = events.startRun(project, { purpose: 'program-design-test' });
  run.emit({
    span_id: run.rootSpanId,
    name: 'user.resolve',
    attrs: {
      subject: 'program-design',
      decision: 'approved',
      artifact: rel,
      artifactHash: programDesign.planHash(text),
      reviewer: 'user'
    }
  });
  return path.join(project, rel);
}

test('P-MUST-26: a labeled large plan with complete approved program design passes', () => {
  const project = mkProject('godpowers-program-design-approved-');
  const file = approvedPlanFile(project, completePlan());
  const result = programDesign.validateFile(file, { mode: 'human', projectRoot: project });
  assert(result.verdict === 'pass', JSON.stringify(result.findings));
  assert(result.scale === 'large', `unexpected scale: ${result.scale}`);
  assert(result.approval.status === 'approved', JSON.stringify(result.approval));
  assert(result.approval.reviewer === 'user', JSON.stringify(result.approval));
  assert(result.checks.length >= 9 && result.checks.every((check) => check.status === 'pass'),
    JSON.stringify(result.checks));
});

test('medium plans fail when required program design sections are absent', () => {
  const text = completePlan('medium')
    .replace(/### Module Boundaries[\s\S]*?(?=### Public Contracts)/, '')
    .replace(/### Verification Points[\s\S]*$/, '');
  const result = programDesign.validateText(text, { mode: 'human' });
  assert(result.verdict === 'fail', 'incomplete medium plan should fail');
  assert(result.findings.some((finding) => finding.id === 'program-design:module-boundaries'),
    JSON.stringify(result.findings));
  assert(result.findings.some((finding) => finding.id === 'program-design:verification-points'),
    JSON.stringify(result.findings));
});

test('larger plans require the code-shape sections inside Program Design', () => {
  const text = completePlan('large').replace('## Program Design\n\n', '## Implementation Notes\n\n');
  const result = programDesign.validateText(text, { mode: 'human' });
  assert(result.verdict === 'fail', 'headings outside Program Design must not satisfy the contract');
  assert(result.findings.some((finding) => finding.id === 'program-design:file-tree-delta'),
    JSON.stringify(result.findings));
});

test('P-MUST-46: medium and large plans require caller and design-pressure sections', () => {
  for (const scale of ['medium', 'large']) {
    for (const [heading, id] of [
      ['Caller Usage', 'caller-usage'],
      ['Interface Burden', 'interface-burden'],
      ['Seam Justification', 'seam-justification'],
      ['Alternative Shapes', 'alternative-shapes'],
      ['Deviation Return Rule', 'deviation-return-rule']
    ]) {
      const pattern = new RegExp(`### ${heading}[\\s\\S]*?(?=### )`);
      const result = programDesign.validateText(completePlan(scale).replace(pattern, ''), {
        mode: 'human'
      });
      assert(result.verdict === 'fail', `${scale} plan passed without ${heading}`);
      assert(result.findings.some((finding) => finding.id === `program-design:${id}`),
        JSON.stringify(result.findings));
    }
  }
});

test('P-MUST-46: Alternative Shapes requires two distinct alternatives and one selected shape', () => {
  const oneAlternative = completePlan().replace(
    '- [DECISION] Alternative B: parse plans into a full AST, which adds dependency and maintenance cost.\n',
    ''
  );
  const duplicateAlternatives = completePlan().replace(
    'Alternative B: parse plans into a full AST, which adds dependency and maintenance cost.',
    'Alternative B: validate required headings only, which misses semantic omissions.'
  );
  const noSelectedShape = completePlan().replace(
    '- [DECISION] Selected shape: validate bounded section semantics with the existing dependency-free parser.\n',
    ''
  );

  for (const [name, text, expectedId] of [
    ['one alternative', oneAlternative, 'program-design:alternative-shapes:distinct'],
    ['duplicate alternatives', duplicateAlternatives, 'program-design:alternative-shapes:distinct'],
    ['no selected shape', noSelectedShape, 'program-design:alternative-shapes:selected']
  ]) {
    const result = programDesign.validateText(text, { mode: 'human' });
    assert(result.verdict === 'fail', `${name} should fail`);
    assert(result.findings.some((finding) => finding.id === expectedId),
      JSON.stringify(result.findings));
  }
});

test('P-MUST-46: Deviation Return Rule stops editing and returns after the same deviation twice', () => {
  const weakRules = [
    'When a plan deviation occurs, notify the planner.',
    'When the same plan deviation occurs twice, continue editing and report it at closeout.',
    'When deviations recur, stop production edits and return to planning.',
    'When the same plan deviation occurs twice, continue production edits. Later, stop production edits and return to planning.',
    'When the same plan deviation occurs twice, stop reviewing and return to planning. Production edits may proceed.',
    'When the same plan deviation occurs twice, stop reviewing but allow production edits and return to planning.',
    'When the same plan deviation occurs twice, do not stop production edits or return to planning.',
    'When the same plan deviation occurs twice, stop production edits but do not return to planning.'
  ];

  for (const rule of weakRules) {
    const text = completePlan().replace(
      'When the same plan deviation occurs twice, stop production edits and return to planning.',
      rule
    );
    const result = programDesign.validateText(text, { mode: 'human' });
    assert(result.verdict === 'fail', `weak deviation rule passed: ${rule}`);
    assert(result.findings.some((finding) => finding.id === 'program-design:deviation-return-rule:semantics'),
      JSON.stringify(result.findings));
  }
});

test('small plans require both sizing and program design skip rationales', () => {
  const missing = programDesign.validateText([
    '---',
    'scale: small',
    '---',
    '# Small Build Plan',
    '## Scale And Approval',
    '- [DECISION] Scale: small.'
  ].join('\n'));
  assert(missing.verdict === 'fail', 'small plan without rationales should fail');
  assert(missing.findings.some((finding) => finding.id === 'program-design:sizing-rationale'),
    JSON.stringify(missing.findings));
  assert(missing.findings.some((finding) => finding.id === 'program-design:skip-rationale'),
    JSON.stringify(missing.findings));

  const complete = programDesign.validateText([
    '---',
    'scale: small',
    '---',
    '# Small Build Plan',
    '## Scale And Approval',
    '- [DECISION] Scale: small.',
    '- [DECISION] Sizing rationale: one module and one focused test change.',
    '- [DECISION] Program design skip rationale: no module boundary or public contract changes.'
  ].join('\n'));
  assert(complete.verdict === 'pass', JSON.stringify(complete.findings));
  assert(complete.approval.status === 'not-required', JSON.stringify(complete.approval));
});

test('human mode rejects a larger plan without recorded approval', () => {
  const result = programDesign.validateText(
    completePlan('large', 'pending').replace('the user approved this program design', 'approval is pending'),
    { mode: 'human' }
  );
  assert(result.verdict === 'fail', 'pending approval should fail');
  assert(result.findings.some((finding) => finding.id === 'program-design:approval'),
    JSON.stringify(result.findings));
});

test('human mode rejects negated or misplaced approval evidence', () => {
  for (const text of [
    'the user has not approved this program design',
    'the user is not authorized to approve this program design',
    'no user approved this program design',
    "the user hasn't approved this program design",
    'the user approved nothing in this program design',
    'the user expressly refused permission even though the author marked it approved'
  ]) {
    const result = programDesign.validateText(
      completePlan('large').replace('the user approved this program design', text),
      { mode: 'human' }
    );
    assert(result.verdict === 'fail', `negated approval passed: ${text}`);
  }

  const misplaced = completePlan('large')
    .replace('- [DECISION] Approval: the user approved this program design.\n', '')
    .replace('### Non-Goals\n\n', '### Non-Goals\n\n- [DECISION] Approval: the user approved this program design.\n');
  const result = programDesign.validateText(misplaced, { mode: 'human' });
  assert(result.verdict === 'fail', 'approval outside Scale And Approval passed');
});

test('yolo mode requires ledger auto-approval and rationale', () => {
  const text = completePlan('medium', 'yolo');
  const missing = programDesign.validateText(text, { mode: 'yolo', yoloLedgerText: '' });
  assert(missing.verdict === 'fail', 'missing YOLO ledger evidence should fail');

  const approved = programDesign.validateText(text, {
    mode: 'yolo',
    yoloLedgerText: [
      '# YOLO Decisions Log',
      '## Tier 2 / Program Design',
      '- Auto-picked: approve the program design before execution',
      '- Reason: every required code-shape section is present and mechanically validated.'
    ].join('\n')
  });
  assert(approved.verdict === 'pass', JSON.stringify(approved.findings));
  assert(approved.approval.mode === 'yolo' && approved.approval.rationale,
    JSON.stringify(approved.approval));

  const unrelated = programDesign.validateText(text, {
    mode: 'yolo',
    yoloLedgerText: [
      '# YOLO Decisions Log',
      '## Tier 2 / Program Design',
      '- Auto-picked: approve the program design before execution',
      '## Tier 1 / Stack',
      '- Reason: the repository already uses Node.js.'
    ].join('\n')
  });
  assert(unrelated.verdict === 'fail', 'an unrelated ledger reason must not approve program design');

  for (const decision of [
    'reject this incomplete program design',
    'do not approve this program design',
    'approve nothing in this program design'
  ]) {
    const rejected = programDesign.validateText(text, {
      mode: 'yolo',
      yoloLedgerText: [
        '# YOLO Decisions Log',
        '## Tier 2 / Program Design',
        `- Auto-picked: ${decision}`,
        '- Reason: this fixture verifies negative approval semantics.'
      ].join('\n')
    });
    assert(rejected.verdict === 'fail', `negative YOLO decision passed: ${decision}`);
  }
});

test('validateFile reads the plan and the project YOLO ledger', () => {
  const project = mkProject('godpowers-program-design-');
  writeRel(project, '.godpowers/build/PLAN.mdx', completePlan('large', 'yolo'));
  writeRel(project, '.godpowers/YOLO-DECISIONS.mdx', [
    '# YOLO Decisions Log',
    '## Tier 2 / Program Design',
    '- Auto-picked: approve program design before execution',
    '- Reason: required boundaries and verification points are complete.'
  ].join('\n'));
  const file = path.join(project, '.godpowers/build/PLAN.mdx');
  const result = programDesign.validateFile(file, { mode: 'yolo', projectRoot: project });
  assert(result.verdict === 'pass', JSON.stringify(result.findings));
  assert(fs.existsSync(file), 'validateFile must not mutate the plan');
});

test('the repository feature build plan satisfies the program design contract', () => {
  const source = path.resolve(__dirname, '..', '.godpowers', 'features',
    'harness-quality-hardening', 'BUILD-PLAN.mdx');
  const project = mkProject('godpowers-program-design-feature-');
  const text = fs.readFileSync(source, 'utf8');
  const file = approvedPlanFile(project, text);
  const result = programDesign.validateFile(file, { mode: 'human', projectRoot: project });
  assert(result.verdict === 'pass', JSON.stringify(result.findings));
});

test('P-MUST-46: the authoritative approved build plan satisfies its own program design contract', () => {
  const root = path.resolve(__dirname, '..');
  const source = path.join(root, '.godpowers', 'build', 'PLAN.mdx');
  const result = programDesign.validateFile(source, { mode: 'human', projectRoot: root });
  assert(result.verdict === 'pass', JSON.stringify(result.findings));
  assert(result.approval.status === 'approved', JSON.stringify(result.approval));
});

test('P-MUST-46: planner executor reviewers and runbook return repeated deviations to planning', () => {
  const root = path.resolve(__dirname, '..');
  const planner = fs.readFileSync(path.join(root, 'specialists', 'god-planner.md'), 'utf8');
  const executor = fs.readFileSync(path.join(root, 'specialists', 'god-executor.md'), 'utf8');
  const specReviewer = fs.readFileSync(path.join(root, 'specialists', 'god-spec-reviewer.md'), 'utf8');
  const qualityReviewer = fs.readFileSync(path.join(root, 'specialists', 'god-quality-reviewer.md'), 'utf8');
  const runbook = fs.readFileSync(path.join(root, 'references', 'orchestration',
    'GOD-ORCHESTRATOR-RUNBOOK.md'), 'utf8');
  assert(/lib\/program-design\.validateFile/.test(planner), 'planner must name mechanical validation');
  assert(/before (?:any )?production edit/i.test(executor), 'executor must validate before production edits');
  assert(/program.design approval/i.test(specReviewer), 'reviewer must verify program design approval');
  assert(/## Program design before Build execution/.test(runbook), 'runbook program design section missing');
  for (const [name, contract] of [
    ['planner', planner],
    ['executor', executor],
    ['spec reviewer', specReviewer],
    ['quality reviewer', qualityReviewer],
    ['runbook', runbook]
  ]) {
    assert(
      /same\s+plan\s+deviation[\s\S]{0,80}\btwice[\s\S]{0,160}\bstop\s+(?:production\s+)?edit[\s\S]{0,80}\breturn\s+to\s+(?:the\s+)?plann(?:er|ing)/i
        .test(contract),
      `${name} must stop editing and return repeated deviations to planning`
    );
  }
});

report('Program design tests');
