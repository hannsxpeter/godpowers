/**
 * Dogfood runner.
 *
 * Executes deterministic messy-repo scenarios against the Godpowers runtime.
 * The runner uses fixtures so release gates can verify migrations, sync-back,
 * host guarantees, package surfaces, extension authoring, and suite planning
 * without touching real user projects.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const planningSystems = require('./planning-systems');
const sourceSync = require('./source-sync');
const hostCapabilities = require('./host-capabilities');
const extensionAuthoring = require('./extension-authoring');
const suiteState = require('./suite-state');

const FIXTURE_ROOT = path.join(__dirname, '..', 'fixtures', 'dogfood');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === 'manifest.json') continue;
    const source = path.join(src, entry.name);
    const target = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(source, target);
    else fs.copyFileSync(source, target);
  }
}

function listScenarios(root = FIXTURE_ROOT) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = path.join(root, entry.name);
      const manifest = readJson(path.join(dir, 'manifest.json'));
      return { id: entry.name, dir, manifest };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

function prepareScenario(scenario) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `godpowers-dogfood-${scenario.id}-`));
  copyDir(scenario.dir, tmp);
  return tmp;
}

function check(condition, id, message, details = {}) {
  return {
    id,
    status: condition ? 'pass' : 'fail',
    message,
    details
  };
}

function runMigrationScenario(projectRoot, manifest) {
  const detection = planningSystems.detect(projectRoot);
  const report = { detection, importResult: null, syncResult: null };
  if (manifest.actions && manifest.actions.includes('import-planning-context')) {
    report.importResult = planningSystems.importPlanningContext(projectRoot, { detection });
  }
  if (manifest.actions && manifest.actions.includes('sync-back')) {
    report.syncResult = sourceSync.run(projectRoot);
  }
  return report;
}

function runExtensionScenario(projectRoot, manifest) {
  const packName = manifest.extensionName || '@godpowers/dogfood-pack';
  const target = path.join(projectRoot, 'extension-out');
  return extensionAuthoring.scaffold(target, {
    name: packName,
    version: '0.1.0',
    skill: 'god-dogfood-extension',
    agent: 'god-dogfood-agent',
    workflow: 'dogfood-workflow',
    godpowersRange: '>=1.6.0'
  });
}

function runSuiteScenario(projectRoot, manifest) {
  const plan = suiteState.planRelease(projectRoot, manifest.repo || 'repo-a', manifest.version || '1.2.4');
  return plan;
}

function runScenario(scenario, opts = {}) {
  const projectRoot = opts.projectRoot || prepareScenario(scenario);
  const manifest = scenario.manifest;
  const checks = [];
  const context = {};

  if (manifest.kind === 'planning-migration') {
    context.migration = runMigrationScenario(projectRoot, manifest);
    const detected = context.migration.detection.systems.map((system) => system.id);
    for (const id of manifest.expectedSystems || []) {
      checks.push(check(detected.includes(id), `detect-${id}`, `Detected ${id}.`, { detected }));
    }
    for (const relPath of manifest.expectedFiles || []) {
      checks.push(check(fs.existsSync(path.join(projectRoot, relPath)), `file-${relPath}`, `${relPath} exists.`));
    }
  }

  if (manifest.kind === 'host-capabilities') {
    context.host = hostCapabilities.detect(projectRoot, {
      homeDir: path.join(projectRoot, 'home'),
      env: { SHELL: '/bin/zsh', CODEX_HOME: path.join(projectRoot, 'home', '.codex') },
      agentSpawn: manifest.activeAgentSpawn === true,
      agentSpawnEvidence: manifest.agentSpawnEvidence || null
    });
    checks.push(check(context.host.level === manifest.expectedLevel,
      'host-level',
      `Host capability level is ${manifest.expectedLevel}.`,
      { level: context.host.level }));
  }

  if (manifest.kind === 'extension-authoring') {
    context.extension = runExtensionScenario(projectRoot, manifest);
    for (const relPath of manifest.expectedFiles || []) {
      checks.push(check(fs.existsSync(path.join(context.extension.path, relPath)),
        `extension-file-${relPath}`,
        `Extension file ${relPath} exists.`));
    }
    checks.push(check(context.extension.validation.length === 0,
      'extension-validation',
      'Scaffolded extension validates.',
      { validation: context.extension.validation }));
  }

  if (manifest.kind === 'suite-release') {
    context.suite = runSuiteScenario(projectRoot, manifest);
    checks.push(check(context.suite.mode === 'dry-run',
      'suite-dry-run',
      'Suite release plan is dry-run mode.'));
    checks.push(check(context.suite.impacted.length === (manifest.expectedImpacted || 0),
      'suite-impact-count',
      `Suite release impact count is ${manifest.expectedImpacted || 0}.`,
      { impacted: context.suite.impacted }));
  }

  const failed = checks.filter((item) => item.status !== 'pass');
  return {
    id: scenario.id,
    name: manifest.name || scenario.id,
    projectRoot,
    status: failed.length === 0 ? 'pass' : 'fail',
    checks,
    context
  };
}

function runAll(opts = {}) {
  const scenarios = listScenarios(opts.fixtureRoot);
  const results = scenarios.map((scenario) => runScenario(scenario, opts));
  const failed = results.filter((result) => result.status !== 'pass');
  return {
    status: failed.length === 0 ? 'pass' : 'fail',
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    results
  };
}

function render(report) {
  const lines = [];
  lines.push('Godpowers Dogfood Report');
  lines.push('');
  lines.push(`Status: ${report.status}`);
  lines.push(`Scenarios: ${report.passed} passed, ${report.failed} failed, ${report.total} total`);
  for (const result of report.results) {
    lines.push('');
    lines.push(`## ${result.name}`);
    lines.push(`Status: ${result.status}`);
    for (const item of result.checks) {
      lines.push(`- [${item.status.toUpperCase()}] ${item.message}`);
    }
  }
  return lines.join('\n');
}

module.exports = {
  FIXTURE_ROOT,
  listScenarios,
  runScenario,
  runAll,
  render
};
