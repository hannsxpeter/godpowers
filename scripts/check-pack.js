#!/usr/bin/env node

// Verify the npm package contains exactly what an install needs.

const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npm, ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
if (result.status !== 0) {
  console.error(result.stderr);
  process.exit(2);
}
const [pack] = JSON.parse(result.stdout);
const files = pack.files.map(file => file.path);
const required = [
  'package.json',
  'README.md',
  'LICENSE',
  'bin/godpowers.js',
  'lib/cli.js',
  'lib/hooks.js',
  'lib/install.js',
  'skills/godpowers/SKILL.md',
  ...['god', 'god-init', 'god-plan', 'god-build', 'god-review', 'god-harden', 'god-ship', 'god-status'].map(name => `skills/${name}/SKILL.md`),
  ...['god-planner', 'god-executor', 'god-reviewer', 'god-security-auditor'].map(name => `agents/${name}.md`)
];
const forbidden = /^(test|scripts|docs|\.godpowers|\.github|\.claude-plugin|hooks|coverage)\//;
const missing = required.filter(file => !files.includes(file));
const extra = files.filter(file => forbidden.test(file));
const maxBytes = 200 * 1024;
const problems = [
  ...missing.map(file => `missing: ${file}`),
  ...extra.map(file => `should not ship: ${file}`),
  ...(pack.unpackedSize > maxBytes ? [`unpacked size ${pack.unpackedSize} bytes exceeds ${maxBytes}`] : [])
];
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`check-pack: ok (${files.length} files, ${pack.unpackedSize} bytes unpacked)`);
