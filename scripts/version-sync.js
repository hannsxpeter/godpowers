#!/usr/bin/env node
'use strict';

// Implements: P-MUST-35

// Single source of version truth: package.json. This writes that version into
// every version surface godpowers self-truth and surface-count checks assert -
// docs, the MCP package and lockfile, the SECURITY supported series, the
// RELEASE header, and the self-referential state roadmap artifact hash - so a
// release never hand-edits ~15 places in lockstep. Run `npm run version:sync`;
// `--check` verifies without writing.

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const check = process.argv.includes('--check');
const blessArg = process.argv.find((arg) => arg.startsWith('--bless-roadmap='));
const blessReason = blessArg ? blessArg.slice('--bless-roadmap='.length).trim() : null;
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;

const cadenceGuard = require('../lib/cadence-guard');

const mismatches = [];
const rd = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const wr = (rel, text) => { if (!check) fs.writeFileSync(path.join(root, rel), text); };
const V = '[0-9]+\\.[0-9]+\\.[0-9]+';

function latestPublishedVersion() {
  try {
    const state = JSON.parse(rd('.godpowers/state.json'));
    const launch = state.tiers && state.tiers['tier-3'] && state.tiers['tier-3'].launch;
    if (launch && new RegExp(`^${V}$`).test(launch['release-version'] || '')) {
      return launch['release-version'];
    }
  } catch (err) {
    // Fall through to the public marker when authoritative state is unavailable.
  }
  for (const [rel, regex] of [
    ['USERS.md', new RegExp(`latest published release is v(${V})`, 'i')],
    ['docs/ROADMAP.md', new RegExp(`Latest published: v(${V})`)]
  ]) {
    const match = rd(rel).match(regex);
    if (match) return match[1];
  }
  return version;
}

const publishedVersion = latestPublishedVersion();

// 1. Regex doc surfaces. Each regex captures the whole match in groups; the
// numbered slots are the version groups. Rebuild the match from its groups,
// substituting the target version at the version slots. Exact-semver capture
// avoids swallowing sentence-ending periods.
const surfaces = [
  ['SKILL.md', new RegExp(`(\\n\\s+version:\\s*")(${V})(")`), [2]],
  ['README.md', new RegExp(`(version-)(${V})(-(?:blue|green))`), [2]],
  ['ARCHITECTURE-MAP.md', new RegExp(`(package\\.json \\(v)(${V})(\\))`), [2]],
  ['ARCHITECTURE-MAP.md', new RegExp(`(## Numbers \\(as of v)(${V})(\\))`), [2]],
  ['agents/context.md', new RegExp('(current repository version is `)(' + V + ')(`)'), [2]],
  ['docs/reference.md', new RegExp(`(reference for v)(${V})`), [2]],
  ['.godpowers/roadmap/ROADMAP.mdx', new RegExp('(Source version: `)(' + V + ')(`)'), [2]],
  ['RELEASE.md', new RegExp(`(# Godpowers )(${V})( Release)`), [2]],
];
const ROADMAP_REL = '.godpowers/roadmap/ROADMAP.mdx';
// The version the roadmap's managed line held before this run stamped it;
// step 5 uses it to tell a mechanical stamp apart from content drift.
const roadmapVersionBefore = cadenceGuard.roadmapSourceVersion(rd(ROADMAP_REL));

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

const releaseTruthSurfaces = [
  ['USERS.md', new RegExp(`current source version is v${V}, and the latest published release is v${V}`),
    `current source version is v${version}, and the latest published release is v${publishedVersion}`],
  ['docs/ROADMAP.md', new RegExp(`Current source: v${V}\\. Latest published: v${V}`),
    `Current source: v${version}. Latest published: v${publishedVersion}`],
  ['ARCHITECTURE.md', new RegExp(`STABLE v${V}(?: (?:release candidate|published release))?`),
    `STABLE v${version} ${version === publishedVersion ? 'published release' : 'release candidate'}`]
];

for (const [rel, regex, corrected] of releaseTruthSurfaces) {
  const text = rd(rel);
  const match = text.match(regex);
  if (!match) { mismatches.push(`${rel}: no release-truth surface matched ${regex}`); continue; }
  if (match[0] === corrected) continue;
  if (check) mismatches.push(`${rel}: "${match[0]}" should be "${corrected}"`);
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

// 4. SECURITY supported series: published is "Yes" and unpublished source is a candidate.
{
  const rel = 'SECURITY.md';
  const sourceMinor = `${version.split('.').slice(0, 2).join('.')}.x`;
  const publishedMinor = `${publishedVersion.split('.').slice(0, 2).join('.')}.x`;
  const desired = new Map([[publishedMinor, 'Yes']]);
  if (sourceMinor !== publishedMinor) desired.set(sourceMinor, 'Release candidate');
  const text = rd(rel);
  let next = text.replace(/\|\s*([0-9]+\.[0-9]+\.x)\s*\|\s*([^|]+?)\s*\|/g,
    (match, minor, status) => {
      if (desired.has(minor)) return `| ${minor}   | ${desired.get(minor)} |`;
      if (/^(?:Yes|Release candidate)$/.test(status.trim())) {
        return `| ${minor}   | Security fixes only |`;
      }
      return match;
    });
  const missing = [...desired.entries()].filter(([minor]) =>
    !new RegExp(`\\|\\s*${minor.replace(/\./g, '\\.')}\\s*\\|`).test(next));
  if (missing.length > 0) {
    const rows = missing.map(([minor, status]) => `| ${minor}   | ${status} |\n`).join('');
    next = next.replace(/(\|\s*Version\s*\|\s*Supported\s*\|\n\|[-\s|]+\|\n)/, `$1${rows}`);
  }
  if (next !== text) {
    if (check) mismatches.push(`${rel}: published and candidate series do not match ${publishedVersion} and ${version}`);
    else { wr(rel, next); process.stdout.write(`  synced ${rel} supported series\n`); }
  }
}

// 5. State roadmap artifact hash (after ROADMAP.mdx is final).
// The roadmap is a slow-cadence artifact (lib/artifact-map.js): this stamper
// may re-bless the recorded hash only when the delta is exactly its own
// managed Source-version stamp. Any other delta is content drift; it is
// queued to .godpowers/REVIEW-REQUIRED.mdx and reported as a failure instead
// of being re-stamped blind (the 1e99b1b incident; see RELEASE.md 5.14.3).
// A human re-blesses deliberately with --bless-roadmap="<reason>", which
// records the reason in .godpowers/SYNC-LOG.mdx.
{
  const rel = '.godpowers/state.json';
  const roadmapText = rd(ROADMAP_REL);
  const text = rd(rel);
  const recorded = text.match(/"artifact":\s*"roadmap\/ROADMAP\.mdx",\s*\n\s*"artifact-hash":\s*"(sha256:[0-9a-f]+)"/);
  const delta = cadenceGuard.classifyRoadmapDelta({
    recordedHash: recorded ? recorded[1] : null,
    roadmapText,
    version,
    previousVersion: roadmapVersionBefore
  });
  const rebless = () => {
    const next = text.replace(/("artifact":\s*"roadmap\/ROADMAP\.mdx",\s*\n\s*"artifact-hash":\s*")(sha256:[0-9a-f]+)(")/,
      `$1${delta.currentHash}$3`);
    wr(rel, next);
  };
  if (delta.verdict === 'managed-stamp') {
    if (check) mismatches.push(`${rel}: roadmap artifact hash is stale (managed version stamp pending)`);
    else { rebless(); process.stdout.write(`  synced ${rel} roadmap artifact hash (managed version stamp)\n`); }
  } else if (delta.verdict === 'content-drift') {
    if (check) {
      mismatches.push(`${rel}: roadmap content changed outside the managed version line. `
        + 'Review the ROADMAP.mdx diff (or run /god-roadmap update), then bless deliberately with '
        + '`node scripts/version-sync.js --bless-roadmap="<reason>"`.');
    } else if (blessReason) {
      rebless();
      const syncLog = path.join(root, '.godpowers', 'SYNC-LOG.mdx');
      fs.appendFileSync(syncLog,
        `\n- ${new Date().toISOString()} roadmap hash re-blessed deliberately via version-sync `
        + `--bless-roadmap: ${blessReason}\n`);
      process.stdout.write(`  re-blessed ${rel} roadmap artifact hash (reason logged to SYNC-LOG.mdx)\n`);
    } else {
      const reviewRequired = require('../lib/review-required');
      reviewRequired.appendBatch(root, {
        source: 'version-sync-roadmap-drift',
        summary: 'ROADMAP.mdx content changed outside the managed version line; the recorded state hash was NOT re-blessed.',
        items: [{
          id: 'roadmap-hash-drift',
          file: ROADMAP_REL,
          severity: 'error',
          message: 'Roadmap body drifted from the blessed hash through a mechanical run. A fast loop must not close a slow artifact\'s freshness check.',
          suggestion: 'Review the ROADMAP.mdx diff (or run /god-roadmap update), then bless deliberately with `node scripts/version-sync.js --bless-roadmap="<reason>"`.'
        }]
      });
      mismatches.push(`${rel}: roadmap content drift queued to .godpowers/REVIEW-REQUIRED.mdx; hash NOT re-blessed. `
        + 'Bless deliberately with --bless-roadmap="<reason>" after review.');
    }
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
