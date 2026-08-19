#!/usr/bin/env node
// Implements: P-MUST-24, P-MUST-33
/**
 * Full test runner for the Godpowers release gate.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const node = process.execPath;

const TEST_COMMANDS = [
  [node, ['scripts/validate-skills.js']],
  [node, ['scripts/static-check.js']],
  [node, ['scripts/test-test-runner.js']],
  [node, ['scripts/test-doc-surface-counts.js']],
  [node, ['scripts/test-dependency-overrides.js']],
  [node, ['scripts/test-self-project-truth.js']],
  [node, ['scripts/test-have-nots-tally.js']],
  [node, ['scripts/test-skill-source-sync.js']],
  [node, ['scripts/test-quick-proof.js']],
  ['bash', ['scripts/smoke.sh']],
  [node, ['scripts/test-hooks.js']],
  [node, ['scripts/test-cli-log.js']],
  [node, ['scripts/test-text-util.js']],
  [node, ['scripts/test-style-stats.js']],
  [node, ['scripts/test-maintainability-trajectory.js']],
  [node, ['scripts/test-program-design.js']],
  [node, ['scripts/test-slice-handoff.js']],
  [node, ['scripts/test-evolution-benchmark.js']],
  [node, ['scripts/test-runtime.js']],
  [node, ['scripts/test-yaml-parser.js']],
  [node, ['scripts/test-frontmatter.js']],
  [node, ['scripts/test-agent-refs.js']],
  [node, ['scripts/test-sync-fs-resolver.js']],
  [node, ['scripts/test-router.js']],
  [node, ['scripts/test-product-routing.js']],
  [node, ['scripts/test-prepublication-gate.js']],
  [node, ['scripts/test-findings-verdict.js']],
  [node, ['scripts/test-recipes.js']],
  [node, ['scripts/test-context-writer.js']],
  [node, ['scripts/test-pillars.js']],
  [node, ['scripts/test-pillars-conformance.js']],
  [node, ['scripts/test-artifact-linter.js']],
  [node, ['scripts/test-prose-lint.js']],
  [node, ['scripts/test-eval-set.js']],
  [node, ['scripts/test-voice-lint.js']],
  [node, ['scripts/test-artifact-diff.js']],
  [node, ['scripts/test-design-foundation.js']],
  [node, ['scripts/test-linkage.js']],
  [node, ['scripts/test-impact.js']],
  [node, ['scripts/test-reverse-sync.js']],
  [node, ['scripts/test-planning-systems.js']],
  [node, ['scripts/test-sibling-artifacts.js']],
  [node, ['scripts/test-requirements.js']],
  [node, ['scripts/test-source-grounding.js']],
  [node, ['scripts/test-code-intelligence.js']],
  [node, ['scripts/test-package-legitimacy.js']],
  [node, ['scripts/test-live-advisories.js']],
  [node, ['scripts/test-atomic-write.js']],
  [node, ['scripts/test-executor-repair.js']],
  [node, ['scripts/test-repair-integrity.js']],
  [node, ['scripts/test-cli-dispatch.js']],
  [node, ['scripts/test-gate.js']],
  [node, ['scripts/test-gate-tripwires.js']],
  [node, ['scripts/test-cadence-guard.js']],
  [node, ['scripts/test-evidence.js']],
  [node, ['scripts/test-quarterback.js']],
  [node, ['scripts/test-work-report.js']],
  [node, ['scripts/test-reflections.js']],
  [node, ['scripts/test-memory.js']],
  [node, ['scripts/test-lessons.js']],
  [node, ['scripts/test-outcome-loops.js']],
  [node, ['scripts/test-change-metrics.js']],
  [node, ['scripts/test-learning-metrics.js']],
  [node, ['scripts/test-improvement-proposals.js']],
  [node, ['scripts/test-outcome-metrics.js']],
  [node, ['scripts/test-connectors.js']],
  [node, ['scripts/test-reaudit.js']],
  [node, ['scripts/test-evidence-import.js']],
  ['npm', ['--workspace', '@godpowers/mcp', 'test']],
  [node, ['scripts/test-installer-profiles.js']],
  [node, ['scripts/test-surface-profile.js']],
  [node, ['scripts/test-surface-contraction.js']],
  [node, ['scripts/test-command-families.js']],
  [node, ['scripts/test-package-identity.js']],
  [node, ['scripts/test-feature-awareness.js']],
  [node, ['scripts/test-repo-doc-sync.js']],
  [node, ['scripts/test-repo-surface-sync.js']],
  [node, ['scripts/test-automation-surface-sync.js']],
  [node, ['scripts/test-host-capabilities.js']],
  [node, ['scripts/test-extension-authoring.js']],
  [node, ['scripts/test-provenance-pack.js']],
  [node, ['scripts/test-provenance-client.js']],
  [node, ['scripts/test-dogfood-runner.js']],
  [node, ['scripts/test-integration.js']],
  [node, ['scripts/test-cross-artifact.js']],
  [node, ['scripts/test-awesome-design.js']],
  [node, ['scripts/test-skillui-bridge.js']],
  [node, ['scripts/test-runtime-verification.js']],
  [node, ['scripts/test-agent-browser.js']],
  [node, ['scripts/test-runtime-audit.js']],
  [node, ['scripts/test-blind-compare.js']],
  [node, ['scripts/test-mode-d.js']],
  [node, ['scripts/test-runtime-heuristics.js']],
  [node, ['scripts/test-agent-validator.js']],
  [node, ['scripts/test-story-validator.js']],
  [node, ['scripts/test-state.js']],
  [node, ['scripts/test-state-views.js']],
  [node, ['scripts/test-state-advance.js']],
  [node, ['scripts/test-dashboard.js']],
  [node, ['scripts/test-automation-providers.js']],
  [node, ['scripts/test-intent.js']],
  [node, ['scripts/test-events.js']],
  [node, ['scripts/test-golden-artifacts.js']],
  [node, ['scripts/test-install-smoke.js']],
  [node, ['scripts/test-checkpoint.js']],
  [node, ['scripts/test-extensions.js']],
  [node, ['scripts/test-event-reader.js']],
  [node, ['scripts/test-state-lock.js']],
  [node, ['scripts/test-cost-saver.js']],
  [node, ['scripts/test-budget-onoff.js']],
  [node, ['scripts/test-loop-config.js']],
  [node, ['scripts/test-workflow-runner.js']],
  ['npm', ['run', 'test:e2e']],
  [node, ['scripts/test-otel-exporter.js']],
  [node, ['scripts/test-extensions-publish.js']]
];

function renderCommand(command, args) {
  return [command, ...args].join(' ');
}

function parseOptions(argv) {
  const json = argv.includes('--json');
  return {
    agentOutput: json || argv.includes('--agent-output'),
    json
  };
}

function createLog(logRoot) {
  const root = path.resolve(logRoot || os.tmpdir());
  const directory = fs.mkdtempSync(path.join(root, 'godpowers-tests-'));
  fs.chmodSync(directory, 0o700);
  const logPath = path.join(directory, 'run.log');
  fs.writeFileSync(logPath, '', { flag: 'wx', mode: 0o600 });
  fs.chmodSync(logPath, 0o600);
  return logPath;
}

function extractCounts(output) {
  const matches = [...output.matchAll(/(?:Results:\s*)?(\d+)\s+passed(?:,\s*(\d+)\s+failed)?/gi)];
  if (matches.length === 0) return null;
  const match = matches[matches.length - 1];
  const failed = match[2] === undefined ? null : Number(match[2]);
  return {
    passed: Number(match[1]),
    failed
  };
}

function diagnosticLines(stdout, stderr) {
  const stderrLines = stderr.split(/\r?\n/).filter(Boolean);
  const stdoutLines = stdout.split(/\r?\n/).filter(Boolean);
  const total = stderrLines.length + stdoutLines.length;
  if (total <= 20) return [...stderrLines, ...stdoutLines];

  const selected = ['[output truncated; see full retained log]'];
  const focusedErrors = stderrLines.slice(-Math.min(stderrLines.length, 10));
  selected.push(...focusedErrors);
  const remaining = 20 - selected.length;
  selected.push(...stdoutLines.slice(-remaining));
  return selected;
}

function boundedDiagnostics(stdout, stderr) {
  const text = diagnosticLines(stdout, stderr).join('\n');
  if (Buffer.byteLength(text) <= 8 * 1024) return text;
  let low = 0;
  let high = text.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (Buffer.byteLength(text.slice(0, middle)) <= 8 * 1024) low = middle;
    else high = middle - 1;
  }
  return text.slice(0, low);
}

function beginCommandLog(logPath, commandText) {
  fs.appendFileSync(logPath, `> ${commandText}\n[output]\n`);
  return fs.statSync(logPath).size;
}

function readLogTail(logPath, start, end) {
  const available = Math.max(0, end - start);
  const length = Math.min(available, 64 * 1024);
  if (length === 0) return '';
  const buffer = Buffer.alloc(length);
  const descriptor = fs.openSync(logPath, 'r');
  try {
    fs.readSync(descriptor, buffer, 0, length, end - length);
  } finally {
    fs.closeSync(descriptor);
  }
  return buffer.toString('utf8');
}

function runCompactCommand(spawn, command, args, options) {
  const outputStart = beginCommandLog(options.logPath, options.commandText);
  const descriptor = fs.openSync(options.logPath, 'a');
  let result;
  try {
    result = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', descriptor, descriptor]
    });
  } finally {
    fs.closeSync(descriptor);
  }
  const outputEnd = fs.statSync(options.logPath).size;
  const tail = readLogTail(options.logPath, outputStart, outputEnd);
  if (result.error) fs.appendFileSync(options.logPath, `\n[runner error]\n${result.error.message}\n`);
  const status = result.error ? 1 : (result.status === null ? 1 : result.status);
  fs.appendFileSync(options.logPath, `\n[exit] ${status}\n\n`);
  return { result, status, tail };
}

function runCommands(commands, options = {}) {
  const now = options.now || Date.now;
  const spawn = options.spawnSync || spawnSync;
  const cwd = options.cwd || process.cwd();
  const env = options.env || process.env;
  const compact = Boolean(options.agentOutput || options.json);
  const stdoutWriter = options.stdout || process.stdout;
  const stderrWriter = options.stderr || process.stderr;
  const started = now();
  const summary = {
    status: 0,
    durationMs: 0,
    commands: [],
    failure: null,
    logPath: compact ? createLog(options.logRoot) : null
  };

  for (const [command, args] of commands) {
    const commandText = renderCommand(command, args);
    const commandStarted = now();
    if (!compact) stdoutWriter.write(`\n> ${commandText}\n\n`);
    const execution = compact
      ? runCompactCommand(spawn, command, args, { cwd, env, logPath: summary.logPath, commandText })
      : { result: spawn(command, args, { cwd, env, stdio: 'inherit' }) };
    const result = execution.result;
    const durationMs = now() - commandStarted;
    const childOutput = compact ? execution.tail : '';
    const status = compact
      ? execution.status
      : (result.error ? 1 : (result.status === null ? 1 : result.status));
    const commandResult = {
      command: commandText,
      status,
      durationMs,
      counts: compact ? extractCounts(childOutput) : null
    };
    summary.commands.push(commandResult);

    if (result.error) {
      if (!compact) stderrWriter.write(`\nTest command failed to start: ${result.error.message}\n`);
      summary.status = 1;
      summary.failure = {
        command: commandText,
        status: 1,
        diagnostics: boundedDiagnostics(childOutput, result.error.message)
      };
      break;
    }

    if (status !== 0) {
      if (!compact) stderrWriter.write(`\nTest command failed: ${commandText}\n`);
      summary.status = status;
      summary.failure = {
        command: commandText,
        status,
        diagnostics: boundedDiagnostics(childOutput, '')
      };
      break;
    }
  }

  summary.durationMs = now() - started;
  if (!compact && summary.status === 0) {
    stdoutWriter.write(`\nAll test commands passed in ${(summary.durationMs / 1000).toFixed(1)}s.\n`);
  }
  return summary;
}

function renderAgentSummary(summary, options = {}) {
  if (options.json) return JSON.stringify(summary, null, 2);

  const successful = summary.commands.filter(result => result.status === 0);
  const aggregate = successful.reduce((totals, result) => {
    if (!result.counts) return totals;
    totals.passed += result.counts.passed;
    if (result.counts.failed !== null) totals.failed += result.counts.failed;
    return totals;
  }, { passed: 0, failed: 0 });
  const lines = [];
  if (summary.failure) {
    if (successful.length > 0) lines.push(`PASS ${successful.length} test commands before failure.`);
    const failed = summary.commands[summary.commands.length - 1];
    lines.push(`FAIL ${summary.failure.command} (exit ${summary.status}, command ${(failed.durationMs / 1000).toFixed(1)}s, elapsed ${(summary.durationMs / 1000).toFixed(1)}s).`);
    if (summary.failure.diagnostics) lines.push(summary.failure.diagnostics);
  } else {
    lines.push(`PASS ${successful.length} test commands (${aggregate.passed} passed, ${aggregate.failed} failed, elapsed ${(summary.durationMs / 1000).toFixed(1)}s).`);
  }
  lines.push(`Full log: ${summary.logPath}`);
  return lines.join('\n');
}

function main() {
  const options = parseOptions(process.argv.slice(2));
  const summary = runCommands(TEST_COMMANDS, options);
  if (options.agentOutput) {
    process.stdout.write(`${renderAgentSummary(summary, options)}\n`);
  }
  if (summary.status !== 0) process.exitCode = summary.status;
}

if (require.main === module) main();

module.exports = {
  TEST_COMMANDS,
  parseOptions,
  runCommands,
  renderAgentSummary
};
