#!/usr/bin/env node
/**
 * Voice lint (sycophancy / gratitude-loop detector) tests.
 */

const fs = require('fs');
const path = require('path');
const voiceLint = require('../lib/voice-lint');
const validator = require('../lib/have-nots-validator');
const { test, assert, report } = require('./test-harness');

const ROOT = path.join(__dirname, '..');

console.log('\n  Voice lint tests\n');

test('flags praising the question', () => {
  const hits = voiceLint.scan('Great question! Here is the answer.');
  assert(hits.length === 1 && hits[0].patternId === 'praise-question', JSON.stringify(hits));
  assert(hits[0].line === 1 && hits[0].column === 1, `pos=${hits[0].line}:${hits[0].column}`);
});

test('flags thanking for the message', () => {
  assert(voiceLint.scan('Thanks for reaching out about this.').length === 1, 'thanks for reaching out');
  assert(voiceLint.scan('Thank you for your patience.').length === 1, 'thank you for your patience');
});

test('flags help-eagerness and hope-this-helps', () => {
  assert(voiceLint.hasSycophancy('I am happy to help with that.'), 'happy to help');
  assert(voiceLint.hasSycophancy('Hope this helps!'), 'hope this helps');
  assert(voiceLint.hasSycophancy('Glad I could help.'), 'glad i could help');
});

test('flags forced engagement', () => {
  assert(voiceLint.hasSycophancy('Let me know if you need anything else.'), 'let me know if you');
  assert(voiceLint.hasSycophancy('Feel free to reach out.'), 'feel free to reach');
  assert(voiceLint.hasSycophancy('Is there anything else I can do?'), 'is there anything else');
});

test('praise-question does not fire on the compound-noun sense', () => {
  for (const clean of [
    'The good question bank stores 40 items.',
    'Set the question type to multiple-choice.',
    'We bumped the great question count to 12.',
    'The excellent question format renders inline.'
  ]) {
    assert(voiceLint.scan(clean).length === 0, `false positive on: ${clean}`);
  }
  // Real praise still fires.
  assert(voiceLint.scan('Good question about the API design.').length === 1, 'genuine praise still flagged');
});

test('does not flag plain engineering communication', () => {
  const clean = [
    'Done. Tests pass; the migration is reversible. Next: run /god-ship.',
    'The build failed on Node 18 with a missing export; I fixed the import.',
    'DECISION: Use Postgres for the primary store; flip to DynamoDB above 5k/s.',
    'This question of scope is unresolved.'
  ].join('\n');
  assert(voiceLint.scan(clean).length === 0, `false positives: ${JSON.stringify(voiceLint.scan(clean))}`);
});

test('reports line numbers across multiple lines', () => {
  const hits = voiceLint.scan('line one is fine\nHappy to help with line two\nline three fine');
  assert(hits.length === 1 && hits[0].line === 2, JSON.stringify(hits));
});

test('handles empty and null input without throwing', () => {
  assert(voiceLint.scan('').length === 0, 'empty');
  assert(voiceLint.scan(null).length === 0, 'null');
  assert(voiceLint.scan(undefined).length === 0, 'undefined');
});

test('have-not U-14 wraps voice-lint into linter findings', () => {
  const findings = validator.checkSycophancy('Great question, happy to help!');
  assert(findings.length >= 1, 'produces findings');
  assert(findings.every((f) => f.code === 'U-14' && f.severity === 'warning'), JSON.stringify(findings));
  assert(/Sycophancy or gratitude loop/.test(findings[0].message), findings[0].message);
});

test('U-14 is registered as a universal check', () => {
  assert(validator.UNIVERSAL_CHECKS.some((c) => c.code === 'U-14'), 'U-14 in UNIVERSAL_CHECKS');
});

test('shipped skill and agent prose is already clean (self-dogfood)', () => {
  const offenders = [];
  for (const dir of ['skills', 'agents']) {
    const base = path.join(ROOT, dir);
    for (const file of fs.readdirSync(base).filter((name) => name.endsWith('.md'))) {
      for (const hit of voiceLint.scan(fs.readFileSync(path.join(base, file), 'utf8'))) {
        offenders.push(`${dir}/${file}:${hit.line} ("${hit.phrase}")`);
      }
    }
  }
  assert(offenders.length === 0, `sycophancy in shipped prose: ${offenders.join(', ')}`);
});

report();
