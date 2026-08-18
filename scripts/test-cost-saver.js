#!/usr/bin/env node
/**
 * Behavioral tests for token cost saver: cost-tracker + agent-cache +
 * context-budget. One script so the three thin libs ship together.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const events = require('../lib/events');
const cost = require('../lib/cost-tracker');
const cache = require('../lib/agent-cache');
const budget = require('../lib/context-budget');
const { test, report, assert } = require('./test-harness');



function mkProject() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-cost-'));
  fs.mkdirSync(path.join(tmp, '.godpowers'), { recursive: true });
  return tmp;
}

console.log('\n  Cost tracker behavioral tests\n');

test('priceTokens computes USD from token counts', () => {
  const usd = cost.priceTokens({ model: 'claude-3-5-sonnet',
                                  in: 1_000_000, out: 1_000_000 });
  // 1M in @ $3 + 1M out @ $15 = $18
  assert(usd === 18, `expected 18, got ${usd}`);
});

test('priceTokens normalizes unknown model to fallback', () => {
  const usd = cost.priceTokens({ model: 'something-new',
                                  in: 1_000_000, out: 0 });
  // fallback is _unknown: in=5 -> $5
  assert(usd === 5, `expected 5, got ${usd}`);
});

test('normalizeModel maps haiku variants', () => {
  assert(cost.normalizeModel('claude-3-5-haiku-20241022') === 'claude-3-5-haiku');
  assert(cost.normalizeModel('gpt-4o-mini') === 'gpt-4o-mini');
  assert(cost.normalizeModel('gemini-1.5-flash-002') === 'gemini-1.5-flash');
});

test('recordCost emits cost.recorded event', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  const usd = cost.recordCost(h, {
    model: 'claude-3-5-sonnet',
    tokens_in: 1000, tokens_out: 500,
    agent: 'god-pm', tier: 'tier-1'
  });
  assert(usd > 0, `usd should be positive: ${usd}`);
  const all = events.readRun(tmp, h.runId);
  const ev = all.find(e => e.name === 'cost.recorded');
  assert(ev, 'no cost.recorded event');
  assert(ev.attrs.agent === 'god-pm', 'agent attr lost');
  assert(ev.attrs.cost_usd === usd, 'usd not in attrs');
});

test('recordCacheHit emits cache.hit with savings', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  cost.recordCacheHit(h, {
    cache_key: 'abc',
    agent: 'god-pm', tier: 'tier-1',
    model: 'claude-3-5-sonnet',
    would_have_spent_in: 5000, would_have_spent_out: 2000
  });
  const all = events.readRun(tmp, h.runId);
  const ev = all.find(e => e.name === 'cache.hit');
  assert(ev, 'no cache.hit event');
  assert(ev.attrs.savings_tokens === 7000, `savings_tokens: ${ev.attrs.savings_tokens}`);
  assert(ev.attrs.savings_usd > 0, `savings_usd: ${ev.attrs.savings_usd}`);
});

test('aggregate computes per-tier + per-agent + totals', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  cost.recordCost(h, { model: 'claude-3-5-sonnet', tokens_in: 1000, tokens_out: 500,
                       agent: 'god-pm', tier: 'tier-1' });
  cost.recordCost(h, { model: 'claude-3-5-haiku', tokens_in: 2000, tokens_out: 1000,
                       agent: 'god-status', tier: 'tier-0' });
  cost.recordCacheHit(h, { cache_key: 'k', agent: 'god-pm', tier: 'tier-1',
                           model: 'claude-3-5-sonnet',
                           would_have_spent_in: 1000, would_have_spent_out: 500 });
  const agg = cost.aggregate(tmp);
  assert(agg.totals.calls === 2, `calls: ${agg.totals.calls}`);
  assert(agg.totals.cache_hits === 1, `hits: ${agg.totals.cache_hits}`);
  assert(agg.perTier['tier-1'].calls === 1, `tier-1 calls: ${agg.perTier['tier-1'].calls}`);
  assert(agg.perAgent['god-pm'].cache_hits === 1, `god-pm hits`);
  assert(agg.perModel['claude-3-5-sonnet'].calls === 1, `sonnet calls`);
});

test('formatReport produces non-empty string with USD breakdown', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  cost.recordCost(h, { model: 'claude-3-5-sonnet', tokens_in: 10000, tokens_out: 5000,
                       agent: 'god-pm', tier: 'tier-1' });
  const s = cost.formatReport(cost.aggregate(tmp));
  assert(/Spent: \$/.test(s), 'no spent line');
  assert(/Per tier:/.test(s), 'no per-tier section');
  assert(/god-pm/.test(s), 'agent not in report');
});

test('recordCost defaults source to estimated when omitted', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  cost.recordCost(h, { model: 'claude-3-5-sonnet', tokens_in: 1000, tokens_out: 500,
                       agent: 'god-pm', tier: 'tier-1' });
  const ev = events.readRun(tmp, h.runId).find(e => e.name === 'cost.recorded');
  assert(ev.attrs.source === 'estimated', `source: ${ev.attrs.source}`);
});

test('recordCost honors explicit source: live', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  cost.recordCost(h, { model: 'claude-3-5-sonnet', tokens_in: 1000, tokens_out: 500,
                       agent: 'god-pm', tier: 'tier-1', source: 'live' });
  const ev = events.readRun(tmp, h.runId).find(e => e.name === 'cost.recorded');
  assert(ev.attrs.source === 'live', `source: ${ev.attrs.source}`);
});

test('recordCost rejects invalid source values by defaulting to estimated', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  cost.recordCost(h, { model: 'claude-3-5-sonnet', tokens_in: 1000, tokens_out: 500,
                       source: 'fabricated' });
  const ev = events.readRun(tmp, h.runId).find(e => e.name === 'cost.recorded');
  assert(ev.attrs.source === 'estimated', `bogus source not coerced: ${ev.attrs.source}`);
});

test('recordModelCall tags source as live', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  cost.recordModelCall(h, { model: 'claude-3-5-sonnet', tokens_in: 100, tokens_out: 50,
                            agent: 'god-pm', tier: 'tier-1' });
  const ev = events.readRun(tmp, h.runId).find(e => e.name === 'cost.recorded');
  assert(ev.attrs.source === 'live', `live not tagged: ${ev.attrs.source}`);
});

test('aggregate splits live and estimated totals', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  cost.recordModelCall(h, { model: 'claude-3-5-sonnet', tokens_in: 1000, tokens_out: 500,
                            agent: 'god-pm', tier: 'tier-1' });
  cost.recordCost(h, { model: 'claude-3-5-sonnet', tokens_in: 2000, tokens_out: 1000,
                       agent: 'god-pm', tier: 'tier-1' });
  const agg = cost.aggregate(tmp);
  assert(agg.totals.live_calls === 1, `live_calls: ${agg.totals.live_calls}`);
  assert(agg.totals.estimated_calls === 1, `est_calls: ${agg.totals.estimated_calls}`);
  assert(agg.totals.live_tokens === 1500, `live_tokens: ${agg.totals.live_tokens}`);
  assert(agg.totals.estimated_tokens === 3000, `est_tokens: ${agg.totals.estimated_tokens}`);
  assert(agg.totals.live_usd > 0, 'live_usd should be positive');
  assert(agg.totals.estimated_usd > 0, 'estimated_usd should be positive');
});

test('isStrictLive returns false when any record is estimated', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  cost.recordModelCall(h, { model: 'claude-3-5-sonnet', tokens_in: 1000, tokens_out: 500 });
  cost.recordCost(h, { model: 'claude-3-5-sonnet', tokens_in: 1000, tokens_out: 500 });
  const r = cost.isStrictLive(tmp);
  assert(r.strict === false, 'should not be strict');
  assert(r.live_calls === 1, `live: ${r.live_calls}`);
  assert(r.estimated_calls === 1, `estimated: ${r.estimated_calls}`);
});

test('isStrictLive returns true when every record is live', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  cost.recordModelCall(h, { model: 'claude-3-5-sonnet', tokens_in: 1000, tokens_out: 500 });
  cost.recordModelCall(h, { model: 'gpt-4o', tokens_in: 2000, tokens_out: 1000 });
  const r = cost.isStrictLive(tmp);
  assert(r.strict === true, 'should be strict');
  assert(r.estimated_calls === 0, `estimated: ${r.estimated_calls}`);
  assert(r.live_calls === 2, `live: ${r.live_calls}`);
});

test('isStrictLive returns false on empty event log (no signal)', () => {
  const tmp = mkProject();
  const r = cost.isStrictLive(tmp);
  assert(r.strict === false, 'empty log should not assert strict');
  assert(r.total_calls === 0, `calls: ${r.total_calls}`);
});

test('formatReport breaks out live vs estimated lines', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  cost.recordModelCall(h, { model: 'claude-3-5-sonnet', tokens_in: 1000, tokens_out: 500,
                            agent: 'god-pm', tier: 'tier-1' });
  cost.recordCost(h, { model: 'claude-3-5-sonnet', tokens_in: 2000, tokens_out: 1000,
                       agent: 'god-pm', tier: 'tier-1' });
  const s = cost.formatReport(cost.aggregate(tmp));
  assert(/Live: +\$/.test(s), 'live line missing');
  assert(/Estimated: \$/.test(s), 'estimated line missing');
});

console.log('\n  Agent cache behavioral tests\n');

test('key is deterministic for same inputs', () => {
  const k1 = cache.key('god-pm', '1.0.0', { a: 1, b: 2 }, 'state-hash');
  const k2 = cache.key('god-pm', '1.0.0', { b: 2, a: 1 }, 'state-hash');
  assert(k1 === k2, `key drift: ${k1} vs ${k2}`);
});

test('key changes with different inputs', () => {
  const k1 = cache.key('god-pm', '1.0.0', { a: 1 }, 'state');
  const k2 = cache.key('god-pm', '1.0.0', { a: 2 }, 'state');
  assert(k1 !== k2, 'key should differ');
});

test('key changes with different state hash', () => {
  const k1 = cache.key('god-pm', '1.0.0', { a: 1 }, 'state-1');
  const k2 = cache.key('god-pm', '1.0.0', { a: 1 }, 'state-2');
  assert(k1 !== k2, 'state hash should affect key');
});

test('key changes with different agent version', () => {
  const k1 = cache.key('god-pm', '1.0.0', { a: 1 }, 'state');
  const k2 = cache.key('god-pm', '1.1.0', { a: 1 }, 'state');
  assert(k1 !== k2, 'version should affect key');
});

test('put + get round-trip', () => {
  const tmp = mkProject();
  const k = cache.key('god-pm', '1.0.0', { x: 1 }, 'state');
  cache.put(tmp, k, { agent: 'god-pm', output: 'PRD text', tokens: { in: 100, out: 200 } });
  const got = cache.get(tmp, k);
  assert(got, 'cache miss after put');
  assert(got.output === 'PRD text', `output: ${got.output}`);
  assert(got.tokens.in === 100, `tokens.in: ${got.tokens.in}`);
});

test('get returns null for missing key', () => {
  const tmp = mkProject();
  assert(cache.get(tmp, 'nonexistent') === null);
});

test('expired entry returns null', () => {
  const tmp = mkProject();
  const k = cache.key('god-pm', '1.0.0', { x: 1 }, 'state');
  cache.put(tmp, k, { agent: 'god-pm', output: 'x', ttl_ms: -1000 });
  // ttl_ms negative means already expired
  const got = cache.get(tmp, k);
  assert(got === null, `expected null, got: ${JSON.stringify(got)}`);
});

test('has reflects presence + expiry', () => {
  const tmp = mkProject();
  const k = cache.key('god-pm', '1.0.0', { x: 1 }, 'state');
  assert(cache.has(tmp, k) === false, 'should not have yet');
  cache.put(tmp, k, { agent: 'god-pm', output: 'x' });
  assert(cache.has(tmp, k) === true, 'should have after put');
});

test('clear --all removes everything', () => {
  const tmp = mkProject();
  cache.put(tmp, cache.key('god-pm', '1.0.0', { x: 1 }, 's'), { agent: 'god-pm', output: 'a' });
  cache.put(tmp, cache.key('god-architect', '1.0.0', { x: 2 }, 's'), { agent: 'god-architect', output: 'b' });
  const r = cache.clear(tmp, { all: true });
  assert(r.removed === 2, `removed: ${r.removed}`);
  assert(cache.stats(tmp).count === 0, 'stats not zero');
});

test('clear --all removes shard symlinks without following targets', () => {
  const tmp = mkProject();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-cache-outside-'));
  const victim = path.join(outside, 'victim.json');
  fs.writeFileSync(victim, JSON.stringify({ agent: 'god-pm' }));
  const root = cache.cacheDir(tmp);
  fs.mkdirSync(root, { recursive: true });
  const link = path.join(root, 'aa');
  fs.symlinkSync(outside, link);

  cache.clear(tmp, { all: true });

  assert(fs.existsSync(victim), 'outside cache target was deleted');
  assert(!fs.existsSync(link), 'cache shard symlink was not removed');
});

test('clear --agent removes only that agent', () => {
  const tmp = mkProject();
  cache.put(tmp, cache.key('god-pm', '1.0.0', { x: 1 }, 's'), { agent: 'god-pm', output: 'a' });
  cache.put(tmp, cache.key('god-architect', '1.0.0', { x: 2 }, 's'), { agent: 'god-architect', output: 'b' });
  const r = cache.clear(tmp, { agent: 'god-pm' });
  assert(r.removed === 1, `removed: ${r.removed}`);
  assert(r.kept === 1, `kept: ${r.kept}`);
});

test('clear --expired removes only expired', () => {
  const tmp = mkProject();
  cache.put(tmp, cache.key('a', '1', { x: 1 }, 's'), { agent: 'a', output: 'live' });
  cache.put(tmp, cache.key('b', '1', { x: 2 }, 's'), { agent: 'b', output: 'dead', ttl_ms: -1000 });
  const r = cache.clear(tmp, { expiredOnly: true });
  assert(r.removed === 1, `removed: ${r.removed}`);
});

test('clear and stats skip symlinked cache entry files', () => {
  const tmp = mkProject();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-cache-file-'));
  const victim = path.join(outside, 'entry.json');
  fs.writeFileSync(victim, JSON.stringify({ agent: 'god-pm', ts: new Date().toISOString() }));
  const shard = path.join(cache.cacheDir(tmp), 'aa');
  fs.mkdirSync(shard, { recursive: true });
  const link = path.join(shard, 'entry.json');
  fs.symlinkSync(victim, link);

  const r = cache.clear(tmp, { agent: 'god-pm' });
  const s = cache.stats(tmp);

  assert(r.removed === 0, `removed: ${r.removed}`);
  assert(fs.existsSync(victim), 'outside cache entry was deleted');
  assert(fs.lstatSync(link).isSymbolicLink(), 'symlink entry should remain on narrow clear');
  assert(s.count === 0, `count: ${s.count}`);
});

test('stats reports count + total bytes', () => {
  const tmp = mkProject();
  cache.put(tmp, cache.key('a', '1', { x: 1 }, 's'), { agent: 'a', output: 'x'.repeat(100) });
  const s = cache.stats(tmp);
  assert(s.count === 1, `count: ${s.count}`);
  assert(s.totalBytes > 100, `bytes: ${s.totalBytes}`);
});

console.log('\n  Context budget behavioral tests\n');

test('estimateTokens for bytes uses ~4 bytes/token', () => {
  assert(budget.estimateTokens(400) === 100, `400 bytes -> 100 tokens`);
  assert(budget.estimateTokens(401) === 101, `401 bytes -> 101 tokens (ceil)`);
});

test('estimateTokens for text counts UTF-8 bytes / 4', () => {
  const text = 'hello world';
  assert(budget.estimateTokens(text) === 3, `tokens: ${budget.estimateTokens(text)}`);
});

test('P-MUST-25: parseAgentBudget reads explicit ordered file and inline sources', () => {
  const tmp = mkProject();
  const agentPath = path.join(tmp, 'agent.md');
  fs.writeFileSync(agentPath,
    `---
name: g
inputs:
  - "prose mentions optional phantom.md but is never parsed"
required-context:
  - "file:.godpowers/prd/PRD.mdx"
  - "inline:user-intent"
optional-context:
  - "file:.godpowers/runs/**/events.jsonl"
max-tokens: 50000
---
body`
  );
  const b = budget.parseAgentBudget(agentPath);
  assert(b.sources.length === 3, `sources: ${b.sources.length}`);
  assert(b.sources[0].kind === 'file', `first kind: ${b.sources[0].kind}`);
  assert(b.sources[0].key === '.godpowers/prd/PRD.mdx', `first key: ${b.sources[0].key}`);
  assert(b.sources[0].required === true, 'first source should be required');
  assert(b.sources[1].kind === 'inline', `second kind: ${b.sources[1].kind}`);
  assert(b.sources[1].key === 'user-intent', `second key: ${b.sources[1].key}`);
  assert(b.sources[1].required === true, 'second source should be required');
  assert(b.sources[2].kind === 'file', `third kind: ${b.sources[2].kind}`);
  assert(b.sources[2].key === '.godpowers/runs/**/events.jsonl', `third key: ${b.sources[2].key}`);
  assert(b.sources[2].required === false, 'optional array status was not preserved');
  assert(!b.sources.some(source => source.key.includes('phantom.md')), 'inputs prose was inferred as context');
  assert(b.maxTokens === 50000, `maxTokens: ${b.maxTokens}`);
});

test('P-MUST-25: validateAgentContract accepts an explicit no-project-context contract', () => {
  const tmp = mkProject();
  const agentPath = path.join(tmp, 'agent.md');
  fs.writeFileSync(agentPath, `---
name: context-free-agent
no-project-context: true
---
body`);
  const result = budget.validateAgentContract(agentPath);
  assert(result.valid === true, `errors: ${result.errors.join(', ')}`);
  assert(result.mode === 'no-project-context', `mode: ${result.mode}`);
  const loadout = budget.planForAgent(tmp, agentPath, {}, {});
  assert(loadout.blocked === false, 'explicit no-context contract should not block');
  assert(loadout.loadout.length === 0, `loadout: ${loadout.loadout.length}`);
});

test('validateAgentContract rejects empty source identifiers', () => {
  const tmp = mkProject();
  const agentPath = path.join(tmp, 'agent.md');
  fs.writeFileSync(agentPath, `---
name: g
inputs:
  - ""
required-context:
  - "inline:"
optional-context: []
max-tokens: 100
---
body`);
  const result = budget.validateAgentContract(agentPath);
  assert(result.valid === false, 'empty identifier was accepted');
  assert(result.errors.some(error => /empty/i.test(error)), `errors: ${result.errors.join(', ')}`);
});

test('validateAgentContract rejects an empty specialist name identifier', () => {
  const tmp = mkProject();
  const agentPath = path.join(tmp, 'agent.md');
  fs.writeFileSync(agentPath, `---
name: ""
inputs:
  - "user intent"
required-context:
  - "inline:user-intent"
optional-context: []
max-tokens: 100
---
body`);
  const result = budget.validateAgentContract(agentPath);
  assert(result.valid === false, 'empty specialist name was accepted');
  assert(result.errors.some(error => /name identifier.*empty/i.test(error)),
    `errors: ${result.errors.join(', ')}`);
});

test('validateAgentContract rejects contradictory required and optional duplicates', () => {
  const tmp = mkProject();
  const agentPath = path.join(tmp, 'agent.md');
  fs.writeFileSync(agentPath, `---
name: g
inputs:
  - "user intent"
required-context:
  - "inline:user-intent"
optional-context:
  - "inline:user-intent"
max-tokens: 100
---
body`);
  const result = budget.validateAgentContract(agentPath);
  assert(result.valid === false, 'contradictory duplicate was accepted');
  assert(result.errors.some(error => /required and optional/i.test(error)),
    `errors: ${result.errors.join(', ')}`);
});

test('validateAgentContract rejects no-project-context combined with inputs', () => {
  const tmp = mkProject();
  const agentPath = path.join(tmp, 'agent.md');
  fs.writeFileSync(agentPath, `---
name: g
no-project-context: true
inputs:
  - "user intent"
---
body`);
  const result = budget.validateAgentContract(agentPath);
  assert(result.valid === false, 'conflicting no-context and inputs were accepted');
  assert(result.errors.some(error => /cannot declare inputs/i.test(error)),
    `errors: ${result.errors.join(', ')}`);
});

test('validateAgentContract rejects no-project-context combined with max-tokens', () => {
  const tmp = mkProject();
  const agentPath = path.join(tmp, 'agent.md');
  fs.writeFileSync(agentPath, `---
name: g
no-project-context: true
max-tokens: 100
---
body`);
  const result = budget.validateAgentContract(agentPath);
  assert(result.valid === false, 'conflicting no-context and max-tokens were accepted');
  assert(result.errors.some(error => /cannot declare max-tokens/i.test(error)),
    `errors: ${result.errors.join(', ')}`);
});

test('validateAgentContract rejects prose and unknown explicit source forms', () => {
  const tmp = mkProject();
  const agentPath = path.join(tmp, 'agent.md');
  fs.writeFileSync(agentPath, `---
name: g
inputs:
  - "task"
required-context:
  - "some prose filename.md"
optional-context: []
max-tokens: 100
---
body`);
  const result = budget.validateAgentContract(agentPath);
  assert(result.valid === false, 'implicit prose declaration was accepted');
  assert(result.errors.some(error => /file: or inline:/i.test(error)),
    `errors: ${result.errors.join(', ')}`);
});

test('resolveSources sizes file and supplied inline payloads without embedding content in manifests', () => {
  const tmp = mkProject();
  fs.mkdirSync(path.join(tmp, 'docs'));
  fs.writeFileSync(path.join(tmp, 'docs', 'guide.md'), 'f'.repeat(40));
  const declarations = [
    { kind: 'file', key: 'docs/guide.md', required: true, order: 0 },
    { kind: 'inline', key: 'user intent', required: true, order: 1 }
  ];
  const resolved = budget.resolveSources(tmp, declarations, {
    'user intent': 'build the bounded loadout'
  });
  assert(resolved.sources.length === 2, `sources: ${resolved.sources.length}`);
  assert(resolved.sources[0].bytes === 40, `file bytes: ${resolved.sources[0].bytes}`);
  assert(resolved.sources[1].bytes === 25, `inline bytes: ${resolved.sources[1].bytes}`);
  assert(resolved.sources[1].content === 'build the bounded loadout', 'inline payload missing from loadout source');
  const manifest = budget.manifestFor(resolved.sources, { blocked: false });
  assert(!JSON.stringify(manifest).includes('build the bounded loadout'), 'manifest leaked inline content');
});

test('resolveSources expands globs in declaration order and lexical match order', () => {
  const tmp = mkProject();
  fs.mkdirSync(path.join(tmp, 'docs', 'nested'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'docs', 'z.md'), 'z');
  fs.writeFileSync(path.join(tmp, 'docs', 'a.md'), 'a');
  fs.writeFileSync(path.join(tmp, 'docs', 'nested', 'b.md'), 'b');
  fs.writeFileSync(path.join(tmp, 'first.md'), 'first');
  const resolved = budget.resolveSources(tmp, [
    { kind: 'file', key: 'first.md', required: true, order: 0 },
    { kind: 'file', key: 'docs/**/*.md', required: true, order: 1 }
  ], {});
  const names = resolved.sources.map(source => source.path);
  assert(JSON.stringify(names) === JSON.stringify([
    'first.md', 'docs/a.md', 'docs/nested/b.md', 'docs/z.md'
  ]), `unstable glob order: ${JSON.stringify(names)}`);
});

test('required glob loads 500 execution sources while evidence stays bounded', () => {
  const tmp = mkProject();
  fs.mkdirSync(path.join(tmp, 'evidence'));
  for (let index = 0; index < 500; index++) {
    fs.writeFileSync(path.join(tmp, 'evidence', `${String(index).padStart(3, '0')}.md`), 'x');
  }
  const agentPath = path.join(tmp, 'agent.md');
  fs.writeFileSync(agentPath, `---
name: g
inputs:
  - "repository evidence"
required-context:
  - "file:evidence/*.md"
optional-context: []
max-tokens: 1000
---
body`);
  const result = budget.planForAgent(tmp, agentPath, {}, {});
  assert(result.blocked === false, `missing: ${JSON.stringify(result.missing)}`);
  assert(result.loadout.length === 500, `execution loadout: ${result.loadout.length}`);
  assert(result.manifest.loaded.length === budget.MAX_EVIDENCE_SOURCES,
    `evidence loaded: ${result.manifest.loaded.length}`);
  assert(result.manifest.omittedCounts.loaded === 500 - budget.MAX_EVIDENCE_SOURCES,
    `omitted loaded: ${result.manifest.omittedCounts.loaded}`);
  const h = events.startRun(tmp);
  events.recordContextLoadout(h, result.manifest);
  const ev = events.readRun(tmp, h.runId).find(event => event.name === 'context.loadout');
  assert(ev.attrs.sourceCounts.loaded === 500,
    `event source count: ${ev.attrs.sourceCounts.loaded}`);
  assert(ev.attrs.omittedCounts.loaded === 500 - budget.MAX_EVIDENCE_SOURCES,
    `event omitted count: ${ev.attrs.omittedCounts.loaded}`);
});

test('resolveSources rejects paths outside the project and every file symlink', () => {
  const tmp = mkProject();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-context-outside-'));
  fs.writeFileSync(path.join(outside, 'secret.md'), 'secret');
  fs.writeFileSync(path.join(tmp, 'inside.md'), 'inside');
  fs.symlinkSync(path.join(outside, 'secret.md'), path.join(tmp, 'link.md'));
  fs.symlinkSync(path.join(tmp, 'inside.md'), path.join(tmp, 'inside-link.md'));
  const resolved = budget.resolveSources(tmp, [
    { kind: 'file', key: '../secret.md', required: true, order: 0 },
    { kind: 'file', key: 'link.md', required: true, order: 1 },
    { kind: 'file', key: 'inside-link.md', required: true, order: 2 }
  ], {});
  assert(resolved.sources.length === 0, 'escaped files entered the loadout');
  assert(resolved.missing.length === 3, `missing: ${resolved.missing.length}`);
  assert(resolved.missing[0].reason === 'outside-project', JSON.stringify(resolved.missing));
  assert(resolved.missing.slice(1).every(source => source.reason === 'symbolic-link'),
    `reasons: ${resolved.missing.map(source => source.reason).join(', ')}`);
});

test('resolved file sources retain pinned bytes when the path changes later', () => {
  const tmp = mkProject();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-context-swap-'));
  const file = path.join(tmp, 'stable.md');
  fs.writeFileSync(file, 'approved project bytes');
  fs.writeFileSync(path.join(outside, 'replacement.md'), 'outside replacement bytes');
  const resolved = budget.resolveSources(tmp, [
    { kind: 'file', key: 'stable.md', required: true, order: 0 }
  ], {});
  fs.rmSync(file);
  fs.symlinkSync(path.join(outside, 'replacement.md'), file);
  assert(resolved.sources.length === 1, JSON.stringify(resolved.missing));
  assert(Buffer.isBuffer(resolved.sources[0].content), 'file source bytes were not pinned');
  assert(resolved.sources[0].content.toString('utf8') === 'approved project bytes',
    'resolved source changed after its path was replaced');
  assert(resolved.sources[0].path === 'stable.md', `path: ${resolved.sources[0].path}`);
});

test('glob inventory stops at the declared traversal depth', () => {
  const tmp = mkProject();
  let current = tmp;
  for (let depth = 0; depth <= budget.MAX_PROJECT_DEPTH; depth += 1) {
    current = path.join(current, 'd');
    fs.mkdirSync(current);
  }
  fs.writeFileSync(path.join(current, 'deep.md'), 'deep');
  let traversalError;
  try {
    budget.resolveSources(tmp, [
      { kind: 'file', key: '**/*.md', required: true, order: 0 }
    ], {});
  } catch (error) {
    traversalError = error;
  }
  assert(traversalError && /traversal depth/i.test(traversalError.message),
    'deep repository inventory was not bounded');
});

test('plan loads required and drops optional that exceeds cap', () => {
  const tmp = mkProject();
  const req = path.join(tmp, 'req.md');
  const opt1 = path.join(tmp, 'opt1.md');
  const opt2 = path.join(tmp, 'opt2.md');
  fs.writeFileSync(req, 'r'.repeat(100));   // ~25 tokens
  fs.writeFileSync(opt1, 'a'.repeat(200));  // ~50 tokens
  fs.writeFileSync(opt2, 'b'.repeat(800));  // ~200 tokens
  const p = budget.plan(
    { defaultMaxTokens: 100 },
    [req], [opt1, opt2],
    'someAgent'
  );
  // req=25 + opt1=50 = 75 fits, opt2 would push to 275 > 100
  assert(p.loadout.length === 2, `loadout: ${p.loadout.length}`);
  assert(p.dropped.length === 1, `dropped: ${p.dropped.length}`);
  assert(p.dropped[0] === opt2, 'opt2 should be dropped');
});

test('plan blocks when required context alone overflows budget', () => {
  const tmp = mkProject();
  const req = path.join(tmp, 'req.md');
  fs.writeFileSync(req, 'x'.repeat(10000));  // ~2500 tokens
  const p = budget.plan({ defaultMaxTokens: 100 }, [req], [], 'agent');
  assert(p.exceeded === true, 'exceeded should be true');
  assert(p.blocked === true, 'required overflow must block dispatch');
  assert(p.loadout.length === 1, 'required still loaded');
});

test('plan respects per-agent override', () => {
  const tmp = mkProject();
  const opt = path.join(tmp, 'opt.md');
  fs.writeFileSync(opt, 'x'.repeat(800));  // ~200 tokens
  const p1 = budget.plan(
    { defaultMaxTokens: 100, perAgent: { 'wide': 1000 } },
    [], [opt], 'wide'
  );
  assert(p1.loadout.length === 1, 'wide agent loads optional');
  const p2 = budget.plan(
    { defaultMaxTokens: 100, perAgent: { 'wide': 1000 } },
    [], [opt], 'narrow'
  );
  assert(p2.loadout.length === 0, 'narrow agent drops optional');
});

test('plan blocks when required files are missing', () => {
  const tmp = mkProject();
  const p = budget.plan({ defaultMaxTokens: 100 },
                         ['/nonexistent.md'], ['/also-missing.md'],
                         'agent');
  assert(p.loadout.length === 0, 'missing files not loaded');
  assert(p.exceeded === false, 'no overflow on empty loadout');
  assert(p.blocked === true, 'missing required file must block dispatch');
  assert(p.missing.length === 1, `missing required: ${p.missing.length}`);
  assert(p.dropped.length === 1, `missing optional should be dropped: ${p.dropped.length}`);
});

test('planForAgent blocks missing inline context and honors the declared max-tokens', () => {
  const tmp = mkProject();
  const agentPath = path.join(tmp, 'agent.md');
  fs.writeFileSync(agentPath, `---
name: g
inputs:
  - "required prompt"
required-context:
  - "inline:required-prompt"
optional-context: []
max-tokens: 8
---
body`);
  const missing = budget.planForAgent(tmp, agentPath, {}, {});
  assert(missing.blocked === true, 'missing inline input should block');
  assert(missing.missing[0].key === 'required-prompt', `missing key: ${missing.missing[0].key}`);
  const overflow = budget.planForAgent(tmp, agentPath, {
    'required-prompt': 'x'.repeat(40)
  }, {});
  assert(overflow.blocked === true, 'inline overflow should block');
  assert(overflow.exceeded === true, 'inline overflow should report exceeded');
  assert(overflow.budget.tokens === 8, `declared cap ignored: ${overflow.budget.tokens}`);
});

test('planForAgent drops optional inline context without blocking', () => {
  const tmp = mkProject();
  const agentPath = path.join(tmp, 'agent.md');
  fs.writeFileSync(agentPath, `---
name: g
inputs:
  - "required prompt"
  - "optional extra evidence"
required-context:
  - "inline:required-prompt"
optional-context:
  - "inline:extra-evidence"
max-tokens: 10
---
body`);
  const result = budget.planForAgent(tmp, agentPath, {
    'required-prompt': 'x'.repeat(20),
    'extra-evidence': 'y'.repeat(40)
  }, {});
  assert(result.blocked === false, 'optional overflow should not block');
  assert(result.loadout.length === 1, `loadout: ${result.loadout.length}`);
  assert(result.dropped.length === 1, `dropped: ${result.dropped.length}`);
  assert(result.dropped[0].key === 'extra-evidence', `dropped key: ${result.dropped[0].key}`);
});

test('required invalid inline payloads return controlled blocked findings', () => {
  const cases = [
    ['undefined', undefined],
    ['unsupported', () => 'no'],
    ['non-serializable', Object.defineProperty({}, 'bad', { enumerable: true, get() { throw new Error('raw'); } })]
  ];
  const cyclic = {};
  cyclic.self = cyclic;
  cases.push(['cyclic', cyclic]);
  for (const [label, payload] of cases) {
    const tmp = mkProject();
    const agentPath = path.join(tmp, 'agent.md');
    fs.writeFileSync(agentPath, `---
name: g
inputs:
  - "task payload"
required-context:
  - "inline:task-payload"
optional-context: []
max-tokens: 100
---
body`);
    const result = budget.planForAgent(tmp, agentPath, { 'task-payload': payload }, {});
    assert(result.blocked === true, `${label} required payload did not block`);
    assert(result.missing[0].reason === `invalid-inline-${label}`,
      `${label} reason: ${result.missing[0].reason}`);
  }
});

test('optional invalid inline payloads are dropped without throwing or blocking', () => {
  const tmp = mkProject();
  const agentPath = path.join(tmp, 'agent.md');
  fs.writeFileSync(agentPath, `---
name: g
inputs:
  - "task payload"
required-context:
  - "inline:task-payload"
optional-context:
  - "inline:extra-payload"
max-tokens: 100
---
body`);
  const cyclic = {};
  cyclic.self = cyclic;
  const result = budget.planForAgent(tmp, agentPath, {
    'task-payload': 'valid',
    'extra-payload': cyclic
  }, {});
  assert(result.blocked === false, 'optional invalid payload blocked dispatch');
  assert(result.dropped.length === 1, `dropped: ${result.dropped.length}`);
  assert(result.dropped[0].reason === 'invalid-inline-cyclic',
    `reason: ${result.dropped[0].reason}`);
});

test('planForAgent returns a stable content-free manifest', () => {
  const tmp = mkProject();
  fs.writeFileSync(path.join(tmp, 'context.md'), 'stable file');
  const agentPath = path.join(tmp, 'agent.md');
  fs.writeFileSync(agentPath, `---
name: g
inputs:
  - "context.md"
  - "user intent"
required-context:
  - "file:context.md"
  - "inline:user-intent"
optional-context: []
max-tokens: 100
---
body`);
  const payloads = { 'user-intent': 'private source text' };
  const first = budget.planForAgent(tmp, agentPath, payloads, {});
  const second = budget.planForAgent(tmp, agentPath, payloads, {});
  assert(JSON.stringify(first.manifest) === JSON.stringify(second.manifest), 'manifest drifted');
  assert(!JSON.stringify(first.manifest).includes('private source text'), 'manifest leaked source content');
});

test('manifests enforce deterministic UTF-8 byte, count, and identifier bounds', () => {
  const sources = Array.from({ length: budget.MAX_EVIDENCE_SOURCES + 10 }, (_, index) => ({
    kind: 'inline',
    key: `${'界'.repeat(budget.MAX_IDENTIFIER_BYTES)}-${index}-secret-content-marker`,
    required: true,
    order: index,
    bytes: 12,
    tokens: 3
  }));
  const first = budget.manifestFor(sources, { agent: 'a'.repeat(1000), blocked: false });
  const second = budget.manifestFor(sources, { agent: 'a'.repeat(1000), blocked: false });
  const serialized = JSON.stringify(first);
  assert(Buffer.byteLength(serialized, 'utf8') <= budget.MAX_MANIFEST_BYTES,
    `manifest bytes: ${Buffer.byteLength(serialized, 'utf8')}`);
  assert(first.loaded.length <= budget.MAX_EVIDENCE_SOURCES, `loaded: ${first.loaded.length}`);
  assert(first.loaded.every(source => Buffer.byteLength(source.key, 'utf8') <= budget.MAX_IDENTIFIER_BYTES),
    'source identifier exceeded UTF-8 bound');
  assert(JSON.stringify(first) === JSON.stringify(second), 'bounded manifest is not deterministic');
  assert(!serialized.includes('secret-content-marker'), 'truncated identifier tail leaked');
});

test('manifest byte bound is unconditional for hostile non-array fields', () => {
  const cyclic = {};
  cyclic.self = cyclic;
  const hostileSource = {};
  Object.defineProperty(hostileSource, 'reason', {
    enumerable: true,
    get() { throw new Error('raw reason getter'); }
  });
  const manifest = budget.manifestFor([hostileSource], {
    agent: '界'.repeat(100000),
    blocked: cyclic,
    exceeded: 'yes',
    budget: { tokens: 'x'.repeat(100000), extra: cyclic },
    used: { bytes: Infinity, tokens: -1, extra: 'x'.repeat(100000) },
    dropped: { not: 'an array' },
    missing: 'not an array',
    sourceCounts: cyclic,
    extra: 'x'.repeat(100000)
  });
  const serialized = JSON.stringify(manifest);
  const bytes = Buffer.byteLength(serialized, 'utf8');
  assert(bytes <= budget.MAX_MANIFEST_BYTES,
    `manifest ${bytes} bytes exceeds ${budget.MAX_MANIFEST_BYTES}`);
  assert(manifest.budget === null, `budget: ${JSON.stringify(manifest.budget)}`);
  assert(manifest.used === null, `used: ${JSON.stringify(manifest.used)}`);
  assert(manifest.blocked === false, `blocked: ${manifest.blocked}`);
  assert(Buffer.byteLength(manifest.agent, 'utf8') <= budget.MAX_IDENTIFIER_BYTES,
    'hostile agent exceeded identifier bound');
});

test('recordContextLoadout emits content-free bounded evidence', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  events.recordContextLoadout(h, {
    agent: 'god-pm',
    blocked: false,
    budget: { tokens: 100 },
    used: { bytes: 24, tokens: 6 },
    loaded: [
      { kind: 'inline', key: 'user intent', bytes: 24, tokens: 6,
        content: 'private prompt text' },
      ...Array.from({ length: events.MAX_CONTEXT_LOADOUT_EVENT_BYTES }, (_, index) => ({
        kind: 'inline',
        key: `${'界'.repeat(200)}-${index}`,
        bytes: 1,
        tokens: 1,
        content: 'private prompt text'
      }))
    ],
    dropped: [],
    missing: []
  });
  const ev = events.readRun(tmp, h.runId).find(event => event.name === 'context.loadout');
  assert(ev, 'context.loadout event missing');
  assert(ev.attrs.agent === 'god-pm', `agent: ${ev.attrs.agent}`);
  assert(ev.attrs.loaded[0].key === 'user intent', `key: ${ev.attrs.loaded[0].key}`);
  assert(!JSON.stringify(ev.attrs).includes('private prompt text'), 'event leaked source content');
  const eventLine = fs.readFileSync(h.file, 'utf8').trimEnd().split('\n').find(line =>
    JSON.parse(line).name === 'context.loadout');
  assert(Buffer.byteLength(eventLine, 'utf8') <= events.MAX_CONTEXT_LOADOUT_EVENT_BYTES,
    `event bytes: ${Buffer.byteLength(eventLine, 'utf8')}`);
});

test('context.loadout event bound is unconditional for hostile manifest fields', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  const cyclic = {};
  cyclic.self = cyclic;
  const hostile = {
    agent: '界'.repeat(100000),
    blocked: cyclic,
    exceeded: 'true',
    budget: { tokens: 'x'.repeat(100000), extra: cyclic },
    used: { bytes: NaN, tokens: Infinity },
    loaded: Array.from({ length: 1000 }, (_, index) => ({
      kind: 'inline',
      key: `key-${index}-${'界'.repeat(1000)}`,
      required: true,
      reason: 'reason'.repeat(1000),
      content: 'must never appear'
    })),
    dropped: cyclic,
    missing: 'not-array',
    sourceCounts: { loaded: '9'.repeat(100000) }
  };
  events.recordContextLoadout(h, hostile);
  const eventLine = fs.readFileSync(h.file, 'utf8').trimEnd().split('\n').find(line =>
    JSON.parse(line).name === 'context.loadout');
  const bytes = Buffer.byteLength(eventLine, 'utf8');
  assert(bytes <= events.MAX_CONTEXT_LOADOUT_EVENT_BYTES,
    `event ${bytes} bytes exceeds ${events.MAX_CONTEXT_LOADOUT_EVENT_BYTES}`);
  const ev = JSON.parse(eventLine);
  assert(ev.attrs.budget === null, `budget: ${JSON.stringify(ev.attrs.budget)}`);
  assert(ev.attrs.used === null, `used: ${JSON.stringify(ev.attrs.used)}`);
  assert(!eventLine.includes('must never appear'), 'event leaked source content');
});

test('generic event emission cannot bypass context.loadout normalization or byte caps', () => {
  const tmp = mkProject();
  const h = events.startRun(tmp);
  const privateText = 'source-body-must-not-persist'.repeat(1000);
  h.emit({
    span_id: h.rootSpanId,
    name: 'context.loadout',
    attrs: {
      agent: 'generic-emitter',
      loaded: [{
        kind: 'file',
        key: 'context.md',
        required: true,
        order: 0,
        path: 'context.md',
        content: privateText
      }],
      dropped: [],
      missing: [],
      unrelated: privateText
    }
  });
  const eventLine = fs.readFileSync(h.file, 'utf8').trimEnd().split('\n').find(line =>
    JSON.parse(line).name === 'context.loadout');
  assert(eventLine, 'generic context.loadout event missing');
  assert(Buffer.byteLength(eventLine, 'utf8') <= events.MAX_CONTEXT_LOADOUT_EVENT_BYTES,
    `event bytes: ${Buffer.byteLength(eventLine, 'utf8')}`);
  assert(!eventLine.includes('source-body-must-not-persist'), 'generic event leaked source content');
});

test('shipped cartographer contract does not require a prior chart or planning artifacts', () => {
  const tmp = mkProject();
  const result = budget.planForAgent(tmp, path.join(__dirname, '..', 'specialists', 'god-cartographer.md'), {
    'user-intent': 'Map this large feature'
  }, {});
  assert(result.blocked === false, `missing: ${JSON.stringify(result.missing)}`);
  assert(result.dropped.some(source => source.key.includes('CHART.mdx')), 'prior chart was not optional');
});

test('shipped context-writer contract does not require DESIGN.md or PRODUCT.md', () => {
  const tmp = mkProject();
  fs.writeFileSync(path.join(tmp, '.godpowers', 'state.json'), '{}');
  const result = budget.planForAgent(tmp, path.join(__dirname, '..', 'specialists', 'god-context-writer.md'), {}, {});
  assert(result.blocked === false, `missing: ${JSON.stringify(result.missing)}`);
  assert(result.dropped.some(source => source.key === 'DESIGN.md'), 'DESIGN.md was not optional');
  assert(result.dropped.some(source => source.key === 'PRODUCT.md'), 'PRODUCT.md was not optional');
});

test('shipped planner contract does not require learning artifacts', () => {
  const tmp = mkProject();
  for (const relative of [
    '.godpowers/roadmap/ROADMAP.mdx',
    '.godpowers/arch/ARCH.mdx',
    '.godpowers/stack/DECISION.mdx',
    'references/building/BUILD-VERTICAL-SLICES.md',
    'references/building/BUILD-WAVES.md'
  ]) {
    const file = path.join(tmp, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'required');
  }
  const result = budget.planForAgent(tmp, path.join(__dirname, '..', 'specialists', 'god-planner.md'), {}, {});
  assert(result.blocked === false, `missing: ${JSON.stringify(result.missing)}`);
  assert(result.dropped.some(source => source.key.includes('LEARNINGS.mdx')),
    'learning artifact glob was not optional');
});

report();
