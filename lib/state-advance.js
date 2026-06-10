/**
 * State advance CLI mutation.
 *
 * Moves one tracked Godpowers step to a new status through state.json,
 * cooperative locking, and generated markdown view refresh.
 */

const stateStore = require('./state');
const stateLock = require('./state-lock');
const stateViews = require('./state-views');

const VALID_STATUSES = new Set([
  'pending',
  'in-flight',
  'done',
  'skipped',
  'imported',
  'failed',
  're-invoked',
  'not-required'
]);

function statusList() {
  return Array.from(VALID_STATUSES).join(', ');
}

function check(status, reason, detail = {}) {
  return {
    id: detail.id || reason,
    status,
    reason: detail.message || reason,
    artifact: detail.artifact || '.godpowers/state.json'
  };
}

function resultFailure(projectRoot, id, reason, opts = {}) {
  return {
    command: 'state advance',
    verdict: 'fail',
    project: projectRoot,
    step: opts.step || null,
    status: opts.status || null,
    previousStatus: null,
    updated: null,
    warnings: opts.warnings || [],
    checks: [check('fail', reason, { id })],
    findings: [{ id, severity: 'error', artifact: '.godpowers/state.json', reason }],
    summary: { updated: false, state: '.godpowers/state.json', views: stateViews.VIEW_PATHS }
  };
}

function resultPass(projectRoot, target, previousStatus, status, updated, warnings, views) {
  return {
    command: 'state advance',
    verdict: 'pass',
    project: projectRoot,
    step: {
      tierKey: target.tierKey,
      subStepKey: target.subStepKey,
      tierLabel: target.tierLabel,
      subStepLabel: target.subStepLabel,
      ordinal: target.ordinal
    },
    status,
    previousStatus,
    updated,
    warnings,
    checks: [check('pass', `advanced ${target.tierKey}.${target.subStepKey} to ${status}`, { id: 'state-advanced' })],
    findings: [],
    summary: { updated: true, state: '.godpowers/state.json', views }
  };
}

function normalizeStep(rawStep) {
  return String(rawStep || '').trim();
}

function splitStep(rawStep) {
  const step = normalizeStep(rawStep);
  const compound = step.match(/^(tier-\d+)[.:/](.+)$/);
  if (compound) {
    return { tierKey: compound[1], subStepKey: compound[2] };
  }
  if (/^\d+$/.test(step)) {
    return { ordinal: Number(step) };
  }
  return { subStepKey: step };
}

function resolveStep(currentState, rawStep) {
  const token = splitStep(rawStep);
  const steps = stateStore.orderedSubSteps(currentState);

  if (token.ordinal != null) {
    return steps.find(step => step.ordinal === token.ordinal) || null;
  }

  if (token.tierKey) {
    return steps.find(step =>
      step.tierKey === token.tierKey && step.subStepKey === token.subStepKey
    ) || null;
  }

  const matches = steps.filter(step => step.subStepKey === token.subStepKey);
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    const err = new Error(`ambiguous step: ${rawStep}`);
    err.code = 'AMBIGUOUS_STEP';
    err.matches = matches.map(step => `${step.tierKey}.${step.subStepKey}`);
    throw err;
  }
  return null;
}

function validateRequest(projectRoot, opts) {
  if (!projectRoot) {
    return resultFailure(projectRoot, 'project-required', 'state advance requires --project=<path>', opts);
  }
  if (!opts.step) {
    return resultFailure(projectRoot, 'step-required', 'state advance requires --step=<step>', opts);
  }
  if (!opts.status) {
    return resultFailure(projectRoot, 'status-required', 'state advance requires --status=<status>', opts);
  }
  if (!VALID_STATUSES.has(opts.status)) {
    return resultFailure(projectRoot, 'status-invalid', `invalid status "${opts.status}"; expected one of ${statusList()}`, opts);
  }
  return null;
}

function advance(projectRoot, opts = {}) {
  const request = {
    step: normalizeStep(opts.step),
    status: String(opts.status || '').trim(),
    holder: opts.holder || `godpowers-state-advance:${process.pid}`,
    ttlMs: opts.ttlMs
  };
  const invalid = validateRequest(projectRoot, request);
  if (invalid) return invalid;

  const initialState = stateStore.read(projectRoot);
  if (!initialState) {
    return resultFailure(projectRoot, 'state-missing', 'state.json not found', request);
  }

  let target;
  try {
    target = resolveStep(initialState, request.step);
  } catch (e) {
    if (e.code === 'AMBIGUOUS_STEP') {
      return resultFailure(
        projectRoot,
        'step-ambiguous',
        `ambiguous step "${request.step}"; use one of ${e.matches.join(', ')}`,
        request
      );
    }
    throw e;
  }
  if (!target) {
    return resultFailure(projectRoot, 'step-not-found', `tracked step not found: ${request.step}`, request);
  }

  const lockResult = stateLock.acquire(projectRoot, {
    holder: request.holder,
    scope: `${target.tierKey}.${target.subStepKey}`,
    ttlMs: request.ttlMs
  });
  if (!lockResult.acquired) {
    return resultFailure(
      projectRoot,
      'lock-unavailable',
      `state lock unavailable: held by ${lockResult.holder} on ${lockResult.scope}`,
      request
    );
  }

  const warnings = [];
  try {
    const currentState = stateStore.read(projectRoot);
    const freshTarget = resolveStep(currentState, request.step);
    if (!freshTarget) {
      return resultFailure(projectRoot, 'step-not-found', `tracked step not found after lock: ${request.step}`, request);
    }

    const tier = currentState.tiers[freshTarget.tierKey] || {};
    const current = tier[freshTarget.subStepKey] || {};
    const previousStatus = current.status || 'pending';
    const updated = opts.now || new Date().toISOString();
    currentState.tiers[freshTarget.tierKey][freshTarget.subStepKey] = {
      ...current,
      status: request.status,
      updated
    };
    const views = stateViews.viewPathsForState(projectRoot, currentState);
    stateStore.write(projectRoot, currentState, {
      onStateViewWarning: warning => warnings.push(warning)
    });
    return resultPass(projectRoot, freshTarget, previousStatus, request.status, updated, warnings, views);
  } finally {
    stateLock.release(projectRoot, request.holder);
  }
}

function render(result) {
  const lines = [];
  lines.push('Godpowers State Advance');
  lines.push('');
  lines.push(`Verdict: ${result.verdict}`);
  if (result.verdict === 'pass') {
    const step = result.step;
    lines.push(`Step: ${step.tierKey}.${step.subStepKey}`);
    lines.push(`Status: ${result.previousStatus} to ${result.status}`);
    lines.push(`Updated: ${result.updated}`);
    for (const warning of result.warnings || []) {
      lines.push(`Warning: ${warning}`);
    }
  } else {
    for (const finding of result.findings || []) {
      lines.push(`Error: ${finding.reason}`);
    }
  }
  return lines.join('\n');
}

function exitCode(result) {
  return result && result.verdict === 'pass' ? 0 : 1;
}

module.exports = {
  VALID_STATUSES,
  advance,
  render,
  exitCode,
  resolveStep,
  statusList
};
