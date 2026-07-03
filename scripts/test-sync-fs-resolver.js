#!/usr/bin/env node
/**
 * Behavioral tests for the sync-fs artifact resolver (mdx-first, legacy .md
 * fallback) and the absorb-on-first-write migration of lib-owned files.
 */

const fs = require('fs');
const path = require('path');

const syncFs = require('../lib/sync-fs');
const checkpoint = require('../lib/checkpoint');
const { test, assert, mkProject, writeRel, report } = require('./test-harness');

console.log('\n  sync-fs resolver behavioral tests\n');

// ============================================================================
// legacyTwin
// ============================================================================

test('legacyTwin maps .mdx to .md and back', () => {
  assert(syncFs.legacyTwin('.godpowers/prd/PRD.mdx') === '.godpowers/prd/PRD.md', 'mdx -> md');
  assert(syncFs.legacyTwin('.godpowers/prd/PRD.md') === '.godpowers/prd/PRD.mdx', 'md -> mdx');
});

test('legacyTwin returns null for non-markdown paths', () => {
  assert(syncFs.legacyTwin('.godpowers/state.json') === null, 'json has no twin');
  assert(syncFs.legacyTwin('.godpowers/ledger/verifications.jsonl') === null, 'jsonl has no twin');
});

// ============================================================================
// resolveArtifact
// ============================================================================

test('resolveArtifact: canonical .mdx wins when both twins exist', () => {
  const tmp = mkProject('godpowers-syncfs-');
  writeRel(tmp, '.godpowers/prd/PRD.mdx', 'canonical');
  writeRel(tmp, '.godpowers/prd/PRD.md', 'legacy');
  const resolved = syncFs.resolveArtifact(tmp, '.godpowers/prd/PRD.mdx');
  assert(resolved === '.godpowers/prd/PRD.mdx', `expected canonical, got ${resolved}`);
  assert(syncFs.readArtifact(tmp, '.godpowers/prd/PRD.mdx') === 'canonical', 'read the wrong twin');
});

test('resolveArtifact: falls back to legacy .md when only it exists', () => {
  const tmp = mkProject('godpowers-syncfs-');
  writeRel(tmp, '.godpowers/prd/PRD.md', 'legacy');
  const resolved = syncFs.resolveArtifact(tmp, '.godpowers/prd/PRD.mdx');
  assert(resolved === '.godpowers/prd/PRD.md', `expected legacy twin, got ${resolved}`);
});

test('resolveArtifact: reports the canonical path when neither twin exists', () => {
  const tmp = mkProject('godpowers-syncfs-');
  const resolved = syncFs.resolveArtifact(tmp, '.godpowers/prd/PRD.mdx');
  assert(resolved === '.godpowers/prd/PRD.mdx', `expected canonical name, got ${resolved}`);
});

test('resolveArtifact: a legacy .md request resolves to the .mdx on disk', () => {
  const tmp = mkProject('godpowers-syncfs-');
  writeRel(tmp, '.godpowers/prd/PRD.mdx', 'canonical');
  const resolved = syncFs.resolveArtifact(tmp, '.godpowers/prd/PRD.md');
  assert(resolved === '.godpowers/prd/PRD.mdx', `expected mdx twin, got ${resolved}`);
});

// ============================================================================
// existsArtifact / readArtifact / readArtifactOrNull
// ============================================================================

test('existsArtifact is true through the legacy fallback, false when neither exists', () => {
  const tmp = mkProject('godpowers-syncfs-');
  assert(!syncFs.existsArtifact(tmp, '.godpowers/roadmap/ROADMAP.mdx'), 'nothing on disk yet');
  writeRel(tmp, '.godpowers/roadmap/ROADMAP.md', 'legacy roadmap');
  assert(syncFs.existsArtifact(tmp, '.godpowers/roadmap/ROADMAP.mdx'), 'legacy twin should count');
});

test('readArtifact returns legacy twin content; readArtifactOrNull distinguishes absent', () => {
  const tmp = mkProject('godpowers-syncfs-');
  writeRel(tmp, '.godpowers/arch/ARCH.md', 'legacy arch');
  assert(syncFs.readArtifact(tmp, '.godpowers/arch/ARCH.mdx') === 'legacy arch', 'fallback read failed');
  assert(syncFs.readArtifact(tmp, '.godpowers/stack/DECISION.mdx') === '', 'missing reads as empty string');
  assert(syncFs.readArtifactOrNull(tmp, '.godpowers/stack/DECISION.mdx') === null, 'missing reads as null');
  assert(syncFs.readArtifactOrNull(tmp, '.godpowers/arch/ARCH.mdx') === 'legacy arch', 'orNull fallback read failed');
});

// ============================================================================
// Absorb migration: legacy CHECKPOINT.md is carried into .mdx and deleted
// ============================================================================

test('checkpoint write absorbs a legacy CHECKPOINT.md: facts carried, twin deleted', () => {
  const tmp = mkProject('godpowers-syncfs-absorb-');
  // Build a legacy checkpoint the way an old runtime would have: same format,
  // .md name.
  checkpoint.write(tmp, {
    project: 'absorb-test',
    mode: 'B',
    facts: ['[DECISION] keep postgres'],
    actions: ['ran tests']
  });
  const mdxPath = path.join(tmp, '.godpowers', 'CHECKPOINT.mdx');
  const mdPath = path.join(tmp, '.godpowers', 'CHECKPOINT.md');
  fs.renameSync(mdxPath, mdPath);

  // Read falls back to the legacy twin.
  const before = checkpoint.read(tmp);
  assert(before && before.facts.includes('[DECISION] keep postgres'), 'legacy read fallback failed');

  // First write after migration absorbs the legacy state and deletes the twin.
  checkpoint.recordFact(tmp, '[DECISION] add redis cache');
  assert(fs.existsSync(mdxPath), 'canonical CHECKPOINT.mdx not written');
  assert(!fs.existsSync(mdPath), 'legacy CHECKPOINT.md not deleted after absorb');
  const after = checkpoint.read(tmp);
  assert(after.facts.includes('[DECISION] keep postgres'), 'legacy fact lost in absorb');
  assert(after.facts.includes('[DECISION] add redis cache'), 'new fact missing');
});

report();
