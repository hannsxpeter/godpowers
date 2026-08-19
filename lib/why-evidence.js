// Implements: P-MUST-47

const EVIDENCE_CATEGORIES = [
  'git-history',
  'code-structure',
  'tests',
  'docs-artifacts',
  'runtime'
];
const STATEMENT_KINDS = ['fact', 'inference', 'contradiction', 'unknown'];
const CONFIDENCE_LEVELS = ['low', 'medium', 'high'];
const MAX_EVIDENCE_ITEMS = 20;
const MAX_TARGET_LENGTH = 512;
const MAX_CLAIM_LENGTH = 4096;
const MAX_SOURCE_LENGTH = 1024;
const MAX_STATEMENT_LENGTH = 8192;
const MAX_INPUT_STRING_LENGTH = 8192;
const MAX_SCAN_DEPTH = 8;
const MAX_SCAN_NODES = 500;
const SECRET_FIELD_NAMES = new Set([
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'accesstoken',
  'refreshtoken',
  'apikey',
  'authorization',
  'cookie',
  'setcookie',
  'clientsecret',
  'privatekey'
]);
const SECRET_VALUE_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bBearer\s+(?!\[?REDACTED\]?)[A-Za-z0-9._~+/-]{8,}/i,
  /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
  /\b(?:password|passwd|secret|token|api[-_]?key|authorization|cookie)\s*[:=]\s*(?!\[?REDACTED\]?)[^\s"',;]{4,}/i
];

function addCheck(result, id, pass, reason) {
  const check = { id, status: pass ? 'pass' : 'fail', reason };
  result.checks.push(check);
  if (!pass) result.findings.push({ id, severity: 'error', reason });
}

function isMaterialString(value) {
  return typeof value === 'string' && value.trim().length >= 12;
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : null;
}

function normalizeEvidence(evidence) {
  const candidate = evidence && typeof evidence === 'object' && !Array.isArray(evidence)
    ? evidence
    : {};
  return {
    kind: typeof candidate.kind === 'string' ? candidate.kind : null,
    category: typeof candidate.category === 'string' ? candidate.category : null,
    source: normalizeText(candidate.source),
    target: normalizeText(candidate.target),
    statement: normalizeText(candidate.statement)
  };
}

function normalizedFieldName(value) {
  return String(value).replace(/[-_\s]/g, '').toLowerCase();
}

function isSecretFieldName(value) {
  const name = normalizedFieldName(value);
  return SECRET_FIELD_NAMES.has(name)
    || ['password', 'secret', 'token', 'apikey', 'authorization', 'cookie', 'privatekey']
      .some((suffix) => name.endsWith(suffix));
}

function scanInput(value, state, depth = 0, fieldName = '') {
  state.nodes += 1;
  if (state.nodes > MAX_SCAN_NODES || depth > MAX_SCAN_DEPTH) {
    state.bounded = false;
    return;
  }
  if (fieldName && isSecretFieldName(fieldName)) {
    state.secretSafe = false;
    return;
  }
  if (typeof value === 'string') {
    if (value.length > MAX_INPUT_STRING_LENGTH) state.bounded = false;
    if (SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value))) state.secretSafe = false;
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (state.seen.has(value)) {
    state.bounded = false;
    return;
  }
  state.seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      scanInput(item, state, depth + 1);
      if (!state.bounded || !state.secretSafe) return;
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    scanInput(child, state, depth + 1, key);
    if (!state.bounded || !state.secretSafe) return;
  }
}

function knownStringsWithinBounds(candidate, evidence) {
  if (typeof candidate.target === 'string' && candidate.target.length > MAX_TARGET_LENGTH) return false;
  if (typeof candidate.claim === 'string' && candidate.claim.length > MAX_CLAIM_LENGTH) return false;
  return evidence.every((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return true;
    return !(typeof item.target === 'string' && item.target.length > MAX_TARGET_LENGTH)
      && !(typeof item.source === 'string' && item.source.length > MAX_SOURCE_LENGTH)
      && !(typeof item.statement === 'string' && item.statement.length > MAX_STATEMENT_LENGTH);
  });
}

function safeFailure(id, reason) {
  const check = { id, status: 'fail', reason };
  return {
    verdict: 'fail',
    target: null,
    claim: null,
    confidence: null,
    evidence: [],
    checks: [check],
    findings: [{ id, severity: 'error', reason }]
  };
}

function validateWhyEvidence(record = {}) {
  const shaped = Boolean(record) && typeof record === 'object' && !Array.isArray(record);
  const candidate = shaped ? record : {};
  const rawEvidence = Array.isArray(candidate.evidence) ? candidate.evidence : [];
  if (rawEvidence.length > MAX_EVIDENCE_ITEMS) {
    return safeFailure('why-evidence:evidence-count',
      `Why evidence accepts at most ${MAX_EVIDENCE_ITEMS} evidence items.`);
  }
  const scan = { bounded: true, secretSafe: true, nodes: 0, seen: new WeakSet() };
  scanInput(record, scan);
  if (!scan.secretSafe) {
    return safeFailure('why-evidence:secret-safety',
      'Why evidence contains a secret-bearing field or value and was rejected.');
  }
  if (!scan.bounded || !knownStringsWithinBounds(candidate, rawEvidence)) {
    return safeFailure('why-evidence:string-bounds',
      'Why evidence exceeds an explicit input or string bound.');
  }
  const evidence = Array.from(rawEvidence, normalizeEvidence);
  const result = {
    verdict: 'fail',
    target: normalizeText(candidate.target),
    claim: normalizeText(candidate.claim),
    confidence: CONFIDENCE_LEVELS.includes(candidate.confidence) ? candidate.confidence : null,
    evidence,
    checks: [],
    findings: []
  };

  addCheck(result, 'why-evidence:input', shaped, shaped
    ? 'Why evidence is a structured object.'
    : 'Why evidence must be a structured object.');
  addCheck(result, 'why-evidence:target', isMaterialString(candidate.target), isMaterialString(candidate.target)
    ? 'Why evidence identifies a material target.'
    : 'Why evidence requires a material target.');
  addCheck(result, 'why-evidence:claim', isMaterialString(candidate.claim), isMaterialString(candidate.claim)
    ? 'Why evidence records a material claim.'
    : 'Why evidence requires a material claim.');
  const confidenceValid = CONFIDENCE_LEVELS.includes(candidate.confidence);
  addCheck(result, 'why-evidence:confidence', confidenceValid, confidenceValid
    ? `Confidence is calibrated as ${candidate.confidence}.`
    : 'Confidence must be low, medium, or high.');
  addCheck(result, 'why-evidence:evidence', rawEvidence.length >= 2, rawEvidence.length >= 2
    ? `Why evidence records ${rawEvidence.length} evidence items.`
    : 'Why evidence requires at least two evidence items.');

  for (const [index, item] of rawEvidence.entries()) {
    const shapedItem = Boolean(item) && typeof item === 'object' && !Array.isArray(item);
    const candidateItem = shapedItem ? item : {};
    addCheck(result, `why-evidence:item:${index}:input`, shapedItem, shapedItem
      ? `Evidence item ${index + 1} is structured.`
      : `Evidence item ${index + 1} must be structured.`);
    addCheck(result, `why-evidence:item:${index}:kind`, STATEMENT_KINDS.includes(candidateItem.kind),
      STATEMENT_KINDS.includes(candidateItem.kind)
        ? `Evidence item ${index + 1} is classified as ${candidateItem.kind}.`
        : `Evidence item ${index + 1} requires a bounded statement kind.`);
    addCheck(result, `why-evidence:item:${index}:category`, EVIDENCE_CATEGORIES.includes(candidateItem.category),
      EVIDENCE_CATEGORIES.includes(candidateItem.category)
        ? `Evidence item ${index + 1} uses ${candidateItem.category}.`
        : `Evidence item ${index + 1} requires a bounded evidence category.`);
    addCheck(result, `why-evidence:item:${index}:source`, isMaterialString(candidateItem.source),
      isMaterialString(candidateItem.source)
        ? `Evidence item ${index + 1} has a source identifier.`
        : `Evidence item ${index + 1} requires a material source identifier.`);
    const targetMatches = normalizeText(candidateItem.target) === normalizeText(candidate.target);
    addCheck(result, `why-evidence:item:${index}:target`, targetMatches,
      targetMatches
        ? `Evidence item ${index + 1} matches the requested target.`
        : `Evidence item ${index + 1} does not match the requested target.`);
    addCheck(result, `why-evidence:item:${index}:statement`, isMaterialString(candidateItem.statement),
      isMaterialString(candidateItem.statement)
        ? `Evidence item ${index + 1} records a material statement.`
        : `Evidence item ${index + 1} requires a material statement.`);
    addCheck(result, `why-evidence:item:${index}:secret`, true,
      `Evidence item ${index + 1} passed recursive secret preflight.`);
  }

  const validSources = rawEvidence
    .map((item) => normalizeText(item && item.source))
    .filter(isMaterialString);
  const sourceDiversity = new Set(validSources).size >= 2;
  addCheck(result, 'why-evidence:source-diversity', sourceDiversity, sourceDiversity
    ? 'Why evidence uses at least two distinct source identifiers.'
    : 'Why evidence requires at least two distinct source identifiers.');

  const validCategories = rawEvidence
    .map((item) => item && item.category)
    .filter((category) => EVIDENCE_CATEGORIES.includes(category));
  const categoryCount = new Set(validCategories).size;
  const categoryDiversity = categoryCount >= 2;
  addCheck(result, 'why-evidence:category-diversity', categoryDiversity, categoryDiversity
    ? 'Why evidence uses at least two independent evidence categories.'
    : 'Why evidence requires at least two independent evidence categories.');

  const confidenceCalibrated = confidenceValid
    && categoryCount >= (candidate.confidence === 'high' ? 3 : 2);
  addCheck(result, 'why-evidence:confidence-calibration', confidenceCalibrated, confidenceCalibrated
    ? `The ${candidate.confidence} confidence conclusion matches source diversity.`
    : 'The stated confidence exceeds the available source diversity.');

  for (const kind of ['contradiction', 'unknown']) {
    const absent = !rawEvidence.some((item) => item && item.kind === kind);
    addCheck(result, `why-evidence:${kind}`, absent, absent
      ? `No unresolved ${kind} blocks the conclusion.`
      : `An unresolved ${kind} blocks the conclusion.`);
  }

  result.verdict = result.findings.length === 0 ? 'pass' : 'fail';
  return result;
}

module.exports = {
  EVIDENCE_CATEGORIES,
  STATEMENT_KINDS,
  CONFIDENCE_LEVELS,
  MAX_EVIDENCE_ITEMS,
  MAX_TARGET_LENGTH,
  MAX_CLAIM_LENGTH,
  MAX_SOURCE_LENGTH,
  MAX_STATEMENT_LENGTH,
  MAX_INPUT_STRING_LENGTH,
  validateWhyEvidence
};
