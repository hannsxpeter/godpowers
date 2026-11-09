/**
 * Review rounds: how many failed rounds followed the last passing review, who
 * reviewed, and how big the change was in each round.
 */

const { ledgerText } = require('./policy');
const gitTools = require('./git');

const ROUND_LIMIT = 3;
// The change must grow by more than this share and by at least this many lines.
const GROWTH_SHARE = { numerator: 5, denominator: 4 };
const GROWTH_MIN_LINES = 20;

// Ledger fields can be anything; ledgerText makes any of them safe to print.
const text = ledgerText;

function shortHead(record) {
  return typeof record.head === 'string' && record.head ? text(record.head).slice(0, 7) : 'no commit';
}

function dismissedOf(record) {
  const list = Array.isArray(record.dismissed) ? record.dismissed : record.dismissed == null ? [] : [record.dismissed];
  return list.map(text).filter(Boolean);
}

/** The reviewer's name as printable text, or '' when the record has none. */
function reviewerOf(record) {
  return text(record && record.reviewer).trim();
}

const count = value => Number.isSafeInteger(value) && value >= 0;

/** A { base, files, added, removed } with a string base and whole-number counts, else null. */
function diffOf(diff) {
  if (!diff || typeof diff !== 'object' || typeof diff.base !== 'string' || !diff.base) return null;
  const { files, added, removed } = diff;
  return count(files) && count(added) && count(removed) ? { base: diff.base, files, added, removed } : null;
}

function describeDiff(diff) {
  return `${diff.files} file${diff.files === 1 ? '' : 's'}, +${diff.added} -${diff.removed} against ${text(diff.base).slice(0, 7)}`;
}

/** The stop-and-rethink message, or '' while the limit is not reached. */
function roundsWarning(failed) {
  return failed >= ROUND_LIMIT
    ? `${failed} failed review rounds since the last pass: stop and rethink the approach (re-plan, or ask the user) before another round.`
    : '';
}

/**
 * The scope-creep message, or ''. `first` is the first review record since the
 * last pass; `current` is the change now as { base, files, added, removed }.
 * Nothing is said unless both sizes are known, were measured against the same
 * base commit, and the change grew by more than 25% and by at least 20 lines.
 */
function growthWarning(first, current) {
  const was = first ? diffOf(first.diff) : null;
  const now = diffOf(current);
  if (!was || !now || was.base !== now.base) return '';
  const before = was.added + was.removed;
  const after = now.added + now.removed;
  const grew = after * GROWTH_SHARE.denominator > before * GROWTH_SHARE.numerator && after - before >= GROWTH_MIN_LINES;
  return grew ? `The change grew from ${before} to ${after} lines during review: cut what review added beyond the goal, or say why it is needed.` : '';
}

/**
 * The change now, measured against the base `ref` names (default: the latest
 * release tag): { base: sha or null, diff: { files, added, removed } or null }.
 * A ref that names no commit throws; any other git trouble gives nulls.
 */
function currentChange(root, ref) {
  const base = gitTools.baseFor(root, ref);
  return { base: base ? base.sha : null, diff: base ? gitTools.diffStat(root, base.sha) : null };
}

/** The current change as a diff record, or null when it is unknown. */
function currentDiff(current) {
  return current && current.base && current.diff ? { base: current.base, ...current.diff } : null;
}

function formatReviews(history, current = null) {
  const { lastPass, rounds, failedSinceLastPass } = history;
  const by = record => (reviewerOf(record) ? ` by ${reviewerOf(record)}` : '');
  const lines = [lastPass
    ? `Last passing review: ${shortHead(lastPass)} at ${text(lastPass.time)}${by(lastPass)}: ${text(lastPass.summary)}`
    : 'No passing review yet.'];
  rounds.forEach((record, index) => {
    lines.push(`Round ${index + 1}: ${text(record.verdict)} ${shortHead(record)} at ${text(record.time)}${by(record)}: ${text(record.summary)}`);
    const diff = diffOf(record.diff);
    if (diff) lines.push(`  diff: ${describeDiff(diff)}`);
    for (const note of dismissedOf(record)) lines.push(`  dismissed: ${note}`);
  });
  if (!rounds.length) lines.push('No review rounds since the last pass.');
  const now = currentDiff(current);
  if (now) lines.push(`Current change: ${describeDiff(now)}`);
  for (const warning of [roundsWarning(failedSinceLastPass), growthWarning(rounds[0], now)]) {
    if (warning) lines.push('', warning);
  }
  return lines.join('\n');
}

module.exports = { ROUND_LIMIT, text, dismissedOf, reviewerOf, roundsWarning, growthWarning, currentChange, currentDiff, formatReviews };
