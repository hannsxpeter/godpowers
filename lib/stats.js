/**
 * `godpowers stats`: numbers computed from the evidence ledger.
 */

const { redact } = require('./evidence');

/**
 * Median of numbers. For an even count this is the lower middle value (not
 * the mean), so the result is always a value that occurred. Empty gives null.
 */
function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[(sorted.length - 1) >> 1];
}

function maxOf(values) {
  return values.length ? Math.max(...values) : null;
}

function tally(records) {
  const passes = records.filter(r => r.verdict === 'pass').length;
  return { total: records.length, passes, failures: records.length - passes };
}

function longestFailStreak(reviews) {
  let longest = 0;
  let run = 0;
  for (const record of reviews) {
    run = record.verdict === 'pass' ? 0 : run + 1;
    longest = Math.max(longest, run);
  }
  return longest;
}

/**
 * Per command, walk the runs in time order. A streak of failures that ends in
 * a pass gives one recovery time (first failure to that pass); every pass
 * gives a failed-run count (0 for a pass right after a pass or the first run).
 */
function recovery(runs) {
  const byCommand = new Map();
  for (const run of runs) {
    if (!byCommand.has(run.command)) byCommand.set(run.command, []);
    byCommand.get(run.command).push(run);
  }
  const times = [];
  const failedBefore = [];
  for (const list of byCommand.values()) {
    let failed = 0;
    let firstFailure = null;
    for (const run of list) {
      if (!run.ok) {
        if (!failed) firstFailure = Date.parse(run.time);
        failed += 1;
      } else {
        failedBefore.push(failed);
        if (failed) times.push(Date.parse(run.time) - firstFailure);
        failed = 0;
      }
    }
  }
  return { times, failedBefore };
}

/**
 * `command` is the declared check. Its runs are the "check" runs; when none is
 * declared, every verify run is. A timed-out run counts as a failure and also
 * as a timeout.
 */
function compute(records, { command } = {}) {
  const ordered = [...records].sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  const declared = command && command !== 'none' ? redact(command) : null;
  const verifies = ordered.filter(r => r.kind === 'verify');
  const runs = verifies.filter(r => !declared || r.command === declared);
  const durations = runs.map(r => r.ms).filter(ms => typeof ms === 'number');
  const { times, failedBefore } = recovery(runs);
  const reviews = ordered.filter(r => r.kind === 'review');
  const stamps = ordered.map(r => r.time);
  return {
    check: {
      command: declared,
      runs: runs.length,
      passes: runs.filter(r => r.ok).length,
      failures: runs.filter(r => !r.ok).length,
      timeouts: runs.filter(r => r.timedOut).length,
      medianMs: median(durations),
      maxMs: maxOf(durations),
      medianRecoveryMs: median(times),
      medianFailedBeforePass: median(failedBefore)
    },
    otherVerifyRuns: verifies.length - runs.length,
    waivers: ordered.filter(r => r.kind === 'waive').length,
    reviews: { ...tally(reviews), longestFailStreak: longestFailStreak(reviews) },
    harden: tally(ordered.filter(r => r.kind === 'harden')),
    ship: tally(ordered.filter(r => r.kind === 'ship')),
    first: stamps.length ? stamps[0] : null,
    last: stamps.length ? stamps[stamps.length - 1] : null
  };
}

function seconds(ms) {
  return ms === null ? 'n/a' : `${(ms / 1000).toFixed(1)}s`;
}

function count(value) {
  return value === null ? 'n/a' : String(value);
}

function formatStats(stats) {
  const c = stats.check;
  const label = c.command ? `Check (${c.command})` : 'Verify runs (no declared check)';
  const attest = (name, t) => `${name}: ${t.total} (${t.passes} pass, ${t.failures} fail)`;
  return [
    `${label}: ${c.runs} runs, ${c.passes} pass, ${c.failures} fail, ${c.timeouts} timed out`,
    `  duration: median ${seconds(c.medianMs)}, max ${seconds(c.maxMs)}`,
    `  time from a failure to the next pass: median ${seconds(c.medianRecoveryMs)}`,
    `  failed runs before a pass: median ${count(c.medianFailedBeforePass)}`,
    `Other verify runs: ${stats.otherVerifyRuns}`,
    `Waivers: ${stats.waivers}`,
    `${attest('Reviews', stats.reviews)}, longest failing streak ${stats.reviews.longestFailStreak}`,
    attest('Harden', stats.harden),
    attest('Ship', stats.ship),
    `Records: ${stats.first ? `${stats.first} to ${stats.last}` : 'none'}`
  ].join('\n');
}

module.exports = { median, compute, formatStats };
