/**
 * What counts as documentation in a project.
 *
 * A session that only changed documentation may stop without a check, and a
 * release that only changed documentation and tests is low risk. Every
 * evidence record still binds to the exact code, documentation included.
 *
 * The built-in rule covers markdown, reStructuredText, AsciiDoc, and a few
 * well known file names, but never agent instruction files (AGENTS.md, skills,
 * prompts), which steer a model and are code in effect. STATE.md may only
 * narrow that rule: `docs: none` means nothing is documentation, and `docs:
 * <glob>, <glob>` limits it to paths that also match a glob. A path is
 * documentation only when the built-in rule says so, it is not an instruction
 * file, it matches no high-risk pattern (the built-in ones or the `risk:`
 * globs, current or at the baseline), it has no control character in its name,
 * and, when `docs:` lists usable globs, one of them matches. So no setting a
 * repository controls can widen what a gate lets through.
 *
 * Anything unknown is strict: a `risk:` glob the matcher cannot use makes
 * nothing documentation; a STATE.md with validation errors (a duplicate key, an
 * unusable glob), at the baseline or in the working tree, gives no allowance at
 * all; and a baseline STATE.md that exists but cannot be read makes `stateAt`
 * throw (the caller then counts nothing as documentation).
 */

const path = require('path');

const match = require('./match');
const gitTools = require('./git');
const stateStore = require('./state');
const policyRules = require('./policy');
const { DIR } = require('./paths');

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
const isDocPath = rel => byDefaultRule(rel) && !neverBuiltIn(rel);

/**
 * The predicate for a parsed STATE.md (or null): is this relative path
 * documentation? The built-in rule decides, and `docs:` globs can only narrow
 * it. Unusable `docs:` globs are ignored here (the STATE.md then has an error,
 * which callers check with `stateErrors`); with an unusable `risk:` glob
 * nothing is documentation, because the glob may have named paths that must
 * stay out.
 */
function docPredicate(state) {
  const data = state && state.data ? state.data : {};
  const riskGlobs = match.parseList(data.risk);
  if (!riskGlobs.every(match.usable)) return () => false;
  const globs = match.parseList(data.docs).filter(match.usable);
  if (globs.length === 1 && globs[0].toLowerCase() === 'none') return () => false;
  const blocked = neverDoc(riskGlobs);
  const builtIn = rel => byDefaultRule(rel) && !blocked(rel);
  return globs.length ? rel => builtIn(rel) && match.matches(globs, rel) : builtIn;
}

/** The validation errors ({ line, message }) of a parsed STATE.md; none for null (no STATE.md, no settings). */
function stateErrors(state) {
  return state ? stateStore.validate(state).filter(d => d.severity === 'error') : [];
}

/**
 * STATE.md as committed at `sha`, parsed. Null when there is no commit or the
 * commit has no STATE.md (no settings). Throws when the file is there but
 * cannot be read: callers treat that as strict.
 */
function stateAt(root, sha) {
  if (!sha) return null;
  const text = gitTools.readAt(root, sha, `${DIR}/STATE.md`);
  return text === null ? null : stateStore.parse(text);
}

/**
 * The stop gate's documentation rule: the intersection of the working STATE.md
 * `state` and the one committed at HEAD. Nothing counts as documentation when
 * either has validation errors or the committed one cannot be read.
 */
function forStop(root, state) {
  try {
    const baseline = stateAt(root, gitTools.headCommit(root));
    if (stateErrors(state).length || stateErrors(baseline).length) return () => false;
    return both(docPredicate(state), docPredicate(baseline));
  } catch (_) {
    return () => false;
  }
}

/** A path counts as documentation only when both rules say so, so a gate cannot be loosened by editing STATE.md after the commit it measures from. */
function both(current, baseline) {
  return rel => current(rel) && baseline(rel);
}

module.exports = { isDocPath, isInstructionPath, docPredicate, stateErrors, stateAt, forStop, both };
