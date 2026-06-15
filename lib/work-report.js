/**
 * Work report: the chat play-by-play (Phase 3 visibility gene).
 *
 * Rebound from Mythify's build_work_report: cursor-based, reads the evidence
 * ledger, surfaces an "Attention" section for reds, and advances a cursor
 * unless --peek. The cursor lives at .godpowers/ledger/reports/cursor.json so a
 * fresh session can emit only what is new since the last report.
 *
 * Read-mostly: report() reads the ledger and, unless peek is set, advances the
 * report cursor. It never mutates state.json.
 *
 * @typedef {Object} WorkReport
 * @property {string} since "last" or "all".
 * @property {boolean} peek Whether the cursor was left unadvanced.
 * @property {Object[]} records The ledger records in the window, oldest first.
 * @property {Object[]} attention Executed records that did not verify (reds).
 * @property {{ total: number, passed: number, failed: number, attested: number }} summary
 * @property {{ previous: string|null, next: string|null }} cursor
 */

const fs = require('fs');
const path = require('path');

const atomic = require('./atomic-write');
const evidence = require('./evidence');

function reportsDir(projectRoot) {
  return path.join(projectRoot, '.godpowers', 'ledger', 'reports');
}

function cursorPath(projectRoot) {
  return path.join(reportsDir(projectRoot), 'cursor.json');
}

function readCursor(projectRoot) {
  try {
    return JSON.parse(fs.readFileSync(cursorPath(projectRoot), 'utf8'));
  } catch (_) {
    return {};
  }
}

function writeCursor(projectRoot, cursor) {
  fs.mkdirSync(reportsDir(projectRoot), { recursive: true });
  atomic.writeJsonAtomic(cursorPath(projectRoot), cursor);
}

function summarize(window) {
  const executed = window.filter((r) => r && r.kind === 'executed');
  return {
    total: window.length,
    passed: executed.filter((r) => r.verified).length,
    failed: executed.filter((r) => !r.verified).length,
    attested: window.filter((r) => r && r.kind === 'attested').length
  };
}

/**
 * Build the work report for records since the last cursor (or all records).
 *
 * @param {{ since?: string, peek?: boolean, projectRoot?: string }} [opts]
 * @returns {WorkReport}
 */
function report(opts = {}) {
  const projectRoot = path.resolve(opts.projectRoot || process.cwd());
  const since = opts.since === 'all' ? 'all' : 'last';
  const peek = Boolean(opts.peek);

  const records = evidence.read(projectRoot); // oldest first (append order)
  const cursor = readCursor(projectRoot);
  const lastTs = cursor.lastTs || null;

  const window = since === 'all'
    ? records.slice()
    : records.filter((r) => r && r.timestamp && (!lastTs || r.timestamp > lastTs));

  const attention = window.filter((r) => r && r.kind === 'executed' && !r.verified);
  const newest = window.length ? window[window.length - 1].timestamp : lastTs;

  if (!peek && newest && newest !== lastTs) {
    writeCursor(projectRoot, { lastTs: newest });
  }

  return {
    since,
    peek,
    records: window,
    attention,
    summary: summarize(window),
    cursor: { previous: lastTs, next: newest || null }
  };
}

function describeRecord(record) {
  const label = record.claim || record.command || '(unlabeled)';
  if (record.kind === 'attested') {
    return `  ATTESTED  ${record.substep || '-'}  ${label}`;
  }
  const verdict = record.verified ? 'PASS' : 'FAIL';
  return `  ${verdict}  ${record.substep || '-'}  exit ${record.exit_code}  ${label}`;
}

function render(result) {
  const lines = [];
  lines.push('Godpowers Work Report');
  lines.push('');
  if (result.records.length === 0) {
    lines.push(result.since === 'all'
      ? 'No verification records yet.'
      : 'Nothing new since the last report.');
    return lines.join('\n');
  }
  lines.push(`Since: ${result.since}${result.peek ? ' (peek, cursor not advanced)' : ''}`);
  lines.push('');
  lines.push('Play-by-play:');
  for (const record of result.records) {
    lines.push(describeRecord(record));
  }
  if (result.attention.length > 0) {
    lines.push('');
    lines.push('Attention (unverified):');
    for (const record of result.attention) {
      lines.push(describeRecord(record));
    }
  }
  const s = result.summary;
  lines.push('');
  lines.push(`Summary: ${s.passed} passed, ${s.failed} failed, ${s.attested} attested (${s.total} record(s))`);
  return lines.join('\n');
}

module.exports = {
  report,
  render,
  reportsDir,
  cursorPath
};
