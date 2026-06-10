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

const GATE_STATE_STEPS = {
  design: ['tier-1', 'design'],
  build: ['tier-2', 'build']
};

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

function recordFinding(result, id, severity, artifact, reason, extra = {}) {
  const finding = makeFinding(id, severity, artifact, reason, extra);
  result.findings.push(finding);
  addFindingSummary(result.summary, finding.severity);
  return finding;
}

function normalizeEvidenceStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (/^(pass|passed|green|success|succeeded|ok)$/.test(value)) return 'pass';
  if (/^(fail|failed|red|error|blocked|block)$/.test(value)) return 'fail';
  if (/^(warn|warning|warnings)$/.test(value)) return 'warn';
  return value || null;
}

function readGateState(projectRoot, result, tier) {
  const relPath = '.godpowers/state.json';
  try {
    const currentState = stateStore.read(projectRoot);
    if (!currentState) {
      const finding = recordFinding(
        result,
        `${tier}-state-evidence`,
        'error',
        relPath,
        `${tier} gate requires structured evidence in state.json.`
      );
      result.checks.push(makeCheck(`${tier}-state-evidence`, 'fail', relPath, finding.reason));
      return null;
    }
    return currentState;
  } catch (e) {
    const finding = recordFinding(
      result,
      `${tier}-state-read`,
      'error',
      relPath,
      e.message
    );
    result.checks.push(makeCheck(`${tier}-state-read`, 'fail', relPath, finding.reason));
    return null;
  }
}

function stateStepForGate(projectRoot, result, tier) {
  const relPath = '.godpowers/state.json';
  const currentState = readGateState(projectRoot, result, tier);
  if (!currentState) return null;
  const location = GATE_STATE_STEPS[tier];
  const step = location &&
    currentState.tiers &&
    currentState.tiers[location[0]] &&
    currentState.tiers[location[0]][location[1]];

  if (!step) {
    const finding = recordFinding(
      result,
      `${tier}-state-step`,
      'error',
      relPath,
      `state.json does not record ${location ? location.join('.') : tier} gate evidence.`
    );
    result.checks.push(makeCheck(`${tier}-state-step`, 'fail', relPath, finding.reason));
    return null;
  }

  result.checks.push(makeCheck(
    `${tier}-state-step`,
    'pass',
    relPath,
    `state.json records ${location.join('.')} gate evidence.`
  ));
  return step;
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

function checkDesignEvidence(projectRoot, result) {
  const relPath = '.godpowers/state.json';
  const step = stateStepForGate(projectRoot, result, 'design');
  if (!step) return;

  const lint = step['design-lint'] || {};
  const lintStatus = normalizeEvidenceStatus(lint.status);
  const lintErrors = Number(lint.errors || 0);
  if (lintStatus !== 'pass' || lintErrors > 0) {
    const finding = recordFinding(
      result,
      'design-lint-state',
      'error',
      relPath,
      'state.json does not record a passing design lint result.'
    );
    result.checks.push(makeCheck('design-lint-state', 'fail', relPath, finding.reason));
  } else {
    result.checks.push(makeCheck(
      'design-lint-state',
      'pass',
      relPath,
      `state.json records design lint passing with ${lintErrors} error(s).`
    ));
  }

  const review = step['design-review'] || {};
  const reviewStatus = normalizeEvidenceStatus(review.verdict || review.status);
  if (!reviewStatus || reviewStatus === 'fail') {
    const finding = recordFinding(
      result,
      'design-review-state',
      'error',
      relPath,
      'state.json does not record a passing or warning design review verdict.'
    );
    result.checks.push(makeCheck('design-review-state', 'fail', relPath, finding.reason));
  } else {
    result.checks.push(makeCheck(
      'design-review-state',
      'pass',
      relPath,
      `state.json records design review verdict ${review.verdict || review.status}.`
    ));
  }

  if (!Array.isArray(step['command-history'])) {
    const finding = recordFinding(
      result,
      'design-command-history-state',
      'error',
      relPath,
      'state.json does not record design command history.'
    );
    result.checks.push(makeCheck('design-command-history-state', 'fail', relPath, finding.reason));
  } else {
    result.checks.push(makeCheck(
      'design-command-history-state',
      'pass',
      relPath,
      `state.json records ${step['command-history'].length} design command history item(s).`
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

function commandEntriesFromState(step) {
  if (Array.isArray(step['verification-commands'])) return step['verification-commands'];
  if (step.verification && Array.isArray(step.verification.commands)) {
    return step.verification.commands;
  }
  return [];
}

function commandName(entry) {
  return String(entry && (entry.command || entry.cmd || entry.name) || '').trim();
}

function checkBuildEvidence(projectRoot, result) {
  const relPath = '.godpowers/state.json';
  const step = stateStepForGate(projectRoot, result, 'build');
  if (!step) return;

  const commandEntries = commandEntriesFromState(step);
  const failedCommands = commandEntries
    .filter((entry) => normalizeEvidenceStatus(entry && (entry.status || entry.result)) === 'fail')
    .map(commandName)
    .filter(Boolean)
    .filter((command, index, commands) => commands.indexOf(command) === index);
  if (failedCommands.length > 0) {
    const finding = recordFinding(
      result,
      'build-verification-failed-command',
      'error',
      relPath,
      `Build state records failed verification command(s): ${failedCommands.join(', ')}.`
    );
    result.checks.push(makeCheck(
      'build-verification-failed-command',
      'fail',
      relPath,
      finding.reason
    ));
    result.summary.buildVerificationFailedCommands = failedCommands;
    return;
  }
  const passedCommands = commandEntries
    .filter((entry) => normalizeEvidenceStatus(entry && (entry.status || entry.result)) === 'pass')
    .map(commandName)
    .filter(Boolean)
    .filter((command, index, commands) => commands.indexOf(command) === index);
  if (passedCommands.length === 0) {
    const finding = recordFinding(
      result,
      'build-verification-evidence',
      'error',
      relPath,
      'state.json does not record exact project verification commands that passed.'
    );
    result.checks.push(makeCheck(
      'build-verification-evidence',
      'fail',
      relPath,
      finding.reason
    ));
    return;
  }
  result.checks.push(makeCheck(
    'build-verification-evidence',
    'pass',
    relPath,
    `state.json records ${passedCommands.length} passed verification command(s).`
  ));
  result.summary.buildVerificationCommands = passedCommands;
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
  if (tier === 'design') checkDesignEvidence(projectRoot, result);
  if (tier === 'build') checkBuildEvidence(projectRoot, result);
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
