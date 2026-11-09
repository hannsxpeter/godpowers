/**
 * Risk tiers: how much verification a change needs.
 *
 * The tier follows what changed since a base commit, not how much. High means
 * a path matches a high-risk pattern (sign-in, secrets, data migrations,
 * payments, deploy configuration) or STATE.md `risk:` globs, or there is
 * nothing to compare against. Low means only documentation and test files
 * changed (or nothing). Everything else is normal.
 */

const gitTools = require('./git');
const docs = require('./docs');
const match = require('./match');
const stateStore = require('./state');
const policy = require('./policy');
const { isTestPath } = require('./testguard');

const { HIGH_RISK_PATTERNS } = policy;
const MAX_SHOWN_GLOB = 80;
const UNUSUAL_NAME = 'unusual file name';

const LISTED_PATHS = 10;

/** The `risk:` globs of a parsed STATE.md (or null), usable or not. */
function riskGlobs(state) {
  return match.parseList(state && state.data ? state.data.risk : null);
}

/** The built-in patterns plus the usable STATE.md `risk:` globs. */
function patternsFor(state) {
  return [...HIGH_RISK_PATTERNS, ...riskGlobs(state).filter(match.usable)];
}

function describeBase(base) {
  return `${base.ref} (${base.sha.slice(0, 7)})`;
}

const plural = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`;

/**
 * Classify the change since `base` ({ ref, sha } or null). A path with a
 * control character in its name is high ("unusual file name"), and so is a
 * change that cannot be listed, a `risk:` glob (current or at the base) the
 * matcher cannot use, and a STATE.md at the base that exists but cannot be
 * read. Returns { tier,
 * base, reason, high: [{ path, pattern }], other: [paths] }, where `other`
 * holds the changed paths that match no high-risk pattern, code first.
 */
function classify(root, { base = null } = {}) {
  if (!base) {
    return { tier: 'high', base: null, reason: 'nothing to compare against: no v* tag is reachable from HEAD and no --base was given', high: [], other: [] };
  }
  // The working rules may only tighten what the base commit's rules said: a
  // risk glob that was there stays, and a path is documentation only if both agree.
  const state = stateStore.read(root);
  let baseState;
  try {
    baseState = docs.stateAt(root, base.sha);
  } catch (error) {
    return { tier: 'high', base, reason: `could not read STATE.md at ${base.ref}: ${policy.plain(error.message)}`, high: [], other: [] };
  }
  // A risk glob that matches nothing cannot be told from one that matches nothing yet, so it keeps the tier high.
  const unusable = [...riskGlobs(state), ...riskGlobs(baseState)].find(glob => !match.usable(glob));
  if (unusable !== undefined) {
    const shown = unusable.length > MAX_SHOWN_GLOB ? `${unusable.slice(0, MAX_SHOWN_GLOB)}...` : unusable;
    return { tier: 'high', base, reason: `unusable risk pattern: ${policy.showPath(shown)}`, high: [], other: [] };
  }
  const patterns = [...new Set([...patternsFor(state), ...patternsFor(baseState)])];
  const isDoc = docs.both(docs.docPredicate(state), docs.docPredicate(baseState));
  let changed;
  try {
    changed = gitTools.changedSince(root, base.sha);
  } catch (error) {
    return { tier: 'high', base, reason: `could not list the changes since ${base.ref}: ${policy.plain(error.message)}`, high: [], other: [] };
  }
  const high = [];
  const other = [];
  for (const rel of changed) {
    const pattern = policy.hasControlChar(rel) ? UNUSUAL_NAME : patterns.find(glob => match.matches([glob], rel));
    if (pattern) high.push({ path: rel, pattern });
    else other.push(rel);
  }
  const quiet = rel => isDoc(rel) || isTestPath(rel);
  other.sort((a, b) => Number(quiet(a)) - Number(quiet(b)) || (a < b ? -1 : a > b ? 1 : 0));
  const since = `since ${base.ref}`;
  if (high.length) {
    return { tier: 'high', base, reason: `${plural(high.length, 'changed path')} match${high.length === 1 ? 'es' : ''} high-risk patterns ${since}`, high, other };
  }
  if (!changed.length) return { tier: 'low', base, reason: `nothing changed ${since}`, high, other };
  if (other.every(quiet)) return { tier: 'low', base, reason: `only documentation and test files changed ${since}`, high, other };
  return { tier: 'normal', base, reason: `no high-risk paths ${since}; ${plural(other.filter(rel => !quiet(rel)).length, 'code path')} changed`, high, other };
}

/** `Risk: high since v7.0.1 (abc1234)`, or the no-base form. */
function headline(result) {
  return result.base ? `Risk: ${result.tier} since ${describeBase(result.base)}` : `Risk: ${result.tier} (no base to compare against)`;
}

function formatRisk(result) {
  const lines = [headline(result), result.reason];
  const paths = result.high.length ? result.high.map(entry => `${policy.showPath(entry.path)} (${entry.pattern})`) : result.other.map(policy.showPath);
  for (const line of paths.slice(0, LISTED_PATHS)) lines.push(`  ${line}`);
  if (paths.length > LISTED_PATHS) lines.push(`  and ${paths.length - LISTED_PATHS} more`);
  return lines.join('\n');
}

module.exports = { HIGH_RISK_PATTERNS, UNUSUAL_NAME, patternsFor, classify, describeBase, headline, formatRisk };
