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

const KEY_A = 'a'.repeat(64);
const KEY_B = 'b'.repeat(64);
const signed = (record, command = record.command, key = KEY_A) => ({ ...record, local: evidence.localTag(key, record, command) });
const ledgerOf = (...records) => ({ records, problems: [] });

test('findReusable returns only a clean, signed passing record of the same command on the same tree', () => {
  const unsigned = { kind: 'verify', fp: evidence.FP_VERSION, tree: 't1', command: 'npm test', ok: true };
  const base = signed(unsigned);
  const find = (ledger, tree, command, key = KEY_A) => evidence.findReusable(ledger, tree, command, { key });
  assert.equal(find(ledgerOf(base), 't1', 'npm test'), base);
  assert.equal(find(ledgerOf(base), 't2', 'npm test'), null, 'changed tree');
  assert.equal(find(ledgerOf(base), 't1', 'npm run lint'), null, 'different command');
  assert.equal(find(ledgerOf(base), null, 'npm test'), null, 'no tree');
  assert.equal(find(ledgerOf(signed({ ...unsigned, fp: 0 })), 't1', 'npm test'), null, 'old fingerprint version');
  assert.equal(find(ledgerOf(base, signed({ ...unsigned, ok: false })), 't1', 'npm test'), null, 'latest failed');
  assert.equal(find(ledgerOf(signed({ ...unsigned, ok: false }), base), 't1', 'npm test'), base, 'latest passed');
  assert.equal(find(ledgerOf(signed({ ...unsigned, changedDuringRun: true })), 't1', 'npm test'), null);
  assert.equal(find(ledgerOf(signed({ ...unsigned, timedOut: true })), 't1', 'npm test'), null);
  assert.equal(find(ledgerOf(unsigned), 't1', 'npm test'), null, 'no local signature');
  assert.equal(find(ledgerOf({ ...base, local: 'f'.repeat(64) }), 't1', 'npm test'), null, 'a wrong signature');
  assert.equal(find(ledgerOf({ ...base, local: 12 }), 't1', 'npm test'), null, 'a signature that is not text');
  assert.equal(find(ledgerOf(base), 't1', 'npm test', KEY_B), null, 'signed with another key');
  assert.equal(find(ledgerOf(base), 't1', 'npm test', null), null, 'no key, no reuse');
  assert.equal(find([base], 't1', 'npm test'), null, 'a bare record list says nothing about integrity');
  assert.equal(find(null, 't1', 'npm test'), null);
  assert.equal(find({ records: [base], problems: [{ severity: 'warning', message: 'chain break' }] }, 't1', 'npm test'), base, 'a chain break from a merge is only a warning');
  assert.equal(find({ records: [base], problems: [{ severity: 'error', message: 'edited' }] }, 't1', 'npm test'), null, 'any integrity error anywhere');
  const edited = { ...signed({ ...unsigned, ok: false }), ok: true };
  assert.equal(find(ledgerOf(edited), 't1', 'npm test'), null, 'a failing record edited to pass, even with a fresh digest');
});

test('the signature covers the exact command, which the stored record has redacted', () => {
  const stored = { kind: 'verify', fp: evidence.FP_VERSION, tree: 't1', command: 'PASSWORD=[redacted] node x.js', ok: true };
  const record = signed(stored, 'PASSWORD=hunter-one node x.js');
  const find = command => evidence.findReusable(ledgerOf(record), 't1', command, { key: KEY_A });
  assert.equal(find('PASSWORD=hunter-one node x.js'), record);
  assert.equal(find('PASSWORD=hunter-two node x.js'), null);
});

test('the local key is private, created once, shared by racing readers, and never leaks', async () => {
  const home = path.join(tempDir(), '.godpowers');
  const saved = process.env.GODPOWERS_HOME;
  process.env.GODPOWERS_HOME = home;
  try {
    assert.equal(evidence.localKey(), null, 'reading never creates a key');
    assert.equal(fs.existsSync(home), false);
    const key = evidence.localKey({ create: true });
    assert.match(key, /^[0-9a-f]{64}$/);
    assert.equal(evidence.localKey({ create: true }), key, 'a second caller reads the first key');
    assert.equal(evidence.localKey(), key);
    if (process.platform !== 'win32') {
      assert.equal(fs.statSync(path.join(home, 'local.key')).mode & 0o777, 0o600);
      assert.equal(fs.statSync(home).mode & 0o777, 0o700);
      fs.chmodSync(path.join(home, 'local.key'), 0o644);
      assert.equal(evidence.localKey({ create: true }), null, 'a key others can read is not trusted, and is not replaced');
      fs.chmodSync(path.join(home, 'local.key'), 0o600);
    }
    fs.writeFileSync(path.join(home, 'local.key'), 'not a key');
    fs.chmodSync(path.join(home, 'local.key'), 0o600);
    assert.equal(evidence.localKey({ create: true }), null, 'a malformed key is not replaced either');
    fs.rmSync(path.join(home, 'local.key'));
    const root = v7Repo();
    const { record } = await evidence.verify(root, 'node -e "0"');
    const fresh = evidence.localKey();
    assert.match(record.local, /^[0-9a-f]{64}$/);
    assert.notEqual(record.local, fresh);
    assert.equal(read(root, '.godpowers/evidence.jsonl').includes(fresh), false, 'the key is not in the ledger');
  } finally {
    if (saved === undefined) delete process.env.GODPOWERS_HOME;
    else process.env.GODPOWERS_HOME = saved;
  }
});

test('without a usable key the check still runs and records, and nothing is reusable', async () => {
  const root = v7Repo();
  const blocker = write(tempDir(), 'file', 'a regular file where the key directory should go');
  const saved = process.env.GODPOWERS_HOME;
  process.env.GODPOWERS_HOME = path.join(blocker, 'home');
  try {
    assert.equal(evidence.localKey({ create: true }), null);
    const { record } = await evidence.verify(root, 'node -e "0"');
    assert.equal(record.ok, true);
    assert.equal(record.local, undefined);
    const tree = gitTools.treeFingerprint(root);
    assert.equal(evidence.findReusable(evidence.readAll(root), tree, 'node -e "0"'), null);
  } finally {
    if (saved === undefined) delete process.env.GODPOWERS_HOME;
    else process.env.GODPOWERS_HOME = saved;
  }
});

test('redact masks Basic credentials, Google API keys, and quoted secret values in full', () => {
  assert.equal(evidence.redact('curl -H "Authorization: Basic dXNlcjpwYXNzd29yZA==" https://x.test'), 'curl -H "Authorization: Basic [redacted]" https://x.test');
  assert.equal(evidence.redact('authorization=basic dXNlcjpwYXNz'), 'authorization=basic [redacted]');
  assert.equal(evidence.redact(`key=AIza${'B'.repeat(35)} next`), 'key=[redacted] next');
  assert.equal(evidence.redact(`AIza${'a1_-'.repeat(8)}xyz`), '[redacted]');
  assert.equal(evidence.redact('password="hunter two words" done'), 'password="[redacted]" done');
  assert.equal(evidence.redact("PASSWORD='hunter two words'"), "PASSWORD='[redacted]'");
  assert.equal(evidence.redact('{"token": "a b c", "n": 1}'), '{"token": "[redacted]", "n": 1}');
  assert.equal(evidence.redact('secret: "say \\"hi\\" there" end'), 'secret: "[redacted]" end');
  assert.equal(evidence.redact('api_key=abcdefghij'), 'api_key=[redacted]');
  assert.equal(evidence.redact('token=""'), 'token=""', 'an empty value hides nothing');
  assert.doesNotMatch(evidence.redact('password="hunter two words"'), /hunter|two|words/);
});

test('reviewHistory counts rounds after the last passing review', () => {
  const review = verdict => ({ kind: 'review', verdict });
  assert.deepEqual(evidence.reviewHistory([]), { lastPass: null, rounds: [], failedSinceLastPass: 0 });
  const records = [review('fail'), review('pass'), { kind: 'harden', verdict: 'fail' }, review('fail'), review('fail')];
  const history = evidence.reviewHistory(records);
  assert.equal(history.lastPass, records[1]);
  assert.deepEqual(history.rounds, [records[3], records[4]]);
  assert.equal(history.failedSinceLastPass, 2);
  assert.equal(evidence.reviewHistory([...records, review('pass')]).failedSinceLastPass, 0);
  assert.equal(evidence.reviewHistory([review('fail'), review('fail'), review('fail')]).failedSinceLastPass, 3);
});

test('attest stores the head commit, and dismissals only for reviews', () => {
  const root = v7Repo();
  const head = gitTools.git(root, ['rev-parse', 'HEAD']).stdout.trim();
  const record = evidence.attest(root, 'review', {
    pass: false,
    summary: 'round one',
    dismissed: ['a: fine', '  ', 'x'.repeat(400), 'token=abcdefghijklmnop: leaked', ...Array.from({ length: 30 }, (_, i) => `n${i}`)]
  });
  assert.equal(record.head, head);
  assert.equal(record.dismissed.length, 20);
  assert.equal(record.dismissed[0], 'a: fine');
  assert.equal(record.dismissed[1].length, 300);
  assert.match(record.dismissed[2], /\[redacted\]/);
  assert.equal(evidence.attest(root, 'review', { pass: true, summary: 'ok', dismissed: ['', ' '] }).dismissed, undefined);
  assert.throws(() => evidence.attest(root, 'harden', { pass: true, summary: 'ok', dismissed: ['a: b'] }), /--dismiss only applies to record review/);
  assert.equal(evidence.attest(root, 'ship', { pass: true, summary: 'ok' }).dismissed, undefined);
});

test('attest stores a null head outside git and before the first commit', () => {
  const plain = tempDir();
  assert.equal(evidence.attest(plain, 'review', { pass: true, summary: 'ok' }).head, null);
  assert.equal(gitTools.headCommit(plain), null);
  const empty = tempDir();
  gitTools.git(empty, ['init', '-q']);
  assert.equal(evidence.attest(empty, 'review', { pass: true, summary: 'ok' }).head, null);
});

test('every record stores the code fingerprint, and judgments match on tree or code', async () => {
  const root = v7Repo();
  const isDoc = require('../lib/docs').docPredicate(null);
  const fingerprints = () => gitTools.fingerprints(root, isDoc);
  const before = fingerprints();
  assert.match(before.code, /^[0-9a-f]{64}$/);
  const { record } = await evidence.verify(root, 'node -e "0"');
  assert.equal(record.code, before.code);
  assert.equal(evidence.waive(root, 'no harness').code, before.code);
  const review = evidence.attest(root, 'review', { pass: true, summary: 'ok' });
  assert.equal(review.code, before.code);
  assert.equal(review.tree, before.tree);

  write(root, 'README.md', 'docs only edit');
  const docsEdit = fingerprints();
  assert.notEqual(docsEdit.tree, before.tree);
  assert.equal(docsEdit.code, before.code);
  const records = evidence.readAll(root).records;
  let status = evidence.statusFor(records, docsEdit.tree, { code: docsEdit.code });
  assert.equal(status.review, 'pass');
  assert.deepEqual(status.viaCode, { review: true, harden: false, ship: false });
  assert.equal(status.check, 'none', 'verify and waive records match only on the tree');
  status = evidence.statusFor(records, docsEdit.tree);
  assert.equal(status.review, 'none', 'without a code fingerprint only the tree matches');
  status = evidence.statusFor(records, before.tree, { code: before.code });
  assert.equal(status.review, 'pass');
  assert.equal(status.viaCode.review, false);

  write(root, 'src/app.js', 'module.exports = 2;\n');
  const codeEdit = fingerprints();
  assert.notEqual(codeEdit.code, before.code);
  status = evidence.statusFor(records, codeEdit.tree, { code: codeEdit.code });
  assert.equal(status.review, 'none');
});

test('records without a code field (written by 7.0) match on the tree only', () => {
  const old = { kind: 'review', tree: 'aaa', fp: 1, verdict: 'pass', time: 't', id: 'x' };
  assert.equal(evidence.statusFor([old], 'aaa', { code: 'ccc' }).review, 'pass');
  assert.equal(evidence.statusFor([old], 'bbb', { code: 'ccc' }).review, 'none');
  assert.equal(evidence.statusFor([old], 'bbb', { code: null }).review, 'none');
  const unknown = { ...old, code: null };
  assert.equal(evidence.statusFor([unknown], 'bbb', { code: null }).review, 'none', 'a null code never matches');
  const newer = { ...old, code: 'ccc', fp: 2 };
  assert.equal(evidence.statusFor([newer], 'bbb', { code: 'ccc' }).review, 'none', 'a newer fingerprint version is ignored');
});

test('records store a null code outside git', async () => {
  const root = tempDir();
  write(root, '.godpowers/STATE.md', 'x');
  assert.equal((await evidence.verify(root, 'node -e "0"')).record.code, null);
  assert.equal(evidence.attest(root, 'review', { pass: true, summary: 's' }).code, null);
  assert.equal(evidence.waive(root, 'r').code, null);
});
