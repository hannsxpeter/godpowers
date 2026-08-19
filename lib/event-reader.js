/**
 * Event Reader
 *
 * Reads events.jsonl files and produces three views:
 *   - timeline(runId): chronological readable summary
 *   - metrics(runId | runIds): per-tier durations, pauses, retries
 *   - trace(runId, tier): deep dive on one tier's events
 *
 * Companion to lib/events.js which is the writer.
 *
 * Public API:
 *   readAll(projectRoot, runId) -> Event[]
 *   timeline(projectRoot, runId, opts) -> string (formatted) or rows array
 *   metrics(projectRoot, runIds | null) -> { perTier, totals }
 *   trace(projectRoot, runId, tier) -> Event[] (filtered)
 *   decisions(projectRoot, runIds, opts) -> { items, integrityFailures }
 *   summarize(events) -> { agentCount, pauseCount, errorCount, durationMs }
 * Implements: P-MUST-48
 */

const fs = require('fs');
const path = require('path');

const events = require('./events');

const MAX_DECISION_RESULTS = 100;
const MAX_DECISION_RUNS = 100;
const MAX_DECISION_RUN_INPUTS = 200;
const MAX_DECISION_INTEGRITY_FAILURES = 100;
const DECISION_FILTER_LIMITS = Object.freeze({
  tier: 64,
  agent: 128,
  result: 240
});

function readAll(projectRoot, runId) {
  return events.readRun(projectRoot, runId);
}

/**
 * Render events as a readable timeline.
 *
 * opts: { limit, since (ISO), filter (event-name regex) }
 *
 * Returns an array of { ts, name, attrs, durationMs? } rows.
 */
function timeline(projectRoot, runId, opts = {}) {
  const all = readAll(projectRoot, runId);
  let rows = all;
  if (opts.since) {
    rows = rows.filter(e => e.ts >= opts.since);
  }
  if (opts.filter) {
    const re = new RegExp(opts.filter);
    rows = rows.filter(e => re.test(e.name));
  }
  if (opts.limit) rows = rows.slice(-opts.limit);

  // Pair agent.start / agent.end to compute durations
  const startMap = new Map();
  const result = rows.map(e => {
    const row = { ts: e.ts, name: e.name, attrs: e.attrs || {} };
    if (e.name === 'agent.start') {
      startMap.set(e.span_id, new Date(e.ts).getTime());
    }
    if (e.name === 'agent.end') {
      const start = startMap.get(e.span_id);
      if (start) row.durationMs = new Date(e.ts).getTime() - start;
    }
    return row;
  });
  return result;
}

/**
 * Format a timeline as a human-readable string.
 */
function formatTimeline(rows) {
  return rows.map(r => {
    const dur = r.durationMs != null ? ` (${(r.durationMs / 1000).toFixed(2)}s)` : '';
    const tier = r.attrs.tier ? ` [${r.attrs.tier}]` : '';
    const agent = r.attrs.agent ? ` ${r.attrs.agent}` : '';
    return `${r.ts} ${r.name}${tier}${agent}${dur}`;
  }).join('\n');
}

/**
 * Compute per-tier metrics across one or all runs.
 *
 * If runIds is null, walks every run in the project.
 *
 * Returns:
 *   {
 *     perTier: {
 *       'tier-1': { count, totalMs, avgMs, pauseCount, errorCount },
 *       ...
 *     },
 *     totals: { runs, agents, pauses, errors, totalMs }
 *   }
 */
function metrics(projectRoot, runIds) {
  if (!runIds) runIds = events.listRuns(projectRoot);
  if (!Array.isArray(runIds)) runIds = [runIds];

  const perTier = {};
  const totals = { runs: runIds.length, agents: 0, pauses: 0, errors: 0, totalMs: 0 };

  for (const runId of runIds) {
    const all = readAll(projectRoot, runId);
    const starts = new Map();
    for (const e of all) {
      const tier = (e.attrs && e.attrs.tier) || 'unknown';
      if (!perTier[tier]) {
        perTier[tier] = { count: 0, totalMs: 0, pauseCount: 0, errorCount: 0 };
      }
      if (e.name === 'agent.start') {
        starts.set(e.span_id, { tier, ts: new Date(e.ts).getTime() });
      }
      if (e.name === 'agent.end') {
        const s = starts.get(e.span_id);
        if (s) {
          const dur = new Date(e.ts).getTime() - s.ts;
          perTier[s.tier].count += 1;
          perTier[s.tier].totalMs += dur;
          totals.agents += 1;
          totals.totalMs += dur;
        }
      }
      if (e.name === 'agent.pause') {
        perTier[tier].pauseCount += 1;
        totals.pauses += 1;
      }
      if (e.name === 'error') {
        perTier[tier].errorCount += 1;
        totals.errors += 1;
      }
    }
  }

  for (const t of Object.keys(perTier)) {
    const p = perTier[t];
    p.avgMs = p.count > 0 ? Math.round(p.totalMs / p.count) : 0;
  }
  return { perTier, totals };
}

/**
 * Filter events for one tier across a run.
 */
function trace(projectRoot, runId, tier) {
  return readAll(projectRoot, runId).filter(e =>
    e.attrs && e.attrs.tier === tier
  );
}

function decisionRunIds(projectRoot, runIds) {
  const omitted = runIds === null || runIds === undefined;
  let selected;
  let invalidSelection = false;
  let omittedOverflow = false;
  if (omitted) {
    selected = events.listRuns(projectRoot);
    omittedOverflow = selected.length > MAX_DECISION_RUNS;
    selected = selected.slice(-MAX_DECISION_RUNS);
  } else if (Array.isArray(runIds)) {
    selected = runIds;
  } else if (typeof runIds === 'string' && runIds.length > 0) {
    selected = [runIds];
  } else {
    selected = [];
    invalidSelection = true;
  }
  const seen = new Set();
  const safe = [];
  let overflow = omittedOverflow;
  const inputOverflow = selected.length > MAX_DECISION_RUN_INPUTS;
  const inputCount = Math.min(selected.length, MAX_DECISION_RUN_INPUTS);
  for (let index = 0; index < inputCount; index++) {
    let runId;
    try {
      runId = selected[index];
    } catch (err) {
      invalidSelection = true;
      continue;
    }
    if (typeof runId !== 'string'
      || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(runId)
      || runId.includes('..')
      || runId.trim() !== runId) {
      invalidSelection = true;
      continue;
    }
    if (seen.has(runId)) continue;
    seen.add(runId);
    if (safe.length >= MAX_DECISION_RUNS) {
      overflow = true;
      break;
    }
    safe.push(runId);
  }
  return { runIds: safe, overflow, inputOverflow, invalidSelection };
}

function exactFilter(value, name) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const filter = value.trim();
  if (filter.length > DECISION_FILTER_LIMITS[name]) {
    throw new Error(`Decision ${name} filter exceeds ${DECISION_FILTER_LIMITS[name]} characters`);
  }
  return filter;
}

function eventDecisionRecord(attrs) {
  if (!attrs || typeof attrs !== 'object' || Array.isArray(attrs)) return attrs;
  return {
    decision: attrs.decision,
    reason: attrs.reason,
    evidence: attrs.evidence,
    result: attrs.result,
    attrs: Object.fromEntries(Object.entries(attrs)
      .filter(([key]) => !['decision', 'reason', 'evidence', 'result'].includes(key)))
  };
}

function decisionItem(runId, event, attrs) {
  return {
    runId,
    ts: event.ts,
    decision: attrs.decision,
    reason: attrs.reason,
    evidence: [...attrs.evidence],
    result: attrs.result,
    attrs: Object.fromEntries(Object.entries(attrs)
      .filter(([key]) => !['decision', 'reason', 'evidence', 'result'].includes(key)))
  };
}

function pushTail(items, item, limit) {
  if (limit === 0) return;
  if (items.length === limit) items.shift();
  items.push(item);
}

function addIntegrityFailure(projection, seen, runId, reason) {
  if (projection.integrityFailures.length >= MAX_DECISION_INTEGRITY_FAILURES) return;
  const key = `${runId || ''}:${reason}`;
  if (seen.has(key)) return;
  seen.add(key);
  projection.integrityFailures.push({ runId: runId || null, reason });
}

/**
 * Project recorded decisions only from runs whose complete event hash chain
 * verifies. Filters are exact string matches and result counts are capped.
 */
function decisions(projectRoot, runIds, opts = {}) {
  if (!opts || typeof opts !== 'object' || Array.isArray(opts)) opts = {};
  const tier = exactFilter(opts.tier, 'tier');
  const agent = exactFilter(opts.agent, 'agent');
  const result = exactFilter(opts.result, 'result');
  const since = typeof opts.since === 'string' && Number.isFinite(Date.parse(opts.since))
    ? Date.parse(opts.since)
    : null;
  const requestedLimit = Number.isInteger(opts.limit) && opts.limit >= 0
    ? opts.limit
    : MAX_DECISION_RESULTS;
  const limit = Math.min(requestedLimit, MAX_DECISION_RESULTS);

  const projection = { items: [], integrityFailures: [] };
  const failureKeys = new Set();
  const selection = decisionRunIds(projectRoot, runIds);
  if (selection.overflow) {
    addIntegrityFailure(projection, failureKeys, null, 'run-limit-exceeded');
  }
  if (selection.inputOverflow) {
    addIntegrityFailure(projection, failureKeys, null, 'run-input-limit-exceeded');
  }
  if (selection.invalidSelection) {
    addIntegrityFailure(projection, failureKeys, null, 'invalid-run-selection');
  }
  for (const runId of selection.runIds) {
    const snapshot = events.readVerifiedRunSnapshot(projectRoot, runId);
    if (!snapshot.valid) {
      const reason = ['unsafe-events-path', 'events-resource-limit'].includes(snapshot.error)
        ? snapshot.error
        : 'broken-chain';
      addIntegrityFailure(projection, failureKeys, runId,
        reason);
      continue;
    }
    for (const event of snapshot.events) {
      if (event.name !== 'decision.recorded' || !event.attrs) continue;
      let attrs;
      try {
        attrs = events.validateDecisionRecord(eventDecisionRecord(event.attrs));
      } catch (err) {
        addIntegrityFailure(projection, failureKeys, runId, 'invalid-decision-record');
        continue;
      }
      if (typeof event.ts !== 'string' || event.ts.length > 40
        || !Number.isFinite(Date.parse(event.ts))) {
        addIntegrityFailure(projection, failureKeys, runId, 'invalid-decision-record');
        continue;
      }
      if (tier && attrs.tier !== tier) continue;
      if (agent && attrs.agent !== agent) continue;
      if (result && attrs.result !== result) continue;
      if (since !== null && Date.parse(event.ts) < since) continue;
      pushTail(projection.items, decisionItem(runId, event, attrs), limit);
    }
  }
  return projection;
}

function summarize(eventList) {
  const summary = { agentCount: 0, pauseCount: 0, errorCount: 0, durationMs: 0 };
  const starts = new Map();
  let firstTs = null, lastTs = null;
  for (const e of eventList) {
    if (!firstTs || e.ts < firstTs) firstTs = e.ts;
    if (!lastTs || e.ts > lastTs) lastTs = e.ts;
    if (e.name === 'agent.start') {
      starts.set(e.span_id, new Date(e.ts).getTime());
    }
    if (e.name === 'agent.end') {
      const s = starts.get(e.span_id);
      if (s) summary.agentCount += 1;
    }
    if (e.name === 'agent.pause') summary.pauseCount += 1;
    if (e.name === 'error') summary.errorCount += 1;
  }
  if (firstTs && lastTs) {
    summary.durationMs = new Date(lastTs).getTime() - new Date(firstTs).getTime();
  }
  return summary;
}

module.exports = {
  readAll,
  timeline,
  formatTimeline,
  metrics,
  trace,
  decisions,
  MAX_DECISION_RESULTS,
  MAX_DECISION_RUNS,
  MAX_DECISION_RUN_INPUTS,
  MAX_DECISION_INTEGRITY_FAILURES,
  DECISION_FILTER_LIMITS,
  summarize
};
