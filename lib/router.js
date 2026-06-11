/**
 * Router
 *
 * Query routing definitions to:
 * - Find prerequisites for a command
 * - Suggest next command after success
 * - Identify auto-completable prerequisites
 * - Identify when standards checks should run
 */

const fs = require('fs');
const path = require('path');
const { parseSimpleYaml, formatDiagnostic } = require('./intent');
const state = require('./state');
const commandFamilies = require('./command-families');

const ROUTING_DIR = path.join(__dirname, '..', 'routing');
const SAFE_SYNC_PLAN = '.godpowers/sync/SAFE-SYNC-PLAN.md';
const SAFE_SYNC_DONE_FILES = [
  '.godpowers/sync/SAFE-SYNC-DONE.md',
  '.godpowers/sync/SAFE-SYNC-RESOLVED.md'
];
const HARDEN_FINDINGS = '.godpowers/harden/FINDINGS.md';

let _cache = null;

function warnYamlDiagnostic(diagnostic) {
  console.warn(`[godpowers] YAML warning ${formatDiagnostic(diagnostic)}`);
}

/**
 * Load all routing files into a map keyed by command.
 */
function loadAll() {
  if (_cache) return _cache;
  const result = {};
  if (!fs.existsSync(ROUTING_DIR)) return result;

  for (const file of fs.readdirSync(ROUTING_DIR)) {
    if (!file.endsWith('.yaml')) continue;
    const content = fs.readFileSync(path.join(ROUTING_DIR, file), 'utf8');
    const parsed = parseSimpleYaml(content, {
      strict: true,
      source: path.join('routing', file),
      onDiagnostic: warnYamlDiagnostic
    });
    if (parsed.metadata && parsed.metadata.command) {
      result[parsed.metadata.command] = parsed;
    }
  }
  _cache = result;
  return result;
}

/**
 * Get routing for a specific command.
 */
function getRouting(command) {
  const all = loadAll();
  return all[command] || null;
}

/**
 * Check prerequisites for a command against current project state.
 * Returns { satisfied, missing[], autoCompletable[] }
 */
function checkPrerequisites(command, projectRoot) {
  const routing = getRouting(command);
  if (!routing) return { satisfied: true, missing: [], autoCompletable: [] };

  const required = (routing.prerequisites && routing.prerequisites.required) || [];
  const missing = [];
  const autoCompletable = [];

  for (const prereq of required) {
    const ok = evaluateCheck(prereq.check, projectRoot);
    if (!ok) {
      missing.push(prereq.check);
      if (prereq['auto-complete']) {
        autoCompletable.push({
          check: prereq.check,
          autoCompleteCommand: prereq['auto-complete'],
          humanRequired: prereq['human-required'] !== false
        });
      }
    }
  }

  return {
    satisfied: missing.length === 0,
    missing,
    autoCompletable
  };
}

/**
 * Evaluate a single check predicate against the project state.
 * Predicates: file:path, state:dotted.path == value, env:VAR
 */
function evaluateCheck(check, projectRoot) {
  // OR conditions must be handled before prefix-specific checks so both
  // branches can be evaluated as independent predicates.
  if (check.includes(' OR ')) {
    return check.split(' OR ').some(part => evaluateCheck(part.trim(), projectRoot));
  }

  // file:path
  if (check.startsWith('file:')) {
    const filePath = check.slice(5).trim();
    const resolved = resolveProjectRelative(projectRoot, filePath);
    if (!resolved) return false;
    return fs.existsSync(resolved);
  }

  // state:dotted.path == value
  if (check.startsWith('state:')) {
    const expr = check.slice(6).trim();
    const match = expr.match(/^([\w.-]+)\s*==\s*(.+)$/);
    if (!match) return false;
    const [, dottedPath, expected] = match;
    const s = state.read(projectRoot);
    if (!s) return false;
    const actual = dottedPath.split('.').reduce((acc, k) => {
      if (!acc || k === '__proto__' || k === 'constructor' || k === 'prototype') return undefined;
      return acc[k];
    }, s.tiers || s);
    return actual === expected || actual === parseValue(expected);
  }

  if (check === 'safe-sync-clear') {
    return detectSafeSyncBlocker(projectRoot) === null;
  }

  if (check === 'no-critical-findings') {
    return hasNoCriticalFindings(projectRoot);
  }

  // mode-A-greenfield: pass-through hint, treat as satisfiable
  if (check.includes('greenfield') || check.includes('mode-A')) {
    return !fs.existsSync(path.join(projectRoot, '.godpowers'));
  }

  // Unknown check predicate: log a warning but assume satisfied to avoid
  // blocking legitimate work from an outdated or unrecognized routing file.
  if (typeof process !== 'undefined' && process.env.GODPOWERS_DEBUG) {
    console.warn(`[router] unknown check predicate, assuming satisfied: ${check}`);
  }
  return true;
}

function parseValue(s) {
  s = s.trim();
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null') return null;
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return s;
}

function resolveProjectRelative(projectRoot, relPath) {
  if (!projectRoot || !relPath) return null;
  if (path.isAbsolute(relPath) || relPath.includes('\0')) return null;

  const root = path.resolve(projectRoot);
  const resolved = path.resolve(root, relPath);
  if (resolved === root || resolved.startsWith(root + path.sep)) return resolved;
  return null;
}

/**
 * Get the recommended next command after a successful run.
 * If conditional-next is declared, evaluates each branch's condition
 * against the project; returns the first matching next. Falls back
 * to next-recommended when no condition matches.
 *
 * Conditions evaluated:
 *   ui-detected       - lib/design-detector.isUiProject(projectRoot).required
 *   no-ui-detected    - !lib/design-detector.isUiProject(projectRoot).required
 *   impeccable-installed - lib/impeccable-bridge.isInstalled()
 *   suite-mode        - lib/multi-repo-detector.detect().isMultiRepo
 */
function getNextCommand(command, opts = {}) {
  const routing = getRouting(command);
  if (!routing) return null;
  const sp = routing['success-path'] || {};

  // Check conditional-next first
  if (Array.isArray(sp['conditional-next']) && opts.projectRoot) {
    for (const branch of sp['conditional-next']) {
      if (evaluateNextCondition(branch.condition, opts.projectRoot)) {
        return branch.next;
      }
    }
  }
  return sp['next-recommended'] || null;
}

function inferOutcomeType(next) {
  if (!next) return 'no-next-command';
  if (next === 'varies') return 'contextual';
  if (next === 'varies-by-verdict') return 'verdict-based';
  if (next === 'steady-state') return 'steady-state';
  if (next === 'session-end') return 'session-end';
  if (/\s+or\s+/.test(next)) return 'requires-selection';
  if (/^\/god(?:-[a-z-]+)?(?:\s.*)?$/.test(next)) return 'explicit-command';
  return 'contextual';
}

function getRouteOutcome(command) {
  const routing = getRouting(command);
  if (!routing) return null;
  const sp = routing['success-path'] || {};
  const outcome = sp.outcome || {};
  const next = sp['next-recommended'] || null;
  const type = outcome.type || inferOutcomeType(next);
  return {
    type,
    label: outcome.label || type,
    reason: outcome.reason || 'Route outcome is inferred from success-path.next-recommended.',
    next,
    allowedNext: outcome['allowed-next'] || []
  };
}

/**
 * Evaluate a routing condition against the project state.
 */
function evaluateNextCondition(cond, projectRoot) {
  if (!cond || !projectRoot) return false;
  try {
    if (cond === 'ui-detected') {
      const detector = require('./design-detector');
      return detector.isUiProject(projectRoot).required;
    }
    if (cond === 'no-ui-detected') {
      const detector = require('./design-detector');
      return !detector.isUiProject(projectRoot).required;
    }
    if (cond === 'impeccable-installed') {
      const bridge = require('./impeccable-bridge');
      return bridge.isInstalled(projectRoot);
    }
    if (cond === 'suite-mode') {
      const detector = require('./multi-repo-detector');
      return detector.detect(projectRoot).isMultiRepo;
    }
  } catch (e) {
    return false;
  }
  return false;
}

/**
 * Get alternatives with their conditions.
 */
function getAlternatives(command) {
  const routing = getRouting(command);
  if (!routing) return [];
  return (routing['success-path'] && routing['success-path'].alternatives) || [];
}

/**
 * Get standards check requirements for a command.
 */
function getStandards(command) {
  const routing = getRouting(command);
  if (!routing || !routing.standards) return null;
  return routing.standards;
}

function getGateCommand(command) {
  const standards = getStandards(command);
  return standards && standards['gate-command'] ? standards['gate-command'] : null;
}

/**
 * Get the list of agents this command spawns (primary + secondary).
 */
function getSpawnedAgents(command) {
  const routing = getRouting(command);
  if (!routing || !routing.execution) return [];
  const primary = routing.execution.spawns || [];
  const secondary = routing.execution['secondary-spawns'] || [];
  const parallel = routing.execution['parallel-spawns'] || [];
  return [...primary, ...secondary, ...parallel]
    .map(spawn => (spawn && typeof spawn === 'object' && spawn.agent) ? spawn.agent : spawn)
    .filter(spawn => spawn !== null && spawn !== undefined);
}

/**
 * For a given current project state, suggest the next logical command.
 * Uses /god-next routing logic.
 */
function suggestNext(projectRoot) {
  const s = state.read(projectRoot);
  if (!s) return { command: '/god-init', reason: 'No project initialized' };

  const tiers = s.tiers || {};

  // Tier 1
  if (subStepStatus(tiers, 'tier-1', 'prd') !== 'done')
    return { command: '/god-prd', reason: 'PRD pending', tier: 'tier-1' };
  if (subStepStatus(tiers, 'tier-1', 'arch') !== 'done')
    return { command: '/god-arch', reason: 'Architecture pending (PRD complete)', tier: 'tier-1' };
  if (subStepStatus(tiers, 'tier-1', 'roadmap') !== 'done')
    return { command: '/god-roadmap', reason: 'Roadmap pending', tier: 'tier-1' };
  if (subStepStatus(tiers, 'tier-1', 'stack') !== 'done')
    return { command: '/god-stack', reason: 'Stack pending', tier: 'tier-1' };

  // Tier 2
  if (subStepStatus(tiers, 'tier-2', 'repo') !== 'done')
    return { command: '/god-repo', reason: 'Repo not scaffolded', tier: 'tier-2' };
  if (subStepStatus(tiers, 'tier-2', 'build') !== 'done')
    return { command: '/god-build', reason: 'Build pending', tier: 'tier-2' };

  const safeSync = detectSafeSyncBlocker(projectRoot);
  if (safeSync) return safeSync;

  // Tier 3
  if (subStepStatus(tiers, 'tier-3', 'deploy') !== 'done')
    return { command: '/god-deploy', reason: 'Deploy pipeline not set up', tier: 'tier-3' };
  if (subStepStatus(tiers, 'tier-3', 'observe') !== 'done')
    return { command: '/god-observe', reason: 'Observability not wired', tier: 'tier-3' };
  if (subStepStatus(tiers, 'tier-3', 'harden') !== 'done')
    return { command: '/god-harden', reason: 'Security review pending', tier: 'tier-3' };
  if (subStepStatus(tiers, 'tier-3', 'launch') !== 'done')
    return { command: '/god-launch', reason: 'Launch pending', tier: 'tier-3' };

  // Steady state
  return {
    command: null,
    reason: 'Project in steady state. Use /god-feature, /god-hotfix, /god-hygiene, etc.',
    tier: 'steady-state'
  };
}

function subStepStatus(tiers, tierKey, subKey) {
  return tiers[tierKey] && tiers[tierKey][subKey] && tiers[tierKey][subKey].status;
}

function detectSafeSyncBlocker(projectRoot) {
  if (SAFE_SYNC_DONE_FILES.some(file => fs.existsSync(path.join(projectRoot, file)))) {
    return null;
  }

  const planPath = path.join(projectRoot, SAFE_SYNC_PLAN);
  if (fs.existsSync(planPath)) {
    return safeSyncSuggestion(`Unresolved safe sync plan at ${SAFE_SYNC_PLAN}`, SAFE_SYNC_PLAN);
  }

  const checkpointPath = path.join(projectRoot, '.godpowers', 'CHECKPOINT.md');
  if (!fs.existsSync(checkpointPath)) return null;

  const checkpoint = fs.readFileSync(checkpointPath, 'utf8');
  const mentionsSafeSync = /safe sync/i.test(checkpoint);
  const isBlocking = /block|red gate|missing|unresolved|before deploy|blocks deploy/i.test(checkpoint);
  if (mentionsSafeSync && isBlocking) {
    return safeSyncSuggestion('Checkpoint says safe sync is blocking Tier 3 work', '.godpowers/CHECKPOINT.md');
  }

  return null;
}

function safeSyncSuggestion(reason, evidence) {
  return {
    command: '/god-reconcile Release Truth And Safe Sync',
    reason,
    tier: 'tier-0',
    blocker: 'safe-sync',
    evidence
  };
}

function hasNoCriticalFindings(projectRoot) {
  const findingsPath = path.join(projectRoot, HARDEN_FINDINGS);
  if (!fs.existsSync(findingsPath)) return false;

  const findings = fs.readFileSync(findingsPath, 'utf8');
  if (/\*\*Launch gate\*\*:\s*PASSED/i.test(findings) || /Launch gate:\s*PASSED/i.test(findings)) {
    return true;
  }
  if (/\*\*Launch gate\*\*:\s*BLOCKED/i.test(findings) || /Launch gate:\s*BLOCKED/i.test(findings)) {
    return false;
  }

  const criticalCount = findings.match(/\|\s*Critical\s*\|\s*(\d+)\s*\|/i);
  if (criticalCount) {
    return Number(criticalCount[1]) === 0;
  }

  const criticalSections = findings.match(/^###\s+\[CRITICAL-[^\n]+(?:\n(?!###\s+\[).*)*/gim) || [];
  if (criticalSections.length === 0) return true;

  return criticalSections.every(section => (
    /\*\*Status\*\*:\s*(Fixed|Accepted-Risk)/i.test(section)
    || /Status:\s*(Fixed|Accepted-Risk)/i.test(section)
  ));
}

/**
 * Clear cached routing (for tests).
 */
function clearCache() {
  _cache = null;
}

module.exports = {
  loadAll,
  getRouting,
  checkPrerequisites,
  getNextCommand,
  getRouteOutcome,
  getAlternatives,
  getStandards,
  getGateCommand,
  getSpawnedAgents,
  getCommandFamily: commandFamilies.familyForCommand,
  resolveTrigger: commandFamilies.resolveTrigger,
  commandFamilies,
  suggestNext,
  evaluateCheck,
  resolveProjectRelative,
  detectSafeSyncBlocker,
  hasNoCriticalFindings,
  clearCache
};
