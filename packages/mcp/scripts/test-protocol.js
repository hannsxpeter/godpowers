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

function assertRequireRuntimeGuard() {
  const runtime = require('../lib/runtime');
  // SEC-001: reject module names that are not a plain lib basename.
  for (const bad of ['../evil', 'a/b', '..', 'with.dot', '']) {
    let threw = false;
    try { runtime.requireRuntime(bad, { runtimeRoot: ROOT }); } catch (_) { threw = true; }
    assert(threw, `requireRuntime should reject unsafe module name: ${JSON.stringify(bad)}`);
  }
  // A valid name still resolves the real module.
  assert(typeof runtime.requireRuntime('dashboard', { runtimeRoot: ROOT }).compute === 'function',
    'requireRuntime should load a valid runtime module');
}

async function main() {
  assertSetupPath();
  assertRequireRuntimeGuard();

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
      'change_metrics',
      'gate_check',
      'lint_artifact',
      'next',
      'route',
      'status',
      'trace_requirement',
      'verification_history',
      'work_report'
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

    const workReport = parseToolJson(await client.callTool({
      name: 'work_report',
      arguments: { project: PROJECT, since: 'all' }
    }));
    assert(workReport.report && workReport.report.summary, 'work_report missing report summary');
    assert(Array.isArray(workReport.report.records), 'work_report records should be an array');

    const changeMetrics = parseToolJson(await client.callTool({
      name: 'change_metrics',
      arguments: { project: PROJECT, since: 'all' }
    }));
    assert(changeMetrics.metric && typeof changeMetrics.metric.accepted === 'number', 'change_metrics missing accepted count');
    assert('rate' in changeMetrics.metric, 'change_metrics missing rate field');

    const route = parseToolJson(await client.callTool({
      name: 'route',
      arguments: { project: PROJECT, prompt: 'add a feature' }
    }));
    assert(typeof route.play.route === 'string', 'route play missing route');
    assert(route.play.mutatesState === false, 'route must be read-only');

    const history = parseToolJson(await client.callTool({
      name: 'verification_history',
      arguments: { project: PROJECT }
    }));
    assert(Array.isArray(history.records), 'verification_history records should be an array');
  } finally {
    await client.close();
  }

  console.log('  + @godpowers/mcp protocol and setup tests passed');
}

main().catch((error) => {
  console.error(`  x @godpowers/mcp protocol test failed: ${error.message}`);
  process.exit(1);
});
