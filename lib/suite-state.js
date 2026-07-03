/**
 * Suite State Manager
 *
 * Aggregates per-repo state.json into a suite-level view.
 *
 * Storage:
 *   <hub>/.godpowers/suite/state.json   (machine-readable aggregate)
 *   <hub>/.godpowers/suite/STATE.mdx      (human-readable summary)
 *   <hub>/.godpowers/suite/SYNC-LOG.mdx   (append-only history)
 *
 * Public API:
 *   readSuiteState(hubPath) -> { repos, totals, lastSync }
 *   writeSuiteState(hubPath, data) -> void
 *   refreshFromRepos(hubPath) -> data (re-aggregate now)
 *   appendSyncLog(hubPath, entry) -> void
 *   format(hubPath) -> markdown summary
 */

const fs = require('fs');
const path = require('path');

const detector = require('./multi-repo-detector');

function suiteDir(hubPath) {
  return path.join(hubPath, '.godpowers', 'suite');
}

function suiteStatePath(hubPath) {
  return path.join(suiteDir(hubPath), 'state.json');
}

function suiteStateMdPath(hubPath) {
  return path.join(suiteDir(hubPath), 'STATE.mdx');
}

function suiteSyncLogPath(hubPath) {
  return path.join(suiteDir(hubPath), 'SYNC-LOG.mdx');
}

// Legacy .md twins written by pre-.mdx runtimes. Reads fall back to them;
// writes absorb them (STATE is regenerated wholesale, SYNC-LOG is migrated
// once so its history is preserved).
function legacySuiteStateMdPath(hubPath) {
  return path.join(suiteDir(hubPath), 'STATE.md');
}

function legacySuiteSyncLogPath(hubPath) {
  return path.join(suiteDir(hubPath), 'SYNC-LOG.md');
}

function ensureSuiteDir(hubPath) {
  fs.mkdirSync(suiteDir(hubPath), { recursive: true });
}

/**
 * Read the persisted suite state.
 */
function readSuiteState(hubPath) {
  const file = suiteStatePath(hubPath);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return null;
  }
}

/**
 * Write the suite state JSON.
 */
function writeSuiteState(hubPath, data) {
  ensureSuiteDir(hubPath);
  fs.writeFileSync(suiteStatePath(hubPath), JSON.stringify(data, null, 2) + '\n');
}

/**
 * Walk siblings, read each repo's state.json, build aggregate.
 */
function refreshFromRepos(hubPath) {
  const config = detector.readSuiteConfig(hubPath);
  if (!config) return null;

  const siblings = (config.siblings || []).map(sib => {
    if (typeof sib === 'string') return { name: sib, path: path.resolve(hubPath, sib) };
    return { name: sib.name, path: path.resolve(hubPath, sib.path || sib.name) };
  });

  const repos = [];
  let totalArtifacts = 0;
  let totalDrift = 0;
  let totalReviews = 0;
  let totalCoverage = 0;
  let coverageCount = 0;

  for (const sib of siblings) {
    const statePath = path.join(sib.path, '.godpowers', 'state.json');
    if (!fs.existsSync(statePath)) {
      repos.push({ name: sib.name, path: sib.path, status: 'no-state' });
      continue;
    }
    try {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      const tiers = state.tiers || {};
      const linkage = state.linkage || {};

      // Count completed artifacts
      let completedArtifacts = 0;
      for (const tier of Object.values(tiers)) {
        for (const sub of Object.values(tier)) {
          if (sub && sub.status === 'done') completedArtifacts++;
        }
      }

      const repoSummary = {
        name: sib.name,
        path: sib.path,
        mode: state.project && state.project.mode,
        scale: state.project && state.project.scale,
        lifecyclePhase: state['lifecycle-phase'],
        completedArtifacts,
        linkage: {
          coveragePct: linkage['coverage-pct'] || 0,
          orphanCount: linkage['orphan-count'] || 0,
          driftCount: linkage['drift-count'] || 0,
          reviewRequiredItems: linkage['review-required-items'] || 0
        }
      };
      repos.push(repoSummary);

      totalArtifacts += completedArtifacts;
      totalDrift += repoSummary.linkage.driftCount;
      totalReviews += repoSummary.linkage.reviewRequiredItems;
      totalCoverage += repoSummary.linkage.coveragePct;
      coverageCount++;
    } catch (e) {
      repos.push({ name: sib.name, path: sib.path, status: 'parse-error', error: e.message });
    }
  }

  const data = {
    version: '1.0.0',
    hubPath,
    refreshedAt: new Date().toISOString(),
    repos,
    totals: {
      artifacts: totalArtifacts,
      drift: totalDrift,
      reviewRequired: totalReviews,
      avgCoverage: coverageCount > 0 ? totalCoverage / coverageCount : 0
    }
  };
  writeSuiteState(hubPath, data);
  writeStateMd(hubPath, data);
  return data;
}

function readPackageName(repoPath) {
  const file = path.join(repoPath, 'package.json');
  if (!fs.existsSync(file)) return path.basename(repoPath);
  try {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    return pkg.name || path.basename(repoPath);
  } catch (err) {
    return path.basename(repoPath);
  }
}

function readPackageDeps(repoPath) {
  const file = path.join(repoPath, 'package.json');
  if (!fs.existsSync(file)) return {};
  try {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
      ...(pkg.peerDependencies || {}),
      ...(pkg.optionalDependencies || {})
    };
  } catch (err) {
    return {};
  }
}

function siblingRecords(hubPath) {
  const config = detector.readSuiteConfig(hubPath);
  if (!config) return [];
  return (config.siblings || []).map((sib) => {
    if (typeof sib === 'string') {
      const repoPath = path.resolve(hubPath, sib);
      return { name: sib, path: repoPath, packageName: readPackageName(repoPath) };
    }
    const repoPath = path.resolve(hubPath, sib.path || sib.name);
    return { name: sib.name, path: repoPath, packageName: readPackageName(repoPath) };
  });
}

function planRelease(hubPath, repoName, version, opts = {}) {
  const siblings = siblingRecords(hubPath);
  const target = siblings.find((repo) => repo.name === repoName || repo.packageName === repoName);
  if (!target) {
    return {
      mode: 'dry-run',
      status: 'blocked',
      repo: repoName,
      version,
      impacted: [],
      blockers: [`${repoName} is not registered in suite-config.yaml`],
      writes: []
    };
  }

  const impacted = [];
  for (const repo of siblings) {
    if (repo.name === target.name) continue;
    const deps = readPackageDeps(repo.path);
    if (Object.prototype.hasOwnProperty.call(deps, target.packageName)
      || Object.prototype.hasOwnProperty.call(deps, target.name)) {
      impacted.push({
        name: repo.name,
        packageName: repo.packageName,
        path: repo.path,
        dependsOn: target.packageName,
        currentRange: deps[target.packageName] || deps[target.name]
      });
    }
  }

  return {
    mode: opts.apply ? 'apply-plan' : 'dry-run',
    status: 'ready',
    repo: target.name,
    packageName: target.packageName,
    version,
    impacted,
    blockers: [],
    writes: [
      { path: path.join(target.path, 'package.json'), action: 'bump-version' },
      ...impacted.map((repo) => ({ path: path.join(repo.path, 'package.json'), action: 'update-dependency-range' })),
      { path: path.join(hubPath, '.godpowers', 'suite-config.yaml'), action: 'update-version-table' },
      { path: suiteSyncLogPath(hubPath), action: 'append-release-plan' }
    ]
  };
}

/**
 * Write a human-readable STATE.mdx from the aggregate.
 */
function writeStateMd(hubPath, data) {
  ensureSuiteDir(hubPath);
  const lines = [];
  lines.push(`# Suite State`);
  lines.push('');
  lines.push(`Refreshed: ${data.refreshedAt}`);
  lines.push(`Hub: ${data.hubPath}`);
  lines.push('');
  lines.push(`## Aggregate`);
  lines.push('');
  lines.push(`- Total artifacts complete: ${data.totals.artifacts}`);
  lines.push(`- Total drift findings: ${data.totals.drift}`);
  lines.push(`- Pending reviews: ${data.totals.reviewRequired}`);
  lines.push(`- Average linkage coverage: ${(data.totals.avgCoverage * 100).toFixed(0)}%`);
  lines.push('');
  lines.push(`## Per-repo`);
  lines.push('');
  lines.push('| Repo | Mode | Phase | Artifacts | Coverage | Drift | Reviews |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const repo of data.repos) {
    if (repo.status) {
      lines.push(`| ${repo.name} | (${repo.status}) | - | - | - | - | - |`);
      continue;
    }
    const cov = repo.linkage.coveragePct ? `${(repo.linkage.coveragePct * 100).toFixed(0)}%` : '-';
    lines.push(
      `| ${repo.name} | ${repo.mode || '-'} | ${repo.lifecyclePhase || '-'} | ${repo.completedArtifacts} | ${cov} | ${repo.linkage.driftCount} | ${repo.linkage.reviewRequiredItems} |`
    );
  }
  lines.push('');
  fs.writeFileSync(suiteStateMdPath(hubPath), lines.join('\n'));
  // The view is fully regenerated above; absorb a legacy STATE.md twin so the
  // hub does not keep two diverging state views.
  const legacy = legacySuiteStateMdPath(hubPath);
  if (fs.existsSync(legacy)) fs.rmSync(legacy, { force: true });
}

/**
 * Append to SYNC-LOG.mdx. A legacy SYNC-LOG.md is migrated once (history
 * carried into the canonical .mdx) on the first append.
 */
function appendSyncLog(hubPath, entry) {
  ensureSuiteDir(hubPath);
  const file = suiteSyncLogPath(hubPath);
  const legacy = legacySuiteSyncLogPath(hubPath);
  if (!fs.existsSync(file) && fs.existsSync(legacy)) {
    fs.renameSync(legacy, file);
  }
  const ts = new Date().toISOString();
  const header = !fs.existsSync(file) ? `# Suite Sync Log\n\nAppend-only history of suite-level operations.\n\n` : '';
  const block = `## ${ts}\n\n${entry}\n\n`;
  if (header) {
    fs.writeFileSync(file, header + block);
  } else {
    fs.appendFileSync(file, block);
  }
}

/**
 * Format the current suite state as a string (for /god-suite-status).
 * Reads the canonical STATE.mdx, falling back to a legacy STATE.md.
 */
function format(hubPath) {
  const data = readSuiteState(hubPath);
  if (!data) return 'No suite state. Run /god-suite-init first.';
  for (const file of [suiteStateMdPath(hubPath), legacySuiteStateMdPath(hubPath)]) {
    if (fs.existsSync(file)) {
      return fs.readFileSync(file, 'utf8');
    }
  }
  return JSON.stringify(data, null, 2);
}

module.exports = {
  suiteDir,
  suiteStatePath,
  suiteStateMdPath,
  suiteSyncLogPath,
  readSuiteState,
  writeSuiteState,
  refreshFromRepos,
  appendSyncLog,
  format,
  planRelease
};
