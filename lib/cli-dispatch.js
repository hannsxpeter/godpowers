/**
 * Local CLI command dispatch for non-install Godpowers helpers.
 */

const identity = require('./package-identity');

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

  console.log(dashboard.render(result, { brief: opts.brief }));
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

function runQuickProofCommand(opts) {
  const quickProof = require('./quick-proof');
  const result = quickProof.compute(opts.project);
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(quickProof.render(result, { brief: opts.brief }));
  }
}

function renderGate(result) {
  const lines = [];
  lines.push(`Godpowers gate: ${result.tier}`);
  lines.push(`Verdict: ${result.verdict}`);
  lines.push(`Checks: ${result.summary.passed} passed, ${result.summary.failed} failed, ${result.summary.skipped} skipped`);
  if (result.findings.length > 0) {
    lines.push(`Findings: ${result.summary.errors} errors, ${result.summary.warnings} warnings`);
  }
  lines.push('');
  lines.push('Artifacts:');
  for (const artifact of result.artifacts) {
    lines.push(`  ${artifact.status === 'present' ? '+' : 'x'} ${artifact.path}`);
  }
  lines.push('');
  lines.push('Checks:');
  for (const check of result.checks) {
    const marker = check.status === 'pass' ? '+' : check.status === 'fail' ? 'x' : '-';
    lines.push(`  ${marker} ${check.id}: ${check.reason}`);
  }
  if (result.findings.length > 0) {
    lines.push('');
    lines.push('Findings:');
    for (const finding of result.findings) {
      lines.push(`  ${finding.severity.toUpperCase()} ${finding.code} ${finding.artifact}:${finding.line} ${finding.message}`);
    }
  }
  return lines.join('\n');
}

function runGateCommand(opts) {
  const gate = require('./gate');
  if (!opts.tier) {
    const message = 'gate requires --tier=<prd|design|arch|roadmap|stack|repo|build|harden>';
    if (opts.json) {
      console.log(JSON.stringify({ tier: null, verdict: 'fail', error: message }, null, 2));
    } else {
      error(message);
    }
    process.exit(1);
  }

  let result;
  try {
    result = gate.checkTier(opts.project, opts.tier);
  } catch (err) {
    if (opts.json) {
      console.log(JSON.stringify({ tier: opts.tier, verdict: 'fail', error: err.message }, null, 2));
    } else {
      error(err.message);
    }
    process.exit(1);
  }

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderGate(result));
  }
  if (result.verdict !== 'pass') process.exit(1);
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

const COMMAND_RUNNERS = {
  status: runDashboardCommand,
  next: runDashboardCommand,
  'quick-proof': runQuickProofCommand,
  gate: runGateCommand,
  'automation-status': runAutomationCommand,
  'automation-setup': runAutomationCommand,
  dogfood: runDogfoodCommand,
  'extension-scaffold': runExtensionScaffoldCommand
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
  renderGate,
  runCommand,
  runAutomationCommand,
  runDashboardCommand,
  runDogfoodCommand,
  runExtensionScaffoldCommand,
  runGateCommand,
  runQuickProofCommand
};
