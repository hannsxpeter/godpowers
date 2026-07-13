#!/usr/bin/env node
/**
 * Per-file line-coverage floor (TEST-001).
 *
 * `coverage:lib` enforces an AGGREGATE line/branch floor, which does not stop a
 * single file from silently rotting while the total stays green. This reads the
 * json-summary that `coverage:lib` emits and fails if any lib module's line
 * coverage falls below FLOOR. The two browser-driver modules are environment-
 * bound (their real shell-out/Playwright paths need a browser binary absent in
 * CI), so they are excluded; everything else must clear the floor.
 *
 * Run after `coverage:lib` (wired into `release:check`).
 */

const fs = require('fs');
const path = require('path');

const FLOOR = 70;
const EXCLUDE = new Set(['agent-browser-driver.js', 'browser-bridge.js']);
const summaryPath = path.resolve(__dirname, '..', 'coverage', 'coverage-summary.json');
const libDir = path.resolve(__dirname, '..', 'lib');

let summary;
try {
  summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
} catch (err) {
  console.error(`per-file coverage: cannot read ${summaryPath} (${err.message}). Run "npm run coverage:lib" first.`);
  process.exit(1);
}

const offenders = [];
const coveredByBase = new Map(
  Object.entries(summary)
    .filter(([file]) => file !== 'total')
    .map(([file, data]) => [path.basename(file), data])
);
const expected = fs.readdirSync(libDir)
  .filter((file) => file.endsWith('.js') && !EXCLUDE.has(file))
  .sort();
for (const file of expected) {
  if (!coveredByBase.has(file)) offenders.push(`${file}: missing from coverage summary`);
}
for (const [file, data] of Object.entries(summary)) {
  if (file === 'total') continue;
  const base = path.basename(file);
  if (EXCLUDE.has(base)) continue;
  const pct = data.lines && typeof data.lines.pct === 'number' ? data.lines.pct : 100;
  if (pct < FLOOR) offenders.push(`${base}: ${pct}% lines`);
}

if (offenders.length > 0) {
  console.error(`  x per-file line coverage below ${FLOOR}%:`);
  for (const offender of offenders.sort()) console.error(`      - ${offender}`);
  process.exit(1);
}

console.log(`  + per-file line coverage >= ${FLOOR}% across ${expected.length} lib modules (excluded: ${[...EXCLUDE].join(', ')})`);
