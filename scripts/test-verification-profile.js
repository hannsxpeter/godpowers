#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const verification = require('../lib/verification-profile');
const productRouting = require('../lib/product-routing');
const { test, assert, report } = require('./test-harness');

function completeProfile(form) {
  return {
    form,
    launch: 'Start the release candidate through its documented public entry point.',
    doctor: 'Run a read-only readiness check against the exact instance under test.',
    drive: 'Exercise the primary job through the same interface a user controls.',
    evidence: 'Capture the user action, observable result, and material side effects.',
    cleanup: 'Stop only the instance created by this verification run and retain proof.',
    isolation: 'Use a clean consumer workspace with run-specific process and data state.',
    features: [{
      id: 'primary-job',
      userPath: 'A user starts from the documented public entry point.',
      drive: 'Invoke the primary operation through the documented public interface.',
      observableEndState: 'The user sees the documented primary job complete.'
    }],
    completionEvidence: productRouting.formDefinition(form).completionEvidence
  };
}

console.log('\n  Verification profile tests\n');

test('P-MUST-44: all six product forms accept a complete user-path verification profile', () => {
  for (const definition of productRouting.FORM_DEFINITIONS) {
    const result = verification.validateProfile(completeProfile(definition.id));
    assert(result.verdict === 'pass', `${definition.id}: ${JSON.stringify(result.findings)}`);
    assert(result.form === definition.id, `${definition.id}: ${JSON.stringify(result)}`);
    assert(JSON.stringify(result.completionEvidence) === JSON.stringify(definition.completionEvidence),
      `${definition.id}: wrong completion evidence`);
    assert(result.checks.length > 0 && result.checks.every((check) => check.status === 'pass'),
      `${definition.id}: ${JSON.stringify(result.checks)}`);
  }
});

test('requires launch, doctor, drive, evidence, cleanup, and isolation contracts', () => {
  for (const field of ['launch', 'doctor', 'drive', 'evidence', 'cleanup', 'isolation']) {
    const profile = completeProfile('cli-or-sdk');
    delete profile[field];
    const result = verification.validateProfile(profile);
    assert(result.verdict === 'fail', `${field} omission passed`);
    assert(result.findings.some((finding) => finding.id === `verification-profile:${field}`),
      `${field}: ${JSON.stringify(result.findings)}`);
  }
});

test('rejects generic or placeholder lifecycle and feature contracts', () => {
  for (const value of ['x', 'todo', 'tests pass', 'works', 'todo todo todo todo todo todo']) {
    const profile = completeProfile('cli-or-sdk');
    for (const field of ['launch', 'doctor', 'drive', 'evidence', 'cleanup', 'isolation']) {
      profile[field] = value;
    }
    profile.features[0] = {
      id: value,
      userPath: value,
      drive: value,
      observableEndState: value
    };
    const result = verification.validateProfile(profile);
    assert(result.verdict === 'fail', `generic profile passed for ${value}`);
    assert(result.findings.some((finding) => finding.id === 'verification-profile:launch'),
      JSON.stringify(result.findings));
    assert(result.findings.some((finding) => finding.id === 'verification-profile:feature:0:userPath'),
      JSON.stringify(result.findings));
  }
});

test('rejects malformed top-level profile values without throwing', () => {
  for (const profile of [null, [], 'cli-or-sdk', 42, true]) {
    const result = verification.validateProfile(profile);
    assert(result.verdict === 'fail', `malformed profile passed: ${JSON.stringify(profile)}`);
    assert(result.findings.some((finding) => finding.id === 'verification-profile:input'),
      JSON.stringify(result.findings));
  }
});

test('requires at least one user-facing feature with a reachable and observable drive path', () => {
  const empty = completeProfile('web-application');
  empty.features = [];
  const emptyResult = verification.validateProfile(empty);
  assert(emptyResult.verdict === 'fail', 'empty feature map passed');
  assert(emptyResult.findings.some((finding) => finding.id === 'verification-profile:feature-map'),
    JSON.stringify(emptyResult.findings));

  for (const field of ['id', 'userPath', 'drive', 'observableEndState']) {
    const profile = completeProfile('web-application');
    delete profile.features[0][field];
    const result = verification.validateProfile(profile);
    assert(result.verdict === 'fail', `feature without ${field} passed`);
    assert(result.findings.some((finding) => finding.id === `verification-profile:feature:0:${field}`),
      `${field}: ${JSON.stringify(result.findings)}`);
  }
});

test('rejects generic, partial, or wrong-form completion evidence', () => {
  const generic = completeProfile('cli-or-sdk');
  generic.completionEvidence = ['tests pass'];
  const genericResult = verification.validateProfile(generic);
  assert(genericResult.verdict === 'fail', 'generic evidence passed');
  assert(genericResult.findings.some((finding) => finding.id === 'verification-profile:completion-evidence'),
    JSON.stringify(genericResult.findings));

  const partial = completeProfile('data-or-ml');
  partial.completionEvidence = partial.completionEvidence.slice(0, -1);
  assert(verification.validateProfile(partial).verdict === 'fail', 'partial evidence passed');

  const wrongForm = completeProfile('infrastructure-or-iac');
  wrongForm.completionEvidence = productRouting.formDefinition('web-application').completionEvidence;
  assert(verification.validateProfile(wrongForm).verdict === 'fail', 'wrong-form evidence passed');

  for (const extra of [42, '', 'tests pass', productRouting.formDefinition('web-application').completionEvidence[0]]) {
    const malformed = completeProfile('cli-or-sdk');
    malformed.completionEvidence = [...malformed.completionEvidence, extra];
    const malformedResult = verification.validateProfile(malformed);
    assert(malformedResult.verdict === 'fail', `extra completion evidence passed: ${JSON.stringify(extra)}`);
    const finding = malformedResult.findings.find((item) => item.id === 'verification-profile:completion-evidence');
    assert(finding && /0 missing, 1 invalid or unexpected, and 0 duplicate items/.test(finding.reason),
      JSON.stringify(malformedResult.findings));
  }

  const duplicate = completeProfile('cli-or-sdk');
  duplicate.completionEvidence.push(duplicate.completionEvidence[0]);
  const duplicateResult = verification.validateProfile(duplicate);
  const duplicateFinding = duplicateResult.findings.find(
    (item) => item.id === 'verification-profile:completion-evidence');
  assert(duplicateResult.verdict === 'fail', 'duplicate completion evidence passed');
  assert(duplicateFinding && /0 missing, 0 invalid or unexpected, and 1 duplicate item/.test(
    duplicateFinding.reason), JSON.stringify(duplicateResult.findings));
});

test('rejects an unknown product form without throwing', () => {
  const profile = completeProfile('cli-or-sdk');
  profile.form = 'terminal-ish';
  const result = verification.validateProfile(profile);
  assert(result.verdict === 'fail' && result.form === null, JSON.stringify(result));
  assert(result.findings.some((finding) => finding.id === 'verification-profile:form'),
    JSON.stringify(result.findings));
});

test('rejects oversized feature and evidence collections before excess access', () => {
  for (const field of ['features', 'completionEvidence']) {
    const profile = completeProfile('cli-or-sdk');
    const maximum = field === 'features'
      ? verification.MAX_FEATURES
      : verification.MAX_COMPLETION_EVIDENCE;
    const collection = Array(maximum + 1).fill(field === 'features' ? profile.features[0] : 'tests pass');
    Object.defineProperty(collection, maximum, {
      enumerable: true,
      get() {
        throw new Error('unbounded verification collection access');
      }
    });
    profile[field] = collection;
    const result = verification.validateProfile(profile);
    assert(result.verdict === 'fail', `${field} overflow passed`);
    assert(result.findings.some((finding) =>
      finding.id === 'verification-profile:collection-bounds'), JSON.stringify(result));
    assert(result.checks.length <= 3, `overflow emitted unbounded checks: ${result.checks.length}`);
  }
});

test('keeps compatibility names while routing runtime verification across all product forms', () => {
  const root = path.resolve(__dirname, '..');
  const skill = fs.readFileSync(path.join(root, 'skills', 'god-test-runtime.md'), 'utf8');
  const specialist = fs.readFileSync(path.join(root, 'specialists', 'god-browser-tester.md'), 'utf8');
  const route = fs.readFileSync(path.join(root, 'routing', 'god-test-runtime.yaml'), 'utf8');
  const combined = `${skill}\n${specialist}`;

  assert(/^name: god-test-runtime$/m.test(skill), 'command skill compatibility name changed');
  assert(/^name: god-browser-tester$/m.test(specialist), 'specialist compatibility name changed');
  assert(/command: \/god-test-runtime/.test(route), 'route command compatibility name changed');
  assert(/spawns: \[god-browser-tester\]/.test(route), 'route specialist compatibility name changed');
  assert(/Cross-form runtime verification/.test(route), route);
  assert(/\.godpowers\/prd\/PRD\.mdx/.test(route), route);
  assert(!/\.godpowers\/design\/DESIGN\.mdx/.test(route), route);

  for (const definition of productRouting.FORM_DEFINITIONS) {
    assert(combined.includes(definition.id), `${definition.id} is missing from runtime contracts`);
  }
  for (const field of ['launch', 'doctor', 'drive', 'evidence', 'cleanup', 'isolation']) {
    assert(new RegExp(`\\b${field}\\b`, 'i').test(combined), `${field} contract is missing`);
  }
  assert(combined.includes('lib/verification-profile.js') && combined.includes('validateProfile'),
    'runtime profile validator is not wired into cold-context contracts');
  assert(/feature map/i.test(combined), 'feature map contract is missing');
  assert(/form-specific completion evidence/i.test(combined), 'form completion evidence is missing');
  assert(/retain(?:s|ed)? (?:the )?evidence|evidence (?:must )?survive/i.test(combined),
    'cleanup evidence retention is missing');
  for (const mode of ['test-only', 'audit-only', 'a11y-only']) {
    assert(combined.includes(mode), `existing ${mode} caller mode is missing`);
  }
  assert(/state\.json\.runtime/.test(specialist), 'runtime state update contract is missing');
  for (const event of [
    'runtime.start',
    'runtime.audit-complete',
    'runtime.test-complete',
    'runtime.critical',
    'runtime.end'
  ]) {
    assert(specialist.includes(event), `runtime event contract is missing ${event}`);
  }
});

test('registers the focused test and packaged runtime verifier in release checks', () => {
  const root = path.resolve(__dirname, '..');
  const runner = fs.readFileSync(path.join(root, 'scripts', 'run-tests.js'), 'utf8');
  const packageCheck = fs.readFileSync(path.join(root, 'scripts', 'check-package-contents.js'), 'utf8');
  assert(runner.includes("'scripts/test-verification-profile.js'"),
    'focused test is missing from the full test runner');
  assert(packageCheck.includes("'lib/verification-profile.js'"),
    'runtime verifier is missing from the package contents guard');
});

report('Verification profile tests');
