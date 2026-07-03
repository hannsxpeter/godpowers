/**
 * Quarterback: the entry-level router.
 *
 * A thin decision layer that composes the existing structural router
 * (lib/router.js) and the fuzzy-intent playbook (lib/recipes.js) rather than
 * duplicating them. It adds exactly two genes that Godpowers lacks at entry:
 *   - refuse-on-red: never start new work when the latest executed verdict is
 *     red or harden findings carry an unresolved Critical (the [10] route).
 *   - proportional ceremony: do not open an arc for a one-line fix (the [90]
 *     route).
 * Everything else delegates to router.suggestNext() and recipes.matchIntent().
 *
 * Read-only: route() never mutates state. See docs/FUSION-ARCHITECTURE.md 4.3.
 *
 * @typedef {Object} Play
 * @property {string} route One of recover, resume, recovery, brownfield,
 *   research, review, full, feature, trivial.
 * @property {string} reason Why this route was chosen.
 * @property {string|null} nextCommand The command (or null to answer inline).
 * @property {string} ceremony none | light | focused | full | inherit.
 * @property {string} verificationStrategy none | artifact+attested | executed-where-gated.
 * @property {string} chatPolicy Always "stay in this chat as executor".
 * @property {boolean} mutatesState Always false.
 * @property {{ classification: string, latestVerdict: string, activeArc: string|null, openFindings: boolean }} evidence
 */

const path = require('path');

const router = require('./router');
const recipes = require('./recipes');
const evidence = require('./evidence');
const stateStore = require('./state');
const artifactMap = require('./artifact-map');
const syncFs = require('./sync-fs');

const CONTINUATION_KEYWORDS = ['continue', 'resume', 'next step', 'keep going', "what's next", 'whats next', 'pick up', 'carry on'];
const INCIDENT_KEYWORDS = ['incident', 'outage', 'hotfix', 'postmortem', 'post-mortem', 'rollback', 'regression', 'production is down', 'broke prod', 'sev1', 'sev 1'];
const BROWNFIELD_KEYWORDS = ['inherited', 'inherit', 'existing codebase', 'legacy', 'brownfield', 'took over', 'onboard onto', 'understand this repo', 'archaeology'];
const RESEARCH_KEYWORDS = ['spike', 'explore', 'research', 'prototype', 'proof of concept', 'proof-of-concept', 'poc', 'evaluate', 'not sure which', 'unsure', 'investigate'];
const REVIEW_KEYWORDS = ['audit', 'review', 'critique', 'find risks', 'find bugs', 'security review', 'assess', 'what could go wrong', 'red team'];
const FULL_KEYWORDS = ['idea to production', 'ship it all', 'end to end', 'end-to-end', 'full arc', 'god mode', 'build the whole', 'whole thing', 'from scratch to launch', 'take it to production'];
const TRIVIAL_KEYWORDS = ['typo', 'rename', 'one-line', 'one line', 'quick question', 'what is', 'how do i', 'how do you', 'tweak', 'small fix', 'change the wording', 'bump the'];

function hasAny(text, keywords) {
  return keywords.some((kw) => text.includes(kw));
}

function classify(prompt) {
  const text = String(prompt || '').toLowerCase().trim();
  if (text === '') return 'continue';
  if (hasAny(text, CONTINUATION_KEYWORDS)) return 'continue';
  if (hasAny(text, INCIDENT_KEYWORDS)) return 'incident';
  if (hasAny(text, FULL_KEYWORDS)) return 'full';
  if (hasAny(text, BROWNFIELD_KEYWORDS)) return 'brownfield';
  if (hasAny(text, RESEARCH_KEYWORDS)) return 'research';
  if (hasAny(text, REVIEW_KEYWORDS)) return 'review';
  if (hasAny(text, TRIVIAL_KEYWORDS)) return 'trivial';
  return 'feature';
}

function latestVerdict(projectRoot) {
  const records = evidence.history({ projectRoot });
  for (let i = records.length - 1; i >= 0; i--) {
    const record = records[i];
    if (record && record.kind === 'executed') {
      return record.verified ? 'green' : 'red';
    }
  }
  return 'none';
}

function openFindings(projectRoot) {
  const findings = artifactMap.requiredArtifactsForTier('harden')[0].path;
  // Only treat findings as open when the file exists and carries a Critical or a
  // blocked launch gate. router.hasNoCriticalFindings is fail-closed (false when
  // the file is absent), so guard on existence to avoid false "red" on projects
  // that have not run harden yet.
  if (!syncFs.existsArtifact(projectRoot, findings)) return false;
  return !router.hasNoCriticalFindings(projectRoot);
}

function activeArc(projectRoot) {
  const state = stateStore.read(projectRoot);
  if (!state) return null;
  return state['active-arc'] || state.arc || state['lifecycle-phase'] || null;
}

function recipeCommand(prompt, projectRoot) {
  const matches = recipes.matchIntent(prompt, projectRoot);
  if (!matches.length || matches[0].score < 10) return null;
  const recipe = matches[0].recipe;
  const name = recipe['default-sequence'] || 'default';
  const steps = recipes.getSequence(recipe, name);
  const first = steps[0] && steps[0].command;
  return first ? String(first).split(/\s+/)[0] : null;
}

function play(route, reason, nextCommand, ceremony, verificationStrategy, ev) {
  return {
    route,
    reason,
    nextCommand,
    ceremony,
    verificationStrategy,
    chatPolicy: 'stay in this chat as executor',
    mutatesState: false,
    evidence: ev
  };
}

/**
 * Decide the entry play for a prompt. First match wins down the priority ladder.
 *
 * @param {string} prompt Free-text user intent (may be empty).
 * @param {{ projectRoot?: string }} [opts]
 * @returns {Play}
 */
function route(prompt, opts = {}) {
  const projectRoot = path.resolve(opts.projectRoot || process.cwd());
  const ev = {
    classification: classify(prompt),
    latestVerdict: latestVerdict(projectRoot),
    activeArc: activeArc(projectRoot),
    openFindings: openFindings(projectRoot)
  };
  const next = router.suggestNext(projectRoot);
  const initialized = stateStore.isInitialized(projectRoot);

  // [10] recover: refuse-on-red. Never start new work on a red check.
  if (ev.latestVerdict === 'red') {
    return play('recover', 'Latest executed verification is red; debug and re-verify before new work.',
      '/god-debug', 'focused', 'executed-where-gated', ev);
  }
  if (ev.openFindings) {
    return play('recover', 'Harden findings carry an unresolved Critical or a blocked launch gate; resolve before new work.',
      '/god-debug', 'focused', 'executed-where-gated', ev);
  }

  // [20] resume: an active arc with non-done substeps plus continuation intent.
  const hasOpenArc = initialized && next && next.command && next.command !== '/god-init'
    && next.tier !== 'steady-state';
  if (hasOpenArc && ev.classification === 'continue') {
    return play('resume', `Active arc has open work: ${next.reason}.`,
      next.command, 'inherit', 'executed-where-gated', ev);
  }

  // [30]-[90]: classification-based new work. Delegate to recipes/router.
  switch (ev.classification) {
    case 'incident':
      return play('recovery', 'Incident, hotfix, or postmortem intent.',
        recipeCommand(prompt, projectRoot) || '/god-hotfix', 'focused', 'executed-where-gated', ev);
    case 'brownfield':
      return play('brownfield', 'Inheriting or understanding existing code.',
        recipeCommand(prompt, projectRoot) || '/god-archaeology', 'full', 'artifact+attested', ev);
    case 'research':
      return play('research', 'Uncertain technology; time-box a spike or exploration.',
        recipeCommand(prompt, projectRoot) || '/god-spike', 'light', 'artifact+attested', ev);
    case 'review':
      return play('review', 'Find risks, critique, or audit; no new feature work.',
        recipeCommand(prompt, projectRoot) || '/god-review', 'light', 'artifact+attested', ev);
    case 'full':
      return play('full', 'Idea-to-production request; run the full arc.',
        '/god-mode', 'full', 'executed-where-gated', ev);
    case 'trivial':
      return play('trivial', 'Single reversible edit or question; do not open an arc.',
        '/god-fast', 'none', 'none', ev);
    case 'continue':
      // Continuation intent but no open arc: point at the structural next step.
      return play('resume', next && next.reason ? next.reason : 'Continue from current state.',
        next ? next.command : '/god-init', initialized ? 'inherit' : 'full', 'executed-where-gated', ev);
    default:
      return play('feature', 'Ordinary multi-step feature.',
        recipeCommand(prompt, projectRoot) || '/god-feature', 'full', 'executed-where-gated', ev);
  }
}

module.exports = {
  route,
  classify,
  // Internals exposed for tests.
  _latestVerdict: latestVerdict,
  _openFindings: openFindings,
  _activeArc: activeArc
};
