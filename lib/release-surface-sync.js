/**
 * Release surface sync.
 *
 * Detects whether release-facing repo surfaces agree before a package or tag
 * is treated as ready: package metadata, lockfile, release notes, changelog,
 * README badge, release checklist, and package payload guardrails.
 */

const fs = require('fs');
const path = require('path');

const LOG_PATH = '.godpowers/surface/RELEASE-SURFACE-SYNC.md';

const REQUIRED_PACKAGE_GUARDS = [
  'lib/artifact-map.js',
  'lib/cli-dispatch.js',
  'lib/command-families.js',
  'lib/dogfood-runner.js',
  'lib/extension-authoring.js',
  'lib/gate.js',
  'lib/host-capabilities.js',
  'lib/route-quality-sync.js',
  'lib/recipe-coverage-sync.js',
  'lib/release-surface-sync.js',
  'lib/workflow-helper-groups.js'
];

const REQUIRED_RELEASE_TESTS = [
  'scripts/test-command-families.js',
  'scripts/test-dogfood-runner.js',
  'scripts/test-extension-authoring.js',
  'scripts/test-host-capabilities.js',
  'scripts/test-automation-surface-sync.js',
  'scripts/test-repo-surface-sync.js',
  'scripts/test-extensions-publish.js',
  'scripts/test-mode-d.js',
  'scripts/test-install-smoke.js'
];

function read(projectRoot, relPath) {
  const file = path.join(projectRoot, relPath);
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file, 'utf8');
}

function write(projectRoot, relPath, content) {
  const file = path.join(projectRoot, relPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function readJson(projectRoot, relPath) {
  try {
    return JSON.parse(read(projectRoot, relPath));
  } catch (err) {
    return null;
  }
}

function releaseGateText(projectRoot, pkg) {
  return [
    JSON.stringify((pkg && pkg.scripts) || {}),
    read(projectRoot, 'scripts/run-tests.js')
  ].join('\n');
}

function addCheck(checks, id, status, relPath, message, opts = {}) {
  checks.push({
    area: 'release-surface',
    id,
    status,
    path: relPath,
    message,
    severity: opts.severity || (status === 'fresh' ? 'info' : 'warning'),
    spawn: opts.spawn || null
  });
}

function detect(projectRoot) {
  const checks = [];
  const pkg = readJson(projectRoot, 'package.json') || {};
  const lock = readJson(projectRoot, 'package-lock.json') || {};
  const version = pkg.version || '0.0.0';

  addCheck(
    checks,
    'package-lock-version',
    lock.version === version ? 'fresh' : 'stale',
    'package-lock.json',
    lock.version === version
      ? 'package-lock.json version matches package.json.'
      : `package-lock.json version ${lock.version || 'missing'} does not match package.json ${version}.`
  );

  const surfaces = [
    ['readme-version-badge', 'README.md', `version-${version}-blue`],
    ['changelog-version', 'CHANGELOG.md', `## [${version}]`],
    ['release-version', 'RELEASE.md', `Godpowers ${version}`],
    ['release-checklist-route-quality', 'docs/RELEASE-CHECKLIST.md', 'route-quality-sync'],
    ['release-checklist-recipe-coverage', 'docs/RELEASE-CHECKLIST.md', 'recipe-coverage-sync'],
    ['release-checklist-release-surface', 'docs/RELEASE-CHECKLIST.md', 'release-surface-sync']
  ];

  for (const [id, relPath, expected] of surfaces) {
    const ok = read(projectRoot, relPath).includes(expected);
    addCheck(
      checks,
      id,
      ok ? 'fresh' : 'stale',
      relPath,
      ok ? `${relPath} includes ${expected}.` : `${relPath} is missing ${expected}.`,
      { spawn: ok ? null : 'god-docs-writer' }
    );
  }

  const packageCheckText = read(projectRoot, 'scripts/check-package-contents.js');
  for (const required of REQUIRED_PACKAGE_GUARDS) {
    const ok = packageCheckText.includes(required);
    addCheck(
      checks,
      `package-guard-${required.replace(/[^a-z0-9]+/gi, '-')}`,
      ok ? 'fresh' : 'stale',
      'scripts/check-package-contents.js',
      ok
        ? `Package contents check requires ${required}.`
        : `Package contents check does not require ${required}.`
    );
  }

  const scriptsText = releaseGateText(projectRoot, pkg);
  for (const required of REQUIRED_RELEASE_TESTS) {
    const ok = scriptsText.includes(required);
    addCheck(
      checks,
      `release-test-${required.replace(/[^a-z0-9]+/gi, '-')}`,
      ok ? 'fresh' : 'stale',
      'package.json',
      ok
        ? `Release gate includes ${required}.`
        : `Release gate does not include ${required}.`,
      { spawn: ok ? null : 'god-auditor' }
    );
  }

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
    lines.push('# Release Surface Sync Log');
    lines.push('');
    lines.push('- [DECISION] This file records release-surface sync checks run by Godpowers.');
    lines.push('');
  }
  lines.push(`## ${now}`);
  lines.push('');
  lines.push(`- [DECISION] Release surface status before apply was ${before.status}.`);
  lines.push(`- [DECISION] Release surface status after apply is ${after.status}.`);
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
  REQUIRED_PACKAGE_GUARDS,
  REQUIRED_RELEASE_TESTS,
  detect,
  run,
  summary
};
