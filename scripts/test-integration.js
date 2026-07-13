#!/usr/bin/env node
/**
 * Phase 7 integration tests:
 *   - state.js schema additions (design, product, linkage, yolo-decisions)
 *   - context-writer.js DESIGN/PRODUCT pointers and linkage status
 *   - End-to-end: detector + scanner + reverse-sync + footers
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const state = require('../lib/state');
const contextWriter = require('../lib/context-writer');
const detector = require('../lib/design-detector');
const scanner = require('../lib/code-scanner');
const reverseSync = require('../lib/reverse-sync');
const linkage = require('../lib/linkage');
const { test, report } = require('./test-harness');


function mkProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-integration-test-'));
}

console.log('\n  Phase 7 integration behavioral tests\n');

// ============================================================================
// state.js schema additions
// ============================================================================

test('state.init includes tier-1.design and tier-1.product slots', () => {
  const tmp = mkProject();
  const s = state.init(tmp, 'test');
  if (!s.tiers['tier-1'].design) throw new Error('design slot missing');
  if (!s.tiers['tier-1'].product) throw new Error('product slot missing');
  if (s.tiers['tier-1'].design.status !== 'pending') throw new Error('design default status wrong');
});

test('state.init includes linkage slot with default zeros', () => {
  const tmp = mkProject();
  const s = state.init(tmp, 'test');
  if (!s.linkage) throw new Error('linkage slot missing');
  if (s.linkage['coverage-pct'] !== 0) throw new Error('coverage-pct default wrong');
  if (s.linkage['orphan-count'] !== 0) throw new Error('orphan-count default wrong');
  if (s.linkage['drift-count'] !== 0) throw new Error('drift-count default wrong');
});

test('state.init includes yolo-decisions array', () => {
  const tmp = mkProject();
  const s = state.init(tmp, 'test');
  if (!Array.isArray(s['yolo-decisions'])) throw new Error('yolo-decisions not array');
});

test('state.read after init returns full schema', () => {
  const tmp = mkProject();
  state.init(tmp, 'test');
  const s = state.read(tmp);
  if (!s.linkage) throw new Error('linkage missing on read');
  if (!s.tiers['tier-1'].design) throw new Error('design missing on read');
});

// ============================================================================
// context-writer DESIGN/PRODUCT pointers
// ============================================================================

test('context-writer fence includes DESIGN.md pointer when present', () => {
  const tmp = mkProject();
  fs.writeFileSync(path.join(tmp, 'DESIGN.md'), '---\nname: Test\n---\n');
  const content = contextWriter.buildCanonicalContent(
    { project: { name: 'p' }, tiers: {} },
    { projectRoot: tmp }
  );
  if (!content.includes('DESIGN.md')) throw new Error('DESIGN.md pointer missing');
});

test('context-writer fence includes PRODUCT.md pointer when present', () => {
  const tmp = mkProject();
  fs.writeFileSync(path.join(tmp, 'PRODUCT.md'), '# Product\n');
  const content = contextWriter.buildCanonicalContent(
    { project: { name: 'p' }, tiers: {} },
    { projectRoot: tmp }
  );
  if (!content.includes('PRODUCT.md')) throw new Error('PRODUCT.md pointer missing');
});

test('context-writer fence includes linkage status when populated', () => {
  const tmp = mkProject();
  const stateData = {
    project: { name: 'p' },
    tiers: {},
    linkage: { 'coverage-pct': 0.85, 'orphan-count': 2, 'drift-count': 1, 'review-required-items': 3 }
  };
  const content = contextWriter.buildCanonicalContent(stateData, { projectRoot: tmp });
  if (!content.includes('Linkage status')) throw new Error('Linkage section missing');
  if (!content.includes('Coverage: 85%')) throw new Error('coverage missing');
});

test('context-writer tolerates legacy whole-number linkage coverage', () => {
  const content = contextWriter.buildCanonicalContent({
    project: { name: 'legacy-coverage' },
    linkage: { 'coverage-pct': 100, 'orphan-count': 0, 'drift-count': 0 }
  });
  if (!content.includes('Coverage: 100%')) throw new Error('legacy coverage missing');
  if (content.includes('Coverage: 10000%')) throw new Error('legacy coverage multiplied twice');
});

test('context-writer fence omits linkage section when zeros', () => {
  const tmp = mkProject();
  const stateData = {
    project: { name: 'p' },
    tiers: {},
    linkage: { 'coverage-pct': 0, 'orphan-count': 0, 'drift-count': 0 }
  };
  const content = contextWriter.buildCanonicalContent(stateData, { projectRoot: tmp });
  if (content.includes('Linkage status')) throw new Error('Linkage section should be hidden');
});

// ============================================================================
// End-to-end: full pipeline on a synthetic project
// ============================================================================

test('end-to-end: empty project starts clean (no errors)', () => {
  const tmp = mkProject();
  state.init(tmp, 'e2e-test');
  const result = reverseSync.run(tmp, { runImpeccable: false });
  if (result.driftResult.summary.errors > 0) throw new Error('unexpected errors');
});

test('end-to-end: code with annotations populates linkage and PRD footer', () => {
  const tmp = mkProject();
  state.init(tmp, 'e2e-test');
  fs.mkdirSync(path.join(tmp, '.godpowers', 'prd'), { recursive: true });
  fs.writeFileSync(path.join(tmp, '.godpowers', 'prd', 'PRD.mdx'),
    '# PRD\n\nuser content\n\nP-MUST-01 stable id mention\n');
  fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'src/login.ts'),
    '// Implements: P-MUST-01\nexport function login() {}\n');

  reverseSync.run(tmp, { runImpeccable: false });

  // Linkage populated
  const fwd = linkage.readForward(tmp);
  if (!fwd['P-MUST-01']) throw new Error('linkage not populated');

  // PRD footer added (without touching user content)
  const prd = fs.readFileSync(path.join(tmp, '.godpowers/prd/PRD.mdx'), 'utf8');
  if (!prd.includes('user content')) throw new Error('user content lost');
  if (!prd.includes('P-MUST-01')) throw new Error('PRD footer missing');
  if (!prd.includes('godpowers:linkage:begin')) throw new Error('fence missing');
});

test('end-to-end: backend-only project skips design (detector returns false)', () => {
  const tmp = mkProject();
  fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
    dependencies: { express: '^4.0.0' }
  }));
  const r = detector.isUiProject(tmp);
  if (r.required) throw new Error('false positive UI detection');
});

test('end-to-end: UI project triggers design tier (detector returns true)', () => {
  const tmp = mkProject();
  fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
    dependencies: { react: '^18.0.0', next: '^15.0.0' }
  }));
  const r = detector.isUiProject(tmp);
  if (!r.required) throw new Error('UI detection failed');
  if (!r.frameworks.includes('react')) throw new Error('react missed');
});

report();
