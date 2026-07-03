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

test('parseAgentBudget extracts required + optional + max-tokens', () => {
  const tmp = mkProject();
  const agentPath = path.join(tmp, 'agent.md');
  fs.writeFileSync(agentPath,
    `---
name: g
required-context: [.godpowers/prd/PRD.mdx, .godpowers/state.json]
optional-context: [.godpowers/runs/latest/events.jsonl]
max-tokens: 50000
---
body`
  );
  const b = budget.parseAgentBudget(agentPath);
  assert(b.required.length === 2, `required: ${b.required.length}`);
  assert(b.optional.length === 1, `optional: ${b.optional.length}`);
  assert(b.maxTokens === 50000, `maxTokens: ${b.maxTokens}`);
});

test('plan loads required, drops optional that exceeds cap', () => {
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

test('plan reports exceeded when required alone overflows budget', () => {
  const tmp = mkProject();
  const req = path.join(tmp, 'req.md');
  fs.writeFileSync(req, 'x'.repeat(10000));  // ~2500 tokens
  const p = budget.plan({ defaultMaxTokens: 100 }, [req], [], 'agent');
  assert(p.exceeded === true, 'exceeded should be true');
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

test('plan tolerates missing files', () => {
  const tmp = mkProject();
  const p = budget.plan({ defaultMaxTokens: 100 },
                         ['/nonexistent.md'], ['/also-missing.md'],
                         'agent');
  assert(p.loadout.length === 0, 'missing files not loaded');
  assert(p.exceeded === false, 'no overflow on empty loadout');
});

report();
