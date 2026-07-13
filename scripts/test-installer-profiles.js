#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const profiles = require('../lib/install-profiles');
const { parseArgs } = require('../lib/installer-args');
const { test, assert, report } = require('./test-harness');

const ROOT = path.resolve(__dirname, '..');
const INSTALLER = path.join(ROOT, 'bin', 'install.js');

test('parseArgs accepts --profile and --minimal', () => {
  assert(parseArgs(['node', 'bin']).profile === 'core');
  assert(parseArgs(['node', 'bin', '--profile=core']).profile === 'core');
  assert(parseArgs(['node', 'bin', '--profile', 'builder']).profile === 'builder');
  assert(parseArgs(['node', 'bin', '--minimal']).profile === 'core');
});

test('omitted installer profile resolves to core', () => {
  assert(profiles.normalizeProfiles().join(',') === 'core');
  assert(profiles.normalizeProfiles('').join(',') === 'core');
  assert(profiles.describeProfiles().startsWith('core:'), 'default profile description should be core');
});

test('selectedSkillNames limits core surface', () => {
  const names = fs.readdirSync(path.join(ROOT, 'skills'))
    .filter(file => file.endsWith('.md'))
    .map(file => path.basename(file, '.md'));
  const selected = profiles.selectedSkillNames('core', names);
  for (const name of [
    'god',
    'god-first-run',
    'god-demo',
    'god-init',
    'god-plan',
    'god-build',
    'god-fix',
    'god-ship',
    'god-sync',
    'god-undo',
    'god-status',
    'god-surface',
    'god-mode'
  ]) {
    assert(selected.has(name), `core missing ${name}`);
  }
  assert(selected.size >= 12 && selected.size <= 15, `core size should stay near 14, got ${selected.size}`);
  assert(!selected.has('god-prd'), 'core should route planning through god-plan');
  assert(!selected.has('god-locate'), 'core should fold locate into god-status flags');
  assert(!selected.has('god-lifecycle'), 'core should fold lifecycle into god-status flags');
  assert(!selected.has('god-suite-release'), 'core should not include suite release');
});

test('selectedSkillNames includes extension authoring in maintainer surface', () => {
  const names = fs.readdirSync(path.join(ROOT, 'skills'))
    .filter(file => file.endsWith('.md'))
    .map(file => path.basename(file, '.md'));
  const selected = profiles.selectedSkillNames('maintainer', names);
  assert(selected.has('god-extension-scaffold'), 'maintainer missing god-extension-scaffold');
  assert(selected.has('god-test-extension'), 'maintainer missing god-test-extension');
  assert(selected.has('god-extension-add'), 'maintainer missing god-extension-add');
});

test('deprecated roadmap check stays out of non-full profiles', () => {
  const names = fs.readdirSync(path.join(ROOT, 'skills'))
    .filter(file => file.endsWith('.md'))
    .map(file => path.basename(file, '.md'));
  for (const profile of ['core', 'builder', 'maintainer', 'suite']) {
    const selected = profiles.selectedSkillNames(profile, names);
    assert(!selected.has('god-roadmap-check'), `${profile} should not install deprecated roadmap check`);
  }
  assert(profiles.selectedSkillNames('full', names).has('god-roadmap-check'),
    'full profile should retain deprecated roadmap check for compatibility');
});

test('installer profile core installs fewer commands and writes marker', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-profile-core-'));
  execFileSync('node', [INSTALLER, '--codex', '--global', '--profile=core'], {
    env: { ...process.env, HOME: home },
    encoding: 'utf8',
    timeout: 30_000
  });
  const skillsDir = path.join(home, '.codex', 'skills');
  assert(fs.existsSync(path.join(skillsDir, 'god-build', 'SKILL.md')), 'god-build missing');
  assert(fs.existsSync(path.join(skillsDir, 'god-first-run', 'SKILL.md')), 'god-first-run missing');
  assert(fs.existsSync(path.join(skillsDir, 'god-status', 'SKILL.md')), 'god-status missing');
  assert(fs.existsSync(path.join(skillsDir, 'god-surface', 'SKILL.md')), 'god-surface missing');
  assert(!fs.existsSync(path.join(skillsDir, 'god-suite-release', 'SKILL.md')),
    'suite command should not be installed in core profile');
  assert(fs.readFileSync(path.join(home, '.codex', 'GODPOWERS_PROFILE'), 'utf8') === 'core',
    'profile marker mismatch');
  fs.rmSync(home, { recursive: true, force: true });
});

test('installer omitted profile installs core and writes marker', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-profile-default-'));
  execFileSync('node', [INSTALLER, '--codex', '--global'], {
    env: { ...process.env, HOME: home },
    encoding: 'utf8',
    timeout: 30_000
  });
  const skillsDir = path.join(home, '.codex', 'skills');
  assert(fs.existsSync(path.join(skillsDir, 'god-plan', 'SKILL.md')), 'god-plan missing');
  assert(fs.existsSync(path.join(skillsDir, 'god-status', 'SKILL.md')), 'god-status missing');
  assert(!fs.existsSync(path.join(skillsDir, 'god-prd', 'SKILL.md')),
    'planning leaf should not be installed when profile is omitted');
  assert(fs.readFileSync(path.join(home, '.codex', 'GODPOWERS_PROFILE'), 'utf8') === 'core',
    'default profile marker mismatch');
  fs.rmSync(home, { recursive: true, force: true });
});

test('unknown install profile is rejected by profile resolver', () => {
  let threw = false;
  try {
    profiles.normalizeProfiles('wat');
  } catch (_) {
    threw = true;
  }
  assert(threw, 'unknown profile should throw');
});

report('Installer profile behavioral tests');
