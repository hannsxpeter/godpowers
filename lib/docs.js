/**
 * What counts as documentation in a project.
 *
 * Documentation changes do not void a review or a security pass, and a
 * session that only changed documentation may stop without a check. The
 * built-in rule covers markdown, reStructuredText, AsciiDoc, and a few well
 * known file names, but never agent instruction files (AGENTS.md, skills,
 * prompts), which steer a model and are code in effect. STATE.md may replace
 * the rule with `docs: none` (nothing is documentation) or `docs: <glob>,
 * <glob>`. Under every rule a path that matches a high-risk pattern (the
 * built-in ones or the STATE.md `risk:` globs) or has a control character in
 * its name is not documentation.
 *
 * Each predicate carries `policy`, a digest of the rule in force. The code
 * fingerprint mixes it in, so changing the rule voids carried-forward records.
 */

const crypto = require('crypto');
const path = require('path');

const match = require('./match');
const gitTools = require('./git');
const stateStore = require('./state');
const policyRules = require('./policy');
const { DIR } = require('./paths');

// Bump when the built-in rule changes, so old code fingerprints stop matching.
const DEFAULT_RULE_VERSION = 2;
const DOC_EXTENSIONS = new Set(['.md', '.mdx', '.markdown', '.rst', '.adoc']);
const DOC_NAMES = new Set(['LICENSE', 'LICENSE.txt', 'NOTICE', 'NOTICE.txt', 'AUTHORS', 'COPYING', 'CHANGELOG', 'CODEOWNERS']);
const INSTRUCTION_NAMES = new Set(['agents.md', 'claude.md', 'gemini.md', 'skill.md', '.cursorrules', '.windsurfrules', 'copilot-instructions.md']);
const INSTRUCTION_SEGMENTS = new Set(['.claude', '.codex', '.cursor', '.agents', '.gemini', '.windsurf', 'agents', 'skills', 'prompts']);

/** True for agent instruction files and anything under an agent or prompt directory. */
function isInstructionPath(rel) {
  const segments = String(rel).split('/');
  return INSTRUCTION_NAMES.has(segments[segments.length - 1].toLowerCase())
    || segments.some(segment => INSTRUCTION_SEGMENTS.has(segment.toLowerCase()));
}

function policyDigest(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function withPolicy(predicate, text) {
  predicate.policy = policyDigest(text);
  return predicate;
}

function sortedUnique(list) {
  return [...new Set(list)].sort();
}

/** Paths that are never documentation: high-risk patterns, `extra` globs, or a control character. */
function neverDoc(extra) {
  const patterns = [...policyRules.HIGH_RISK_PATTERNS, ...extra];
  return rel => policyRules.hasControlChar(rel) || match.matches(patterns, rel);
}

/** The built-in rule's own test: by extension or exact file name, minus instruction files. */
function byDefaultRule(rel) {
  return (DOC_EXTENSIONS.has(path.extname(rel).toLowerCase()) || DOC_NAMES.has(path.basename(rel))) && !isInstructionPath(rel);
}

/** Documentation by the built-in rule (see the top of this file). */
const neverBuiltIn = neverDoc([]);
const isDocPath = withPolicy(rel => byDefaultRule(rel) && !neverBuiltIn(rel), `docs=default:${DEFAULT_RULE_VERSION}|risk=`);

/** The predicate for a parsed STATE.md (or null): is this relative path documentation? */
function docPredicate(state) {
  const data = state && state.data ? state.data : {};
  const globs = policyRules.usableGlobs(match.parseList(data.docs));
  const riskGlobs = sortedUnique(policyRules.usableGlobs(match.parseList(data.risk)));
  const risk = `|risk=${riskGlobs.join(',')}`;
  if (globs.length === 1 && globs[0].toLowerCase() === 'none') return withPolicy(() => false, `docs=none${risk}`);
  const blocked = neverDoc(riskGlobs);
  if (!globs.length) return withPolicy(rel => byDefaultRule(rel) && !blocked(rel), `docs=default:${DEFAULT_RULE_VERSION}${risk}`);
  return withPolicy(rel => match.matches(globs, rel) && !blocked(rel), `docs=globs:${sortedUnique(globs).join(',')}${risk}`);
}

/** STATE.md as committed at `sha`, parsed; null with no commit, no such file, or one that cannot be read. */
function stateAt(root, sha) {
  try {
    const text = sha ? gitTools.showAt(root, sha, `${DIR}/STATE.md`) : null;
    return text === null ? null : stateStore.parse(text);
  } catch (_) {
    return null;
  }
}

/** The documentation rule of STATE.md as committed at `sha` (the built-in rule when there is none). */
function atCommit(root, sha) {
  return docPredicate(stateAt(root, sha));
}

/**
 * A path counts as documentation only when both rules say so, so a gate cannot
 * be loosened by editing STATE.md after the commit it measures from. The result
 * keeps the first rule's `policy` digest (the one the code fingerprint binds).
 */
function both(current, baseline) {
  const predicate = rel => current(rel) && baseline(rel);
  predicate.policy = current.policy;
  return predicate;
}

/** The predicate for the project at `root`. */
function forRoot(root) {
  return docPredicate(stateStore.read(root));
}

module.exports = { DEFAULT_RULE_VERSION, isDocPath, isInstructionPath, docPredicate, stateAt, atCommit, both, forRoot };
