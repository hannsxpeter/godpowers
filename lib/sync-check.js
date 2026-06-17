/**
 * Shared check-builder and file-lister for the lib/*-sync.js family (ARC-001).
 *
 * The aggregator (repo-surface-sync) passes a per-call `area` and may mark a
 * check `safeFix`, so it uses the full `addCheck`. The single-area sync modules
 * (recipe-coverage, release-surface, route-quality) bind their area once via
 * `makeAddCheck(area)`; their records intentionally omit `safeFix` (none of
 * their checks are auto-fixable), matching the original per-module builders.
 */

const fs = require('fs');
const path = require('path');

function severityFor(status, opts) {
  return opts.severity || (status === 'fresh' ? 'info' : 'warning');
}

// Full form: caller supplies `area`; records include the `safeFix` flag.
function addCheck(checks, area, id, status, relPath, message, opts = {}) {
  checks.push({
    area,
    id,
    status,
    path: relPath,
    message,
    severity: severityFor(status, opts),
    safeFix: opts.safeFix === true,
    spawn: opts.spawn || null
  });
}

// Area-bound form for single-area modules; records omit `safeFix`.
function makeAddCheck(area) {
  return function (checks, id, status, relPath, message, opts = {}) {
    checks.push({
      area,
      id,
      status,
      path: relPath,
      message,
      severity: severityFor(status, opts),
      spawn: opts.spawn || null
    });
  };
}

function listFiles(projectRoot, relDir, pattern) {
  const dir = path.join(projectRoot, relDir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => pattern.test(name))
    .sort()
    .map((name) => `${relDir}/${name}`.replace(/\\/g, '/'));
}

module.exports = { addCheck, makeAddCheck, listFiles };
