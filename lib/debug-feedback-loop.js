// Implements: P-MUST-45

const SUPPORTED_TYPES = new Set([
  'direct',
  'differential',
  'bisection',
  'fuzz-property',
  'human-guided'
]);

const MAX_DURATION_MS = 60000;
const MAX_REPRODUCTIONS = 100;
const MAX_SCAN_NODES = 5000;
const MAX_SCAN_DEPTH = 10;
const MAX_COLLECTION_ITEMS = 500;
const MAX_HUMAN_STEPS = 50;
const MIN_PINNED_RATE = 0.8;
const MIN_RATE_ATTEMPTS = 3;

const RAW_FIELD_PATTERN = /^(?:stdout|stderr|raw|logs?|env|environment|api[_-]?key|token|password|secret|authorization|cookie)$/i;
const SECRET_VALUE_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\b(?:sk|rk|pk)-(?:proj-)?[A-Za-z0-9_-]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
  /\bBearer\s+(?!\[?REDACTED\]?|\*\*\*REDACTED\*\*\*)[A-Za-z0-9._~+/-]{8,}/i,
  /--(?:token|password|secret|api[-_]?key)(?:=|\s+)(?!\[?REDACTED\]?|\*\*\*REDACTED\*\*\*)\S+/i,
  /\b(?:token|password|secret|api[-_]?key|authorization|cookie)\s*[:=]\s*(?!\[?REDACTED\]?|\*\*\*REDACTED\*\*\*)\S{8,}/i
];

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function boundedSafetyScan(value) {
  const pending = [{ value, key: '', depth: 0 }];
  const seen = new WeakSet();
  let nodes = 0;
  while (pending.length > 0) {
    const current = pending.pop();
    nodes += 1;
    if (nodes > MAX_SCAN_NODES || current.depth > MAX_SCAN_DEPTH) {
      return { safe: false, reason: 'resource-limit' };
    }
    if (current.key && RAW_FIELD_PATTERN.test(current.key)) {
      return { safe: false, reason: 'secret' };
    }
    if (typeof current.value === 'string') {
      if (SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(current.value))) {
        return { safe: false, reason: 'secret' };
      }
      continue;
    }
    if (!current.value || typeof current.value !== 'object') continue;
    if (seen.has(current.value)) continue;
    seen.add(current.value);
    if (Array.isArray(current.value)) {
      if (current.value.length > MAX_COLLECTION_ITEMS) {
        return { safe: false, reason: 'resource-limit' };
      }
      for (let index = current.value.length - 1; index >= 0; index--) {
        const descriptor = Object.getOwnPropertyDescriptor(current.value, String(index));
        if (!descriptor) continue;
        if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
          return { safe: false, reason: 'resource-limit' };
        }
        pending.push({ value: descriptor.value, key: '', depth: current.depth + 1 });
      }
      continue;
    }
    if (!isObject(current.value)) return { safe: false, reason: 'resource-limit' };
    const descriptors = Object.getOwnPropertyDescriptors(current.value);
    const keys = Object.keys(descriptors);
    if (keys.length > MAX_COLLECTION_ITEMS) return { safe: false, reason: 'resource-limit' };
    for (let index = keys.length - 1; index >= 0; index--) {
      const key = keys[index];
      const descriptor = descriptors[key];
      if (!descriptor.enumerable) continue;
      if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
        return { safe: false, reason: 'resource-limit' };
      }
      pending.push({ value: descriptor.value, key, depth: current.depth + 1 });
    }
  }
  return { safe: true, reason: null };
}

function containsRawSecret(value) {
  return boundedSafetyScan(value).reason === 'secret';
}

function repeatabilityPasses(repeatability) {
  if (!isObject(repeatability)) return false;
  if (repeatability.deterministic === true) return true;
  if (repeatability.deterministic !== false) return false;

  const attempts = repeatability.attempts;
  const matches = repeatability.symptomMatches;
  const minimumRate = repeatability.minimumRate;
  if (!Number.isInteger(attempts) || attempts < MIN_RATE_ATTEMPTS) return false;
  if (!Number.isInteger(matches) || matches < 0 || matches > attempts) return false;
  if (!Number.isFinite(minimumRate) || minimumRate < MIN_PINNED_RATE || minimumRate > 1) return false;
  return matches / attempts >= minimumRate;
}

function directPasses(record) {
  const direct = record.direct;
  return isObject(direct)
    && (direct.kind === 'test' || direct.kind === 'script')
    && isText(direct.target);
}

function differentialPasses(record) {
  const differential = record.differential;
  return isObject(differential)
    && isText(differential.baseline)
    && isText(differential.candidate)
    && differential.baseline.trim() !== differential.candidate.trim()
    && isText(differential.distinguishingSignal);
}

function bisectionPasses(record) {
  const bisection = record.bisection;
  return isObject(bisection)
    && isText(bisection.goodRevision)
    && isText(bisection.badRevision)
    && bisection.goodRevision.trim() !== bisection.badRevision.trim()
    && isText(bisection.predicate);
}

function fuzzPropertyPasses(record) {
  const fuzzProperty = record.fuzzProperty;
  return isObject(fuzzProperty)
    && isText(fuzzProperty.property)
    && isText(fuzzProperty.seed)
    && Number.isInteger(fuzzProperty.cases)
    && fuzzProperty.cases > 0
    && isText(fuzzProperty.failingInputSummary);
}

function humanGuidedPasses(record) {
  const humanGuided = record.humanGuided;
  return isObject(humanGuided)
    && isText(humanGuided.reset)
    && Array.isArray(humanGuided.steps)
    && humanGuided.steps.length > 0
    && humanGuided.steps.length <= MAX_HUMAN_STEPS
    && humanGuided.steps.every((step) => isObject(step)
      && isText(step.action)
      && isText(step.expected))
    && isText(humanGuided.expectedObservation)
    && isText(humanGuided.actualObservation);
}

function typeSpecificPasses(record) {
  if (record.type === 'direct') return directPasses(record);
  if (record.type === 'differential') return differentialPasses(record);
  if (record.type === 'bisection') return bisectionPasses(record);
  if (record.type === 'fuzz-property') return fuzzPropertyPasses(record);
  if (record.type === 'human-guided') return humanGuidedPasses(record);
  return false;
}

function addCheck(result, index, id, pass, reason) {
  const checkId = `reproduction:${index}:${id}`;
  result.checks.push({ id: checkId, status: pass ? 'pass' : 'fail', reason });
  if (!pass) result.findings.push({ id: checkId, severity: 'error', reason });
}

function validateRecord(record, symptom, index) {
  const result = { checks: [], findings: [], passed: false };
  const shaped = isObject(record);
  addCheck(result, index, 'record', shaped,
    shaped ? 'Reproduction record is structured.' : 'Reproduction record must be an object.');
  if (!shaped) return result;

  const supportedType = SUPPORTED_TYPES.has(record.type);
  addCheck(result, index, 'type', supportedType,
    supportedType ? 'Reproduction type is supported.' : 'Reproduction type is unsupported.');
  addCheck(result, index, 'exact-symptom', isText(symptom)
    && isText(record.symptom)
    && record.symptom.trim() === symptom.trim(),
  'Reproduction must name the exact reported symptom.');
  addCheck(result, index, 'executed-command', isText(record.command) && record.executed === true,
    'Reproduction command must already have executed.');
  addCheck(result, index, 'red-capable', record.redCapable === true,
    'Executed command must be able to turn red for the exact symptom.');
  addCheck(result, index, 'repeatability', repeatabilityPasses(record.repeatability),
    'Reproduction must be deterministic or meet a pinned high reproduction rate.');
  addCheck(result, index, 'fast', Number.isFinite(record.durationMs)
    && record.durationMs > 0
    && record.durationMs <= MAX_DURATION_MS,
  `Reproduction must finish within ${MAX_DURATION_MS} milliseconds.`);
  addCheck(result, index, 'agent-runnable', isText(record.command) && record.agentRunnable === true,
    'Reproduction command must be runnable by an agent.');
  addCheck(result, index, 'redacted-evidence', isObject(record.evidence)
    && record.evidence.redacted === true
    && isText(record.evidence.summary),
  'Reproduction evidence must be explicitly redacted and summarized.');
  addCheck(result, index, 'secret-safety', !containsRawSecret(record),
    'Reproduction record must not contain raw evidence fields or raw secrets.');
  addCheck(result, index, 'type-specific', supportedType && typeSpecificPasses(record),
    'Reproduction record is missing required type-specific fields.');
  result.passed = result.findings.length === 0;
  return result;
}

function validateFeedbackLoop(input) {
  const result = { verdict: 'fail', checks: [], findings: [], candidate: null };
  if (!isObject(input) || !isText(input.symptom) || !Array.isArray(input.reproductions)
    || input.reproductions.length === 0) {
    result.checks.push({
      id: 'feedback-loop:input',
      status: 'fail',
      reason: 'Feedback loop needs one symptom and at least one reproduction record.'
    });
    result.findings.push({
      id: 'feedback-loop:input',
      severity: 'error',
      reason: 'Feedback loop needs one symptom and at least one reproduction record.'
    });
    return result;
  }

  if (input.reproductions.length > MAX_REPRODUCTIONS) {
    const reason = `Feedback loop allows at most ${MAX_REPRODUCTIONS} reproduction records.`;
    result.checks.push({ id: 'feedback-loop:resource-bounds', status: 'fail', reason });
    result.findings.push({ id: 'feedback-loop:resource-bounds', severity: 'error', reason });
    return result;
  }

  const safety = boundedSafetyScan(input);
  if (!safety.safe && safety.reason === 'resource-limit') {
    const id = 'feedback-loop:resource-bounds';
    const reason = 'Feedback loop exceeds recursive validation bounds.';
    result.checks.push({ id, status: 'fail', reason });
    result.findings.push({ id, severity: 'error', reason });
    return result;
  }

  const validations = input.reproductions.map((record, index) =>
    validateRecord(record, input.symptom, index));
  const hasUnsafeRecord = validations.some((validation) => validation.checks.some((check) =>
    check.id.endsWith(':secret-safety') && check.status === 'fail'));
  if (hasUnsafeRecord) {
    result.checks = validations.flatMap((validation) => validation.checks);
    result.findings = validations.flatMap((validation) => validation.findings);
    return result;
  }
  const candidateIndex = validations.findIndex((validation) => validation.passed);
  if (candidateIndex !== -1) {
    result.verdict = 'pass';
    result.checks = validations[candidateIndex].checks;
    result.candidate = {
      index: candidateIndex,
      type: input.reproductions[candidateIndex].type
    };
    return result;
  }

  result.checks = validations.flatMap((validation) => validation.checks);
  result.findings = validations.flatMap((validation) => validation.findings);
  return result;
}

module.exports = {
  MAX_DURATION_MS,
  MAX_REPRODUCTIONS,
  MAX_SCAN_NODES,
  MAX_SCAN_DEPTH,
  MAX_COLLECTION_ITEMS,
  MAX_HUMAN_STEPS,
  MIN_PINNED_RATE,
  SUPPORTED_TYPES,
  validateFeedbackLoop
};
