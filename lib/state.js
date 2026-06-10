/**
 * State Manager
 *
 * Read/write .godpowers/state.json with schema validation.
 * Source of truth for tier statuses and artifact hashes.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const asyncFs = require('./fs-async');
const atomic = require('./atomic-write');
const stateViews = require('./state-views');

const STATE_VERSION = '1.0.0';
const COMPLETE_STATUSES = new Set(['done', 'imported', 'skipped', 'not-required']);
const ACTIVE_STATUSES = new Set(['in-flight', 'failed', 're-invoked']);
const TIER_LABELS = {
  'tier-0': 'Orchestration',
  'tier-1': 'Planning',
  'tier-2': 'Building',
  'tier-3': 'Shipping'
};
const SUBSTEP_LABELS = {
  orchestration: 'Orchestration',
  prd: 'PRD',
  arch: 'Architecture',
  roadmap: 'Roadmap',
  stack: 'Stack',
  design: 'Design',
  product: 'Product',
  repo: 'Repo',
  build: 'Build',
  deploy: 'Deploy',
  observe: 'Observe',
  launch: 'Launch',
  harden: 'Harden'
};

/**
 * @typedef {Object} GodpowersState
 * @property {string} $schema State schema URL.
 * @property {string} version State schema version.
 * @property {{ name: string, started?: string }} project Project identity.
 * @property {Record<string, Record<string, Object>>} tiers Tier and sub-step state.
 */

/**
 * @typedef {Object} ProgressStep
 * @property {string} tierKey Tier key such as `tier-1`.
 * @property {string} subStepKey Sub-step key such as `prd`.
 * @property {string} status Sub-step status.
 * @property {number} ordinal One-based step position.
 */

function statePath(projectRoot) {
  return path.join(projectRoot, '.godpowers', 'state.json');
}

function tierNumber(tierKey) {
  const match = String(tierKey).match(/^tier-(\d+)$/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function labelFromKey(key) {
  return String(key)
    .split(/[-_]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function tierComparator(a, b) {
  const byNumber = tierNumber(a) - tierNumber(b);
  return byNumber === 0 ? String(a).localeCompare(String(b)) : byNumber;
}

/**
 * Read state.json from a project.
 *
 * @param {string} projectRoot
 * @returns {GodpowersState|null}
 */
function read(projectRoot) {
  const file = statePath(projectRoot);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(
      `Corrupt state file at ${file}: ${e.message}. ` +
      `Fix the JSON or remove the file to let Godpowers reinitialize it.`
    );
  }
}

/**
 * Async state.json reader for callers that should not block the event loop.
 *
 * @param {string} projectRoot
 * @returns {Promise<GodpowersState|null>}
 */
async function readAsync(projectRoot) {
  const file = statePath(projectRoot);
  if (!(await asyncFs.exists(file))) return null;
  const raw = await asyncFs.fs.readFile(file, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(
      `Corrupt state file at ${file}: ${e.message}. ` +
      `Fix the JSON or remove the file to let Godpowers reinitialize it.`
    );
  }
}

function normalizeForWrite(state) {
  if (!state || typeof state !== 'object') {
    throw new Error('state must be an object');
  }
  if (!state.version) state.version = STATE_VERSION;
  if (!state.$schema) state.$schema = 'https://godpowers.dev/schema/state.v1.json';
  if (!state.project || !state.project.name) {
    throw new Error('state.project.name is required');
  }
  if (!state.tiers) state.tiers = {};
  return state;
}

/**
 * Write state.json to a project. Validates basic structure.
 *
 * @param {string} projectRoot
 * @param {GodpowersState} state
 * @param {{ refreshViews?: boolean, onStateViewWarning?: Function }} [opts]
 * @returns {GodpowersState}
 */
function write(projectRoot, state, opts = {}) {
  normalizeForWrite(state);

  const file = statePath(projectRoot);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  atomic.writeJsonAtomic(file, state);
  if (opts.refreshViews !== false) {
    stateViews.writeAll(projectRoot, state, { onWarning: opts.onStateViewWarning });
  }
  return state;
}

/**
 * Async state.json writer with the same validation contract as write().
 *
 * @param {string} projectRoot
 * @param {GodpowersState} state
 * @param {{ refreshViews?: boolean, onStateViewWarning?: Function }} [opts]
 * @returns {Promise<GodpowersState>}
 */
async function writeAsync(projectRoot, state, opts = {}) {
  normalizeForWrite(state);
  await asyncFs.writeJson(statePath(projectRoot), state);
  if (opts.refreshViews !== false) {
    await stateViews.writeAllAsync(projectRoot, state, { onWarning: opts.onStateViewWarning });
  }
  return state;
}

function createInitialState(projectName, opts = {}) {
  return {
    $schema: 'https://godpowers.dev/schema/state.v1.json',
    version: STATE_VERSION,
    project: {
      name: projectName,
      started: new Date().toISOString()
    },
    'active-workstream': 'main',
    tiers: {
      'tier-0': { orchestration: { status: 'in-flight', updated: new Date().toISOString() } },
      'tier-1': {
        prd: { status: 'pending' },
        arch: { status: 'pending' },
        roadmap: { status: 'pending' },
        stack: { status: 'pending' },
        design: { status: 'pending' },   // conditional: not-required for backend-only
        product: { status: 'pending' }   // populated only when impeccable installed
      },
      'tier-2': {
        repo: { status: 'pending' },
        build: { status: 'pending' }
      },
      'tier-3': {
        deploy: { status: 'pending' },
        observe: { status: 'pending' },
        launch: { status: 'pending' },
        harden: { status: 'pending' }
      }
    },
    'lifecycle-phase': 'in-arc',
    linkage: {
      'coverage-pct': 0,
      'orphan-count': 0,
      'drift-count': 0,
      'review-required-items': 0
    },
    deliverables: {
      requirements: { total: 0, done: 0, 'in-progress': 0, untouched: 0, percent: 0 },
      increments: [],
      gaps: 0
    },
    'yolo-decisions': [],
    ...opts
  };
}

/**
 * Initialize a new state.json for a project.
 */
function init(projectRoot, projectName, opts = {}) {
  return write(projectRoot, createInitialState(projectName, opts));
}

async function initAsync(projectRoot, projectName, opts = {}) {
  return writeAsync(projectRoot, createInitialState(projectName, opts));
}

/**
 * Update a single sub-step's status.
 */
function updateSubStep(projectRoot, tierKey, subStepKey, updates) {
  const state = read(projectRoot);
  if (!state) throw new Error('state.json not found');
  if (!state.tiers[tierKey]) throw new Error(`Tier not found: ${tierKey}`);
  state.tiers[tierKey][subStepKey] = {
    ...(state.tiers[tierKey][subStepKey] || {}),
    ...updates,
    updated: new Date().toISOString()
  };
  write(projectRoot, state);
  return state.tiers[tierKey][subStepKey];
}

async function updateSubStepAsync(projectRoot, tierKey, subStepKey, updates) {
  const state = await readAsync(projectRoot);
  if (!state) throw new Error('state.json not found');
  if (!state.tiers[tierKey]) throw new Error(`Tier not found: ${tierKey}`);
  state.tiers[tierKey][subStepKey] = {
    ...(state.tiers[tierKey][subStepKey] || {}),
    ...updates,
    updated: new Date().toISOString()
  };
  await writeAsync(projectRoot, state);
  return state.tiers[tierKey][subStepKey];
}

/**
 * Hash a file. Used for artifact-hash tracking.
 */
function hashFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return `sha256:${hash}`;
}

/**
 * Detect drift: for each sub-step with an artifact, rehash and compare.
 * Returns a list of drift entries.
 */
function detectDrift(projectRoot) {
  const state = read(projectRoot);
  if (!state) return [];
  const drift = [];
  for (const [tierKey, tier] of Object.entries(state.tiers)) {
    for (const [subStepKey, subStep] of Object.entries(tier)) {
      if (!subStep.artifact || !subStep['artifact-hash']) continue;
      const fullPath = path.join(projectRoot, '.godpowers', subStep.artifact);
      const currentHash = hashFile(fullPath);
      if (currentHash === null) {
        drift.push({ tierKey, subStepKey, kind: 'missing', recorded: subStep['artifact-hash'] });
      } else if (currentHash !== subStep['artifact-hash']) {
        drift.push({ tierKey, subStepKey, kind: 'modified', recorded: subStep['artifact-hash'], current: currentHash });
      }
    }
  }
  return drift;
}

function isCompleteStatus(status) {
  return COMPLETE_STATUSES.has(status);
}

function isActiveStatus(status) {
  return ACTIVE_STATUSES.has(status);
}

function orderedSubSteps(state) {
  if (!state || !state.tiers) return [];
  const steps = [];
  for (const tierKey of Object.keys(state.tiers).sort(tierComparator)) {
    const tier = state.tiers[tierKey] || {};
    for (const [subStepKey, subStep] of Object.entries(tier)) {
      const status = subStep && subStep.status ? subStep.status : 'pending';
      steps.push({
        tierKey,
        tierNumber: tierNumber(tierKey),
        tierLabel: TIER_LABELS[tierKey] || labelFromKey(tierKey),
        subStepKey,
        subStepLabel: SUBSTEP_LABELS[subStepKey] || labelFromKey(subStepKey),
        status,
        artifact: subStep && subStep.artifact,
        updated: subStep && subStep.updated
      });
    }
  }
  return steps.map((step, index) => ({ ...step, ordinal: index + 1 }));
}

function progressSummary(state) {
  const steps = orderedSubSteps(state);
  const total = steps.length;
  const completed = steps.filter(step => isCompleteStatus(step.status)).length;

  let currentIndex = steps.findIndex(step => isActiveStatus(step.status));
  if (currentIndex < 0) {
    currentIndex = steps.findIndex(step => !isCompleteStatus(step.status));
  }
  if (currentIndex < 0 && total > 0) currentIndex = total - 1;

  const current = currentIndex >= 0 ? steps[currentIndex] : null;
  return {
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    completed,
    total,
    remaining: Math.max(total - completed, 0),
    currentStep: current ? current.ordinal : 0,
    current,
    tiers: summarizeTiers(steps)
  };
}

function summarizeTiers(steps) {
  const byTier = new Map();
  for (const step of steps) {
    if (!byTier.has(step.tierKey)) {
      byTier.set(step.tierKey, {
        tierKey: step.tierKey,
        tierNumber: step.tierNumber,
        tierLabel: step.tierLabel,
        completed: 0,
        total: 0,
        current: false
      });
    }
    const tier = byTier.get(step.tierKey);
    tier.total += 1;
    if (isCompleteStatus(step.status)) tier.completed += 1;
    if (isActiveStatus(step.status)) tier.current = true;
  }
  return Array.from(byTier.values()).map(tier => ({
    ...tier,
    percent: tier.total === 0 ? 0 : Math.round((tier.completed / tier.total) * 100)
  }));
}

function renderProgressLine(summary) {
  const progress = summary && typeof summary.total === 'number' ? summary : progressSummary(summary);
  if (!progress || progress.total === 0) {
    return 'Progress: unavailable, no tracked Godpowers steps found';
  }
  const current = progress.current;
  const currentLabel = current
    ? `${current.tierLabel} / ${current.subStepLabel}`
    : 'complete';
  return `Progress: ${progress.percent}% (${progress.completed} of ${progress.total} steps complete; current step ${progress.currentStep} of ${progress.total}: ${currentLabel})`;
}

module.exports = {
  read,
  readAsync,
  write,
  writeAsync,
  init,
  initAsync,
  updateSubStep,
  updateSubStepAsync,
  hashFile,
  detectDrift,
  statePath,
  orderedSubSteps,
  progressSummary,
  renderProgressLine,
  isCompleteStatus,
  isActiveStatus
};
