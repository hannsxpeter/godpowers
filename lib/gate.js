/**
 * Executable artifact gates.
 *
 * Phase 1 gates verify required artifacts on disk and run the artifact linter.
 * Later phases can add richer project command detection without changing the
 * JSON shape returned here.
 */

const fs = require('fs');
const path = require('path');

const artifactMap = require('./artifact-map');
const linter = require('./artifact-linter');

const GATE_DEFINITIONS = Object.freeze({
  prd: Object.freeze({ artifacts: Object.freeze(['prd']) }),
  design: Object.freeze({ artifacts: Object.freeze(['design']) }),
  arch: Object.freeze({ artifacts: Object.freeze(['arch']) }),
  roadmap: Object.freeze({ artifacts: Object.freeze(['roadmap']) }),
  stack: Object.freeze({ artifacts: Object.freeze(['stack']) }),
  repo: Object.freeze({ artifacts: Object.freeze(['repo']) }),
  build: Object.freeze({ artifacts: Object.freeze(['build']) }),
  harden: Object.freeze({ artifacts: Object.freeze(['harden']) })
});

function normalizeTier(tier) {
  return String(tier || '').trim().replace(/^\/?god-/, '').toLowerCase();
}

function exists(projectRoot, relPath) {
  return fs.existsSync(path.join(projectRoot, relPath));
}

function readText(projectRoot, relPath) {
  const file = path.join(projectRoot, relPath);
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file, 'utf8');
}

function artifactRows(projectRoot, artifactKey) {
  const definition = artifactMap.requireArtifact(artifactKey);
  return artifactMap.paths(artifactKey, { includeCompatibility: artifactKey === 'design' })
    .map((relPath) => ({
      key: artifactKey,
      label: definition.label,
      path: relPath,
      required: relPath === definition.primary,
      status: exists(projectRoot, relPath) ? 'present' : 'missing'
    }));
}

function checkRequiredArtifact(row) {
  if (!row.required) {
    return {
      id: `artifact.optional.${row.key}.${safeId(row.path)}`,
      status: row.status === 'present' ? 'pass' : 'skip',
      artifact: row.path,
      reason: row.status === 'present' ? 'Optional artifact exists.' : 'Optional artifact is absent.'
    };
  }
  return {
    id: `artifact.required.${row.key}`,
    status: row.status === 'present' ? 'pass' : 'fail',
    artifact: row.path,
    reason: row.status === 'present'
      ? 'Required artifact exists.'
      : 'Required artifact is missing.'
  };
}

function lintArtifact(projectRoot, row, opts) {
  if (row.status !== 'present') {
    return {
      check: {
        id: `artifact.lint.${row.key}.${safeId(row.path)}`,
        status: row.required ? 'fail' : 'skip',
        artifact: row.path,
        reason: row.required ? 'Cannot lint a missing required artifact.' : 'Optional artifact is absent.'
      },
      findings: []
    };
  }

  const result = linter.lintFile(path.join(projectRoot, row.path), {
    projectRoot,
    today: opts.today
  });
  const status = result.summary.errors > 0 ? 'fail' : 'pass';
  return {
    check: {
      id: `artifact.lint.${row.key}.${safeId(row.path)}`,
      status,
      artifact: row.path,
      reason: status === 'pass'
        ? `Artifact lint passed with ${result.summary.warnings} warning(s).`
        : `Artifact lint failed with ${result.summary.errors} error(s).`
    },
    findings: result.findings.map((finding) => ({
      ...finding,
      artifact: row.path
    }))
  };
}

function buildEvidenceChecks(projectRoot) {
  const relPath = artifactMap.primaryPath('build');
  const text = readText(projectRoot, relPath);
  const hasCommand = /`[^`\n]+`|\bnpm\s+(?:run\s+)?[a-z0-9:_-]+|\bnode\s+\S+|\bpytest\b|\bgo test\b/i.test(text);
  const hasPassed = /\b(pass(?:ed|ing)?|green|succeeded|success)\b/i.test(text);
  return [{
    id: 'build.verification-evidence',
    status: hasCommand && hasPassed ? 'pass' : 'fail',
    artifact: relPath,
    reason: hasCommand && hasPassed
      ? 'Build state records a verification command and passing result.'
      : 'Build state must record exact verification commands that passed.'
  }];
}

function hardenBlockingChecks(projectRoot) {
  const relPath = artifactMap.primaryPath('harden');
  const text = readText(projectRoot, relPath);
  const hasCritical = /\bunresolved\s+critical\b|\bcritical\b(?![^.\n]*0\b)/i.test(text);
  const launchBlocked = /launch gate\s*:\s*blocked/i.test(text);
  return [
    {
      id: 'harden.no-unresolved-critical',
      status: hasCritical ? 'fail' : 'pass',
      artifact: relPath,
      reason: hasCritical
        ? 'Harden findings contain unresolved Critical evidence.'
        : 'No unresolved Critical finding evidence detected.'
    },
    {
      id: 'harden.launch-gate',
      status: launchBlocked ? 'fail' : 'pass',
      artifact: relPath,
      reason: launchBlocked
        ? 'Harden findings record a blocked launch gate.'
        : 'No blocked launch gate detected.'
    }
  ];
}

function safeId(value) {
  return String(value).replace(/[^a-z0-9]+/gi, '.').replace(/^\.+|\.+$/g, '').toLowerCase();
}

function summarize(checks, findings) {
  const failed = checks.filter((check) => check.status === 'fail').length;
  const passed = checks.filter((check) => check.status === 'pass').length;
  const skipped = checks.filter((check) => check.status === 'skip').length;
  const errors = findings.filter((finding) => finding.severity === 'error').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  return {
    verdict: failed === 0 ? 'pass' : 'fail',
    passed,
    failed,
    skipped,
    errors,
    warnings
  };
}

function checkTier(projectRoot, tier, opts = {}) {
  const normalized = normalizeTier(tier);
  const definition = GATE_DEFINITIONS[normalized];
  if (!definition) {
    throw new Error(`Unknown Godpowers gate tier: ${tier}`);
  }

  const artifacts = definition.artifacts.flatMap((artifactKey) => artifactRows(projectRoot, artifactKey));
  const checks = [];
  const findings = [];

  for (const row of artifacts) {
    checks.push(checkRequiredArtifact(row));
    const linted = lintArtifact(projectRoot, row, opts);
    checks.push(linted.check);
    findings.push(...linted.findings);
  }

  if (normalized === 'build' && exists(projectRoot, artifactMap.primaryPath('build'))) {
    checks.push(...buildEvidenceChecks(projectRoot));
  }
  if (normalized === 'harden' && exists(projectRoot, artifactMap.primaryPath('harden'))) {
    checks.push(...hardenBlockingChecks(projectRoot));
  }

  const summary = summarize(checks, findings);
  return {
    tier: normalized,
    verdict: summary.verdict,
    artifacts,
    checks,
    findings,
    summary
  };
}

async function checkTierAsync(projectRoot, tier, opts = {}) {
  return checkTier(projectRoot, tier, opts);
}

module.exports = {
  GATE_DEFINITIONS,
  normalizeTier,
  checkTier,
  checkTierAsync
};
