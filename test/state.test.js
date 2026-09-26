const test = require('node:test');
const assert = require('node:assert/strict');

const stateStore = require('../lib/state');
const templates = require('../lib/templates');
const { tempDir, write, read } = require('./helpers');

const messages = diags => diags.map(d => `${d.severity}: ${d.message}`).join('\n');

test('parses sections, goal, next, and risk lines', () => {
  const text = templates.stateTemplate({
    project: 'demo',
    goal: 'Ship a demo.',
    verify: 'npm test',
    now: ['Building auth.'],
    next: ['Finish slice 2.'],
    risks: ['- [ ] critical: SQL injection in /search', '- [x] high: no rate limit (fixed)', '- [ ] Medium: weak default config']
  });
  const state = stateStore.parse(text);
  assert.equal(state.data.project, 'demo');
  assert.equal(state.goal, 'Ship a demo.');
  assert.equal(state.now, '- Building auth.');
  assert.equal(state.next, '- Finish slice 2.');
  assert.deepEqual(state.risks.map(r => [r.open, r.severity, r.text]), [
    [true, 'critical', 'SQL injection in /search'],
    [false, 'high', 'no rate limit (fixed)'],
    [true, 'medium', 'weak default config']
  ]);
  assert.equal(stateStore.openRisks(state).length, 2);
  assert.equal(stateStore.openRisks(state, 'critical').length, 1);
  assert.deepEqual(stateStore.validate(state), []);
});

test('flags malformed risk lines with their line numbers', () => {
  const text = templates.stateTemplate({ project: 'demo', goal: 'x', verify: 'npm test', risks: ['- sql injection somewhere', '- none'] });
  const state = stateStore.parse(text);
  const errors = stateStore.validate(state).filter(d => d.severity === 'error');
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /risk lines must look like/);
  assert.equal(text.split('\n')[errors[0].line - 1], '- sql injection somewhere');
});

test('validates required frontmatter and warns on gaps', () => {
  assert.match(messages(stateStore.validate(stateStore.parse('# no frontmatter'))), /needs frontmatter/);
  const bad = stateStore.parse('---\ngodpowers: 6\nstage: shipping\ngate: maybe\nextra: 1\n---\n# x\n');
  const text = messages(stateStore.validate(bad));
  assert.match(text, /error: frontmatter "godpowers" must be 7/);
  assert.match(text, /error: frontmatter "project" is required/);
  assert.match(text, /error: frontmatter "stage" must be one of/);
  assert.match(text, /error: frontmatter "gate" must be on or off/);
  assert.match(text, /warning: frontmatter "verify" is empty/);
  assert.match(text, /warning: unknown frontmatter key "extra"/);
  assert.match(text, /warning: missing "## Goal" section/);
  assert.match(text, /warning: missing "## Next" section/);
  const placeholder = stateStore.parse(templates.stateTemplate({ project: 'p', verify: 'x' }));
  assert.match(messages(stateStore.validate(placeholder)), /warning: Goal is not set/);
  const nested = stateStore.parse('---\ngodpowers: 7\nproject: p\nstage: plan\nverify: x\nstages:\n  plan: done\n---\n## Goal\ng\n## Next\nn\n');
  assert.match(messages(stateStore.validate(nested)), /error: unsupported frontmatter line/);
});

test('setFields updates frontmatter, keeps the body, and rejects bad stages', () => {
  const root = tempDir();
  write(root, '.godpowers/STATE.md', templates.stateTemplate({ project: 'demo', goal: 'Keep me.', verify: 'npm test', date: '2020-01-01' }));
  const data = stateStore.setFields(root, { stage: 'review' });
  assert.equal(data.stage, 'review');
  assert.notEqual(data.updated, '2020-01-01');
  const after = stateStore.read(root);
  assert.equal(after.data.stage, 'review');
  assert.equal(after.goal, 'Keep me.');
  assert.throws(() => stateStore.setFields(root, { stage: 'launch' }), /stage must be one of/);
  write(root, '.godpowers/STATE.md', '# no frontmatter\n');
  assert.throws(() => stateStore.setFields(root, { stage: 'plan' }), /no frontmatter/);
  assert.match(read(root, '.godpowers/STATE.md'), /no frontmatter/);
});

test('read returns null without STATE.md', () => {
  assert.equal(stateStore.read(tempDir()), null);
});
