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
  const manifest = readJson(manifestPath);
  const fixtureDashboard = dashboard.compute(fixtureRoot, { git: false });
  const host = opts.hostReport || hostCapabilities.detect(projectRoot, opts.hostOptions || {});
  const focusedActionBrief = {
    recommended: fixtureDashboard.next && fixtureDashboard.next.command
      ? fixtureDashboard.next.command
      : 'describe the next intent',
    reason: fixtureDashboard.next && fixtureDashboard.next.reason
      ? fixtureDashboard.next.reason
      : 'No route was computed.',
    confidence: host.level === 'unknown' ? 'needs attention' : 'ready',
    blockers: host.gaps && host.gaps.length > 0 ? [`Host: ${host.gaps[0]}`] : [],
    overflow: host.gaps && host.gaps.length > 1 ? host.gaps.length - 1 : 0
  };

  const proof = {
    source: 'quick-proof fixture',
    manifest,
    projectRoot: path.resolve(projectRoot),
    fixtureRoot,
    fixturePath: relFixturePath(fixtureRoot),
    statePath: relFixturePath(path.join(fixtureRoot, '.godpowers', 'state.json')),
    dashboard: {
      state: fixtureDashboard.state,
      progress: fixtureDashboard.progress,
      planning: fixtureDashboard.planning,
      next: fixtureDashboard.next,
      actionBrief: focusedActionBrief
    },
    host,
    commands: [
      `npx godpowers quick-proof --project=${projectRoot}`,
      `npx godpowers status --project=${fixtureRoot} --brief`,
      `npx godpowers next --project=${fixtureRoot} --brief`,
      `npx godpowers status --project=${projectRoot} --brief`
    ],
    evidence: [
      {
        label: 'State on disk',
        value: relFixturePath(path.join(fixtureRoot, '.godpowers', 'state.json'))
      },
      {
        label: 'Next action',
        value: fixtureDashboard.next && fixtureDashboard.next.command
          ? fixtureDashboard.next.command
          : 'describe the next intent'
      },
      {
        label: 'Missing artifact',
        value: fixtureDashboard.planning.prd.status === 'missing'
          ? '.godpowers/prd/PRD.md'
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
  const projectCommandRoot = path.resolve(proof.projectRoot) === path.resolve(proof.fixtureRoot)
    ? '.'
    : proof.projectRoot;

  if (opts.brief) {
    return [
      'Godpowers Quick Proof',
      '',
      'Action brief:',
      `  Next: ${brief.recommended || next.command || 'describe the next intent'}`,
      `  Why: ${brief.reason || next.reason || 'No route was computed.'}`,
      `  Readiness: ${brief.confidence || 'unknown'}`,
      `  Host guarantees: ${hostCapabilities.summary(proof.host)}`,
      '',
      'Evidence:',
      `  State on disk: ${proof.statePath}`,
      `  Fixture: ${proof.fixturePath}`,
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
    `Source: shipped fixture (${proof.fixturePath})`,
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
    'Try it on the fixture:',
    `  npx godpowers status --project=${proof.fixtureRoot} --brief`,
    `  npx godpowers next --project=${proof.fixtureRoot} --brief`,
    '',
    'Try it on your project:',
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
