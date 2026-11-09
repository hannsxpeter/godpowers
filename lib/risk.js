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
const { isTestPath } = require('./testguard');

const HIGH_RISK_PATTERNS = [
  '**/auth/**', '**/authn/**', '**/authz/**', '**/oauth/**', '**/login/**', '**/session/**', '**/sessions/**',
  '**/permissions/**', '**/security/**', '**/crypto/**', '*auth.*', '*login.*', '*password*', '*secret*',
  '*credential*', '**/secrets/**', '.env*', '**/migrations/**', '**/migrate/**', '*.sql', 'schema.prisma',
  '**/payments/**', '**/payment/**', '**/billing/**', '**/checkout/**', '.github/workflows/**', '.gitlab-ci.yml',
  '.circleci/**', 'Dockerfile', 'docker-compose*.yml', 'compose*.yml', '**/deploy/**', '**/infra/**', '*.tf',
  '**/k8s/**', '**/helm/**'
];

const LISTED_PATHS = 10;

/** The built-in patterns plus the STATE.md `risk:` globs. */
function patternsFor(state) {
  return [...HIGH_RISK_PATTERNS, ...match.parseList(state && state.data ? state.data.risk : null)];
}

function describeBase(base) {
  return `${base.ref} (${base.sha.slice(0, 7)})`;
}

const plural = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`;

/**
 * Classify the change since `base` ({ ref, sha } or null). Returns { tier,
 * base, reason, high: [{ path, pattern }], other: [paths] }, where `other`
 * holds the changed paths that match no high-risk pattern, code first.
 */
function classify(root, { base = null } = {}) {
  if (!base) {
    return { tier: 'high', base: null, reason: 'nothing to compare against: no v* tag is reachable from HEAD and no --base was given', high: [], other: [] };
  }
  const state = stateStore.read(root);
  const patterns = patternsFor(state);
  const isDoc = docs.docPredicate(state);
  const changed = gitTools.changedSince(root, base.sha);
  const high = [];
  const other = [];
  for (const rel of changed) {
    const pattern = patterns.find(glob => match.matches([glob], rel));
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
  const paths = result.high.length ? result.high.map(entry => `${entry.path} (${entry.pattern})`) : result.other;
  for (const line of paths.slice(0, LISTED_PATHS)) lines.push(`  ${line}`);
  if (paths.length > LISTED_PATHS) lines.push(`  and ${paths.length - LISTED_PATHS} more`);
  return lines.join('\n');
}

module.exports = { HIGH_RISK_PATTERNS, patternsFor, classify, describeBase, headline, formatRisk };
