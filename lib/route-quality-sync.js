/**
 * Route quality sync.
 *
 * Detects disconnected route automation surfaces: symbolic spawn tokens,
 * unresolved agent targets, contextual exits without typed outcomes, missing
 * standards coverage, and agent-spawn routes without trace events.
 */

const fs = require('fs');
const path = require('path');

const { parseSimpleYaml } = require('./intent');
const { read, write } = require('./sync-fs');
const { makeAddCheck, listFiles } = require('./sync-check');

const addCheck = makeAddCheck('route-quality');

const LOG_PATH = '.godpowers/surface/ROUTE-QUALITY-SYNC.md';
const CONTEXTUAL_NEXT_VALUES = new Set([
  'varies',
  'varies-by-verdict',
  'steady-state',
  'session-end'
]);
const OUTCOME_TYPES = new Set([
  'contextual',
  'verdict-based',
  'steady-state',
  'session-end',
  'requires-selection',
  'no-next-command',
  'explicit-command'
]);

const CONTEXTUAL_NEXT_ALLOWED = new Set([
  '/god',
  '/god-agent-audit',
  '/god-budget',
  '/god-cache-clear',
  '/god-check-todos',
  '/god-context-scan',
  '/god-cost',
  '/god-design-impact',
  '/god-discuss',
  '/god-doctor',
  '/god-extension-add',
  '/god-extension-info',
  '/god-extension-list',
  '/god-extension-remove',
  '/god-graph',
  '/god-help',
  '/god-lifecycle',
  '/god-list-assumptions',
  '/god-locate',
  '/god-logs',
  '/god-launch',
  '/god-metrics',
  '/god-mode',
  '/god-next',
  '/god-pause-work',
  '/god-redo',
  '/god-reconcile',
  '/god-resume-work',
  '/god-roadmap-check',
  '/god-sprint',
  '/god-suite-status',
  '/god-test-extension',
  '/god-thread',
  '/god-trace',
  '/god-workstream'
]);

const STANDARDS_EXEMPT_COMMANDS = new Set([
  '/god-archaeology',
  '/god-audit',
  '/god-automation-setup',
  '/god-debug',
  '/god-discuss',
  '/god-explore',
  '/god-feature',
  '/god-hotfix',
  '/god-hygiene',
  '/god-init',
  '/god-org-context',
  '/god-party',
  '/god-pause-work',
  '/god-preflight',
  '/god-progress',
  '/god-reconstruct',
  '/god-roadmap-check',
  '/god-extension-scaffold',
  '/god-smite',
  '/god-tech-debt'
]);

const TIER_GATE_COMMANDS = new Set([
  '/god-prd',
  '/god-design',
  '/god-arch',
  '/god-roadmap',
  '/god-stack',
  '/god-repo',
  '/god-build',
  '/god-harden'
]);

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function parseRoute(projectRoot, routePath) {
  try {
    return parseSimpleYaml(read(projectRoot, routePath)) || {};
  } catch (err) {
    return {};
  }
}

function spawnTokens(route) {
  const execution = route.execution || {};
  return normalizeSpawnList([
    ...arr(execution.spawns),
    ...arr(execution['secondary-spawns']),
    ...arr(execution['parallel-spawns'])
  ]);
}

function normalizeSpawnList(tokens) {
  return tokens
    .map((token) => {
      if (token && typeof token === 'object' && token.agent) return token.agent;
      return token;
    })
    .filter((token) => token !== null && token !== undefined);
}

function isAtomicSpawn(token) {
  return token === 'built-in' || /^god-[a-z0-9-]+$/.test(token);
}

function detect(projectRoot) {
  const checks = [];
  const routes = listFiles(projectRoot, 'routing', /^god.*\.yaml$/);
  const agents = new Set(listFiles(projectRoot, 'agents', /^god.*\.md$/)
    .map((file) => path.basename(file, '.md')));
  let symbolicCount = 0;
  let unresolvedCount = 0;
  let typedOutcomeCount = 0;
  let standardsExemptCount = 0;
  let traceEventMissingCount = 0;
  let gateCommandCount = 0;

  for (const routePath of routes) {
    const route = parseRoute(projectRoot, routePath);
    const command = route.metadata && route.metadata.command
      ? route.metadata.command
      : `/${path.basename(routePath, '.yaml')}`;
    const tokens = spawnTokens(route);

    for (const token of tokens) {
      if (!isAtomicSpawn(String(token))) {
        symbolicCount++;
        addCheck(
          checks,
          `symbolic-spawn-${command.replace(/[^a-z0-9]+/gi, '-')}`,
          'stale',
          routePath,
          `${command} uses symbolic spawn token ${token}.`,
          { spawn: 'god-auditor' }
        );
        continue;
      }
      if (String(token).startsWith('god-') && !agents.has(String(token))) {
        unresolvedCount++;
        addCheck(
          checks,
          `unresolved-spawn-${command.replace(/[^a-z0-9]+/gi, '-')}-${token}`,
          'stale',
          routePath,
          `${command} references missing agent ${token}.`,
          { spawn: 'god-auditor' }
        );
      }
    }

    const agentTokens = tokens
      .map((token) => String(token))
      .filter((token) => /^god-[a-z0-9-]+$/.test(token));
    const events = arr(route.endoff && route.endoff.events).map((event) => String(event));
    if (agentTokens.length > 0 && (!events.includes('agent.start') || !events.includes('agent.end'))) {
      traceEventMissingCount++;
      addCheck(
        checks,
        `missing-trace-events-${command.replace(/[^a-z0-9]+/gi, '-')}`,
        'stale',
        routePath,
        `${command} spawns agents but does not declare both agent.start and agent.end trace events.`,
        { spawn: 'god-auditor' }
      );
    }

    const successPath = route['success-path'] || {};
    const next = successPath['next-recommended'];
    const conditionalNext = route['success-path'] && arr(route['success-path']['conditional-next']);
    const outcome = successPath.outcome || {};
    const needsTypedOutcome = next
      && (CONTEXTUAL_NEXT_VALUES.has(String(next)) || /\s+or\s+/.test(String(next)));
    if (needsTypedOutcome) {
      if (outcome.type && OUTCOME_TYPES.has(String(outcome.type))) {
        typedOutcomeCount++;
      } else {
        addCheck(
          checks,
          `missing-route-outcome-${command.replace(/[^a-z0-9]+/gi, '-')}`,
          'stale',
          routePath,
          `${command} uses contextual next route ${next} without a typed success-path.outcome.`,
          { spawn: 'god-reconciler' }
        );
      }
    }

    const writes = arr(route.execution && route.execution.writes);
    const writesDurableSurface = writes.length > 0;
    if (writesDurableSurface && !route.standards) {
      if (STANDARDS_EXEMPT_COMMANDS.has(command)) {
        standardsExemptCount++;
      } else {
        addCheck(
          checks,
          `missing-standards-${command.replace(/[^a-z0-9]+/gi, '-')}`,
          'stale',
          routePath,
          `${command} writes durable surfaces but has no standards block or approved exemption.`,
          { spawn: 'god-auditor' }
        );
      }
    }

    if (TIER_GATE_COMMANDS.has(command)) {
      const tierName = command.replace('/god-', '');
      const expected = `npx godpowers gate --tier=${tierName} --project=.`;
      const actual = route.standards && route.standards['gate-command'];
      if (actual === expected) {
        gateCommandCount++;
      } else {
        addCheck(
          checks,
          `missing-gate-command-${command.replace(/[^a-z0-9]+/gi, '-')}`,
          'stale',
          routePath,
          `${command} must declare standards.gate-command as ${expected}.`,
          { spawn: 'god-auditor' }
        );
      }
    }
  }

  if (symbolicCount === 0) {
    addCheck(checks, 'atomic-spawn-tokens', 'fresh', 'routing/', 'All route spawn tokens are atomic.');
  }
  if (unresolvedCount === 0) {
    addCheck(checks, 'resolved-spawn-targets', 'fresh', 'routing/', 'All route spawn targets resolve to shipped agents or built-in runtime work.');
  }
  addCheck(
    checks,
    'contextual-exit-policy',
    checks.some((check) => check.id.startsWith('missing-route-outcome-')) ? 'stale' : 'fresh',
    'routing/',
    `${typedOutcomeCount} contextual route exits have typed outcomes and all other next routes are explicit.`,
    { spawn: checks.some((check) => check.id.startsWith('missing-route-outcome-')) ? 'god-reconciler' : null }
  );
  addCheck(
    checks,
    'standards-policy',
    checks.some((check) => check.id.startsWith('missing-standards-')) ? 'stale' : 'fresh',
    'routing/',
    `${standardsExemptCount} durable-writing routes have approved standards exemptions and all other writing routes declare standards.`,
    { spawn: checks.some((check) => check.id.startsWith('missing-standards-')) ? 'god-auditor' : null }
  );
  addCheck(
    checks,
    'agent-trace-policy',
    traceEventMissingCount === 0 ? 'fresh' : 'stale',
    'routing/',
    traceEventMissingCount === 0
      ? 'All agent-spawning routes declare agent.start and agent.end trace events.'
      : `${traceEventMissingCount} agent-spawning routes are missing required trace events.`,
    { spawn: traceEventMissingCount === 0 ? null : 'god-auditor' }
  );
  addCheck(
    checks,
    'gate-command-policy',
    checks.some((check) => check.id.startsWith('missing-gate-command-')) ? 'stale' : 'fresh',
    'routing/',
    `${gateCommandCount} tier routes declare executable gate commands.`,
    { spawn: checks.some((check) => check.id.startsWith('missing-gate-command-')) ? 'god-auditor' : null }
  );

  const stale = checks.filter((check) => check.status !== 'fresh');
  return {
    status: stale.length === 0 ? 'fresh' : 'stale',
    checks,
    stale
  };
}

function appendLog(projectRoot, before, after) {
  const now = new Date().toISOString();
  const lines = [];
  if (fs.existsSync(path.join(projectRoot, LOG_PATH))) {
    lines.push(read(projectRoot, LOG_PATH).replace(/\s*$/, ''));
    lines.push('');
  } else {
    lines.push('# Route Quality Sync Log');
    lines.push('');
    lines.push('- [DECISION] This file records route-quality sync checks run by Godpowers.');
    lines.push('');
  }
  lines.push(`## ${now}`);
  lines.push('');
  lines.push(`- [DECISION] Route quality status before apply was ${before.status}.`);
  lines.push(`- [DECISION] Route quality status after apply is ${after.status}.`);
  lines.push('');
  write(projectRoot, LOG_PATH, lines.join('\n'));
}

function run(projectRoot, opts = {}) {
  const before = detect(projectRoot);
  const after = detect(projectRoot);
  if (opts.log !== false) appendLog(projectRoot, before, after);
  return {
    before,
    after,
    applied: [],
    logPath: opts.log === false ? null : LOG_PATH
  };
}

function summary(report) {
  return report.status === 'fresh' ? 'fresh' : `${report.stale.length} stale`;
}

module.exports = {
  LOG_PATH,
  CONTEXTUAL_NEXT_ALLOWED,
  CONTEXTUAL_NEXT_VALUES,
  OUTCOME_TYPES,
  STANDARDS_EXEMPT_COMMANDS,
  detect,
  run,
  summary
};
