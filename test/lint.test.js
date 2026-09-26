const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const lint = require('../lib/lint');
const templates = require('../lib/templates');
const { tempDir, write, git, stateText, v7Repo } = require('./helpers');

const errorsOf = result => result.diagnostics.filter(d => d.severity === 'error').map(d => d.message);

const GOOD_PLAN = [
  '# Plan',
  '',
  '## Goal',
  'Let editors publish drafts.',
  '',
  '## Requirements',
  '- R1: Publish a draft. Done when: a published draft returns 200 at its URL.',
  '',
  '## Slices',
  '- [x] 1. Publish endpoint: integration test',
  '- [ ] 2. Editor button: browser test',
  ''
].join('\n');

test('a fresh project lints clean', () => {
  const root = v7Repo();
  write(root, '.godpowers/PLAN.md', GOOD_PLAN);
  const result = lint.lintProject(root);
  assert.equal(result.layout, 'v7');
  assert.equal(result.errors, 0);
  assert.equal(result.warnings, 0);
  assert.match(lint.formatLint(result), /0 error\(s\), 0 warning\(s\)/);
});

test('plan structure: missing sections are errors, gaps are warnings', () => {
  const root = v7Repo();
  write(root, '.godpowers/PLAN.md', '# Plan\n\n## Requirements\n- R1: something vague\n');
  let result = lint.lintProject(root);
  assert.deepEqual(errorsOf(result), ['PLAN.md needs a "## Goal" section', 'PLAN.md needs a "## Slices" section']);
  assert.ok(result.diagnostics.some(d => d.message === 'requirement has no "Done when:" check'));
  write(root, '.godpowers/PLAN.md', templates.planTemplate({ goal: 'x' }).replace('- [ ] 1.', '- 1.'));
  result = lint.lintProject(root);
  const warnings = result.diagnostics.filter(d => d.severity === 'warning').map(d => d.message);
  assert.ok(warnings.includes('PLAN.md still has template placeholders'));
  assert.ok(warnings.some(w => w.startsWith('slice should be a checkbox line')));
});

test('decisions: heading format, order, and append-only against HEAD', () => {
  const root = v7Repo();
  const decisions = templates.decisionsTemplate({ entries: [
    { date: '2026-01-02', title: 'Use Postgres', why: 'Relational data' },
    { date: '2026-01-01', title: 'Older entry last', why: 'Out of order' }
  ] });
  write(root, '.godpowers/DECISIONS.md', `${decisions}## Bad heading\n`);
  let result = lint.lintProject(root);
  assert.deepEqual(errorsOf(result), ['decision headings must look like "## YYYY-MM-DD: title"']);
  assert.ok(result.diagnostics.some(d => d.message.startsWith('decisions are out of date order')));
  write(root, '.godpowers/DECISIONS.md', decisions);
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'decisions');
  write(root, '.godpowers/DECISIONS.md', `${decisions}## 2026-01-03: Appended\nWhy: fine\n`);
  assert.equal(lint.lintProject(root).errors, 0, 'appending is allowed');
  write(root, '.godpowers/DECISIONS.md', decisions.replace('Relational data', 'Rewritten history'));
  result = lint.lintProject(root);
  assert.match(errorsOf(result)[0], /append-only/);
});

test('state and ledger problems are errors; v6 and missing projects are reported', () => {
  const root = v7Repo();
  write(root, '.godpowers/STATE.md', stateText({ risks: ['- critical sql injection'] }));
  write(root, '.godpowers/evidence.jsonl', '{"broken"\n');
  const result = lint.lintProject(root);
  const errors = errorsOf(result);
  assert.ok(errors.some(e => e.startsWith('risk lines must look like')));
  assert.ok(errors.includes('evidence ledger: not valid JSON'));
  const v6 = tempDir();
  write(v6, '.godpowers/state.json', '{}');
  const legacy = lint.lintProject(v6);
  assert.equal(legacy.layout, 'v6');
  assert.equal(legacy.warnings, 1);
  assert.match(lint.formatLint(lint.lintProject(tempDir())), /No \.godpowers\/ project here/);
});

test('prose notes are advisory and hidden unless asked for', () => {
  const root = v7Repo();
  write(root, '.godpowers/PLAN.md', GOOD_PLAN.replace('Let editors publish drafts.', 'It is important to note that experts agree this is a game-changing solution.'));
  const result = lint.lintProject(root);
  assert.equal(result.errors, 0);
  assert.ok(result.notes >= 2);
  assert.match(lint.formatLint(result), /prose note\(s\) \(--notes to show\)/);
  assert.match(lint.formatLint(result, { showNotes: true }), /note\s+\.godpowers\/PLAN\.md:4\s+filler/);
  assert.ok(fs.existsSync(path.join(root, '.godpowers', 'PLAN.md')));
});
