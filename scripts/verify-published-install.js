#!/usr/bin/env node
/**
 * Verify the published npm artifact after release.
 *
 * This script intentionally uses npx against the registry instead of the local
 * checkout. It is for post-release verification, not normal CI.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const spec = process.argv[2] || 'godpowers@latest';

function run(command, args, opts = {}) {
  return cp.execFileSync(command, args, {
    cwd: opts.cwd || process.cwd(),
    env: opts.env || process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: opts.timeout || 120000
  });
}

function assertExists(filePath, message) {
  if (!fs.existsSync(filePath)) {
    throw new Error(message || `missing ${filePath}`);
  }
}

function assertIncludes(text, expected, label) {
  if (!text.includes(expected)) {
    throw new Error(`${label || 'output'} missing expected text: ${expected}`);
  }
}

function main() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-published-home-'));
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-published-project-'));
  const installRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-published-install-'));
  const env = { ...process.env, HOME: home };

  console.log(`  Verifying published install surface for ${spec}`);

  const versionTarget = spec.includes('@') && !spec.startsWith('@')
    ? spec
    : 'godpowers@latest';
  const version = run('npm', ['view', versionTarget, 'version']).trim();
  assertIncludes(version, '.', 'npm view version');
  console.log(`  + npm view resolved version ${version}`);

  run('npm', [
    'install', '--prefix', installRoot, '--ignore-scripts', '--no-audit', '--no-fund', spec
  ], { env });
  const cli = path.join(installRoot, 'node_modules', 'godpowers', 'bin', 'install.js');
  assertExists(cli, `published CLI missing after isolated install: ${cli}`);
  const runPublished = (args) => run(process.execPath, [cli, ...args], { env });
  console.log('  + exact registry package installed in an isolated prefix');

  const quickProof = runPublished(['quick-proof', '--project', project, '--brief']);
  assertIncludes(quickProof, 'Godpowers Quick Proof', 'quick-proof');
  assertIncludes(quickProof, 'Next: /god-prd', 'quick-proof');
  console.log('  + quick-proof command rendered shipped fixture');

  const inspectedProof = runPublished([
    'quick-proof', '--project', project, '--inspect-project', '--brief'
  ]);
  assertIncludes(inspectedProof, 'Source: current project inspection (read-only)', 'quick-proof inspect-project');
  assertIncludes(inspectedProof, 'Next: /god-init', 'quick-proof inspect-project');
  console.log('  + quick-proof read-only project inspection rendered current state');

  const status = runPublished(['status', '--project', project, '--brief']);
  assertIncludes(status, 'Godpowers Dashboard', 'status');
  console.log('  + status command rendered dashboard');

  const next = runPublished(['next', '--project', project, '--brief']);
  assertIncludes(next, 'Recommended: /god-init', 'next');
  console.log('  + next command rendered recommendation');

  runPublished(['--claude', '--global']);
  assertExists(path.join(home, '.claude', 'skills', 'god-mode.md'), 'Claude god-mode skill missing');
  assertExists(path.join(home, '.claude', 'agents', 'god-orchestrator.md'), 'Claude orchestrator agent missing');
  assertExists(path.join(home, '.claude', 'GODPOWERS_VERSION'), 'Claude version marker missing');
  console.log('  + Claude install surface verified');

  runPublished(['--codex', '--global']);
  assertExists(path.join(home, '.codex', 'skills', 'god-mode', 'SKILL.md'), 'Codex god-mode skill missing');
  assertExists(path.join(home, '.codex', 'agents', 'god-orchestrator.toml'), 'Codex orchestrator metadata missing');
  assertExists(path.join(home, '.codex', 'GODPOWERS_VERSION'), 'Codex version marker missing');
  console.log('  + Codex install surface verified');

  console.log('  + published install verification passed');
}

try {
  main();
} catch (error) {
  console.error(`  x published install verification failed: ${error.message}`);
  process.exit(1);
}
