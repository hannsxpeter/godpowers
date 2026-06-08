/**
 * Adoption proof metrics.
 *
 * These metrics keep first-user trust claims tied to observable CLI signals
 * instead of narrative confidence.
 */

function countMissingPlanning(planning = {}) {
  return Object.values(planning)
    .filter(item => item && item.status === 'missing')
    .length;
}

function fromQuickProof(proof) {
  const dashboard = proof.dashboard || {};
  const progress = dashboard.progress || {};
  const planning = dashboard.planning || {};
  const next = dashboard.next || {};
  const host = proof.host || {};
  const hostGaps = Array.isArray(host.gaps) ? host.gaps : [];
  const completed = Number.isFinite(progress.completed) ? progress.completed : 0;
  const total = Number.isFinite(progress.total) ? progress.total : 0;

  return {
    commandsToFirstSignal: 1,
    stateSource: proof.statePath || 'unknown',
    trackedStepsComplete: completed,
    trackedStepsTotal: total,
    missingPlanningArtifacts: countMissingPlanning(planning),
    nextCommand: next.command || 'describe the next intent',
    nextReason: next.reason || 'No route was computed.',
    hostLevel: host.level || 'unknown',
    hostGapCount: hostGaps.length,
    proofSignals: [
      'disk state',
      'missing artifact',
      'next command',
      'host guarantee'
    ]
  };
}

function render(metrics) {
  return [
    `  Commands to first signal: ${metrics.commandsToFirstSignal}`,
    `  State source: ${metrics.stateSource}`,
    `  Tracked steps: ${metrics.trackedStepsComplete} of ${metrics.trackedStepsTotal}`,
    `  Missing planning artifacts: ${metrics.missingPlanningArtifacts}`,
    `  Next command: ${metrics.nextCommand}`,
    `  Host level: ${metrics.hostLevel}`,
    `  Host gaps: ${metrics.hostGapCount}`
  ].join('\n');
}

function canaryMetrics(outputs = {}) {
  const quickProof = outputs.quickProof || '';
  const status = outputs.status || '';
  const next = outputs.next || '';
  return {
    cliSignalsCaptured: ['quick-proof', 'status', 'next']
      .filter((name) => outputs[camelSignal(name)] && outputs[camelSignal(name)].trim()).length,
    quickProofHasNext: /\bNext:\s+\S+/.test(quickProof),
    statusHasDashboard: /Godpowers Dashboard|Current status:/.test(status),
    nextHasRecommendation: /Suggested next command:|Recommended:|Next:/.test(next)
  };
}

function camelSignal(name) {
  if (name === 'quick-proof') return 'quickProof';
  return name;
}

function renderCanary(metrics) {
  return [
    `- [DECISION] CLI signals captured: ${metrics.cliSignalsCaptured} of 3.`,
    `- [DECISION] Quick Proof reported a next action: ${metrics.quickProofHasNext ? 'yes' : 'no'}.`,
    `- [DECISION] Status rendered a dashboard signal: ${metrics.statusHasDashboard ? 'yes' : 'no'}.`,
    `- [DECISION] Next rendered a recommendation signal: ${metrics.nextHasRecommendation ? 'yes' : 'no'}.`
  ].join('\n');
}

module.exports = {
  fromQuickProof,
  render,
  canaryMetrics,
  renderCanary
};
