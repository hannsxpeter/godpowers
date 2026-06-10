#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const setup = require('../lib/setup');
const mcpPackage = require('../package.json');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const PROJECT = path.join(ROOT, 'fixtures', 'quick-proof', 'project');
const SERVER = path.join(ROOT, 'packages', 'mcp', 'bin', 'godpowers-mcp.js');

function parseToolJson(result) {
  assert(result && Array.isArray(result.content), 'tool result content missing');
  const text = result.content.find((item) => item.type === 'text');
  assert(text, 'tool result text content missing');
  return JSON.parse(text.text);
}

function assertSetupPath() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-mcp-home-'));
  const plan = setup.setupPlan({
    host: 'codex',
    projectRoot: PROJECT,
    homeDir: home,
    version: mcpPackage.version
  });
  assert(plan.writes === false, 'setup plan should be read-only by default');
  assert(!fs.existsSync(plan.codexConfigPath), 'setup plan should not write config');
  const written = setup.writeRegistration(plan);
  assert(written.writes === true, 'setup write result should mark writes true');
  const config = fs.readFileSync(written.codexConfigPath, 'utf8');
  assert(config.includes('[mcp_servers.godpowers]'), 'codex config missing MCP table');
  assert(config.includes(`@godpowers/mcp@${mcpPackage.version}`), 'codex config missing companion package');
  const second = setup.writeRegistration(plan);
  const rewritten = fs.readFileSync(second.codexConfigPath, 'utf8');
  assert(rewritten.indexOf(setup.BEGIN) === rewritten.lastIndexOf(setup.BEGIN), 'managed block should be replaced, not duplicated');
}

async function main() {
  assertSetupPath();

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      SERVER,
      'serve',
      '--project',
      PROJECT,
      '--runtime-root',
      ROOT
    ],
    cwd: ROOT,
    stderr: 'pipe'
  });
  const client = new Client({
    name: 'godpowers-mcp-protocol-test',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    assert(client.getServerVersion().name === 'godpowers-mcp', 'initialize did not return server identity');

    const listed = await client.listTools();
    const names = listed.tools.map((tool) => tool.name).sort();
    assert.deepEqual(names, [
      'gate_check',
      'lint_artifact',
      'next',
      'status',
      'trace_requirement'
    ]);
    for (const tool of listed.tools) {
      assert(tool.annotations && tool.annotations.readOnlyHint === true, `${tool.name} missing readOnlyHint`);
      assert(tool.annotations.destructiveHint === false, `${tool.name} should not be destructive`);
    }

    const status = parseToolJson(await client.callTool({
      name: 'status',
      arguments: { project: PROJECT, brief: true, git: false }
    }));
    assert(status.dashboard.next.command === '/god-prd', 'status next command mismatch');
    assert(status.rendered.includes('Godpowers Dashboard'), 'status rendered dashboard missing');

    const next = parseToolJson(await client.callTool({
      name: 'next',
      arguments: { project: PROJECT, git: false }
    }));
    assert(next.next.command === '/god-prd', 'next tool command mismatch');

    const gate = parseToolJson(await client.callTool({
      name: 'gate_check',
      arguments: { project: PROJECT, tier: 'prd' }
    }));
    assert(gate.verdict === 'fail', 'quick-proof PRD gate should fail missing artifact');
    assert(gate.findings.some((finding) => finding.id.startsWith('missing-artifact:prd')), 'gate missing artifact finding absent');

    const lint = parseToolJson(await client.callTool({
      name: 'lint_artifact',
      arguments: { project: PROJECT, path: 'README.md' }
    }));
    assert(lint.artifact === 'README.md', 'lint artifact path mismatch');
    assert(lint.lint.summary.errors >= 0, 'lint summary missing');

    const trace = parseToolJson(await client.callTool({
      name: 'trace_requirement',
      arguments: { project: PROJECT, id: 'P-MUST-01' }
    }));
    assert(trace.found === false, 'quick-proof fixture should not contain requirements yet');
    assert(trace.summary.total === 0, 'trace summary should report zero requirements');
  } finally {
    await client.close();
  }

  console.log('  + @godpowers/mcp protocol and setup tests passed');
}

main().catch((error) => {
  console.error(`  x @godpowers/mcp protocol test failed: ${error.message}`);
  process.exit(1);
});
