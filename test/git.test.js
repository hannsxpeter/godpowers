const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const gitTools = require('../lib/git');
const { spawnSync } = require('child_process');

const { tempDir, write, git, gitRepo } = require('./helpers');

test('fingerprint matches HEAD on a clean tree and survives a commit of the same content', () => {
  const root = gitRepo();
  const clean = gitTools.treeFingerprint(root);
  assert.equal(clean, gitTools.headTree(root));
  write(root, 'src/app.js', 'module.exports = 2;\n');
  const edited = gitTools.treeFingerprint(root);
  assert.notEqual(edited, clean);
  git(root, 'commit', '-q', '-am', 'edit');
  assert.equal(gitTools.treeFingerprint(root), edited);
  assert.equal(gitTools.headTree(root), edited);
});

test('fingerprint includes untracked files, skips ignored files and .godpowers, and writes nothing', () => {
  const root = gitRepo();
  const base = gitTools.treeFingerprint(root);
  write(root, '.gitignore', 'build/\n');
  git(root, 'add', '.gitignore');
  git(root, 'commit', '-q', '-m', 'ignore');
  const withIgnore = gitTools.treeFingerprint(root);
  assert.notEqual(withIgnore, base);
  write(root, 'build/out.js', 'ignored');
  assert.equal(gitTools.treeFingerprint(root), withIgnore);
  write(root, '.godpowers/STATE.md', 'state');
  write(root, '.godpowers/evidence.jsonl', '{}\n');
  assert.equal(gitTools.treeFingerprint(root), withIgnore);
  git(root, 'add', '.godpowers');
  git(root, 'commit', '-q', '-m', 'state');
  assert.equal(gitTools.treeFingerprint(root), withIgnore, 'committed bookkeeping does not change the fingerprint');
  assert.equal(gitTools.headTree(root), withIgnore);
  write(root, 'src/new.js', 'new');
  const index = fs.statSync(path.join(root, '.git/index')).mtimeMs;
  const objects = git(root, 'count-objects');
  assert.notEqual(gitTools.treeFingerprint(root), withIgnore);
  assert.equal(fs.statSync(path.join(root, '.git/index')).mtimeMs, index, 'the index is untouched');
  assert.equal(git(root, 'count-objects'), objects, 'no objects are written');
});

test('changedPaths lists the difference between two snapshots', () => {
  const root = gitRepo();
  const a = gitTools.snapshot(root);
  write(root, 'README.md', '# hi\n');
  write(root, 'src/app.js', 'module.exports = 3;\n');
  const b = gitTools.snapshot(root);
  assert.deepEqual(gitTools.changedPaths(a.files, b.files), ['README.md', 'src/app.js']);
  assert.deepEqual(gitTools.changedPaths(a.files, a.files), []);
  assert.equal(gitTools.changedPaths(null, b.files), null);
  fs.rmSync(path.join(root, 'src/app.js'));
  const c = gitTools.snapshot(root);
  assert.equal(c.files['src/app.js'], undefined, 'a deleted tracked file drops out');
  assert.deepEqual(gitTools.changedPaths(b.files, c.files), ['src/app.js']);
});

test('hashes match git blob hashes, and symlinks and submodule-like directories are handled', () => {
  const root = gitRepo();
  const snap = gitTools.snapshot(root);
  assert.equal(snap.files['src/app.js'], git(root, 'hash-object', 'src/app.js'));
  write(root, 'notes.txt', 'hello\n');
  assert.equal(gitTools.hashPath(root, 'notes.txt'), git(root, 'hash-object', 'notes.txt'));
  fs.symlinkSync('notes.txt', path.join(root, 'link'));
  assert.match(gitTools.hashPath(root, 'link'), /^[0-9a-f]{40}$/);
  fs.mkdirSync(path.join(root, 'vendor'));
  assert.equal(gitTools.hashPath(root, 'vendor'), 'dir:unknown', 'a plain directory is not the outer repo');
  assert.equal(gitTools.hashPath(root, 'missing'), null);
});

test('edits inside a nested repository or dirty submodule change the fingerprint', () => {
  const root = gitRepo();
  const nested = gitRepo();
  fs.renameSync(nested, path.join(root, 'nested'));
  const first = gitTools.snapshot(root);
  assert.match(first.files['nested/'], /^dir:[0-9a-f]{64}$/);
  write(root, 'nested/src/app.js', 'nested edit one');
  const second = gitTools.treeFingerprint(root);
  assert.notEqual(second, first.fingerprint);
  write(root, 'nested/src/app.js', 'nested edit two');
  assert.notEqual(gitTools.treeFingerprint(root), second, 'a second edit to an already dirty nested repo counts');
});

test('files under line-ending conversion hash the same before and after commit', () => {
  const root = gitRepo();
  git(root, 'config', 'core.autocrlf', 'true');
  write(root, 'win.txt', 'one\r\ntwo\r\n');
  const before = gitTools.treeFingerprint(root);
  git(root, 'add', 'win.txt');
  git(root, 'commit', '-q', '-m', 'crlf');
  assert.equal(gitTools.treeFingerprint(root), before);
  const later = new Date(Date.now() + 5000);
  fs.utimesSync(path.join(root, 'win.txt'), later, later);
  assert.equal(gitTools.treeFingerprint(root), before, 'touching a file does not change it');
});

test('SHA-256 repositories fingerprint consistently', t => {
  const root = tempDir();
  const init = spawnSync('git', ['init', '-q', '--object-format=sha256', '-b', 'main'], { cwd: root });
  if (init.status !== 0) return t.skip('git without SHA-256 support');
  git(root, 'config', 'user.email', 'test@example.com');
  git(root, 'config', 'user.name', 'Test');
  write(root, 'a.js', 'one');
  const before = gitTools.treeFingerprint(root);
  assert.equal(gitTools.hashPath(root, 'a.js').length, 64);
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'init');
  assert.equal(gitTools.treeFingerprint(root), before);
  assert.equal(gitTools.headTree(root), before);
});

test('an unreadable file does not break the snapshot', t => {
  if (process.getuid && process.getuid() === 0) return t.skip('root can read everything');
  const root = gitRepo();
  write(root, 'secret.bin', 'data');
  fs.chmodSync(path.join(root, 'secret.bin'), 0o000);
  try {
    const snap = gitTools.snapshot(root);
    assert.match(snap.files['secret.bin'], /^unreadable:4:/);
    assert.match(gitTools.hashPath(root, 'src/app.js'), /^[0-9a-f]{40}$/);
  } finally {
    fs.chmodSync(path.join(root, 'secret.bin'), 0o644);
  }
});

test('merge conflicts are hashed from disk', () => {
  const root = gitRepo();
  git(root, 'checkout', '-q', '-b', 'other');
  write(root, 'src/app.js', 'module.exports = "other";\n');
  git(root, 'commit', '-q', '-am', 'other');
  git(root, 'checkout', '-q', 'main');
  write(root, 'src/app.js', 'module.exports = "main";\n');
  git(root, 'commit', '-q', '-am', 'main');
  spawnSync('git', ['merge', 'other'], { cwd: root });
  const snap = gitTools.snapshot(root);
  assert.equal(snap.files['src/app.js'], gitTools.hashPath(root, 'src/app.js'));
});

test('works for a project in a subdirectory of the repository', () => {
  const top = gitRepo();
  write(top, 'packages/app/index.js', 'one');
  write(top, 'packages/other/index.js', 'other');
  git(top, 'add', '-A');
  git(top, 'commit', '-q', '-m', 'packages');
  const root = path.join(top, 'packages/app');
  const info = gitTools.repoInfo(root);
  assert.equal(info.prefix, 'packages/app');
  const clean = gitTools.snapshot(root);
  assert.deepEqual(Object.keys(clean.files), ['index.js']);
  assert.equal(clean.fingerprint, gitTools.headTree(root));
  write(top, 'packages/other/index.js', 'changed elsewhere');
  assert.equal(gitTools.treeFingerprint(root), clean.fingerprint, 'changes outside the project do not count');
  write(root, '.godpowers/STATE.md', 'x');
  assert.equal(gitTools.treeFingerprint(root), clean.fingerprint);
  write(root, 'index.js', 'two');
  const edited = gitTools.snapshot(root);
  assert.notEqual(edited.fingerprint, clean.fingerprint);
  assert.deepEqual(gitTools.changedPaths(clean.files, edited.files), ['index.js']);
  write(root, 'notes.md', 'untracked in the subdirectory');
  assert.ok('notes.md' in gitTools.snapshot(root).files);
  git(top, 'add', '-A');
  git(top, 'commit', '-q', '-m', 'sub edits');
  write(root, 'index.js', 'three');
  assert.deepEqual(gitTools.removedLines(root, 'index.js'), ['two']);
});

test('removedLines reports committed lines that were edited or deleted', () => {
  const root = gitRepo();
  write(root, 'notes.md', 'one\ntwo\n');
  assert.deepEqual(gitTools.removedLines(root, 'notes.md'), [], 'untracked file');
  git(root, 'add', 'notes.md');
  git(root, 'commit', '-q', '-m', 'notes');
  write(root, 'notes.md', 'one\ntwo\nthree\n');
  assert.deepEqual(gitTools.removedLines(root, 'notes.md'), []);
  write(root, 'notes.md', 'uno\ntwo\n');
  assert.deepEqual(gitTools.removedLines(root, 'notes.md'), ['one']);
  git(root, 'config', 'diff.external', 'false');
  assert.deepEqual(gitTools.removedLines(root, 'notes.md'), ['one'], 'an external diff tool does not hide removals');
  write(root, 'notes.md', 'one\r\ntwo\r\n');
  assert.deepEqual(gitTools.removedLines(root, 'notes.md'), [], 'line-ending changes are not edits');
});

test('returns null outside a repository and for a repo without commits', () => {
  const plain = tempDir();
  assert.equal(gitTools.isRepo(plain), false);
  assert.equal(gitTools.treeFingerprint(plain), null);
  assert.equal(gitTools.headTree(plain), null);
  assert.deepEqual(gitTools.removedLines(plain, 'x'), []);
  assert.equal(gitTools.repoInfo(path.join(plain, 'missing')), null);
  const fresh = tempDir();
  git(fresh, 'init', '-q');
  write(fresh, 'a.txt', 'a');
  assert.equal(gitTools.headTree(fresh), null);
  assert.match(gitTools.treeFingerprint(fresh), /^[0-9a-f]{40,64}$/);
  assert.ok(fs.existsSync(path.join(fresh, '.git')));
});

test('a same-size edit is still detected after the clock moves to the next second', async () => {
  const root = gitRepo();
  const clean = gitTools.treeFingerprint(root);
  write(root, 'src/app.js', 'module.exports = 9;\n');
  const edited = gitTools.treeFingerprint(root);
  assert.notEqual(edited, clean);
  await new Promise(resolve => setTimeout(resolve, 1100));
  assert.equal(gitTools.treeFingerprint(root), edited, 'git trusts cached stats only as far as the real index would');
});

test('fingerprints give the tree and the code from one snapshot', () => {
  const root = gitRepo();
  const isDoc = rel => rel.endsWith('.md');
  const clean = gitTools.fingerprints(root, isDoc);
  assert.equal(clean.tree, gitTools.treeFingerprint(root));
  write(root, 'README.md', 'docs');
  const docs = gitTools.fingerprints(root, isDoc);
  assert.notEqual(docs.tree, clean.tree);
  assert.equal(docs.code, clean.code);
  write(root, 'src/app.js', 'changed');
  assert.notEqual(gitTools.fingerprints(root, isDoc).code, clean.code);
  assert.deepEqual(gitTools.fingerprints(tempDir(), isDoc), { tree: null, code: null });
  assert.equal(gitTools.codeFingerprint(null, isDoc), null, 'unknown without a file map');
  assert.equal(gitTools.codeFingerprint({ 'a.md': '1', 'b.js': '2' }, isDoc), gitTools.fingerprintOf({ 'b.js': '2' }));
});

test('workingChanges lists changed and untracked files, not deleted or bookkeeping files', () => {
  const root = gitRepo();
  write(root, 'gone.txt', 'x');
  write(root, 'staged.txt', 'x');
  write(root, '.godpowers/STATE.md', 'x');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'more');
  assert.deepEqual(gitTools.workingChanges(root), []);
  write(root, 'src/app.js', 'edited');
  write(root, 'staged.txt', 'staged edit');
  git(root, 'add', 'staged.txt');
  write(root, 'new dir/new.js', 'untracked');
  write(root, '.godpowers/evidence.jsonl', 'ignored');
  fs.rmSync(path.join(root, 'gone.txt'));
  write(root, 'added.txt', 'staged add');
  git(root, 'add', 'added.txt');
  assert.deepEqual(gitTools.workingChanges(root), ['added.txt', 'new dir/new.js', 'src/app.js', 'staged.txt']);
  const before = gitTools.treeFingerprint(root);
  gitTools.workingChanges(root);
  assert.equal(gitTools.treeFingerprint(root), before);
});

test('workingChanges before the first commit lists every file, and is empty outside git', () => {
  const fresh = tempDir();
  git(fresh, 'init', '-q');
  write(fresh, 'a.txt', 'a');
  write(fresh, 'sub/b.txt', 'b');
  assert.deepEqual(gitTools.workingChanges(fresh), ['a.txt', 'sub/b.txt']);
  assert.deepEqual(gitTools.workingChanges(tempDir()), []);
});

test('workingChanges is relative to a project in a subdirectory', () => {
  const root = gitRepo();
  write(root, 'pkg/a.js', 'a');
  write(root, 'other/b.js', 'b');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'pkg');
  write(root, 'pkg/a.js', 'edited');
  write(root, 'pkg/c.js', 'new');
  write(root, 'other/b.js', 'edited');
  assert.deepEqual(gitTools.workingChanges(path.join(root, 'pkg')), ['a.js', 'c.js']);
});

test('a file name with a newline or other control character is part of every view of the tree', () => {
  const root = gitRepo();
  const clean = gitTools.treeFingerprint(root);
  const cleanCode = gitTools.fingerprints(root, () => false).code;
  for (const name of ['src/auth/token\n.js', 'src/bell\u0007.js', 'src/tab\t.js']) {
    write(root, name, 'one');
    const added = gitTools.treeFingerprint(root);
    assert.notEqual(added, clean, JSON.stringify(name));
    assert.notEqual(gitTools.fingerprints(root, () => false).code, cleanCode);
    write(root, name, 'two');
    assert.notEqual(gitTools.treeFingerprint(root), added, 'an edit to it changes the fingerprint');
    assert.ok(gitTools.workingChanges(root).includes(name), 'workingChanges lists it');
    assert.ok(gitTools.changedSince(root, 'HEAD').includes(name), 'changedSince lists it');
    assert.ok(gitTools.snapshot(root).files[name], 'the snapshot has its hash');
    fs.rmSync(path.join(root, name));
  }
  assert.equal(gitTools.treeFingerprint(root), clean);
  write(root, 'src/auth/token\n.js', 'tracked');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'odd name');
  const committed = gitTools.treeFingerprint(root);
  assert.equal(gitTools.headTree(root), committed);
  write(root, 'src/auth/token\n.js', 'edited after commit');
  assert.notEqual(gitTools.treeFingerprint(root), committed, 'a tracked file with a newline in its name is rehashed');
  assert.deepEqual(gitTools.changedSince(root, 'HEAD'), ['src/auth/token\n.js']);
  assert.equal(gitTools.hashPath(root, 'src/auth/token\n.js'), gitTools.git(root, ['hash-object', '--', 'src/auth/token\n.js']).stdout.trim());
  assert.deepEqual(gitTools.diffSince(root, 'HEAD').files.map(f => f.path), ['src/auth/token\n.js']);
});

test('changes cannot be listed in a repository without a work tree, and the error says so', () => {
  const root = gitRepo();
  const bare = path.join(tempDir(), 'bare.git');
  git(root, 'clone', '-q', '--bare', root, bare);
  assert.equal(git(bare, 'rev-parse', 'HEAD'), git(root, 'rev-parse', 'HEAD'), 'the base itself resolves in a bare repository');
  assert.equal(gitTools.resolveBase(bare, 'HEAD'), git(root, 'rev-parse', 'HEAD'));
  assert.throws(() => gitTools.changedSince(bare, 'HEAD'), /no work tree/);
  assert.throws(() => gitTools.diffSince(bare, 'HEAD'), /no work tree/);
  assert.throws(() => gitTools.changedSince(path.join(bare, 'objects'), 'HEAD'), /no work tree/, 'inside the git directory too');
  assert.deepEqual(gitTools.changedSince(root, 'HEAD'), []);
});

test('releaseBase takes only v<digit> tags and skips tags on HEAD', () => {
  const root = gitRepo();
  git(root, 'tag', 'v1.0.0');
  write(root, 'one.txt', '1');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'one');
  git(root, 'tag', 'vnext');
  git(root, 'tag', 'v-draft');
  git(root, 'tag', '-a', 'vfoo', '-m', 'not a release');
  assert.equal(gitTools.releaseBase(root).ref, 'v1.0.0', 'tags that are not v<digit> do not count');
  git(root, 'tag', 'v1.1.0');
  assert.equal(gitTools.releaseBase(root).ref, 'v1.0.0', 'the tag on HEAD is skipped: the just-tagged release compares with the previous one');
  write(root, 'two.txt', '2');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'two');
  assert.equal(gitTools.releaseBase(root).ref, 'v1.1.0');
  git(root, 'tag', '-a', 'v2.0.0', '-m', 'annotated');
  git(root, 'tag', 'v2.0.1');
  assert.equal(gitTools.releaseBase(root).ref, 'v1.1.0', 'annotated and lightweight tags on HEAD are both skipped');
  const only = gitRepo();
  git(only, 'tag', 'v1.0.0');
  assert.equal(gitTools.releaseBase(only), null, 'a repository whose only tag is on HEAD has no base');
});

test('codeFingerprint mixes in the documentation rule and is null without code files', () => {
  const files = { 'a.md': '1', 'b.js': '2' };
  const plain = rel => rel.endsWith('.md');
  const ruleA = Object.assign(rel => rel.endsWith('.md'), { policy: 'rule-a' });
  const ruleB = Object.assign(rel => rel.endsWith('.md'), { policy: 'rule-b' });
  assert.equal(gitTools.codeFingerprint(files, plain), gitTools.fingerprintOf({ 'b.js': '2' }), 'a predicate without a policy changes nothing');
  assert.notEqual(gitTools.codeFingerprint(files, ruleA), gitTools.codeFingerprint(files, plain));
  assert.notEqual(gitTools.codeFingerprint(files, ruleA), gitTools.codeFingerprint(files, ruleB));
  assert.equal(gitTools.codeFingerprint(files, ruleA), gitTools.codeFingerprint({ ...files, 'c.md': '3' }, ruleA));
  assert.equal(gitTools.codeFingerprint({ 'a.md': '1' }, ruleA), null, 'only documentation: nothing to carry forward');
  assert.equal(gitTools.codeFingerprint({}, plain), null);
});

test('showAt reads a file as it was at a commit, relative to the project, or null', () => {
  const root = gitRepo();
  const sha = git(root, 'rev-parse', 'HEAD');
  assert.equal(gitTools.showAt(root, sha, 'src/app.js'), 'module.exports = 1;\n');
  assert.equal(gitTools.showAt(root, sha, 'missing.txt'), null);
  assert.equal(gitTools.showAt(root, 'not-a-sha', 'src/app.js'), null);
  assert.equal(gitTools.showAt(tempDir(), sha, 'src/app.js'), null);
  assert.equal(gitTools.showAt(path.join(root, 'src'), sha, 'app.js'), 'module.exports = 1;\n', 'a project in a subdirectory');
});
