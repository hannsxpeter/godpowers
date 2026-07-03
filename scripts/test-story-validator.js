#!/usr/bin/env node
/**
 * Behavioral tests for lib/story-validator.js + linkage STORY pattern.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const validator = require('../lib/story-validator');
const linkage = require('../lib/linkage');
const scanner = require('../lib/code-scanner');
const { test, report } = require('./test-harness');


function mkProject() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-story-test-'));
  fs.mkdirSync(path.join(tmp, '.godpowers', 'stories', 'auth'), { recursive: true });
  return tmp;
}

function mkStory(projectRoot, slug, num, fields = {}) {
  const id = fields.id || `STORY-${slug}-${String(num).padStart(3, '0')}`;
  const status = fields.status || 'pending';
  const title = fields.title || `Test story ${num}`;
  const owner = fields.owner || 'tester';
  const userStory = fields.userStory ||
    'As a tester, I want to write tests so that things work.';
  const acceptance = fields.acceptance ||
    '- [DECISION] Test passes. Acceptance: user clicks button, sees result.';

  const file = path.join(projectRoot, '.godpowers', 'stories', slug, `${id}.md`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `---
id: ${id}
title: "${title}"
status: ${status}
owner: ${owner}
deps: ${JSON.stringify(fields.deps || [])}
created: 2026-05-10
---

## User Story

${userStory}

## Acceptance Criteria

${acceptance}

## Slice Plan

1. Step 1
2. Step 2

## Notes

${fields.notes || ''}
`);
  return file;
}

console.log('\n  Story validator behavioral tests\n');

// ============================================================================
// isValidId
// ============================================================================

test('isValidId accepts STORY-{slug}-{NNN}', () => {
  if (!validator.isValidId('STORY-auth-001')) throw new Error('rejected valid');
  if (!validator.isValidId('STORY-billing-mrr-042')) throw new Error('rejected valid');
});

test('isValidId rejects garbage', () => {
  if (validator.isValidId('story-auth-001')) throw new Error('lowercase accepted');
  if (validator.isValidId('STORY-auth')) throw new Error('missing number accepted');
  if (validator.isValidId('STORY-001')) throw new Error('missing slug accepted');
  if (validator.isValidId('AUTH-001')) throw new Error('wrong prefix accepted');
});

// ============================================================================
// parseStory
// ============================================================================

test('parseStory extracts frontmatter and sections', () => {
  const tmp = mkProject();
  const file = mkStory(tmp, 'auth', 1);
  const story = validator.parseStory(file);
  if (story.id !== 'STORY-auth-001') throw new Error('id wrong');
  if (story.status !== 'pending') throw new Error('status wrong');
  if (!story.sections['User Story']) throw new Error('User Story missing');
  if (!story.sections['Acceptance Criteria']) throw new Error('AC missing');
});

test('parseStory handles deps as array', () => {
  const tmp = mkProject();
  const file = mkStory(tmp, 'auth', 2, { deps: ['STORY-auth-001'] });
  const story = validator.parseStory(file);
  if (!Array.isArray(story.deps)) throw new Error('not array');
  if (!story.deps.includes('STORY-auth-001')) throw new Error('dep missing');
});

test('parseStory returns error for missing frontmatter', () => {
  const tmp = mkProject();
  const file = path.join(tmp, '.godpowers/stories/auth/STORY-auth-999.mdx');
  fs.writeFileSync(file, '# No frontmatter\n');
  const story = validator.parseStory(file);
  if (!story.errors.includes('missing-frontmatter')) throw new Error('not detected');
});

// ============================================================================
// validateStory
// ============================================================================

test('validateStory accepts well-formed story', () => {
  const tmp = mkProject();
  const file = mkStory(tmp, 'auth', 1);
  const story = validator.parseStory(file);
  const findings = validator.validateStory(story);
  const errors = findings.filter(f => f.severity === 'error');
  if (errors.length > 0) throw new Error(`expected 0 errors, got ${errors.length}`);
});

test('validateStory flags missing user-story format', () => {
  const tmp = mkProject();
  const file = mkStory(tmp, 'auth', 1, {
    userStory: 'I want to do a thing.'  // no "As a" prefix
  });
  const story = validator.parseStory(file);
  const findings = validator.validateStory(story);
  if (!findings.find(f => f.kind === 'user-story-format')) {
    throw new Error('format not flagged');
  }
});

test('validateStory flags invalid status', () => {
  const tmp = mkProject();
  const file = mkStory(tmp, 'auth', 1, { status: 'wibbling' });
  const story = validator.parseStory(file);
  const findings = validator.validateStory(story);
  if (!findings.find(f => f.kind === 'invalid-status')) {
    throw new Error('not flagged');
  }
});

test('validateStory flags invalid id format', () => {
  const tmp = mkProject();
  const file = mkStory(tmp, 'auth', 1, { id: 'BadId' });
  const story = validator.parseStory(file);
  const findings = validator.validateStory(story);
  if (!findings.find(f => f.kind === 'invalid-id-format')) {
    throw new Error('not flagged');
  }
});

// ============================================================================
// listStories / listByStatus
// ============================================================================

test('listStories returns all stories', () => {
  const tmp = mkProject();
  mkStory(tmp, 'auth', 1);
  mkStory(tmp, 'auth', 2);
  mkStory(tmp, 'billing', 1);
  const stories = validator.listStories(tmp);
  if (stories.length !== 3) throw new Error(`expected 3, got ${stories.length}`);
});

test('listByStatus filters correctly', () => {
  const tmp = mkProject();
  mkStory(tmp, 'auth', 1, { status: 'pending' });
  mkStory(tmp, 'auth', 2, { status: 'in-progress' });
  mkStory(tmp, 'auth', 3, { status: 'done' });
  if (validator.listByStatus(tmp, 'pending').length !== 1) throw new Error('pending');
  if (validator.listByStatus(tmp, 'in-progress').length !== 1) throw new Error('in-progress');
  if (validator.listByStatus(tmp, 'done').length !== 1) throw new Error('done');
  if (validator.listByStatus(tmp, 'blocked').length !== 0) throw new Error('blocked');
});

// ============================================================================
// detectDepCycles
// ============================================================================

test('detectDepCycles returns empty when no cycles', () => {
  const tmp = mkProject();
  mkStory(tmp, 'auth', 1);
  mkStory(tmp, 'auth', 2, { deps: ['STORY-auth-001'] });
  mkStory(tmp, 'auth', 3, { deps: ['STORY-auth-002'] });
  const cycles = validator.detectDepCycles(tmp);
  if (cycles.length !== 0) throw new Error('false positive');
});

test('detectDepCycles finds simple cycle', () => {
  const tmp = mkProject();
  mkStory(tmp, 'auth', 1, { deps: ['STORY-auth-002'] });
  mkStory(tmp, 'auth', 2, { deps: ['STORY-auth-001'] });
  const cycles = validator.detectDepCycles(tmp);
  if (cycles.length === 0) throw new Error('cycle not detected');
});

// ============================================================================
// setStatus
// ============================================================================

test('setStatus updates the file', () => {
  const tmp = mkProject();
  const file = mkStory(tmp, 'auth', 1, { status: 'pending' });
  validator.setStatus(file, 'in-progress');
  const reread = validator.parseStory(file);
  if (reread.status !== 'in-progress') throw new Error('not updated');
});

test('setStatus rejects invalid status', () => {
  const tmp = mkProject();
  const file = mkStory(tmp, 'auth', 1);
  let threw = false;
  try { validator.setStatus(file, 'wibbling'); } catch (e) { threw = true; }
  if (!threw) throw new Error('should have thrown');
});

// ============================================================================
// linkage integration: STORY ID type
// ============================================================================

test('linkage.classifyId recognizes STORY-* IDs', () => {
  if (linkage.classifyId('STORY-auth-001') !== 'story') {
    throw new Error('STORY not classified as story');
  }
});

test('code-scanner picks up // Implements: STORY-auth-001 annotation', () => {
  const tmp = mkProject();
  fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'src/login.ts'),
    '// Implements: STORY-auth-001\nexport function login() {}');
  const links = scanner.scanFile(path.join(tmp, 'src/login.ts'));
  if (!links.find(l => l.artifactId === 'STORY-auth-001')) {
    throw new Error('STORY annotation not picked up');
  }
});

test('linkage addLink/queryByArtifact works for STORY IDs', () => {
  const tmp = mkProject();
  linkage.addLink(tmp, 'STORY-auth-001', 'src/login.ts');
  const files = linkage.queryByArtifact(tmp, 'STORY-auth-001');
  if (!files.includes('src/login.ts')) throw new Error('linkage failed');
});

report();
