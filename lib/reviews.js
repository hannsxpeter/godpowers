/**
 * Review rounds: how many failed rounds followed the last passing review.
 */

const ROUND_LIMIT = 3;

function shortHead(record) {
  return record.head ? record.head.slice(0, 7) : 'no commit';
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
    ? `Last passing review: ${shortHead(lastPass)} at ${lastPass.time}: ${lastPass.summary}`
    : 'No passing review yet.'];
  rounds.forEach((record, index) => {
    lines.push(`Round ${index + 1}: ${record.verdict} ${shortHead(record)} at ${record.time}: ${record.summary}`);
    for (const note of record.dismissed || []) lines.push(`  dismissed: ${note}`);
  });
  if (!rounds.length) lines.push('No review rounds since the last pass.');
  const warning = roundsWarning(failedSinceLastPass);
  if (warning) lines.push('', warning);
  return lines.join('\n');
}

module.exports = { ROUND_LIMIT, roundsWarning, formatReviews };
