#!/usr/bin/env node
/**
 * Dependency-free static checks for release-sensitive JavaScript surfaces.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CHECK_DIRS = ['bin', 'lib', 'scripts', 'tests'];

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

test('skill metadata source of truth is executable', () => {
  const surface = require('../lib/skill-surface');
  const commands = surface.commandNames();
  if (!commands.includes('/god-mode') || commands.length < 100) {
    throw new Error(`unexpected command surface: ${commands.length}`);
  }
});

console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
