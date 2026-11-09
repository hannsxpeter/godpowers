/**
 * Review rounds: how many failed rounds followed the last passing review.
 */

const { ledgerText } = require('./policy');

const ROUND_LIMIT = 3;

// Ledger fields can be anything; ledgerText makes any of them safe to print.
const text = ledgerText;

function shortHead(record) {
  return typeof record.head === 'string' && record.head ? text(record.head).slice(0, 7) : 'no commit';
}

function dismissedOf(record) {
  const list = Array.isArray(record.dismissed) ? record.dismissed : record.dismissed == null ? [] : [record.dismissed];
  return list.map(text).filter(Boolean);
}

/** The stop-and-rethink message, or '' while the limit is not reached. */
function roundsWarning(failed) {
  return failed >= ROUND_LIMIT
    ? `${failed} failed review rounds since the last pass: stop and rethink the approach (re-plan, or ask the user) before another round.`
    : '';
}

function formatReviews(history) {
  const { lastPass, rounds, failedSinceLastPass } = history;
  const lines = [lastPass
    ? `Last passing review: ${shortHead(lastPass)} at ${text(lastPass.time)}: ${text(lastPass.summary)}`
    : 'No passing review yet.'];
  rounds.forEach((record, index) => {
    lines.push(`Round ${index + 1}: ${text(record.verdict)} ${shortHead(record)} at ${text(record.time)}: ${text(record.summary)}`);
    for (const note of dismissedOf(record)) lines.push(`  dismissed: ${note}`);
  });
  if (!rounds.length) lines.push('No review rounds since the last pass.');
  const warning = roundsWarning(failedSinceLastPass);
  if (warning) lines.push('', warning);
  return lines.join('\n');
}

module.exports = { ROUND_LIMIT, roundsWarning, formatReviews };
