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
const syncFs = require('./sync-fs');
const programDesign = require('./program-design');

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
    // Resolve mdx-first with legacy .md fallback so pre-mdx projects still
    // pass. Report the resolved path so gate output matches disk.
    const relPath = syncFs.resolveArtifact(projectRoot, artifact.path);
    const exists = fs.existsSync(relToAbs(projectRoot, relPath));
    const artifactResult = {
      path: relPath,
      required: artifact.required,
      exists,
      lint: null
    };
    result.artifacts.push(artifactResult);

    if (!exists) {
      const status = artifact.required ? 'fail' : 'skipped';
      result.checks.push(makeCheck(
        `artifact:${tier}:${relPath}`,
        status,
        relPath,
        artifact.required ? 'Required artifact is missing.' : 'Optional artifact is absent.'
      ));
      if (artifact.required) {
        result.summary.missing++;
        const finding = makeFinding(
          `missing-artifact:${tier}:${relPath}`,
          'error',
          relPath,
          'Required artifact is missing.'
        );
        result.findings.push(finding);
        addFindingSummary(result.summary, finding.severity);
      }
      continue;
    }

    result.checks.push(makeCheck(
      `artifact:${tier}:${relPath}`,
      'pass',
      relPath,
      'Artifact exists on disk.'
    ));

    if (!artifact.lint) continue;
    const lintResult = lintArtifact(projectRoot, relPath, opts);
    artifactResult.lint = {
      type: lintResult.type,
      summary: lintResult.summary
    };
    result.summary.checkedArtifacts++;
    for (const finding of lintResult.findings) {
      result.findings.push({
        ...finding,
        id: `lint:${relPath}:${finding.code}:${finding.line}`,
        artifact: relPath,
        reason: finding.message
      });
      addFindingSummary(result.summary, finding.severity);
    }
    result.checks.push(makeCheck(
      `lint:${tier}:${relPath}`,
      lintResult.summary.errors > 0 ? 'fail' : 'pass',
      relPath,
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

// Severity of the attestation-gap finding: a claimed-pass verification command
// with no fresh executed ledger record backing it. Ships as 'warning' so
// in-flight projects that never ran `npx godpowers verify` do not retroactively
// fail their gates; promoting the pair to blocking is this one-line change.
const ATTESTATION_GAP_SEVERITY = 'warning';

// Executed-evidence requirement for executable-gated tiers. Generalized from
// the original build-only check: a substep whose key is in
// evidence.EXECUTED_REQUIRED_SUBSTEPS must record at least one passed
// verification command and zero failed ones. Finding ids and summary keys are
// tier-prefixed so the build tier keeps its existing `build-verification-*`
// contract while harden gains `harden-verification-*`.
//
// The claimed statuses in state.json are agent-authored, so on their own they
// are attestation, not evidence. Every claimed pass is therefore corroborated
// against the executed-evidence ledger (lib/evidence.js verifications.jsonl,
// spawnSync-backed): the gate reports the claimed count and the
// executed-backed count side by side, and a claimed pass with no fresh
// verified executed record raises the `${tier}-attestation-gap` finding.
function checkExecutedEvidence(projectRoot, result, step, tier) {
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
  checkAttestationBacking(projectRoot, result, step, tier, passedCommands);
}

function executedBackedCommands(projectRoot, step, tier, claimedCommands) {
  const stepRef = artifactMap.stateStepForTier(tier);
  if (!stepRef) return [];
  const canonical = `${stepRef.tierKey}.${stepRef.subStepKey}`;
  const wentInFlightAt = step.updated || null;
  let ledger;
  try {
    ledger = evidence.read(projectRoot);
  } catch (_) {
    ledger = [];
  }
  const fresh = ledger.filter((record) => record &&
    record.kind === 'executed' &&
    record.substep === canonical &&
    (!wentInFlightAt || (record.timestamp && record.timestamp >= wentInFlightAt)));
  // Latest fresh record per command wins (append order, matching
  // evidence.canClose): a pass followed by a fail must not keep backing the
  // claim on the strength of the stale pass.
  const latestByCommand = new Map();
  for (const record of fresh) {
    const name = record.command ? String(record.command).trim() : null;
    if (name) latestByCommand.set(name, record);
  }
  return claimedCommands.filter((command) => {
    const latest = latestByCommand.get(String(command).trim());
    return Boolean(latest && latest.verified === true);
  });
}

// Claimed-vs-executed-backed pair for an executable-gated tier, consumed by
// status surfaces (lib/dashboard.js). Returns null when the substep is absent
// or records no claimed-pass commands. The pair always travels together: a
// claimed count is attestation until the ledger corroborates it.
function verificationEvidencePair(projectRoot, currentState, tier) {
  const stepRef = artifactMap.stateStepForTier(tier);
  if (!stepRef) return null;
  const tierState = currentState && currentState.tiers && currentState.tiers[stepRef.tierKey];
  const step = tierState && tierState[stepRef.subStepKey];
  if (!step) return null;
  const claimed = commandsWithStatus(step, 'pass');
  if (claimed.length === 0) return null;
  const backed = executedBackedCommands(projectRoot, step, tier, claimed);
  return { tier, claimed: claimed.length, backed: backed.length };
}

function checkAttestationBacking(projectRoot, result, step, tier, passedCommands) {
  const relPath = stateStore.STATE_FILE;
  const backed = executedBackedCommands(projectRoot, step, tier, passedCommands);
  result.summary[`${tier}VerificationExecutedBacked`] = backed;
  const unbacked = passedCommands.filter((command) => !backed.includes(command));
  if (unbacked.length === 0) {
    result.checks.push(makeCheck(
      `${tier}-attestation-gap`,
      'pass',
      relPath,
      `All ${passedCommands.length} claimed-pass ${tier} command(s) are backed by fresh executed ledger records.`
    ));
    return;
  }
  const finding = makeFinding(
    `${tier}-attestation-gap`,
    ATTESTATION_GAP_SEVERITY,
    relPath,
    `Attested, not executed: ${unbacked.length} of ${passedCommands.length} claimed-pass ${tier} `
    + `command(s) have no fresh executed record in the evidence ledger: ${unbacked.join(', ')}. `
    + 'Run them via `npx godpowers verify "<command>" --substep=<id>` so the claim is machine-checked.'
  );
  result.findings.push(finding);
  addFindingSummary(result.summary, finding.severity);
  result.checks.push(makeCheck(
    `${tier}-attestation-gap`,
    'fail',
    relPath,
    finding.reason
  ));
}

function checkHardenCriticals(projectRoot, result) {
  const mapped = artifactMap.requiredArtifactsForTier('harden')[0].path;
  const relPath = syncFs.resolveArtifact(projectRoot, mapped);
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

const OWASP_2025_IDS = [
  'A01:2025', 'A02:2025', 'A03:2025', 'A04:2025', 'A05:2025',
  'A06:2025', 'A07:2025', 'A08:2025', 'A09:2025', 'A10:2025'
];

function checkHardenOwasp2025(projectRoot, result) {
  const mapped = artifactMap.requiredArtifactsForTier('harden')[0].path;
  const relPath = syncFs.resolveArtifact(projectRoot, mapped);
  const content = syncFs.readArtifactOrNull(projectRoot, mapped);
  if (content === null) return;

  const rows = new Map();
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\|\s*(A\d{2}:2025)\b[^|]*\|([^|]*)\|([^|]*)\|([^|]*)\|\s*$/i);
    if (!match) continue;
    rows.set(match[1].toUpperCase(), match.slice(2).map(value => value.trim()));
  }

  const missing = OWASP_2025_IDS.filter(id => !rows.has(id));
  const incomplete = [];
  for (const [id, cells] of rows.entries()) {
    if (cells.some(value => !value || /^\s*(?:\[[^\]]*\]|todo|tbd|pending)\s*$/i.test(value))) incomplete.push(id);
  }
  const pass = missing.length === 0 && incomplete.length === 0;
  if (!pass) {
    const details = [
      missing.length > 0 ? `missing rows: ${missing.join(', ')}` : null,
      incomplete.length > 0 ? `placeholder or empty evidence: ${incomplete.join(', ')}` : null
    ].filter(Boolean).join('; ');
    const finding = makeFinding(
      'harden-owasp-2025-evidence',
      'error',
      relPath,
      `Harden findings must record manual procedure, result, and evidence for all OWASP Web Top 10:2025 categories (${details}).`
    );
    result.findings.push(finding);
    addFindingSummary(result.summary, finding.severity);
  }
  result.checks.push(makeCheck(
    'harden-owasp-2025-evidence',
    pass ? 'pass' : 'fail',
    relPath,
    pass
      ? 'All ten OWASP Web Top 10:2025 categories record manual procedure, result, and evidence.'
      : 'OWASP Web Top 10:2025 manual evidence is incomplete.'
  ));

  // Advisory citation check: an evidence cell is table-shaped self-report
  // until it points at something that provably ran. A cell resolves when it
  // cites `ledger:<timestamp>` matching an executed record, or names a
  // backticked command matching an executed record's command.
  if (rows.size > 0) {
    const uncited = owaspUncitedRows(projectRoot, rows);
    if (uncited.length === 0) {
      result.checks.push(makeCheck(
        'harden-owasp-citation',
        'pass',
        relPath,
        'Every OWASP evidence cell cites a resolvable executed-ledger record.'
      ));
    } else {
      const finding = makeFinding(
        'harden-owasp-citation',
        'warning',
        relPath,
        `OWASP evidence cells cite no resolvable executed-ledger record for ${uncited.join(', ')}. `
        + 'Advisory: run probes via `npx godpowers verify "<probe>" --substep=tier-3.harden` and cite '
        + '`ledger:<timestamp>` or the exact probe command in backticks in the evidence cell.'
      );
      result.findings.push(finding);
      addFindingSummary(result.summary, finding.severity);
      result.checks.push(makeCheck(
        'harden-owasp-citation',
        'fail',
        relPath,
        finding.reason
      ));
    }
  }
}

// Implements: P-MUST-26
function checkBuildProgramDesign(projectRoot, result, step, opts = {}) {
  if (!step) return;
  const declaredScale = String(step.scale || '').toLowerCase();
  const declaredPlan = step.planArtifact || step.plan || step.planPath;
  const shouldValidate = Boolean(declaredPlan) || ['small', 'medium', 'large'].includes(declaredScale);
  if (!shouldValidate) return;

  const rawPath = String(declaredPlan || 'build/PLAN.mdx');
  const relPath = rawPath.startsWith('.godpowers/') ? rawPath : path.join('.godpowers', rawPath);
  const file = path.resolve(projectRoot, relPath);
  const root = path.resolve(projectRoot);
  const relative = path.relative(root, file);
  let fileReal = null;
  let rootReal = null;
  try {
    if (fs.existsSync(file)) {
      rootReal = fs.realpathSync(root);
      fileReal = fs.realpathSync(file);
    }
  } catch (_) {
    fileReal = null;
  }
  const realRelative = rootReal && fileReal ? path.relative(rootReal, fileReal) : null;
  const invalidRealPath = realRelative === null || realRelative === '..'
    || realRelative.startsWith('..' + path.sep) || path.isAbsolute(realRelative);
  if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)
    || !fs.existsSync(file) || invalidRealPath) {
    const finding = makeFinding(
      'build-program-design:missing-plan',
      'error',
      relPath,
      'Build closeout references a missing or invalid program design plan.'
    );
    result.findings.push(finding);
    addFindingSummary(result.summary, finding.severity);
    result.checks.push(makeCheck('build-program-design', 'fail', relPath, finding.reason));
    return;
  }

  const mode = opts.yolo === true || step.mode === 'yolo' ? 'yolo' : 'human';
  const validation = programDesign.validateFile(fileReal, { projectRoot, mode });
  result.summary.programDesignScale = validation.scale;
  result.summary.programDesignApproval = validation.approval.status;
  for (const sourceFinding of validation.findings) {
    const finding = makeFinding(
      `build-${sourceFinding.id}`,
      sourceFinding.severity,
      relPath,
      sourceFinding.reason
    );
    result.findings.push(finding);
    addFindingSummary(result.summary, finding.severity);
  }
  if (declaredScale && validation.scale !== declaredScale) {
    const finding = makeFinding(
      'build-program-design:scale-mismatch',
      'error',
      relPath,
      `Build state scale ${declaredScale} conflicts with plan scale ${validation.scale || 'missing'}.`
    );
    result.findings.push(finding);
    addFindingSummary(result.summary, finding.severity);
  }
  const pass = validation.verdict === 'pass' &&
    (!declaredScale || validation.scale === declaredScale);
  result.checks.push(makeCheck(
    'build-program-design',
    pass ? 'pass' : 'fail',
    relPath,
    pass
      ? `${validation.scale} program design is complete and approved.`
      : `${validation.scale || 'unscaled'} program design is incomplete or unapproved.`
  ));
}

function owaspUncitedRows(projectRoot, rows) {
  let ledger;
  try {
    ledger = evidence.read(projectRoot);
  } catch (_) {
    ledger = [];
  }
  const executed = ledger.filter((record) => record && record.kind === 'executed');
  const timestamps = executed.map((record) => String(record.timestamp || ''));
  const commands = new Set(executed
    .map((record) => (record.command ? String(record.command).trim() : null))
    .filter(Boolean));
  const uncited = [];
  for (const [id, cells] of rows.entries()) {
    const evidenceCell = cells[2] || '';
    const ledgerRef = evidenceCell.match(/ledger:([0-9TZ:.+-]+)/i);
    if (ledgerRef && timestamps.some((timestamp) => timestamp.startsWith(ledgerRef[1]))) continue;
    const citedCommands = [...evidenceCell.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim());
    if (citedCommands.some((command) => commands.has(command))) continue;
    uncited.push(id);
  }
  return uncited.sort();
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

  let effectiveArtifacts = artifacts;
  if (tier === 'design') {
    const currentState = stateStore.read(projectRoot);
    const design = currentState && currentState.tiers && currentState.tiers['tier-1']
      ? currentState.tiers['tier-1'].design
      : null;
    const designRequired = !(design && design.status === 'not-required');
    result.summary.designRequired = designRequired;
    result.checks.push(makeCheck(
      'design-requirement',
      'pass',
      stateStore.STATE_FILE,
      designRequired
        ? 'State requires the design tier.'
        : 'State records the design tier as not-required.'
    ));
    if (!designRequired) {
      effectiveArtifacts = artifacts.map((artifact) => artifact.path === 'DESIGN.md'
        ? { ...artifact, required: false }
        : artifact);
    }
  }

  checkArtifacts(projectRoot, tier, effectiveArtifacts, opts, result);
  const stateStep = checkStateStepEvidence(projectRoot, tier, result);
  const stepRef = artifactMap.stateStepForTier(tier);
  if (stepRef && evidence.EXECUTED_REQUIRED_SUBSTEPS.has(stepRef.subStepKey)) {
    checkExecutedEvidence(projectRoot, result, stateStep, tier);
  }
  if (tier === 'build') checkBuildProgramDesign(projectRoot, result, stateStep, opts);
  if (tier === 'harden') {
    checkHardenCriticals(projectRoot, result);
    checkHardenOwasp2025(projectRoot, result);
  }
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
  verificationEvidencePair,
  exitCode,
  render
};
