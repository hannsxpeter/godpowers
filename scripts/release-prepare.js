#!/usr/bin/env node
'use strict';

// One command to start a release: bump the semver in package.json, sync every
// version surface and both self-referential hashes, roll the SECURITY series,
// and stub a CHANGELOG entry. The human then writes the CHANGELOG and RELEASE
// bodies and commits. Usage: npm run release:prepare -- <patch|minor|major|X.Y.Z>

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const bump = process.argv[2];
if (!bump) {
  process.stderr.write('Usage: npm run release:prepare -- <patch|minor|major|X.Y.Z>\n');
  process.exit(2);
}

execFileSync('npm', ['version', bump, '--no-git-tag-version', '--allow-same-version'], { cwd: root, stdio: 'inherit' });
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;

execFileSync('node', ['scripts/version-sync.js'], { cwd: root, stdio: 'inherit' });

const changelogPath = path.join(root, 'CHANGELOG.md');
let changelog = fs.readFileSync(changelogPath, 'utf8');
if (!changelog.includes(`## [${version}]`)) {
  const today = new Date().toISOString().slice(0, 10);
  const stub = `## [${version}] - ${today}\n\n### Added\n\n- TODO: describe this release.\n\n`;
  // insert after the Unreleased header if present, else before the first entry
  if (changelog.includes('## [Unreleased]')) {
    changelog = changelog.replace(/(## \[Unreleased\]\n\n)/, `$1${stub}`);
  } else {
    changelog = changelog.replace(/\n(## \[)/, `\n${stub}$1`);
  }
  fs.writeFileSync(changelogPath, changelog);
  process.stdout.write(`  stubbed CHANGELOG entry for ${version}\n`);
}

process.stdout.write(`\nPrepared ${version}. Next: write the CHANGELOG and RELEASE.md bodies, then commit, open a PR, and tag on merge.\n`);
