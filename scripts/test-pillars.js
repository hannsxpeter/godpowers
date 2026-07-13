#!/usr/bin/env node
/**
 * Behavioral tests for lib/pillars.js.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const pillars = require('../lib/pillars');
const { test, report, assert } = require('./test-harness');


function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-pillars-test-'));
}

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

console.log('\n  Pillars tests\n');

test('detect does not treat Godpowers specialist agents as pillars', () => {
  const tmp = mkTmp();
  write(path.join(tmp, 'AGENTS.md'), '# Godpowers\n');
  write(path.join(tmp, 'agents', 'god-pm.md'), `---
name: god-pm
description: Product manager agent.
---

# God PM
`);

  const found = pillars.listPillars(tmp);
  if (found.length !== 0) throw new Error(`expected 0 pillars, got ${found.length}`);

  const detection = pillars.detect(tmp);
  if (detection.status !== 'partial') throw new Error(`expected partial, got ${detection.status}`);
  if (detection.valid) throw new Error('specialist agents should not validate as Pillars');
});

test('init creates native Pillars protocol and floor pillars', () => {
  const tmp = mkTmp();
  const result = pillars.init(tmp, {
    corePillars: ['stack', 'quality'],
    projectName: 'Fresh Product'
  });

  if (!fs.existsSync(path.join(tmp, 'AGENTS.md'))) throw new Error('AGENTS.md missing');
  if (!fs.existsSync(path.join(tmp, 'agents', 'context.md'))) throw new Error('context pillar missing');
  if (!fs.existsSync(path.join(tmp, 'agents', 'repo.md'))) throw new Error('repo pillar missing');
  if (!fs.existsSync(path.join(tmp, 'agents', 'stack.md'))) throw new Error('stack pillar missing');
  if (!fs.existsSync(path.join(tmp, 'agents', 'quality.md'))) throw new Error('quality pillar missing');
  const context = fs.readFileSync(path.join(tmp, 'agents', 'context.md'), 'utf8');
  if (!context.includes('[HYPOTHESIS] Project name: Fresh Product')) {
    throw new Error('context pillar missing project name seed');
  }
  if (!result.detection.valid) throw new Error(result.detection.issues.join(', '));
});

test('computeLoadSet loads always pillars and task-routed dependencies', () => {
  const tmp = mkTmp();
  pillars.init(tmp, { corePillars: [] });
  write(path.join(tmp, 'agents', 'auth.md'), `---
pillar: auth
status: present
always_load: false
covers: [identity, sessions, invites]
triggers: [auth, login, invite]
must_read_with: [config]
see_also: [api]
---

## Scope

Auth.

## Context

Uses invite links.

## Decisions

(none)

## Rules

(none)

## Workflows

(none)

## Watchouts

(none)

## Touchpoints

(none)

## Gaps

(none)
`);
  write(path.join(tmp, 'agents', 'config.md'), `---
pillar: config
status: present
always_load: false
covers: [environment variables, secrets]
triggers: [config, env, secret]
must_read_with: []
see_also: []
---

## Scope

Config.

## Context

Secrets live in env vars.

## Decisions

(none)

## Rules

(none)

## Workflows

(none)

## Watchouts

(none)

## Touchpoints

(none)

## Gaps

(none)
`);

  const load = pillars.computeLoadSet(tmp, 'Add workspace invite links to the auth flow');
  const names = load.loadSet.map(item => item.name).sort();
  for (const expected of ['auth', 'config', 'context', 'repo']) {
    if (!names.includes(expected)) throw new Error(`${expected} not loaded: ${names.join(', ')}`);
  }
});

test('planArtifactSync proposes by default and auto-applies under yolo', () => {
  const tmp = mkTmp();
  pillars.init(tmp, { corePillars: ['arch'] });

  const normal = pillars.planArtifactSync(tmp, ['.godpowers/arch/ARCH.mdx']);
  if (normal.length !== 1) throw new Error(`expected 1 proposal, got ${normal.length}`);
  if (normal[0].action !== 'propose') throw new Error(`expected propose, got ${normal[0].action}`);

  const yolo = pillars.planArtifactSync(tmp, ['.godpowers/arch/ARCH.mdx'], { yolo: true });
  if (yolo.length !== 1) throw new Error(`expected 1 yolo proposal, got ${yolo.length}`);
  if (yolo[0].action !== 'auto-apply') throw new Error(`expected auto-apply, got ${yolo[0].action}`);
});

test('applyArtifactSync writes managed source sections into mapped pillars', () => {
  const tmp = mkTmp();
  pillars.init(tmp, { corePillars: ['arch'] });
  write(path.join(tmp, '.godpowers', 'arch', 'ARCH.md'), [
    '# Architecture',
    '',
    '- [DECISION] Use a modular monolith for the first production cut.',
    '- [HYPOTHESIS] Split services when queue latency exceeds 500 ms.',
    ''
  ].join('\n'));

  const result = pillars.applyArtifactSync(tmp, ['.godpowers/arch/ARCH.mdx'], { yolo: true });
  if (result.length !== 1) throw new Error(`expected 1 sync result, got ${result.length}`);
  if (result[0].pillar !== 'arch') throw new Error(`expected arch, got ${result[0].pillar}`);
  if (result[0].signals !== 2) throw new Error(`expected 2 signals, got ${result[0].signals}`);

  const arch = fs.readFileSync(path.join(tmp, 'agents', 'arch.md'), 'utf8');
  if (!arch.includes(pillars.PILLAR_SYNC_FENCE_BEGIN)) throw new Error('sync fence missing');
  if (!arch.includes('.godpowers/arch/ARCH.mdx')) throw new Error('artifact source missing');
  if (!arch.includes('auto-applied by yolo')) throw new Error('yolo mode missing');
  if (!arch.includes('Use a modular monolith')) throw new Error('decision signal missing');
  if (!arch.includes('queue latency exceeds 500 ms')) throw new Error('hypothesis signal missing');
});

test('pillarizeExisting converts an existing Godpowers project into Pillars', () => {
  const tmp = mkTmp();
  write(path.join(tmp, '.godpowers', 'prd', 'PRD.md'), '# PRD\n\n[DECISION] Serve studio operators who reconcile daily events.\n');
  write(path.join(tmp, '.godpowers', 'arch', 'ARCH.md'), '# ARCH\n\n[DECISION] Keep API and worker in one deployable first.\n');
  write(path.join(tmp, '.godpowers', 'stack', 'DECISION.md'), '# STACK\n\n[DECISION] Use Node 22 for runtime parity.\n');

  const result = pillars.pillarizeExisting(tmp, { yolo: true, corePillars: ['arch', 'stack'] });
  if (result.before.status !== 'absent') throw new Error(`expected absent before, got ${result.before.status}`);
  if (!result.after.valid) throw new Error(result.after.issues.join(', '));
  if (result.artifacts.length !== 3) throw new Error(`expected 3 artifacts, got ${result.artifacts.length}`);

  const context = fs.readFileSync(path.join(tmp, 'agents', 'context.md'), 'utf8');
  const arch = fs.readFileSync(path.join(tmp, 'agents', 'arch.md'), 'utf8');
  const stack = fs.readFileSync(path.join(tmp, 'agents', 'stack.md'), 'utf8');
  if (!context.includes('.godpowers/prd/PRD.mdx')) throw new Error('PRD not linked to context pillar');
  if (!context.includes('studio operators')) throw new Error('PRD signal not extracted');
  if (!arch.includes('.godpowers/arch/ARCH.mdx')) throw new Error('ARCH not linked to arch pillar');
  if (!stack.includes('.godpowers/stack/DECISION.mdx')) throw new Error('STACK not linked to stack pillar');
});

test('extractDurableSignalsFromText sanitizes restricted characters', () => {
  const restrictedDash = String.fromCharCode(0x2014);
  const restrictedEmoji = String.fromCodePoint(0x1F600);
  const signals = pillars.extractDurableSignalsFromText(`[DECISION] Replace old flow ${restrictedDash} keep audit trail. ${restrictedEmoji}`);
  if (signals.length !== 1) throw new Error(`expected 1 signal, got ${signals.length}`);
  if (signals[0].body.includes('\u2014')) throw new Error('em dash was not sanitized');
  if (/[\u{1F300}-\u{1FAFF}]/u.test(signals[0].body)) throw new Error('emoji was not sanitized');
  if (!signals[0].body.includes('Replace old flow - keep audit trail.')) {
    throw new Error(`unexpected sanitized body: ${signals[0].body}`);
  }
});

test('extractDurableSignalsFromText ignores inline label examples', () => {
  const signals = pillars.extractDurableSignalsFromText([
    'Every sentence must be labeled `[DECISION]`, `[HYPOTHESIS]`, or `[OPEN QUESTION]`.',
    '- [DECISION] Keep the real durable decision.',
    'A sentence mentions [HYPOTHESIS] but is not a labeled artifact sentence.'
  ].join('\n'));
  assert(signals.length === 1, `unexpected signals: ${JSON.stringify(signals)}`);
  assert(signals[0].body === 'Keep the real durable decision.', JSON.stringify(signals));
});

test('extractDurableSignalsFromText preserves plain continuation lines', () => {
  const signals = pillars.extractDurableSignalsFromText([
    '[DECISION] Keep the release state tied to the source package',
    'and compare every generated view with current state before publication.',
    '',
    '- [HYPOTHESIS] Production evidence remains unavailable until',
    'a published install and live user run exist.',
    '',
    '## Next section'
  ].join('\n'));
  assert(signals.length === 2, JSON.stringify(signals));
  assert(signals[0].body === 'Keep the release state tied to the source package and compare every generated view with current state before publication.',
    JSON.stringify(signals));
  assert(signals[1].body === 'Production evidence remains unavailable until a published install and live user run exist.',
    JSON.stringify(signals));
});

test('generated content has no em dashes, en dashes, or emojis', () => {
  const content = [
    pillars.buildProtocolContent(),
    pillars.pillarStub('context', pillars.ALWAYS_PILLARS.context, { always: true })
  ].join('\n');
  if (content.includes('\u2014')) throw new Error('em dash present');
  if (content.includes('\u2013')) throw new Error('en dash present');
  if (/[\u{1F300}-\u{1FAFF}]/u.test(content)) throw new Error('emoji present');
});

report();
