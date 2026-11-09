const test = require('node:test');
const assert = require('node:assert/strict');

const gate = require('../lib/gate');
const evidence = require('../lib/evidence');
const gitTools = require('../lib/git');
const fs = require('fs');
const path = require('path');
const { tempDir, write, git, gitRepo, stateText, v7Repo } = require('./helpers');

// The declared check passes unless CHECK_FAIL is set in the environment.
const CHECK = 'node check.js';
function checkedRepo(overrides = {}) {
  const root = v7Repo({ verify: CHECK, ...overrides });
  write(root, 'check.js', 'process.exit(process.env.CHECK_FAIL ? 1 : 0);\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'check');
  return root;
}
async function runCheck(root, { fail = false } = {}) {
  if (fail) process.env.CHECK_FAIL = '1';
  try {
    return await evidence.verify(root, CHECK);
  } finally {
    delete process.env.CHECK_FAIL;
  }
}

test('stop gate allows when nothing changed or the project is not godpowers 7', () => {
  assert.equal(gate.stopGate(tempDir()).block, false);
  const v6 = gitRepo();
  write(v6, '.godpowers/state.json', '{}');
  assert.equal(gate.stopGate(v6).reason, 'not a godpowers 7 project');
  const root = v7Repo();
  const result = gate.stopGate(root);
  assert.equal(result.block, false);
  assert.equal(result.reason, 'no code changed');
});

test('stop gate blocks a code change until the declared check passes on it', async () => {
  const root = checkedRepo();
  write(root, 'src/app.js', 'module.exports = 2;\n');
  let result = gate.stopGate(root);
  assert.equal(result.block, true);
  assert.match(result.reason, /No run of the project check \(node check\.js\) matches the current code/);
  assert.match(result.reason, /Changed: src\/app\.js/);
  assert.match(result.reason, /npx -y godpowers@7 verify`/, 'the hint uses plain verify, which runs the declared check');
  await evidence.verify(root, 'true');
  assert.equal(gate.stopGate(root).block, true, 'another command does not satisfy the gate');
  await runCheck(root, { fail: true });
  result = gate.stopGate(root);
  assert.equal(result.block, true);
  assert.match(result.reason, /The last run of the project check \(node check\.js\) failed/);
  await runCheck(root);
  assert.equal(gate.stopGate(root).block, false);
  write(root, 'src/app.js', 'module.exports = 3;\n');
  assert.equal(gate.stopGate(root).block, true, 'a later edit makes the record stale');
  evidence.waive(root, 'no test harness for this path');
  assert.equal(gate.stopGate(root).reason, 'check waived');
});

test('without a declared check any passing verify counts', async () => {
  const root = v7Repo({ verify: '' });
  write(root, 'src/app.js', 'changed');
  assert.match(gate.stopGate(root).reason, /verify "<your check command>"/);
  await evidence.verify(root, 'node -e 0');
  assert.equal(gate.stopGate(root).block, false);
});

test('stop gate compares against the session baseline and lets only documentation through', () => {
  const root = v7Repo();
  write(root, 'src/app.js', 'user work in progress');
  const baseline = gitTools.snapshot(root);
  assert.equal(gate.stopGate(root, { baseline }).reason, 'no code changed');
  for (let i = 0; i < 7; i++) write(root, `docs/page-${i}.md`, 'docs');
  write(root, 'README.md', 'readme');
  write(root, 'LICENSE', 'MIT');
  const docs = gate.stopGate(root, { baseline });
  assert.equal(docs.block, false);
  assert.equal(docs.reason, 'only documentation changed');
  write(root, 'lib/a.js', 'code');
  write(root, 'lib/b.js', 'code');
  const mixed = gate.stopGate(root, { baseline });
  assert.equal(mixed.block, true);
  assert.match(mixed.reason, /and \d+ more/);
  for (const code of ['requirements.txt', 'CMakeLists.txt', '.github/workflows/ci.yml', 'src/components/NoticeBanner.tsx', 'lib/changelog.js', 'src/authors.ts', 'docs/example.js']) {
    assert.equal(gate.isDocPath(code), false, code);
  }
  for (const doc of ['README.md', 'docs/guide.mdx', 'NOTES.rst', 'LICENSE', 'CODEOWNERS']) assert.equal(gate.isDocPath(doc), true, doc);
  assert.equal(gate.isDocsOnly([]), false);
  assert.equal(gate.isDocsOnly(null), false);
});

test('stop gate honors gate off and skips non-git projects', () => {
  const root = v7Repo();
  write(root, 'src/app.js', 'x');
  process.env.GODPOWERS_GATE = 'off';
  try {
    assert.equal(gate.stopGate(root).reason, 'gate is off');
  } finally {
    delete process.env.GODPOWERS_GATE;
  }
  write(root, '.godpowers/STATE.md', stateText().replace('stage: build', 'stage: build\ngate: off'));
  assert.equal(gate.stopGate(root).reason, 'gate is off');
  const plain = tempDir();
  write(plain, '.godpowers/STATE.md', stateText());
  assert.equal(gate.stopGate(plain).reason, 'not a git repository');
});

test('ship gate needs the declared check, review, security, and no open critical risk', async () => {
  const root = checkedRepo();
  const byName = r => Object.fromEntries(r.checks.map(c => [c.name, c]));
  let result = gate.shipGate(root);
  assert.equal(result.ok, false);
  assert.equal(byName(result).verify.ok, false);
  assert.match(byName(result).review.detail, /god-review/);
  await evidence.verify(root, 'true');
  assert.equal(byName(gate.shipGate(root)).verify.ok, false, 'another command does not count');
  await runCheck(root);
  evidence.attest(root, 'review', { pass: true, summary: 'clean' });
  evidence.attest(root, 'harden', { pass: true, summary: 'no findings' });
  result = gate.shipGate(root);
  assert.equal(result.ok, true);
  write(root, '.godpowers/STATE.md', stateText({ verify: CHECK, risks: ['- [ ] critical: auth bypass in /admin', '- [ ] high: missing rate limit'] }));
  result = gate.shipGate(root);
  assert.equal(result.ok, false);
  assert.match(byName(result).risks.detail, /auth bypass/);
  assert.equal(byName(result)['high-risks'].severity, 'warning');
  write(root, '.godpowers/STATE.md', stateText({ verify: CHECK, risks: ['- [x] critical: auth bypass (fixed)', '- [ ] high: missing rate limit'] }));
  assert.equal(gate.shipGate(root).ok, true, 'open high risks warn but do not block');
  write(root, 'src/app.js', 'changed after review');
  result = gate.shipGate(root);
  assert.equal(result.ok, false);
  assert.equal(byName(result).review.ok, false);
});

test('ship gate reports state and ledger problems, layout, and no-check projects; chain breaks only warn', () => {
  assert.match(gate.shipGate(tempDir()).checks[0].detail, /init/);
  const v6 = tempDir();
  write(v6, '.godpowers/state.json', '{}');
  assert.match(gate.shipGate(v6).checks[0].detail, /migrate/);
  const root = v7Repo({ verify: 'none' });
  evidence.waive(root, 'no automated checks exist');
  let checks = gate.shipGate(root).checks;
  assert.equal(checks.find(c => c.name === 'verify').severity, 'warning');
  const first = evidence.waive(root, 'one');
  const second = evidence.waive(root, 'two');
  write(root, '.godpowers/evidence.jsonl', `${JSON.stringify(second)}\n${JSON.stringify(first)}\n`);
  assert.equal(gate.shipGate(root).checks.find(c => c.name === 'ledger').ok, true, 'a reordered (merged) ledger is fine');
  write(root, '.godpowers/STATE.md', '---\ngodpowers: 7\n---\n');
  write(root, '.godpowers/evidence.jsonl', 'garbage\n');
  checks = gate.shipGate(root).checks;
  assert.equal(checks.find(c => c.name === 'state').ok, false);
  assert.equal(checks.find(c => c.name === 'ledger').ok, false);
});

test('ship gate falls back to latest records outside git', async () => {
  const root = tempDir();
  write(root, '.godpowers/STATE.md', stateText());
  let checks = gate.shipGate(root).checks;
  assert.equal(checks.find(c => c.name === 'git').severity, 'warning');
  assert.equal(checks.find(c => c.name === 'verify').ok, false);
  await evidence.verify(root, 'node -e "process.exit(0)"');
  evidence.attest(root, 'review', { pass: true, summary: 'ok' });
  evidence.attest(root, 'harden', { pass: true, summary: 'ok' });
  const result = gate.shipGate(root);
  assert.equal(result.ok, true);
  evidence.waive(root, 'x');
  checks = gate.shipGate(root).checks;
  assert.match(checks.find(c => c.name === 'verify').detail, /"waived"/);
});

const byName = r => Object.fromEntries(r.checks.map(c => [c.name, c]));
const setState = (root, overrides) => write(root, '.godpowers/STATE.md', stateText({ verify: CHECK, ...overrides }));

test('a review survives a documentation edit but not a code edit, and verify goes stale', async () => {
  const root = checkedRepo();
  await runCheck(root);
  evidence.attest(root, 'review', { pass: true, summary: 'clean' });
  evidence.attest(root, 'harden', { pass: true, summary: 'no findings' });
  assert.equal(gate.shipGate(root).ok, true);
  assert.equal(byName(gate.shipGate(root)).review.detail, 'review passed on the current code');
  write(root, 'README.md', 'a new readme');
  let result = gate.shipGate(root);
  assert.equal(byName(result).review.ok, true);
  assert.equal(byName(result).review.detail, 'review passed on the current code (documentation changed since)');
  assert.equal(byName(result).harden.detail, 'security pass on the current code (documentation changed since)');
  assert.equal(byName(result).verify.ok, false, 'a check can read documentation, so it goes stale');
  await runCheck(root);
  assert.equal(gate.shipGate(root).ok, true);
  write(root, 'src/app.js', 'module.exports = 2;\n');
  result = gate.shipGate(root);
  assert.equal(byName(result).review.ok, false);
  assert.equal(byName(result).harden.ok, false);
});

test('with docs: none a documentation edit voids the review', async () => {
  const root = checkedRepo({ docs: 'none' });
  evidence.attest(root, 'review', { pass: true, summary: 'clean' });
  write(root, 'README.md', 'a new readme');
  assert.equal(byName(gate.shipGate(root)).review.ok, false);
  setState(root, { docs: '' });
  write(root, 'README.md', 'another readme');
  evidence.attest(root, 'review', { pass: true, summary: 'clean again' });
  write(root, 'README.md', 'yet another');
  assert.equal(byName(gate.shipGate(root)).review.ok, true, 'an empty docs setting uses the built-in rule');
});

test('docs globs decide what counts as documentation', async () => {
  const root = checkedRepo({ docs: 'guides/**, *.txt' });
  evidence.attest(root, 'review', { pass: true, summary: 'clean' });
  write(root, 'guides/intro.js', 'listed, so documentation');
  write(root, 'notes/todo.txt', 'listed by base name');
  assert.equal(byName(gate.shipGate(root)).review.ok, true);
  write(root, 'README.md', 'not listed, so code');
  assert.equal(byName(gate.shipGate(root)).review.ok, false);
});

test('the stop gate lets listed paths through and blocks unlisted ones', () => {
  const root = checkedRepo({ docs: 'guides/**, *.txt' });
  write(root, 'guides/intro.js', 'x');
  write(root, 'notes/todo.txt', 'x');
  let result = gate.stopGate(root);
  assert.equal(result.block, false);
  assert.equal(result.reason, 'only documentation changed');
  write(root, 'README.md', 'markdown is not listed here');
  result = gate.stopGate(root);
  assert.equal(result.block, true);
  assert.match(result.reason, /README\.md/);
});

test('with docs: none even a README edit needs a check before stopping', () => {
  const root = checkedRepo({ docs: 'none' });
  write(root, 'README.md', 'x');
  assert.equal(gate.stopGate(root).block, true);
  const builtIn = checkedRepo();
  write(builtIn, 'README.md', 'x');
  assert.equal(gate.stopGate(builtIn).reason, 'only documentation changed');
});

test('docPredicate follows the STATE.md docs setting', () => {
  const { docPredicate } = require('../lib/docs');
  const parse = overrides => require('../lib/state').parse(stateText(overrides));
  assert.equal(docPredicate(null)('README.md'), true);
  assert.equal(docPredicate(parse({}))('lib/a.js'), false);
  assert.equal(docPredicate(parse({ docs: 'none' }))('README.md'), false);
  assert.equal(docPredicate(parse({ docs: 'NONE' }))('README.md'), false);
  const globs = docPredicate(parse({ docs: 'site/**, *.adoc' }));
  assert.deepEqual(['site/a.js', 'x/y.ADOC', 'README.md'].map(globs), [true, true, false]);
});

// A checked repo tagged v1.0.0 at HEAD, so the ship gate has a base to measure from.
function releasedRepo(overrides = {}) {
  const root = checkedRepo(overrides);
  write(root, 'test/app.test.js', 'test("a", () => { expect(1).toBe(1); });\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'tests');
  git(root, 'tag', 'v1.0.0');
  return root;
}

test('the ship gate reports the tier and base, and without a tag it is high', async () => {
  const root = checkedRepo();
  const result = gate.shipGate(root);
  assert.equal(result.tier, 'high');
  assert.equal(result.base, null);
  assert.equal(byName(result).tier.ok, true);
  assert.match(byName(result).tier.detail, /^high risk: nothing to compare against/);
  assert.equal(byName(result).tests, undefined, 'no base, no test guard');
  assert.match(byName(result).harden.detail, /god-harden/, 'today\'s rule applies at the high tier');
  const tagged = releasedRepo();
  const second = gate.shipGate(tagged);
  assert.equal(second.tier, 'low');
  assert.deepEqual(second.base, gitTools.releaseBase(tagged));
  assert.match(byName(second).tier.detail, /^low risk since v1\.0\.0 \([0-9a-f]{7}\): nothing changed since v1\.0\.0$/);
});

test('low risk needs only a passing check', async () => {
  const root = releasedRepo();
  write(root, 'README.md', 'docs');
  write(root, 'test/app.test.js', 'test("a", () => { expect(1).toBe(1); });\ntest("b", () => {});\n');
  let result = gate.shipGate(root);
  assert.equal(result.tier, 'low');
  assert.equal(result.ok, false);
  assert.equal(byName(result).verify.ok, false);
  assert.equal(byName(result).review.ok, true);
  assert.equal(byName(result).review.detail, 'not required for a low-risk change (only documentation and test files changed since v1.0.0)');
  assert.equal(byName(result).harden.detail, 'not required for a low-risk change (only documentation and test files changed since v1.0.0)');
  await runCheck(root);
  result = gate.shipGate(root);
  assert.equal(result.ok, true);
  assert.deepEqual(result.checks.filter(c => c.severity === 'warning'), []);
});

test('normal risk needs a check and a review, but not a security record', async () => {
  const root = releasedRepo();
  write(root, 'src/app.js', 'module.exports = 2;\n');
  await runCheck(root);
  let result = gate.shipGate(root);
  assert.equal(result.tier, 'normal');
  assert.equal(result.ok, false);
  assert.match(byName(result).review.detail, /god-review/);
  assert.equal(byName(result).harden.ok, true);
  assert.equal(byName(result).harden.detail, 'not required for a normal-risk change (no high-risk paths since v1.0.0)');
  evidence.attest(root, 'review', { pass: true, summary: 'clean' });
  result = gate.shipGate(root);
  assert.equal(result.ok, true);
  assert.equal(byName(result).review.detail, 'review passed on the current code');
});

test('high risk needs a check, a review, and a security record', async () => {
  const root = releasedRepo();
  write(root, 'src/auth/token.js', 'module.exports = 1;\n');
  await runCheck(root);
  evidence.attest(root, 'review', { pass: true, summary: 'clean' });
  let result = gate.shipGate(root);
  assert.equal(result.tier, 'high');
  assert.equal(result.ok, false);
  assert.match(byName(result).harden.detail, /god-harden/);
  assert.match(byName(result).tier.detail, /^high risk since v1\.0\.0 \(.{7}\): 1 changed path matches high-risk patterns since v1\.0\.0$/);
  evidence.attest(root, 'harden', { pass: true, summary: 'no findings' });
  result = gate.shipGate(root);
  assert.equal(result.ok, true);
  setState(root, { risk: 'src/other/**' });
  write(root, 'src/other/x.js', 'x');
  write(root, 'src/auth/token.js', 'module.exports = 2;\n');
  assert.equal(gate.shipGate(root).tier, 'high');
});

test('a record the tier does not require still warns when it failed on this code', async () => {
  const root = releasedRepo();
  write(root, 'src/app.js', 'module.exports = 2;\n');
  await runCheck(root);
  evidence.attest(root, 'review', { pass: true, summary: 'clean' });
  evidence.attest(root, 'harden', { pass: false, summary: 'found something' });
  let result = gate.shipGate(root);
  assert.equal(result.ok, true, 'normal risk does not require a security record');
  assert.equal(byName(result).harden.severity, 'warning');
  assert.equal(byName(result).harden.ok, false);
  assert.match(byName(result).harden.detail, /the last security record failed on the current code \(not required for a normal-risk change\)/);
  evidence.attest(root, 'harden', { pass: true, summary: 'fixed' });
  assert.equal(byName(gate.shipGate(root)).harden.severity, 'ok');

  const docsOnly = releasedRepo();
  write(docsOnly, 'README.md', 'docs');
  await runCheck(docsOnly);
  evidence.attest(docsOnly, 'review', { pass: false, summary: 'nit' });
  result = gate.shipGate(docsOnly);
  assert.equal(result.ok, true);
  assert.match(byName(result).review.detail, /the last review failed on the current code \(not required for a low-risk change\)/);
  assert.equal(byName(result).review.severity, 'warning');
});

test('test-guard findings are a non-blocking warning with the first three', async () => {
  const root = releasedRepo();
  fs.rmSync(path.join(root, 'test/app.test.js'));
  write(root, 'test/a.test.js', 'it.skip("a");\n'); // godpowers: allow-test-change
  write(root, 'test/b.test.js', 'it.skip("b");\n'); // godpowers: allow-test-change
  write(root, 'test/c.test.js', 'it.only("c");\n'); // godpowers: allow-test-change
  await runCheck(root);
  const result = gate.shipGate(root);
  assert.equal(byName(result).tests.severity, 'warning');
  assert.match(byName(result).tests.detail, /^4 test-guard finding\(s\) since v1\.0\.0: deleted-test test\/app\.test\.js; skip-marker test\/a\.test\.js:1; skip-marker test\/b\.test\.js:1; \.\.\. \(run `.* tests`\)$/);
  evidence.attest(root, 'review', { pass: true, summary: 'clean' });
  assert.equal(gate.shipGate(root).ok, true, 'the warning does not block');
  const clean = releasedRepo();
  assert.equal(byName(gate.shipGate(clean)).tests, undefined);
});

test('--base chooses the base commit and a refused ref throws', async () => {
  const root = releasedRepo();
  write(root, 'src/auth/x.js', 'x');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'auth');
  assert.equal(gate.shipGate(root).tier, 'high', 'the default base is v1.0.0');
  const result = gate.shipGate(root, { base: 'HEAD' });
  assert.equal(result.tier, 'low');
  assert.equal(result.base.ref, 'HEAD');
  assert.throws(() => gate.shipGate(root, { base: '--output=x' }), /cannot start with "-"/);
  assert.throws(() => gate.shipGate(root, { base: 'nope' }), /does not name a commit/);
  assert.equal(gate.shipGate(tempDir()).tier, null, 'a non-project has no tier');
});
