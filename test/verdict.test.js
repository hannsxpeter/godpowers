const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const evidence = require('../lib/evidence');
const gitTools = require('../lib/git');
const gate = require('../lib/gate');
const verdictTools = require('../lib/verdict');
const { tempDir, write, git, v7Repo, run } = require('./helpers');

const CHECK = 'node check.js';
const CONTROL = /[\u0000-\u0008\u000a-\u001f\u007f-\u009f]/;

/** A v7 repo whose declared check passes (unless CHECK_FAIL is set), tagged v1.0.0 one commit back. */
function releasedRepo(stateOverrides = {}) {
  const root = v7Repo({ verify: CHECK, ...stateOverrides });
  write(root, 'check.js', 'process.exit(process.env.CHECK_FAIL ? 1 : 0);\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'check');
  git(root, 'tag', 'v1.0.0');
  git(root, 'commit', '-q', '--allow-empty', '-m', 'after the release');
  return root;
}
const verdict = async (root, extra = []) => {
  const result = await run(['verdict', ...extra], { cwd: root });
  assert.equal(result.code, 0, result.err);
  return result.out.trimEnd().split('\n');
};
const record = (root, kind, verdictWord, extra = []) => run(['record', kind, `--${verdictWord}`, '--summary', 'x', ...extra], { cwd: root });
const short = root => git(root, 'rev-parse', 'HEAD').slice(0, 7);

test('a low-risk change with nothing recorded', async () => {
  const root = releasedRepo();
  assert.deepEqual(await verdict(root), [
    `Godpowers verdict for ${short(root)} (risk: low)`,
    'Check: not run on this code',
    'Review: not required (risk low)',
    'Security: not required (risk low)',
    'Open risks: none'
  ]);
});

test('a normal-risk change: check, review rounds, reviewer, and dismissed findings', async () => {
  const root = releasedRepo();
  write(root, 'src/app.js', 'module.exports = 2;\n');
  let lines = await verdict(root);
  assert.equal(lines[0], `Godpowers verdict for ${short(root)} plus uncommitted changes (risk: normal)`);
  assert.deepEqual(lines.slice(1), ['Check: not run on this code', 'Review: not recorded on this code', 'Security: not required (risk normal)', 'Open risks: none']);
  assert.equal((await run(['verify'], { cwd: root })).code, 0);
  await record(root, 'review', 'fail', ['--dismiss', 'naming: house style']);
  assert.equal((await verdict(root))[2], 'Review: failed in round 1');
  await record(root, 'review', 'fail', ['--dismiss', 'perf: not hot', '--dismiss', 'docs: later']);
  assert.equal((await verdict(root))[2], 'Review: failed in round 2');
  await record(root, 'review', 'pass', ['--reviewer', 'Codex gpt-6.1-sol']);
  lines = await verdict(root);
  assert.match(lines[1], /^Check: passed, `node check\.js`, \d{4}-\d{2}-\d{2}$/);
  assert.equal(lines[2], 'Review: passed after 3 rounds, reviewer Codex gpt-6.1-sol; 3 findings dismissed');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'feature');
  assert.equal((await verdict(root))[0], `Godpowers verdict for ${short(root)} (risk: normal)`, 'committed, so no uncommitted changes');
  assert.equal((await verdict(root))[2], 'Review: passed after 3 rounds, reviewer Codex gpt-6.1-sol; 3 findings dismissed', 'the records still match the same content');
});

test('rounds count from the previous pass, and a missing reviewer is said so', async () => {
  const root = releasedRepo();
  write(root, 'src/app.js', 'module.exports = 2;\n');
  await record(root, 'review', 'pass');
  assert.equal((await verdict(root))[2], 'Review: passed after 1 round, reviewer not reported');
  write(root, 'src/app.js', 'module.exports = 3;\n');
  assert.equal((await verdict(root))[2], 'Review: not recorded on this code', 'a code change makes the pass stale');
  await record(root, 'review', 'fail');
  await record(root, 'review', 'pass', ['--reviewer', 'Claude']);
  assert.equal((await verdict(root))[2], 'Review: passed after 2 rounds, reviewer Claude');
  const facts = verdictTools.compute(root);
  assert.equal(facts.review.rounds, 2);
  assert.equal(facts.review.dismissed, 0);
});

test('check outcomes: failed, waived, and a check that is not the declared one', async () => {
  const root = releasedRepo();
  write(root, 'src/app.js', 'module.exports = 2;\n');
  await run(['verify', 'true'], { cwd: root });
  assert.equal((await verdict(root))[1], 'Check: not run on this code', 'only the declared check counts');
  assert.equal((await run(['verify'], { cwd: root, env: { CHECK_FAIL: '1' } })).code, 1);
  assert.equal((await verdict(root))[1], 'Check: failed');
  await run(['verify', '--waive', 'no harness covers this path'], { cwd: root });
  assert.equal((await verdict(root))[1], 'Check: waived: no harness covers this path');
  assert.equal((await run(['verify', '--force'], { cwd: root })).code, 0);
  assert.match((await verdict(root))[1], /^Check: passed, `node check\.js`, /);
});

test('a high-risk change needs a security record', async () => {
  const root = releasedRepo();
  write(root, 'src/auth/login.js', 'module.exports = 1;\n');
  assert.deepEqual((await verdict(root)).slice(2, 4), ['Review: not recorded on this code', 'Security: not recorded on this code']);
  assert.match((await verdict(root))[0], /\(risk: high\)$/);
  await record(root, 'harden', 'fail');
  assert.equal((await verdict(root))[3], 'Security: failed');
  await record(root, 'harden', 'pass');
  assert.equal((await verdict(root))[3], 'Security: passed');
  write(root, 'src/auth/login.js', 'module.exports = 2;\n');
  assert.equal((await verdict(root))[3], 'Security: not recorded on this code');
});

test('records the tier does not require still show how they ended', async () => {
  const root = releasedRepo();
  write(root, 'README.md', 'docs only\n');
  await record(root, 'review', 'fail');
  await record(root, 'harden', 'pass');
  const lines = await verdict(root);
  assert.equal(lines[2], 'Review: failed in round 1');
  assert.equal(lines[3], 'Security: passed');
});

test('open risks are counted by severity, and closed ones are not', async () => {
  const root = releasedRepo({ risks: ['- [ ] critical: a', '- [ ] high: b', '- [ ] high: c', '- [x] critical: fixed', '- [ ] low: d', '- [ ] medium: e'] });
  assert.equal((await verdict(root))[4], 'Open risks: 1 critical, 2 high, 1 medium, 1 low');
  const json = JSON.parse((await run(['verdict', '--json'], { cwd: root })).out);
  assert.deepEqual(json.openRisks, { critical: 1, high: 2, medium: 1, low: 1, total: 5 });
});

test('--json returns the same facts as fields', async () => {
  const root = releasedRepo();
  write(root, 'src/app.js', 'module.exports = 2;\n');
  await run(['verify'], { cwd: root });
  await record(root, 'review', 'fail', ['--dismiss', 'a: b']);
  await record(root, 'review', 'pass', ['--reviewer', 'Claude']);
  const result = await run(['verdict', '--json'], { cwd: root });
  assert.equal(result.code, 0);
  const json = JSON.parse(result.out);
  assert.equal(json.head, git(root, 'rev-parse', 'HEAD'));
  assert.equal(json.dirty, true);
  assert.equal(json.risk.tier, 'normal');
  assert.equal(json.risk.base.ref, 'v1.0.0');
  assert.deepEqual({ status: json.check.status, command: json.check.command }, { status: 'pass', command: CHECK });
  assert.match(json.check.time, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(json.review, { status: 'pass', required: true, rounds: 2, reviewer: 'Claude', dismissed: 1 });
  assert.deepEqual(json.security, { status: 'none', required: false });
  assert.equal(json.openRisks.total, 0);
});

test('verdict reports and never gates: exit 0 and no ledger writes, even on a failing state', async () => {
  const root = releasedRepo();
  write(root, 'src/auth/login.js', 'x\n');
  await run(['verify'], { cwd: root, env: { CHECK_FAIL: '1' } });
  await record(root, 'review', 'fail');
  const before = fs.readFileSync(path.join(root, '.godpowers/evidence.jsonl'), 'utf8');
  const result = await run(['verdict'], { cwd: root });
  assert.equal(result.code, 0);
  assert.equal(fs.readFileSync(path.join(root, '.godpowers/evidence.jsonl'), 'utf8'), before);
});

test('--base picks the comparison, and a ref that names nothing is an error', async () => {
  const root = releasedRepo();
  write(root, 'README.md', 'docs\n');
  assert.match((await verdict(root))[0], /\(risk: low\)$/);
  assert.match((await verdict(root, ['--base', 'v1.0.0']))[0], /\(risk: low\)$/);
  const bad = await run(['verdict', '--base', 'no-such-ref'], { cwd: root });
  assert.equal(bad.code, 2);
  assert.match(bad.err, /does not name a commit/);
});

test('outside git, with no tag, or with no ledger, the verdict still answers', async () => {
  const untagged = v7Repo({ verify: CHECK });
  assert.match((await verdict(untagged))[0], /^Godpowers verdict for \w{7} \(risk: high\)$/);
  const plain = tempDir();
  const result = await run(['verdict', '--project', plain]);
  assert.equal(result.code, 0, result.err);
  assert.equal(result.out.split('\n')[0], 'Godpowers verdict for no commit (risk: high)');
  assert.equal(result.out.split('\n')[1], 'Check: not run on this code');
  const unborn = tempDir();
  git(unborn, 'init', '-q');
  assert.match((await verdict(unborn))[0], /^Godpowers verdict for no commit/);
});

test('ledger text is printed without control characters or markdown backticks', async () => {
  const root = releasedRepo();
  write(root, 'src/app.js', 'module.exports = 2;\n');
  const esc = '\u001b';
  const now = { tree: gitTools.treeFingerprint(root) };
  evidence.append(root, { kind: 'waive', tree: now.tree, reason: `no${esc}[31m check\nsecond line${esc}]0;x\u0007` });
  const hostile = `Evil${esc}[2J\nname\u009b`;
  evidence.append(root, { kind: 'review', tree: now.tree, verdict: 'fail', summary: 's', reviewer: hostile, dismissed: [`a${esc}`, 7, null] });
  evidence.append(root, { kind: 'review', tree: now.tree, verdict: 'pass', summary: 's', reviewer: hostile, dismissed: `one${esc}` });
  let out = (await run(['verdict'], { cwd: root })).out;
  assert.doesNotMatch(out.replace(/\n/g, ''), CONTROL);
  assert.match(out, /Check: waived: no\[31m checksecond line\]0;x\n/);
  assert.match(out, /Review: passed after 2 rounds, reviewer Evil\[2Jname; 3 findings dismissed\n/);
  evidence.append(root, { kind: 'verify', tree: now.tree, command: CHECK, cmd: evidence.commandIdentity(CHECK), ok: true, exit: 0, time: `2026-01-02${esc}T`, id: 'ev_x' });
  evidence.append(root, { kind: 'verify', tree: now.tree, command: CHECK, cmd: evidence.commandIdentity(CHECK), ok: true, exit: 0, id: 'ev_y' });
  out = (await run(['verdict'], { cwd: root })).out;
  assert.doesNotMatch(out.replace(/\n/g, ''), CONTROL);
  const tick = verdictTools.format({ head: 'abcdef0123', dirty: false, risk: { tier: 'normal' }, check: { status: 'pass', command: 'run `evil`', time: '2026-01-02T00:00:00Z' }, review: { status: 'none', required: true }, security: { status: 'none', required: false }, openRisks: { total: 0 } });
  assert.match(tick, /Check: passed, `run 'evil'`, 2026-01-02\n/);
  assert.match(tick, /^Godpowers verdict for abcdef0 \(risk: normal\)/);
});

test('a documentation edit voids a review, as it does at the ship gate', async () => {
  const root = releasedRepo();
  write(root, 'src/app.js', 'module.exports = 2;\n');
  await record(root, 'review', 'pass');
  assert.equal((await verdict(root))[2], 'Review: passed after 1 round, reviewer not reported');
  write(root, 'README.md', 'edited after the review\n');
  assert.equal((await verdict(root))[2], 'Review: not recorded on this code');
});

test('a hand-written verify record without the exact-command identity is never reported as passed', async () => {
  const root = releasedRepo();
  write(root, 'src/app.js', 'module.exports = 2;\n');
  const tree = gitTools.treeFingerprint(root);
  evidence.append(root, { kind: 'verify', tree, command: CHECK, ok: true, exit: 0 });
  evidence.append(root, { kind: 'verify', tree, command: CHECK, cmd: evidence.commandIdentity('node other.js'), ok: true, exit: 0 });
  assert.equal((await verdict(root))[1], 'Check: not run on this code');
  assert.equal(gate.shipGate(root).checks.find(c => c.name === 'verify').ok, false);
});

test('the verdict and the ship gate agree on check, review, and security across states', async () => {
  const root = releasedRepo();
  write(root, 'src/auth/login.js', 'x\n');
  const agree = async label => {
    const facts = verdictTools.compute(root);
    const result = gate.shipGate(root);
    const byName = Object.fromEntries(result.checks.map(c => [c.name, c]));
    assert.equal(facts.check.status === 'pass', byName.verify.ok, `${label}: check`);
    assert.equal(facts.review.status === 'pass', byName.review.ok && facts.review.required, `${label}: review`);
    assert.equal(facts.security.status === 'pass', byName.harden.ok && facts.security.required, `${label}: security`);
  };
  await agree('nothing recorded');
  await run(['verify'], { cwd: root });
  await agree('check passed');
  await record(root, 'review', 'pass');
  await agree('review passed');
  await record(root, 'harden', 'pass');
  await agree('all passed');
  write(root, 'README.md', 'docs edit\n');
  await agree('after a documentation edit');
  await run(['verify', '--force'], { cwd: root, env: { CHECK_FAIL: '1' } });
  await agree('check failed');
});
