#!/usr/bin/env node
// Implements: P-MUST-43
/**
 * Behavioral tests for Phase 5 forward propagation:
 *   lib/impact.js
 *   lib/review-required.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const linkage = require('../lib/linkage');
const impact = require('../lib/impact');
const reviewRequired = require('../lib/review-required');
const { test, report } = require('./test-harness');


function mkTmp() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-impact-test-'));
  fs.mkdirSync(path.join(tmp, '.godpowers'), { recursive: true });
  return tmp;
}

console.log('\n  Impact + REVIEW-REQUIRED behavioral tests\n');

// ============================================================================
// extractIds
// ============================================================================

test('extractIds finds PRD requirement IDs', () => {
  const content = `## Functional Requirements
- [DECISION] req one. P-MUST-01
- [DECISION] req two. P-SHOULD-02`;
  const ids = impact.extractIds('prd', content);
  if (!ids.has('P-MUST-01')) throw new Error('P-MUST-01 missed');
  if (!ids.has('P-SHOULD-02')) throw new Error('P-SHOULD-02 missed');
});

test('extractIds finds ADR + container IDs in ARCH', () => {
  const content = `Pattern uses ADR-007. The C-auth-service handles login.`;
  const ids = impact.extractIds('arch', content);
  if (!ids.has('ADR-007')) throw new Error('ADR missed');
  if (!ids.has('C-auth-service')) throw new Error('container missed');
});

test('extractIds finds milestone IDs in roadmap', () => {
  const content = `### M-launch-v1: ship\n### M-beta-test: open beta`;
  const ids = impact.extractIds('roadmap', content);
  if (!ids.has('M-launch-v1')) throw new Error('M-launch-v1 missed');
  if (!ids.has('M-beta-test')) throw new Error('M-beta-test missed');
});

test('extractIds finds DESIGN tokens and components', () => {
  const content = `---
name: Test
colors:
  primary: "#000"
  secondary: "#666"
typography:
  display:
    fontFamily: "Inter"
components:
  card:
    backgroundColor: "{colors.primary}"
  button:
    textColor: "{colors.secondary}"
---

## Overview`;
  const ids = impact.extractIds('design', content);
  if (!ids.has('colors.primary')) throw new Error('colors.primary missed');
  if (!ids.has('colors.secondary')) throw new Error('colors.secondary missed');
  if (!ids.has('D-card')) throw new Error('D-card missed');
  if (!ids.has('D-button')) throw new Error('D-button missed');
});

// ============================================================================
// diffIds
// ============================================================================

test('diffIds reports added IDs', () => {
  const oldContent = `P-MUST-01`;
  const newContent = `P-MUST-01\nP-MUST-02`;
  const diff = impact.diffIds('prd', oldContent, newContent);
  if (!diff.added.includes('P-MUST-02')) throw new Error('addition not detected');
});

test('diffIds reports removed IDs', () => {
  const oldContent = `P-MUST-01\nP-MUST-02`;
  const newContent = `P-MUST-01`;
  const diff = impact.diffIds('prd', oldContent, newContent);
  if (!diff.removed.includes('P-MUST-02')) throw new Error('removal not detected');
});

// ============================================================================
// forIdSet
// ============================================================================

test('forIdSet returns affected files for added IDs', () => {
  const tmp = mkTmp();
  linkage.addLink(tmp, 'P-MUST-01', 'src/auth.ts');
  const r = impact.forIdSet(tmp, { added: ['P-MUST-01'] });
  if (!r.addedAffects['P-MUST-01']) throw new Error('addedAffects missing');
  if (!r.addedAffects['P-MUST-01'].includes('src/auth.ts')) throw new Error('file missing');
});

test('forIdSet returns affected files for removed IDs', () => {
  const tmp = mkTmp();
  linkage.addLink(tmp, 'P-MUST-01', 'src/auth.ts');
  const r = impact.forIdSet(tmp, { removed: ['P-MUST-01'] });
  if (!r.removedAffects['P-MUST-01']) throw new Error('removedAffects missing');
});

// ============================================================================
// forArtifactDiff
// ============================================================================

test('forArtifactDiff reports error severity when ID removed and code links to it', () => {
  const tmp = mkTmp();
  linkage.addLink(tmp, 'P-MUST-01', 'src/login.ts');
  const oldContent = `## Functional Requirements\n- P-MUST-01\n- P-MUST-02`;
  const newContent = `## Functional Requirements\n- P-MUST-02`;
  const r = impact.forArtifactDiff(tmp, 'prd', oldContent, newContent);
  if (r.severity !== 'error') throw new Error(`expected error, got ${r.severity}`);
  if (!r.affectedFiles.includes('src/login.ts')) throw new Error('file missing');
});

test('forArtifactDiff reports info severity when only additions and no impact', () => {
  const tmp = mkTmp();
  const oldContent = `P-MUST-01`;
  const newContent = `P-MUST-01\nP-MUST-02`;
  const r = impact.forArtifactDiff(tmp, 'prd', oldContent, newContent);
  if (r.severity !== 'info') throw new Error(`expected info, got ${r.severity}`);
});

test('P-MUST-43: forArtifactDiff labels static impact as an unproven candidate', () => {
  const tmp = mkTmp();
  const r = impact.forArtifactDiff(tmp, 'prd', 'P-MUST-01', 'P-MUST-01\nP-MUST-02');
  if (!r.evidence) throw new Error('evidence metadata missing');
  if (r.evidence.kind !== 'static-candidate') throw new Error(`unexpected kind ${r.evidence.kind}`);
  if (r.evidence.status !== 'unproven') throw new Error(`unexpected status ${r.evidence.status}`);
  if (r.evidence.maximumLevel !== 2) throw new Error(`unexpected maximum ${r.evidence.maximumLevel}`);
  if (!r.evidence.limitation.includes('does not prove behavioral safety')) {
    throw new Error('candidate limitation missing');
  }
});

// ============================================================================
// forDesign
// ============================================================================

test('forDesign detects token modification', () => {
  const tmp = mkTmp();
  const old = `---
name: Test
colors:
  primary: "#000000"
---`;
  const next = `---
name: Test
colors:
  primary: "#111111"
---`;
  const r = impact.forDesign(tmp, old, next);
  const change = r.tokenChanges.find(t => t.path === 'colors.primary');
  if (!change || change.kind !== 'modified') throw new Error('modification not detected');
});

test('forDesign detects token removal as error severity', () => {
  const tmp = mkTmp();
  linkage.addLink(tmp, 'colors.removed', 'src/comp.css');
  const old = `---
name: Test
colors:
  removed: "#aaa"
---`;
  const next = `---
name: Test
colors: {}
---`;
  const r = impact.forDesign(tmp, old, next);
  if (r.severity !== 'error') throw new Error(`expected error, got ${r.severity}`);
  if (!r.affectedFiles.includes('src/comp.css')) throw new Error('file missing');
});

test('forDesign detects component changes', () => {
  const tmp = mkTmp();
  const old = `---
name: Test
components:
  button:
    backgroundColor: "#000"
---`;
  const next = `---
name: Test
components:
  button:
    backgroundColor: "#111"
---`;
  const r = impact.forDesign(tmp, old, next);
  const change = r.componentChanges.find(c => c.name === 'button');
  if (!change || change.kind !== 'modified') throw new Error('component modification not detected');
});

test('P-MUST-43: forDesign labels static impact as an unproven candidate', () => {
  const tmp = mkTmp();
  const r = impact.forDesign(tmp, '---\ncolors:\n  primary: "#000"\n---', '---\ncolors:\n  primary: "#111"\n---');
  if (!r.evidence) throw new Error('evidence metadata missing');
  if (r.evidence.kind !== 'static-candidate') throw new Error(`unexpected kind ${r.evidence.kind}`);
  if (r.evidence.status !== 'unproven') throw new Error(`unexpected status ${r.evidence.status}`);
  if (r.evidence.maximumLevel !== 2) throw new Error(`unexpected maximum ${r.evidence.maximumLevel}`);
  if (!r.evidence.limitation.includes('does not prove behavioral safety')) {
    throw new Error('candidate limitation missing');
  }
});

// ============================================================================
// review-required.appendBatch + readEntries
// ============================================================================

test('appendBatch creates REVIEW-REQUIRED.md with header on first call', () => {
  const tmp = mkTmp();
  reviewRequired.appendBatch(tmp, {
    source: 'design-impact',
    summary: 'token change',
    items: [
      { severity: 'warning', id: 'colors.primary', file: 'src/Button.tsx', message: 'review contrast' }
    ]
  });
  const file = reviewRequired.path(tmp);
  if (!fs.existsSync(file)) throw new Error('file not created');
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('# Review Required')) throw new Error('header missing');
  if (!content.includes('colors.primary')) throw new Error('item missing');
});

test('appendBatch is append-only (multiple batches preserved)', () => {
  const tmp = mkTmp();
  reviewRequired.appendBatch(tmp, {
    source: 'design-impact',
    summary: 'first',
    items: [{ severity: 'warning', id: 'a', file: 'a.ts', message: 'a' }]
  });
  reviewRequired.appendBatch(tmp, {
    source: 'reverse-sync-drift',
    summary: 'second',
    items: [{ severity: 'error', id: 'b', file: 'b.ts', message: 'b' }]
  });
  const content = fs.readFileSync(reviewRequired.path(tmp), 'utf8');
  if (!content.includes('first')) throw new Error('first batch lost');
  if (!content.includes('second')) throw new Error('second batch lost');
});

test('readEntries parses batches back', () => {
  const tmp = mkTmp();
  reviewRequired.appendBatch(tmp, {
    source: 'design-impact',
    summary: 'token change',
    items: [
      { severity: 'warning', id: 'colors.primary', file: 'src/Button.tsx', message: 'review contrast' }
    ]
  });
  const entries = reviewRequired.readEntries(tmp);
  if (entries.length !== 1) throw new Error(`expected 1, got ${entries.length}`);
  if (entries[0].source !== 'design-impact') throw new Error('source wrong');
  if (entries[0].items.length !== 1) throw new Error('item count wrong');
});

test('clear removes REVIEW-REQUIRED.md', () => {
  const tmp = mkTmp();
  reviewRequired.appendBatch(tmp, {
    source: 'x', summary: 'y', items: []
  });
  reviewRequired.clear(tmp);
  if (fs.existsSync(reviewRequired.path(tmp))) throw new Error('not cleared');
});

test('itemCount sums across batches', () => {
  const tmp = mkTmp();
  reviewRequired.appendBatch(tmp, {
    source: 'a', summary: 'a',
    items: [{ severity: 'warning', message: '1' }, { severity: 'warning', message: '2' }]
  });
  reviewRequired.appendBatch(tmp, {
    source: 'b', summary: 'b',
    items: [{ severity: 'error', message: '3' }]
  });
  const count = reviewRequired.itemCount(tmp);
  if (count !== 3) throw new Error(`expected 3, got ${count}`);
});

// ============================================================================
// REJECTED.md
// ============================================================================

test('appendRejection writes REJECTED.md with verdict', () => {
  const tmp = mkTmp();
  reviewRequired.appendRejection(tmp, {
    verdict: 'BLOCK',
    stage1: 'misaligned',
    stage2: 'errors',
    diffSummary: 'changed primary to indigo (anti-reference)',
    findings: [{ severity: 'error', code: 'D-CONTRAST', message: 'WCAG AA fail' }],
    resolutionRequired: 'Pick a color outside the indigo family.'
  });
  const file = reviewRequired.rejectedPath(tmp);
  if (!fs.existsSync(file)) throw new Error('file not created');
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('BLOCK')) throw new Error('verdict missing');
  if (!content.includes('WCAG AA fail')) throw new Error('finding missing');
});

test('appendRejection is append-only', () => {
  const tmp = mkTmp();
  reviewRequired.appendRejection(tmp, {
    verdict: 'BLOCK', stage1: 'misaligned', stage2: 'errors',
    diffSummary: 'first', findings: [], resolutionRequired: 'fix it'
  });
  reviewRequired.appendRejection(tmp, {
    verdict: 'BLOCK', stage1: 'needs-discussion', stage2: 'warnings',
    diffSummary: 'second', findings: [], resolutionRequired: 'discuss'
  });
  const content = fs.readFileSync(reviewRequired.rejectedPath(tmp), 'utf8');
  if (!content.includes('first')) throw new Error('first lost');
  if (!content.includes('second')) throw new Error('second lost');
});

report();
