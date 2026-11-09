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

test('records carry no code field, and a review matches only the exact tree', async () => {
  const root = v7Repo();
  const before = gitTools.treeFingerprint(root);
  const { record } = await evidence.verify(root, 'node -e "0"');
  assert.equal('code' in record, false);
  assert.equal('code' in evidence.waive(root, 'no harness'), false);
  const review = evidence.attest(root, 'review', { pass: true, summary: 'ok' });
  assert.equal('code' in review, false);
  assert.equal(review.tree, before);

  write(root, 'README.md', 'docs only edit');
  const edited = gitTools.treeFingerprint(root);
  assert.notEqual(edited, before);
  const records = evidence.readAll(root).records;
  assert.equal(evidence.statusFor(records, edited).review, 'none', 'a README edit voids the review');
  assert.equal(evidence.statusFor(records, edited).viaCode, undefined);
  assert.equal(evidence.statusFor(records, before).review, 'pass');
});

test('a record that still has a code field (written by a 7.1 pre-release) is matched on its tree only', () => {
  const old = { kind: 'review', tree: 'aaa', code: 'ccc', fp: 1, verdict: 'pass', time: 't', id: 'x' };
  assert.equal(evidence.statusFor([old], 'aaa').review, 'pass');
  assert.equal(evidence.statusFor([old], 'bbb', { code: 'ccc' }).review, 'none', 'the same code on another tree does not match');
  const newer = { ...old, fp: 2 };
  assert.equal(evidence.statusFor([newer], 'aaa').review, 'none', 'a newer fingerprint version is ignored');
});

test('records are not bound to a code fingerprint outside git either', async () => {
  const root = tempDir();
  write(root, '.godpowers/STATE.md', 'x');
  assert.equal('code' in (await evidence.verify(root, 'node -e "0"')).record, false);
  assert.equal('code' in evidence.attest(root, 'review', { pass: true, summary: 's' }), false);
  assert.equal('code' in evidence.waive(root, 'r'), false);
});

const SECRET_ONE = 'PASSWORD=hunter-one node x.js';
const SECRET_TWO = 'PASSWORD=hunter-two node x.js';
const verifyRecord = (fields = {}) => ({ kind: 'verify', fp: evidence.FP_VERSION, tree: 't1', command: evidence.redact(SECRET_ONE), ok: true, ...fields });

test('commandIdentity: a plain hash without secret shapes, a keyed one with them, null without a key', () => {
  const plain = evidence.commandIdentity('npm test', { key: null });
  assert.match(plain, /^sha256:[0-9a-f]{64}$/);
  assert.equal(evidence.commandIdentity('npm test', { key: KEY_A }), plain, 'no key needed, so any machine agrees');
  assert.notEqual(evidence.commandIdentity('npm run lint', { key: null }), plain);
  const one = evidence.commandIdentity(SECRET_ONE, { key: KEY_A });
  assert.match(one, /^hmac:[0-9a-f]{64}$/);
  assert.equal(evidence.commandIdentity(SECRET_ONE, { key: KEY_A }), one);
  assert.notEqual(evidence.commandIdentity(SECRET_TWO, { key: KEY_A }), one, 'the secret value is part of the identity');
  assert.notEqual(evidence.commandIdentity(SECRET_ONE, { key: KEY_B }), one, 'another machine key');
  assert.equal(evidence.commandIdentity(SECRET_ONE, { key: null }), null);
});

test('verify stores the identity of the exact command, and nothing from which the secret could be read', async () => {
  const root = v7Repo();
  const secret = 'node -e "0" #PASSWORD=hunter-one';
  const { record } = await evidence.verify(root, secret);
  assert.equal(record.command.includes('hunter-one'), false);
  assert.equal(record.cmd, evidence.commandIdentity(secret, { key: evidence.localKey() }));
  assert.match(record.cmd, /^hmac:/);
  const plain = (await evidence.verify(root, 'node -e "0"')).record;
  assert.equal(plain.cmd, evidence.commandIdentity('node -e "0"', { key: null }));
  assert.match(plain.cmd, /^sha256:/);
});

test('statusFor matches a verify record to the declared command by identity, never by redacted text', () => {
  const key = KEY_A;
  const status = (records, command) => evidence.statusFor(records, 't1', { command, key }).check;
  const one = verifyRecord({ cmd: evidence.commandIdentity(SECRET_ONE, { key }) });
  assert.equal(status([one], SECRET_ONE), 'pass');
  assert.equal(status([one], SECRET_TWO), 'none', 'the same redacted text is not the same command');
  assert.equal(status([one], 'PASSWORD=[redacted] node x.js'), 'none', 'neither is the redacted text itself');
  assert.equal(status([one], 'node y.js'), 'none');
  assert.equal(evidence.statusFor([one], 't1', { command: SECRET_ONE, key: KEY_B }).check, 'none', 'another machine cannot tell');
  assert.equal(evidence.statusFor([one], 't1', { command: SECRET_ONE, key: null }).check, 'none', 'no key, no match');
  assert.equal(status([one], 'none'), 'pass', 'with no declared command any verify counts');
  const failing = verifyRecord({ ok: false, cmd: evidence.commandIdentity(SECRET_TWO, { key }) });
  assert.equal(status([one, failing], SECRET_ONE), 'pass', 'a record of the other command is not counted');
  assert.equal(status([one, failing], SECRET_TWO), 'fail');
});

test('a secret-free command matches across machines, with no key at all', () => {
  const command = 'node -e "0"';
  const record = verifyRecord({ command, cmd: evidence.commandIdentity(command, { key: KEY_B }) });
  assert.equal(evidence.statusFor([record], 't1', { command, key: null }).check, 'pass');
  assert.equal(evidence.statusFor([record], 't1', { command, key: KEY_A }).check, 'pass');
});

test('a record without cmd (7.0) never counts as a verify record, with or without a declared command', () => {
  const old = verifyRecord({ command: 'node y.js' });
  assert.equal(old.cmd, undefined);
  assert.equal(evidence.statusFor([old], 't1', { command: 'node y.js', key: KEY_A }).check, 'none', 'redacted text is not an identity');
  assert.equal(evidence.statusFor([old], 't1', { command: 'node z.js', key: KEY_A }).check, 'none');
  assert.equal(evidence.statusFor([old], 't1', { key: KEY_A }).check, 'none', 'nor with no declared command');
  assert.equal(evidence.statusFor([old], 't1', { command: 'none', key: KEY_A }).check, 'none');
  const secret = verifyRecord();
  assert.equal(evidence.statusFor([secret], 't1', { command: SECRET_ONE, key: KEY_A }).check, 'none');
  assert.equal(evidence.statusFor([secret], 't1', { command: SECRET_TWO, key: KEY_A }).check, 'none');
  // The reported case: the 7.0 record of PASSWORD=hunter-one stored the text below.
  const redacted = 'PASSWORD=[redacted] node x.js';
  assert.equal(secret.command, redacted);
  assert.equal(evidence.statusFor([secret], 't1', { command: redacted, key: KEY_A }).check, 'none', 'a declared command that is the redacted text matches nothing from 7.0');
  const fresh = verifyRecord({ command: redacted, cmd: evidence.commandIdentity(redacted, { key: KEY_A }) });
  assert.equal(evidence.statusFor([secret, fresh], 't1', { command: redacted, key: KEY_A }).check, 'pass', 'a record made by 7.1 verify does');
  const waived = { kind: 'waive', fp: evidence.FP_VERSION, tree: 't1' };
  assert.equal(evidence.statusFor([old, waived], 't1', { command: 'node y.js', key: KEY_A }).check, 'waived', 'waivers do not carry a command');
});

test('a record whose cmd is null, or malformed, matches nothing', () => {
  const nulled = verifyRecord({ cmd: null });
  assert.equal(evidence.statusFor([nulled], 't1', { command: SECRET_ONE, key: KEY_A }).check, 'none');
  assert.equal(evidence.statusFor([nulled], 't1', { command: 'PASSWORD=[redacted] node x.js', key: KEY_A }).check, 'none');
  for (const cmd of [12, 'sha256:xyz', `sha256:${'é'.repeat(64)}`, {}, `hmac:${'A'.repeat(64)}`]) {
    const record = verifyRecord({ command: 'node y.js', cmd });
    assert.equal(evidence.statusFor([record], 't1', { command: 'node y.js', key: KEY_A }).check, 'none', JSON.stringify(cmd));
  }
});

test('findReusable ignores malformed signatures and identities instead of throwing', () => {
  const unsigned = { kind: 'verify', fp: evidence.FP_VERSION, tree: 't1', command: 'npm test', ok: true };
  for (const local of ['é'.repeat(64), 'F'.repeat(64), 'a'.repeat(63), `${'a'.repeat(63)}\u0000`]) {
    assert.equal(evidence.findReusable(ledgerOf({ ...unsigned, local }), 't1', 'npm test', { key: KEY_A }), null, JSON.stringify(local));
  }
  const withId = { ...unsigned, cmd: evidence.commandIdentity('npm test', { key: null }) };
  const record = signed(withId);
  assert.equal(evidence.findReusable(ledgerOf(record), 't1', 'npm test', { key: KEY_A }), record, 'a good identity is reusable');
  const bad = signed({ ...unsigned, cmd: 'sha256:é' });
  assert.equal(evidence.findReusable(ledgerOf(bad), 't1', 'npm test', { key: KEY_A }), null);
  const swapped = signed({ ...unsigned, cmd: evidence.commandIdentity('npm run lint', { key: null }) });
  assert.equal(evidence.findReusable(ledgerOf(swapped), 't1', 'npm test', { key: KEY_A }), null, 'the identity must be this command');
});
