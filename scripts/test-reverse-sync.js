#!/usr/bin/env node
/**
 * Behavioral tests for Phase 6 reverse-sync.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const linkage = require('../lib/linkage');
const reverseSync = require('../lib/reverse-sync');
const reviewRequired = require('../lib/review-required');
const state = require('../lib/state');
const { test, report } = require('./test-harness');


function mkProject() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-rsync-test-'));
  fs.mkdirSync(path.join(tmp, '.godpowers', 'prd'), { recursive: true });
  fs.mkdirSync(path.join(tmp, '.godpowers', 'arch'), { recursive: true });
  fs.mkdirSync(path.join(tmp, '.godpowers', 'roadmap'), { recursive: true });
  fs.mkdirSync(path.join(tmp, '.godpowers', 'stack'), { recursive: true });
  fs.writeFileSync(path.join(tmp, '.godpowers', 'prd', 'PRD.md'), '# PRD\n\nuser content here.\n');
  fs.writeFileSync(path.join(tmp, '.godpowers', 'arch', 'ARCH.md'), '# ARCH\n\nuser content here.\n');
  fs.writeFileSync(path.join(tmp, '.godpowers', 'roadmap', 'ROADMAP.md'), '# Roadmap\n\nuser content here.\n');
  fs.writeFileSync(path.join(tmp, '.godpowers', 'stack', 'DECISION.md'), '# Stack\n\nuser content here.\n');
  fs.writeFileSync(path.join(tmp, 'DESIGN.md'), '---\nname: Test\n---\n\n## Overview\n');
  return tmp;
}

console.log('\n  Reverse-sync behavioral tests\n');

// ============================================================================
// Fence helpers
// ============================================================================

test('readFenced returns no fence when none present', () => {
  const tmp = mkProject();
  const r = reverseSync.readFenced(path.join(tmp, '.godpowers/prd/PRD.md'));
  if (r.fenced !== '') throw new Error('false positive');
});

test('writeFenced creates fence and preserves user content', () => {
  const tmp = mkProject();
  const file = path.join(tmp, '.godpowers/prd/PRD.md');
  const before = fs.readFileSync(file, 'utf8');
  reverseSync.writeFenced(file, 'fenced content');
  const after = fs.readFileSync(file, 'utf8');
  if (!after.includes('user content here.')) throw new Error('user content lost');
  if (!after.includes('fenced content')) throw new Error('fenced content missing');
  if (!after.includes(reverseSync.FENCE_BEGIN)) throw new Error('begin missing');
  if (!after.includes(reverseSync.FENCE_END)) throw new Error('end missing');
});

test('writeFenced is idempotent', () => {
  const tmp = mkProject();
  const file = path.join(tmp, '.godpowers/prd/PRD.md');
  reverseSync.writeFenced(file, 'fenced content');
  const first = fs.readFileSync(file, 'utf8');
  reverseSync.writeFenced(file, 'fenced content');
  const second = fs.readFileSync(file, 'utf8');
  if (first !== second) throw new Error('not idempotent');
});

test('writeFenced replaces existing fence content (refresh)', () => {
  const tmp = mkProject();
  const file = path.join(tmp, '.godpowers/prd/PRD.md');
  reverseSync.writeFenced(file, 'first version');
  reverseSync.writeFenced(file, 'second version');
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('first version')) throw new Error('old fence remains');
  if (!content.includes('second version')) throw new Error('refresh failed');
});

test('writeFenced returns file-missing for non-existent path', () => {
  const r = reverseSync.writeFenced('/nonexistent/path.md', 'foo');
  if (r.written !== false) throw new Error('should not write');
  if (r.reason !== 'file-missing') throw new Error('reason wrong');
});

// ============================================================================
// Footer builders
// ============================================================================

test('buildPrdFooter groups requirements by tier', () => {
  const tmp = mkProject();
  linkage.addLink(tmp, 'P-MUST-01', 'src/auth/login.ts');
  linkage.addLink(tmp, 'P-SHOULD-02', 'src/auth/session.ts');
  const footer = reverseSync.buildPrdFooter(tmp);
  if (!footer.includes('P-MUST requirements')) throw new Error('MUST group missing');
  if (!footer.includes('P-SHOULD requirements')) throw new Error('SHOULD group missing');
  if (!footer.includes('P-MUST-01')) throw new Error('P-MUST-01 missing');
  if (!footer.includes('src/auth/login.ts')) throw new Error('file missing');
});

test('buildArchFooter splits containers and ADRs', () => {
  const tmp = mkProject();
  linkage.addLink(tmp, 'C-auth-service', 'src/auth/login.ts');
  linkage.addLink(tmp, 'ADR-007', 'src/auth/login.ts');
  const footer = reverseSync.buildArchFooter(tmp);
  if (!footer.includes('Containers')) throw new Error('container section missing');
  if (!footer.includes('ADRs')) throw new Error('ADR section missing');
  if (!footer.includes('C-auth-service')) throw new Error('container missing');
  if (!footer.includes('ADR-007')) throw new Error('ADR missing');
});

test('buildDesignFooter handles tokens and components separately', () => {
  const tmp = mkProject();
  linkage.addLink(tmp, 'colors.primary', 'src/Button.tsx');
  linkage.addLink(tmp, 'D-button-primary', 'src/Button.tsx');
  const footer = reverseSync.buildDesignFooter(tmp);
  if (!footer.includes('Token usage')) throw new Error('Token section missing');
  if (!footer.includes('Components')) throw new Error('Component section missing');
  if (!footer.includes('colors.primary')) throw new Error('token missing');
  if (!footer.includes('D-button-primary')) throw new Error('component missing');
});

// ============================================================================
// appendFooters
// ============================================================================

test('appendFooters writes to all 5 artifact targets', () => {
  const tmp = mkProject();
  linkage.addLink(tmp, 'P-MUST-01', 'src/login.ts');
  linkage.addLink(tmp, 'C-auth-service', 'src/login.ts');
  linkage.addLink(tmp, 'M-launch', 'src/login.ts');
  linkage.addLink(tmp, 'colors.primary', 'src/Button.css');
  linkage.addLink(tmp, 'S-postgres-15', 'src/db.ts');
  const results = reverseSync.appendFooters(tmp);
  const written = results.filter(r => r.written);
  if (written.length !== 5) throw new Error(`expected 5 written, got ${written.length}`);
});

test('appendFooters preserves user content', () => {
  const tmp = mkProject();
  linkage.addLink(tmp, 'P-MUST-01', 'src/login.ts');
  reverseSync.appendFooters(tmp);
  const content = fs.readFileSync(path.join(tmp, '.godpowers/prd/PRD.md'), 'utf8');
  if (!content.includes('user content here.')) throw new Error('user content lost');
});

test('appendFooters skips missing artifact files', () => {
  const tmp = mkProject();
  fs.unlinkSync(path.join(tmp, 'DESIGN.md'));
  const results = reverseSync.appendFooters(tmp);
  // DESIGN.md was removed; we should not get a "written: true" entry for it
  const designResult = results.find(r => r.type === 'design');
  if (designResult && designResult.written) throw new Error('wrote to missing file');
});

// ============================================================================
// Top-level run
// ============================================================================

test('run produces a complete result', () => {
  const tmp = mkProject();
  fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'src/login.ts'),
    '// Implements: P-MUST-01\nexport function login() {}');
  const r = reverseSync.run(tmp, { runImpeccable: false });
  if (!r.scanResult) throw new Error('scanResult missing');
  if (!r.applyResult) throw new Error('applyResult missing');
  if (!r.driftResult) throw new Error('driftResult missing');
  if (!r.footers) throw new Error('footers missing');
});

test('run populates linkage map and PRD footer', () => {
  const tmp = mkProject();
  fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'src/login.ts'),
    '// Implements: P-MUST-01\nexport function login() {}');
  reverseSync.run(tmp, { runImpeccable: false });

  const fwd = linkage.readForward(tmp);
  if (!fwd['P-MUST-01']) throw new Error('linkage not populated');

  const prd = fs.readFileSync(path.join(tmp, '.godpowers/prd/PRD.md'), 'utf8');
  if (!prd.includes('P-MUST-01')) throw new Error('PRD footer not appended');
  if (!prd.includes('user content here.')) throw new Error('user content lost');
});

test('run caches deliverable summary in state.json when requirements exist', () => {
  const tmp = mkProject();
  state.init(tmp, 'reverse-sync-deliverables');
  fs.writeFileSync(path.join(tmp, '.godpowers', 'prd', 'PRD.md'), [
    '# PRD',
    '',
    '## Functional Requirements',
    '',
    '### MUST',
    '- P-MUST-01 [DECISION] User can log in -- Acceptance: token returned',
    ''
  ].join('\n'));
  fs.writeFileSync(path.join(tmp, '.godpowers', 'roadmap', 'ROADMAP.md'), [
    '# Roadmap',
    '',
    '## Now',
    '',
    '### Delivery Increment 1: Auth',
    '- **ID**: M-auth',
    '- **Status**: done',
    '- **Features (from PRD)**:',
    '  - P-MUST-01',
    ''
  ].join('\n'));
  fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'src/login.ts'),
    '// Implements: P-MUST-01\nexport function login() {}');

  const r = reverseSync.run(tmp, { runImpeccable: false, runSourceSync: false });
  if (!r.requirements) throw new Error('requirements summary missing');

  const s = state.read(tmp);
  if (!s.deliverables) throw new Error('state deliverables missing');
  if (s.deliverables.requirements.total !== 1) throw new Error('wrong total');
  if (s.deliverables.requirements.done !== 1) throw new Error('wrong done count');

  const stateFile = path.join(tmp, '.godpowers', 'state.json');
  const firstState = fs.readFileSync(stateFile, 'utf8');
  reverseSync.run(tmp, { runImpeccable: false, runSourceSync: false });
  const secondState = fs.readFileSync(stateFile, 'utf8');
  if (firstState !== secondState) throw new Error('state cache changed on no-op run');
});

test('run surfaces drift findings to REVIEW-REQUIRED.md', () => {
  const tmp = mkProject();
  // Set up: link to a token that does not exist in DESIGN.md
  linkage.addLink(tmp, 'colors.gone', 'src/old.css');
  reverseSync.run(tmp, { runImpeccable: false });
  const reviewFile = reviewRequired.path(tmp);
  if (!fs.existsSync(reviewFile)) throw new Error('REVIEW-REQUIRED.md not created');
  const content = fs.readFileSync(reviewFile, 'utf8');
  if (!content.includes('drift')) throw new Error('drift not surfaced');
});

test('run is idempotent (no duplicate fences after re-run)', () => {
  const tmp = mkProject();
  fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'src/login.ts'), '// Implements: P-MUST-01');
  reverseSync.run(tmp, { runImpeccable: false });
  const after1 = fs.readFileSync(path.join(tmp, '.godpowers/prd/PRD.md'), 'utf8');
  reverseSync.run(tmp, { runImpeccable: false });
  const after2 = fs.readFileSync(path.join(tmp, '.godpowers/prd/PRD.md'), 'utf8');
  // Should have exactly one fence-begin marker
  const beginCount = (after2.match(/godpowers:linkage:begin/g) || []).length;
  if (beginCount !== 1) throw new Error(`expected 1 fence-begin, got ${beginCount}`);
});

report();
