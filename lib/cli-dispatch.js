/**
 * Installer CLI command dispatch.
 */

const gate = require('./gate');
const identity = require('./package-identity');
const stateAdvance = require('./state-advance');
const { log, success, warn, error } = require('./cli-log');

const VERSION = identity.PACKAGE_VERSION;

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

  // IXD-001: the rendered dashboard already states the recommendation under
  // "Action brief: Next" and "Next: Recommended"; do not print it a third time.
  console.log(dashboard.render(result, { brief: opts.brief || !opts.full }));
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
  const result = quickProof.compute(opts.project, { inspectProject: opts.inspectProject });
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(quickProof.render(result, { brief: opts.brief }));
  }
}

function runSurfaceCommand(opts) {
  const path = require('path');
  const surfaceProfile = require('./surface-profile');
  const { runtimeKeys } = require('./installer-runtimes');
  // USE-003: reject a surface --runtime target that does not exist, the same way
  // the installer rejects an unknown runtime, instead of rendering a plan with a
  // null path and recommending an --apply to a nonexistent target.
  const validRuntimes = new Set(runtimeKeys());
  const unknownRuntimes = (opts.runtimes || []).filter((name) => !validRuntimes.has(name));
  if (unknownRuntimes.length > 0) {
    const message = `Unknown runtime: ${unknownRuntimes.join(', ')}`;
    if (opts.json) console.log(JSON.stringify({ command: 'surface', error: message }, null, 2));
    else error(message);
    process.exitCode = 1;
    return;
  }
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

function renderCanClose(result) {
  const lines = [];
  lines.push('Godpowers Can-Close');
  lines.push('');
  lines.push(`Substep: ${result.substep || '(none)'}`);
  lines.push(`Can close: ${result.canClose ? 'yes' : 'no'}`);
  lines.push(`Reason: ${result.reason}`);
  if (result.strategy) lines.push(`Strategy: ${result.strategy}`);
  if (result.wentInFlightAt) lines.push(`In-flight since: ${result.wentInFlightAt}`);
  // PROC-001: be honest about what enforces what. can-close is the advisory
  // freshness check the orchestrator runs before closing a substep; the
  // mechanically enforced gate is `npx godpowers gate`. Stating this here
  // closes the "described gate vs gate that runs" gap.
  lines.push('Note: advisory freshness check; the enforced gate is "npx godpowers gate".');
  return lines.join('\n');
}

function runCanCloseCommand(opts) {
  const evidence = require('./evidence');
  if (!opts.substep) {
    const result = {
      command: 'can-close',
      project: opts.project,
      canClose: false,
      reason: 'substep-required',
      strategy: null,
      substep: null
    };
    if (opts.json) console.log(JSON.stringify(result, null, 2));
    else console.log(`${renderCanClose(result)}\n\nError: can-close requires --substep=<id>, for example --substep=tier-2.build`);
    process.exitCode = 1;
    return;
  }
  const verdict = evidence.canClose(opts.substep, { projectRoot: opts.project });
  const result = { command: 'can-close', project: opts.project, ...verdict };
  if (opts.json) console.log(JSON.stringify(result, null, 2));
  else console.log(renderCanClose(result));
  if (!verdict.canClose) process.exitCode = 1;
}

function renderRoute(result) {
  const lines = [];
  lines.push('Godpowers Route');
  lines.push('');
  lines.push(`Route: ${result.route}`);
  lines.push(`Reason: ${result.reason}`);
  lines.push(`Next command: ${result.nextCommand || '(answer inline)'}`);
  lines.push(`Ceremony: ${result.ceremony}`);
  lines.push(`Verification: ${result.verificationStrategy}`);
  lines.push(`Chat policy: ${result.chatPolicy}`);
  const ev = result.evidence || {};
  lines.push(`Evidence: classification=${ev.classification}, latest verdict=${ev.latestVerdict}, open findings=${ev.openFindings}`);
  return lines.join('\n');
}

function runRouteCommand(opts) {
  const quarterback = require('./quarterback');
  const result = quarterback.route(opts.routePrompt || '', { projectRoot: opts.project });
  if (opts.json) console.log(JSON.stringify(result, null, 2));
  else console.log(renderRoute(result));
}

function runReportCommand(opts) {
  const workReport = require('./work-report');
  const result = workReport.report({
    since: opts.since || 'last',
    peek: opts.peek,
    projectRoot: opts.project
  });
  if (opts.json) console.log(JSON.stringify(result, null, 2));
  else console.log(workReport.render(result));
}

function runReflectCommand(opts) {
  const evidence = require('./evidence');
  if (!opts.reflectAction) {
    const result = {
      command: 'reflect',
      verdict: 'fail',
      project: opts.project,
      findings: [{ id: 'action-required', severity: 'error', artifact: '.godpowers/ledger/reflections.jsonl', reason: 'reflect requires --action="<what was attempted>"' }]
    };
    if (opts.json) console.log(JSON.stringify(result, null, 2));
    else console.log('Godpowers Reflect\n\nError: reflect requires --action="<what was attempted>"');
    process.exitCode = 1;
    return;
  }
  const outcome = evidence.reflect({
    action: opts.reflectAction,
    outcome: opts.outcome || undefined,
    observation: opts.observation || undefined,
    rootCause: opts.rootCause || undefined,
    next: opts.nextAction || undefined,
    lesson: opts.lesson || undefined
  }, { substep: opts.substep || undefined, projectRoot: opts.project });
  if (opts.json) {
    console.log(JSON.stringify(outcome, null, 2));
  } else {
    const r = outcome.record;
    const lines = ['Godpowers Reflect', '', `Outcome: ${r.outcome}`, `Action: ${r.action}`];
    if (r.substep) lines.push(`Substep: ${r.substep}`);
    if (r.next) lines.push(`Next: ${r.next}`);
    if (r.lesson) lines.push(`Lesson: ${r.lesson}`);
    lines.push('Recorded to .godpowers/ledger/reflections.jsonl');
    console.log(lines.join('\n'));
  }
}

function memoryError(opts, reason) {
  if (opts.json) {
    console.log(JSON.stringify({ command: 'memory', verdict: 'fail', project: opts.project, reason }, null, 2));
  } else {
    console.log(`Godpowers Memory\n\nError: ${reason}`);
  }
  process.exitCode = 1;
}

function runMemoryCommand(opts) {
  const evidence = require('./evidence');
  const action = opts.memoryAction;
  if (!action || !['set', 'get', 'list', 'clear'].includes(action)) {
    return memoryError(opts, 'memory requires an action: set, get, list, or clear');
  }
  const projectRoot = opts.project;
  let result;
  if (action === 'set') {
    if (!opts.memoryKey || opts.memoryValue === null) {
      return memoryError(opts, 'memory set requires a key and value, for example: memory set decision "use postgres"');
    }
    result = evidence.memory.set(opts.memoryKey, opts.memoryValue, { category: opts.category || undefined, projectRoot });
  } else if (action === 'get') {
    if (!opts.memoryKey) return memoryError(opts, 'memory get requires a key');
    result = evidence.memory.get(opts.memoryKey, { projectRoot });
  } else if (action === 'list') {
    result = evidence.memory.list({ category: opts.category || undefined, projectRoot });
  } else {
    result = evidence.memory.clear(opts.memoryKey || undefined, { projectRoot });
  }
  if (opts.json) {
    console.log(JSON.stringify({ command: 'memory', action, result }, null, 2));
  } else {
    const lines = ['Godpowers Memory', '', `Action: ${action}`];
    if (action === 'list') {
      const entries = result || [];
      lines.push(`Entries: ${entries.length}`);
      for (const e of entries) lines.push(`  [${e.category}] ${e.key} = ${e.value}`);
    } else if (action === 'get') {
      lines.push(result ? `[${result.category}] ${result.key} = ${result.value}` : '(not found)');
    } else if (action === 'set') {
      lines.push(`Set [${result.category}] ${result.key} = ${result.value}`);
    } else {
      lines.push(`Removed ${result.removed} entr${result.removed === 1 ? 'y' : 'ies'}`);
    }
    console.log(lines.join('\n'));
  }
  if (action === 'get' && !result) process.exitCode = 1;
}

function runLessonCommand(opts) {
  const evidence = require('./evidence');
  const action = opts.lessonAction;
  if (!action || !['add', 'list'].includes(action)) {
    if (opts.json) console.log(JSON.stringify({ command: 'lesson', verdict: 'fail', reason: 'lesson requires an action: add or list' }, null, 2));
    else console.log('Godpowers Lesson\n\nError: lesson requires an action: add or list');
    process.exitCode = 1;
    return;
  }
  const projectRoot = opts.project;
  if (action === 'add') {
    if (!opts.lessonText) {
      if (opts.json) console.log(JSON.stringify({ command: 'lesson', verdict: 'fail', reason: 'lesson add requires the lesson text' }, null, 2));
      else console.log('Godpowers Lesson\n\nError: lesson add requires the lesson text, for example: lesson add "guard inputs before parsing"');
      process.exitCode = 1;
      return;
    }
    const tags = opts.tags ? String(opts.tags).split(',').map((t) => t.trim()).filter(Boolean) : [];
    const record = evidence.lesson.add(opts.lessonText, { tags, scope: opts.scope || undefined, projectRoot });
    if (opts.json) console.log(JSON.stringify({ command: 'lesson', action, result: record }, null, 2));
    else console.log(`Godpowers Lesson\n\nAdded [${record.scope}]${record.tags.length ? ` (${record.tags.join(',')})` : ''}: ${record.lesson}`);
    return;
  }
  const records = evidence.lesson.list({ scope: opts.scope || undefined, projectRoot });
  if (opts.json) {
    console.log(JSON.stringify({ command: 'lesson', action, result: records }, null, 2));
  } else {
    const lines = ['Godpowers Lesson', '', `Lessons: ${records.length}`];
    for (const r of records) lines.push(`  [${r.scope}]${r.tags && r.tags.length ? ` (${r.tags.join(',')})` : ''} ${r.lesson}`);
    console.log(lines.join('\n'));
  }
}

function outcomeError(opts, reason) {
  if (opts.json) console.log(JSON.stringify({ command: 'outcome', verdict: 'fail', reason }, null, 2));
  else console.log(`Godpowers Outcome\n\nError: ${reason}`);
  process.exitCode = 1;
}

function runOutcomeCommand(opts) {
  const evidence = require('./evidence');
  const action = opts.outcomeAction;
  if (!action || !['start', 'check', 'stop', 'status'].includes(action)) {
    return outcomeError(opts, 'outcome requires an action: start, check, stop, or status');
  }
  if (!opts.outcomeSlug) {
    return outcomeError(opts, `outcome ${action} requires a name, for example: outcome ${action} green-build`);
  }
  const projectRoot = opts.project;
  let payload;
  if (action === 'start') {
    payload = evidence.outcome.start(opts.outcomeSlug, {
      goal: opts.outcomeGoal || undefined,
      verifier: opts.outcomeVerify || undefined,
      budget: opts.budget || undefined,
      substep: opts.substep || undefined,
      projectRoot
    });
  } else if (action === 'check') {
    payload = evidence.outcome.check(opts.outcomeSlug, {
      projectRoot,
      // SEC-002: announce the disk-sourced verifier before it runs, so running
      // `outcome check` inside an untrusted cloned repo cannot silently execute
      // a planted command. Goes to stderr so it never corrupts --json on stdout.
      notice: ({ verifier, source }) => {
        const rel = relLedger({ project: projectRoot }, source) || source;
        process.stderr.write(
          `  notice: outcome '${opts.outcomeSlug}' runs a verifier loaded from ${rel}\n` +
          `          command: ${verifier}\n` +
          `          (.godpowers/ledger/ carries executable state; only run 'outcome check' in repos you trust)\n`
        );
      }
    });
  } else if (action === 'stop') {
    payload = evidence.outcome.stop(opts.outcomeSlug, opts.reason || undefined, { projectRoot });
  } else {
    payload = evidence.outcome.status(opts.outcomeSlug, { projectRoot });
  }
  if (opts.json) {
    console.log(JSON.stringify({ command: 'outcome', action, result: payload }, null, 2));
  } else {
    const lines = ['Godpowers Outcome', '', `Action: ${action}`];
    const goal = payload && (payload.goal || (payload.slug ? payload : null));
    if (goal && goal.slug) {
      lines.push(`Outcome: ${goal.slug}`);
      lines.push(`Status: ${goal.status}`);
      lines.push(`Iterations: ${goal.iterations}/${goal.budget}`);
    }
    if (payload && payload.verified !== undefined) lines.push(`This check: ${payload.verified ? 'verified' : 'unverified'}`);
    if (payload && payload.reason) lines.push(`Note: ${payload.reason}`);
    if (!payload) lines.push('(outcome not found)');
    console.log(lines.join('\n'));
  }
  // A check that did not verify, or a missing outcome, exits non-zero.
  if (action === 'check' && payload && payload.verified === false) process.exitCode = 1;
  if ((action === 'status') && !payload) process.exitCode = 1;
}

function runImportLedgerCommand(opts) {
  const importer = require('./evidence-import');
  const result = importer.importMythify({
    source: opts.importFrom || undefined,
    projectRoot: opts.project
  });
  if (opts.json) console.log(JSON.stringify(result, null, 2));
  else console.log(importer.render(result));
  if (!result.found) process.exitCode = 1;
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
    const stateViews = require('./state-views');
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
      summary: { updated: false, state: '.godpowers/state.json', views: [stateViews.PROGRESS_VIEW_PATH] }
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
  verify: runVerifyCommand,
  'can-close': runCanCloseCommand,
  route: runRouteCommand,
  report: runReportCommand,
  reflect: runReflectCommand,
  memory: runMemoryCommand,
  lesson: runLessonCommand,
  outcome: runOutcomeCommand,
  'import-ledger': runImportLedgerCommand
};

function runCommand(opts) {
  const runner = COMMAND_RUNNERS[opts.command];
  if (!runner) return false;
  try {
    runner(opts);
  } catch (err) {
    // ERR-002: a corrupt state.json throws from state.read(). Surface the
    // helpful message as a clean one-liner with a non-zero exit instead of a
    // raw stack trace. Match the typed error code (ERR-004), not the message
    // prose. Re-throw anything else so genuine bugs still surface.
    if (err && err.code === 'CORRUPT_STATE') {
      error(err.message);
      process.exitCode = 1;
    } else {
      throw err;
    }
  }
  return true;
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
  runVerifyCommand,
  runCanCloseCommand,
  runRouteCommand,
  runReportCommand,
  runReflectCommand,
  runMemoryCommand,
  runLessonCommand,
  runOutcomeCommand,
  runImportLedgerCommand
};
