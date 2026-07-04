/**
 * Accepted-change-rate metric.
 *
 * Loop engineering measures a loop's health by its accepted-change rate: of the
 * changes an autonomous loop proposes, what fraction survive review instead of
 * being rejected or rolled back. Tokens spent and tasks attempted are vanity
 * numbers; accepted-change rate is the one that tracks whether the loop is
 * actually producing shippable work.
 *
 * This module derives that rate from the existing hash-chained event ledger
 * (lib/events.js) so it works on any project's run history with no new
 * bookkeeping. The accepted and rejected counts always sum both the explicit
 * change.* events (when a reviewer emits them) and the equivalent gate/rollback
 * signals every arc already records. Only the proposed count prefers an
 * explicit change.proposed tally and otherwise falls back to accepted+rejected:
 *
 *   accepted  = change.accepted + gate.pass
 *   rejected  = change.rejected + gate.fail + state.rollback
 *   proposed  = change.proposed  (when emitted) else accepted + rejected
 *   rate      = accepted / (accepted + rejected)
 *
 * A high rate means the loop's first attempts survive review (little rework); a
 * low rate means the loop is thrashing. The default target mirrors the loop-
 * engineering rule of thumb: keep the accepted-change rate above 50%.
 */

const events = require('./events');

const DEFAULT_TARGET = 0.5;

const ACCEPTED_NAMES = new Set(['change.accepted', 'gate.pass']);
const REJECTED_NAMES = new Set(['change.rejected', 'gate.fail', 'state.rollback']);

function parseSince(since) {
  if (since === undefined || since === null || since === 'all') return null;
  if (since instanceof Date) return since.getTime();
  if (typeof since === 'number') return Date.now() - since;
  const text = String(since).trim();
  const iso = Date.parse(text);
  if (!Number.isNaN(iso)) return iso;
  const rel = /^(\d+)\s*([smhdw])$/.exec(text);
  if (rel) {
    const units = { s: 1e3, m: 6e4, h: 36e5, d: 864e5, w: 6048e5 };
    return Date.now() - Number(rel[1]) * units[rel[2]];
  }
  return null;
}

function withinWindow(event, sinceMs) {
  if (sinceMs === null) return true;
  const ts = event && event.ts ? Date.parse(event.ts) : NaN;
  if (Number.isNaN(ts)) return false;
  return ts >= sinceMs;
}

/**
 * Classify a flat list of ledger events into change counts. Pure: no disk
 * access, so the whole metric can be unit-tested against synthetic ledgers.
 */
function classify(eventList, opts = {}) {
  const target = typeof opts.target === 'number' ? opts.target : DEFAULT_TARGET;
  const sinceMs = opts.sinceMs !== undefined ? opts.sinceMs : parseSince(opts.since);

  let accepted = 0;
  let rejected = 0;
  let explicitProposed = 0;

  for (const event of Array.isArray(eventList) ? eventList : []) {
    if (!event || !event.name || !withinWindow(event, sinceMs)) continue;
    if (event.name === 'change.proposed') explicitProposed += 1;
    if (ACCEPTED_NAMES.has(event.name)) accepted += 1;
    if (REJECTED_NAMES.has(event.name)) rejected += 1;
  }

  const decided = accepted + rejected;
  const proposed = explicitProposed > 0 ? explicitProposed : decided;
  const rate = decided > 0 ? accepted / decided : null;

  return {
    proposed,
    accepted,
    rejected,
    decided,
    rate,
    ratePercent: rate === null ? null : Math.round(rate * 1000) / 10,
    target,
    meetsTarget: rate === null ? null : rate >= target,
    verdict: rate === null ? 'no-data' : rate >= target ? 'healthy' : 'thrashing'
  };
}

function collectEvents(projectRoot, runIds) {
  const runs = Array.isArray(runIds) ? runIds : events.listRuns(projectRoot);
  const all = [];
  for (const runId of runs) {
    for (const event of events.readRun(projectRoot, runId)) all.push(event);
  }
  return all;
}

/**
 * Compute the accepted-change-rate metric for a project from its run ledgers.
 */
function compute(projectRoot, opts = {}) {
  const runs = events.listRuns(projectRoot);
  const eventList = collectEvents(projectRoot, runs);
  const summary = classify(eventList, opts);
  return {
    project: projectRoot,
    window: opts.since && opts.since !== 'all' ? String(opts.since) : 'all',
    runs: runs.length,
    ...summary
  };
}

function render(metric) {
  const rate = metric.rate === null
    ? 'n/a (no reviewed changes yet)'
    : `${metric.ratePercent}%`;
  const target = `${Math.round(metric.target * 100)}%`;
  const status = metric.rate === null
    ? 'no data'
    : metric.meetsTarget
      ? `above target (>= ${target})`
      : `below target (< ${target})`;
  return [
    'Accepted-change rate',
    '',
    `  Window:   ${metric.window || 'all'} (${metric.runs} run${metric.runs === 1 ? '' : 's'})`,
    `  Proposed: ${metric.proposed}`,
    `  Accepted: ${metric.accepted}`,
    `  Rejected: ${metric.rejected}`,
    `  Rate:     ${rate} (${status})`,
    `  Verdict:  ${metric.verdict}`
  ].join('\n');
}

module.exports = {
  DEFAULT_TARGET,
  ACCEPTED_NAMES,
  REJECTED_NAMES,
  parseSince,
  classify,
  compute,
  render
};
