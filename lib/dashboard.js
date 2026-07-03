/**
 * Godpowers Dashboard
 *
 * Shared executable status engine for /god-status, /god-next, /god-sync,
 * /god-scan, and /god-mode closeouts. Disk state is authoritative.
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const state = require('./state');
const requirements = require('./requirements');
const router = require('./router');
const automationProviders = require('./automation-providers');
const repoDocSync = require('./repo-doc-sync');
const repoSurfaceSync = require('./repo-surface-sync');
const hostCapabilities = require('./host-capabilities');
const artifactMap = require('./artifact-map');
const {
  exists,
  resolveArtifact,
  existsArtifact,
  readArtifact
} = require('./sync-fs');

const GOD_DIR = '.godpowers';
const PRD_PATH = artifactMap.requiredArtifactsForTier('prd')[0].path;
const ROADMAP_PATH = artifactMap.requiredArtifactsForTier('roadmap')[0].path;
const CHECKPOINT_PATH = '.godpowers/CHECKPOINT.mdx';
const SYNC_LOG_PATH = '.godpowers/SYNC-LOG.mdx';
const REVIEW_PATH = '.godpowers/REVIEW-REQUIRED.mdx';

function mtimeMs(projectRoot, relPath) {
  const file = path.join(projectRoot, resolveArtifact(projectRoot, relPath));
  if (!fs.existsSync(file)) return null;
  return fs.statSync(file).mtimeMs;
}

function artifactStatus(projectRoot, relPath) {
  return existsArtifact(projectRoot, relPath) ? 'done' : 'missing';
}

function currentPhase(progress) {
  const current = progress && progress.current;
  if (!current) {
    return {
      phase: 'Complete',
      tierKey: null,
      tierNumber: null,
      tierTotal: 0,
      tierOrdinal: 0,
      tierCount: 0,
      tierLabel: 'Complete',
      stepLabel: 'Complete',
      stepNumber: 0,
      totalSteps: progress ? progress.total : 0
    };
  }

  const tierNumbers = (progress.tiers || [])
    .map(tier => tier.tierNumber)
    .filter(n => Number.isFinite(n))
    .sort((a, b) => a - b);
  const tierTotal = tierNumbers.length > 0 ? Math.max(...tierNumbers) : current.tierNumber;
  const tierOrdinal = tierNumbers.indexOf(current.tierNumber) + 1;
  const tierCount = tierNumbers.length || (Number.isFinite(current.tierNumber) ? current.tierNumber + 1 : 0);

  return {
    phase: current.tierLabel,
    tierKey: current.tierKey,
    tierNumber: current.tierNumber,
    tierTotal,
    tierOrdinal: tierOrdinal > 0 ? tierOrdinal : 1,
    tierCount,
    tierLabel: current.tierLabel,
    stepLabel: current.subStepLabel,
    stepNumber: current.ordinal,
    totalSteps: progress.total
  };
}

function worktree(projectRoot) {
  try {
    const out = cp.execFileSync('git', ['status', '--porcelain'], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return parseGitStatus(out);
  } catch (e) {
    return { worktree: 'unknown', index: 'unknown', entries: [] };
  }
}

function parseGitStatus(out) {
  if (!out || !out.trim()) {
    return { worktree: 'clean', index: 'untouched', entries: [] };
  }
  const entries = out.split(/\r?\n/).filter(Boolean);
  const staged = entries.filter(line => line[0] !== ' ' && line[0] !== '?');
  const unstaged = entries.filter(line => line[1] !== ' ' || line.startsWith('??'));
  let worktreeState = 'modified files unstaged';
  if (staged.length > 0 && unstaged.length > 0) worktreeState = 'mixed';
  else if (staged.length > 0) worktreeState = 'staged changes';
  return {
    worktree: worktreeState,
    index: staged.length > 0 ? staged.map(statusPath).join(', ') : 'untouched',
    entries
  };
}

function statusPath(line) {
  if (line.startsWith('?? ')) return line.slice(3);
  return line.length > 3 ? line.slice(3) : line.trim();
}

function reviewCount(projectRoot) {
  const text = readArtifact(projectRoot, REVIEW_PATH);
  if (!text.trim()) return 0;
  const unchecked = (text.match(/\[\s\]\s*(?:TODO|PENDING|OPEN|REVIEW|BLOCKER|[Pp][0-3])/g) || []).length;
  if (unchecked > 0) return unchecked;
  const headings = (text.match(/^###\s+/gm) || []).length;
  return headings;
}

function hasRecentPath(projectRoot, relPath, maxAgeMs) {
  const modified = mtimeMs(projectRoot, relPath);
  if (!modified) return false;
  return Date.now() - modified <= maxAgeMs;
}

function isGodpowersRuntimeRepo(projectRoot) {
  try {
    const pkgPath = path.join(projectRoot, 'package.json');
    if (!fs.existsSync(pkgPath)) return false;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkg.name === 'godpowers'
      && exists(projectRoot, 'skills')
      && exists(projectRoot, 'routing')
      && exists(projectRoot, 'agents');
  } catch (e) {
    return false;
  }
}

function proactiveChecks(projectRoot, changedFiles = [], opts = {}) {
  const oneDay = 24 * 60 * 60 * 1000;
  const thirtyDays = 30 * oneDay;
  const initialized = opts.initialized !== false;
  const runtimeRepo = opts.runtimeRepo !== undefined
    ? opts.runtimeRepo
    : isGodpowersRuntimeRepo(projectRoot);
  const reviews = reviewCount(projectRoot);

  const checkpoint = initialized
    ? (existsArtifact(projectRoot, CHECKPOINT_PATH)
        ? (hasRecentPath(projectRoot, CHECKPOINT_PATH, oneDay) ? 'fresh' : 'stale')
        : 'missing')
    : 'not-applicable';

  const sync = initialized
    ? (existsArtifact(projectRoot, SYNC_LOG_PATH)
        ? (hasRecentPath(projectRoot, SYNC_LOG_PATH, oneDay) ? 'fresh' : 'stale, suggest /god-sync')
        : 'missing, suggest /god-sync')
    : 'not-applicable';

  const hygieneFresh = initialized
    && existsArtifact(projectRoot, CHECKPOINT_PATH)
    && hasRecentPath(projectRoot, CHECKPOINT_PATH, thirtyDays);

  const pkgChanged = changedFiles.some(file => [
    'package.json',
    'package-lock.json',
    'pnpm-lock.yaml',
    'yarn.lock'
  ].includes(file));
  const sensitiveChanged = changedFiles.some(file => matchesAnyPrefix(file, [
    '.env.example',
    'SECURITY.md',
    '.github/workflows',
    'auth',
    'security'
  ]));
  const repoDocsStatus = runtimeRepo
    ? (() => {
        const repoDocs = repoDocSync.detect(projectRoot, { changedFiles });
        return repoDocs.status === 'fresh'
          ? 'fresh'
          : `${repoDocs.stale.length} stale, suggest /god-docs`;
      })()
    : 'not-applicable';
  const repoSurfaceStatus = runtimeRepo
    ? (() => {
        const repoSurface = repoSurfaceSync.detect(projectRoot);
        return repoSurface.status === 'fresh'
          ? 'fresh'
          : `${repoSurface.stale.length} stale, suggest /god-doctor`;
      })()
    : 'not-applicable';
  const host = hostCapabilities.detect(projectRoot);

  return {
    checkpoint,
    reviews: reviews > 0 ? `${reviews} pending, suggest /god-review-changes` : 'none',
    sync,
    docs: repoDocsStatus,
    repoSurface: repoSurfaceStatus,
    host: hostCapabilities.summary(host),
    runtime: 'not-applicable',
    automation: automationSummary(projectRoot),
    security: sensitiveChanged ? 'sensitive files changed, suggest /god-harden' : 'clear',
    dependencies: pkgChanged ? 'dependency files changed, suggest /god-update-deps' : 'clear',
    hygiene: initialized ? (hygieneFresh ? 'fresh' : 'stale, suggest /god-hygiene') : 'not-applicable'
  };
}

function automationSummary(projectRoot) {
  const report = automationProviders.detect(projectRoot);
  if (report.active.length > 0) {
    return `${report.active.length} active`;
  }
  if (report.recommendedProvider) {
    return `available via ${report.recommendedProvider.id}, suggest /god-automation-setup`;
  }
  return 'not configured';
}

function matchesAnyPrefix(file, prefixes) {
  return prefixes.some(prefix => file === prefix || file.startsWith(`${prefix}/`));
}

function planningVisibility(projectRoot, progress) {
  const prd = artifactStatus(projectRoot, PRD_PATH);
  const roadmap = artifactStatus(projectRoot, ROADMAP_PATH);
  const phase = currentPhase(progress);
  return {
    prd: { status: prd, path: prd === 'done' ? resolveArtifact(projectRoot, PRD_PATH) : null },
    roadmap: { status: roadmap, path: roadmap === 'done' ? resolveArtifact(projectRoot, ROADMAP_PATH) : null },
    currentMilestone: phase.stepLabel ? `${phase.phase} / ${phase.stepLabel}` : phase.phase,
    completion: `${progress.percent}% workflow progress from .godpowers/state.json tracked steps`,
    completionBasis: '.godpowers/state.json workflow steps'
  };
}

function compute(projectRoot, opts = {}) {
  const s = state.read(projectRoot);
  const git = opts.git === false ? { worktree: 'not-checked', index: 'not-checked', entries: [] } : worktree(projectRoot);

  if (!s) {
    const next = { command: '/god-init', reason: 'No Godpowers project initialized' };
    const result = {
      source: 'runtime dashboard (lib/dashboard.js)',
      state: 'not initialized',
      mode: null,
      lifecycle: 'pre-init',
      progress: { percent: 0, completed: 0, total: 0, currentStep: 0, current: null, tiers: [] },
      current: currentPhase(null),
      worktree: git.worktree,
      index: git.index,
      planning: {
        prd: { status: 'missing', path: null },
        roadmap: { status: 'missing', path: null },
        currentMilestone: 'Project initialization',
        completion: '0% workflow progress because .godpowers/state.json is missing',
        completionBasis: 'missing .godpowers/state.json'
      },
      proactive: proactiveChecks(projectRoot, git.entries.map(statusPath), { initialized: false }),
      host: hostCapabilities.detect(projectRoot, opts.host || {}),
      next,
      deliverables: { hasRequirements: false },
      openItems: ['No .godpowers/state.json found']
    };
    result.actionBrief = actionBrief(result);
    return result;
  }

  const progress = state.progressSummary(s);
  const current = currentPhase(progress);
  const next = router.suggestNext(projectRoot);
  const openItems = [];
  const drift = state.detectDrift(projectRoot);

  const buildSub = s.tiers && s.tiers['tier-2'] && s.tiers['tier-2'].build;
  const deliverables = requirements.derive(projectRoot, {
    buildComplete: Boolean(buildSub && state.isCompleteStatus(buildSub.status))
  });
  if (deliverables.gaps.length > 0) {
    openItems.push(`${deliverables.gaps.length} requirement(s) in a done increment with no linked code, see ${requirements.LEDGER_PATH}`);
  }

  if (drift.length > 0) openItems.push(`${drift.length} artifact drift item(s), suggest /god-repair`);
  if (next && next.blocker) openItems.push(`${next.blocker} blocks next route`);
  if (reviewCount(projectRoot) > 0) openItems.push('pending review items');
  if (openItems.length === 0) openItems.push('none');

  const result = {
    source: 'runtime dashboard (lib/dashboard.js)',
    state: progress.remaining === 0 ? 'complete' : 'in progress',
    mode: s.mode || s['mode-announced-as'] || null,
    lifecycle: s['lifecycle-phase'] || 'in-arc',
    progress,
    current,
    worktree: git.worktree,
    index: git.index,
    planning: planningVisibility(projectRoot, progress),
    proactive: proactiveChecks(projectRoot, git.entries.map(statusPath), { initialized: true }),
    host: hostCapabilities.detect(projectRoot, opts.host || {}),
    next,
    deliverables,
    openItems
  };
  result.actionBrief = actionBrief(result);
  return result;
}

function actionBrief(dashboard) {
  const proactive = dashboard.proactive || {};
  const next = dashboard.next || {};
  const recommended = next.command || 'describe the next intent';
  const blockers = [];
  for (const [label, value] of [
    ['Repo surface', proactive.repoSurface],
    ['Docs', proactive.docs],
    ['Host', proactive.host],
    ['Reviews', proactive.reviews],
    ['Sync', proactive.sync],
    ['Security', proactive.security],
    ['Dependencies', proactive.dependencies],
    ['Hygiene', proactive.hygiene]
  ]) {
    if (!value) continue;
    if (value === 'fresh' || value === 'none' || value === 'clear' || value === 'not-applicable') continue;
    if (/^full on /.test(value)) continue;
    if (/^available via /.test(value)) continue;
    if (label === 'Sync' && recommended !== '/god-sync') continue;
    if (label === 'Hygiene' && recommended !== '/god-hygiene') continue;
    blockers.push(`${label}: ${value}`);
  }

  return {
    recommended,
    reason: next.reason || 'No route was computed.',
    confidence: blockers.length === 0 ? 'ready' : 'needs attention',
    blockers: blockers.slice(0, 3),
    overflow: Math.max(0, blockers.length - 3)
  };
}

function render(dashboard, opts = {}) {
  const current = dashboard.current || {};
  const planning = dashboard.planning || {};
  const proactive = dashboard.proactive || {};
  const next = dashboard.next || {};
  const progress = dashboard.progress || {};
  const prd = planning.prd || {};
  const roadmap = planning.roadmap || {};
  const deliverables = dashboard.deliverables || { hasRequirements: false };
  const deliverableLines = requirements.renderProgressLines(deliverables);
  const deliverableBrief = deliverables.hasRequirements
    ? `  Requirements: ${requirements.progressBar(deliverables.summary.done, deliverables.summary.total)} done (${deliverables.summary.percent}%)`
    : null;
  const openItems = dashboard.openItems && dashboard.openItems.length > 0
    ? dashboard.openItems
    : ['none'];
  const brief = dashboard.actionBrief || actionBrief(dashboard);
  if (opts.mode === 'brief' || opts.brief === true) {
    return [
      'Godpowers Dashboard',
      '',
      'Action brief:',
      `  Next: ${brief.recommended}`,
      `  Why: ${brief.reason}`,
      `  Readiness: ${brief.confidence === 'ready' ? 'no blockers' : brief.confidence}`,
      `  Attention: ${brief.blockers && brief.blockers.length > 0 ? brief.blockers.join('; ') : 'none'}${brief.overflow ? `; ${brief.overflow} more` : ''}`,
      `  Host guarantees: ${dashboard.host ? hostCapabilities.summary(dashboard.host) : proactive.host || 'unknown'}`,
      '',
      'Current status:',
      `  State: ${dashboard.state}`,
      `  Progress: ${progress.percent || 0}% workflow progress (${progress.completed || 0} of ${progress.total || 0} tracked steps complete${progress.skipped ? `, ${progress.skipped} skipped` : ''})`,
      ...(deliverableBrief ? [deliverableBrief] : []),
      '',
      'Next:',
      `  Recommended: ${next.command || 'describe the next intent'}`,
      `  Why: ${next.reason || 'No route was computed.'}`
    ].join('\n');
  }

  return [
    'Godpowers Dashboard',
    '',
    `Source: ${dashboard.source || 'manual disk scan'}`,
    '',
    'Current status:',
    `  State: ${dashboard.state}`,
    `  Phase: ${dashboard.state === 'not initialized' ? 'not initialized' : (current.phase || 'unknown')}${dashboard.state !== 'not initialized' && current.tierNumber !== null && current.tierNumber !== undefined ? ` (tier ${current.tierOrdinal} of ${current.tierCount}, internal ${current.tierKey || `tier-${current.tierNumber}`})` : ''}`,
    `  Step: ${dashboard.state === 'not initialized' ? 'not initialized' : (current.stepLabel || 'unknown')}${dashboard.state !== 'not initialized' && current.stepNumber ? ` (step ${current.stepNumber} of ${current.totalSteps})` : ''}`,
    `  Progress: ${progress.percent || 0}% workflow progress (${progress.completed || 0} of ${progress.total || 0} tracked steps complete${progress.skipped ? `, ${progress.skipped} skipped` : ''})`,
    `  Worktree: ${dashboard.worktree}`,
    `  Index: ${dashboard.index}`,
    '',
    'Action brief:',
    `  Next: ${brief.recommended}`,
    `  Why: ${brief.reason}`,
    `  Readiness: ${brief.confidence}`,
    `  Attention: ${brief.blockers && brief.blockers.length > 0 ? brief.blockers.join('; ') : 'none'}${brief.overflow ? `; ${brief.overflow} more` : ''}`,
    `  Host guarantees: ${dashboard.host ? hostCapabilities.summary(dashboard.host) : proactive.host || 'unknown'}`,
    '',
    'Planning visibility:',
    `  PRD: ${prd.status || 'missing'}${prd.path ? ` ${prd.path}` : ''}`,
    `  Roadmap: ${roadmap.status || 'missing'}${roadmap.path ? ` ${roadmap.path}` : ''}`,
    `  Current milestone: ${planning.currentMilestone || 'unknown'}`,
    `  Completion basis: ${planning.completionBasis || planning.completion || 'unknown'}`,
    '',
    'Deliverable progress:',
    ...deliverableLines,
    '',
    'Proactive checks:',
    `  Checkpoint: ${proactive.checkpoint || 'unknown'}`,
    `  Reviews: ${proactive.reviews || 'unknown'}`,
    `  Sync: ${proactive.sync || 'unknown'}`,
    `  Docs: ${proactive.docs || 'unknown'}`,
    `  Repo surface: ${proactive.repoSurface || 'unknown'}`,
    `  Host: ${proactive.host || 'unknown'}`,
    `  Runtime: ${proactive.runtime || 'unknown'}`,
    `  Automation: ${proactive.automation || 'unknown'}`,
    `  Security: ${proactive.security || 'unknown'}`,
    `  Dependencies: ${proactive.dependencies || 'unknown'}`,
    `  Hygiene: ${proactive.hygiene || 'unknown'}`,
    '',
    'Open items:',
    ...openItems.map((item, index) => `  ${index + 1}. ${item}`),
    '',
    'Next:',
    `  Recommended: ${next.command || 'describe the next intent'}`,
    `  Why: ${next.reason || 'No route was computed.'}`
  ].join('\n');
}

module.exports = {
  compute,
  render,
  worktree,
  parseGitStatus,
  proactiveChecks,
  automationSummary,
  isGodpowersRuntimeRepo,
  actionBrief,
  planningVisibility
};
