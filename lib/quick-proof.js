/**
 * Quick proof runner.
 *
 * Renders a deterministic proof from a shipped fixture while detecting host
 * guarantees from the caller's actual project and environment.
 */

const fs = require('fs');
const path = require('path');

const dashboard = require('./dashboard');
const hostCapabilities = require('./host-capabilities');
const adoptionMetrics = require('./adoption-metrics');
const artifactMap = require('./artifact-map');

const FIXTURE_ROOT = path.join(__dirname, '..', 'fixtures', 'quick-proof', 'project');
const MANIFEST_PATH = path.join(__dirname, '..', 'fixtures', 'quick-proof', 'manifest.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function relFixturePath(absPath) {
  return path.relative(path.join(__dirname, '..'), absPath).split(path.sep).join('/');
}

function compute(projectRoot = process.cwd(), opts = {}) {
  const fixtureRoot = opts.fixtureRoot || FIXTURE_ROOT;
  const manifestPath = opts.manifestPath || MANIFEST_PATH;
  const inspectProject = opts.inspectProject === true;
  const manifest = inspectProject ? null : readJson(manifestPath);
  const proofRoot = inspectProject ? path.resolve(projectRoot) : fixtureRoot;
  const proofDashboard = dashboard.compute(proofRoot, { git: false });
  const host = opts.hostReport || hostCapabilities.detect(projectRoot, opts.hostOptions || {});
  const focusedActionBrief = {
    recommended: proofDashboard.next && proofDashboard.next.command
      ? proofDashboard.next.command
      : 'describe the next intent',
    reason: proofDashboard.next && proofDashboard.next.reason
      ? proofDashboard.next.reason
      : 'No route was computed.',
    confidence: host.level === 'unknown' ? 'needs attention' : 'ready',
    blockers: host.gaps && host.gaps.length > 0 ? [`Host: ${host.gaps[0]}`] : [],
    overflow: host.gaps && host.gaps.length > 1 ? host.gaps.length - 1 : 0
  };

  const proof = {
    source: inspectProject ? 'current project inspection' : 'quick-proof fixture',
    inspectProject,
    manifest,
    projectRoot: path.resolve(projectRoot),
    fixtureRoot: inspectProject ? null : fixtureRoot,
    fixturePath: inspectProject ? null : relFixturePath(fixtureRoot),
    statePath: inspectProject
      ? path.join(path.resolve(projectRoot), '.godpowers', 'state.json')
      : relFixturePath(path.join(fixtureRoot, '.godpowers', 'state.json')),
    dashboard: {
      state: proofDashboard.state,
      progress: proofDashboard.progress,
      planning: proofDashboard.planning,
      next: proofDashboard.next,
      actionBrief: focusedActionBrief
    },
    host,
    commands: inspectProject
      ? [
          `npx godpowers quick-proof --project=${projectRoot} --inspect-project`,
          `npx godpowers status --project=${projectRoot} --brief`,
          `npx godpowers next --project=${projectRoot} --brief`
        ]
      : [
          `npx godpowers quick-proof --project=${projectRoot}`,
          `npx godpowers status --project=${fixtureRoot} --brief`,
          `npx godpowers next --project=${fixtureRoot} --brief`,
          `npx godpowers quick-proof --project=${projectRoot} --inspect-project --brief`
        ],
    evidence: [
      {
        label: 'State on disk',
        value: inspectProject
          ? path.join(path.resolve(projectRoot), '.godpowers', 'state.json')
          : relFixturePath(path.join(fixtureRoot, '.godpowers', 'state.json'))
      },
      {
        label: 'Next action',
        value: proofDashboard.next && proofDashboard.next.command
          ? proofDashboard.next.command
          : 'describe the next intent'
      },
      {
        label: 'Missing artifact',
        value: proofDashboard.planning.prd.status === 'missing'
          ? artifactMap.requiredArtifactsForTier('prd')[0].path
          : 'none'
      },
      {
        label: 'Host guarantees',
        value: hostCapabilities.summary(host)
      }
    ]
  };

  proof.metrics = adoptionMetrics.fromQuickProof(proof);

  return proof;
}

function render(proof, opts = {}) {
  const brief = proof.dashboard.actionBrief || {};
  const next = proof.dashboard.next || {};
  const progress = proof.dashboard.progress || {};
  const planning = proof.dashboard.planning || {};
  const projectCommandRoot = proof.fixtureRoot && path.resolve(proof.projectRoot) === path.resolve(proof.fixtureRoot)
    ? '.'
    : proof.projectRoot;

  if (opts.brief) {
    return [
      'Godpowers Quick Proof',
      '',
      proof.inspectProject
        ? 'Source: current project inspection (read-only)'
        : `Fixture evidence only: shipped sandbox (${proof.fixturePath}); this does not inspect the current project.`,
      '',
      'Action brief:',
      `  Next: ${brief.recommended || next.command || 'describe the next intent'}`,
      `  Why: ${brief.reason || next.reason || 'No route was computed.'}`,
      `  Readiness: ${brief.confidence || 'unknown'}`,
      `  Host guarantees: ${hostCapabilities.summary(proof.host)}`,
      '',
      'Evidence:',
      `  State on disk: ${proof.statePath}`,
      ...(proof.inspectProject ? [] : [`  Fixture: ${proof.fixturePath}`]),
      `  PRD: ${planning.prd ? planning.prd.status : 'unknown'}`,
      `  Roadmap: ${planning.roadmap ? planning.roadmap.status : 'unknown'}`,
      '',
      'Outcome metrics:',
      adoptionMetrics.render(proof.metrics)
    ].join('\n');
  }

  return [
    'Godpowers Quick Proof',
    '',
    proof.inspectProject
      ? 'Source: current project inspection (read-only)'
      : `Fixture evidence only: shipped sandbox (${proof.fixturePath}); this does not inspect the current project and is not evidence about it.`,
    '',
    'What this proves:',
    '  1. Godpowers can read project state from disk.',
    '  2. Godpowers can name missing artifacts instead of inventing completion.',
    '  3. Godpowers can recommend the next command from state.',
    '  4. Godpowers can report host guarantees separately from fixture state.',
    '',
    'Dashboard proof:',
    `  State: ${proof.dashboard.state}`,
    `  Progress: ${progress.percent || 0}% (${progress.completed || 0} of ${progress.total || 0} tracked steps complete)`,
    `  PRD: ${planning.prd ? planning.prd.status : 'unknown'}`,
    `  Roadmap: ${planning.roadmap ? planning.roadmap.status : 'unknown'}`,
    `  Next: ${next.command || 'describe the next intent'}`,
    `  Why: ${next.reason || 'No route was computed.'}`,
    `  Host guarantees: ${hostCapabilities.summary(proof.host)}`,
    '',
    'Evidence:',
    ...proof.evidence.map((item, index) => `  ${index + 1}. ${item.label}: ${item.value}`),
    '',
    'Outcome metrics:',
    adoptionMetrics.render(proof.metrics),
    '',
    ...(proof.inspectProject ? [] : [
      'Run the safe fixture proof:',
      `  npx godpowers status --project=${proof.fixtureRoot} --brief`,
      `  npx godpowers next --project=${proof.fixtureRoot} --brief`,
      ''
    ]),
    'Try it on your project: explicit read-only inspection',
    `  npx godpowers quick-proof --project=${projectCommandRoot} --inspect-project --brief`,
    `  npx godpowers status --project=${projectCommandRoot} --brief`,
    `  npx godpowers next --project=${projectCommandRoot} --brief`
  ].join('\n');
}

module.exports = {
  compute,
  render,
  FIXTURE_ROOT,
  MANIFEST_PATH
};
