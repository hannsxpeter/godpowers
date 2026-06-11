#!/usr/bin/env node
/**
 * Dependency-free static checks for release-sensitive JavaScript surfaces.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CHECK_DIRS = ['bin', 'lib', 'scripts', 'tests'];
const TIER_GATE_SKILLS = {
  'skills/god-prd.md': 'prd',
  'skills/god-design.md': 'design',
  'skills/god-arch.md': 'arch',
  'skills/god-roadmap.md': 'roadmap',
  'skills/god-stack.md': 'stack',
  'skills/god-repo.md': 'repo',
  'skills/god-build.md': 'build',
  'skills/god-harden.md': 'harden'
};

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
});

test('install file helpers stay outside bin/install.js', () => {
  const installer = fs.readFileSync(path.join(ROOT, 'bin', 'install.js'), 'utf8');
  if (!installer.includes("require('../lib/installer-core')")) {
    throw new Error('bin/install.js does not delegate installer core behavior');
  }
  if (!installer.includes("require('../lib/cli-dispatch')")) {
    throw new Error('bin/install.js does not delegate local command dispatch');
  }
  if (/function\s+copyRecursive\s*\(/.test(installer)) {
    throw new Error('copyRecursive should live in lib/installer-files.js');
  }
  if (installer.split('\n').length > 350) {
    throw new Error('bin/install.js should remain a thin CLI entry point');
  }
});

test('tier skill verification blocks on executable gates', () => {
  for (const [rel, tier] of Object.entries(TIER_GATE_SKILLS)) {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const match = text.match(/## Verification\n\n([\s\S]*?)(?=\n## |\n# |\s*$)/);
    if (!match) throw new Error(`${rel} missing Verification section`);
    const section = match[1];
    const gateCommand = `npx godpowers gate --tier=${tier} --project=.`;
    if (!section.includes(gateCommand)) {
      throw new Error(`${rel} Verification does not reference ${gateCommand}`);
    }
    if (!/non-zero exit|nonzero exit/i.test(section)) {
      throw new Error(`${rel} Verification does not block on non-zero exit`);
    }
  }
});

test('tier routing standards declare executable gate commands', () => {
  for (const [skillRel, tier] of Object.entries(TIER_GATE_SKILLS)) {
    const routeRel = skillRel.replace('skills/', 'routing/').replace('.md', '.yaml');
    const text = fs.readFileSync(path.join(ROOT, routeRel), 'utf8');
    const gateCommand = `gate-command: npx godpowers gate --tier=${tier} --project=.`;
    if (!text.includes(gateCommand)) {
      throw new Error(`${routeRel} missing ${gateCommand}`);
    }
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
  for (const [name, fn] of [
    ['state.readAsync', state.readAsync],
    ['state.writeAsync', state.writeAsync],
    ['intent.readAsync', intent.readAsync],
    ['workflow.writePlanAsync', workflows.writePlanAsync],
    ['workflow.readPlanAsync', workflows.readPlanAsync]
  ]) {
    if (typeof fn !== 'function') throw new Error(`${name} missing`);
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

test('mutating skills use shared locking pointer', () => {
  const locking = path.join(ROOT, 'references', 'shared', 'LOCKING.md');
  if (!fs.existsSync(locking)) {
    throw new Error('shared locking reference missing');
  }
  const offenders = fs.readdirSync(path.join(ROOT, 'skills'))
    .filter(file => file.endsWith('.md'))
    .map(file => path.join(ROOT, 'skills', file))
    .filter(file => {
      const text = fs.readFileSync(file, 'utf8');
      const match = text.match(/## Locking\n\n([\s\S]*?)(?=\n## |\n# |\s*$)/);
      return match && match[1].trim() !== 'See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.';
    });
  if (offenders.length > 0) {
    throw new Error(`inline locking blocks in ${offenders.map(file => path.relative(ROOT, file)).join(', ')}`);
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
