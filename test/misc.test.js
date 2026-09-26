const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const budget = require('../lib/budget');
const status = require('../lib/status');
const prose = require('../lib/prose');
const paths = require('../lib/paths');
const evidence = require('../lib/evidence');
const { tempDir, write, stateText, v7Repo } = require('./helpers');

const SRC = path.join(__dirname, '..');

test('the shipped skills and agents stay within the prompt budget', () => {
  const result = budget.measure(SRC);
  assert.deepEqual(result.violations, []);
  assert.equal(result.files.length, 13);
  assert.ok(result.alwaysLoaded.tokens <= budget.BUDGETS.alwaysLoaded);
  assert.match(budget.formatBudget(result), /Within budget/);
});

test('budget flags oversized files, long or missing descriptions', () => {
  const src = tempDir();
  write(src, 'skills/god/SKILL.md', `---\nname: god\ndescription: ${'x'.repeat(400)}\n---\n${'word '.repeat(2000)}`);
  write(src, 'skills/godpowers/SKILL.md', '---\nname: godpowers\n---\nbody');
  write(src, 'agents/god-reviewer.md', `---\nname: god-reviewer\ndescription: ok\n---\n${'y'.repeat(9000)}`);
  const result = budget.measure(src);
  const text = result.violations.join('\n');
  assert.match(text, /skills\/god\/SKILL\.md: \d+ tokens \(limit 800\)/);
  assert.match(text, /description is 400 chars/);
  assert.match(text, /skills\/godpowers\/SKILL\.md: missing description/);
  assert.match(text, /agents\/god-reviewer\.md: \d+ tokens/);
  assert.match(budget.formatBudget(result), /Over budget/);
});

test('status collects and formats state, evidence, risks, and lint', async () => {
  const root = v7Repo();
  write(root, '.godpowers/STATE.md', stateText({ now: ['Slice 2'], risks: ['- [ ] critical: open door', '- [ ] low: typo'] }));
  await evidence.verify(root, 'node -e "process.exit(0)"');
  const info = status.collect(root);
  assert.equal(info.evidence.check, 'pass');
  assert.deepEqual(info.risks, { critical: 1, high: 0, medium: 0, low: 1 });
  const text = status.formatStatus(info);
  assert.match(text, /Checks: {2}passing on current code \(verify: node -e/);
  assert.match(text, /Risks: {3}1 critical, 1 low/);
  assert.match(status.brief(info), /open risks: 1 critical, 1 low/);
  write(root, '.godpowers/evidence.jsonl', 'junk\n');
  write(root, '.godpowers/STATE.md', stateText({ risks: ['- nonsense'] }));
  const broken = status.formatStatus(status.collect(root));
  assert.match(broken, /Lint: {4}2 error/);
  assert.match(broken, /Ledger: {2}1 invalid or edited record/);
  assert.equal(status.brief({ layout: 'v6' }), '');
  assert.equal(status.firstLine(`- ${'z'.repeat(300)}`).length, 160);
  write(root, '.godpowers/STATE.md', stateText({ verify: 'node -e "process.exit(1)"' }));
  write(root, '.godpowers/evidence.jsonl', '');
  await evidence.verify(root, 'node -e "process.exit(1)"');
  assert.match(status.formatStatus(status.collect(root)), /FAILING on current code/);
});

test('prose scanner finds sentence patterns and skips code', () => {
  const findings = prose.scan('It is important to note that the API works.\n```\nexperts agree\n```\nStudies show it is fine.\n');
  assert.deepEqual(findings.map(f => f.ruleId), ['filler', 'vague-attribution']);
  assert.deepEqual(prose.scan(''), []);
});

test('findProjectRoot walks up to .godpowers, then to git, then stays put', () => {
  const root = tempDir();
  write(root, '.godpowers/STATE.md', 'x');
  fs.mkdirSync(path.join(root, 'a/b'), { recursive: true });
  assert.equal(paths.findProjectRoot(path.join(root, 'a/b')), root);
  const repo = tempDir();
  fs.mkdirSync(path.join(repo, '.git'));
  fs.mkdirSync(path.join(repo, 'src'));
  assert.equal(paths.findProjectRoot(path.join(repo, 'src')), repo);
  const loose = tempDir();
  assert.equal(paths.findProjectRoot(loose), loose);
});
