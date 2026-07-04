#!/usr/bin/env node
/**
 * Behavioral tests for lib/host-capabilities.js.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

const hostCapabilities = require('../lib/host-capabilities');
const { test, report } = require('./test-harness');


function mkProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-host-cap-'));
}

console.log('\n  Host capabilities behavioral tests\n');

test('detect reports full when agent metadata is present', () => {
  const tmp = mkProject();
  fs.mkdirSync(path.join(tmp, 'home', '.codex', 'agents'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'home', '.codex', 'agents', 'god-orchestrator.toml'), 'name = "god-orchestrator"\n');
  fs.mkdirSync(path.join(tmp, 'lib'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'schema'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'lib', 'extension-authoring.js'), '');
  fs.writeFileSync(path.join(tmp, 'lib', 'suite-state.js'), '');
  fs.writeFileSync(path.join(tmp, 'schema', 'extension-manifest.v1.json'), '{}');
  const report = hostCapabilities.detect(tmp, {
    homeDir: path.join(tmp, 'home'),
    env: { SHELL: '/bin/zsh', CODEX_HOME: path.join(tmp, 'home', '.codex') },
    mcpAvailable: false,
    codeIntelligence: {
      level: 'available',
      astGrep: { available: true, command: 'ast-grep', version: 'ast-grep 0.39.0' },
      lsp: { available: false, primary: null, tools: [] },
      gaps: ['LSP tools not detected']
    }
  });
  assert.equal(report.level, 'full');
  assert.equal(report.guarantees.agentSpawn, true);
  assert.equal(report.guarantees.mcp.available, false);
  assert.equal(report.guarantees.codeIntelligence.astGrep.command, 'ast-grep');
  assert(hostCapabilities.summary(report).startsWith('full on codex'));
  assert(hostCapabilities.summary(report).includes('MCP not configured'));
});

test('detect reports degraded when shell tools exist but agent spawn is absent', () => {
  const tmp = mkProject();
  const report = hostCapabilities.detect(tmp, {
    homeDir: path.join(tmp, 'home'),
    env: { SHELL: '/bin/zsh' },
    mcpAvailable: false
  });
  assert.equal(report.level, 'degraded');
  assert(report.gaps.includes('fresh-context agent spawn not detected'));
  assert(hostCapabilities.summary(report).includes('MCP not configured'));
});

test('detect reports MCP availability from workspace package', () => {
  const tmp = mkProject();
  fs.mkdirSync(path.join(tmp, 'packages', 'mcp'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'packages', 'mcp', 'package.json'), '{"name":"@godpowers/mcp"}\n');
  const report = hostCapabilities.detect(tmp, {
    homeDir: path.join(tmp, 'home'),
    env: { SHELL: '/bin/zsh' }
  });
  assert.equal(report.guarantees.mcp.available, true);
  assert.equal(report.guarantees.mcp.source, 'workspace package');
  assert(hostCapabilities.summary(report).includes('MCP available via workspace package'));
});

test('detect surfaces external connector availability', () => {
  const tmp = mkProject();
  const report = hostCapabilities.detect(tmp, {
    homeDir: path.join(tmp, 'home'),
    env: { SHELL: '/bin/zsh' },
    connectorMcpServers: ['github', 'linear']
  });
  assert.equal(report.guarantees.connectors.available, 2);
  assert.equal(report.guarantees.connectors.total, 5);
  assert(report.guarantees.connectors.summary.includes('2 of 5'));
  assert(hostCapabilities.render(report).includes('Connectors:'));
});

test('render summarizes gaps without banned dash characters', () => {
  const tmp = mkProject();
  const report = hostCapabilities.detect(tmp, {
    homeDir: path.join(tmp, 'home'),
    env: { SHELL: '/bin/zsh' },
    mcpAvailable: false
  });
  const rendered = hostCapabilities.render(report);
  assert(rendered.includes('Host capabilities:'));
  assert(rendered.includes('MCP:'));
  assert(rendered.includes('Code intelligence:'));
  assert(!/[\u2013\u2014]/.test(rendered), 'render contains banned dash');
});

report();
