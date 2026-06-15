/**
 * Installer CLI command dispatch.
 */

const gate = require('./gate');
const identity = require('./package-identity');
const stateAdvance = require('./state-advance');

const VERSION = identity.PACKAGE_VERSION;

function log(msg) {
  console.log(`  ${msg}`);
}

function success(msg) {
  console.log(`  \x1b[32m+\x1b[0m ${msg}`);
}

function warn(msg) {
  console.log(`  \x1b[33m!\x1b[0m ${msg}`);
}

function error(msg) {
  console.error(`  \x1b[31mx\x1b[0m ${msg}`);
}

function runAutomationCommand(opts) {
  const automation = require('./automation-providers');
  const result = opts.command === 'automation-setup'
    ? automation.setupPlan(opts.project)
    : automation.detect(opts.project);
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (opts.command === 'automation-setup') {
    console.log(automation.renderSetupPlan(result));
  } else {
    console.log(automation.render(result));
  }
}

function runDashboardCommand(opts) {
  const dashboard = require('./dashboard');
  const result = dashboard.compute(opts.project);
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(dashboard.render(result, { brief: opts.brief || !opts.full }));
  if (opts.command === 'next') {
    console.log('');
    console.log('Suggested next command:');
    console.log(`  ${result.next && result.next.command ? result.next.command : 'describe the next intent'}`);
  }
}

function runDogfoodCommand(opts) {
  const dogfood = require('./dogfood-runner');
  const result = dogfood.runAll();
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(dogfood.render(result));
  }
  if (result.status !== 'pass') process.exit(1);
}

function runDemoCommand(opts) {
  return runQuickProofCommand({ ...opts, brief: opts.full ? false : true });
}

function runQuickProofCommand(opts) {
  const quickProof = require('./quick-proof');
  const result = quickProof.compute(opts.project);
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(quickProof.render(result, { brief: opts.brief }));
  }
}

function runSurfaceCommand(opts) {
  const path = require('path');
  const surfaceProfile = require('./surface-profile');
  const srcDir = path.resolve(__dirname, '..');
  let applied = [];

  if (opts.apply) {
    if (opts.json) {
      const originalLog = console.log;
      const originalError = console.error;
      console.log = () => {};
      console.error = () => {};
      try {
        applied = surfaceProfile.apply(srcDir, opts);
      } finally {
        console.log = originalLog;
        console.error = originalError;
      }
    } else {
      applied = surfaceProfile.apply(srcDir, opts);
    }
  }

  const result = surfaceProfile.plan(srcDir, opts);
  if (opts.json) {
    console.log(JSON.stringify({ ...result, applied }, null, 2));
  } else {
    console.log(surfaceProfile.render(result));
  }
}

function runMcpInfoCommand(opts) {
  const mcpInfo = require('./mcp-info');
  const result = mcpInfo.info(opts.project);
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(mcpInfo.render(result));
  }
}

function runExtensionScaffoldCommand(opts) {
  const authoring = require('./extension-authoring');
  if (!opts.extensionName) {
    error('extension-scaffold requires --name=@scope/package');
    process.exit(1);
  }
  const result = authoring.scaffold(opts.extensionOutput, {
    name: opts.extensionName,
    skill: opts.extensionSkill || undefined,
    agent: opts.extensionAgent || undefined,
    workflow: opts.extensionWorkflow || undefined,
    runtimeVersion: VERSION
  });
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  success(`Scaffolded ${result.name} at ${result.path}`);
  if (result.written.length > 0) {
    log(`Wrote ${result.written.length} file(s): ${result.written.join(', ')}`);
  }
  if (result.validation.length > 0) {
    warn(`Validation warnings: ${result.validation.join('; ')}`);
  } else {
    success('Extension manifest validates');
  }
}

function verifyFailure(opts, id, reason) {
  return {
    command: 'verify',
    verdict: 'fail',
    project: opts.project,
    kind: null,
    verified: false,
    checks: [{ id, status: 'fail', artifact: '.godpowers/ledger/verifications.jsonl', reason }],
    findings: [{ id, severity: 'error', artifact: '.godpowers/ledger/verifications.jsonl', reason }]
  };
}

function relLedger(opts, absPath) {
  const path = require('path');
  return path.relative(opts.project, absPath);
}

function renderVerify(result) {
  const lines = [];
  lines.push('Godpowers Verify');
  lines.push('');
  if (result.verdict === 'fail' && result.findings && result.findings.length > 0 && !result.record) {
    lines.push('Verdict: fail');
    for (const finding of result.findings) {
      lines.push(`Error: ${finding.reason}`);
    }
    return lines.join('\n');
  }
  const verdictLabel = result.kind === 'attested'
    ? 'attested (self-reported, not machine-checked)'
    : result.verdict;
  lines.push(`Verdict: ${verdictLabel}`);
  lines.push(`Command: ${result.commandText ? '`' + result.commandText + '`' : '(none)'}`);
  if (result.substep) lines.push(`Substep: ${result.substep}`);
  if (result.kind === 'executed') {
    lines.push(`Exit: ${result.exitCode} (${result.durationMs} ms)`);
  }
  if (result.claim) lines.push(`Claim: ${result.claim}`);
  lines.push(`Ledger: ${result.ledger}`);
  if (result.rollup) {
    lines.push(result.rollup.applied
      ? `Rollup: applied ${result.rollup.substep} verification.commands (${result.rollup.status})`
      : `Rollup: skipped (${result.rollup.reason})`);
  }
  if (result.event) {
    lines.push(result.event.emitted
      ? `Event: ${result.event.name} -> runs/${result.event.runId}/events.jsonl`
      : `Event: not emitted (${result.event.error})`);
  }
  if (result.kind === 'executed' && !result.verified && result.diagnostics) {
    lines.push('');
    lines.push('Diagnostics:');
    lines.push(result.diagnostics);
  }
  return lines.join('\n');
}

function runVerifyCommand(opts) {
  const evidence = require('./evidence');

  if (opts.attest) {
    if (!opts.claim) {
      const result = verifyFailure(opts, 'claim-required', 'verify --attest requires --claim="<claim>"');
      if (opts.json) console.log(JSON.stringify(result, null, 2));
      else console.log(renderVerify(result));
      process.exitCode = 1;
      return;
    }
    const outcome = evidence.verifyClaim(opts.claim, opts.evidence, {
      substep: opts.substep || undefined,
      projectRoot: opts.project
    });
    const result = {
      command: 'verify',
      kind: 'attested',
      verdict: 'attested',
      verified: null,
      project: opts.project,
      commandText: null,
      substep: outcome.record.substep,
      claim: outcome.record.claim,
      ledger: relLedger(opts, outcome.ledger),
      rollup: null,
      event: null,
      record: outcome.record
    };
    if (opts.json) console.log(JSON.stringify(result, null, 2));
    else console.log(renderVerify(result));
    return;
  }

  if (!opts.verifyCommand) {
    const result = verifyFailure(opts, 'command-required', 'verify requires a command, for example: npx godpowers verify "npm test" --substep tier-2.build');
    if (opts.json) console.log(JSON.stringify(result, null, 2));
    else console.log(renderVerify(result));
    process.exitCode = 1;
    return;
  }
  if (!opts.substep) {
    const result = verifyFailure(opts, 'substep-required', 'verify requires --substep=<id>, for example --substep=tier-2.build');
    if (opts.json) console.log(JSON.stringify(result, null, 2));
    else console.log(renderVerify(result));
    process.exitCode = 1;
    return;
  }

  const outcome = evidence.verify(opts.verifyCommand, {
    substep: opts.substep,
    claim: opts.claim || undefined,
    timeout: opts.timeout || undefined,
    projectRoot: opts.project
  });
  const result = {
    command: 'verify',
    kind: 'executed',
    verdict: outcome.verified ? 'pass' : 'fail',
    verified: outcome.verified,
    project: opts.project,
    commandText: outcome.record.command,
    substep: outcome.record.substep,
    claim: outcome.record.claim,
    exitCode: outcome.record.exit_code,
    durationMs: Math.max(0, Math.round(outcome.record.duration_seconds * 1000)),
    diagnostics: outcome.rollup && outcome.rollup.applied
      ? undefined
      : (outcome.record.stderr_tail || outcome.record.stdout_tail || ''),
    ledger: relLedger(opts, outcome.ledger),
    rollup: outcome.rollup,
    event: outcome.event,
    record: outcome.record
  };
  // Surface diagnostics on failure regardless of rollup state.
  if (!outcome.verified) {
    result.diagnostics = outcome.record.stderr_tail || outcome.record.stdout_tail || `exit ${outcome.record.exit_code}`;
  }
  if (opts.json) console.log(JSON.stringify(result, null, 2));
  else console.log(renderVerify(result));
  if (!outcome.verified) process.exitCode = 1;
}

function runGateCommand(opts) {
  if (!opts.tier) {
    const result = {
      tier: null,
      verdict: 'fail',
      artifacts: [],
      checks: [{ id: 'tier-required', status: 'fail', artifact: null, reason: 'gate requires --tier=<name>' }],
      findings: [{ id: 'tier-required', severity: 'error', artifact: null, reason: 'gate requires --tier=<name>' }],
      summary: { errors: 1, warnings: 0, infos: 0, missing: 0, checkedArtifacts: 0 }
    };
    if (opts.json) console.log(JSON.stringify(result, null, 2));
    else console.log(gate.render(result));
    process.exitCode = 1;
    return;
  }

  const result = gate.check({ tier: opts.tier, projectRoot: opts.project });
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(gate.render(result));
  }
  if (gate.exitCode(result) !== 0) {
    process.exitCode = 1;
  }
}

function runStateCommand(opts) {
  if (opts.stateAction !== 'advance') {
    const result = {
      command: 'state',
      verdict: 'fail',
      project: opts.project,
      step: opts.step || null,
      status: opts.status || null,
      previousStatus: null,
      updated: null,
      warnings: [],
      checks: [{ id: 'state-action-required', status: 'fail', artifact: '.godpowers/state.json', reason: 'state requires subcommand advance' }],
      findings: [{ id: 'state-action-required', severity: 'error', artifact: '.godpowers/state.json', reason: 'state requires subcommand advance' }],
      summary: { updated: false, state: '.godpowers/state.json', views: ['.godpowers/PROGRESS.md'] }
    };
    if (opts.json) console.log(JSON.stringify(result, null, 2));
    else console.log(stateAdvance.render(result));
    process.exitCode = 1;
    return;
  }

  const result = stateAdvance.advance(opts.project, {
    step: opts.step,
    status: opts.status
  });
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(stateAdvance.render(result));
  }
  if (stateAdvance.exitCode(result) !== 0) {
    process.exitCode = 1;
  }
}

const COMMAND_RUNNERS = {
  status: runDashboardCommand,
  next: runDashboardCommand,
  state: runStateCommand,
  'quick-proof': runQuickProofCommand,
  'mcp-info': runMcpInfoCommand,
  'automation-status': runAutomationCommand,
  'automation-setup': runAutomationCommand,
  dogfood: runDogfoodCommand,
  demo: runDemoCommand,
  surface: runSurfaceCommand,
  'extension-scaffold': runExtensionScaffoldCommand,
  gate: runGateCommand,
  verify: runVerifyCommand
};

function runCommand(opts) {
  const runner = COMMAND_RUNNERS[opts.command];
  if (runner) {
    runner(opts);
    return true;
  }
  return false;
}

module.exports = {
  COMMAND_RUNNERS,
  runCommand,
  runAutomationCommand,
  runDashboardCommand,
  runDogfoodCommand,
  runDemoCommand,
  runQuickProofCommand,
  runSurfaceCommand,
  runMcpInfoCommand,
  runExtensionScaffoldCommand,
  runGateCommand,
  runStateCommand,
  runVerifyCommand
};
