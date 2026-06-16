/**
 * Executable Godpowers tier gates.
 *
 * Phase 1 gates are intentionally mechanical. They check expected artifacts on
 * disk, run the shared artifact linter, and apply narrow tier-specific checks.
 */

const fs = require('fs');
const path = require('path');

const artifactMap = require('./artifact-map');
const linter = require('./artifact-linter');
const router = require('./router');
const stateStore = require('./state');
const evidence = require('./evidence');

function relToAbs(projectRoot, relPath) {
  return path.join(projectRoot, relPath);
}

function makeCheck(id, status, artifact, reason) {
  return { id, status, artifact, reason };
}

function makeFinding(id, severity, artifact, reason, extra = {}) {
  return { id, severity, artifact, reason, ...extra };
}

function emptySummary() {
  return {
    errors: 0,
    warnings: 0,
    infos: 0,
    missing: 0,
    checkedArtifacts: 0
  };
}

function addFindingSummary(summary, severity) {
  if (severity === 'error') summary.errors++;
  else if (severity === 'warning') summary.warnings++;
  else summary.infos++;
}

function lintArtifact(projectRoot, relPath, opts = {}) {
  return linter.lintFile(relToAbs(projectRoot, relPath), {
    projectRoot,
    today: opts.today
  });
}

function checkArtifacts(projectRoot, tier, artifacts, opts, result) {
  for (const artifact of artifacts) {
    const exists = fs.existsSync(relToAbs(projectRoot, artifact.path));
    const artifactResult = {
      path: artifact.path,
      required: artifact.required,
      exists,
      lint: null
    };
    result.artifacts.push(artifactResult);

    if (!exists) {
      const status = artifact.required ? 'fail' : 'skipped';
      result.checks.push(makeCheck(
        `artifact:${tier}:${artifact.path}`,
        status,
        artifact.path,
        artifact.required ? 'Required artifact is missing.' : 'Optional artifact is absent.'
      ));
      if (artifact.required) {
        result.summary.missing++;
        const finding = makeFinding(
          `missing-artifact:${tier}:${artifact.path}`,
          'error',
          artifact.path,
          'Required artifact is missing.'
        );
        result.findings.push(finding);
        addFindingSummary(result.summary, finding.severity);
      }
      continue;
    }

    result.checks.push(makeCheck(
      `artifact:${tier}:${artifact.path}`,
      'pass',
      artifact.path,
      'Artifact exists on disk.'
    ));

    if (!artifact.lint) continue;
    const lintResult = lintArtifact(projectRoot, artifact.path, opts);
    artifactResult.lint = {
      type: lintResult.type,
      summary: lintResult.summary
    };
    result.summary.checkedArtifacts++;
    for (const finding of lintResult.findings) {
      result.findings.push({
        ...finding,
        id: `lint:${artifact.path}:${finding.code}:${finding.line}`,
        artifact: artifact.path,
        reason: finding.message
      });
      addFindingSummary(result.summary, finding.severity);
    }
    result.checks.push(makeCheck(
      `lint:${tier}:${artifact.path}`,
      lintResult.summary.errors > 0 ? 'fail' : 'pass',
      artifact.path,
      lintResult.summary.errors > 0
        ? `${lintResult.summary.errors} lint error(s) block this gate.`
        : `${lintResult.summary.warnings} warning(s), ${lintResult.summary.infos} info finding(s).`
    ));
  }
}

function extractPassedCommands(text) {
  return extractCommandStatuses(text)
    .filter((entry) => entry.status === 'pass')
    .map((entry) => entry.command)
    .filter((command, index, commands) => commands.indexOf(command) === index);
}

function extractFailedCommands(text) {
  return extractCommandStatuses(text)
    .filter((entry) => entry.status === 'fail')
    .map((entry) => entry.command)
    .filter((command, index, commands) => commands.indexOf(command) === index);
}

function extractCommand(line) {
  const exact = line.match(/\b(?:exact\s+executed\s+command|verification\s+command|command)\s*:\s*`([^`\n]+)`/i);
  if (exact) return exact[1].trim();
  const backtickWithStatus = line.match(/`([^`\n]+)`\s*:\s*(pass|passed|green|success|succeeded|ok|fail|failed|red|error)\b/i);
  if (backtickWithStatus) return backtickWithStatus[1].trim();
  const labeled = line.match(/\bcommand\s*:\s*([^;]+?)(?:\s{2,}|\s+status\s*:|\s+result\s*:|$)/i);
  return labeled ? labeled[1].trim() : null;
}

function explicitStatus(line) {
  const status = line.match(/\b(?:status|result|gate status)\s*:\s*(pass|passed|green|success|succeeded|ok|fail|failed|red|error)\b/i);
  if (!status) return null;
  return /fail|red|error/i.test(status[1]) ? 'fail' : 'pass';
}

function inlineCommandStatus(line) {
  if (/\b(fail|failed|red|error)\b/i.test(line)) return 'fail';
  if (/\b(pass|passed|green|success|succeeded|ok)\b/i.test(line)) return 'pass';
  return null;
}

function extractCommandStatuses(text) {
  const entries = [];
  let currentCommand = null;
  for (const line of text.split(/\r?\n/)) {
    const command = extractCommand(line);
    if (command) {
      currentCommand = command;
      const status = explicitStatus(line) || inlineCommandStatus(line);
      if (status) entries.push({ command, status });
      continue;
    }

    if (!currentCommand) continue;
    const status = explicitStatus(line);
    if (status) entries.push({ command: currentCommand, status });
  }
  return entries;
}

function commandName(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const value = entry.command || entry.cmd || entry.name;
  return value ? String(value).trim() : null;
}

function normalizeVerificationStatus(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const raw = entry.status || entry.result || entry.verdict;
  if (raw) {
    const text = String(raw).trim().toLowerCase();
    if (/^(pass|passed|green|success|succeeded|ok)$/.test(text)) return 'pass';
    if (/^(fail|failed|red|error)$/.test(text)) return 'fail';
  }
  if (Number.isInteger(entry.exitCode)) return entry.exitCode === 0 ? 'pass' : 'fail';
  return null;
}

function stateVerificationCommands(subStep) {
  if (!subStep || typeof subStep !== 'object') return [];
  const verification = subStep.verification && typeof subStep.verification === 'object'
    ? subStep.verification
    : {};
  const commands = verification.commands ||
    subStep.verificationCommands ||
    subStep['verification-commands'] ||
    [];
  return Array.isArray(commands) ? commands : [];
}

function commandsWithStatus(subStep, wantedStatus) {
  const commands = [];
  for (const entry of stateVerificationCommands(subStep)) {
    const name = commandName(entry);
    if (!name) continue;
    if (normalizeVerificationStatus(entry) !== wantedStatus) continue;
    if (!commands.includes(name)) commands.push(name);
  }
  return commands;
}

function checkStateStepEvidence(projectRoot, tier, result) {
  const stepRef = artifactMap.stateStepForTier(tier);
  if (!stepRef) return null;

  const relPath = stateStore.STATE_FILE;
  const currentState = stateStore.read(projectRoot);
  if (!currentState) {
    const finding = makeFinding(
      `state:${tier}:missing`,
      'error',
      relPath,
      `${tier} gate requires structured state evidence in state.json.`
    );
    result.findings.push(finding);
    addFindingSummary(result.summary, finding.severity);
    result.checks.push(makeCheck(`state:${tier}:status`, 'fail', relPath, finding.reason));
    return null;
  }

  const tierState = currentState.tiers && currentState.tiers[stepRef.tierKey];
  const subStep = tierState && tierState[stepRef.subStepKey];
  if (!subStep) {
    const finding = makeFinding(
      `state:${tier}:step-missing`,
      'error',
      relPath,
      `state.json does not record ${stepRef.tierKey}.${stepRef.subStepKey}.`
    );
    result.findings.push(finding);
    addFindingSummary(result.summary, finding.severity);
    result.checks.push(makeCheck(`state:${tier}:status`, 'fail', relPath, finding.reason));
    return null;
  }

  const status = subStep.status || 'pending';
  const complete = stateStore.isCompleteStatus(status);
  if (!complete) {
    const finding = makeFinding(
      `state:${tier}:incomplete`,
      'error',
      relPath,
      `${stepRef.tierKey}.${stepRef.subStepKey} status is ${status}, expected a complete status.`
    );
    result.findings.push(finding);
    addFindingSummary(result.summary, finding.severity);
  }
  result.checks.push(makeCheck(
    `state:${tier}:status`,
    complete ? 'pass' : 'fail',
    relPath,
    complete
      ? `${stepRef.tierKey}.${stepRef.subStepKey} records complete status ${status}.`
      : `${stepRef.tierKey}.${stepRef.subStepKey} must be complete before this gate passes.`
  ));
  return subStep;
}

// Executed-evidence requirement for executable-gated tiers. Generalized from
// the original build-only check: a substep whose key is in
// evidence.EXECUTED_REQUIRED_SUBSTEPS must record at least one passed
// verification command and zero failed ones. Finding ids and summary keys are
// tier-prefixed so the build tier keeps its existing `build-verification-*`
// contract while harden gains `harden-verification-*`.
function checkExecutedEvidence(result, step, tier) {
  const relPath = stateStore.STATE_FILE;
  if (!step) return;
  const label = tier.charAt(0).toUpperCase() + tier.slice(1);
  const failedCommands = commandsWithStatus(step, 'fail');
  if (failedCommands.length > 0) {
    const finding = makeFinding(
      `${tier}-verification-failed-command`,
      'error',
      relPath,
      `${label} state records failed verification command(s): ${failedCommands.join(', ')}.`
    );
    result.findings.push(finding);
    addFindingSummary(result.summary, finding.severity);
    result.checks.push(makeCheck(
      `${tier}-verification-failed-command`,
      'fail',
      relPath,
      finding.reason
    ));
    result.summary[`${tier}VerificationFailedCommands`] = failedCommands;
    return;
  }
  const passedCommands = commandsWithStatus(step, 'pass');
  if (passedCommands.length === 0) {
    const finding = makeFinding(
      `${tier}-verification-evidence`,
      'error',
      relPath,
      `${label} state does not record exact project verification commands that passed.`
    );
    result.findings.push(finding);
    addFindingSummary(result.summary, finding.severity);
    result.checks.push(makeCheck(
      `${tier}-verification-evidence`,
      'fail',
      relPath,
      finding.reason
    ));
    return;
  }
  result.checks.push(makeCheck(
    `${tier}-verification-evidence`,
    'pass',
    relPath,
    `state.json records ${passedCommands.length} passed ${tier} verification command(s).`
  ));
  result.summary[`${tier}VerificationCommands`] = passedCommands;
}

function checkHardenCriticals(projectRoot, result) {
  const relPath = '.godpowers/harden/FINDINGS.md';
  const file = relToAbs(projectRoot, relPath);
  if (!fs.existsSync(file)) return;
  const pass = router.hasNoCriticalFindings(projectRoot);
  if (!pass) {
    const finding = makeFinding(
      'harden-critical-findings',
      'error',
      relPath,
      'Harden findings contain unresolved Critical findings or a blocked launch gate.'
    );
    result.findings.push(finding);
    addFindingSummary(result.summary, finding.severity);
  }
  result.checks.push(makeCheck(
    'harden-critical-findings',
    pass ? 'pass' : 'fail',
    relPath,
    pass
      ? 'No unresolved Critical findings or blocked launch gate found.'
      : 'Unresolved Critical findings or a blocked launch gate block this gate.'
  ));
}

function finalize(result) {
  result.verdict = result.findings.some((finding) => finding.severity === 'error')
    ? 'fail'
    : 'pass';
  return result;
}

function check(opts = {}) {
  const projectRoot = path.resolve(opts.projectRoot || opts.project || process.cwd());
  const tier = artifactMap.normalizeTier(opts.tier);
  const artifacts = artifactMap.artifactsForTier(tier);
  const result = {
    tier,
    verdict: 'fail',
    project: projectRoot,
    artifacts: [],
    checks: [],
    findings: [],
    summary: emptySummary()
  };

  if (!tier || !artifacts) {
    const supported = artifactMap.tiers().join(', ');
    const finding = makeFinding(
      'unknown-tier',
      'error',
      null,
      `Unknown gate tier. Supported tiers: ${supported}.`
    );
    result.findings.push(finding);
    addFindingSummary(result.summary, finding.severity);
    result.checks.push(makeCheck('tier-supported', 'fail', null, finding.reason));
    return finalize(result);
  }

  checkArtifacts(projectRoot, tier, artifacts, opts, result);
  const stateStep = checkStateStepEvidence(projectRoot, tier, result);
  const stepRef = artifactMap.stateStepForTier(tier);
  if (stepRef && evidence.EXECUTED_REQUIRED_SUBSTEPS.has(stepRef.subStepKey)) {
    checkExecutedEvidence(result, stateStep, tier);
  }
  if (tier === 'harden') checkHardenCriticals(projectRoot, result);
  return finalize(result);
}

async function checkAsync(opts = {}) {
  return check(opts);
}

function exitCode(result) {
  return result.verdict === 'pass' ? 0 : 1;
}

function render(result) {
  const lines = [];
  lines.push(`Godpowers Gate: ${result.tier || 'unknown'}`);
  lines.push(`Verdict: ${result.verdict}`);
  lines.push('');
  lines.push('Artifacts:');
  for (const artifact of result.artifacts) {
    const marker = artifact.exists ? '+' : (artifact.required ? 'x' : '-');
    lines.push(`  ${marker} ${artifact.path}${artifact.required ? '' : ' (optional)'}`);
  }
  lines.push('');
  lines.push('Checks:');
  for (const checkResult of result.checks) {
    lines.push(`  ${checkResult.status.toUpperCase()} ${checkResult.id}: ${checkResult.reason}`);
  }
  if (result.findings.length > 0) {
    lines.push('');
    lines.push('Findings:');
    for (const finding of result.findings) {
      const where = finding.artifact ? `${finding.artifact}: ` : '';
      lines.push(`  ${finding.severity.toUpperCase()} ${finding.id}: ${where}${finding.reason}`);
    }
  }
  lines.push('');
  lines.push(`Summary: ${result.summary.errors} error(s), ${result.summary.warnings} warning(s), ${result.summary.infos} info finding(s)`);
  return lines.join('\n');
}

module.exports = {
  check,
  checkAsync,
  extractCommandStatuses,
  extractFailedCommands,
  extractPassedCommands,
  exitCode,
  render
};
