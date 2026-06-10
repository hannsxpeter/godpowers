#!/usr/bin/env node
/**
 * Full test runner for the Godpowers release gate.
 */

const { spawnSync } = require('child_process');

const node = process.execPath;

const TEST_COMMANDS = [
  [node, ['scripts/validate-skills.js']],
  [node, ['scripts/static-check.js']],
  [node, ['scripts/test-doc-surface-counts.js']],
  [node, ['scripts/test-skill-source-sync.js']],
  [node, ['scripts/test-quick-proof.js']],
  ['bash', ['scripts/smoke.sh']],
  [node, ['scripts/test-runtime.js']],
  [node, ['scripts/test-yaml-parser.js']],
  [node, ['scripts/test-frontmatter.js']],
  [node, ['scripts/test-agent-refs.js']],
  [node, ['scripts/test-router.js']],
  [node, ['scripts/test-recipes.js']],
  [node, ['scripts/test-context-writer.js']],
  [node, ['scripts/test-pillars.js']],
  [node, ['scripts/test-artifact-linter.js']],
  [node, ['scripts/test-artifact-diff.js']],
  [node, ['scripts/test-design-foundation.js']],
  [node, ['scripts/test-linkage.js']],
  [node, ['scripts/test-impact.js']],
  [node, ['scripts/test-reverse-sync.js']],
  [node, ['scripts/test-planning-systems.js']],
  [node, ['scripts/test-requirements.js']],
  [node, ['scripts/test-source-grounding.js']],
  [node, ['scripts/test-code-intelligence.js']],
  [node, ['scripts/test-package-legitimacy.js']],
  [node, ['scripts/test-atomic-write.js']],
  [node, ['scripts/test-executor-repair.js']],
  [node, ['scripts/test-cli-dispatch.js']],
  [node, ['scripts/test-gate.js']],
  ['npm', ['--workspace', '@godpowers/mcp', 'test']],
  [node, ['scripts/test-installer-profiles.js']],
  [node, ['scripts/test-surface-contraction.js']],
  [node, ['scripts/test-command-families.js']],
  [node, ['scripts/test-package-identity.js']],
  [node, ['scripts/test-feature-awareness.js']],
  [node, ['scripts/test-repo-doc-sync.js']],
  [node, ['scripts/test-repo-surface-sync.js']],
  [node, ['scripts/test-automation-surface-sync.js']],
  [node, ['scripts/test-host-capabilities.js']],
  [node, ['scripts/test-extension-authoring.js']],
  [node, ['scripts/test-dogfood-runner.js']],
  [node, ['scripts/test-integration.js']],
  [node, ['scripts/test-cross-artifact.js']],
  [node, ['scripts/test-awesome-design.js']],
  [node, ['scripts/test-skillui-bridge.js']],
  [node, ['scripts/test-runtime-verification.js']],
  [node, ['scripts/test-agent-browser.js']],
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
  [node, ['scripts/test-workflow-runner.js']],
  ['npm', ['run', 'test:e2e']],
  [node, ['scripts/test-otel-exporter.js']],
  [node, ['scripts/test-extensions-publish.js']]
];

function renderCommand(command, args) {
  return [command, ...args].join(' ');
}

function main() {
  const started = Date.now();
  for (const [command, args] of TEST_COMMANDS) {
    console.log(`\n> ${renderCommand(command, args)}\n`);
    const result = spawnSync(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit'
    });
    if (result.error) {
      console.error(`\nTest command failed to start: ${result.error.message}`);
      process.exit(1);
    }
    if (result.status !== 0) {
      console.error(`\nTest command failed: ${renderCommand(command, args)}`);
      process.exit(result.status || 1);
    }
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\nAll test commands passed in ${seconds}s.`);
}

if (require.main === module) main();

module.exports = { TEST_COMMANDS };
