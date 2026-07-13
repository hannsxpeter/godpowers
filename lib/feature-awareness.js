/**
 * Godpowers Feature Awareness
 *
 * Keeps existing Godpowers projects aware of capabilities added by newer
 * installed runtimes. This module is deliberately conservative: detect is
 * read-only, run applies only safe state and context refreshes, and ambiguous
 * migration cases are returned as spawn recommendations.
 */

const fs = require('fs');
const path = require('path');

const state = require('./state');
const contextWriter = require('./context-writer');
const planningSystems = require('./planning-systems');

const FEATURE_SET_VERSION = 1;

const FEATURES = [
  {
    id: 'planning-system-migration',
    since: '1.6.15',
    commands: ['/god-migrate', '/god-init'],
    description: 'Detect and import legacy planning, BMAD, and Superpowers planning artifacts.'
  },
  {
    id: 'source-system-sync-back',
    since: '1.6.15',
    commands: ['/god-sync', '/god-migrate'],
    description: 'Write managed Godpowers progress summaries back to detected source systems.'
  },
  {
    id: 'feature-awareness',
    since: '1.6.16',
    commands: ['/god-doctor', '/god-context', '/god-sync', '/god-mode'],
    description: 'Refresh existing Godpowers projects when the installed runtime gains new capabilities.'
  },
  {
    id: 'repo-documentation-sync',
    since: '1.6.17',
    commands: ['/god-sync', '/god-docs', '/god-doctor', '/god-status', '/god-mode'],
    description: 'Detect and refresh repository documentation surfaces, release docs, and Pillars planning signals.'
  },
  {
    id: 'repo-surface-sync',
    since: '1.6.19',
    commands: ['/god-sync', '/god-docs', '/god-doctor', '/god-status', '/god-mode'],
    description: 'Detect structural drift across routing, packages, agents, workflows, recipes, extensions, and release policy.'
  },
  {
    id: 'route-quality-sync',
    since: '1.6.19',
    commands: ['/god-sync', '/god-doctor', '/god-status', '/god-mode'],
    description: 'Detect symbolic route spawns, unresolved agent targets, and untyped contextual route exits.'
  },
  {
    id: 'recipe-coverage-sync',
    since: '1.6.19',
    commands: ['/god-sync', '/god-doctor', '/god-status', '/god-mode'],
    description: 'Detect missing intent recipes for release, docs, context refresh, story work, and automation setup.'
  },
  {
    id: 'release-surface-sync',
    since: '1.6.19',
    commands: ['/god-sync', '/god-docs', '/god-doctor', '/god-status', '/god-mode'],
    description: 'Detect release-facing drift across badges, release notes, changelog, package checks, and release checklist policy.'
  },
  {
    id: 'dogfood-runner',
    since: '1.6.22',
    commands: ['/god-dogfood'],
    description: 'Run messy-repo fixtures for migration, host guarantee, extension authoring, and suite release readiness.'
  },
  {
    id: 'dashboard-action-brief',
    since: '1.6.22',
    commands: ['/god-status', '/god-next', '/god-mode'],
    description: 'Render compressed action brief, readiness, attention, and host guarantee lines from disk state.'
  },
  {
    id: 'host-capabilities',
    since: '1.6.22',
    commands: ['/god-status', '/god-next'],
    description: 'Report full, degraded, or unknown host guarantees in dashboard output.'
  },
  {
    id: 'quick-proof',
    since: '2.0.0',
    commands: ['godpowers quick-proof'],
    description: 'Render a shipped proof fixture with computed next action and host guarantees.'
  },
  {
    id: 'request-trace-review',
    since: '2.0.1',
    commands: ['/god-build', '/god-review', '/god-feature', '/god-refactor'],
    description: 'Keep implementation diffs narrow by requiring request-trace evidence and reviewer checks for scope, simplicity, and surgicality.'
  },
  {
    id: 'release-hardening',
    since: '2.0.2',
    commands: ['npm test', 'npm run lint', 'npm run release:check'],
    description: 'Maintain release validation through a delegated test runner, static checks, parser coverage, and hardened package and runtime checks.'
  },
  {
    id: 'maintenance-hardening',
    since: '2.0.3',
    commands: ['npm test', 'npm run lint', 'npm run release:check'],
    description: 'Track installer decomposition, shared test harness adoption, executable agent refs, skill metadata sync, God Mode runbook delegation, and async runtime APIs.'
  },
  {
    id: 'extension-authoring',
    since: '1.6.22',
    commands: ['/god-extension-scaffold', '/god-test-extension', '/god-extension-add'],
    description: 'Scaffold and validate publishable Godpowers extension packs.'
  },
  {
    id: 'suite-release-dry-run',
    since: '1.6.22',
    commands: ['/god-suite-release'],
    description: 'Plan Mode D suite releases with impacted dependents and planned writes before mutation.'
  },
  {
    id: 'deliverable-progress-tracking',
    since: '2.2.0',
    commands: ['/god-progress', '/god-status', '/god-sync'],
    description: 'Track which PRD requirements and roadmap increments are done, in progress, or not started, derived from the linkage map and surfaced in the .godpowers/REQUIREMENTS.mdx ledger.'
  }
];

function packageVersion(projectRoot) {
  const candidates = [
    path.join(__dirname, '..', 'package.json'),
    path.join(projectRoot || process.cwd(), 'package.json')
  ];
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      if (parsed && parsed.name === 'godpowers' && parsed.version) return parsed.version;
    } catch (err) {
      // Ignore malformed package metadata. Awareness can still run with unknown.
    }
  }
  return 'unknown';
}

function expectedFeatureIds() {
  return FEATURES.map((feature) => feature.id);
}

function existingFeatureIds(current) {
  const record = current && current['godpowers-features'];
  return Array.isArray(record && record.known) ? record.known : [];
}

function missingFeatureIds(current) {
  const known = new Set(existingFeatureIds(current));
  return expectedFeatureIds().filter((id) => !known.has(id));
}

// Sibling superskill artifacts (.godplans/PLAN.mdx, .godaudits/AUDIT.json) are
// structured single files; importing them needs no migration judgment, so
// they never route to the low-confidence god-greenfieldifier spawn path.
const SIBLING_SYSTEM_IDS = new Set(['godplans', 'godaudits']);

function sourceSystemsNeedJudgment(current) {
  const systems = Array.isArray(current && current['source-systems'])
    ? current['source-systems']
    : [];
  return systems.filter((system) => {
    if (Number(system['conflict-count'] || 0) > 0) return true;
    return system.confidence === 'low' && !SIBLING_SYSTEM_IDS.has(system.id);
  });
}

function missingContextTargets(projectRoot) {
  const status = contextWriter.status(projectRoot);
  const missing = [];
  if (!status.canonical.hasFence) missing.push('AGENTS.md');
  for (const pointer of status.pointers) {
    if (!pointer.hasFence) {
      missing.push(path.relative(projectRoot, pointer.path).split(path.sep).join('/'));
    }
  }
  return missing;
}

function detect(projectRoot, opts = {}) {
  const current = state.read(projectRoot);
  const runtimeVersion = opts.runtimeVersion || packageVersion(projectRoot);
  if (!current) {
    return {
      initialized: false,
      runtimeVersion,
      actions: [],
      missingFeatures: expectedFeatureIds(),
      missingContext: [],
      migrationCandidates: [],
      spawnRecommendation: null
    };
  }

  const record = current['godpowers-features'] || {};
  const missingFeatures = missingFeatureIds(current);
  const missingContext = missingContextTargets(projectRoot);
  const migrationCandidates = planningSystems.detect(projectRoot).systems
    .filter((system) => {
      const configured = Array.isArray(current['source-systems'])
        ? current['source-systems']
        : [];
      return !configured.some((entry) => entry.id === system.id);
    })
    .map((system) => ({
      id: system.id,
      name: system.name,
      confidence: system.confidence,
      files: system.files.length
    }));

  const actions = [];
  if (record['runtime-version'] !== runtimeVersion) actions.push('record-runtime-version');
  if (missingFeatures.length > 0) actions.push('record-feature-set');
  if (missingContext.length > 0) actions.push('refresh-context');
  if (migrationCandidates.length > 0) actions.push('suggest-god-migrate');

  const needsJudgment = sourceSystemsNeedJudgment(current);
  const lowConfidenceCandidates = migrationCandidates.filter((system) => (
    system.confidence === 'low' && !SIBLING_SYSTEM_IDS.has(system.id)
  ));
  const spawnRecommendation = needsJudgment.length > 0 || lowConfidenceCandidates.length > 0
    ? {
        agent: 'god-greenfieldifier',
        reason: 'Imported or detected planning-system context needs migration judgment.',
        systems: [...needsJudgment.map((system) => system.id), ...lowConfidenceCandidates.map((system) => system.id)]
      }
    : null;

  return {
    initialized: true,
    runtimeVersion,
    featureSetVersion: FEATURE_SET_VERSION,
    actions,
    currentFeatures: existingFeatureIds(current),
    expectedFeatures: FEATURES,
    missingFeatures,
    missingContext,
    migrationCandidates,
    spawnRecommendation
  };
}

function buildFeatureRecord(runtimeVersion, now) {
  return {
    'feature-set-version': FEATURE_SET_VERSION,
    'runtime-version': runtimeVersion,
    known: expectedFeatureIds(),
    'last-awareness-refresh-at': now
  };
}

function sameFeatureRecord(existing, next) {
  if (!existing) return false;
  return existing['feature-set-version'] === next['feature-set-version']
    && existing['runtime-version'] === next['runtime-version']
    && JSON.stringify(existing.known || []) === JSON.stringify(next.known || []);
}

function applyStateAwareness(projectRoot, current, runtimeVersion, now) {
  const nextRecord = buildFeatureRecord(runtimeVersion, now);
  if (sameFeatureRecord(current['godpowers-features'], nextRecord)) {
    return { written: false, record: current['godpowers-features'] };
  }
  const nextState = {
    ...current,
    'godpowers-features': nextRecord
  };
  state.write(projectRoot, nextState);
  return { written: true, record: nextRecord };
}

function run(projectRoot, opts = {}) {
  const before = detect(projectRoot, opts);
  if (!before.initialized) {
    return {
      ...before,
      applied: false,
      stateWritten: false,
      contextResults: [],
      reason: '.godpowers/state.json not found'
    };
  }

  const current = state.read(projectRoot);
  const now = opts.now || new Date().toISOString();
  const stateResult = applyStateAwareness(projectRoot, current, before.runtimeVersion, now);
  const refreshedState = state.read(projectRoot);
  const shouldRefreshContext = opts.refreshContext !== false;
  const contextResults = shouldRefreshContext
    ? contextWriter.apply(projectRoot, refreshedState, { projectRoot })
    : [];
  const after = detect(projectRoot, opts);

  return {
    ...after,
    applied: true,
    stateWritten: stateResult.written,
    contextResults,
    stateRecord: stateResult.record
  };
}

module.exports = {
  FEATURE_SET_VERSION,
  FEATURES,
  packageVersion,
  detect,
  run
};
