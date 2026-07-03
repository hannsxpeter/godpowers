#!/usr/bin/env node
/**
 * Behavioral tests for lib/dashboard.js.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');

const dashboard = require('../lib/dashboard');
const state = require('../lib/state');
const { test, assert, mkProject, writeRel, report } = require('./test-harness');

console.log('\n  Dashboard engine behavioral tests\n');

test('compute reports not initialized and suggests /god-init', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-dashboard-empty-'));
  const result = dashboard.compute(tmp, { git: false });
  assert(result.state === 'not initialized', `state: ${result.state}`);
  assert(result.next.command === '/god-init', `next: ${result.next.command}`);
  assert(result.planning.prd.status === 'missing', `prd: ${result.planning.prd.status}`);
  assert(result.openItems.includes('No .godpowers/state.json found'), 'missing open item');
  assert(result.proactive.repoSurface === 'not-applicable',
    `repo surface: ${result.proactive.repoSurface}`);
  assert(result.proactive.docs === 'not-applicable', `docs: ${result.proactive.docs}`);
  assert(result.proactive.sync === 'not-applicable', `sync: ${result.proactive.sync}`);
  assert(result.actionBrief.recommended === '/god-init', `brief: ${result.actionBrief.recommended}`);
  assert(result.actionBrief.blockers.every((blocker) => /^Host:/.test(blocker)),
    `blockers: ${result.actionBrief.blockers.join('; ')}`);
  const rendered = dashboard.render(result);
  assert(rendered.includes('Godpowers Dashboard'), 'render missing title');
  assert(rendered.includes('Source: runtime dashboard (lib/dashboard.js)'), 'render missing source');
  assert(rendered.includes('Action brief:'), 'render missing action brief');
  assert(rendered.includes('Recommended: /god-init'), 'render missing init route');
});

test('render uses human-readable tier counts', () => {
  const tmp = mkProject();
  state.init(tmp, 'tier-demo');
  const result = dashboard.compute(tmp, { git: false });
  const rendered = dashboard.render(result);
  assert(rendered.includes('tier 1 of 4'), `rendered: ${rendered}`);
  assert(rendered.includes('internal tier-0'), `rendered: ${rendered}`);
});

test('compute reports progress and planning visibility from disk', () => {
  const tmp = mkProject();
  state.init(tmp, 'demo');
  state.updateSubStep(tmp, 'tier-0', 'orchestration', { status: 'done' });
  state.updateSubStep(tmp, 'tier-1', 'prd', { status: 'done', artifact: 'prd/PRD.mdx' });
  writeRel(tmp, '.godpowers/prd/PRD.mdx', '# PRD\n');
  writeRel(tmp, '.godpowers/CHECKPOINT.mdx', '# Checkpoint\n');
  writeRel(tmp, '.godpowers/SYNC-LOG.mdx', '# Sync Log\n');

  const result = dashboard.compute(tmp, { git: false });
  assert(result.state === 'in progress', `state: ${result.state}`);
  assert(result.progress.percent === 15, `percent: ${result.progress.percent}`);
  assert(result.current.phase === 'Planning', `phase: ${result.current.phase}`);
  assert(result.current.stepLabel === 'Architecture', `step: ${result.current.stepLabel}`);
  assert(result.planning.prd.status === 'done', `prd: ${result.planning.prd.status}`);
  assert(result.planning.roadmap.status === 'missing',
    `roadmap: ${result.planning.roadmap.status}`);
  assert(result.next.command === '/god-arch', `next: ${result.next.command}`);
  assert(result.actionBrief.recommended === '/god-arch', `brief: ${result.actionBrief.recommended}`);
  assert(result.proactive.checkpoint === 'fresh',
    `checkpoint: ${result.proactive.checkpoint}`);
  assert(result.proactive.sync === 'fresh', `sync: ${result.proactive.sync}`);
});

test('non-Godpowers projects do not show maintainer repo drift', () => {
  const tmp = mkProject();
  state.init(tmp, 'user-project');
  writeRel(tmp, 'package.json', JSON.stringify({ name: 'user-project' }, null, 2));
  const result = dashboard.compute(tmp, { git: false });
  assert(result.proactive.repoSurface === 'not-applicable',
    `repo surface: ${result.proactive.repoSurface}`);
  assert(result.proactive.docs === 'not-applicable', `docs: ${result.proactive.docs}`);
  assert(!result.actionBrief.blockers.some((blocker) => /^Repo surface:/.test(blocker)),
    `blockers: ${result.actionBrief.blockers.join('; ')}`);
  assert(!result.actionBrief.blockers.some((blocker) => /^Docs:/.test(blocker)),
    `blockers: ${result.actionBrief.blockers.join('; ')}`);
  assert(result.actionBrief.blockers.every((blocker) => /^Host:/.test(blocker)),
    `blockers: ${result.actionBrief.blockers.join('; ')}`);
});

test('render includes current status, proactive checks, and next route', () => {
  const tmp = mkProject();
  state.init(tmp, 'render-demo');
  const result = dashboard.compute(tmp, { git: false });
  const rendered = dashboard.render(result);
  assert(rendered.includes('Current status:'), 'missing current status');
  assert(rendered.includes('Progress: 0% workflow progress'), `rendered: ${rendered}`);
  assert(rendered.includes('Planning visibility:'), 'missing planning visibility');
  assert(rendered.includes('Completion basis: .godpowers/state.json workflow steps'), `rendered: ${rendered}`);
  assert(rendered.includes('Proactive checks:'), 'missing proactive checks');
  assert(rendered.includes('Action brief:'), 'missing action brief');
  assert(rendered.includes('Recommended: /god-prd'), `rendered: ${rendered}`);
});

test('action brief compresses blockers without hiding next route', () => {
  const result = {
    next: { command: '/god-sync', reason: 'Close out changed artifacts' },
    proactive: {
      repoSurface: 'fresh',
      docs: '2 stale, suggest /god-docs',
      reviews: 'none',
      sync: 'missing, suggest /god-sync',
      security: 'clear',
      dependencies: 'dependency files changed, suggest /god-update-deps',
      hygiene: 'stale, suggest /god-hygiene'
    }
  };
  const brief = dashboard.actionBrief(result);
  assert(brief.recommended === '/god-sync', `recommended: ${brief.recommended}`);
  assert(brief.confidence === 'needs attention', `confidence: ${brief.confidence}`);
  assert(brief.blockers.length === 3, `blockers: ${brief.blockers.length}`);
  assert(brief.overflow === 0, `overflow: ${brief.overflow}`);
  assert(!brief.blockers.some((blocker) => /^Hygiene:/.test(blocker)),
    `blockers: ${brief.blockers.join('; ')}`);
});

test('action brief does not let routine maintenance compete with planning next step', () => {
  const result = {
    next: { command: '/god-prd', reason: 'PRD pending' },
    proactive: {
      repoSurface: 'not-applicable',
      docs: 'not-applicable',
      reviews: 'none',
      sync: 'missing, suggest /god-sync',
      security: 'clear',
      dependencies: 'clear',
      hygiene: 'stale, suggest /god-hygiene'
    }
  };
  const brief = dashboard.actionBrief(result);
  assert(brief.recommended === '/god-prd', `recommended: ${brief.recommended}`);
  assert(brief.confidence === 'ready', `confidence: ${brief.confidence}`);
  assert(brief.blockers.length === 0, `blockers: ${brief.blockers.join('; ')}`);
});

test('pending review file becomes proactive review suggestion', () => {
  const tmp = mkProject();
  state.init(tmp, 'review-demo');
  writeRel(tmp, '.godpowers/REVIEW-REQUIRED.mdx',
    '# Review Required\n\n### P1 Missing test\n\n- [ ] REVIEW: add coverage\n');
  const result = dashboard.compute(tmp, { git: false });
  assert(/pending/.test(result.proactive.reviews), `reviews: ${result.proactive.reviews}`);
  assert(result.openItems.includes('pending review items'), 'missing review open item');
});

test('parseGitStatus preserves leading-space porcelain entries', () => {
  const parsed = dashboard.parseGitStatus(' M README.md\n?? lib/dashboard.js\n');
  assert(parsed.worktree === 'modified files unstaged', `worktree: ${parsed.worktree}`);
  assert(parsed.index === 'untouched', `index: ${parsed.index}`);
  assert(parsed.entries[0] === ' M README.md', `entry: ${parsed.entries[0]}`);
});

test('parseGitStatus reports staged paths without clipping filenames', () => {
  const parsed = dashboard.parseGitStatus('M  README.md\n M package.json\n');
  assert(parsed.worktree === 'mixed', `worktree: ${parsed.worktree}`);
  assert(parsed.index === 'README.md', `index: ${parsed.index}`);
});

test('CLI status renders the dashboard for a project', () => {
  const tmp = mkProject();
  state.init(tmp, 'cli-status-demo');
  const out = cp.execFileSync(process.execPath,
    [path.join(__dirname, '..', 'bin', 'install.js'), 'status', '--project', tmp],
    { encoding: 'utf8' });
  assert(out.includes('Godpowers Dashboard'), `output: ${out}`);
  assert(out.includes('Recommended: /god-prd'), `output: ${out}`);
});

test('CLI next can emit JSON with the recommended route', () => {
  const tmp = mkProject();
  state.init(tmp, 'cli-next-demo');
  const out = cp.execFileSync(process.execPath,
    [path.join(__dirname, '..', 'bin', 'install.js'), 'next', '--project', tmp, '--json'],
    { encoding: 'utf8' });
  const parsed = JSON.parse(out);
  assert(parsed.next.command === '/god-prd', `next: ${parsed.next.command}`);
  assert(parsed.progress.total === 13, `total: ${parsed.progress.total}`);
});

report('Dashboard engine behavioral tests');
