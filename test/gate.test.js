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

// A checked repo with v1.0.0 one commit behind HEAD, so the ship gate has a base to measure from.
function releasedRepo(overrides = {}) {
  const root = checkedRepo(overrides);
  write(root, 'test/app.test.js', 'test("a", () => { expect(1).toBe(1); });\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'tests');
  git(root, 'tag', 'v1.0.0');
  git(root, 'commit', '-q', '--allow-empty', '-m', 'after the release');
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

test('a file name with a newline is a code change for the stop gate', () => {
  const root = checkedRepo();
  write(root, 'src/auth/token\n.js', 'x');
  const result = gate.stopGate(root);
  assert.equal(result.block, true);
  assert.deepEqual(result.changed, ['src/auth/token\n.js']);
  const docsLooking = checkedRepo();
  write(docsLooking, 'README\n.md', 'x');
  assert.equal(gate.stopGate(docsLooking).block, true, 'even one that looks like documentation');
});

test('agent instruction files and high-risk paths are never documentation', () => {
  const { docPredicate, isDocPath, isInstructionPath } = require('../lib/docs');
  const parse = overrides => require('../lib/state').parse(stateText(overrides));
  const instructions = [
    'AGENTS.md', 'sub/CLAUDE.md', 'GEMINI.md', 'skills/god/SKILL.md', 'x/SKILL.md', '.cursorrules', '.windsurfrules', '.github/copilot-instructions.md',
    '.claude/commands/ship.md', '.codex/prompts/a.md', '.cursor/rules/a.md', '.agents/notes.md', '.gemini/x.md', '.windsurf/x.md',
    'agents/reviewer.md', 'docs/skills/intro.md', 'prompts/system.md', 'Agents.MD', 'SKILLS/readme.md'
  ];
  for (const rel of instructions) {
    assert.equal(isInstructionPath(rel), true, rel);
    assert.equal(isDocPath(rel), false, rel);
    assert.equal(docPredicate(null)(rel), false, rel);
  }
  for (const rel of ['README.md', 'docs/guide.md', 'docs/agent-notes.md', 'skills.md', 'CHANGELOG.md']) assert.equal(isDocPath(rel), true, rel);
  const never = ['docs/security/model.md', 'docs/auth/flow.md', 'docs/auth.md', 'docs/migrations/001.md', 'notes/password-policy.md', '.env.md', 'docs/deploy/runbook.md', 'a\nb.md'];
  for (const rel of never) {
    assert.equal(isDocPath(rel), false, rel);
    assert.equal(docPredicate(parse({ docs: '**/*.md' }))(rel), false, `${rel} under a docs glob`);
  }
  const custom = docPredicate(parse({ docs: '*.md, notes/**', risk: 'notes/private/**' }));
  assert.equal(custom('notes/public/a.md'), true);
  assert.equal(custom('notes/private/a.md'), false, 'a STATE.md risk glob also keeps a path out');
  assert.equal(docPredicate(parse({ docs: 'none' }))('README.md'), false);
});

test('wildcard-only docs and risk globs are ignored at run time', () => {
  const { docPredicate } = require('../lib/docs');
  const risk = require('../lib/risk');
  const parse = overrides => require('../lib/state').parse(stateText(overrides));
  for (const glob of ['*', '**', '**/*', '*.*']) {
    const everything = docPredicate(parse({ docs: glob }));
    assert.equal(everything('src/app.js'), false, glob);
    assert.equal(everything('README.md'), true, 'the built-in rule applies instead');
    assert.deepEqual(risk.patternsFor(parse({ risk: glob })), risk.HIGH_RISK_PATTERNS, glob);
  }
  assert.equal(docPredicate(parse({ docs: 'site/**, **' }))('site/a.js'), true, 'the usable globs still apply');
  assert.equal(docPredicate(parse({ docs: 'site/**, **' }))('src/app.js'), false);
  const root = checkedRepo({ docs: '**' });
  write(root, 'src/app.js', 'changed');
  assert.equal(gate.stopGate(root).block, true);
  const first = gitTools.fingerprints(root, docPredicate(parse({ docs: '**' }))).code;
  write(root, 'src/app.js', 'changed again');
  assert.notEqual(gitTools.fingerprints(root, docPredicate(parse({ docs: '**' }))).code, first, 'the code fingerprint is not constant');
});

test('changing the documentation rule voids a carried-forward review', () => {
  const root = checkedRepo();
  evidence.attest(root, 'review', { pass: true, summary: 'clean' });
  write(root, 'README.md', 'docs edit');
  assert.equal(byName(gate.shipGate(root)).review.ok, true, 'a docs edit still carries the review forward');
  setState(root, { docs: '*.md, extras/**' });
  write(root, 'extras/new.js', 'code that the new rule calls documentation');
  assert.equal(byName(gate.shipGate(root)).review.ok, false, 'a new rule does not let later code match through "code"');
  setState(root, {});
  fs.rmSync(path.join(root, 'extras/new.js'));
  assert.equal(byName(gate.shipGate(root)).review.ok, true, 'restoring the rule and the code restores the match');
  setState(root, { risk: 'extras/**' });
  assert.equal(byName(gate.shipGate(root)).review.ok, false, 'a risk glob change is a policy change too');
  setState(root, {});
  const none = gitTools.fingerprints(root, require('../lib/docs').docPredicate(require('../lib/state').parse(stateText({ docs: 'none' }))));
  assert.notEqual(none.code, gitTools.fingerprints(root, require('../lib/docs').docPredicate(null)).code);
});

test('a high-risk path in a docs glob still voids the review and stops the gate', () => {
  const root = checkedRepo({ docs: '*.md, src/auth/**' });
  write(root, 'src/auth/token.js', 'v1');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'auth');
  evidence.attest(root, 'review', { pass: true, summary: 'clean' });
  write(root, 'src/auth/token.js', 'v2 with a hole');
  assert.equal(byName(gate.shipGate(root)).review.ok, false);
  assert.equal(gate.stopGate(root).block, true);
});

test('there is no code fingerprint when nothing is code', () => {
  const root = tempDir();
  gitTools.git(root, ['init', '-q']);
  write(root, 'README.md', 'only docs');
  const { tree, code } = gitTools.fingerprints(root, require('../lib/docs').docPredicate(null));
  assert.match(tree, /^[0-9a-f]{64}$/);
  assert.equal(code, null);
  write(root, '.godpowers/STATE.md', stateText());
  evidence.attest(root, 'review', { pass: true, summary: 'clean' });
  write(root, 'NOTES.md', 'other docs');
  const records = evidence.readAll(root).records;
  const now = gitTools.fingerprints(root, require('../lib/docs').docPredicate(null));
  assert.equal(evidence.statusFor(records, now.tree, { code: now.code }).review, 'none', 'a null code never carries a record forward');
});

test('the ship gate warns when the docs or risk setting differs from the base', () => {
  const root = releasedRepo();
  const settings = r => byName(gate.shipGate(r)).settings;
  assert.equal(settings(root), undefined, 'no change, no warning');
  setState(root, { docs: 'site/**' });
  const warning = settings(root);
  assert.equal(warning.severity, 'warning');
  assert.equal(warning.ok, false);
  assert.match(warning.detail, /docs: "" at v1\.0\.0 is now "site\/\*\*"/);
  assert.doesNotMatch(warning.detail, /risk:/);
  setState(root, { docs: 'site/**', risk: 'db/**' });
  assert.match(settings(root).detail, /docs: .*; risk: "" at v1\.0\.0 is now "db\/\*\*"/);
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'settings');
  assert.match(settings(root).detail, /docs:/, 'committed settings still differ from the base');
  setState(root, {});
  assert.equal(settings(root), undefined, 'back to the base setting');
  const same = releasedRepo({ docs: 'b/**,  a/**' });
  setState(same, { docs: 'a/**, b/**' });
  assert.equal(settings(same), undefined, 'spacing and order do not matter');
});

test('a STATE.md that did not exist at the base counts as no settings', () => {
  const root = gitRepo();
  git(root, 'tag', 'v1.0.0');
  git(root, 'commit', '-q', '--allow-empty', '-m', 'after');
  write(root, '.godpowers/STATE.md', stateText({ docs: 'site/**' }));
  write(root, '.godpowers/DECISIONS.md', 'x');
  write(root, '.godpowers/evidence.jsonl', '');
  const result = gate.shipGate(root);
  assert.match(byName(result).settings.detail, /docs: "" at v1\.0\.0 is now "site\/\*\*"/);
  write(root, '.godpowers/STATE.md', stateText());
  assert.equal(byName(gate.shipGate(root)).settings, undefined);
});

test('the ship gate treats a repository without a work tree as high risk and does not crash', () => {
  const source = releasedRepo();
  const bare = path.join(tempDir(), 'bare.git');
  git(source, 'clone', '-q', '--bare', source, bare);
  write(bare, '.godpowers/STATE.md', stateText({ verify: CHECK }));
  const result = gate.shipGate(bare, { base: 'HEAD' });
  assert.equal(result.tier, 'high');
  assert.equal(result.ok, false);
  assert.match(byName(result).tier.detail, /could not list the changes since HEAD/);
  assert.match(byName(result).tests.detail, /test guard could not run/);
  assert.equal(byName(result).tests.severity, 'warning');
});
