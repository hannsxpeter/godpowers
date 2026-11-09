/**
 * The verdict: a short block for a PR description, commit body, or release
 * notes. It is built only from the ledger and git for the current code, by
 * code, so nothing in it comes from a model's own account of the work.
 * Ledger text is printable-only; the ledger can be committed by anyone.
 */

const evidence = require('./evidence');
const gitTools = require('./git');
const stateStore = require('./state');
const riskTools = require('./risk');
const reviewTools = require('./reviews');
const { declaredCheck } = require('./gate');

const { ledgerText: text } = require('./policy');
const plural = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`;
const SHORT = 7;

/** Command text for inline code: backticks would end the span, so they become apostrophes. */
const code = value => text(value).replace(/`/g, "'");

/**
 * The review judgment for this code: the status, how many rounds it took
 * (review records from the one after the previous pass through this one), who
 * reviewed, and how many findings were dismissed along the way.
 */
function reviewFacts(records, status, tier) {
  const record = status.last.review;
  const facts = { status: status.review, required: tier !== 'low', rounds: null, reviewer: null, dismissed: 0 };
  if (!record) return facts;
  const reviews = records.filter(entry => entry.kind === 'review');
  const index = reviews.indexOf(record);
  let previous = index - 1;
  while (previous >= 0 && reviews[previous].verdict !== 'pass') previous--;
  facts.rounds = index - previous;
  facts.reviewer = reviewTools.reviewerOf(record) || null;
  facts.dismissed = reviews.slice(previous + 1, index + 1).reduce((sum, entry) => sum + reviewTools.dismissedOf(entry).length, 0);
  return facts;
}

function openRiskCounts(state) {
  const counts = { total: 0 };
  for (const severity of stateStore.SEVERITIES) counts[severity] = state ? stateStore.openRisks(state, severity).length : 0;
  for (const severity of stateStore.SEVERITIES) counts.total += counts[severity];
  return counts;
}

/**
 * The facts behind the verdict for the code as it is now. `base` is a git ref
 * for the risk tier (default: the latest release tag). A ref that names no
 * commit throws.
 */
function compute(root, { base: ref } = {}) {
  const state = stateStore.read(root);
  const base = gitTools.baseFor(root, ref);
  const risk = riskTools.classify(root, { base });
  const { records } = evidence.readAll(root);
  // The same calls as the ship gate, so the verdict cannot pass what the gate does not.
  const tree = gitTools.treeFingerprint(root);
  const status = evidence.statusFor(records, tree, { command: declaredCheck(state) });
  const head = gitTools.headCommit(root);
  const headTree = gitTools.headTree(root);
  const last = status.lastCheck;
  return {
    head,
    dirty: Boolean(tree && headTree && tree !== headTree),
    risk: { tier: risk.tier, base, reason: risk.reason },
    check: {
      status: status.check,
      command: last && last.kind === 'verify' ? text(last.command) : null,
      time: last ? text(last.time) : null,
      reason: last && last.kind === 'waive' ? text(last.reason) : null
    },
    review: reviewFacts(records, status, risk.tier),
    security: { status: status.harden, required: risk.tier === 'high' },
    openRisks: openRiskCounts(state)
  };
}

function checkLine(check) {
  if (check.status === 'pass') return `passed, \`${code(check.command)}\`, ${text(check.time).slice(0, 10)}`;
  if (check.status === 'fail') return 'failed';
  if (check.status === 'waived') return `waived: ${text(check.reason)}`;
  return 'not run on this code';
}

function reviewLine(review, tier) {
  if (review.status === 'pass') {
    const who = review.reviewer ? `reviewer ${review.reviewer}` : 'reviewer not reported';
    const dismissed = review.dismissed ? `; ${plural(review.dismissed, 'finding')} dismissed` : '';
    return `passed after ${plural(review.rounds, 'round')}, ${who}${dismissed}`;
  }
  if (review.status === 'fail') return `failed in round ${review.rounds}`;
  return review.required ? 'not recorded on this code' : `not required (risk ${tier})`;
}

function securityLine(security, tier) {
  if (security.status === 'pass') return 'passed';
  if (security.status === 'fail') return 'failed';
  return security.required ? 'not recorded on this code' : `not required (risk ${tier})`;
}

function risksLine(counts) {
  const parts = stateStore.SEVERITIES.filter(severity => counts[severity]).map(severity => `${counts[severity]} ${severity}`);
  return parts.length ? parts.join(', ') : 'none';
}

/** The block, as lines of text. */
function format(verdict) {
  const { tier } = verdict.risk;
  const short = verdict.head ? verdict.head.slice(0, SHORT) : 'no commit';
  return [
    `Godpowers verdict for ${short}${verdict.dirty ? ' plus uncommitted changes' : ''} (risk: ${tier})`,
    `Check: ${checkLine(verdict.check)}`,
    `Review: ${reviewLine(verdict.review, tier)}`,
    `Security: ${securityLine(verdict.security, tier)}`,
    `Open risks: ${risksLine(verdict.openRisks)}`
  ].join('\n');
}

module.exports = { compute, format };
