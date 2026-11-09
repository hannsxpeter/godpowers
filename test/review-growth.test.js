const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const evidence = require('../lib/evidence');
const gitTools = require('../lib/git');
const reviewTools = require('../lib/reviews');
const { tempDir, write, git, gitRepo, v7Repo, run } = require('./helpers');

const CONTROL = /[\u0000-\u0008\u000a-\u001f\u007f-\u009f]/;
const lines = (count, tag = 'line') => Array.from({ length: count }, (_, i) => `${tag} ${i}\n`).join('');
const records = root => evidence.readAll(root).records;
const growth = (from, to) => new RegExp(`The change grew from ${from} to ${to} lines during review: cut what review added beyond the goal, or say why it is needed\\.`);

/** A v7 repo with a v1.0.0 tag one commit behind HEAD, so the default base is that tag. */
function releasedRepo() {
  const root = v7Repo();
  git(root, 'tag', 'v1.0.0');
  git(root, 'commit', '-q', '--allow-empty', '-m', 'after the release');
  return root;
}
const review = (root, verdict, extra = []) => run(['record', 'review', `--${verdict}`, '--summary', 'round', ...extra], { cwd: root });

test('record review stores the diff size against the default base: committed, uncommitted, and untracked', async () => {
  const root = releasedRepo();
  const tagSha = git(root, 'rev-parse', 'v1.0.0');
  write(root, 'a.js', lines(10));
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'feature');
  write(root, 'src/app.js', 'module.exports = 2;\nextra\n');
  write(root, 'new.js', lines(5));
  write(root, '.godpowers/DECISIONS.md', `${fs.readFileSync(path.join(root, '.godpowers/DECISIONS.md'), 'utf8')}\nmore\nmore\nmore\n`);
  const result = await review(root, 'fail');
  assert.equal(result.code, 0, result.err);
  const [record] = records(root);
  assert.deepEqual(record.diff, { base: tagSha, files: 3, added: 10 + 2 + 5, removed: 1 });
  assert.equal(gitTools.diffStat(root, tagSha).files, 3);
});

test('--base overrides the default, and no base or a bad repository stores diff null', async () => {
  const root = releasedRepo();
  write(root, 'a.js', lines(4));
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'feature');
  const headSha = git(root, 'rev-parse', 'HEAD');
  write(root, 'b.js', lines(2));
  await review(root, 'fail', ['--base', 'HEAD']);
  assert.deepEqual(records(root)[0].diff, { base: headSha, files: 1, added: 2, removed: 0 });
  const untagged = v7Repo();
  write(untagged, 'a.js', lines(4));
  assert.equal((await review(untagged, 'fail')).code, 0);
  assert.equal(records(untagged)[0].diff, null);
  const outside = tempDir();
  assert.equal(evidence.attest(outside, 'review', { pass: true, summary: 'ok' }).diff, null);
  assert.equal(gitTools.diffStat(outside, 'HEAD'), null);
  assert.equal(gitTools.diffStat(untagged, 'not-a-commit'), null);
  const refused = await review(untagged, 'fail', ['--base', 'no-such-ref']);
  assert.equal(refused.code, 2);
  assert.match(refused.err, /does not name a commit/);
  assert.equal(records(untagged).length, 1, 'a refused ref writes no record');
});

test('only review records carry a diff', async () => {
  const root = releasedRepo();
  write(root, 'a.js', lines(4));
  await run(['record', 'harden', '--pass', '--summary', 'ok'], { cwd: root });
  assert.equal(Object.prototype.hasOwnProperty.call(records(root)[0], 'diff'), false);
});

test('binary files count as files and add no lines, and unusual untracked entries do not break the count', async () => {
  const root = releasedRepo();
  const base = git(root, 'rev-parse', 'HEAD');
  fs.writeFileSync(path.join(root, 'blob.bin'), Buffer.from([1, 2, 0, 3, 4]));
  write(root, 'no-newline.txt', 'one\ntwo');
  write(root, 'empty.txt', '');
  fs.symlinkSync('no-newline.txt', path.join(root, 'link'));
  fs.mkdirSync(path.join(root, 'nested'));
  git(path.join(root, 'nested'), 'init', '-q');
  assert.deepEqual(gitTools.diffStat(root, base), { files: 5, added: 2, removed: 0 });
});

test('record review warns when the change grew past 25% and 20 lines since the first round', async () => {
  const root = releasedRepo();
  write(root, 'a.js', lines(30));
  const first = await review(root, 'fail');
  assert.doesNotMatch(first.out, /grew/, 'the first round has nothing to compare with');
  write(root, 'b.js', lines(40));
  const second = await review(root, 'fail');
  assert.match(second.out, growth(30, 70));
  assert.match(second.out, /Review round 2 since the last pass\./);
  write(root, 'c.js', lines(10));
  assert.match((await review(root, 'pass')).out, growth(30, 80), 'a passing round warns too');
  const after = await review(root, 'fail');
  assert.doesNotMatch(after.out, /grew/, 'a pass starts a new count');
});

test('growth below either threshold stays quiet', async () => {
  const quiet = async (first, more) => {
    const root = releasedRepo();
    write(root, 'a.js', lines(first));
    await review(root, 'fail');
    write(root, 'b.js', lines(more));
    const second = await review(root, 'fail');
    return { text: second.out, reviews: (await run(['reviews'], { cwd: root })).out };
  };
  for (const [first, more] of [[100, 20], [10, 15], [100, 24], [20, 5]]) {
    const result = await quiet(first, more);
    assert.doesNotMatch(result.text, /grew/, `${first} + ${more}`);
    assert.doesNotMatch(result.reviews, /grew/, `${first} + ${more}`);
  }
  const loud = await quiet(10, 21);
  assert.match(loud.text, growth(10, 31));
  assert.match(loud.reviews, growth(10, 31));
});

test('the growth warning compares added plus removed, and a shrinking change is quiet', async () => {
  const root = releasedRepo();
  write(root, 'a.js', lines(60));
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'seed');
  git(root, 'tag', 'v1.1.0');
  git(root, 'commit', '-q', '--allow-empty', '-m', 'next');
  write(root, 'a.js', lines(30, 'rewritten'));
  const first = await review(root, 'fail');
  assert.doesNotMatch(first.out, /grew/);
  assert.deepEqual({ ...records(root)[0].diff, base: undefined }, { base: undefined, files: 1, added: 30, removed: 60 });
  write(root, 'a.js', lines(40, 'rewritten'));
  assert.doesNotMatch((await review(root, 'fail')).out, /grew/, '90 down to 100 is under 25%');
  write(root, 'a.js', lines(5, 'rewritten'));
  assert.doesNotMatch((await review(root, 'fail')).out, /grew/);
});

test('reviews shows each round\'s diff size and the current size, and warns once', async () => {
  const root = releasedRepo();
  const base = git(root, 'rev-parse', 'v1.0.0').slice(0, 7);
  write(root, 'a.js', lines(30));
  await review(root, 'fail');
  write(root, 'b.js', lines(40));
  await review(root, 'fail');
  const text = await run(['reviews'], { cwd: root });
  assert.equal(text.code, 0, text.err);
  assert.match(text.out, new RegExp(`Round 1: fail \\w{7} at \\S+: round\\n  diff: 1 file, \\+30 -0 against ${base}\\n`));
  assert.match(text.out, new RegExp(`Round 2: fail \\w{7} at \\S+: round\\n  diff: 2 files, \\+70 -0 against ${base}\\n`));
  assert.match(text.out, new RegExp(`Current change: 2 files, \\+70 -0 against ${base}`));
  assert.equal(text.out.match(/The change grew/g).length, 1);
  const json = JSON.parse((await run(['reviews', '--json'], { cwd: root })).out);
  assert.equal(json.rounds[0].diff.added, 30);
  assert.equal(json.current.diff.added, 70);
  assert.equal(json.current.base, git(root, 'rev-parse', 'v1.0.0'));
  assert.match(json.growth, growth(30, 70));
  write(root, 'b.js', lines(5));
  const smaller = JSON.parse((await run(['reviews', '--json'], { cwd: root })).out);
  assert.equal(smaller.growth, null);
});

test('the warning is skipped when the base sha differs between the first round and now', async () => {
  const root = releasedRepo();
  write(root, 'a.js', lines(30));
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'work');
  const middle = git(root, 'rev-parse', 'HEAD');
  await review(root, 'fail', ['--base', 'v1.0.0']);
  write(root, 'b.js', lines(80));
  const second = await review(root, 'fail', ['--base', 'v1.0.0']);
  assert.match(second.out, growth(30, 110));
  const other = await run(['reviews', '--base', middle], { cwd: root });
  assert.doesNotMatch(other.out, /grew/);
  assert.match(other.out, /Current change: 1 file, \+80 -0 against /);
  const record = await review(root, 'fail', ['--base', middle]);
  assert.doesNotMatch(record.out, /grew/, 'the new round used another base');
  const json = JSON.parse((await run(['reviews', '--json', '--base', middle], { cwd: root })).out);
  assert.equal(json.growth, null);
});

test('without a base or a diff there is nothing to show or warn about', async () => {
  const root = v7Repo();
  write(root, 'a.js', lines(30));
  await review(root, 'fail');
  write(root, 'b.js', lines(60));
  const second = await review(root, 'fail');
  assert.doesNotMatch(second.out, /grew/);
  const text = await run(['reviews'], { cwd: root });
  assert.doesNotMatch(text.out, /diff:|Current change|grew/);
  const json = JSON.parse((await run(['reviews', '--json'], { cwd: root })).out);
  assert.deepEqual(json.current, { base: null, diff: null });
  assert.equal(json.growth, null);
  const plainDir = tempDir();
  assert.equal((await run(['reviews', '--project', plainDir])).code, 0);
});

test('odd diff fields in a ledger written by someone else are ignored or printed safely', async () => {
  const root = releasedRepo();
  const esc = '\u001b';
  evidence.append(root, { kind: 'review', verdict: 'fail', summary: 's', tree: 't', diff: { base: `${esc}[31m${'a'.repeat(40)}`, files: '3\n', added: 'x', removed: -4 } });
  evidence.append(root, { kind: 'review', verdict: 'fail', summary: 's', tree: 't', diff: 'big' });
  evidence.append(root, { kind: 'review', verdict: 'fail', summary: 's', tree: 't', diff: { base: 7, files: 1, added: 1e9, removed: 0 } });
  const text = await run(['reviews'], { cwd: root });
  assert.equal(text.code, 0, text.err);
  assert.doesNotMatch(text.out.replace(/\n/g, ''), CONTROL);
  assert.doesNotMatch(text.out, /grew/);
  assert.equal(reviewTools.growthWarning(null, { base: 'a', files: 1, added: 100, removed: 0 }), '');
  assert.equal(reviewTools.growthWarning({ diff: { base: 'a', files: 1, added: 10, removed: 0 } }, null), '');
  assert.equal(reviewTools.growthWarning({ diff: { base: 'a', files: 1, added: 'x', removed: 0 } }, { base: 'a', files: 1, added: 100, removed: 0 }), '');
});

test('growthWarning edge cases: thresholds, equal sizes, and an empty first round', () => {
  const at = (added, removed = 0, base = 'a') => ({ base, files: 1, added, removed });
  const warn = (first, now) => reviewTools.growthWarning({ diff: first }, now);
  assert.equal(warn(at(0), at(19)), '');
  assert.match(warn(at(0), at(20)), growth(0, 20));
  assert.equal(warn(at(100), at(125)), '', 'exactly 25% is not more than 25%');
  assert.match(warn(at(100), at(126)), growth(100, 126));
  assert.equal(warn(at(10), at(29)), '', 'under 20 lines more');
  assert.match(warn(at(10), at(30)), growth(10, 30));
  assert.equal(warn(at(50), at(50)), '');
  assert.equal(warn(at(50, 0, 'a'), at(500, 0, 'b')), '', 'different base');
});

test('git helpers fail open instead of throwing', () => {
  const root = gitRepo();
  assert.equal(gitTools.mergeBase(root, 'HEAD', 'nothing'), null);
  assert.equal(gitTools.commitsAhead(root, 'HEAD', 'nothing'), null);
  assert.equal(gitTools.changedBetween(root, 'HEAD', 'nothing'), null);
  assert.equal(gitTools.remoteHeadName(root), null);
  assert.equal(gitTools.commitsAhead(root, 'HEAD', 'HEAD'), 0);
});
