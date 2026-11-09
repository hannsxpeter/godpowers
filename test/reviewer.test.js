const test = require('node:test');
const assert = require('node:assert/strict');

const evidence = require('../lib/evidence');
const { v7Repo, run } = require('./helpers');

const CONTROL = /[\u0000-\u0008\u000a-\u001f\u007f-\u009f]/;
const records = root => evidence.readAll(root).records;

test('record review stores --reviewer and reviews shows it for each round', async () => {
  const root = v7Repo();
  const failed = await run(['record', 'review', '--fail', '--summary', 'found issues', '--reviewer', 'Codex gpt-6.1-sol (high)'], { cwd: root });
  assert.equal(failed.code, 0, failed.err);
  const passed = await run(['record', 'review', '--pass', '--summary', 'clean', '--reviewer', 'Claude Opus'], { cwd: root });
  assert.equal(passed.code, 0, passed.err);
  const [first, second] = records(root);
  assert.equal(first.reviewer, 'Codex gpt-6.1-sol (high)');
  assert.equal(second.reviewer, 'Claude Opus');
  await run(['record', 'review', '--fail', '--summary', 'again', '--reviewer', 'Gemini'], { cwd: root });
  const text = await run(['reviews'], { cwd: root });
  assert.match(text.out, /Last passing review: \w{7} at \S+ by Claude Opus: clean/);
  assert.match(text.out, /Round 1: fail \w{7} at \S+ by Gemini: again/);
  const json = JSON.parse((await run(['reviews', '--json'], { cwd: root })).out);
  assert.equal(json.rounds[0].reviewer, 'Gemini');
});

test('a missing, empty, or blank --reviewer stores no field, and the output has no reviewer', async () => {
  const root = v7Repo();
  await run(['record', 'review', '--fail', '--summary', 'one'], { cwd: root });
  await run(['record', 'review', '--fail', '--summary', 'two', '--reviewer', ''], { cwd: root });
  await run(['record', 'review', '--fail', '--summary', 'three', '--reviewer', '   '], { cwd: root });
  for (const record of records(root)) assert.equal(Object.prototype.hasOwnProperty.call(record, 'reviewer'), false);
  const text = await run(['reviews'], { cwd: root });
  assert.doesNotMatch(text.out, / by /);
  assert.match(text.out, /Round 1: fail \w{7} at \S+: one\n/);
});

test('--reviewer is redacted, capped at 100 characters, and works for harden but not ship', async () => {
  const root = v7Repo();
  await run(['record', 'review', '--fail', '--summary', 'x', '--reviewer', 'x'.repeat(250)], { cwd: root });
  await run(['record', 'review', '--fail', '--summary', 'x', '--reviewer', 'bot token=abcdefghijklmnop'], { cwd: root });
  const [long, secret] = records(root);
  assert.equal(long.reviewer.length, 100);
  assert.match(secret.reviewer, /\[redacted\]/);
  assert.doesNotMatch(secret.reviewer, /abcdefghijklmnop/);
  const harden = await run(['record', 'harden', '--pass', '--summary', 'ok', '--reviewer', 'Sec Bot'], { cwd: root });
  assert.equal(harden.code, 0, harden.err);
  assert.equal(records(root)[2].reviewer, 'Sec Bot');
  const ship = await run(['record', 'ship', '--pass', '--summary', 'ok', '--reviewer', 'Someone'], { cwd: root });
  assert.equal(ship.code, 2);
  assert.match(ship.err, /--reviewer only applies to record review or harden/);
  assert.throws(() => evidence.attest(root, 'ship', { pass: true, summary: 'ok', reviewer: 'x' }), /--reviewer only applies/);
  assert.equal(records(root).length, 3, 'a refused record writes nothing');
});

test('control characters in --reviewer and --summary never reach the terminal', async () => {
  const root = v7Repo();
  const esc = '\u001b';
  const hostile = `Evil${esc}[31m\nRED${esc}]0;title\u0007\u009b`;
  await run(['record', 'review', '--fail', '--summary', `bad${esc}[2J\nline two`, '--reviewer', hostile], { cwd: root });
  await run(['record', 'review', '--pass', '--summary', `fine${esc}[0m`, '--reviewer', hostile], { cwd: root });
  const text = await run(['reviews'], { cwd: root });
  assert.equal(text.code, 0, text.err);
  assert.doesNotMatch(text.out.replace(/\n/g, ''), CONTROL);
  assert.match(text.out, /by Evil\[31mRED\]0;title: fine\[0m/);
  const recorded = await run(['record', 'review', '--fail', '--summary', 's', '--reviewer', hostile], { cwd: root });
  assert.doesNotMatch(recorded.out.replace(/\n/g, ''), CONTROL);
});

test('odd reviewer values in a ledger written by someone else still print safely', async () => {
  const root = v7Repo();
  evidence.append(root, { kind: 'review', verdict: 'fail', summary: 's', tree: 't', reviewer: { not: 'a string' } });
  evidence.append(root, { kind: 'review', verdict: 'fail', summary: 's', tree: 't', reviewer: 42 });
  evidence.append(root, { kind: 'review', verdict: 'fail', summary: 's', tree: 't', reviewer: '\u001b\u001b' });
  const text = await run(['reviews'], { cwd: root });
  assert.equal(text.code, 0, text.err);
  assert.doesNotMatch(text.out.replace(/\n/g, ''), CONTROL);
  assert.match(text.out, /Round 2: fail no commit at \S+ by 42: s/);
  assert.match(text.out, /Round 3: fail no commit at \S+: s/);
});
