#!/usr/bin/env node
/**
 * Dependency-free static checks for release-sensitive JavaScript surfaces.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CHECK_DIRS = ['bin', 'lib', 'scripts', 'tests', 'packages'];

let passed = 0;
let failed = 0;

function pass(name) {
  console.log(`  + ${name}`);
  passed++;
}

function fail(name, message) {
  console.error(`  x ${name}: ${message}`);
  failed++;
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

function walkMatching(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkMatching(full, predicate, out);
    } else if (entry.isFile() && predicate(full)) {
      out.push(full);
    }
  }
  return out;
}

function test(name, fn) {
  try {
    fn();
    pass(name);
  } catch (e) {
    fail(name, e.message);
  }
}

console.log('\n  Static checks\n');

const jsFiles = CHECK_DIRS.flatMap(dir => walk(path.join(ROOT, dir))).sort();

test('JavaScript files parse with node --check', () => {
  for (const file of jsFiles) {
    const result = spawnSync(process.execPath, ['--check', file], {
      cwd: ROOT,
      encoding: 'utf8'
    });
    if (result.status !== 0) {
      throw new Error(`${path.relative(ROOT, file)} failed syntax check\n${result.stderr || result.stdout}`);
    }
  }
});

test('package test script delegates to scripts/run-tests.js', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  if (pkg.scripts.test !== 'node scripts/run-tests.js') {
    throw new Error(`unexpected test script: ${pkg.scripts.test}`);
  }
});

test('full test runner includes YAML parser coverage', () => {
  const runner = require('./run-tests');
  const commands = runner.TEST_COMMANDS.map(([command, args]) => [command, ...args].join(' '));
  if (!commands.some(command => command.includes('scripts/test-yaml-parser.js'))) {
    throw new Error('scripts/test-yaml-parser.js is missing from TEST_COMMANDS');
  }
  if (!commands.some(command => command.includes('scripts/test-frontmatter.js'))) {
    throw new Error('scripts/test-frontmatter.js is missing from TEST_COMMANDS');
  }
  if (!commands.some(command => command.includes('scripts/test-agent-refs.js'))) {
    throw new Error('scripts/test-agent-refs.js is missing from TEST_COMMANDS');
  }
  if (!commands.some(command => command.includes('scripts/test-skill-source-sync.js'))) {
    throw new Error('scripts/test-skill-source-sync.js is missing from TEST_COMMANDS');
  }
  if (!commands.some(command => command.includes('scripts/test-cli-dispatch.js'))) {
    throw new Error('scripts/test-cli-dispatch.js is missing from TEST_COMMANDS');
  }
  if (!commands.some(command => command.includes('scripts/test-gate.js'))) {
    throw new Error('scripts/test-gate.js is missing from TEST_COMMANDS');
  }
  if (!commands.some(command => command.includes('scripts/test-state-views.js'))) {
    throw new Error('scripts/test-state-views.js is missing from TEST_COMMANDS');
  }
  if (!commands.some(command => command.includes('scripts/test-state-advance.js'))) {
    throw new Error('scripts/test-state-advance.js is missing from TEST_COMMANDS');
  }
  if (!commands.some(command => command.includes('--workspace @godpowers/mcp test'))) {
    throw new Error('@godpowers/mcp protocol test is missing from TEST_COMMANDS');
  }
});

test('install file helpers stay outside bin/install.js', () => {
  const installer = fs.readFileSync(path.join(ROOT, 'bin', 'install.js'), 'utf8');
  if (!installer.includes("require('../lib/installer-core')")) {
    throw new Error('bin/install.js does not delegate installer core behavior');
  }
  if (/function\s+copyRecursive\s*\(/.test(installer)) {
    throw new Error('copyRecursive should live in lib/installer-files.js');
  }
  if (installer.split('\n').length > 350) {
    throw new Error('bin/install.js should remain a thin CLI entry point');
  }
});

test('frontmatter parsing stays in shared helper', () => {
  const offenders = jsFiles
    .filter(file => path.relative(ROOT, file) !== 'lib/frontmatter.js')
    .filter(file => {
      const text = fs.readFileSync(file, 'utf8');
      return /function\s+parse(?:Agent)?Frontmatter\s*\(/.test(text) ||
        /const\s+parse(?:Agent)?Frontmatter\s*=\s*\([^)]*\)\s*=>\s*\{/.test(text) ||
        /match\(\s*\/\^---\\n\(\[\\s\\S\]\*\?\)\\n---\//.test(text);
    });
  if (offenders.length > 0) {
    throw new Error(`inline frontmatter parsers in ${offenders.map(file => path.relative(ROOT, file)).join(', ')}`);
  }
});

test('test files use the shared harness', () => {
  const offenders = walk(path.join(ROOT, 'scripts'))
    .filter(file => /scripts\/test-.*\.js$/.test(file) && !file.endsWith('test-harness.js'))
    .filter(file => /let passed = 0|function\s+test\s*\(/.test(fs.readFileSync(file, 'utf8')));
  if (offenders.length > 0) {
    throw new Error(`duplicated harness in ${offenders.map(file => path.relative(ROOT, file)).join(', ')}`);
  }
});

test('async file APIs exist on load-bearing modules', () => {
  const state = require('../lib/state');
  const intent = require('../lib/intent');
  const workflows = require('../lib/workflow-runner');
  const gate = require('../lib/gate');
  for (const [name, fn] of [
    ['state.readAsync', state.readAsync],
    ['state.writeAsync', state.writeAsync],
    ['intent.readAsync', intent.readAsync],
    ['workflow.writePlanAsync', workflows.writePlanAsync],
    ['workflow.readPlanAsync', workflows.readPlanAsync],
    ['gate.checkAsync', gate.checkAsync]
  ]) {
    if (typeof fn !== 'function') throw new Error(`${name} missing`);
  }
});

test('tier skills delegate verification to executable gate', () => {
  const tiers = ['prd', 'design', 'arch', 'roadmap', 'stack', 'repo', 'build', 'harden'];
  const missing = [];
  for (const tier of tiers) {
    const rel = `skills/god-${tier}.md`;
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const verification = text.match(/## Verification\n([\s\S]*?)(?=\n## |\n# |\s*$)/);
    if (!verification || !verification[1].includes(`npx godpowers gate --tier=${tier} --project=.`)) {
      missing.push(rel);
    }
  }
  if (missing.length > 0) {
    throw new Error(`missing gate verification in ${missing.join(', ')}`);
  }
});

test('tier routes declare executable gate commands', () => {
  const tiers = ['prd', 'design', 'arch', 'roadmap', 'stack', 'repo', 'build', 'harden'];
  const missing = [];
  for (const tier of tiers) {
    const rel = `routing/god-${tier}.yaml`;
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    if (!text.includes(`gate-command: npx godpowers gate --tier=${tier} --project=.`)) {
      missing.push(rel);
    }
  }
  if (missing.length > 0) {
    throw new Error(`missing gate-command route metadata in ${missing.join(', ')}`);
  }
});

test('routing prerequisites use state initialized predicate instead of PROGRESS.md file checks', () => {
  const routingDir = path.join(ROOT, 'routing');
  const recipeDir = path.join(routingDir, 'recipes');
  const targets = [
    ...fs.readdirSync(routingDir)
      .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'))
      .map(file => path.join(routingDir, file)),
    ...fs.readdirSync(recipeDir)
      .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'))
      .map(file => path.join(recipeDir, file)),
    path.join(ROOT, 'scripts', 'gen-routing.js'),
    path.join(ROOT, 'scripts', 'gen-recipes.js')
  ];
  const offenders = targets.filter(file => (
    fs.readFileSync(file, 'utf8').includes('file:.godpowers/PROGRESS.md')
  ));
  if (offenders.length > 0) {
    throw new Error(`PROGRESS.md file route predicates in ${offenders.map(file => path.relative(ROOT, file)).join(', ')}`);
  }
});

test('command skills do not mutate PROGRESS.md directly', () => {
  const skillsDir = path.join(ROOT, 'skills');
  const writerPatterns = [
    /\b(?:Update|update|Record|record|Mark|mark|Write|write|Append|append|Truncate|truncate)\s+`?(?:\.godpowers\/)?PROGRESS\.md`?/,
    /`?(?:\.godpowers\/)?PROGRESS\.md`?\s+(?:updates?|writes?|mutations?|status\s*=|status\b)/i,
    /\bwrites?\s+[^.\n]*\bPROGRESS\.md\b/i
  ];
  const offenders = [];
  for (const file of fs.readdirSync(skillsDir).filter(name => name.endsWith('.md')).sort()) {
    const full = path.join(skillsDir, file);
    const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (writerPatterns.some(pattern => pattern.test(line))) {
        offenders.push(`skills/${file}:${index + 1}`);
      }
    });
  }
  if (offenders.length > 0) {
    throw new Error(`direct PROGRESS.md writer instructions in ${offenders.join(', ')}`);
  }
});

test('command skills treat PROGRESS.md as generated or legacy fallback only', () => {
  const skillsDir = path.join(ROOT, 'skills');
  const readPattern = /\b(?:Read|read|Check|check|Verify|verify|Detect|detect|derive|derives|re-derive|re-derives|re-derived|auto-detect|auto-detects)\b.*`?(?:\.godpowers\/)?PROGRESS\.md`?/;
  const allowedContext = /\b(?:fallback|legacy|generated|human-readable view|human view|migration|migrate|import|view)\b/i;
  const offenders = [];
  for (const file of fs.readdirSync(skillsDir).filter(name => name.endsWith('.md')).sort()) {
    const full = path.join(skillsDir, file);
    const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (readPattern.test(line) && !allowedContext.test(line)) {
        offenders.push(`skills/${file}:${index + 1}`);
      }
    });
  }
  if (offenders.length > 0) {
    throw new Error(`PROGRESS.md authority reads in ${offenders.join(', ')}`);
  }
});

test('state-backed gates do not require markdown STATE.md artifacts', () => {
  const artifactMap = require('../lib/artifact-map');
  const expected = {
    design: { tierKey: 'tier-1', subStepKey: 'design' },
    build: { tierKey: 'tier-2', subStepKey: 'build' }
  };
  const offenders = [];
  for (const [tier, step] of Object.entries(expected)) {
    const artifacts = artifactMap.requiredArtifactsForTier(tier) || [];
    for (const artifact of artifacts) {
      if (/\.godpowers\/[^/]+\/STATE\.md$/.test(artifact.path)) {
        offenders.push(`${tier}:${artifact.path}`);
      }
    }
    const actual = artifactMap.stateStepForTier(tier);
    if (!actual || actual.tierKey !== step.tierKey || actual.subStepKey !== step.subStepKey) {
      offenders.push(`${tier}:missing-state-step`);
    }
  }
  if (offenders.length > 0) {
    throw new Error(`markdown state gate authority in ${offenders.join(', ')}`);
  }
});

test('state view owner covers Godpowers-owned STATE.md views', () => {
  const stateViews = require('../lib/state-views');
  const expected = {
    design: '.godpowers/design/STATE.md',
    build: '.godpowers/build/STATE.md',
    deploy: '.godpowers/deploy/STATE.md',
    observe: '.godpowers/observe/STATE.md',
    launch: '.godpowers/launch/STATE.md'
  };
  const missing = [];
  for (const [step, relPath] of Object.entries(expected)) {
    if (!stateViews.STATE_VIEW_PATHS || stateViews.STATE_VIEW_PATHS[step] !== relPath) {
      missing.push(`${step}:${relPath}`);
    }
  }
  if (missing.length > 0) {
    throw new Error(`missing generated state view ownership for ${missing.join(', ')}`);
  }
});

test('route and workflow handoffs use state.json instead of generated state views', () => {
  const generatedStateView = /\.godpowers\/(?:design|build|deploy|observe|launch)\/STATE\.md/;
  const files = [
    ...walkMatching(path.join(ROOT, 'routing'), file => /\.ya?ml$/.test(file)),
    ...walkMatching(path.join(ROOT, 'workflows'), file => /\.ya?ml$/.test(file)),
    path.join(ROOT, 'scripts', 'gen-routing.js')
  ];
  const offenders = [];
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (generatedStateView.test(line)) {
        offenders.push(`${path.relative(ROOT, file)}:${index + 1}`);
      }
    });
  }
  if (offenders.length > 0) {
    throw new Error(`generated state view route handoffs in ${offenders.join(', ')}`);
  }
});

test('runtime modules read generated STATE.md views only through the view owner', () => {
  const generatedStateView = /\.godpowers\/(?:design|build|deploy|observe|launch)\/STATE\.md/;
  const allowed = new Set([
    'lib/state-views.js',
    'scripts/static-check.js',
    'scripts/test-gate.js',
    'scripts/test-state-advance.js',
    'scripts/test-state-views.js'
  ]);
  const files = [
    ...walkMatching(path.join(ROOT, 'lib'), file => file.endsWith('.js')),
    ...walkMatching(path.join(ROOT, 'scripts'), file => file.endsWith('.js'))
  ];
  const offenders = [];
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    if (allowed.has(rel)) continue;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (generatedStateView.test(line)) {
        offenders.push(`${rel}:${index + 1}`);
      }
    });
  }
  if (offenders.length > 0) {
    throw new Error(`direct runtime generated STATE.md reads in ${offenders.join(', ')}`);
  }
});

test('prompts do not direct-edit generated STATE.md views', () => {
  const generatedStateView = /`?(?:\.godpowers\/)?(?:design|build|deploy|observe|launch)\/STATE\.md`?/;
  const directAction = /\b(?:Write|write|Update|update|Append|append|Record|record|Mark|mark|Modify|modify)\b/;
  const allowedGeneratedContext = /\b(?:generated|regenerate|regenerates|refreshes|state-views\.js|view|views|checksum warning|managed)\b/i;
  const files = [
    path.join(ROOT, 'SKILL.md'),
    ...walkMatching(path.join(ROOT, 'skills'), file => file.endsWith('.md')),
    ...walkMatching(path.join(ROOT, 'agents'), file => file.endsWith('.md'))
  ];
  const offenders = [];
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (generatedStateView.test(line) && directAction.test(line) && !allowedGeneratedContext.test(line)) {
        offenders.push(`${path.relative(ROOT, file)}:${index + 1}`);
      }
    });
  }
  if (offenders.length > 0) {
    throw new Error(`direct generated STATE.md edit prompts in ${offenders.join(', ')}`);
  }
});

test('public runtime modules expose JSDoc type contracts', () => {
  const modules = [
    'lib/state.js',
    'lib/intent.js',
    'lib/workflow-runner.js',
    'lib/agent-refs.js',
    'lib/installer-core.js'
  ];
  const missing = modules.filter((rel) => {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    return !/@typedef/.test(text);
  });
  if (missing.length > 0) {
    throw new Error(`missing @typedef in ${missing.join(', ')}`);
  }
});

test('god-mode delegates long-form runbook content', () => {
  const skill = fs.readFileSync(path.join(ROOT, 'skills', 'god-mode.md'), 'utf8');
  const runbook = path.join(ROOT, 'references', 'orchestration', 'GOD-MODE-RUNBOOK.md');
  if (skill.split('\n').length > 220) {
    throw new Error('skills/god-mode.md should stay as a concise dispatch contract');
  }
  if (!fs.existsSync(runbook)) {
    throw new Error('God Mode runbook reference missing');
  }
});

test('agent prompts delegate oversized runbook content', () => {
  const maxBytes = 20000;
  const agentsDir = path.join(ROOT, 'agents');
  const agentFiles = fs.readdirSync(agentsDir)
    .filter(file => /^god-.*\.md$/.test(file))
    .map(file => path.join(agentsDir, file));
  const oversized = agentFiles.filter(file => fs.statSync(file).size > maxBytes);
  if (oversized.length > 0) {
    throw new Error(`oversized agent prompts: ${oversized.map(file => path.relative(ROOT, file)).join(', ')}`);
  }

  const orchestrator = fs.readFileSync(path.join(ROOT, 'agents', 'god-orchestrator.md'), 'utf8');
  const runbook = path.join(ROOT, 'references', 'orchestration', 'GOD-ORCHESTRATOR-RUNBOOK.md');
  if (!fs.existsSync(runbook)) {
    throw new Error('God orchestrator runbook reference missing');
  }
  if (!orchestrator.includes('GOD-ORCHESTRATOR-RUNBOOK.md')) {
    throw new Error('god-orchestrator must point to its delegated runbook');
  }
});

test('dashboard contract stays shared between status and next', () => {
  const contract = path.join(ROOT, 'references', 'shared', 'DASHBOARD-CONTRACT.md');
  if (!fs.existsSync(contract)) {
    throw new Error('shared dashboard contract missing');
  }
  for (const rel of ['skills/god-status.md', 'skills/god-next.md']) {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    if (!text.includes('DASHBOARD-CONTRACT.md')) {
      throw new Error(`${rel} does not reference the shared dashboard contract`);
    }
    if (text.split('\n').length > 180) {
      throw new Error(`${rel} should stay concise after dashboard delegation`);
    }
  }
});

test('skills and agents use shared locking pointer without inline sections', () => {
  const locking = path.join(ROOT, 'references', 'shared', 'LOCKING.md');
  if (!fs.existsSync(locking)) {
    throw new Error('shared locking reference missing');
  }

  const markdownFiles = ['skills', 'agents']
    .flatMap(dir => walkMatching(path.join(ROOT, dir), file => file.endsWith('.md')));
  const sectionOffenders = markdownFiles.filter(file => /^#{2,}\s+Locking\b/m.test(fs.readFileSync(file, 'utf8')));
  if (sectionOffenders.length > 0) {
    throw new Error(`inline locking sections in ${sectionOffenders.map(file => path.relative(ROOT, file)).join(', ')}`);
  }

  const pointer = 'Locking: See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.';
  const mutatingSkills = [
    'god-arch.md',
    'god-build.md',
    'god-deploy.md',
    'god-design.md',
    'god-feature.md',
    'god-harden.md',
    'god-hotfix.md',
    'god-launch.md',
    'god-link.md',
    'god-migrate.md',
    'god-observe.md',
    'god-prd.md',
    'god-redo.md',
    'god-refactor.md',
    'god-repair.md',
    'god-repo.md',
    'god-restore.md',
    'god-roadmap.md',
    'god-rollback.md',
    'god-scan.md',
    'god-skip.md',
    'god-stack.md',
    'god-story-build.md',
    'god-story-close.md',
    'god-story.md',
    'god-sync.md',
    'god-undo.md',
    'god-update-deps.md',
    'god-upgrade.md'
  ];
  const missingPointers = mutatingSkills
    .map(file => path.join(ROOT, 'skills', file))
    .filter(file => !fs.readFileSync(file, 'utf8').includes(pointer));
  if (missingPointers.length > 0) {
    throw new Error(`missing shared locking pointer in ${missingPointers.map(file => path.relative(ROOT, file)).join(', ')}`);
  }
});

test('release gate enforces lib coverage floor', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  if (!pkg.scripts['coverage:lib'] || !pkg.scripts['coverage:lib'].includes('--check-coverage --lines 90')) {
    throw new Error('coverage:lib must enforce a 90 percent line floor');
  }
  if (!pkg.scripts['coverage:lib'].includes('--include=lib/**/*.js')) {
    throw new Error('coverage:lib must scope the floor to lib/**/*.js');
  }
  if (!pkg.scripts['release:check'].includes('npm run coverage:lib')) {
    throw new Error('release:check must run coverage:lib');
  }
  if (!pkg.scripts['release:check'].includes('npm run pack:mcp:check')) {
    throw new Error('release:check must run @godpowers/mcp package checks');
  }
});

test('MCP companion stays outside main package dependencies', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) {
    throw new Error('main package must not add production dependencies for MCP');
  }
  if (!Array.isArray(pkg.workspaces) || !pkg.workspaces.includes('packages/mcp')) {
    throw new Error('packages/mcp workspace missing');
  }
  const mcpPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', 'mcp', 'package.json'), 'utf8'));
  if (mcpPkg.name !== '@godpowers/mcp') {
    throw new Error(`unexpected MCP package name: ${mcpPkg.name}`);
  }
  if (!mcpPkg.dependencies || !mcpPkg.dependencies['@modelcontextprotocol/sdk']) {
    throw new Error('@godpowers/mcp must own the MCP SDK dependency');
  }
});

test('publish workflow includes MCP companion package', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'publish.yml'), 'utf8');
  if (Array.isArray(pkg.workspaces) && pkg.workspaces.includes('packages/mcp')) {
    if (!workflow.includes('npm publish --workspace @godpowers/mcp --provenance --access public')) {
      throw new Error('publish.yml must publish @godpowers/mcp when the workspace exists');
    }
  }
});

test('skill metadata source of truth is executable', () => {
  const surface = require('../lib/skill-surface');
  const commands = surface.commandNames();
  if (!commands.includes('/god-mode') || commands.length < 100) {
    throw new Error(`unexpected command surface: ${commands.length}`);
  }
});

console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
