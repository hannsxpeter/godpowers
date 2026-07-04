#!/usr/bin/env node
/**
 * External connector registry and policy-gate tests.
 */

const fs = require('fs');
const path = require('path');
const connectors = require('../lib/connectors');
const { test, assert, mkProject, report } = require('./test-harness');

console.log('\n  External connector tests\n');

test('connectorById resolves known ids and rejects unknown', () => {
  assert(connectors.connectorById('github').label === 'GitHub', 'github resolves');
  assert(connectors.connectorById('nope') === null, 'unknown -> null');
});

test('modeOfAction classifies read vs write vs unknown', () => {
  const github = connectors.connectorById('github');
  assert(connectors.modeOfAction(github, 'list_issues') === 'read', 'read');
  assert(connectors.modeOfAction(github, 'open_issue') === 'write', 'write');
  assert(connectors.modeOfAction(github, 'sudo_delete') === null, 'unknown');
});

test('read actions are allowed by default with no config', () => {
  const verdict = connectors.evaluateAction('github', 'list_issues', { config: { connectors: {} } });
  assert(verdict.allowed === true, 'read allowed');
  assert(verdict.mode === 'read', 'mode read');
  assert(verdict.delegateTo === 'github', 'delegates to host server');
});

test('write actions are denied until allowWrite is opted in', () => {
  const denied = connectors.evaluateAction('linear', 'create_issue', { config: { connectors: {} } });
  assert(denied.allowed === false, 'write denied by default');
  assert(denied.mode === 'write', 'mode write');
  assert(/allowWrite/.test(denied.reason), `reason mentions allowWrite: ${denied.reason}`);

  const allowed = connectors.evaluateAction('linear', 'create_issue', {
    config: { connectors: { linear: { allowWrite: true } } }
  });
  assert(allowed.allowed === true, 'write allowed after opt-in');
});

test('allowedActions narrows the write allowlist', () => {
  const config = { connectors: { github: { allowWrite: true, allowedActions: ['comment'] } } };
  assert(connectors.evaluateAction('github', 'comment', { config }).allowed === true, 'comment allowed');
  const blocked = connectors.evaluateAction('github', 'merge_pr', { config });
  assert(blocked.allowed === false, 'merge_pr blocked by allowlist');
  assert(/allowlist/.test(blocked.reason), `reason: ${blocked.reason}`);
});

test('a disabled connector blocks even read actions', () => {
  const config = { connectors: { slack: { enabled: false } } };
  const verdict = connectors.evaluateAction('slack', 'read_channel', { config });
  assert(verdict.allowed === false, 'disabled blocks read');
  assert(/disabled/.test(verdict.reason), `reason: ${verdict.reason}`);
});

test('a stringified enabled:"false" still disables the connector', () => {
  const config = { connectors: { slack: { enabled: 'false' } } };
  assert(connectors.evaluateAction('slack', 'read_channel', { config }).allowed === false,
    'string "false" must disable reads too');
  // A truthy/default value keeps it enabled.
  assert(connectors.evaluateAction('slack', 'read_channel', { config: { connectors: { slack: {} } } }).allowed === true,
    'default stays enabled');
});

test('unknown connector and action are rejected', () => {
  assert(connectors.evaluateAction('nope', 'x', { config: { connectors: {} } }).allowed === false, 'unknown connector');
  assert(connectors.evaluateAction('github', 'nope', { config: { connectors: {} } }).allowed === false, 'unknown action');
});

test('plan returns a delegation instruction for allowed actions and null otherwise', () => {
  const ok = connectors.plan('github', 'list_issues', { config: { connectors: {} } });
  assert(ok.instruction && /host GitHub MCP connector/.test(ok.instruction), `instruction: ${ok.instruction}`);
  assert(/never vendor|does not vendor/.test(ok.instruction), 'states no vendoring');
  const blocked = connectors.plan('github', 'open_issue', { config: { connectors: {} } });
  assert(blocked.instruction === null, 'blocked plan has no instruction');
});

test('detect reports availability from injected mcp servers and env', () => {
  const viaServers = connectors.detect('/tmp/x', { mcpServers: ['github', 'sentry'] });
  const github = viaServers.connectors.find((c) => c.id === 'github');
  assert(github.available === true, 'github available via mcp server list');
  assert(viaServers.availableCount === 2, `availableCount=${viaServers.availableCount}`);

  const viaEnv = connectors.detect('/tmp/x', { mcpServers: [], env: { GODPOWERS_CONNECTORS: 'linear, notion' } });
  assert(viaEnv.connectors.find((c) => c.id === 'linear').available === true, 'linear via env');
  assert(viaEnv.summary.includes('2 of'), `summary=${viaEnv.summary}`);
});

test('detect reflects write scope from config and sorts by category', () => {
  const rep = connectors.detect('/tmp/x', {
    mcpServers: [],
    config: { connectors: { github: { allowWrite: true } } }
  });
  assert(rep.connectors[0].category === 'code-host', 'code-host sorts first');
  assert(rep.connectors.find((c) => c.id === 'github').scope === 'read-write', 'github read-write');
  assert(rep.summary === 'no external connectors detected', `summary=${rep.summary}`);
});

test('readConfig reads and tolerates a malformed file', () => {
  const project = mkProject('godpowers-connectors-');
  fs.writeFileSync(path.join(project, '.godpowers', 'connectors.json'),
    JSON.stringify({ connectors: { slack: { allowWrite: true } } }));
  assert(connectors.readConfig(project).connectors.slack.allowWrite === true, 'reads config');

  fs.writeFileSync(path.join(project, '.godpowers', 'connectors.json'), '{ not json');
  assert(Object.keys(connectors.readConfig(project).connectors).length === 0, 'malformed -> empty');
});

test('render lists connectors and safety rules', () => {
  const text = connectors.render(connectors.detect('/tmp/x', { mcpServers: ['github'] }));
  assert(text.includes('GitHub'), 'lists github');
  assert(text.includes('Safety rules'), 'includes safety');
  assert(text.includes('never vendors'), 'states delegation posture');
});

report();
