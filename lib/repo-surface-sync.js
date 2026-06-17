/**
 * Repository surface sync.
 *
 * Detects structural drift between commands, routing, package metadata,
 * agent contracts, workflows, recipes, extensions, and release policy docs.
 * The helper is read-only by default. The apply path writes only safe local
 * logs and optional missing routing stubs when explicitly requested.
 */

const fs = require('fs');
const path = require('path');

const { parseSimpleYaml } = require('./intent');
const { read, write, exists, readJson } = require('./sync-fs');
const { addCheck, listFiles } = require('./sync-check');
const extensions = require('./extensions');
const repoDocSync = require('./repo-doc-sync');
const routeQualitySync = require('./route-quality-sync');
const recipeCoverageSync = require('./recipe-coverage-sync');
const releaseSurfaceSync = require('./release-surface-sync');

const LOG_PATH = '.godpowers/surface/REPO-SURFACE-SYNC.md';

const REQUIRED_PACKAGE_FILE_ENTRIES = [
  'bin/',
  'skills/',
  'agents/god-*.md',
  'templates/',
  'references/',
  'routing/',
  'workflows/',
  'schema/',
  'lib/',
  'fixtures/',
  'extensions/',
  'RELEASE.md',
  'SKILL.md',
  'AGENTS.md',
  'CHANGELOG.md',
  'LICENSE'
];

const REQUIRED_PACKAGE_CHECKS = [
  'lib/feature-awareness.js',
  'lib/repo-doc-sync.js',
  'lib/repo-surface-sync.js',
  'lib/dogfood-runner.js',
  'lib/extension-authoring.js',
  'lib/host-capabilities.js',
  'lib/route-quality-sync.js',
  'lib/recipe-coverage-sync.js',
  'lib/release-surface-sync.js',
  'routing/god-export-otel.yaml'
];

function releaseGateText(projectRoot, pkg) {
  return [
    JSON.stringify((pkg && pkg.scripts) || {}),
    read(projectRoot, 'scripts/run-tests.js')
  ].join('\n');
}

function routeForSkill(skillPath) {
  const base = path.basename(skillPath, '.md');
  return `routing/${base}.yaml`;
}

function commandForSkill(skillPath) {
  return `/${path.basename(skillPath, '.md')}`;
}

function routingChecks(projectRoot) {
  const checks = [];
  const skills = listFiles(projectRoot, 'skills', /^god.*\.md$/);
  const routes = listFiles(projectRoot, 'routing', /^god.*\.yaml$/);
  const skillRoutes = new Set(skills.map(routeForSkill));
  const routeSet = new Set(routes);

  for (const skill of skills) {
    const route = routeForSkill(skill);
    addCheck(
      checks,
      'routing',
      `route-for-${path.basename(skill, '.md')}`,
      routeSet.has(route) ? 'fresh' : 'stale',
      route,
      routeSet.has(route)
        ? `${commandForSkill(skill)} has routing metadata.`
        : `${commandForSkill(skill)} is missing routing metadata.`,
      { safeFix: !routeSet.has(route) }
    );
  }

  for (const route of routes) {
    if (!skillRoutes.has(route)) {
      addCheck(
        checks,
        'routing',
        `skill-for-${path.basename(route, '.yaml')}`,
        'stale',
        route,
        `${route} has no matching skill file.`,
        { severity: 'warning' }
      );
    }
  }
  return checks;
}

function packageChecks(projectRoot) {
  const checks = [];
  const pkg = readJson(projectRoot, 'package.json') || {};
  const lock = readJson(projectRoot, 'package-lock.json');
  const fileEntries = Array.isArray(pkg.files) ? pkg.files : [];

  for (const entry of REQUIRED_PACKAGE_FILE_ENTRIES) {
    addCheck(
      checks,
      'package',
      `package-files-${entry.replace(/[^a-z0-9]+/gi, '-')}`,
      fileEntries.includes(entry) ? 'fresh' : 'stale',
      'package.json',
      fileEntries.includes(entry)
        ? `package.json includes ${entry}.`
        : `package.json files is missing ${entry}.`
    );
  }

  const packageCheckText = read(projectRoot, 'scripts/check-package-contents.js');
  for (const required of REQUIRED_PACKAGE_CHECKS) {
    addCheck(
      checks,
      'package',
      `package-check-${required.replace(/[^a-z0-9]+/gi, '-')}`,
      packageCheckText.includes(required) ? 'fresh' : 'stale',
      'scripts/check-package-contents.js',
      packageCheckText.includes(required)
        ? `package contents check requires ${required}.`
        : `package contents check does not require ${required}.`
    );
  }

  if (lock && lock.version) {
    addCheck(
      checks,
      'package',
      'package-lock-version',
      lock.version === pkg.version ? 'fresh' : 'stale',
      'package-lock.json',
      lock.version === pkg.version
        ? 'package-lock.json version matches package.json.'
        : `package-lock.json version ${lock.version} does not match package.json ${pkg.version}.`
    );
  }

  return checks;
}

function parseRoute(projectRoot, routePath) {
  try {
    return parseSimpleYaml(read(projectRoot, routePath));
  } catch (err) {
    return null;
  }
}

function agentChecks(projectRoot) {
  const checks = [];
  const agents = new Set(listFiles(projectRoot, 'agents', /^god.*\.md$/)
    .map((file) => path.basename(file, '.md')));
  const routes = listFiles(projectRoot, 'routing', /^god.*\.yaml$/);
  const missing = new Set();

  for (const route of routes) {
    const parsed = parseRoute(projectRoot, route);
    const execution = parsed && parsed.execution ? parsed.execution : {};
    const spawns = [
      ...(Array.isArray(execution.spawns) ? execution.spawns : []),
      ...(Array.isArray(execution['secondary-spawns']) ? execution['secondary-spawns'] : []),
      ...(Array.isArray(execution['parallel-spawns']) ? execution['parallel-spawns'] : [])
    ].map((spawn) => (spawn && typeof spawn === 'object' && spawn.agent) ? spawn.agent : spawn);
    for (const spawn of spawns) {
      if (!String(spawn).startsWith('god-')) continue;
      if (!/^god-[a-z0-9-]+$/.test(String(spawn))) continue;
      if (!agents.has(spawn)) {
        missing.add(`${route}:${spawn}`);
        addCheck(
          checks,
          'agents',
          `missing-agent-${spawn}`,
          'stale',
          route,
          `${route} references missing agent ${spawn}.`,
          { spawn: 'god-auditor' }
        );
      }
    }
  }

  if (missing.size === 0) {
    addCheck(checks, 'agents', 'route-spawn-targets', 'fresh',
      'routing/', 'All routed specialist spawns resolve to agent files.');
  }

  return checks;
}

function workflowRecipeChecks(projectRoot) {
  const checks = [];
  const workflows = listFiles(projectRoot, 'workflows', /\.yaml$/);
  const recipes = listFiles(projectRoot, path.join('routing', 'recipes'), /\.yaml$/);
  const commandFlows = read(projectRoot, 'docs/command-flows.md');

  for (const workflow of workflows) {
    const text = read(projectRoot, workflow);
    const parsed = parseSimpleYaml(text);
    const hasMetadata = Boolean(parsed.apiVersion || parsed.name || parsed.metadata);
    addCheck(
      checks,
      'workflow',
      `workflow-metadata-${path.basename(workflow, '.yaml')}`,
      hasMetadata ? 'fresh' : 'stale',
      workflow,
      hasMetadata ? `${workflow} has metadata.` : `${workflow} is missing parseable metadata.`,
      { spawn: hasMetadata ? null : 'god-reconciler' }
    );
  }

  for (const recipe of recipes) {
    const text = read(projectRoot, recipe);
    const hasCommand = /\/god-[a-z0-9-]+/.test(text);
    const recipeName = path.basename(recipe, '.yaml');
    addCheck(
      checks,
      'workflow',
      `recipe-command-${recipeName}`,
      hasCommand ? 'fresh' : 'stale',
      recipe,
      hasCommand ? `${recipe} includes a slash-command route.` : `${recipe} has no slash-command route.`,
      { spawn: hasCommand ? null : 'god-reconciler' }
    );
  }

  if (workflows.length > 0) {
    addCheck(
      checks,
      'workflow',
      'command-flows-workflows',
      commandFlows.includes('/god-docs') && commandFlows.includes('/god-sync') ? 'fresh' : 'stale',
      'docs/command-flows.md',
      'docs/command-flows.md includes core docs and sync flows.',
      { spawn: 'god-reconciler' }
    );
  }
  return checks;
}

function extensionChecks(projectRoot) {
  const checks = [];
  const extRoot = path.join(projectRoot, 'extensions');
  const pkg = readJson(projectRoot, 'package.json') || {};
  if (!fs.existsSync(extRoot)) return checks;
  for (const entry of fs.readdirSync(extRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const packRel = `extensions/${entry.name}`;
    const manifestRel = `${packRel}/manifest.yaml`;
    const packageRel = `${packRel}/package.json`;
    const manifestText = read(projectRoot, manifestRel);
    const packPkg = readJson(projectRoot, packageRel);
    const parsed = manifestText ? extensions.parseManifest(manifestText).manifest : null;
    const validation = parsed ? extensions.validateManifest(parsed, pkg.version || '0.0.0') : ['missing manifest'];

    addCheck(
      checks,
      'extensions',
      `extension-manifest-${entry.name}`,
      validation.length === 0 ? 'fresh' : 'stale',
      manifestRel,
      validation.length === 0
        ? `${entry.name} manifest validates against current Godpowers.`
        : `${entry.name} manifest validation failed: ${validation.join('; ')}.`,
      { spawn: validation.length === 0 ? null : 'god-coordinator' }
    );

    if (parsed && packPkg) {
      const sameName = parsed.metadata && parsed.metadata.name === packPkg.name;
      const sameVersion = parsed.metadata && parsed.metadata.version === packPkg.version;
      const sameEngine = packPkg.peerDependencies
        && packPkg.peerDependencies.godpowers === parsed.engines.godpowers;
      addCheck(checks, 'extensions', `extension-name-${entry.name}`,
        sameName ? 'fresh' : 'stale', packageRel,
        sameName ? `${entry.name} package name matches manifest.` : `${entry.name} package name does not match manifest.`,
        { spawn: sameName ? null : 'god-coordinator' });
      addCheck(checks, 'extensions', `extension-version-${entry.name}`,
        sameVersion ? 'fresh' : 'stale', packageRel,
        sameVersion ? `${entry.name} package version matches manifest.` : `${entry.name} package version does not match manifest.`,
        { spawn: sameVersion ? null : 'god-coordinator' });
      addCheck(checks, 'extensions', `extension-engine-${entry.name}`,
        sameEngine ? 'fresh' : 'stale', packageRel,
        sameEngine ? `${entry.name} peer dependency matches manifest engine.` : `${entry.name} peer dependency does not match manifest engine.`,
        { spawn: sameEngine ? null : 'god-coordinator' });
      for (const kind of ['skills', 'agents', 'workflows']) {
        const provided = parsed.provides && Array.isArray(parsed.provides[kind])
          ? parsed.provides[kind]
          : [];
        for (const item of provided) {
          const ext = kind === 'workflows' ? 'yaml' : 'md';
          const providedRel = `${packRel}/${kind}/${item}.${ext}`;
          addCheck(checks, 'extensions', `extension-${kind}-${entry.name}-${item}`,
            exists(projectRoot, providedRel) ? 'fresh' : 'stale',
            providedRel,
            exists(projectRoot, providedRel)
              ? `${providedRel} exists.`
              : `${providedRel} is missing.`,
            { spawn: exists(projectRoot, providedRel) ? null : 'god-coordinator' });
        }
      }
    }
  }
  return checks;
}

function suiteChecks(projectRoot) {
  const checks = [];
  const pkg = readJson(projectRoot, 'package.json') || {};
  const scriptsText = releaseGateText(projectRoot, pkg);
  const roadmap = read(projectRoot, 'docs/ROADMAP.md');
  const suiteCommands = [
    'god-suite-init',
    'god-suite-status',
    'god-suite-sync',
    'god-suite-patch',
    'god-suite-release'
  ];

  addCheck(
    checks,
    'suite',
    'suite-runtime-helper',
    exists(projectRoot, 'lib/suite-state.js') ? 'fresh' : 'stale',
    'lib/suite-state.js',
    exists(projectRoot, 'lib/suite-state.js')
      ? 'Mode D suite state helper exists.'
      : 'Mode D suite state helper is missing.',
    { spawn: exists(projectRoot, 'lib/suite-state.js') ? null : 'god-coordinator' }
  );

  addCheck(
    checks,
    'suite',
    'suite-test-gate',
    scriptsText.includes('scripts/test-mode-d.js') ? 'fresh' : 'stale',
    'package.json',
    scriptsText.includes('scripts/test-mode-d.js')
      ? 'Release gate includes Mode D suite tests.'
      : 'Release gate does not include Mode D suite tests.',
    { spawn: scriptsText.includes('scripts/test-mode-d.js') ? null : 'god-coordinator' }
  );

  addCheck(
    checks,
    'suite',
    'suite-docs',
    roadmap.includes('Mode D') ? 'fresh' : 'stale',
    'docs/ROADMAP.md',
    roadmap.includes('Mode D')
      ? 'Roadmap documents Mode D suite support.'
      : 'Roadmap does not document Mode D suite support.',
    { spawn: roadmap.includes('Mode D') ? null : 'god-coordinator' }
  );

  for (const command of suiteCommands) {
    const skill = `skills/${command}.md`;
    const route = `routing/${command}.yaml`;
    const ok = exists(projectRoot, skill) && exists(projectRoot, route);
    addCheck(
      checks,
      'suite',
      `suite-command-${command}`,
      ok ? 'fresh' : 'stale',
      skill,
      ok
        ? `/${command} has skill and routing metadata.`
        : `/${command} is missing a skill or route.`,
      { spawn: ok ? null : 'god-coordinator' }
    );
  }

  return checks;
}

function dogfoodChecks(projectRoot) {
  const checks = [];
  const pkg = readJson(projectRoot, 'package.json') || {};
  const scriptsText = releaseGateText(projectRoot, pkg);
  const scenarios = [
    'fixtures/dogfood/half-migrated-planning/manifest.json',
    'fixtures/dogfood/host-degraded/manifest.json',
    'fixtures/dogfood/host-full/manifest.json',
    'fixtures/dogfood/extension-authoring/manifest.json',
    'fixtures/dogfood/suite-release-dry-run/manifest.json'
  ];

  addCheck(
    checks,
    'dogfood',
    'dogfood-runtime-helper',
    exists(projectRoot, 'lib/dogfood-runner.js') ? 'fresh' : 'stale',
    'lib/dogfood-runner.js',
    exists(projectRoot, 'lib/dogfood-runner.js')
      ? 'Dogfood runner helper exists.'
      : 'Dogfood runner helper is missing.',
    { spawn: exists(projectRoot, 'lib/dogfood-runner.js') ? null : 'god-auditor' }
  );

  addCheck(
    checks,
    'dogfood',
    'dogfood-test-gate',
    scriptsText.includes('scripts/test-dogfood-runner.js') ? 'fresh' : 'stale',
    'package.json',
    scriptsText.includes('scripts/test-dogfood-runner.js')
      ? 'Release gate includes dogfood runner tests.'
      : 'Release gate does not include dogfood runner tests.',
    { spawn: scriptsText.includes('scripts/test-dogfood-runner.js') ? null : 'god-auditor' }
  );

  for (const scenario of scenarios) {
    addCheck(
      checks,
      'dogfood',
      `dogfood-scenario-${path.basename(path.dirname(scenario))}`,
      exists(projectRoot, scenario) ? 'fresh' : 'stale',
      scenario,
      exists(projectRoot, scenario)
        ? `${scenario} exists.`
        : `${scenario} is missing.`,
      { spawn: exists(projectRoot, scenario) ? null : 'god-auditor' }
    );
  }

  return checks;
}

function releasePolicyChecks(projectRoot) {
  const checks = [];
  const docs = repoDocSync.detect(projectRoot);
  addCheck(
    checks,
    'release',
    'repo-doc-sync-fresh',
    docs.status === 'fresh' ? 'fresh' : 'stale',
    'docs/repo-doc-sync.md',
    docs.status === 'fresh'
      ? 'Repository documentation sync reports fresh.'
      : `Repository documentation sync reports ${docs.stale.length} stale checks.`,
    { spawn: docs.status === 'fresh' ? null : 'god-docs-writer' }
  );
  addCheck(
    checks,
    'release',
    'release-checklist-surface-sync',
    read(projectRoot, 'docs/RELEASE-CHECKLIST.md').includes('repo-surface-sync') ? 'fresh' : 'stale',
    'docs/RELEASE-CHECKLIST.md',
    'Release checklist references repo-surface-sync readiness.',
    { spawn: 'god-docs-writer' }
  );
  return checks;
}

function detect(projectRoot) {
  const checks = [
    ...routingChecks(projectRoot),
    ...packageChecks(projectRoot),
    ...agentChecks(projectRoot),
    ...workflowRecipeChecks(projectRoot),
    ...extensionChecks(projectRoot),
    ...suiteChecks(projectRoot),
    ...dogfoodChecks(projectRoot),
    ...releasePolicyChecks(projectRoot),
    ...routeQualitySync.detect(projectRoot).checks,
    ...recipeCoverageSync.detect(projectRoot).checks,
    ...releaseSurfaceSync.detect(projectRoot).checks
  ];
  const stale = checks.filter((check) => check.status !== 'fresh');
  const byArea = {};
  for (const check of checks) {
    if (!byArea[check.area]) byArea[check.area] = { total: 0, stale: 0 };
    byArea[check.area].total++;
    if (check.status !== 'fresh') byArea[check.area].stale++;
  }
  const spawnRecommendations = [...new Set(stale.map((check) => check.spawn).filter(Boolean))]
    .map((agent) => ({
      agent,
      reason: `Repo surface drift requires ${agent} judgment.`,
      paths: [...new Set(stale.filter((check) => check.spawn === agent).map((check) => check.path))].sort()
    }));
  return {
    status: stale.length === 0 ? 'fresh' : 'stale',
    checks,
    stale,
    byArea,
    spawnRecommendations
  };
}

function routeTemplate(command) {
  const name = command.replace(/^\//, '');
  return [
    'apiVersion: godpowers/v1',
    'kind: CommandRouting',
    'metadata:',
    `  command: ${command}`,
    '  description: ',
    '  tier: 0',
    '',
    'prerequisites:',
    '  required: []',
    '',
    'execution:',
    '  spawns: [built-in]',
    '  context: fresh',
    '  writes: []',
    '',
    'success-path:',
    '  next-recommended: /god-status',
    '',
    'failure-path:',
    '  on-error: /god-doctor',
    '',
    'endoff:',
    '  state-update: none',
    '  events: [agent.start, agent.end]',
    ''
  ].join('\n').replace('description: ', `description: Route metadata for /${name}`);
}

function applySafeFixes(projectRoot, report, opts = {}) {
  const applied = [];
  if (!opts.fixRouting) return applied;
  for (const check of report.stale) {
    if (check.area !== 'routing' || !check.safeFix || !check.path.startsWith('routing/')) continue;
    if (exists(projectRoot, check.path)) continue;
    const command = `/${path.basename(check.path, '.yaml')}`;
    write(projectRoot, check.path, routeTemplate(command));
    applied.push({ path: check.path, check: check.id });
  }
  return applied;
}

function appendLog(projectRoot, before, after, applied) {
  const now = new Date().toISOString();
  const lines = [];
  if (exists(projectRoot, LOG_PATH)) {
    lines.push(read(projectRoot, LOG_PATH).replace(/\s*$/, ''));
    lines.push('');
  } else {
    lines.push('# Repo Surface Sync Log');
    lines.push('');
    lines.push('- [DECISION] This file records structural repository surface sync checks run by Godpowers.');
    lines.push('- [DECISION] Detection is read-only by default and safe fixes require explicit fix options.');
    lines.push('');
  }
  lines.push(`## ${now}`);
  lines.push('');
  lines.push(`- [DECISION] Repo surface sync status before apply was ${before.status}.`);
  lines.push(`- [DECISION] Repo surface sync status after apply is ${after.status}.`);
  if (applied.length === 0) {
    lines.push('- [DECISION] No structural repository surface files were changed.');
  } else {
    for (const item of applied) {
      lines.push(`- [DECISION] Created or refreshed ${item.path} for ${item.check}.`);
    }
  }
  for (const rec of after.spawnRecommendations) {
    lines.push(`- [HYPOTHESIS] ${rec.agent} should review ${rec.paths.join(', ')}.`);
  }
  lines.push('');
  write(projectRoot, LOG_PATH, lines.join('\n'));
}

function run(projectRoot, opts = {}) {
  const before = detect(projectRoot);
  const applied = applySafeFixes(projectRoot, before, opts);
  const after = detect(projectRoot);
  if (opts.log !== false) appendLog(projectRoot, before, after, applied);
  return {
    before,
    after,
    applied,
    logPath: opts.log === false ? null : LOG_PATH
  };
}

function summary(report) {
  if (report.status === 'fresh') return 'fresh';
  return `${report.stale.length} stale across ${Object.keys(report.byArea).length} areas`;
}

module.exports = {
  LOG_PATH,
  REQUIRED_PACKAGE_CHECKS,
  REQUIRED_PACKAGE_FILE_ENTRIES,
  detect,
  run,
  summary,
  routeTemplate
};
