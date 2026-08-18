// Implements: P-MUST-27

const fs = require('fs');
const path = require('path');

const atomic = require('./atomic-write');

const MAX_BYTES = 8192;
const FAILURE_STATUSES = new Set(['fail', 'failed', 'red', 'error']);
const MANDATORY_FIELDS = [
  'goal', 'constraints', 'requirementIds', 'status', 'completedWork', 'inProgressWork',
  'blockers', 'changedFiles', 'verificationResults', 'decisions', 'nextAction', 'criticalRefs'
];

function array(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value.slice() : [value];
}

function uniqueStrings(value) {
  const seen = new Set();
  const result = [];
  for (const item of array(value)) {
    const text = String(item || '').trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
  }
  return result;
}

function firstDefined(authority, fallback, field, warnings) {
  const authoritative = authority && authority[field];
  const projected = fallback && fallback[field];
  if (authoritative !== undefined && authoritative !== null) {
    if (projected !== undefined && projected !== null && JSON.stringify(authoritative) !== JSON.stringify(projected)) {
      warnings.push({ field, authority: 'state', ignoredValue: projected });
    }
    return authoritative;
  }
  return projected;
}

function verificationResults(records) {
  return array(records).map((record) => ({
    command: String(record.command || record.name || '').trim(),
    status: String(record.status || record.result || '').trim().toLowerCase(),
    evidenceRef: record.evidenceRef || record.evidence_ref || null
  })).filter((record) => record.command || record.status || record.evidenceRef);
}

function derive(input = {}) {
  const plan = input.plan || {};
  const state = input.state || {};
  const linkage = input.linkage || {};
  const events = array(input.events);
  const warnings = [];
  const projected = {
    ...plan,
    changedFiles: uniqueStrings([...array(plan.changedFiles), ...array(linkage.changedFiles)]),
    decisions: uniqueStrings([
      ...array(plan.decisions),
      ...events.flatMap((event) => array(event && (event.decisions || event.decision)))
    ])
  };
  const stateRequirementIds = state.requirementIds || state.requirement_ids;
  const projectedRequirementIds = linkage.requirementIds || linkage.requirement_ids ||
    plan.requirementIds || plan.requirement_ids;
  const requirementIds = stateRequirementIds !== undefined
    ? uniqueStrings(stateRequirementIds)
    : uniqueStrings(projectedRequirementIds);
  const stateIds = uniqueStrings(stateRequirementIds);
  const conflictingIds = [plan.requirementIds || plan.requirement_ids, linkage.requirementIds || linkage.requirement_ids]
    .map(uniqueStrings)
    .find((candidate) => candidate.length > 0 && JSON.stringify(candidate) !== JSON.stringify(stateIds));
  if (stateRequirementIds !== undefined && conflictingIds) {
    warnings.push({ field: 'requirementIds', authority: 'state', ignoredValue: conflictingIds });
  }
  const stateVerification = state.verificationResults !== undefined
    ? state.verificationResults
    : state.verification_results;
  const projectedVerification = input.verification !== undefined
    ? input.verification
    : (plan.verificationResults !== undefined ? plan.verificationResults : plan.verification_results);
  const stateVerificationResults = verificationResults(stateVerification);
  const projectedVerificationResults = verificationResults(projectedVerification);
  const records = stateVerification !== undefined ? stateVerificationResults : projectedVerificationResults;
  if (stateVerification !== undefined
    && JSON.stringify(stateVerificationResults) !== JSON.stringify(projectedVerificationResults)) {
    warnings.push({
      field: 'verificationResults',
      authority: 'state',
      ignoredValue: projectedVerificationResults
    });
  }
  const evidenceRefs = {
    ...(plan.evidenceRefs || {}),
    ...(linkage.evidenceRefs || {}),
    ...(state.evidenceRefs || {})
  };
  const eventRefs = events.map((event) => event && (event.ref || event.evidenceRef)).filter(Boolean);
  if (eventRefs.length > 0) evidenceRefs.events = uniqueStrings(eventRefs);

  return {
    goal: String(firstDefined(state, projected, 'goal', warnings) || ''),
    constraints: uniqueStrings(firstDefined(state, projected, 'constraints', warnings)),
    requirementIds,
    status: String(firstDefined(state, projected, 'status', warnings) || 'unknown'),
    completedWork: uniqueStrings(firstDefined(state, projected, 'completedWork', warnings)),
    inProgressWork: uniqueStrings(firstDefined(state, projected, 'inProgressWork', warnings)),
    blockers: uniqueStrings(firstDefined(state, projected, 'blockers', warnings)),
    changedFiles: uniqueStrings(firstDefined(state, projected, 'changedFiles', warnings)),
    verificationResults: records,
    decisions: uniqueStrings(firstDefined(state, projected, 'decisions', warnings)),
    nextAction: String(firstDefined(state, projected, 'nextAction', warnings) || ''),
    criticalRefs: uniqueStrings([
      ...array(plan.criticalRefs),
      ...array(linkage.criticalRefs),
      ...array(state.criticalRefs)
    ]),
    evidenceRefs,
    warnings
  };
}

function json(value) {
  return JSON.stringify(value);
}

function byteLength(value) {
  return Buffer.byteLength(json(value), 'utf8');
}

function compactCopy(handoff) {
  return JSON.parse(JSON.stringify(handoff));
}

function validateMandatory(handoff) {
  const value = handoff || {};
  const missing = MANDATORY_FIELDS.filter((field) => !Object.prototype.hasOwnProperty.call(value, field));
  const invalidStrings = ['goal', 'status', 'nextAction']
    .filter((field) => typeof value[field] !== 'string' || !value[field].trim());
  const invalidArrays = MANDATORY_FIELDS
    .filter((field) => !['goal', 'status', 'nextAction'].includes(field))
    .filter((field) => !Array.isArray(value[field]));
  if (missing.length > 0 || invalidStrings.length > 0 || invalidArrays.length > 0) {
    throw new Error(`Handoff mandatory fields are missing or invalid: ${[...new Set([...missing, ...invalidStrings, ...invalidArrays])].join(', ')}.`);
  }
}

function trimOne(result, field) {
  if (!Array.isArray(result[field]) || result[field].length === 0) return false;
  result[field].pop();
  return true;
}

function serialize(handoff) {
  validateMandatory(handoff);
  const result = compactCopy(handoff);
  const optionalArrays = [
    'completedWork', 'inProgressWork', 'decisions', 'changedFiles',
    'constraints', 'warnings', 'criticalRefs'
  ];
  for (const field of optionalArrays) {
    while (byteLength(result) > MAX_BYTES && trimOne(result, field)) {
      // Remove lower-priority detail before considering the next field.
    }
    if (byteLength(result) <= MAX_BYTES) break;
  }

  if (byteLength(result) > MAX_BYTES) {
    while (byteLength(result) > MAX_BYTES) {
      const passing = result.verificationResults.findIndex((entry) => !FAILURE_STATUSES.has(entry.status));
      if (passing === -1) break;
      result.verificationResults.splice(passing, 1);
    }
  }

  if (byteLength(result) > MAX_BYTES) {
    const protectedRefs = new Set(['requirementIds', 'blockers', 'verificationResults', 'nextAction']);
    for (const key of Object.keys(result.evidenceRefs || {}).sort()) {
      if (protectedRefs.has(key)) continue;
      delete result.evidenceRefs[key];
      if (byteLength(result) <= MAX_BYTES) break;
    }
  }

  if (byteLength(result) > MAX_BYTES) {
    throw new Error('Protected handoff evidence exceeds the 8192-byte limit. Store complete evidence on disk and pass references.');
  }
  return json(result);
}

function validId(label, value) {
  const text = String(value || '');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(text)) {
    throw new Error(`${label} must contain only letters, numbers, dot, underscore, or hyphen.`);
  }
  return text;
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}

function safeDirectory(projectRoot, runId) {
  const project = path.resolve(projectRoot);
  const projectReal = fs.realpathSync(project);
  const stateRoot = path.join(project, '.godpowers');
  if (fs.existsSync(stateRoot) && fs.lstatSync(stateRoot).isSymbolicLink()) {
    throw new Error('Project state directory must not be a symlink.');
  }
  fs.mkdirSync(stateRoot, { recursive: true });
  if (!isInside(projectReal, fs.realpathSync(stateRoot))) {
    throw new Error('Project state directory resolves outside the project.');
  }
  const runs = path.join(stateRoot, 'runs');
  fs.mkdirSync(runs, { recursive: true });
  const runsReal = fs.realpathSync(runs);
  if (!isInside(projectReal, runsReal)) throw new Error('Run root resolves outside the project.');

  const runDir = path.join(runs, runId);
  if (fs.existsSync(runDir)) {
    if (fs.lstatSync(runDir).isSymbolicLink()) throw new Error('Run directory must not be a symlink.');
    if (!isInside(runsReal, fs.realpathSync(runDir))) throw new Error('Run directory resolves outside the run root.');
  } else {
    fs.mkdirSync(runDir);
  }
  const handoffs = path.join(runDir, 'handoffs');
  if (fs.existsSync(handoffs) && fs.lstatSync(handoffs).isSymbolicLink()) {
    throw new Error('Handoff directory must not be a symlink.');
  }
  fs.mkdirSync(handoffs, { recursive: true });
  if (!isInside(runsReal, fs.realpathSync(handoffs))) throw new Error('Handoff directory resolves outside the run root.');
  return handoffs;
}

function write(projectRoot, runId, sliceId, handoff) {
  const validatedRunId = validId('Run id', runId);
  const validatedSliceId = validId('Slice id', sliceId);
  const directory = safeDirectory(projectRoot, validatedRunId);
  const file = path.join(directory, `${validatedSliceId}.json`);
  const content = serialize(handoff);
  atomic.writeFileAtomic(file, content, {
    validateContent(value) {
      JSON.parse(value);
      if (Buffer.byteLength(value, 'utf8') > MAX_BYTES) throw new Error('Serialized handoff exceeds 8192 bytes.');
    }
  });
  return file;
}

module.exports = {
  MAX_BYTES,
  FAILURE_STATUSES,
  derive,
  serialize,
  write
};
