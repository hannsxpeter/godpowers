const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const testguard = require('../lib/testguard');
const gitTools = require('../lib/git');
const { tempDir, write, git, gitRepo, run } = require('./helpers');

/**
 * A repo whose first commit holds `files`, tagged v1.0.0, plus an empty commit
 * after the tag: a tag on HEAD is never the release base.
 */
function taggedRepo(files = {}) {
  const root = gitRepo();
  for (const [rel, content] of Object.entries(files)) write(root, rel, content);
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'tests');
  git(root, 'tag', 'v1.0.0');
  git(root, 'commit', '-q', '--allow-empty', '-m', 'after');
  return root;
}

async function guard(root, args = []) {
  const result = await run(['tests', '--json', ...args], { cwd: root });
  return { ...result, json: result.out.trim().startsWith('{') ? JSON.parse(result.out) : null };
}

const kinds = json => json.findings.map(f => `${f.kind} ${f.file}${f.line ? `:${f.line}` : ''}`);

test('isTestPath knows test directories and file names', () => {
  for (const rel of ['test/a.js', 'src/tests/a.js', 'src/__tests__/a.js', 'spec/a.rb', 'x/specs/y.rb', 'e2e/a.ts', 'Tests/A.cs', 'a.test.js', 'a.test.d.ts', 'a.spec.ts', 'a_test.go', 'a_spec.rb', 'test_a.py', 'src/UserTest.java', 'UserTests.java', 'UserTest.kt', 'UserTests.cs']) {
    assert.equal(testguard.isTestPath(rel), true, rel);
  }
  for (const rel of ['src/app.js', 'Contest.java', 'latest.js', 'src/testing.js', 'docs/tests.md', 'contest.py', 'prefix_test_a.py', 'src/test']) {
    assert.equal(testguard.isTestPath(rel), false, rel);
  }
});

test('a deleted test file is a finding, a renamed one is not', async () => {
  const root = taggedRepo({ 'test/a.test.js': 'test("a", () => {});\n', 'test/b.test.js': 'test("b", () => {});\n', 'test/c.test.js': 'test("c", () => {});\n', 'src/gone.js': 'x\n' });
  fs.rmSync(path.join(root, 'test/a.test.js'));
  git(root, 'mv', 'test/b.test.js', 'test/renamed.test.js');
  fs.renameSync(path.join(root, 'test/c.test.js'), path.join(root, 'test/c2.test.js'));
  fs.rmSync(path.join(root, 'src/gone.js'));
  const result = await guard(root);
  assert.equal(result.code, 1);
  assert.deepEqual(kinds(result.json), ['deleted-test test/a.test.js'], 'a staged rename and an unstaged move are not deletions');
  assert.equal(result.json.base.ref, 'v1.0.0');
  assert.equal(result.json.base.sha, git(root, 'rev-parse', 'v1.0.0'));
});

test('one replacement copy pairs with one deletion, so surplus deletions are findings', async () => {
  const same = 'test("a", () => { expect(1).toBe(1); });\n';
  const root = taggedRepo({ 'test/a.test.js': same, 'test/b.test.js': same, 'test/c.test.js': same, 'test/other.test.js': 'test("o", () => {});\n' });
  fs.rmSync(path.join(root, 'test/a.test.js'));
  fs.rmSync(path.join(root, 'test/b.test.js'));
  fs.rmSync(path.join(root, 'test/c.test.js'));
  fs.rmSync(path.join(root, 'test/other.test.js'));
  write(root, 'test/merged.test.js', same);
  write(root, 'test/other-moved.test.js', 'test("o", () => {});\n');
  const result = await guard(root);
  assert.equal(result.json.findings.length, 2, 'three twins, one copy: two deletions remain');
  assert.deepEqual(result.json.findings.map(f => f.kind), ['deleted-test', 'deleted-test']);
  assert.ok(result.json.findings.every(f => ['test/a.test.js', 'test/b.test.js', 'test/c.test.js'].includes(f.file)));
  write(root, 'test/merged2.test.js', same);
  write(root, 'test/merged3.test.js', same);
  assert.deepEqual((await guard(root)).json.findings, [], 'one copy per deletion is a plain move');
});

test('a test file renamed to a path that is not a test is a finding', async () => {
  const root = taggedRepo({ 'test/a.test.js': 'test("a", () => {\n  expect(1).toBe(1);\n});\n' });
  git(root, 'mv', 'test/a.test.js', 'src/a.js');
  const result = await guard(root);
  assert.deepEqual(kinds(result.json), ['deleted-test test/a.test.js']);
  assert.match(result.json.findings[0].detail, /renamed to src\/a\.js/);
});

test('fewer test declarations and fewer assertions are findings; a renamed test is not', async () => {
  const before = [
    'describe("suite", () => {',
    '  it("one", () => {',
    '    expect(1).toBe(1);',
    '    expect(2).toBe(2);',
    '  });',
    '  it("two", () => {',
    '    assert.equal(3, 3);',
    '  });',
    '});',
    ''
  ].join('\n');
  const root = taggedRepo({ 'test/a.test.js': before, 'test/b.test.js': before, 'test/c.test.js': before });
  // a: a test and two assertions removed.
  write(root, 'test/a.test.js', 'describe("suite", () => {\n  it("one", () => {\n    expect(1).toBe(1);\n  });\n});\n');
  // b: a test renamed, assertions unchanged.
  write(root, 'test/b.test.js', before.replace('it("one"', 'it("one, renamed"'));
  // c: more tests and assertions than before.
  write(root, 'test/c.test.js', `${before}it("three", () => { expect(4).toBe(4); });\n`);
  const result = await guard(root);
  assert.deepEqual(kinds(result.json), ['fewer-tests test/a.test.js', 'fewer-assertions test/a.test.js']);
  assert.match(result.json.findings[0].detail, /1 test declaration removed, 0 added/);
  assert.match(result.json.findings[1].detail, /2 assertion lines removed, 0 added/);
});

test('only lines in test files count', async () => {
  const root = taggedRepo({ 'src/app.test-utils.js': 'expect(1);\nit("x", () => {});\n', 'src/lib.js': 'it.skip("x");\nassert(1);\n' }); // godpowers: allow-test-change
  write(root, 'src/app.test-utils.js', 'nothing\n');
  write(root, 'src/lib.js', 'describe.only("x");\nit.skip("y");\n'); // godpowers: allow-test-change
  write(root, 'src/new.js', 'it.only("z");\n'); // godpowers: allow-test-change
  const result = await guard(root);
  assert.equal(result.code, 0);
  assert.deepEqual(result.json.findings, []);
});

test('skip and focus markers in added lines report the new line number and trimmed text', async () => {
  const root = taggedRepo({ 'test/a.test.js': 'test("a", () => {});\n\ntest("b", () => {});\n' });
  const long = `    ${'x'.repeat(200)}`;
  write(root, 'test/a.test.js', ['test("a", () => {});', '', 'test.skip("b", () => {});', 'test("c", { skip: true }, () => {});', long, 'it.only("d", () => {});', ''].join('\n')); // godpowers: allow-test-change
  const result = await guard(root);
  assert.deepEqual(kinds(result.json), ['skip-marker test/a.test.js:3', 'skip-marker test/a.test.js:4', 'skip-marker test/a.test.js:6']);
  assert.equal(result.json.findings[0].detail, 'test.skip("b", () => {});'); // godpowers: allow-test-change
  const text = (await run(['tests'], { cwd: root })).out;
  assert.match(text, /^Compared with v1\.0\.0 \([0-9a-f]{7}\): 3 finding\(s\)\n/);
  assert.match(text, /skip-marker\s+test\/a\.test\.js:3: test\.skip\("b"/);
  write(root, 'test/a.test.js', `test.skip("${'y'.repeat(300)}");\n`); // godpowers: allow-test-change
  const trimmed = (await guard(root)).json.findings.find(f => f.kind === 'skip-marker');
  assert.equal(trimmed.detail.length, 120);
  assert.match(trimmed.detail, /\.\.\.$/);
});

// Each case: the base content, the working content, and the finding kinds expected.
const LANGUAGES = {
  python: ['test/test_a.py', 'def test_a():\n    assert 1\n\nasync def test_b():\n    assert 2\n', '@pytest.mark.skip(reason="later")\ndef test_a():\n    assert 1\n', ['fewer-tests', 'fewer-assertions', 'skip-marker']], // godpowers: allow-test-change
  go: ['a_test.go', 'func TestA(t *testing.T) {\n\tt.Errorf("x")\n}\nfunc TestB(t *testing.T) {\n\trequire.Equal(t, 1, 1)\n}\n', 'func TestA(t *testing.T) {\n\tt.Skip("flaky")\n}\n', ['fewer-tests', 'fewer-assertions', 'skip-marker']],
  rust: ['tests/a.rs', '#[test]\nfn a() { assert_eq!(1, 1); }\n#[tokio::test]\nasync fn b() { assert!(true); }\n', '#[test]\n#[ignore]\nfn a() { assert_eq!(1, 1); }\n', ['fewer-tests', 'fewer-assertions', 'skip-marker']], // godpowers: allow-test-change
  java: ['src/UserTest.java', '@Test void a() { assertEquals(1, 1); }\n@Test void b() { assertTrue(true); }\n', '@Disabled\n@Test void a() { assertEquals(1, 1); }\n', ['fewer-tests', 'fewer-assertions', 'skip-marker']], // godpowers: allow-test-change
  kotlin: ['src/UserTest.kt', '@Test fun a() {}\n@Test fun b() {}\n', '@Test fun a() {}\n@Ignore\n', ['fewer-tests', 'skip-marker']], // godpowers: allow-test-change
  csharp: ['src/UserTests.cs', '[Fact] void A() { Assert.Equal(1, 1); }\n[Theory] void B() { Assert.True(true); }\n', '[Fact(Skip = "later")] void A() { Assert.Equal(1, 1); }\n', ['fewer-tests', 'fewer-assertions', 'skip-marker']], // godpowers: allow-test-change
  python2: ['tests/test_b.py', 'class T(unittest.TestCase):\n    def test_a(self):\n        self.assertEqual(1, 1)\n', 'class T(unittest.TestCase):\n    @unittest.skip("x")\n    def test_a(self):\n        self.assertEqual(1, 1)\n', ['skip-marker']] // godpowers: allow-test-change
};

for (const [name, [file, before, after, expected]] of Object.entries(LANGUAGES)) {
  test(`test-guard knows ${name} declarations, assertions, and skip markers`, async () => {
    const root = taggedRepo({ [file]: before });
    write(root, file, after);
    const result = await guard(root);
    assert.deepEqual([...new Set(result.json.findings.map(f => f.kind))].sort(), [...expected].sort(), JSON.stringify(result.json.findings));
  });
}

test('more markers: xit, fit, pytest.skip, xfail, Ignore attributes, and look-alikes that are not markers', async () => {
  const root = taggedRepo({ 'test/a.test.js': 'x\n', 'test/test_a.py': 'x\n', 'test/c.test.cs': 'x\n' });
  write(root, 'test/a.test.js', 'xit("a", () => {});\nfdescribe("b", () => {});\nmodel.fit(data);\nconst fit = 1;\nit("skipped by name", () => {});\nsomething.only();\n'); // godpowers: allow-test-change
  write(root, 'test/test_a.py', '@pytest.mark.xfail\ndef test_a():\n    pytest.skip("no")\nmodel.fit(x)\n'); // godpowers: allow-test-change
  write(root, 'test/c.test.cs', '[Test, Ignore("later")]\n'); // godpowers: allow-test-change
  const result = await guard(root);
  assert.deepEqual(kinds(result.json), ['skip-marker test/a.test.js:1', 'skip-marker test/a.test.js:2', 'skip-marker test/c.test.cs:1', 'skip-marker test/test_a.py:1', 'skip-marker test/test_a.py:3']);
});

test('the options-object focus form (only: true) is a marker, like skip: true', async () => {
  const root = taggedRepo({ 'test/a.test.js': 'x\n' });
  write(root, 'test/a.test.js', ['test("a", { only: true }, () => {});', 'test("b", { timeout: 5, only: true }, () => {});', 'test("c", { only: false }, () => {});', 'test("d", { timeout: 5, skip: true }, () => {});', 'const only = true;', ''].join('\n')); // godpowers: allow-test-change
  write(root, 'test/new.test.js', 'test("n", { only: true }, () => {});\n'); // godpowers: allow-test-change
  const result = await guard(root);
  assert.deepEqual(kinds(result.json), ['skip-marker test/a.test.js:1', 'skip-marker test/a.test.js:2', 'skip-marker test/a.test.js:4', 'skip-marker test/new.test.js:1']);
});

test('very long lines are matched in linear time, and a marker far along a long line is still found', async () => {
  const root = taggedRepo({ 'test/a.test.js': 'x\n' });
  const hostile = `${'[ '.repeat(50000)}Ignorable`;
  const padded = `${'x'.repeat(5000)} it.skip("late");`; // godpowers: allow-test-change
  write(root, 'test/a.test.js', `${hostile}\n${'#[test('.repeat(15000)}\n${padded}\n`);
  write(root, 'test/new.test.js', `${hostile}\n${'a'.repeat(100000)}\n`);
  const started = Date.now();
  const result = await guard(root);
  assert.ok(Date.now() - started < 5000, `took ${Date.now() - started} ms`);
  assert.deepEqual(kinds(result.json).filter(entry => entry.startsWith('skip-marker')), ['skip-marker test/a.test.js:3']);
  assert.ok(hostile.length > 100000);
});

test('an untracked test file is checked for markers with its real line numbers; others are not', async () => {
  const root = taggedRepo({ 'src/keep.js': 'x\n' });
  write(root, 'test/new.test.js', 'test("a", () => {});\n\n\nit.skip("b", () => {});\n');
  write(root, 'src/new.js', 'it.skip("c");\n'); // godpowers: allow-test-change
  fs.writeFileSync(path.join(root, 'test/bin.test.js'), Buffer.from('it.skip(\0\u0001')); // godpowers: allow-test-change
  write(root, '.gitignore', 'ignored.test.js\n');
  write(root, 'ignored.test.js', 'it.skip("d");\n'); // godpowers: allow-test-change
  write(root, '.godpowers/test/x.test.js', 'it.skip("e");\n'); // godpowers: allow-test-change
  const result = await guard(root);
  assert.deepEqual(kinds(result.json), ['skip-marker test/new.test.js:4']);
});

test('a binary fixture that was binary at the base too carries no lines and is not a finding', async () => {
  const root = gitRepo();
  fs.mkdirSync(path.join(root, 'test'));
  fs.writeFileSync(path.join(root, 'test/data.test.bin'), Buffer.from([0, 9, 9]));
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'fixture');
  git(root, 'tag', 'v1.0.0');
  git(root, 'commit', '-q', '--allow-empty', '-m', 'after');
  fs.writeFileSync(path.join(root, 'test/data.test.bin'), Buffer.from([0, 1, 2, 0x69, 0x74, 0x2e, 0x73, 0x6b, 0x69, 0x70, 0x28]));
  assert.deepEqual((await guard(root)).json.findings, []);
});

test('a test file that was text at the base and is binary now is a finding', async () => {
  const root = taggedRepo({ 'test/a.test.js': 'test("a", () => { expect(1).toBe(1); });\n', 'src/app.js': 'x\n' });
  fs.writeFileSync(path.join(root, 'test/a.test.js'), Buffer.from('/*\0*/'));
  fs.writeFileSync(path.join(root, 'src/app.js'), Buffer.from('\0'));
  const result = await guard(root);
  assert.deepEqual(kinds(result.json), ['binary-test test/a.test.js'], 'a binary non-test file is not a finding');
  assert.match(result.json.findings[0].detail, /text at the base and is binary now/);
  assert.equal(result.code, 1);
  assert.match((await run(['tests'], { cwd: root })).out, /^binary-test\s+test\/a\.test\.js: /m);
});

test('without a base the command explains and exits 2', async () => {
  const root = gitRepo();
  const text = await run(['tests'], { cwd: root });
  assert.equal(text.code, 2);
  assert.equal(text.out.trim(), 'No base to compare against: no v* tag is reachable from HEAD. Pass --base <ref>.');
  const json = await guard(root);
  assert.equal(json.code, 2);
  assert.equal(json.json.base, null);
  assert.match(json.json.error, /No base to compare against/);
  assert.equal((await run(['tests'], { cwd: tempDir() })).code, 2);
});

test('--base compares with any commit and refuses refs that could be options or are not commits', async () => {
  const root = taggedRepo({ 'test/a.test.js': 'test("a", () => {});\n' });
  write(root, 'test/a.test.js', '');
  git(root, 'commit', '-qam', 'weaken');
  assert.equal((await guard(root)).code, 1, 'the weakening is committed after v1.0.0, so the default base finds it');
  const head = git(root, 'rev-parse', 'HEAD');
  const clean = await guard(root, ['--base', head]);
  assert.equal(clean.code, 0);
  assert.equal(clean.json.base.ref, head);
  assert.equal(clean.json.base.sha, head);
  const refused = await run(['tests', '--base=--output=guard-output'], { cwd: root });
  assert.equal(refused.code, 2);
  assert.match(refused.err, /cannot start with "-"/);
  assert.equal(fs.existsSync(path.join(root, 'guard-output')), false);
  for (const bad of ['--base=', '--base=no-such-ref', '--base=HEAD:test/a.test.js', '--base=main:']) {
    const result = await run(['tests', bad], { cwd: root });
    assert.equal(result.code, 2, bad);
    assert.match(result.err, /--base needs a git ref|does not name a commit/, bad);
  }
  assert.match((await run(['tests', '--base'], { cwd: root })).err, /--base needs a value/);
});

test('git helpers: resolveBase, releaseBase, changedSince, and diffSince', () => {
  const root = taggedRepo({ 'src/a.js': 'a\n', 'src/old.js': 'one\ntwo\nthree\nfour\n' });
  const sha = git(root, 'rev-parse', 'v1.0.0');
  assert.equal(gitTools.resolveBase(root, 'v1.0.0'), sha);
  assert.equal(gitTools.resolveBase(root, 'HEAD'), git(root, 'rev-parse', 'HEAD'));
  assert.throws(() => gitTools.resolveBase(root, '-x'), /cannot start with "-"/);
  assert.throws(() => gitTools.resolveBase(root, '  '), /needs a git ref/);
  assert.throws(() => gitTools.resolveBase(root, undefined), /needs a git ref/);
  assert.deepEqual(gitTools.releaseBase(root), { ref: 'v1.0.0', sha });
  write(root, 'later.txt', 'x');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'later');
  git(root, 'tag', 'v2.0.0');
  git(root, 'tag', 'not-a-release');
  assert.equal(gitTools.releaseBase(root).ref, 'v1.0.0', 'a tag on HEAD is not the base');
  git(root, 'commit', '-q', '--allow-empty', '-m', 'after v2');
  assert.equal(gitTools.releaseBase(root).ref, 'v2.0.0');
  assert.equal(gitTools.releaseBase(tempDir()), null);
  const empty = tempDir();
  git(empty, 'init', '-q');
  assert.equal(gitTools.releaseBase(empty), null);
  assert.equal(gitTools.releaseBase(gitRepo()), null);
  assert.equal(gitTools.baseFor(root, 'v1.0.0').ref, 'v1.0.0');
  assert.equal(gitTools.baseFor(root).ref, 'v2.0.0');

  git(root, 'mv', 'src/old.js', 'src/new.js');
  write(root, 'src/new.js', 'one\ntwo\nthree\nfour\nfive\n');
  fs.rmSync(path.join(root, 'src/a.js'));
  write(root, 'src/fresh.js', 'f\n');
  write(root, '.godpowers/STATE.md', 'bookkeeping');
  assert.deepEqual(gitTools.changedSince(root, 'v1.0.0'), ['later.txt', 'src/a.js', 'src/fresh.js', 'src/new.js', 'src/old.js']);
  assert.deepEqual(gitTools.changedSince(root, 'HEAD'), ['src/a.js', 'src/fresh.js', 'src/new.js', 'src/old.js']);
  assert.deepEqual(gitTools.changedSince(tempDir(), 'HEAD'), []);
  assert.throws(() => gitTools.changedSince(root, 'no-such-ref'), /git diff against no-such-ref failed/);
  const diff = gitTools.diffSince(root, 'HEAD');
  assert.deepEqual(diff.files.map(f => [f.status, f.from, f.path]), [['D', null, 'src/a.js'], ['R', 'src/old.js', 'src/new.js']]);
  assert.match(diff.files[1].patch, /^diff --git /);
  assert.match(diff.files[1].patch, /\+five/);
  assert.match(diff.patch, /-a/);
  assert.deepEqual(gitTools.diffSince(tempDir(), 'HEAD'), { patch: '', files: [] });
  assert.throws(() => gitTools.diffSince(root, 'no-such-ref'), /git diff against no-such-ref failed/);
  assert.deepEqual(gitTools.untrackedFiles(root), ['src/fresh.js']);
  assert.deepEqual(gitTools.untrackedFiles(tempDir()), []);
});

test('a line marked godpowers: allow-test-change is left out of every line-based finding', async () => {
  const marker = testguard.ALLOW_MARKER;
  const root = taggedRepo({
    'test/a.test.js': `it("one", () => { expect(1).toBe(1); }); // ${marker}\nit("two", () => {});\n`,
    'test/b.test.js': 'it("one", () => {});\n',
    'test/c.test.js': 'it("one", () => {});\n'
  });
  // a: the removed, marked declaration and assertion are not counted, so nothing is fewer.
  write(root, 'test/a.test.js', 'it("two", () => {});\n');
  // b: a marked skip is not a finding; an unmarked one on the next line still is.
  write(root, 'test/b.test.js', `it.skip("one", () => {}); // ${marker}\nit.only("two", () => {});\n`); // godpowers: allow-test-change
  // d: the marker on an untracked file's line works the same way.
  write(root, 'test/d.test.js', `it.skip("x"); // ${marker}\nit.skip("y");\n`); // godpowers: allow-test-change
  const result = await guard(root);
  assert.deepEqual(kinds(result.json), ['skip-marker test/b.test.js:2', 'skip-marker test/d.test.js:2']);
  const text = (await run(['tests'], { cwd: root })).out.trimEnd().split('\n');
  assert.equal(text[text.length - 1], `To mark a deliberate change, put \`${marker}\` in a comment on the line, and say why in the review.`);
  fs.rmSync(path.join(root, 'test/b.test.js'));
  git(root, 'checkout', 'test/b.test.js');
  fs.rmSync(path.join(root, 'test/d.test.js'));
  const clean = (await run(['tests'], { cwd: root })).out;
  assert.match(clean, /: 0 finding\(s\)\n$/, 'no hint when there are no findings');
});
