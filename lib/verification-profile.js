// Implements: P-MUST-44

const { formDefinition } = require('./product-routing');

const REQUIRED_CONTRACTS = ['launch', 'doctor', 'drive', 'evidence', 'cleanup', 'isolation'];
const FEATURE_FIELDS = ['id', 'userPath', 'drive', 'observableEndState'];
const PLACEHOLDER = /^(?:x|n\/?a|none|todo|tbd|placeholder|tests? pass(?:ed)?|works?)\.?$/i;
const PLACEHOLDER_TOKEN = /\b(?:todo|tbd|placeholder|lorem|ipsum|unknown)\b/i;

function isMaterialContract(value) {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  if (text.length < 24 || PLACEHOLDER.test(text) || PLACEHOLDER_TOKEN.test(text)) return false;
  return text.split(/\s+/).filter(Boolean).length >= 4;
}

function isMaterialFeatureId(value) {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  return /^[a-z0-9][a-z0-9._-]{2,63}$/i.test(text) && !PLACEHOLDER.test(text);
}

function addCheck(result, id, pass, reason) {
  const check = { id, status: pass ? 'pass' : 'fail', reason };
  result.checks.push(check);
  if (!pass) result.findings.push({ id, severity: 'error', reason });
}

function validateProfile(profile = {}) {
  const shaped = Boolean(profile) && typeof profile === 'object' && !Array.isArray(profile);
  const candidate = shaped ? profile : {};
  const definition = formDefinition(candidate.form);
  const result = {
    verdict: 'fail',
    form: definition ? definition.id : null,
    checks: [],
    findings: [],
    completionEvidence: definition ? definition.completionEvidence.slice() : []
  };
  addCheck(result, 'verification-profile:input', shaped, shaped
    ? 'Verification profile is a structured object.'
    : 'Verification profile must be a structured object.');
  addCheck(result, 'verification-profile:form', Boolean(definition), definition
    ? `Product form ${definition.id} has a verification profile.`
    : 'Verification profile requires a known product form.');
  for (const field of REQUIRED_CONTRACTS) {
    const present = isMaterialContract(candidate[field]);
    addCheck(result, `verification-profile:${field}`, present, present
      ? `${field} contract is recorded.`
      : `Verification profile requires a material ${field} contract.`);
  }
  const features = Array.isArray(candidate.features) ? candidate.features : [];
  addCheck(result, 'verification-profile:feature-map', features.length > 0, features.length > 0
    ? `Feature map records ${features.length} user-facing feature${features.length === 1 ? '' : 's'}.`
    : 'Verification profile requires at least one user-facing feature.');
  for (const [index, feature] of features.entries()) {
    for (const field of FEATURE_FIELDS) {
      const present = feature && (field === 'id'
        ? isMaterialFeatureId(feature[field])
        : isMaterialContract(feature[field]));
      addCheck(result, `verification-profile:feature:${index}:${field}`, present, present
        ? `Feature ${index + 1} records ${field}.`
        : `Feature ${index + 1} requires a material ${field}.`);
    }
  }
  const suppliedEvidence = Array.isArray(candidate.completionEvidence)
    ? candidate.completionEvidence
    : [];
  const missingEvidence = definition
    ? definition.completionEvidence.filter((item) => !suppliedEvidence.includes(item))
    : [];
  const invalidEvidence = definition
    ? suppliedEvidence.filter((item) => typeof item !== 'string'
      || !definition.completionEvidence.includes(item))
    : suppliedEvidence;
  const stringEvidence = suppliedEvidence.filter((item) => typeof item === 'string');
  const duplicateEvidence = stringEvidence.length - new Set(stringEvidence).size;
  const evidenceMatches = Boolean(definition)
    && missingEvidence.length === 0
    && invalidEvidence.length === 0
    && duplicateEvidence === 0
    && suppliedEvidence.length === definition.completionEvidence.length;
  addCheck(result, 'verification-profile:completion-evidence', evidenceMatches, evidenceMatches
    ? `Completion evidence matches the ${definition.id} product form.`
    : definition
      ? `Completion evidence mismatch for ${definition.id}: ${missingEvidence.length} missing, ${invalidEvidence.length} invalid or unexpected, and ${duplicateEvidence} duplicate item${duplicateEvidence === 1 ? '' : 's'}.`
      : 'Completion evidence cannot be resolved without a known product form.');
  result.verdict = result.findings.length === 0 ? 'pass' : 'fail';
  return result;
}

module.exports = {
  REQUIRED_CONTRACTS,
  FEATURE_FIELDS,
  isMaterialContract,
  isMaterialFeatureId,
  validateProfile
};
