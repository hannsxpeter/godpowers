#!/usr/bin/env node
/**
 * Smoke test for lib/ runtime modules.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const intent = require('../lib/intent');
const state = require('../lib/state');
const events = require('../lib/events');
const workflowParser = require('../lib/workflow-parser');
const { test, report } = require('./test-harness');


console.log('\n  Runtime smoke tests\n');

// Setup temp project
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-runtime-test-'));

test('state.init creates valid state.json', () => {
  const s = state.init(tmp, 'test-project');
  if (s.project.name !== 'test-project') throw new Error('project.name not set');
  if (!s.tiers['tier-1'].prd) throw new Error('tier-1.prd not initialized');
});

test('state.read returns the written state', () => {
  const s = state.read(tmp);
  if (!s) throw new Error('state.read returned null');
  if (s.version !== '1.0.0') throw new Error('state.version not 1.0.0');
});

test('state.updateSubStep updates correctly', () => {
  const s = state.updateSubStep(tmp, 'tier-1', 'prd', { status: 'done' });
  if (s.status !== 'done') throw new Error('status not updated');
  const verified = state.read(tmp);
  if (verified.tiers['tier-1'].prd.status !== 'done') throw new Error('not persisted');
});

test('state.hashFile computes sha256 hash', () => {
  const testFile = path.join(tmp, 'test.txt');
  fs.writeFileSync(testFile, 'hello world');
  const hash = state.hashFile(testFile);
  if (!hash.startsWith('sha256:')) throw new Error('hash format wrong');
  if (hash.length !== 7 + 64) throw new Error('hash length wrong');
});

test('events.startRun creates run dir and emits root span', () => {
  const handle = events.startRun(tmp, { workflow: 'test-arc' });
  if (!handle.traceId) throw new Error('no traceId');
  if (!handle.runId) throw new Error('no runId');
  const all = events.readRun(tmp, handle.runId);
  if (all.length !== 1) throw new Error(`expected 1 event, got ${all.length}`);
  if (all[0].name !== 'workflow.run') throw new Error('first event should be workflow.run');
});

test('events.spawn creates child spans correctly', () => {
  const handle = events.startRun(tmp, { workflow: 'test-arc' });
  const child = handle.spawn();
  child.emit({ name: 'agent.start', attrs: { agent: 'god-pm' } });
  const all = events.readRun(tmp, handle.runId);
  const childEvent = all.find(e => e.name === 'agent.start');
  if (!childEvent) throw new Error('child event not found');
  if (childEvent.parent !== handle.rootSpanId) throw new Error('parent not set correctly');
});

test('intent.parseSimpleYaml handles basic structure', () => {
  const yaml = `
apiVersion: godpowers/v1
kind: Project
metadata:
  name: test
mode: A
scale: medium
`;
  const parsed = intent.parseSimpleYaml(yaml);
  if (parsed.apiVersion !== 'godpowers/v1') throw new Error('apiVersion not parsed');
  if (parsed.metadata.name !== 'test') throw new Error('nested name not parsed');
  if (parsed.mode !== 'A') throw new Error('mode not parsed');
});

test('intent.validate catches missing required fields', () => {
  const errors = intent.validate({ kind: 'Project' });
  if (errors.length === 0) throw new Error('should have errors');
  if (!errors.some(e => e.includes('apiVersion'))) throw new Error('should flag apiVersion');
});

test('intent.get retrieves nested values', () => {
  const data = { config: { yolo: true, nested: { value: 42 } } };
  if (intent.get(data, 'config.yolo') !== true) throw new Error('config.yolo not found');
  if (intent.get(data, 'config.nested.value') !== 42) throw new Error('deep nested not found');
  if (intent.get(data, 'missing.path') !== undefined) throw new Error('missing should be undefined');
});

test('workflow-parser parses full-arc.yaml', () => {
  const workflowFile = path.join(__dirname, '..', 'workflows', 'full-arc.yaml');
  const workflow = workflowParser.parseFile(workflowFile);
  if (workflow.metadata.name !== 'full-arc') throw new Error('name wrong');
  if (!workflow.jobs.prd) throw new Error('prd job missing');
});

test('workflow-parser builds waves correctly', () => {
  const workflowFile = path.join(__dirname, '..', 'workflows', 'full-arc.yaml');
  const workflow = workflowParser.parseFile(workflowFile);
  const waves = workflowParser.buildWaves(workflow);
  if (waves.length === 0) throw new Error('no waves');
  // The tier-0 `context` preamble (Pillars detect/init) is the arc root; prd
  // depends on it and lands in the next wave.
  if (!waves[0].includes('context')) throw new Error('context should be in first wave');
  if (!waves.slice(1).some((wave) => wave.includes('prd'))) {
    throw new Error('prd should follow the context preamble');
  }
});

test('workflow-parser validates the core workflows (>= 13)', () => {
  const workflowsDir = path.join(__dirname, '..', 'workflows');
  const all = workflowParser.loadAll(workflowsDir);
  // Floor, not exact: adding a workflow should not fail this runtime check.
  // The exact doc-vs-reality count is enforced by test-doc-surface-counts.js.
  if (Object.keys(all).length < 13) {
    throw new Error(`expected >= 13 workflows, got ${Object.keys(all).length}`);
  }
});

test('state.detectDrift returns empty when no artifacts', () => {
  const drift = state.detectDrift(tmp);
  if (!Array.isArray(drift)) throw new Error('drift should be array');
});

// Cleanup
fs.rmSync(tmp, { recursive: true, force: true });

report();
