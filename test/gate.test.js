const test = require('node:test');
const assert = require('node:assert/strict');

const gate = require('../lib/gate');
const evidence = require('../lib/evidence');
const gitTools = require('../lib/git');
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
