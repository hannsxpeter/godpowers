const test = require('node:test');
const assert = require('node:assert/strict');

const stats = require('../lib/stats');
const { run, v7Repo } = require('./helpers');

const CHECK = 'npm test';
let seq = 0;
function rec(kind, time, fields = {}) {
  seq += 1;
  return { id: `ev_${seq}`, kind, time, ...fields };
}
const verify = (time, ok, ms, fields = {}) => rec('verify', time, { command: CHECK, ok, ms, timedOut: false, ...fields });

test('stats computes every number from a hand-built ledger', () => {
  const records = [
    verify('2026-01-01T00:00:00.000Z', false, 1000),
    verify('2026-01-01T00:00:10.000Z', false, 3000),
    verify('2026-01-01T00:01:00.000Z', true, 2000),
    verify('2026-01-01T00:02:00.000Z', true, 4000),
    verify('2026-01-01T00:03:00.000Z', false, 9000, { timedOut: true }),
    verify('2026-01-01T00:04:00.000Z', true, 5000),
    rec('verify', '2026-01-01T00:04:30.000Z', { command: 'lint', ok: true, ms: 1 }),
    rec('waive', '2026-01-01T00:05:00.000Z'),
    rec('review', '2026-01-01T00:06:00.000Z', { verdict: 'fail' }),
    rec('review', '2026-01-01T00:07:00.000Z', { verdict: 'fail' }),
    rec('review', '2026-01-01T00:08:00.000Z', { verdict: 'pass' }),
    rec('review', '2026-01-01T00:09:00.000Z', { verdict: 'fail' }),
    rec('harden', '2026-01-01T00:10:00.000Z', { verdict: 'pass' }),
    rec('ship', '2026-01-01T00:11:00.000Z', { verdict: 'fail' }),
    rec('ship', '2026-01-01T00:12:00.000Z', { verdict: 'pass' })
  ];
  const result = stats.compute(records, { command: CHECK });
  assert.deepEqual(result.check, {
    command: CHECK,
    runs: 6,
    passes: 3,
    failures: 3,
    timeouts: 1,
    medianMs: 3000,
    maxMs: 9000,
    // Streaks: fail,fail,pass (60s from the first failure) and fail(timeout),pass (120s). Lower middle of two.
    medianRecoveryMs: 60000,
    // Passes preceded by 2, 0, and 1 failed runs.
    medianFailedBeforePass: 1
  });
  assert.equal(result.otherVerifyRuns, 1);
  assert.equal(result.waivers, 1);
  assert.deepEqual(result.reviews, { total: 4, passes: 1, failures: 3, longestFailStreak: 2 });
  assert.deepEqual(result.harden, { total: 1, passes: 1, failures: 0 });
  assert.deepEqual(result.ship, { total: 2, passes: 1, failures: 1 });
  assert.equal(result.first, '2026-01-01T00:00:00.000Z');
  assert.equal(result.last, '2026-01-01T00:12:00.000Z');
  assert.match(stats.formatStats(result), /Check \(npm test\): 6 runs, 3 pass, 3 fail, 1 timed out/);
});

test('without a declared check every verify run counts', () => {
  const records = [verify('2026-01-01T00:00:00.000Z', true, 10), rec('verify', '2026-01-01T00:01:00.000Z', { command: 'lint', ok: false, ms: 30 })];
  for (const command of [undefined, 'none']) {
    const result = stats.compute(records, { command });
    assert.equal(result.check.runs, 2);
    assert.equal(result.otherVerifyRuns, 0);
    assert.equal(result.check.medianMs, 10, 'median of an even count is the lower middle');
  }
});

test('the empty ledger gives zeros and n/a', () => {
  const result = stats.compute([], { command: CHECK });
  assert.equal(result.check.runs, 0);
  assert.equal(result.check.medianMs, null);
  assert.equal(result.check.maxMs, null);
  assert.equal(result.check.medianRecoveryMs, null);
  assert.equal(result.check.medianFailedBeforePass, null);
  assert.equal(result.first, null);
  assert.equal(result.reviews.longestFailStreak, 0);
  const text = stats.formatStats(result);
  assert.match(text, /median n\/a, max n\/a/);
  assert.match(text, /Records: none/);
  assert.equal(stats.median([]), null);
});

test('stats through the CLI', async () => {
  const root = v7Repo({ verify: 'node -e 0' });
  assert.match((await run(['stats'], { cwd: root })).out, /0 runs/);
  await run(['verify'], { cwd: root });
  const json = JSON.parse((await run(['stats', '--json'], { cwd: root })).out);
  assert.equal(json.check.runs, 1);
  assert.equal(json.check.passes, 1);
  assert.equal((await run(['stats'], { cwd: root })).code, 0);
});
