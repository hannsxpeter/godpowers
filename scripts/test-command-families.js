#!/usr/bin/env node
// Implements: P-MUST-50
/**
 * Command family UX metadata tests.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const skillSurface = require('../lib/skill-surface');
const families = require('../lib/command-families');
const router = require('../lib/router');
const { parseSimpleYaml } = require('../lib/intent');
const { test, assert, report } = require('./test-harness');

console.log('\n  Command family UX metadata tests\n');

test('every shipped command belongs to a family', () => {
  const commands = skillSurface.commandNames();
  const covered = new Set(families.COMMAND_FAMILIES.flatMap((family) => family.commands));
  const missing = commands.filter((command) => !covered.has(command));
  assert(missing.length === 0, `missing family: ${missing.join(', ')}`);
});

test('routing metadata records command families', () => {
  const routeDir = path.join(__dirname, '..', 'routing');
  const missing = [];
  for (const file of fs.readdirSync(routeDir).filter((name) => /^god.*\.yaml$/.test(name))) {
    const route = parseSimpleYaml(fs.readFileSync(path.join(routeDir, file), 'utf8'));
    const command = route.metadata.command;
    const family = families.familyForCommand(command);
    if (!family || route.metadata.family !== family.id) {
      missing.push(`${command}:${route.metadata.family || 'none'}`);
    }
  }
  assert(missing.length === 0, `route family mismatch: ${missing.join(', ')}`);
});

test('family lookup resolves common command hubs', () => {
  assert(families.familyForCommand('/god-status').id === 'continue');
  assert(families.familyForCommand('/god-first-run').id === 'start');
  assert(families.familyForCommand('/god-surface').id === 'configure');
  assert(families.familyForCommand('/god-plan').id === 'start');
  assert(families.familyForCommand('/god-feature').id === 'build');
  assert(families.familyForCommand('/god-ship').id === 'operate');
  assert(families.familyForCommand('/god-capture').id === 'capture');
  assert(families.familyForCommand('/god-extension-add').id === 'extend');
});

test('family cards hide leaf commands unless requested', () => {
  const compact = families.renderFamilyCards([families.COMMAND_FAMILIES[0]])[0];
  const expanded = families.renderFamilyCards([families.COMMAND_FAMILIES[0]], { includeCommands: true })[0];
  assert(!compact.includes('/god-init'), `compact: ${compact}`);
  assert(expanded.includes('/god-init'), `expanded: ${expanded}`);
});

test('capture ladder classifies note, todo, backlog, and seed intent', () => {
  assert(families.classifyCapture('capture this thought').command === '/god-note');
  assert(families.classifyCapture('remind me to update auth priority P1').command === '/god-add-todo');
  assert(families.classifyCapture('backlog team billing later').command === '/god-add-backlog');
  assert(families.classifyCapture('when MRR passes 5k revisit pricing').command === '/god-plant-seed');
});

test('work size ladder classifies common implementation intents', () => {
  assert(families.classifyWorkSize('one-line typo fix').command === '/god-fast');
  assert(families.classifyWorkSize('small TDD task').command === '/god-quick');
  assert(families.classifyWorkSize('production is down').command === '/god-hotfix');
  assert(families.classifyWorkSize('add a feature').command === '/god-feature');
  // IA-002: unrelated intents must NOT be confidently mis-sized as a small
  // /god-quick coding task; they return null so /god falls back to /god-next.
  assert(families.classifyWorkSize('ship it') === null);
  assert(families.classifyWorkSize('check progress') === null);
  assert(families.classifyWorkSize('deploy this') === null);
});

test('verification ladder routes to cheapest sufficient command', () => {
  assert(families.classifyVerification('lint this artifact').command === '/god-lint');
  assert(families.classifyVerification('review this diff').command === '/god-review');
  assert(families.classifyVerification('run browser flow tests').command === '/god-test-runtime');
  assert(families.classifyVerification('release readiness dogfood').command === '/god-dogfood');
});

test('trigger precedence resolves context-sensitive overlaps', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-trigger-precedence-'));
  fs.mkdirSync(path.join(tmp, '.godpowers'), { recursive: true });
  assert(families.resolveTrigger('continue', { projectRoot: tmp }).command === '/god-next');
  fs.writeFileSync(path.join(tmp, '.godpowers', 'HANDOFF.md'), '# Handoff\n');
  assert(families.resolveTrigger('continue', { projectRoot: tmp }).command === '/god-resume-work');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('router exposes family and trigger helpers', () => {
  assert(router.getCommandFamily('/god-status').id === 'continue');
  assert(router.resolveTrigger("what's done").command === '/god-progress');
});

test('route outcomes are typed for contextual routes', () => {
  assert(router.getRouteOutcome('/god').type === 'contextual');
  assert(router.getRouteOutcome('/god-roadmap-check').type === 'verdict-based');
  assert(router.getRouteOutcome('/god-mode').type === 'steady-state');
  assert(router.getRouteOutcome('/god-pause-work').type === 'session-end');
  assert(router.getRouteOutcome('/god-sprint').type === 'requires-selection');
});

test('routing metadata records typed outcomes for flexible next routes', () => {
  const routeDir = path.join(__dirname, '..', 'routing');
  const missing = [];
  for (const file of fs.readdirSync(routeDir).filter((name) => /^god.*\.yaml$/.test(name))) {
    const route = parseSimpleYaml(fs.readFileSync(path.join(routeDir, file), 'utf8'));
    const successPath = route['success-path'] || {};
    const next = String(successPath['next-recommended'] || '');
    const needsOutcome = ['varies', 'varies-by-verdict', 'steady-state', 'session-end'].includes(next)
      || /\s+or\s+/.test(next);
    if (needsOutcome && !(successPath.outcome && successPath.outcome.type)) {
      missing.push(route.metadata.command);
    }
  }
  assert(missing.length === 0, `missing route outcomes: ${missing.join(', ')}`);
});

test('adaptive selection answers a large-project assessment directly', () => {
  const result = families.selectRunApproach({
    task: 'assessment', scope: 'cross-cutting', risk: 'high', uncertainty: 'high'
  });
  assert(result.approach === 'direct');
  assert(result.command === null);
  assert(result.components.includes('inspection'));
  assert(!result.components.includes('artifact-sync'));
  assert(!result.components.includes('specialist-review'));
  assert(result.authority === 'recommendation-only');
});

test('adaptive selection uses fast only for established mechanical changes', () => {
  const facts = { task: 'change', scope: 'bounded', risk: 'low', uncertainty: 'low', mechanical: true };
  assert(families.selectRunApproach(facts).command === '/god-fast');
  assert(families.selectRunApproach({ ...facts, mechanical: false }).command === '/god-quick');
  for (const change of [{ risk: 'high' }, { risk: 'unknown' }, { scope: 'unknown' }, { uncertainty: 'high' }]) {
    const result = families.selectRunApproach({ ...facts, ...change });
    assert(result.approach === 'focused');
    assert(result.command !== '/god-fast');
    assert(result.components.includes('specialist-review'));
  }
});

test('adaptive selection keeps a risky local bug focused and includes verification', () => {
  const result = families.selectRunApproach({ task: 'bug', scope: 'bounded', risk: 'high', uncertainty: 'high' });
  assert(result.approach === 'focused');
  assert(result.command === '/god-debug');
  assert(result.components.includes('verification'));
  assert(result.components.includes('specialist-review'));
  assert(result.components.includes('risk-review'));
  assert(!result.components.includes('shipping'));
});

test('adaptive selection distinguishes feature scope from a full project objective', () => {
  const facts = { task: 'change', scope: 'cross-cutting', risk: 'low', uncertainty: 'low' };
  assert(families.selectRunApproach(facts).command === '/god-feature');
  const full = families.selectRunApproach({ ...facts, task: 'project' });
  assert(full.approach === 'full');
  assert(full.command === '/god-mode');
  assert(full.invocationPolicy === 'explicit-only');
  assert(full.authority === 'recommendation-only');
  const ship = families.selectRunApproach({ ...facts, task: 'release' });
  assert(ship.command === '/god-ship');
  assert(ship.invocationPolicy === 'approval-required');
});

test('adaptive selection requires explicit facts and does not infer safety from a model name', () => {
  const assertNode = require('assert');
  for (const input of [undefined, null, [], {}, { task: 'question' }, { task: 'invented', scope: 'bounded', risk: 'low', uncertainty: 'low' }]) {
    assertNode.throws(() => families.selectRunApproach(input), /run assessment/i);
  }
  const facts = { task: 'change', scope: 'bounded', risk: 'unknown', uncertainty: 'high' };
  const expected = families.selectRunApproach(facts);
  for (const model of ['gpt-6-astra', 'another-host-model']) {
    assertNode.deepStrictEqual(families.selectRunApproach({ ...facts, model, tokenBudget: 1 }), expected);
  }
  assert(families.selectRunApproach({ task: 'question', scope: 'bounded', risk: 'low', uncertainty: 'low' }).command === null);
});

test('adaptive fast selection requires a boolean mechanical assessment', () => {
  const facts = { task: 'change', scope: 'bounded', risk: 'low', uncertainty: 'low' };
  for (const mechanical of [undefined, 'true', 1, {}, false]) {
    assert(families.selectRunApproach({ ...facts, mechanical }).command === '/god-quick');
  }
});

test('installed skill sources connect adaptive selection without adding a selector agent', () => {
  const root = path.join(__dirname, '..');
  const master = fs.readFileSync(path.join(root, 'SKILL.md'), 'utf8');
  const frontDoor = fs.readFileSync(path.join(root, 'skills/god.md'), 'utf8');
  const mode = fs.readFileSync(path.join(root, 'skills/god-mode.md'), 'utf8');
  const runbook = fs.readFileSync(path.join(root, 'references/orchestration/GOD-ORCHESTRATOR-RUNBOOK.md'), 'utf8');
  assert(master.includes('selectRunApproach(assessment)'));
  assert(frontDoor.includes('selectRunApproach(assessment)'));
  assert(frontDoor.includes('direct with no command'));
  assert(mode.includes('explicit `/god-mode` requests the full workflow'));
  assert(runbook.includes('Adaptive run selection'));
  assert(!runbook.includes('Default model = `claude-3-5-sonnet`'));
});

test('focused debugging hands uncommitted fixes to independent review before commit', () => {
  const root = path.join(__dirname, '..');
  const skill = fs.readFileSync(path.join(root, 'skills/god-debug.md'), 'utf8');
  const specialist = fs.readFileSync(path.join(root, 'specialists/god-debugger.md'), 'utf8');
  const route = parseSimpleYaml(fs.readFileSync(path.join(root, 'routing/god-debug.yaml'), 'utf8'));
  const runbook = fs.readFileSync(path.join(root, 'references/orchestration/GOD-ORCHESTRATOR-RUNBOOK.md'), 'utf8');
  assert(skill.includes('Run `/god-review` before committing'));
  assert(skill.includes('Both stages must pass'));
  assert(specialist.includes('Return the uncommitted fix'));
  assert(specialist.includes('Do not commit or grade your own fix'));
  assert(runbook.includes('Both stages must pass before the caller commits or closes the fix'));
  for (const name of ['god-spec-reviewer', 'god-quality-reviewer']) {
    assert(route.execution.spawns.includes(name));
  }
});

report();
