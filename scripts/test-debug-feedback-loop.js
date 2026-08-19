#!/usr/bin/env node
// Implements: P-MUST-45

const fs = require('fs');
const path = require('path');

const { test, assert, report } = require('./test-harness');

let debugFeedbackLoop = null;
let loadError = null;
try {
  debugFeedbackLoop = require('../lib/debug-feedback-loop');
} catch (error) {
  loadError = error;
}

const ROOT = path.resolve(__dirname, '..');

function validate(input) {
  assert(!loadError, `debug feedback-loop module failed to load: ${loadError && loadError.message}`);
  assert(debugFeedbackLoop && typeof debugFeedbackLoop.validateFeedbackLoop === 'function',
    'validateFeedbackLoop export is required');
  return debugFeedbackLoop.validateFeedbackLoop(input);
}

function baseRecord(overrides = {}) {
  return {
    type: 'direct',
    symptom: 'CLI exits 1 after parsing a valid config',
    command: 'node scripts/repro-config.js',
    executed: true,
    redCapable: true,
    agentRunnable: true,
    durationMs: 240,
    repeatability: { deterministic: true },
    evidence: {
      redacted: true,
      summary: 'The exact config parsing assertion failed with exit code 1.'
    },
    direct: {
      kind: 'test',
      target: 'scripts/repro-config.js'
    },
    ...overrides
  };
}

function inputWith(record, symptom = 'CLI exits 1 after parsing a valid config') {
  return { symptom, reproductions: [record] };
}

test('P-MUST-45: one executed deterministic direct test unlocks hypothesis formation', () => {
  const result = validate(inputWith(baseRecord()));
  assert(result.verdict === 'pass', JSON.stringify(result.findings));
  assert(result.candidate.index === 0 && result.candidate.type === 'direct',
    JSON.stringify(result.candidate));
  assert(result.checks.every((check) => check.status === 'pass'), JSON.stringify(result.checks));
});

test('a direct script is distinct from a direct test and remains valid', () => {
  const record = baseRecord({ direct: { kind: 'script', target: 'scripts/repro-config.js' } });
  const result = validate(inputWith(record));
  assert(result.verdict === 'pass', JSON.stringify(result.findings));
});

test('differential records require both sides and a distinguishing signal', () => {
  const record = baseRecord({
    type: 'differential',
    differential: {
      baseline: 'node cli.js --config fixtures/good.json',
      candidate: 'node cli.js --config fixtures/failing.json',
      distinguishingSignal: 'Only the candidate exits 1 with the exact parsing symptom.'
    }
  });
  delete record.direct;
  assert(validate(inputWith(record)).verdict === 'pass', 'complete differential record should pass');
  delete record.differential.baseline;
  const missing = validate(inputWith(record));
  assert(missing.verdict === 'fail', 'incomplete differential record should fail');
  assert(missing.findings.some((finding) => finding.id === 'reproduction:0:type-specific'),
    JSON.stringify(missing.findings));
});

test('bisection records require good and bad revisions plus a predicate', () => {
  const record = baseRecord({
    type: 'bisection',
    bisection: {
      goodRevision: 'abc1234',
      badRevision: 'def5678',
      predicate: 'node scripts/repro-config.js'
    }
  });
  delete record.direct;
  assert(validate(inputWith(record)).verdict === 'pass', 'complete bisection record should pass');
  record.bisection.badRevision = record.bisection.goodRevision;
  assert(validate(inputWith(record)).verdict === 'fail', 'identical revisions should fail');
});

test('fuzz and property records require a property, pinned seed, cases, and failing input summary', () => {
  const record = baseRecord({
    type: 'fuzz-property',
    fuzzProperty: {
      property: 'Every valid config parses without an error.',
      seed: 'config-seed-4821',
      cases: 500,
      failingInputSummary: 'A redacted nested-array config triggers the exact symptom.'
    }
  });
  delete record.direct;
  assert(validate(inputWith(record)).verdict === 'pass', 'complete fuzz/property record should pass');
  delete record.fuzzProperty.seed;
  assert(validate(inputWith(record)).verdict === 'fail', 'unpinned fuzz/property record should fail');
});

test('human-guided records require reset, ordered steps, and expected and actual observations', () => {
  const record = baseRecord({
    type: 'human-guided',
    humanGuided: {
      reset: 'node scripts/reset-debug-fixture.js',
      steps: [
        { action: 'Open the generated fixture.', expected: 'The config view loads.' },
        { action: 'Select Validate.', expected: 'The success state appears.' }
      ],
      expectedObservation: 'The success state appears.',
      actualObservation: 'The CLI exits 1 with the exact parsing symptom.'
    }
  });
  delete record.direct;
  assert(validate(inputWith(record)).verdict === 'pass', 'complete human-guided record should pass');
  record.humanGuided.steps[1] = { action: 'Select Validate.' };
  assert(validate(inputWith(record)).verdict === 'fail', 'unstructured human step should fail');
});

test('hypotheses remain blocked until one record matches the exact symptom', () => {
  const unrelated = baseRecord({ symptom: 'CLI prints a deprecation warning' });
  const failed = validate({
    symptom: 'CLI exits 1 after parsing a valid config',
    reproductions: [unrelated]
  });
  assert(failed.verdict === 'fail' && failed.candidate === null, JSON.stringify(failed));
  assert(failed.findings.some((finding) => finding.id === 'reproduction:0:exact-symptom'),
    JSON.stringify(failed.findings));

  const passed = validate({
    symptom: 'CLI exits 1 after parsing a valid config',
    reproductions: [unrelated, baseRecord()]
  });
  assert(passed.verdict === 'pass', JSON.stringify(passed.findings));
  assert(passed.candidate.index === 1, JSON.stringify(passed.candidate));
});

test('the qualifying command must already have executed and be red-capable', () => {
  for (const record of [baseRecord({ executed: false }), baseRecord({ redCapable: false })]) {
    const result = validate(inputWith(record));
    assert(result.verdict === 'fail', 'unexecuted or non-red-capable record passed');
  }
});

test('repeatability is deterministic or backed by a pinned high reproduction rate', () => {
  const flaky = baseRecord({
    repeatability: {
      deterministic: false,
      attempts: 10,
      symptomMatches: 9,
      minimumRate: 0.8
    }
  });
  assert(validate(inputWith(flaky)).verdict === 'pass', 'pinned 90 percent repro should pass');

  for (const repeatability of [
    { deterministic: false, attempts: 10, symptomMatches: 7, minimumRate: 0.8 },
    { deterministic: false, attempts: 10, symptomMatches: 9, minimumRate: 0.7 },
    { deterministic: false, attempts: 2, symptomMatches: 2, minimumRate: 0.8 },
    { deterministic: false, attempts: 10, symptomMatches: 11, minimumRate: 0.8 }
  ]) {
    const result = validate(inputWith(baseRecord({ repeatability })));
    assert(result.verdict === 'fail', `weak repeatability passed: ${JSON.stringify(repeatability)}`);
  }
});

test('the qualifying command is fast and agent-runnable', () => {
  const slow = validate(inputWith(baseRecord({ durationMs: 60001 })));
  assert(slow.verdict === 'fail', 'slow reproduction passed');
  assert(slow.findings.some((finding) => finding.id === 'reproduction:0:fast'),
    JSON.stringify(slow.findings));

  for (const record of [
    baseRecord({ agentRunnable: false }),
    baseRecord({ command: '' })
  ]) {
    const result = validate(inputWith(record));
    assert(result.verdict === 'fail', 'non-agent-runnable reproduction passed');
  }
});

test('evidence must be explicitly redacted and summarized', () => {
  for (const evidence of [
    { redacted: false, summary: 'Exact failure.' },
    { redacted: true, summary: '' },
    null
  ]) {
    const result = validate(inputWith(baseRecord({ evidence })));
    assert(result.verdict === 'fail', `unsafe evidence passed: ${JSON.stringify(evidence)}`);
    assert(result.findings.some((finding) => finding.id === 'reproduction:0:redacted-evidence'),
      JSON.stringify(result.findings));
  }
});

test('raw evidence fields and common secret shapes fail closed without echoing the value', () => {
  const githubToken = `ghp_${'a'.repeat(36)}`;
  const records = [
    baseRecord({ evidence: { redacted: true, summary: 'Exact failure.', stdout: 'raw output' } }),
    baseRecord({ command: `node repro.js --token=${githubToken}` }),
    baseRecord({ evidence: { redacted: true, summary: `authorization: Bearer ${githubToken}` } }),
    baseRecord({ apiKey: githubToken })
  ];
  for (const record of records) {
    const result = validate(inputWith(record));
    const serialized = JSON.stringify(result);
    assert(result.verdict === 'fail', 'secret-bearing record passed');
    assert(result.findings.some((finding) => finding.id === 'reproduction:0:secret-safety'),
      JSON.stringify(result.findings));
    assert(!serialized.includes(githubToken), 'validator response echoed a raw secret');
  }
});

test('one safe reproduction cannot mask an unsafe sibling record', () => {
  const githubToken = `ghp_${'b'.repeat(36)}`;
  const result = validate({
    symptom: 'CLI exits 1 after parsing a valid config',
    reproductions: [
      baseRecord(),
      baseRecord({ evidence: { redacted: true, summary: 'Exact failure.', token: githubToken } })
    ]
  });
  const serialized = JSON.stringify(result);
  assert(result.verdict === 'fail' && result.candidate === null, serialized);
  assert(result.findings.some((finding) => finding.id === 'reproduction:1:secret-safety'), serialized);
  assert(!serialized.includes(githubToken), 'validator response echoed a raw secret from a sibling record');
});

test('malformed and unknown records fail closed', () => {
  for (const input of [
    null,
    {},
    { symptom: 'x', reproductions: [] },
    { symptom: 'x', reproductions: [null] },
    { symptom: 'x', reproductions: [baseRecord({ type: 'custom' })] }
  ]) {
    const result = validate(input);
    assert(result.verdict === 'fail' && result.candidate === null, JSON.stringify(result));
  }
});

test('the debug skill and specialist make the feedback-loop gate load-bearing', () => {
  const skill = fs.readFileSync(path.join(ROOT, 'skills', 'god-debug.md'), 'utf8');
  const specialist = fs.readFileSync(path.join(ROOT, 'specialists', 'god-debugger.md'), 'utf8');
  for (const source of [skill, specialist]) {
    assert(/lib\/debug-feedback-loop\.validateFeedbackLoop/.test(source),
      'debug contract must name the mechanical validator');
    assert(/\.godpowers\/debug\/REPRO\.json/.test(source),
      'debug contract must name the reproduction artifact');
    assert(/before (?:forming|writing|proposing|listing) (?:a |any )?hypothes/i.test(source),
      'debug contract must block hypothesis formation');
    assert(/redacted/i.test(source) && /raw secrets/i.test(source),
      'debug contract must state evidence safety rules');
  }
});

test('the specialist documents every common and type-specific record field', () => {
  const specialist = fs.readFileSync(path.join(ROOT, 'specialists', 'god-debugger.md'), 'utf8');
  for (const field of [
    'type',
    'symptom',
    'command',
    'executed',
    'redCapable',
    'agentRunnable',
    'durationMs',
    'repeatability',
    'evidence.redacted',
    'evidence.summary',
    'direct.kind',
    'direct.target',
    'differential.baseline',
    'differential.candidate',
    'differential.distinguishingSignal',
    'bisection.goodRevision',
    'bisection.badRevision',
    'bisection.predicate',
    'fuzzProperty.property',
    'fuzzProperty.seed',
    'fuzzProperty.cases',
    'fuzzProperty.failingInputSummary',
    'humanGuided.reset',
    'humanGuided.steps',
    'humanGuided.expectedObservation',
    'humanGuided.actualObservation'
  ]) {
    assert(specialist.includes(`\`${field}\``), `specialist is missing record field ${field}`);
  }
});

test('the runtime and focused test are registered in package and full-suite checks', () => {
  const packageCheck = fs.readFileSync(path.join(ROOT, 'scripts', 'check-package-contents.js'), 'utf8');
  const runner = fs.readFileSync(path.join(ROOT, 'scripts', 'run-tests.js'), 'utf8');
  assert(packageCheck.includes("'lib/debug-feedback-loop.js'"), 'runtime package check is missing');
  assert(runner.includes("'scripts/test-debug-feedback-loop.js'"), 'focused test runner entry is missing');
});

report('Debug feedback-loop tests');
