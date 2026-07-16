#!/usr/bin/env node
'use strict';

// Single source of version truth: package.json. This writes that version into
// every version surface godpowers self-truth and surface-count checks assert -
// docs, the MCP package and lockfile, the SECURITY supported series, the
// RELEASE header, and the two self-referential hashes (roadmap package.json hash
// and the state roadmap artifact hash) - so a release never hand-edits ~15 places
// in lockstep. Run `npm run version:sync`; `--check` verifies without writing.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const check = process.argv.includes('--check');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const sha = (text) => `sha256:${crypto.createHash('sha256').update(text).digest('hex')}`;

const mismatches = [];
const rd = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const wr = (rel, text) => { if (!check) fs.writeFileSync(path.join(root, rel), text); };

// 1. Regex doc surfaces. Each regex captures the whole match in groups; the
// numbered slots are the version groups. Rebuild the match from its groups,
// substituting the target version at the version slots. Exact-semver capture
// avoids swallowing sentence-ending periods.
const V = '[0-9]+\\.[0-9]+\\.[0-9]+';
const surfaces = [
  ['SKILL.md', new RegExp(`(\\n\\s+version:\\s*")(${V})(")`), [2]],
  ['README.md', new RegExp(`(version-)(${V})(-(?:blue|green))`), [2]],
  ['USERS.md', new RegExp(`(current source version is v)(${V})(, and the latest published release is v)(${V})`), [2, 4]],
  ['ARCHITECTURE.md', new RegExp(`(STABLE v)(${V})`), [2]],
  ['ARCHITECTURE-MAP.md', new RegExp(`(package\\.json \\(v)(${V})(\\))`), [2]],
  ['ARCHITECTURE-MAP.md', new RegExp(`(## Numbers \\(as of v)(${V})(\\))`), [2]],
  ['agents/context.md', new RegExp('(current repository version is `)(' + V + ')(`)'), [2]],
  ['docs/reference.md', new RegExp(`(reference for v)(${V})`), [2]],
  ['docs/ROADMAP.md', new RegExp(`(Current source: v)(${V})(\\. Latest published: v)(${V})`), [2, 4]],
  ['.godpowers/roadmap/ROADMAP.mdx', new RegExp('(Source version: `)(' + V + ')(`)'), [2]],
  ['RELEASE.md', new RegExp(`(# Godpowers )(${V})( Release)`), [2]],
];
for (const [rel, regex, slots] of surfaces) {
  const text = rd(rel);
  const match = text.match(regex);
  if (!match) { mismatches.push(`${rel}: no version surface matched ${regex}`); continue; }
  const caps = match.slice(1); // capture groups 1..n
  const corrected = caps.map((g, i) => (slots.includes(i + 1) ? version : g)).join('');
  if (match[0] === corrected) continue;
  if (check) mismatches.push(`${rel}: "${match[0].trim()}" should be "${corrected.trim()}"`);
  else { wr(rel, text.replace(match[0], corrected)); process.stdout.write(`  synced ${rel}\n`); }
}

// 2. MCP package.json version.
{
  const rel = 'packages/mcp/package.json';
  const mcp = JSON.parse(rd(rel));
  if (mcp.version !== version) {
    if (check) mismatches.push(`${rel}: ${mcp.version} != ${version}`);
    else { mcp.version = version; wr(rel, `${JSON.stringify(mcp, null, 2)}\n`); process.stdout.write(`  synced ${rel}\n`); }
  }
}

// 3. package-lock.json: root, root workspace entry, and the MCP workspace entry.
{
  const rel = 'package-lock.json';
  const lock = JSON.parse(rd(rel));
  const targets = [lock, lock.packages && lock.packages[''], lock.packages && lock.packages['packages/mcp']].filter(Boolean);
  const stale = targets.some((t) => t.version !== version);
  if (stale) {
    if (check) mismatches.push(`${rel}: a lock version entry != ${version}`);
    else { for (const t of targets) t.version = version; wr(rel, `${JSON.stringify(lock, null, 2)}\n`); process.stdout.write(`  synced ${rel}\n`); }
  }
}

// 4. SECURITY supported series: the current minor is "Yes", others demoted.
{
  const rel = 'SECURITY.md';
  const minorX = `${version.split('.').slice(0, 2).join('.')}.x`;
  let text = rd(rel);
  const hasCurrent = new RegExp(`\\|\\s*${minorX.replace(/\./g, '\\.')}\\s*\\|\\s*Yes\\s*\\|`).test(text);
  const demoted = text.replace(/\|(\s*[0-9]+\.[0-9]+\.x\s*)\|\s*Yes\s*\|/g, (m, ver) =>
    ver.trim() === minorX ? m : `|${ver}| Security fixes only |`);
  let next = demoted;
  if (!hasCurrent) {
    // insert the current series as the first data row after the table header separator
    next = demoted.replace(/(\|\s*Version\s*\|\s*Supported\s*\|\n\|[-\s|]+\|\n)/, `$1| ${minorX}   | Yes |\n`);
  }
  if (next !== text) {
    if (check) mismatches.push(`${rel}: supported series does not lead with ${minorX} = Yes`);
    else { wr(rel, next); process.stdout.write(`  synced ${rel} supported series\n`); }
  }
}

// 5. Roadmap package.json source hash (after package.json is final).
{
  const rel = '.godpowers/roadmap/ROADMAP.mdx';
  const want = sha(rd('package.json'));
  let text = rd(rel);
  const next = text.replace(/(Source hash `package\.json`: `)(sha256:[0-9a-f]+)(`)/, `$1${want}$3`);
  if (next !== text) {
    if (check) mismatches.push(`${rel}: package.json source hash is stale`);
    else { wr(rel, next); text = next; process.stdout.write(`  synced ${rel} package.json hash\n`); }
  }
}

// 6. State roadmap artifact hash (after ROADMAP.mdx is final).
{
  const rel = '.godpowers/state.json';
  const want = sha(rd('.godpowers/roadmap/ROADMAP.mdx'));
  const text = rd(rel);
  const next = text.replace(/("artifact":\s*"roadmap\/ROADMAP\.mdx",\s*\n\s*"artifact-hash":\s*")(sha256:[0-9a-f]+)(")/,
    `$1${want}$3`);
  if (next !== text) {
    if (check) mismatches.push(`${rel}: roadmap artifact hash is stale`);
    else { wr(rel, next); process.stdout.write(`  synced ${rel} roadmap artifact hash\n`); }
  }
}

if (check && mismatches.length) {
  process.stderr.write(`Version surfaces are stale:\n  ${mismatches.join('\n  ')}\nTo fix: run \`npm run version:sync\`.\n`);
  process.exitCode = 1;
} else if (check) {
  process.stdout.write(`All version surfaces are ${version}.\n`);
} else if (mismatches.length) {
  process.stderr.write(`Could not sync:\n  ${mismatches.join('\n  ')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Version surfaces synced to ${version}.\n`);
}
