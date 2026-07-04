/**
 * Permission re-audit cadence.
 *
 * An unattended loop accumulates permission creep: connectors gain write scope,
 * automations gain reach, credentials linger. A one-time harden pass does not
 * catch this. Loop engineering calls for a recurring re-audit, and the rule of
 * thumb is every 30 days. This module tracks when the last permission and
 * attack-surface audit ran and reports whether the next one is due, so a
 * scheduled automation (or /god-harden) can act on a hard signal instead of a
 * vague "we should probably re-check security sometime".
 *
 * State lives in .godpowers/harden/reaudit.json. The evaluation core is pure and
 * clock-injectable so the cadence logic is fully testable.
 */

const fs = require('fs');
const path = require('path');

const RECORD_PATH = '.godpowers/harden/reaudit.json';
const DEFAULT_CADENCE_DAYS = 30;
const DAY_MS = 864e5;

function recordFile(projectRoot) {
  return path.join(projectRoot || process.cwd(), RECORD_PATH);
}

function readRecord(projectRoot) {
  const file = recordFile(projectRoot);
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (e) {
    return null;
  }
}

/**
 * Pure cadence evaluation. Given the last audit timestamp, the current time,
 * and the cadence, decide whether a re-audit is due.
 */
function evaluate(opts = {}) {
  const cadenceDays = Number.isFinite(opts.cadenceDays) && opts.cadenceDays > 0
    ? opts.cadenceDays
    : DEFAULT_CADENCE_DAYS;
  const now = opts.now instanceof Date ? opts.now.getTime()
    : typeof opts.now === 'number' ? opts.now
      : Date.now();

  const lastAuditAt = opts.lastAuditAt || null;
  if (!lastAuditAt) {
    return {
      lastAuditAt: null,
      ageDays: null,
      cadenceDays,
      due: true,
      verdict: 'never-audited',
      nextDueAt: new Date(now).toISOString()
    };
  }

  const lastMs = Date.parse(lastAuditAt);
  if (Number.isNaN(lastMs)) {
    return { lastAuditAt, ageDays: null, cadenceDays, due: true, verdict: 'unparseable', nextDueAt: new Date(now).toISOString() };
  }

  // A future timestamp is a corrupt or clock-skewed record (a buggy writer or a
  // hand-edited/tampered reaudit.json). Fail safe like the unparseable branch:
  // force a re-audit instead of deferring the due date and muting the alarm.
  if (lastMs > now) {
    return { lastAuditAt, ageDays: null, cadenceDays, due: true, verdict: 'future-timestamp', nextDueAt: new Date(now).toISOString() };
  }

  const ageDays = Math.floor((now - lastMs) / DAY_MS);
  const due = ageDays >= cadenceDays;
  const nextDueAt = new Date(lastMs + cadenceDays * DAY_MS).toISOString();
  return {
    lastAuditAt,
    ageDays,
    cadenceDays,
    due,
    verdict: due ? 'overdue' : 'current',
    nextDueAt
  };
}

/**
 * Read the on-disk record and evaluate cadence for a project.
 */
function status(projectRoot, opts = {}) {
  const record = readRecord(projectRoot);
  const evaluation = evaluate({
    lastAuditAt: record ? record.lastAuditAt : null,
    now: opts.now,
    cadenceDays: opts.cadenceDays !== undefined ? opts.cadenceDays : (record && record.cadenceDays)
  });
  return {
    project: projectRoot,
    recordPath: recordFile(projectRoot),
    scope: (record && Array.isArray(record.scope)) ? record.scope : [],
    ...evaluation
  };
}

/**
 * Record that a permission/attack-surface audit completed. Called after
 * /god-harden or the god-harden-auditor finishes a pass.
 */
function record(projectRoot, opts = {}) {
  const file = recordFile(projectRoot);
  const at = opts.at || new Date().toISOString();
  const payload = {
    lastAuditAt: at,
    cadenceDays: Number.isFinite(opts.cadenceDays) && opts.cadenceDays > 0 ? opts.cadenceDays : DEFAULT_CADENCE_DAYS,
    scope: Array.isArray(opts.scope) ? opts.scope : ['connectors', 'automations', 'credentials', 'permissions'],
    findings: opts.findings || null
  };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

function render(state) {
  const age = state.ageDays === null ? 'never' : `${state.ageDays} day${state.ageDays === 1 ? '' : 's'} ago`;
  const line = state.due
    ? `DUE: last permission audit ${age} (cadence ${state.cadenceDays} days)`
    : `current: last permission audit ${age}, next due ${state.nextDueAt.slice(0, 10)}`;
  return [
    'Permission re-audit',
    '',
    `  ${line}`,
    `  Verdict: ${state.verdict}`,
    `  Scope:   ${state.scope && state.scope.length ? state.scope.join(', ') : 'connectors, automations, credentials, permissions'}`
  ].join('\n');
}

module.exports = {
  RECORD_PATH,
  DEFAULT_CADENCE_DAYS,
  recordFile,
  readRecord,
  evaluate,
  status,
  record,
  render
};
