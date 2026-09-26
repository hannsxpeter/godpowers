#!/usr/bin/env node

// Repository text rules: JavaScript must parse, and tracked text files must not
// contain em dashes, en dashes, or emoji (see AGENTS.md).

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const BANNED = [
  [new RegExp(String.fromCodePoint(0x2014)), 'em dash'],
  [new RegExp(String.fromCodePoint(0x2013)), 'en dash'],
  [/\p{Extended_Pictographic}/u, 'emoji']
];
const TEXT = /\.(js|json|md|mdx|yml|yaml|txt|sh)$/;
const SKIP = new Set(['package-lock.json', 'CHANGELOG.md']);

const listed = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' });
if (listed.status !== 0) {
  console.error('check-text: git ls-files failed');
  process.exit(2);
}
const problems = [];
for (const rel of listed.stdout.split('\n').filter(Boolean)) {
  if (!TEXT.test(rel) || SKIP.has(rel) || !fs.existsSync(path.join(root, rel))) continue;
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  text.split('\n').forEach((line, index) => {
    for (const [re, name] of BANNED) {
      if (re.test(line)) problems.push(`${rel}:${index + 1}: ${name}`);
    }
  });
  if (rel.endsWith('.js')) {
    const check = spawnSync(process.execPath, ['--check', path.join(root, rel)], { encoding: 'utf8' });
    if (check.status !== 0) problems.push(`${rel}: ${check.stderr.trim().split('\n').pop()}`);
  }
}
if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`check-text: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log('check-text: ok');
