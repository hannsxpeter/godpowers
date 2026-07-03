#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const quarterback = require('../lib/quarterback');
const evidence = require('../lib/evidence');
const state = require('../lib/state');
const { test, assert, mkProject, writeRel, report } = require('./test-harness');

function initProject(prefix) {
  const project = mkProject(prefix);
  state.init(project, prefix.replace(/[^a-z0-9]+/gi, '-'));
  return project;
}

// ---------------------------------------------------------------------------
// classify
// ---------------------------------------------------------------------------

test('classify buckets prompts by intent', () => {
  assert(quarterback.classify('') === 'continue', 'empty -> continue');
  assert(quarterback.classify('continue where we left off') === 'continue', 'continuation');
  assert(quarterback.classify('production outage, need a hotfix') === 'incident', 'incident');
  assert(quarterback.classify('take this idea to production') === 'full', 'full');
  assert(quarterback.classify('I inherited this legacy codebase') === 'brownfield', 'brownfield');
  assert(quarterback.classify('spike on which database to use') === 'research', 'research');
  assert(quarterback.classify('audit this for security risks') === 'review', 'review');
  assert(quarterback.classify('fix a typo in the header') === 'trivial', 'trivial');
  assert(quarterback.classify('add user profiles with avatars') === 'feature', 'feature default');
});

// ---------------------------------------------------------------------------
// [10] refuse-on-red
// ---------------------------------------------------------------------------

test('route refuses on a red latest verdict', () => {
  const project = initProject('godpowers-qb-red-');
  evidence.verify('false', { substep: 'tier-2.build', projectRoot: project });
  const play = quarterback.route('add a new feature', { projectRoot: project });
  assert(play.route === 'recover', `route: ${play.route}`);
  assert(play.nextCommand === '/god-debug', `next: ${play.nextCommand}`);
  assert(play.evidence.latestVerdict === 'red', `verdict: ${play.evidence.latestVerdict}`);
  assert(play.mutatesState === false, 'must not mutate state');
});

test('route refuses on unresolved Critical harden findings', () => {
  const project = initProject('godpowers-qb-findings-');
  writeRel(project, '.godpowers/harden/FINDINGS.mdx', [
    '# Security Findings',
    '',
    '| Severity | Count |',
    '|---|---:|',
    '| Critical | 1 |',
    '',
    '[DECISION] Launch gate: BLOCKED.',
    '',
    '### [CRITICAL-001] Auth bypass',
    '- [DECISION] Status: Open.'
  ].join('\n'));
  const play = quarterback.route('start the next feature', { projectRoot: project });
  assert(play.route === 'recover', `route: ${play.route}`);
  assert(play.evidence.openFindings === true, 'open findings should be detected');
});

test('a clean green verdict does not trigger recover', () => {
  const project = initProject('godpowers-qb-green-');
  evidence.verify('true', { substep: 'tier-2.build', projectRoot: project });
  const play = quarterback.route('add a new feature', { projectRoot: project });
  assert(play.route !== 'recover', `should not recover on green: ${play.route}`);
  assert(play.evidence.latestVerdict === 'green', `verdict: ${play.evidence.latestVerdict}`);
});

test('absent harden findings do not count as open (no false red)', () => {
  const project = initProject('godpowers-qb-nofindings-');
  assert(quarterback._openFindings(project) === false, 'missing FINDINGS.md must not be open');
});

// ---------------------------------------------------------------------------
// [20] resume
// ---------------------------------------------------------------------------

test('route resumes an open arc on continuation intent', () => {
  const project = initProject('godpowers-qb-resume-');
  const play = quarterback.route('continue', { projectRoot: project });
  assert(play.route === 'resume', `route: ${play.route}`);
  assert(play.nextCommand === '/god-prd', `next: ${play.nextCommand}`);
  assert(play.ceremony === 'inherit', `ceremony: ${play.ceremony}`);
});

// ---------------------------------------------------------------------------
// [30]-[90] classification-based routes
// ---------------------------------------------------------------------------

test('route maps incident intent to recovery', () => {
  const project = initProject('godpowers-qb-incident-');
  const play = quarterback.route('production outage, need a hotfix now', { projectRoot: project });
  assert(play.route === 'recovery', `route: ${play.route}`);
  assert(play.ceremony === 'focused', `ceremony: ${play.ceremony}`);
});

test('route maps research intent to a light spike', () => {
  const project = initProject('godpowers-qb-research-');
  const play = quarterback.route('spike on which database to use', { projectRoot: project });
  assert(play.route === 'research', `route: ${play.route}`);
  assert(play.ceremony === 'light', `ceremony: ${play.ceremony}`);
});

test('route maps review intent to a light audit', () => {
  const project = initProject('godpowers-qb-review-');
  const play = quarterback.route('audit this for security risks', { projectRoot: project });
  assert(play.route === 'review', `route: ${play.route}`);
  // This prompt matches no recipe, so nextCommand is the hardcoded fallback.
  // Guard against phantom commands: the fallback must be a shipped skill.
  assert(play.nextCommand === '/god-review', `next: ${play.nextCommand}`);
  const skillFile = path.join(__dirname, '..', 'skills', `${play.nextCommand.slice(1)}.md`);
  assert(fs.existsSync(skillFile), `fallback skill file missing: ${skillFile}`);
});

test('route maps idea-to-production to the full arc', () => {
  const project = initProject('godpowers-qb-full-');
  const play = quarterback.route('take this idea to production', { projectRoot: project });
  assert(play.route === 'full', `route: ${play.route}`);
  assert(play.nextCommand === '/god-mode', `next: ${play.nextCommand}`);
});

test('route maps a one-line fix to trivial with no ceremony', () => {
  const project = initProject('godpowers-qb-trivial-');
  const play = quarterback.route('fix a typo in the header', { projectRoot: project });
  assert(play.route === 'trivial', `route: ${play.route}`);
  assert(play.nextCommand === '/god-fast', `next: ${play.nextCommand}`);
  assert(play.ceremony === 'none', `ceremony: ${play.ceremony}`);
  assert(play.verificationStrategy === 'none', `verification: ${play.verificationStrategy}`);
});

test('route maps an ordinary multi-step ask to feature', () => {
  const project = initProject('godpowers-qb-feature-');
  const play = quarterback.route('add user profiles with avatars and bios', { projectRoot: project });
  assert(play.route === 'feature', `route: ${play.route}`);
  assert(play.chatPolicy === 'stay in this chat as executor', 'chat policy missing');
});

test('route is read-only and reports an evidence block', () => {
  const project = initProject('godpowers-qb-shape-');
  const before = JSON.stringify(state.read(project));
  const play = quarterback.route('add a feature', { projectRoot: project });
  const after = JSON.stringify(state.read(project));
  assert(before === after, 'route must not mutate state.json');
  assert(play.evidence && 'classification' in play.evidence && 'latestVerdict' in play.evidence
    && 'activeArc' in play.evidence && 'openFindings' in play.evidence, 'evidence block incomplete');
});

test('route handles an uninitialized project without throwing', () => {
  const project = mkProject('godpowers-qb-nostate-');
  const play = quarterback.route('add a feature', { projectRoot: project });
  assert(play && typeof play.route === 'string', 'should still return a play');
  assert(play.evidence.latestVerdict === 'none', 'no ledger -> none');
});

report('Quarterback tests');
