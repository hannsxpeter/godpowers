const test = require('node:test');
const assert = require('node:assert/strict');

const gate = require('../lib/gate');
const drift = require('../lib/drift');
const { tempDir, write, git, v7Repo, run } = require('./helpers');

const CONTROL = /[\u0000-\u0008\u000a-\u001f\u007f-\u009f]/;
const byName = result => Object.fromEntries(result.checks.map(c => [c.name, c]));

/** v7 repo on main with a few files; `feature` branches from it. */
function forkedRepo() {
  const root = v7Repo();
  for (const name of ['a', 'b', 'c', 'd', 'e']) write(root, `src/${name}.js`, `module.exports = '${name}';\n`);
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'files');
  git(root, 'checkout', '-q', '-b', 'feature');
  return root;
}
/** Commit `files` on main without leaving the feature branch checked out elsewhere. */
function commitOnMain(root, files, message = 'main moves on') {
  git(root, 'checkout', '-q', 'main');
  for (const [rel, content] of Object.entries(files)) write(root, rel, content);
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', message);
  git(root, 'checkout', '-q', 'feature');
}

test('main moved on in files this change also touches: a non-blocking warning naming them', () => {
  const root = forkedRepo();
  commitOnMain(root, { 'src/a.js': 'main a\n', 'src/z.js': 'main z\n' }, 'first');
  commitOnMain(root, { 'src/a.js': 'main a again\n' }, 'second');
  write(root, 'src/a.js', 'my a\n');
  write(root, 'src/b.js', 'my b\n');
  const result = gate.shipGate(root);
  const warning = byName(result).drift;
  assert.equal(warning.severity, 'warning');
  assert.equal(warning.detail, 'main has 2 commits since this branch forked that touch files this change also touches (as of the last fetch): src/a.js. Rebase, then run verify again.');
  assert.equal(result.drift.onto, 'main');
  assert.equal(result.drift.commits, 2);
  assert.deepEqual(result.drift.files, ['src/a.js']);
  assert.equal(result.driftReason, null);
  const without = gate.shipGate(root, { onto: 'feature' });
  assert.equal(byName(without).drift, undefined);
  assert.equal(result.ok, without.ok, 'the warning never changes whether the gate passes');
});

test('more than three files are cut with a count, and a single commit is not pluralised', () => {
  const root = forkedRepo();
  commitOnMain(root, { 'src/a.js': '1\n', 'src/b.js': '1\n', 'src/c.js': '1\n', 'src/d.js': '1\n', 'src/e.js': '1\n' });
  for (const name of ['e', 'd', 'c', 'b', 'a']) write(root, `src/${name}.js`, 'mine\n');
  const detail = byName(gate.shipGate(root)).drift.detail;
  assert.equal(detail, 'main has 1 commit since this branch forked that touch files this change also touches (as of the last fetch): src/a.js, src/b.js, src/c.js (+2 more). Rebase, then run verify again.');
  assert.match(drift.compute(root).warning, /\(\+2 more\)/);
});

test('committed, uncommitted, and untracked changes on this side all count', () => {
  const root = forkedRepo();
  commitOnMain(root, { 'src/a.js': 'm\n', 'src/b.js': 'm\n', 'src/c.js': 'm\n', 'new.js': 'main\n' });
  write(root, 'src/a.js', 'mine\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'mine');
  write(root, 'src/b.js', 'mine\n');
  write(root, 'new.js', 'mine\n');
  assert.deepEqual(drift.compute(root).drift.files, ['new.js', 'src/a.js', 'src/b.js']);
});

test('no overlap, no new commits on the other side, or only .godpowers files: no warning', () => {
  const root = forkedRepo();
  write(root, 'src/a.js', 'mine\n');
  assert.equal(byName(gate.shipGate(root)).drift, undefined, 'main has not moved');
  assert.deepEqual(gate.shipGate(root).drift.files, []);
  assert.equal(gate.shipGate(root).drift.commits, 0);
  commitOnMain(root, { 'src/e.js': 'main e\n' });
  const other = gate.shipGate(root);
  assert.equal(byName(other).drift, undefined, 'different files');
  assert.equal(other.drift.commits, 1);
  assert.deepEqual(other.drift.files, []);
  commitOnMain(root, { '.godpowers/DECISIONS.md': '# main edits this\n' });
  write(root, '.godpowers/DECISIONS.md', '# so do I\n');
  assert.equal(byName(gate.shipGate(root)).drift, undefined, '.godpowers/ is excluded on both sides');
});

test('--onto names the branch; an unresolvable ref gives no warning and a reason in JSON', async () => {
  const root = forkedRepo();
  git(root, 'branch', 'release', 'main');
  commitOnMain(root, { 'src/a.js': 'main\n' });
  git(root, 'checkout', '-q', 'release');
  write(root, 'src/a.js', 'rel\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'release change');
  git(root, 'checkout', '-q', 'feature');
  write(root, 'src/a.js', 'mine\n');
  const viaMain = await run(['gate', 'ship', '--onto', 'main'], { cwd: root });
  assert.match(viaMain.out, /! drift\s+main has 1 commit since this branch forked/);
  const viaRelease = await run(['gate', 'ship', '--onto', 'release'], { cwd: root });
  assert.match(viaRelease.out, /! drift\s+release has 1 commit/);
  for (const ref of ['no-such-branch', '-x', '']) {
    const bad = await run(['gate', 'ship', '--onto', ref, '--json'], { cwd: root });
    const json = JSON.parse(bad.out);
    assert.equal(json.drift, null, ref);
    assert.match(json.driftReason, new RegExp(`could not resolve --onto "${ref}"`));
    assert.equal(json.checks.some(c => c.name === 'drift'), false);
    const text = await run(['gate', 'ship', '--onto', ref], { cwd: root });
    assert.doesNotMatch(text.out, /drift/);
  }
  const missing = await run(['gate', 'ship', '--onto'], { cwd: root });
  assert.equal(missing.code, 2);
  assert.match(missing.err, /--onto needs a value/);
  const json = JSON.parse((await run(['gate', 'ship', '--onto', 'main', '--json'], { cwd: root })).out);
  assert.equal(json.drift.onto, 'main');
  assert.equal(json.driftReason, null);
  assert.match(json.drift.mergeBase, /^[0-9a-f]{40}$/);
});

test('the default is origin/HEAD when it resolves, shown by its branch name, else main', () => {
  const root = forkedRepo();
  commitOnMain(root, { 'src/a.js': 'main\n' });
  git(root, 'update-ref', 'refs/remotes/origin/trunk', 'main');
  git(root, 'symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/trunk');
  commitOnMain(root, { 'src/a.js': 'main two\n', 'src/b.js': 'main two\n' }, 'only local main has this');
  write(root, 'src/a.js', 'mine\n');
  git(root, 'symbolic-ref', '--delete', 'refs/remotes/origin/HEAD');
  assert.equal(drift.compute(root).drift.onto, 'main', 'no origin/HEAD yet');
  git(root, 'symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/trunk');
  const viaOrigin = drift.compute(root);
  assert.equal(viaOrigin.drift.onto, 'origin/trunk');
  assert.equal(viaOrigin.drift.commits, 1, 'origin/trunk is one commit behind local main');
  assert.match(viaOrigin.warning, /^origin\/trunk has 1 commit since/);
  assert.equal(drift.compute(root, { onto: 'main' }).drift.commits, 2, 'an explicit --onto wins');
});

test('the default is silent when neither origin/HEAD nor main exists, and outside git', async () => {
  const root = forkedRepo();
  git(root, 'branch', '-m', 'main', 'trunk');
  const result = gate.shipGate(root);
  assert.equal(result.drift, null);
  assert.match(result.driftReason, /no origin\/HEAD or main to compare with/);
  assert.equal(byName(result).drift, undefined);
  const plain = tempDir();
  assert.deepEqual(drift.compute(plain), { drift: null, reason: 'not a git repository', warning: null });
  const unborn = tempDir();
  git(unborn, 'init', '-q');
  assert.equal(drift.compute(unborn).reason, 'no commits yet');
});

test('unrelated histories, and git failing midway, give no warning and a reason', () => {
  const root = forkedRepo();
  git(root, 'checkout', '-q', '--orphan', 'other');
  git(root, 'rm', '-rfq', '.');
  write(root, 'x.txt', 'x\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'unrelated');
  git(root, 'checkout', '-q', 'feature');
  const result = drift.compute(root, { onto: 'other' });
  assert.equal(result.drift, null);
  assert.match(result.reason, /other shares no history with HEAD/);
  assert.equal(drift.warningFor(null), '');
  assert.equal(drift.warningFor({ onto: 'm', commits: 1, files: [] }), '');
});

test('file names and ref names with control characters print safely', () => {
  const root = forkedRepo();
  const odd = 'src/odd\u001b[31mname\n.js';
  commitOnMain(root, { [odd]: 'main\n' });
  write(root, odd, 'mine\n');
  const result = gate.shipGate(root, { onto: 'main' });
  assert.equal(byName(result).drift.severity, 'warning');
  assert.doesNotMatch(byName(result).drift.detail, CONTROL);
  assert.match(byName(result).drift.detail, /odd\\u001b\[31mname\\u000a\.js/);
  assert.doesNotMatch(drift.warningFor({ onto: 'x\u001b[2J', commits: 1, files: ['a'] }), CONTROL);
  const bad = gate.shipGate(root, { onto: 'no\u001b[2Jsuch' });
  assert.equal(bad.drift, null);
  assert.doesNotMatch(bad.driftReason, CONTROL);
});

test('the ship gate still ends with the usual verdict line', async () => {
  const root = forkedRepo();
  commitOnMain(root, { 'src/a.js': 'main\n' });
  write(root, 'src/a.js', 'mine\n');
  const text = await run(['gate', 'ship'], { cwd: root });
  assert.match(text.out, /Ship gate: (PASS|BLOCKED)$/m);
  assert.match(text.out, /! drift/);
});
