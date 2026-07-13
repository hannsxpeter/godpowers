/**
 * User-outcome metrics derived only from event evidence.
 */

const events = require('./events');

function attr(event, ...names) {
  const attrs = event && event.attrs && typeof event.attrs === 'object' ? event.attrs : {};
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(attrs, name)) return attrs[name];
  }
  return undefined;
}

function timestamp(event) {
  const value = event && event.ts ? Date.parse(event.ts) : NaN;
  return Number.isNaN(value) ? null : value;
}

function isTier(event, name) {
  const tier = String(attr(event, 'tier', 'substep', 'step') || '').toLowerCase();
  return tier === name || tier === `tier-3.${name}` || tier.endsWith(`.${name}`);
}

function derive(eventList) {
  const list = (Array.isArray(eventList) ? eventList : [])
    .filter((event) => event && event.name)
    .slice()
    .sort((a, b) => (timestamp(a) || 0) - (timestamp(b) || 0));

  const proposalsByTrace = new Map();
  const acceptedDurations = [];
  let totalUsd = 0;
  let costSamples = 0;
  let pauses = 0;
  let resolutions = 0;
  let resumed = 0;
  let successfulResumes = 0;
  let deploymentAttempts = 0;
  let deploymentCompleted = 0;
  let rollbacks = 0;
  let rollbackProven = 0;
  const resumableTraces = new Set();

  for (const event of list) {
    const ts = timestamp(event);
    const traceValue = event.trace_id || attr(event, 'traceId', 'trace_id');
    const trace = traceValue ? String(traceValue) : null;
    if (event.name === 'change.proposed' && ts !== null && trace) {
      if (!proposalsByTrace.has(trace)) proposalsByTrace.set(trace, []);
      proposalsByTrace.get(trace).push(ts);
    }
    const proposals = trace ? proposalsByTrace.get(trace) : null;
    if ((event.name === 'change.accepted' || event.name === 'gate.pass')
      && proposals && proposals.length > 0 && ts !== null) {
      acceptedDurations.push(Math.max(0, ts - proposals.shift()));
    }
    if (event.name === 'cost.recorded') {
      const value = Number(attr(event, 'costUsd', 'cost_usd', 'totalCostUsd', 'total_cost_usd'));
      if (Number.isFinite(value)) {
        totalUsd += value;
        costSamples += 1;
      }
    }
    if (event.name === 'agent.pause') pauses += 1;
    if (event.name === 'user.resolve') resolutions += 1;
    if (event.name === 'workflow.run' && attr(event, 'resume', 'resumed') === true) {
      resumed += 1;
      if (event.trace_id) resumableTraces.add(event.trace_id);
    }
    if (event.name === 'workflow.complete' && event.trace_id && resumableTraces.has(event.trace_id)) {
      successfulResumes += 1;
      resumableTraces.delete(event.trace_id);
    }
    if ((event.name === 'gate.pass' || event.name === 'gate.fail') && isTier(event, 'deploy')) {
      deploymentAttempts += 1;
      if (event.name === 'gate.pass') deploymentCompleted += 1;
    }
    if (event.name === 'state.rollback') {
      rollbacks += 1;
      if (attr(event, 'rollbackEvidence', 'rollback_evidence', 'evidence')) rollbackProven += 1;
    }
  }

  const averageMs = acceptedDurations.length > 0
    ? Math.round(acceptedDurations.reduce((sum, value) => sum + value, 0) / acceptedDurations.length)
    : null;

  return {
    timeToAcceptedChange: {
      status: acceptedDurations.length > 0 ? 'measured' : 'no-data',
      sampleCount: acceptedDurations.length,
      averageMs
    },
    cost: {
      status: costSamples > 0 ? 'measured' : 'no-data',
      samples: costSamples,
      totalUsd: costSamples > 0 ? Math.round(totalUsd * 1000000) / 1000000 : null
    },
    manualIntervention: {
      status: pauses > 0 || resolutions > 0 ? 'measured' : 'no-data',
      pauses,
      resolutions
    },
    resumeSuccess: {
      status: resumed > 0 ? 'measured' : 'no-data',
      attempts: resumed,
      successful: successfulResumes,
      rate: resumed > 0 ? successfulResumes / resumed : null
    },
    deploymentCompletion: {
      status: deploymentAttempts > 0 ? 'measured' : 'no-data',
      attempts: deploymentAttempts,
      completed: deploymentCompleted,
      rate: deploymentAttempts > 0 ? deploymentCompleted / deploymentAttempts : null
    },
    rollbackProof: {
      status: rollbacks > 0 ? 'measured' : 'no-data',
      rollbacks,
      proven: rollbackProven,
      rate: rollbacks > 0 ? rollbackProven / rollbacks : null
    }
  };
}

function collect(projectRoot, runIds) {
  const ids = Array.isArray(runIds) ? runIds : events.listRuns(projectRoot);
  return ids.flatMap((runId) => events.readRun(projectRoot, runId));
}

function compute(projectRoot, opts = {}) {
  return derive(collect(projectRoot, opts.runIds));
}

function percent(value) {
  return value === null ? 'no event evidence' : `${Math.round(value * 1000) / 10}%`;
}

function render(metrics) {
  const time = metrics.timeToAcceptedChange.averageMs;
  return [
    `Time to accepted change: ${time === null ? 'no event evidence' : `${time} ms average (${metrics.timeToAcceptedChange.sampleCount} sample(s))`}`,
    `Cost: ${metrics.cost.totalUsd === null ? 'no event evidence' : `$${metrics.cost.totalUsd.toFixed(6)}`}`,
    `Manual intervention: ${metrics.manualIntervention.status === 'no-data' ? 'no event evidence' : `${metrics.manualIntervention.resolutions} resolution(s), ${metrics.manualIntervention.pauses} pause(s)`}`,
    `Resume success: ${percent(metrics.resumeSuccess.rate)}`,
    `Deployment completion: ${percent(metrics.deploymentCompletion.rate)}`,
    `Rollback proof: ${percent(metrics.rollbackProof.rate)}`
  ].join('\n');
}

module.exports = { derive, collect, compute, render };
