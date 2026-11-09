/**
 * What counts as documentation in a project.
 *
 * Documentation changes do not void a review or a security pass, and a
 * session that only changed documentation may stop without a check. The
 * built-in rule covers markdown, reStructuredText, AsciiDoc, and a few well
 * known file names. STATE.md may replace it with `docs: none` (nothing is
 * documentation) or `docs: <glob>, <glob>`.
 */

const path = require('path');

const match = require('./match');
const stateStore = require('./state');

const DOC_EXTENSIONS = new Set(['.md', '.mdx', '.markdown', '.rst', '.adoc']);
const DOC_NAMES = new Set(['LICENSE', 'LICENSE.txt', 'NOTICE', 'NOTICE.txt', 'AUTHORS', 'COPYING', 'CHANGELOG', 'CODEOWNERS']);

/** Documentation by extension (markdown, reStructuredText, AsciiDoc) or exact file name. */
function isDocPath(rel) {
  return DOC_EXTENSIONS.has(path.extname(rel).toLowerCase()) || DOC_NAMES.has(path.basename(rel));
}

/** The predicate for a parsed STATE.md (or null): is this relative path documentation? */
function docPredicate(state) {
  const setting = state && state.data ? state.data.docs : null;
  const globs = match.parseList(setting);
  if (!globs.length) return isDocPath;
  if (globs.length === 1 && globs[0].toLowerCase() === 'none') return () => false;
  return rel => match.matches(globs, rel);
}

/** The predicate for the project at `root`. */
function forRoot(root) {
  return docPredicate(stateStore.read(root));
}

module.exports = { isDocPath, docPredicate, forRoot };
