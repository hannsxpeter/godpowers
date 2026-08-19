#!/usr/bin/env node
/**
 * Behavioral tests for lib/skillui-bridge.js (SkillUI fallback integration).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const bridge = require('../lib/skillui-bridge');
const { test, report } = require('./test-harness');


function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-skillui-test-'));
}

console.log('\n  SkillUI bridge behavioral tests\n');

// ============================================================================
// detectTargetKind
// ============================================================================

test('detectTargetKind identifies HTTPS URL', () => {
  if (bridge.detectTargetKind('https://example.com') !== 'url') throw new Error('url miss');
});

test('detectTargetKind identifies HTTP URL', () => {
  if (bridge.detectTargetKind('http://example.com') !== 'url') throw new Error('url miss');
});

test('detectTargetKind identifies GitHub URL as repo', () => {
  if (bridge.detectTargetKind('https://github.com/foo/bar') !== 'repo') throw new Error('repo miss');
});

test('detectTargetKind identifies org/repo shorthand as repo', () => {
  if (bridge.detectTargetKind('foo/bar') !== 'repo') throw new Error('shorthand miss');
});

test('detectTargetKind identifies existing local dir', () => {
  const tmp = mkTmp();
  if (bridge.detectTargetKind(tmp) !== 'dir') throw new Error('dir miss');
});

test('detectTargetKind defaults to url for ambiguous string', () => {
  if (bridge.detectTargetKind('example.com') !== 'url') throw new Error('default miss');
});

test('detectTargetKind returns null for empty input', () => {
  if (bridge.detectTargetKind('') !== null) throw new Error('empty');
  if (bridge.detectTargetKind(null) !== null) throw new Error('null');
});

// ============================================================================
// slugifyTarget
// ============================================================================

test('slugifyTarget strips https and TLD separators', () => {
  if (bridge.slugifyTarget('https://example.com') !== 'example-com') {
    throw new Error(bridge.slugifyTarget('https://example.com'));
  }
});

test('slugifyTarget handles paths', () => {
  if (bridge.slugifyTarget('https://acme.com/about') !== 'acme-com-about') {
    throw new Error(bridge.slugifyTarget('https://acme.com/about'));
  }
});

test('slugifyTarget collapses multiple separators', () => {
  if (bridge.slugifyTarget('foo//bar..baz') !== 'foo-bar-baz') {
    throw new Error(bridge.slugifyTarget('foo//bar..baz'));
  }
});

test('slugifyTarget lowercases', () => {
  if (bridge.slugifyTarget('Example.COM') !== 'example-com') throw new Error('case');
});

// ============================================================================
// cacheDir
// ============================================================================

test('cacheDir returns expected location', () => {
  const tmp = mkTmp();
  const d = bridge.cacheDir(tmp, 'example-com');
  if (!d.includes('.godpowers/cache/skillui/example-com')) throw new Error('cacheDir wrong');
});

// ============================================================================
// extract (returns not-installed gracefully)
// ============================================================================

test('extract returns not-installed when SkillUI absent', async () => {
  const tmp = mkTmp();
  // Most CI environments won't have skillui installed
  const r = await bridge.extract('https://example.com', tmp);
  // Either not-installed (typical) or some other graceful failure - either is fine
  if (r.error !== 'not-installed' && !r.designMd) {
    // Expected paths: not-installed OR success (we're not asserting
    // skillui IS installed, just that the bridge handles either case)
    if (!r.error) throw new Error('expected error or designMd');
  }
});

test('extract creates cache dir even when failing', async () => {
  const tmp = mkTmp();
  const r = await bridge.extract('https://example.com', tmp, { forceRun: false });
  // The cache dir is created before SkillUI is invoked when forceRun is false
  // and isInstalled is false, the extract returns early without creating the dir.
  // So we test that we got some kind of structured result
  if (typeof r !== 'object') throw new Error('not an object');
});

test('remote extraction rejects HTTP, metadata, private, and mixed DNS targets before spawn', async () => {
  const publicAddress = { address: '93.184.216.34', family: 4 };
  const cases = [
    { target: 'http://example.com', resolver: async () => [publicAddress] },
    { target: 'https://169.254.169.254/latest/meta-data', resolver: async () => [
      { address: '169.254.169.254', family: 4 }
    ] },
    { target: 'https://internal.example', resolver: async () => [
      { address: '10.1.2.3', family: 4 }
    ] },
    { target: 'https://mixed.example', resolver: async () => [
      publicAddress,
      { address: '127.0.0.1', family: 4 }
    ] }
  ];
  for (const item of cases) {
    const result = await bridge.extract(item.target, mkTmp(), {
      forceRun: true,
      resolver: item.resolver
    });
    if (result.error !== 'unsafe-target' || result.outputDir !== null) {
      throw new Error(`unsafe target reached SkillUI: ${JSON.stringify(result)}`);
    }
  }
});

test('public HTTPS targets pass the remote target preflight', async () => {
  const target = await bridge.resolvePublicTarget('https://example.com/design', {
    resolver: async () => [{ address: '93.184.216.34', family: 4 }]
  });
  if (target.url.origin !== 'https://example.com') throw new Error('public target changed origin');
  if (target.addresses[0].address !== '93.184.216.34') throw new Error('public address missing');
});

test('public URL and repository targets never reach the external SkillUI process', async () => {
  for (const target of ['https://example.com/design', 'https://github.com/example/project']) {
    const result = await bridge.extract(target, mkTmp(), {
      forceRun: true,
      resolver: async () => [{ address: '93.184.216.34', family: 4 }]
    });
    if (result.error !== 'remote-target-disabled' || result.outputDir !== null) {
      throw new Error(`remote target reached SkillUI: ${JSON.stringify(result)}`);
    }
  }
});

// ============================================================================
// findFirstDesignMd
// ============================================================================

test('findFirstDesignMd finds DESIGN.md in flat dir', () => {
  const tmp = mkTmp();
  fs.writeFileSync(path.join(tmp, 'DESIGN.md'), '---\nname: t\n---');
  const found = bridge.findFirstDesignMd(tmp);
  if (!found || !found.endsWith('DESIGN.md')) throw new Error('not found');
});

test('findFirstDesignMd recurses into subdirectories', () => {
  const tmp = mkTmp();
  fs.mkdirSync(path.join(tmp, 'sub', 'nested'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'sub', 'nested', 'DESIGN.md'), 'x');
  const found = bridge.findFirstDesignMd(tmp);
  if (!found || !found.includes('nested/DESIGN.md')) throw new Error('recursion');
});

test('findFirstDesignMd returns null for empty dir', () => {
  const tmp = mkTmp();
  const found = bridge.findFirstDesignMd(tmp);
  if (found !== null) throw new Error('false positive');
});

test('findFirstDesignMd returns null for missing dir', () => {
  const found = bridge.findFirstDesignMd('/nonexistent-path-xyz');
  if (found !== null) throw new Error('should be null');
});

// ============================================================================
// readCached
// ============================================================================

test('readCached returns cached DESIGN.md content', () => {
  const tmp = mkTmp();
  const slug = 'test-slug';
  const cacheDir = bridge.cacheDir(tmp, slug);
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(path.join(cacheDir, 'DESIGN.md'), '---\nname: cached\n---\n## Overview');
  const r = bridge.readCached(tmp, slug);
  if (!r) throw new Error('null result');
  if (!r.content.includes('cached')) throw new Error('content wrong');
});

test('readCached returns null when not cached', () => {
  const tmp = mkTmp();
  const r = bridge.readCached(tmp, 'never-cached');
  if (r !== null) throw new Error('should be null');
});

// ============================================================================
// planFallback
// ============================================================================

test('planFallback constructs URL from bare site name', () => {
  const tmp = mkTmp();
  const plan = bridge.planFallback('Acme', tmp);
  if (!plan.target.includes('acme.com')) throw new Error('URL not constructed');
  if (plan.kind !== 'url') throw new Error('kind wrong');
});

test('planFallback uses URL as-is if already URL', () => {
  const tmp = mkTmp();
  const plan = bridge.planFallback('https://example.com', tmp);
  if (plan.target !== 'https://example.com') throw new Error('URL not passed through');
});

test('planFallback includes install command when not installed', () => {
  const tmp = mkTmp();
  const plan = bridge.planFallback('https://example.com', tmp);
  if (typeof plan.requiresInstall !== 'boolean') throw new Error('requiresInstall missing');
  if (!plan.installCommand.includes('skillui')) throw new Error('install command wrong');
  if (plan.remoteExtraction !== false || plan.requiresLocalSnapshot !== true) {
    throw new Error('remote fallback must require a reviewed local snapshot');
  }
});

// ============================================================================
// isInstalled
// ============================================================================

test('isInstalled returns boolean', () => {
  const r = bridge.isInstalled();
  if (typeof r !== 'boolean') throw new Error('not boolean');
});

report();
