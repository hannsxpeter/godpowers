#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const whyEvidence = require('../lib/why-evidence');
const { test, assert, report } = require('./test-harness');

function completeRecord(overrides = {}) {
  return {
    target: 'lib/router.js',
    claim: 'The router keeps command selection separate from command execution.',
    confidence: 'medium',
    evidence: [
      {
        kind: 'fact',
        category: 'code-structure',
        source: 'lib/router.js:1',
        target: 'lib/router.js',
        statement: 'The module exports route selection functions and does not execute commands.'
      },
      {
        kind: 'inference',
        category: 'git-history',
        source: 'git:3a80ef4:lib/router.js',
        target: 'lib/router.js',
        statement: 'The introducing commit grouped router changes with routing metadata checks.'
      }
    ],
    ...overrides
  };
}

console.log('\n  Why evidence tests\n');

test('P-MUST-47: accepts cited, confidence-calibrated evidence from independent categories', () => {
  const result = whyEvidence.validateWhyEvidence(completeRecord());
  assert(result.verdict === 'pass', JSON.stringify(result.findings));
  assert(result.target === 'lib/router.js', JSON.stringify(result));
  assert(result.confidence === 'medium', JSON.stringify(result));
  assert(result.evidence.length === 2, JSON.stringify(result.evidence));
  assert(result.evidence.some((item) => item.kind === 'fact'), JSON.stringify(result.evidence));
  assert(result.evidence.some((item) => item.kind === 'inference'), JSON.stringify(result.evidence));
  assert(result.checks.length > 0 && result.checks.every((check) => check.status === 'pass'),
    JSON.stringify(result.checks));
});

test('fails closed for null, malformed, or missing why evidence', () => {
  for (const record of [null, [], 'lib/router.js', 42, true]) {
    const result = whyEvidence.validateWhyEvidence(record);
    assert(result.verdict === 'fail', `malformed record passed: ${JSON.stringify(record)}`);
    assert(result.findings.some((finding) => finding.id === 'why-evidence:input'),
      JSON.stringify(result.findings));
  }

  for (const field of ['target', 'claim', 'confidence', 'evidence']) {
    const record = completeRecord();
    delete record[field];
    const result = whyEvidence.validateWhyEvidence(record);
    assert(result.verdict === 'fail', `record without ${field} passed`);
    assert(result.findings.some((finding) => finding.id.startsWith(`why-evidence:${field}`)),
      `${field}: ${JSON.stringify(result.findings)}`);
  }
});

test('allows only bounded evidence categories and statement kinds', () => {
  const invalidCategory = completeRecord();
  invalidCategory.evidence[1].category = 'social-media';
  const categoryResult = whyEvidence.validateWhyEvidence(invalidCategory);
  assert(categoryResult.verdict === 'fail', 'unbounded evidence category passed');
  assert(categoryResult.findings.some((finding) => finding.id === 'why-evidence:item:1:category'),
    JSON.stringify(categoryResult.findings));

  const invalidKind = completeRecord();
  invalidKind.evidence[1].kind = 'opinion';
  const kindResult = whyEvidence.validateWhyEvidence(invalidKind);
  assert(kindResult.verdict === 'fail', 'unbounded statement kind passed');
  assert(kindResult.findings.some((finding) => finding.id === 'why-evidence:item:1:kind'),
    JSON.stringify(kindResult.findings));

  assert(JSON.stringify(whyEvidence.EVIDENCE_CATEGORIES) === JSON.stringify([
    'git-history',
    'code-structure',
    'tests',
    'docs-artifacts',
    'runtime'
  ]), JSON.stringify(whyEvidence.EVIDENCE_CATEGORIES));
  assert(JSON.stringify(whyEvidence.STATEMENT_KINDS) === JSON.stringify([
    'fact',
    'inference',
    'contradiction',
    'unknown'
  ]), JSON.stringify(whyEvidence.STATEMENT_KINDS));
});

test('rejects uncited, duplicate-source, and single-category overclaims', () => {
  const uncited = completeRecord();
  uncited.evidence[0].source = '';
  const uncitedResult = whyEvidence.validateWhyEvidence(uncited);
  assert(uncitedResult.verdict === 'fail', 'uncited evidence passed');
  assert(uncitedResult.findings.some((finding) => finding.id === 'why-evidence:item:0:source'),
    JSON.stringify(uncitedResult.findings));

  const duplicateSource = completeRecord();
  duplicateSource.evidence[1].source = duplicateSource.evidence[0].source;
  const duplicateResult = whyEvidence.validateWhyEvidence(duplicateSource);
  assert(duplicateResult.verdict === 'fail', 'duplicate-source evidence passed');
  assert(duplicateResult.findings.some((finding) => finding.id === 'why-evidence:source-diversity'),
    JSON.stringify(duplicateResult.findings));

  const singleCategory = completeRecord();
  singleCategory.evidence[1].category = singleCategory.evidence[0].category;
  const categoryResult = whyEvidence.validateWhyEvidence(singleCategory);
  assert(categoryResult.verdict === 'fail', 'single-category overclaim passed');
  assert(categoryResult.findings.some((finding) => finding.id === 'why-evidence:category-diversity'),
    JSON.stringify(categoryResult.findings));

  const whitespaceVariant = completeRecord();
  whitespaceVariant.evidence[1].source = `  ${whitespaceVariant.evidence[0].source}  `;
  const whitespaceResult = whyEvidence.validateWhyEvidence(whitespaceVariant);
  assert(whitespaceResult.verdict === 'fail', 'whitespace-variant duplicate source passed');
  assert(whitespaceResult.findings.some((finding) => finding.id === 'why-evidence:source-diversity'),
    JSON.stringify(whitespaceResult.findings));
});

test('rejects target mismatch, contradiction, and unknown evidence', () => {
  const mismatched = completeRecord();
  mismatched.evidence[1].target = 'lib/events.js';
  const mismatchResult = whyEvidence.validateWhyEvidence(mismatched);
  assert(mismatchResult.verdict === 'fail', 'target mismatch passed');
  assert(mismatchResult.findings.some((finding) => finding.id === 'why-evidence:item:1:target'),
    JSON.stringify(mismatchResult.findings));

  for (const kind of ['contradiction', 'unknown']) {
    const record = completeRecord();
    record.evidence[1].kind = kind;
    const result = whyEvidence.validateWhyEvidence(record);
    assert(result.verdict === 'fail', `${kind} evidence passed`);
    assert(result.findings.some((finding) => finding.id === `why-evidence:${kind}`),
      `${kind}: ${JSON.stringify(result.findings)}`);
    assert(result.evidence[1].kind === kind, `${kind} classification was lost`);
  }
});

test('requires stronger source diversity for high-confidence conclusions', () => {
  const overclaim = completeRecord({ confidence: 'high' });
  const overclaimResult = whyEvidence.validateWhyEvidence(overclaim);
  assert(overclaimResult.verdict === 'fail', 'two-category high-confidence claim passed');
  assert(overclaimResult.findings.some((finding) => finding.id === 'why-evidence:confidence-calibration'),
    JSON.stringify(overclaimResult.findings));

  const calibrated = completeRecord({
    confidence: 'high',
    evidence: [
      ...completeRecord().evidence,
      {
        kind: 'fact',
        category: 'tests',
        source: 'scripts/test-router.js:1',
        target: 'lib/router.js',
        statement: 'Focused router tests assert selection behavior independently of execution.'
      }
    ]
  });
  const calibratedResult = whyEvidence.validateWhyEvidence(calibrated);
  assert(calibratedResult.verdict === 'pass', JSON.stringify(calibratedResult.findings));

  const invalid = whyEvidence.validateWhyEvidence(completeRecord({ confidence: 'certain' }));
  assert(invalid.verdict === 'fail', 'invalid confidence passed');
  assert(invalid.findings.some((finding) => finding.id === 'why-evidence:confidence'),
    JSON.stringify(invalid.findings));
});

test('returns allowlisted evidence objects without unknown fields or primitive values', () => {
  const extraField = completeRecord();
  extraField.evidence[0].debugMetadata = { harmless: 'ignored detail' };
  const extraResult = whyEvidence.validateWhyEvidence(extraField);
  assert(extraResult.verdict === 'pass', JSON.stringify(extraResult.findings));
  assert(JSON.stringify(Object.keys(extraResult.evidence[0]).sort()) === JSON.stringify([
    'category', 'kind', 'source', 'statement', 'target'
  ]), JSON.stringify(extraResult.evidence[0]));
  assert(!JSON.stringify(extraResult).includes('debugMetadata'), JSON.stringify(extraResult));

  const primitive = completeRecord();
  primitive.evidence[0] = 'primitive-output-must-not-return';
  const primitiveResult = whyEvidence.validateWhyEvidence(primitive);
  assert(primitiveResult.verdict === 'fail', 'primitive evidence passed');
  assert(primitiveResult.evidence.every((item) => item && typeof item === 'object'
    && !Array.isArray(item)), JSON.stringify(primitiveResult.evidence));
  assert(!JSON.stringify(primitiveResult).includes('primitive-output-must-not-return'),
    JSON.stringify(primitiveResult));

  const sparse = completeRecord();
  delete sparse.evidence[0];
  const sparseResult = whyEvidence.validateWhyEvidence(sparse);
  assert(sparseResult.verdict === 'fail', 'sparse evidence passed');
  assert(Object.keys(sparseResult.evidence).length === sparseResult.evidence.length,
    `sparse output retained array holes: ${JSON.stringify(sparseResult.evidence)}`);
  assert(sparseResult.evidence.every((item) => item && typeof item === 'object'
    && !Array.isArray(item)), JSON.stringify(sparseResult.evidence));
});

test('recursively rejects common secret fields and values without echoing input', () => {
  const cases = [
    {
      secret: 'ghp_abcdefghijklmnopqrstuvwxyz123456',
      apply(record, secret) { record.claim = `Decision referenced ${secret}`; }
    },
    {
      secret: 'sk-proj-abcdefghijklmnopqrstuvwxyz123456',
      apply(record, secret) { record.target = secret; record.evidence.forEach((item) => { item.target = secret; }); }
    },
    {
      secret: 'Authorization: Bearer top-secret-token-value',
      apply(record, secret) { record.evidence[0].statement = secret; }
    },
    {
      secret: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signaturevalue',
      apply(record, secret) { record.evidence[0].source = secret; }
    },
    {
      secret: '-----BEGIN PRIVATE KEY-----',
      apply(record, secret) { record.evidence[0].nested = { value: secret }; }
    },
    {
      secret: 'password-field-value',
      apply(record, secret) { record.diagnostics = { password: secret }; }
    },
    {
      secret: 'database-password-field-value',
      apply(record, secret) { record.diagnostics = { database_password: secret }; }
    },
    {
      secret: 'secret-field-value',
      apply(record, secret) { record.diagnostics = { secret: secret }; }
    },
    {
      secret: 'session=secret-cookie-value',
      apply(record, secret) { record.evidence[0].nested = { cookie: secret }; }
    }
  ];

  for (const item of cases) {
    const record = completeRecord();
    item.apply(record, item.secret);
    const result = whyEvidence.validateWhyEvidence(record);
    const rendered = JSON.stringify(result);
    assert(result.verdict === 'fail', 'secret-bearing evidence passed');
    assert(result.findings.some((finding) => finding.id === 'why-evidence:secret-safety'),
      JSON.stringify(result.findings));
    assert(!rendered.includes(item.secret), `raw secret leaked from result: ${rendered}`);
    assert(result.evidence.length === 0, `unsafe evidence was allocated: ${rendered}`);
  }
});

test('rejects oversized records before allocating returned evidence', () => {
  const tooMany = completeRecord({
    evidence: Array.from({ length: whyEvidence.MAX_EVIDENCE_ITEMS + 1 }, (_, index) => ({
      kind: 'fact',
      category: index % 2 === 0 ? 'code-structure' : 'tests',
      source: `lib/router.js:${index + 1}`,
      target: 'lib/router.js',
      statement: 'This material statement exists only to exercise the explicit evidence count bound.'
    }))
  });
  const countResult = whyEvidence.validateWhyEvidence(tooMany);
  assert(countResult.verdict === 'fail', 'oversized evidence array passed');
  assert(countResult.findings.some((finding) => finding.id === 'why-evidence:evidence-count'),
    JSON.stringify(countResult.findings));
  assert(countResult.evidence.length === 0, 'oversized evidence was allocated');

  const fieldCases = [
    ['target', whyEvidence.MAX_TARGET_LENGTH],
    ['claim', whyEvidence.MAX_CLAIM_LENGTH],
    ['source', whyEvidence.MAX_SOURCE_LENGTH],
    ['statement', whyEvidence.MAX_STATEMENT_LENGTH]
  ];
  for (const [field, limit] of fieldCases) {
    const record = completeRecord();
    if (field === 'target') {
      record.target = 'x'.repeat(limit + 1);
      record.evidence.forEach((evidence) => { evidence.target = record.target; });
    } else if (field === 'claim') {
      record.claim = 'x'.repeat(limit + 1);
    } else {
      record.evidence[0][field] = 'x'.repeat(limit + 1);
    }
    const result = whyEvidence.validateWhyEvidence(record);
    assert(result.verdict === 'fail', `oversized ${field} passed`);
    assert(result.findings.some((finding) => finding.id === 'why-evidence:string-bounds'),
      `${field}: ${JSON.stringify(result.findings)}`);
    assert(result.evidence.length === 0, `oversized ${field} evidence was allocated`);
  }

  const nested = completeRecord();
  nested.evidence[0].unknown = { value: 'x'.repeat(whyEvidence.MAX_INPUT_STRING_LENGTH + 1) };
  const nestedResult = whyEvidence.validateWhyEvidence(nested);
  assert(nestedResult.verdict === 'fail', 'oversized nested input passed');
  assert(nestedResult.evidence.length === 0, 'oversized nested input was allocated');
});

test('wires optional --why behavior without changing the default archaeology report', () => {
  const root = path.resolve(__dirname, '..');
  const skill = fs.readFileSync(path.join(root, 'skills', 'god-archaeology.md'), 'utf8');
  const specialist = fs.readFileSync(path.join(root, 'specialists', 'god-archaeologist.md'), 'utf8');
  const route = fs.readFileSync(path.join(root, 'routing', 'god-archaeology.yaml'), 'utf8');
  const combined = `${skill}\n${specialist}`;

  assert(combined.includes('--why <target>'), 'optional --why form is missing');
  assert(combined.includes('lib/why-evidence.js') && combined.includes('validateWhyEvidence'),
    'why evidence validator is not wired into cold-context contracts');
  for (const kind of ['fact', 'inference', 'contradiction', 'unknown']) {
    assert(new RegExp(`\\b${kind}\\b`, 'i').test(combined), `${kind} output classification is missing`);
  }
  for (const category of whyEvidence.EVIDENCE_CATEGORIES) {
    assert(combined.includes(category), `${category} evidence category is missing`);
  }
  assert(/preserve|unchanged/i.test(combined) && /without `--why`|when `--why` is absent/i.test(combined),
    'default archaeology compatibility contract is missing');
  assert(/no raw secrets|redact/i.test(combined), 'secret safety contract is missing');
  assert(/description:.*--why/i.test(route), 'route does not advertise optional why evidence');
  assert(/\.godpowers\/archaeology\/WHY\.mdx/.test(route), 'why artifact is missing from route writes');
  assert(/Implements: P-MUST-47/.test(combined), 'requirement traceability is missing');
});

test('registers the focused test and packaged why evidence validator', () => {
  const root = path.resolve(__dirname, '..');
  const runner = fs.readFileSync(path.join(root, 'scripts', 'run-tests.js'), 'utf8');
  const packageCheck = fs.readFileSync(path.join(root, 'scripts', 'check-package-contents.js'), 'utf8');
  assert(runner.includes("'scripts/test-why-evidence.js'"),
    'focused test is missing from the full test runner');
  assert(packageCheck.includes("'lib/why-evidence.js'"),
    'why evidence validator is missing from the package contents guard');
});

report('Why evidence tests');
