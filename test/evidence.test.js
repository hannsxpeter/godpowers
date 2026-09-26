const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const evidence = require('../lib/evidence');
const gitTools = require('../lib/git');
const { tempDir, write, read, v7Repo } = require('./helpers');

const ledger = root => path.join(root, '.godpowers', 'evidence.jsonl');

test('verify records a passing command against the current tree', async () => {
  const root = v7Repo();
  const { record, run } = await evidence.verify(root, 'node -e "console.log(\'all good\')"', { claim: 'smoke' });
  assert.equal(record.kind, 'verify');
  assert.equal(record.ok, true);
  assert.equal(record.exit, 0);
  assert.equal(record.claim, 'smoke');
  assert.equal(record.tree, gitTools.treeFingerprint(root));
  assert.equal(record.treeBefore, undefined);
  assert.match(run.tail, /all good/);
  assert.equal(record.prev, null);
  assert.equal(record.digest, evidence.digestOf(record));
});

test('verify records failures, exit codes, timeouts, and tree changes made by the command', async () => {
  const root = v7Repo();
  const failed = await evidence.verify(root, 'node -e "process.exit(3)"');
  assert.equal(failed.record.ok, false);
  assert.equal(failed.record.exit, 3);
  const slow = await evidence.verify(root, 'node -e "setTimeout(() => {}, 20000)"', { timeoutSeconds: 1 });
  assert.equal(slow.record.ok, false);
  assert.equal(slow.record.timedOut, true);
  assert.match(slow.record.tail, /timed out after 1 seconds/);
  const before = gitTools.treeFingerprint(root);
  const writer = await evidence.verify(root, 'node -e "require(\'fs\').writeFileSync(\'gen.txt\', \'x\')"');
  assert.equal(writer.record.tree, before, 'the record covers the code the check started from');
  assert.equal(writer.record.changedDuringRun, true);
  assert.equal(writer.record.treeAfter, gitTools.treeFingerprint(root));
  const rerun = await evidence.verify(root, 'node -e "require(\'fs\').writeFileSync(\'gen.txt\', \'x\')"');
  assert.equal(rerun.record.changedDuringRun, undefined, 'a second run over the new state binds to it');
  const { records, problems } = evidence.readAll(root);
  assert.equal(records.length, 4);
  assert.deepEqual(problems, []);
  assert.equal(records[1].prev, records[0].digest);
  await assert.rejects(() => evidence.verify(root, '  '), /needs a command/);
});

test('output tails and commands are redacted', async () => {
  const root = v7Repo();
  const token = `ghp_${'a'.repeat(36)}`;
  const { record } = await evidence.verify(root, `node -e "console.log('token=${token} password: hunter22222')"`);
  assert.doesNotMatch(record.tail, /ghp_a/);
  assert.doesNotMatch(record.tail, /hunter22222/);
  assert.doesNotMatch(record.command, /ghp_a/);
  assert.equal(evidence.redact(`Bearer ${'x'.repeat(20)}`), 'Bearer [redacted]');
  assert.equal(evidence.redact(`AKIA${'A'.repeat(16)}`), '[redacted]');
  assert.equal(evidence.redact(`sk_live_${'b'.repeat(24)}`), '[redacted]');
  assert.equal(evidence.redact('https://user:hunter2@example.com/x'), 'https://[redacted]@example.com/x');
  assert.equal(evidence.redact(`eyJ${'a'.repeat(20)}.eyJ${'b'.repeat(20)}.${'c'.repeat(20)}`), '[redacted]');
  assert.equal(evidence.redact('-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----'), '[redacted private key]');
  assert.equal(evidence.redact(null), '');
  const cut = evidence.finalTail(`${'x'.repeat(5000)} ghp_${'z'.repeat(36)}\nlast line`);
  assert.doesNotMatch(cut, /ghp_z|zzzz/, 'a token at the cut is redacted before cutting');
  assert.equal(evidence.finalTail('short'), 'short');
});

test('the chain detects hand edits, deletions, and bad lines', async () => {
  const root = v7Repo();
  await evidence.verify(root, 'node -e "0"');
  await evidence.verify(root, 'node -e "0"');
  evidence.waive(root, 'docs only');
  const lines = read(root, '.godpowers/evidence.jsonl').trim().split('\n');
  const edited = JSON.parse(lines[0]);
  edited.ok = !edited.ok;
  fs.writeFileSync(ledger(root), [JSON.stringify(edited), ...lines.slice(1)].join('\n') + '\n');
  assert.match(evidence.readAll(root).problems[0].message, /digest does not match/);
  fs.writeFileSync(ledger(root), [lines[0], lines[2]].join('\n') + '\n');
  const chain = evidence.readAll(root).problems[0];
  assert.match(chain.message, /chain break/);
  assert.equal(chain.severity, 'warning');
  fs.writeFileSync(ledger(root), `${lines[0]}\nnot json\n{"kind":"nope"}\n`);
  const problems = evidence.readAll(root).problems.map(p => p.message);
  assert.deepEqual(problems, ['not valid JSON', 'record is missing kind, id, or time']);
  assert.deepEqual(evidence.readAll(tempDir()), { records: [], problems: [] });
});

test('waive and attest validate their input', () => {
  const root = v7Repo();
  assert.throws(() => evidence.waive(root, ''), /needs a reason/);
  assert.throws(() => evidence.attest(root, 'deploy', { pass: true, summary: 'x' }), /record kind must be one of/);
  assert.throws(() => evidence.attest(root, 'review', { summary: 'x' }), /--pass or --fail/);
  assert.throws(() => evidence.attest(root, 'review', { pass: true, summary: ' ' }), /--summary/);
  const record = evidence.attest(root, 'review', { pass: false, summary: 'two high findings' });
  assert.equal(record.verdict, 'fail');
  assert.equal(record.tree, gitTools.treeFingerprint(root));
});

test('only the declared check counts, and records from another fingerprint version never match', async () => {
  const root = v7Repo();
  const tree = gitTools.treeFingerprint(root);
  await evidence.verify(root, 'node -e "0"');
  let records = evidence.readAll(root).records;
  assert.equal(evidence.statusFor(records, tree, { command: 'npm test' }).check, 'none');
  assert.equal(evidence.statusFor(records, tree, { command: 'none' }).check, 'pass');
  assert.equal(evidence.statusFor(records, tree, { command: 'node -e "0"' }).check, 'pass');
  evidence.append(root, { kind: 'verify', fp: evidence.FP_VERSION + 1, tree, command: 'node -e "0"', ok: true });
  records = evidence.readAll(root).records;
  assert.equal(records[1].fp, evidence.FP_VERSION + 1);
  await evidence.verify(root, 'node -e "process.exit(1)"');
  records = evidence.readAll(root).records.filter(r => r.fp === evidence.FP_VERSION + 1 || r.ok === false);
  assert.equal(evidence.statusFor(records.slice(0, 1), tree).check, 'none', 'a newer fingerprint version is ignored');
});

test('timeouts are validated, and a check that leaves a background process still finishes', async () => {
  assert.throws(() => evidence.normalizeTimeout('10m'), /--timeout must be a number/);
  assert.throws(() => evidence.normalizeTimeout(0), /--timeout/);
  assert.throws(() => evidence.normalizeTimeout(99999999), /--timeout/);
  assert.equal(evidence.normalizeTimeout('30'), 30);
  assert.equal(evidence.normalizeTimeout(undefined), 900);
  const started = Date.now();
  const run = await evidence.runCommand('node -e "require(\'child_process\').spawn(process.execPath, [\'-e\', \'setTimeout(() => {}, 8000)\'], { detached: true, stdio: [\'ignore\', \'inherit\', \'inherit\'] }).unref(); console.log(\'parent done\')"', { cwd: tempDir() });
  assert.equal(run.ok, true);
  assert.match(run.tail, /parent done/);
  assert.ok(Date.now() - started < 5000, `returned in ${Date.now() - started}ms`);
});

test('statusFor uses the latest record per kind for the tree', async () => {
  const root = v7Repo();
  const tree = gitTools.treeFingerprint(root);
  assert.equal(evidence.statusFor([], tree).check, 'none');
  await evidence.verify(root, 'node -e "0"');
  evidence.attest(root, 'review', { pass: true, summary: 'ok' });
  evidence.attest(root, 'harden', { pass: true, summary: 'ok' });
  let status = evidence.statusFor(evidence.readAll(root).records, tree);
  assert.deepEqual([status.check, status.review, status.harden, status.ship], ['pass', 'pass', 'pass', 'none']);
  await evidence.verify(root, 'node -e "process.exit(1)"');
  status = evidence.statusFor(evidence.readAll(root).records, tree);
  assert.equal(status.check, 'fail');
  evidence.waive(root, 'flaky external service');
  status = evidence.statusFor(evidence.readAll(root).records, tree);
  assert.equal(status.check, 'waived');
  write(root, 'src/app.js', 'changed');
  const other = evidence.statusFor(evidence.readAll(root).records, gitTools.treeFingerprint(root));
  assert.deepEqual([other.check, other.review], ['none', 'none']);
  assert.equal(evidence.statusFor(evidence.readAll(root).records, null).check, 'none');
});

test('works outside git with a null tree, and waits out a held lock', async () => {
  const root = tempDir();
  write(root, '.godpowers/STATE.md', 'x');
  const { record } = await evidence.verify(root, 'node -e "0"');
  assert.equal(record.tree, null);
  const lock = `${ledger(root)}.lock`;
  fs.writeFileSync(lock, '1');
  const old = new Date(Date.now() - 60000);
  fs.utimesSync(lock, old, old);
  const next = evidence.waive(root, 'stale lock is cleared');
  assert.equal(next.kind, 'waive');
  assert.equal(fs.existsSync(lock), false);
});
