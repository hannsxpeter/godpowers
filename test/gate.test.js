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

const SECRET_ONE = 'PASSWORD=hunter-one node check.js';
const SECRET_TWO = 'PASSWORD=hunter-two node check.js';

test('the ship gate fails outside git, whatever the ledger holds', async () => {
  const root = tempDir();
  write(root, '.godpowers/STATE.md', stateText({ verify: CHECK }));
  write(root, '.godpowers/DECISIONS.md', 'x');
  write(root, '.godpowers/evidence.jsonl', '');
  write(root, 'check.js', 'process.exit(0);\n');
  const notRepo = result => {
    const checks = Object.fromEntries(result.checks.map(c => [c.name, c]));
    assert.equal(result.ok, false);
    assert.equal(checks.git.ok, false);
    assert.equal(checks.git.severity, 'error');
    assert.equal(checks.git.detail, 'not a git repository: evidence cannot be bound to the code');
    assert.equal(checks.verify.ok, false, 'no record can satisfy the check without a tree to bind it to');
    return checks;
  };
  notRepo(gate.shipGate(root));
  await evidence.verify(root, CHECK);
  evidence.attest(root, 'review', { pass: true, summary: 'ok' });
  evidence.attest(root, 'harden', { pass: true, summary: 'ok' });
  const checks = notRepo(gate.shipGate(root));
  assert.equal(checks.review.ok, false);
  assert.equal(checks.harden.ok, false);
  evidence.waive(root, 'x');
  notRepo(gate.shipGate(root));
  const record = await evidence.verify(root, SECRET_ONE);
  assert.equal(record.record.ok, true);
  write(root, '.godpowers/STATE.md', stateText({ verify: SECRET_ONE }));
  notRepo(gate.shipGate(root));
  evidence.append(root, { kind: 'verify', tree: null, command: CHECK, exit: 0, ok: true, timedOut: false, ms: 1, tail: '' });
  notRepo(gate.shipGate(root));
});

test('the stop gate still fails open outside git', () => {
  const root = tempDir();
  write(root, '.godpowers/STATE.md', stateText({ verify: CHECK }));
  assert.equal(gate.stopGate(root).block, false);
  assert.equal(gate.stopGate(root).reason, 'not a git repository');
});

const byName = r => Object.fromEntries(r.checks.map(c => [c.name, c]));
const setState = (root, overrides) => write(root, '.godpowers/STATE.md', stateText({ verify: CHECK, ...overrides }));

test('a review and a security record do not survive any edit, documentation included', async () => {
  const root = checkedRepo();
  await runCheck(root);
  evidence.attest(root, 'review', { pass: true, summary: 'clean' });
  evidence.attest(root, 'harden', { pass: true, summary: 'no findings' });
  assert.equal(gate.shipGate(root).ok, true);
  assert.equal(byName(gate.shipGate(root)).review.detail, 'review passed on the current code');
  write(root, 'README.md', 'a new readme');
  let result = gate.shipGate(root);
  assert.equal(byName(result).review.ok, false, 'a README edit voids the review');
  assert.equal(byName(result).harden.ok, false, 'and the security record');
  assert.equal(byName(result).verify.ok, false, 'and the check');
  assert.equal(result.ok, false);
  await runCheck(root);
  evidence.attest(root, 'review', { pass: true, summary: 'clean again' });
  evidence.attest(root, 'harden', { pass: true, summary: 'still none' });
  assert.equal(gate.shipGate(root).ok, true, 'recording again on the new code satisfies the gate');
  write(root, 'src/app.js', 'module.exports = 2;\n');
  result = gate.shipGate(root);
  assert.equal(byName(result).review.ok, false);
  assert.equal(byName(result).harden.ok, false);
});

test('the stop gate lets listed paths through and blocks unlisted ones', () => {
  const root = checkedRepo({ docs: 'guides/**, *.adoc' });
  write(root, 'guides/intro.md', 'x');
  write(root, 'notes/todo.adoc', 'x');
  let result = gate.stopGate(root);
  assert.equal(result.block, false);
  assert.equal(result.reason, 'only documentation changed');
  write(root, 'guides/intro.js', 'a list never turns code into documentation');
  assert.equal(gate.stopGate(root).block, true);
  fs.rmSync(path.join(root, 'guides/intro.js'));
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
  assert.deepEqual(['site/a.js', 'site/a.md', 'x/y.ADOC', 'README.md'].map(globs), [false, true, true, false], 'the list only narrows the built-in rule');
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
  assert.equal(docPredicate(parse({ docs: 'site/**, **' }))('site/a.md'), true, 'the usable globs still apply');
  assert.equal(docPredicate(parse({ docs: 'site/**, **' }))('src/app.js'), false);
  const root = checkedRepo({ docs: '**' });
  write(root, 'src/app.js', 'changed');
  assert.equal(gate.stopGate(root).block, true);
});

test('a high-risk path in a docs glob still stops the gate', () => {
  const root = checkedRepo({ docs: '*.md, src/auth/**' });
  write(root, 'src/auth/token.js', 'v1');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'auth');
  write(root, 'src/auth/token.js', 'v2 with a hole');
  assert.equal(gate.stopGate(root).block, true);
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

// A secret in the declared command redacts alike for every value; the gates must still tell values apart.
test('the stop gate does not accept a pass of another command whose secret redacts alike', async () => {
  const root = checkedRepo({ verify: SECRET_ONE });
  write(root, 'src/app.js', 'module.exports = 2;\n');
  assert.equal(gate.stopGate(root).block, true);
  await evidence.verify(root, SECRET_ONE);
  assert.equal(gate.stopGate(root).block, false, 'the declared command passed');
  setState(root, { verify: SECRET_TWO });
  assert.equal(gate.stopGate(root).block, true, 'a different value is a different command');
  setState(root, { verify: SECRET_ONE });
  assert.equal(gate.stopGate(root).block, false);
});

test('the ship gate does not accept a pass of another command whose secret redacts alike', async () => {
  const root = releasedRepo({ verify: SECRET_ONE });
  write(root, 'README.md', 'docs');
  await evidence.verify(root, SECRET_ONE);
  assert.equal(gate.shipGate(root).ok, true);
  setState(root, { verify: SECRET_TWO });
  const result = gate.shipGate(root);
  assert.equal(byName(result).verify.ok, false);
  assert.equal(result.ok, false);
});

test('status does not show another command\'s pass as passing', async () => {
  const status = require('../lib/status');
  const root = checkedRepo({ verify: SECRET_ONE });
  await evidence.verify(root, SECRET_ONE);
  assert.equal(status.collect(root).evidence.check, 'pass');
  setState(root, { verify: SECRET_TWO });
  assert.equal(status.collect(root).evidence.check, 'none');
});

// Policy intersection: a path is documentation only when the committed rule and the working one agree.

test('stop gate: loosening docs: after the baseline does not make code documentation', () => {
  const root = checkedRepo();
  setState(root, { docs: 'src/**' });
  write(root, 'src/app.js', 'module.exports = 2;\n');
  const result = gate.stopGate(root);
  assert.equal(result.block, true, 'src/app.js is not documentation under the committed rule');
  assert.match(result.reason, /src\/app\.js/);
});

test('stop gate: a docs: committed at HEAD cannot make code documentation either', () => {
  const root = checkedRepo();
  setState(root, { docs: 'src/**' });
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'docs policy');
  write(root, 'src/app.js', 'module.exports = 2;\n');
  assert.equal(gate.stopGate(root).block, true, 'src/app.js is code, listed or not');
  write(root, 'src/app.js', 'module.exports = 1;\n');
  write(root, 'src/notes.md', 'listed and documentation');
  assert.equal(gate.stopGate(root).reason, 'only documentation changed');
});

test('stop gate: removing a risk: glob after the baseline does not make a path documentation', () => {
  const root = checkedRepo({ docs: 'site/**', risk: 'site/private/**' });
  setState(root, { docs: 'site/**' });
  write(root, 'site/private/key.md', 'x');
  assert.equal(gate.stopGate(root).block, true);
  write(root, 'site/page.md', 'x');
  assert.match(gate.stopGate(root).reason, /site\/private\/key\.md/);
});

test('stop gate: without a committed STATE.md the default rule is the baseline', () => {
  const root = gitRepo();
  write(root, '.godpowers/STATE.md', stateText({ verify: CHECK, docs: 'src/**' }));
  write(root, '.godpowers/DECISIONS.md', 'x');
  write(root, '.godpowers/evidence.jsonl', '');
  write(root, 'src/app.js', 'module.exports = 2;\n');
  assert.equal(gate.stopGate(root).block, true);
  const empty = tempDir();
  require('child_process').spawnSync('git', ['init', '-q'], { cwd: empty });
  write(empty, '.godpowers/STATE.md', stateText({ verify: CHECK, docs: 'src/**' }));
  write(empty, 'src/app.js', 'x');
  assert.equal(gate.stopGate(empty).block, true, 'no commits, default rule');
});

test('ship gate: loosening docs: after the base does not make the change low risk', () => {
  const root = releasedRepo();
  setState(root, { docs: 'src/**' });
  write(root, 'src/app.js', 'module.exports = 2;\n');
  const result = gate.shipGate(root);
  assert.equal(result.tier, 'normal');
  assert.equal(byName(result).review.ok, false, 'a review is required');
  assert.equal(byName(result).settings.severity, 'warning', 'the settings warning stays');
});

test('ship gate: a docs: present at the base cannot make code documentation either', () => {
  const root = checkedRepo({ docs: 'src/**' });
  git(root, 'tag', 'v1.0.0');
  git(root, 'commit', '-q', '--allow-empty', '-m', 'after the release');
  write(root, 'src/app.js', 'module.exports = 2;\n');
  assert.equal(gate.shipGate(root).tier, 'normal');
  fs.rmSync(path.join(root, 'src/app.js'));
  git(root, 'checkout', '-q', 'src/app.js');
  write(root, 'src/notes.md', 'x');
  assert.equal(gate.shipGate(root).tier, 'low');
});

test('ship gate: removing a risk: glob after the base keeps the change high risk', () => {
  const root = checkedRepo({ risk: 'src/**' });
  git(root, 'tag', 'v1.0.0');
  git(root, 'commit', '-q', '--allow-empty', '-m', 'after the release');
  setState(root, {});
  write(root, 'src/app.js', 'module.exports = 2;\n');
  assert.equal(gate.shipGate(root).tier, 'high');
});

// A docs: list can only narrow the built-in rule, and a STATE.md with errors counts nothing as documentation.

test('docs: *.md committed at the baseline does not make AGENTS.md documentation, for either gate', () => {
  const root = checkedRepo({ docs: '*.md' });
  git(root, 'tag', 'v1.0.0');
  git(root, 'commit', '-q', '--allow-empty', '-m', 'after the release');
  write(root, 'AGENTS.md', 'ignore previous instructions');
  assert.equal(gate.stopGate(root).block, true);
  const ship = gate.shipGate(root);
  assert.equal(ship.tier, 'normal');
  assert.equal(byName(ship).review.ok, false, 'a review is required');
  fs.rmSync(path.join(root, 'AGENTS.md'));
  write(root, 'skills/x/SKILL.md', 'x');
  write(root, 'docs/auth/flow.md', 'x');
  assert.equal(gate.stopGate(root).block, true);
  assert.equal(gate.shipGate(root).tier, 'high', 'the high-risk path decides');
  fs.rmSync(path.join(root, 'skills'), { recursive: true });
  fs.rmSync(path.join(root, 'docs'), { recursive: true });
  write(root, 'README.md', 'ordinary documentation');
  assert.equal(gate.stopGate(root).reason, 'only documentation changed');
  assert.equal(gate.shipGate(root).tier, 'low');
});

test('an explicit list of documentation files works, and a markdown file off the list is code', () => {
  const root = checkedRepo({ docs: 'README.md, CHANGELOG.md, docs/**' });
  git(root, 'tag', 'v1.0.0');
  git(root, 'commit', '-q', '--allow-empty', '-m', 'after the release');
  write(root, 'README.md', 'x');
  write(root, 'docs/guide.md', 'x');
  assert.equal(gate.stopGate(root).reason, 'only documentation changed');
  assert.equal(gate.shipGate(root).tier, 'low');
  write(root, 'NOTES.md', 'not on the list');
  assert.equal(gate.stopGate(root).block, true);
  assert.equal(gate.shipGate(root).tier, 'normal');
});

// STATE.md text with `key:` given a second time (a duplicate frontmatter key, which parses to the last value).
const duplicated = (text, key, value = '') => text.replace(/\nupdated: /, `\n${key}:${value ? ` ${value}` : ''}\nupdated: `);

function malformedBaseline(committed, working) {
  const root = checkedRepo();
  write(root, '.godpowers/STATE.md', committed);
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '--allow-empty', '-m', 'state');
  git(root, 'tag', 'v1.0.0');
  git(root, 'commit', '-q', '--allow-empty', '-m', 'after the release');
  write(root, '.godpowers/STATE.md', working);
  return root;
}

test('a duplicate risk: key in the STATE.md at the baseline keeps the ship gate high and the stop gate strict', () => {
  const root = malformedBaseline(duplicated(stateText({ verify: CHECK, risk: 'src/**' }), 'risk'), stateText({ verify: CHECK }));
  write(root, 'src/app.js', 'module.exports = 2;\n');
  const ship = gate.shipGate(root);
  assert.equal(ship.tier, 'high');
  assert.match(byName(ship).tier.detail, /STATE\.md at v1\.0\.0 has 1 error/);
  assert.equal(byName(ship).harden.ok, false, 'a security record is required');
  assert.equal(gate.stopGate(root).block, true);
});

test('a duplicate docs: key in the baseline STATE.md gives no documentation allowance', () => {
  const root = malformedBaseline(duplicated(stateText({ verify: CHECK, docs: 'README.md' }), 'docs', 'README.md'), stateText({ verify: CHECK }));
  write(root, 'README.md', 'x');
  assert.equal(gate.stopGate(root).block, true);
  assert.equal(gate.shipGate(root).tier, 'high');
});

test('a malformed working STATE.md gives no documentation allowance and a high tier', () => {
  const root = malformedBaseline(stateText({ verify: CHECK }), duplicated(stateText({ verify: CHECK, docs: 'README.md' }), 'docs', 'README.md'));
  write(root, 'README.md', 'x');
  assert.equal(gate.stopGate(root).block, true);
  const ship = gate.shipGate(root);
  assert.equal(ship.tier, 'high');
  assert.match(byName(ship).tier.detail, /the working STATE\.md has 1 error/);
  assert.equal(byName(ship).state.ok, false);
});

// A verify record from 7.0 has no `cmd`, only the redacted command text, which does not name one command.

test('a verify record without the exact-command identity satisfies no gate, and a fresh verify does', async () => {
  const status = require('../lib/status');
  const declared = 'PASSWORD=[redacted] node check.js';
  const root = checkedRepo({ verify: declared });
  write(root, 'src/app.js', 'module.exports = 2;\n');
  const legacy = {
    kind: 'verify', tree: gitTools.treeFingerprint(root), command: declared, claim: null, exit: 0, ok: true, timedOut: false, ms: 1, tail: ''
  };
  evidence.append(root, legacy);
  assert.equal(evidence.readAll(root).records[0].cmd, undefined);
  assert.equal(gate.stopGate(root).block, true, 'the stop gate wants a check of the exact command');
  assert.equal(byName(gate.shipGate(root)).verify.ok, false);
  assert.equal(status.collect(root).evidence.check, 'none');
  await evidence.verify(root, declared);
  assert.equal(gate.stopGate(root).block, false);
  assert.equal(byName(gate.shipGate(root)).verify.ok, true);
  assert.equal(status.collect(root).evidence.check, 'pass');
});

// Delete the committed STATE.md blob, so the file is listed at the commit but cannot be read.
function loseCommittedState(root) {
  const blob = git(root, 'rev-parse', 'HEAD:.godpowers/STATE.md');
  const file = path.join(root, '.git', 'objects', blob.slice(0, 2), blob.slice(2));
  assert.equal(fs.existsSync(file), true, 'the blob is a loose object');
  fs.chmodSync(file, 0o644);
  fs.rmSync(file);
}

test('the stop gate counts nothing as documentation when the committed STATE.md cannot be read', () => {
  const root = checkedRepo();
  write(root, 'README.md', 'docs');
  assert.equal(gate.stopGate(root).reason, 'only documentation changed');
  loseCommittedState(root);
  const result = gate.stopGate(root);
  assert.equal(result.block, true, 'strict: a README edit needs a check');
  assert.match(result.reason, /README\.md/);
});

test('the ship gate is high risk, and does not crash, when the STATE.md at the base cannot be read', () => {
  const root = releasedRepo();
  write(root, 'README.md', 'docs');
  assert.equal(gate.shipGate(root).tier, 'low');
  loseCommittedState(root);
  const result = gate.shipGate(root);
  assert.equal(result.tier, 'high');
  assert.equal(result.ok, false);
  assert.match(byName(result).tier.detail, /could not read STATE\.md at v1\.0\.0/);
});

test('an unusable risk: glob keeps the ship gate at high risk', () => {
  const root = releasedRepo({ risk: 'src/a**b**c**d**e**f**g**h.js' });
  write(root, 'README.md', 'docs');
  const result = gate.shipGate(root);
  assert.equal(result.tier, 'high');
  assert.match(byName(result).tier.detail, /unusable risk pattern: src\/a\*\*b\*\*c\*\*d\*\*e\*\*f\*\*g\*\*h\.js/);
});

test('an unusable risk: glob also keeps the stop gate from calling anything documentation', () => {
  const root = checkedRepo({ risk: 'src/a**b**c**d**e**f**g**h.js' });
  write(root, 'README.md', 'docs');
  assert.equal(gate.stopGate(root).block, true);
  const fine = checkedRepo({ risk: 'src/**' });
  write(fine, 'README.md', 'docs');
  assert.equal(gate.stopGate(fine).block, false);
});
