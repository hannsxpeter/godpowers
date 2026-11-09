/**
 * Base drift: has the branch this change will merge into moved on, in files
 * this change also touches? Only a warning, from what git already has locally.
 * Nothing is fetched, so the answer is as fresh as the last fetch. Every
 * failure gives { drift: null, reason } instead of throwing.
 */

const gitTools = require('./git');
const { plain, showPath } = require('./policy');

const LISTED_FILES = 3;
const FALLBACKS = ['origin/HEAD', 'main'];

const plural = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`;
const unknown = reason => ({ drift: null, reason: plain(reason), warning: null });

/** The branch to merge into as { ref, sha }: `--onto`, else origin/HEAD, else main; or { reason }. */
function resolveOnto(root, onto) {
  if (onto !== undefined && onto !== null) {
    const ref = String(onto).trim();
    try {
      return { ref, sha: gitTools.resolveBase(root, ref) };
    } catch (error) {
      return { reason: `could not resolve --onto "${ref}": ${error.message}` };
    }
  }
  for (const ref of FALLBACKS) {
    try {
      const sha = gitTools.resolveBase(root, ref);
      return { ref: ref === 'origin/HEAD' ? gitTools.remoteHeadName(root) || ref : ref, sha };
    } catch (_) {
      // Try the next candidate.
    }
  }
  return { reason: `no origin/HEAD or main to compare with; pass --onto <ref>` };
}

/** The warning text for a drift with overlapping files, or ''. */
function warningFor(drift) {
  if (!drift || !drift.files.length) return '';
  const shown = drift.files.slice(0, LISTED_FILES).map(rel => showPath(rel)).join(', ');
  const more = drift.files.length > LISTED_FILES ? ` (+${drift.files.length - LISTED_FILES} more)` : '';
  return `${plain(drift.onto)} has ${plural(drift.commits, 'commit')} since this branch forked that touch files this change also touches (as of the last fetch): ${shown}${more}. Rebase, then run verify again.`;
}

/**
 * Compare HEAD with the branch it will merge into. Returns { drift, reason,
 * warning }: `drift` is { onto, ontoSha, mergeBase, commits, files } (files
 * are the paths both sides changed since the fork, committed, uncommitted, or
 * untracked, without `.godpowers/`), or null with a `reason` when the answer
 * is unknown. `warning` is set only when files overlap.
 */
function compute(root, { onto } = {}) {
  try {
    if (!gitTools.isRepo(root)) return unknown('not a git repository');
    const head = gitTools.headCommit(root);
    if (!head) return unknown('no commits yet');
    const target = resolveOnto(root, onto);
    if (target.reason) return unknown(target.reason);
    const fork = gitTools.mergeBase(root, head, target.sha);
    if (!fork) return unknown(`${target.ref} shares no history with HEAD`);
    const commits = gitTools.commitsAhead(root, head, target.sha);
    if (commits === null) return unknown(`could not count the commits on ${target.ref}`);
    const drift = { onto: target.ref, ontoSha: target.sha, mergeBase: fork, commits, files: [] };
    if (commits === 0) return { drift, reason: null, warning: null };
    const theirs = gitTools.changedBetween(root, fork, target.sha);
    if (theirs === null) return unknown(`could not list the changes on ${target.ref}`);
    const ours = new Set(gitTools.changedSince(root, fork));
    drift.files = theirs.filter(rel => ours.has(rel));
    return { drift, reason: null, warning: warningFor(drift) || null };
  } catch (error) {
    return unknown(`git failed: ${error.message}`);
  }
}

module.exports = { compute, warningFor };
