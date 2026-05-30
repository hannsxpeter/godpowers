#!/usr/bin/env node
/**
 * Behavioral tests for lib/requirements.js (deliverable tracking).
 */

const linkage = require('../lib/linkage');
const state = require('../lib/state');
const reqs = require('../lib/requirements');
const { test, assert, mkProject, writeRel, report } = require('./test-harness');

const PRD_WITH_IDS = `# Product Requirements Document

## Functional Requirements

### MUST (V1 launch blockers)
- P-MUST-01 [DECISION] User can log in -- Acceptance: valid creds return a token
- P-MUST-02 [DECISION] User can log out -- Acceptance: session cleared

### SHOULD (V1 if time permits)
- P-SHOULD-01 [HYPOTHESIS] Remember me -- Acceptance: cookie persists -- Validation: usage

### COULD (post-V1)
- P-COULD-01 [HYPOTHESIS] Social login
`;

const PRD_LEGACY = `# PRD

## Functional Requirements

### MUST (V1 launch blockers)
- [DECISION] Thing one -- Acceptance: x
- [DECISION] Thing two

### SHOULD (V1 if time permits)
- [HYPOTHESIS] Maybe thing
`;

function roadmap(authStatus) {
  return `# Roadmap

## Now (currently building, committed)

### Delivery Increment 1: Auth
- **ID**: M-auth
- **Status**: ${authStatus}
- **Goal**: users can authenticate
- **Features (from PRD)**:
  - P-MUST-01
  - P-MUST-02

## Next (planned, flexible)

### Delivery Increment 2: Niceties
- **Features (from PRD)**:
  - P-SHOULD-01

## Have-Nots Checklist

- [ ] Every completion gate is observable
`;
}

function initProject(prefix) {
  const root = mkProject(prefix);
  state.init(root, 'test-project');
  return root;
}

console.log('\n  Requirements / deliverable tracking tests\n');

// ---------------------------------------------------------------------------
// PRD parsing
// ---------------------------------------------------------------------------

test('parsePrdRequirements reads explicit ids, text, acceptance', () => {
  const root = initProject('gp-req-prd-');
  writeRel(root, reqs.PRD_PATH, PRD_WITH_IDS);
  const parsed = reqs.parsePrdRequirements(root);
  assert(parsed.length === 4, `expected 4 reqs, got ${parsed.length}`);
  const must1 = parsed.find(r => r.id === 'P-MUST-01');
  assert(must1, 'P-MUST-01 missing');
  assert(must1.priority === 'MUST', 'priority wrong');
  assert(must1.text === 'User can log in', `text wrong: "${must1.text}"`);
  assert(/token/.test(must1.acceptance), `acceptance wrong: "${must1.acceptance}"`);
  assert(parsed.some(r => r.id === 'P-COULD-01'), 'COULD missing');
});

test('parsePrdRequirements numbers id-less bullets by position', () => {
  const root = initProject('gp-req-legacy-');
  writeRel(root, reqs.PRD_PATH, PRD_LEGACY);
  const parsed = reqs.parsePrdRequirements(root);
  assert(parsed.length === 3, `expected 3, got ${parsed.length}`);
  assert(parsed[0].id === 'P-MUST-01', `got ${parsed[0].id}`);
  assert(parsed[1].id === 'P-MUST-02', `got ${parsed[1].id}`);
  assert(parsed[2].id === 'P-SHOULD-01', `got ${parsed[2].id}`);
  assert(parsed[0].text === 'Thing one', `text: "${parsed[0].text}"`);
});

test('parsePrdRequirements returns empty when no PRD', () => {
  const root = initProject('gp-req-noprd-');
  assert(reqs.parsePrdRequirements(root).length === 0, 'expected none');
});

// ---------------------------------------------------------------------------
// ROADMAP parsing
// ---------------------------------------------------------------------------

test('parseRoadmapIncrements reads id, status, horizon, members', () => {
  const root = initProject('gp-req-road-');
  writeRel(root, reqs.ROADMAP_PATH, roadmap('building'));
  const incs = reqs.parseRoadmapIncrements(root);
  assert(incs.length === 2, `expected 2 increments, got ${incs.length}`);
  const auth = incs.find(i => i.id === 'M-auth');
  assert(auth, 'M-auth missing');
  assert(auth.horizon === 'now', `horizon ${auth.horizon}`);
  assert(auth.declaredStatus === 'building', `status ${auth.declaredStatus}`);
  assert(auth.requirements.includes('P-MUST-01') && auth.requirements.includes('P-MUST-02'), 'members missing');
  const nice = incs.find(i => i.name === 'Niceties');
  assert(nice && nice.id === 'M-niceties', `synth id wrong: ${nice && nice.id}`);
  assert(nice.horizon === 'next', `horizon ${nice && nice.horizon}`);
});

test('parseRoadmapIncrements ignores Have-Nots section', () => {
  const root = initProject('gp-req-havenots-');
  writeRel(root, reqs.ROADMAP_PATH, roadmap('pending'));
  const incs = reqs.parseRoadmapIncrements(root);
  assert(!incs.some(i => /have-not/i.test(i.name)), 'have-nots leaked in');
});

// ---------------------------------------------------------------------------
// Status derivation
// ---------------------------------------------------------------------------

test('requirement is untouched with no linked code', () => {
  const root = initProject('gp-req-untouched-');
  writeRel(root, reqs.PRD_PATH, PRD_WITH_IDS);
  const d = reqs.derive(root);
  assert(d.summary.total === 4, 'total');
  assert(d.summary.untouched === 4, `untouched ${d.summary.untouched}`);
  assert(d.summary.done === 0 && d.summary.percent === 0, 'should be 0% done');
});

test('linked requirement is in-progress while build/increment not done', () => {
  const root = initProject('gp-req-inprog-');
  writeRel(root, reqs.PRD_PATH, PRD_WITH_IDS);
  writeRel(root, reqs.ROADMAP_PATH, roadmap('building'));
  linkage.addLink(root, 'P-MUST-01', 'src/auth.js');
  const d = reqs.derive(root);
  const r = d.requirements.find(x => x.id === 'P-MUST-01');
  assert(r.status === 'in-progress', `status ${r.status}`);
  assert(r.files.includes('src/auth.js'), 'files');
  const auth = d.increments.find(i => i.id === 'M-auth');
  assert(auth.status === 'building', `increment ${auth.status}`);
});

test('linked requirement is done when its increment is declared done', () => {
  const root = initProject('gp-req-incdone-');
  writeRel(root, reqs.PRD_PATH, PRD_WITH_IDS);
  writeRel(root, reqs.ROADMAP_PATH, roadmap('done'));
  linkage.addLink(root, 'P-MUST-01', 'src/auth.js');
  linkage.addLink(root, 'P-MUST-02', 'src/logout.js');
  const d = reqs.derive(root);
  const auth = d.increments.find(i => i.id === 'M-auth');
  assert(auth.status === 'done', `increment ${auth.status}`);
  assert(d.requirements.find(x => x.id === 'P-MUST-01').status === 'done', 'P-MUST-01 done');
  assert(d.requirements.find(x => x.id === 'P-MUST-02').status === 'done', 'P-MUST-02 done');
  assert(d.summary.done === 2, `done ${d.summary.done}`);
});

test('linked requirement with no increment is done when build complete', () => {
  const root = initProject('gp-req-builddone-');
  writeRel(root, reqs.PRD_PATH, PRD_WITH_IDS);
  linkage.addLink(root, 'P-COULD-01', 'src/social.js');
  state.updateSubStep(root, 'tier-2', 'build', { status: 'done' });
  const d = reqs.derive(root);
  assert(d.requirements.find(x => x.id === 'P-COULD-01').status === 'done', 'should be done');
});

test('done increment with unlinked member is flagged as a gap', () => {
  const root = initProject('gp-req-gap-');
  writeRel(root, reqs.PRD_PATH, PRD_WITH_IDS);
  writeRel(root, reqs.ROADMAP_PATH, roadmap('done'));
  linkage.addLink(root, 'P-MUST-01', 'src/auth.js');
  // P-MUST-02 deliberately left unlinked while increment is declared done.
  const d = reqs.derive(root);
  assert(d.gaps.length === 1, `gaps ${d.gaps.length}`);
  assert(d.gaps[0].id === 'P-MUST-02', `gap id ${d.gaps[0].id}`);
  assert(d.requirements.find(x => x.id === 'P-MUST-02').status === 'untouched', 'unlinked stays untouched');
});

test('byPriority breakdown counts each bucket', () => {
  const root = initProject('gp-req-priority-');
  writeRel(root, reqs.PRD_PATH, PRD_WITH_IDS);
  writeRel(root, reqs.ROADMAP_PATH, roadmap('done'));
  linkage.addLink(root, 'P-MUST-01', 'src/a.js');
  linkage.addLink(root, 'P-MUST-02', 'src/b.js');
  const d = reqs.derive(root);
  assert(d.summary.byPriority.MUST.done === 2, 'MUST done');
  assert(d.summary.byPriority.SHOULD.total === 1, 'SHOULD total');
  assert(d.summary.byPriority.COULD.untouched === 1, 'COULD untouched');
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

test('progressBar renders fill and ratio', () => {
  assert(reqs.progressBar(4, 10).includes('4/10'), 'ratio');
  assert(reqs.progressBar(4, 10).startsWith('['), 'bracket');
  assert(reqs.progressBar(0, 0) === `[${'-'.repeat(20)}] 0/0`, 'empty bar');
  assert(reqs.progressBar(10, 10).indexOf('-') === -1, 'full bar has no dashes');
});

test('renderLedger emits sections and ledger marks', () => {
  const root = initProject('gp-req-ledger-');
  writeRel(root, reqs.PRD_PATH, PRD_WITH_IDS);
  writeRel(root, reqs.ROADMAP_PATH, roadmap('building'));
  linkage.addLink(root, 'P-MUST-01', 'src/auth.js');
  const d = reqs.derive(root);
  const md = reqs.renderLedger(d);
  assert(md.includes('# Requirements Ledger'), 'title');
  assert(md.includes('## By priority'), 'priority table');
  assert(md.includes('## Done'), 'done section');
  assert(md.includes('## In progress'), 'in-progress section');
  assert(md.includes('## Increments'), 'increments section');
  assert(md.includes('[~] **P-MUST-01**'), 'in-progress mark');
});

test('writeLedger writes the ledger file and summarizeForState caches counts', () => {
  const root = initProject('gp-req-write-');
  writeRel(root, reqs.PRD_PATH, PRD_WITH_IDS);
  const d = reqs.derive(root);
  const rel = reqs.writeLedger(root, d);
  assert(rel === reqs.LEDGER_PATH, 'returns rel path');
  const fs = require('fs');
  const path = require('path');
  assert(fs.existsSync(path.join(root, rel)), 'ledger file exists');
  const cache = reqs.summarizeForState(d);
  assert(cache.requirements.total === 4, 'cache total');
  assert(typeof cache.requirements.percent === 'number', 'cache percent');
});

test('renderLedger does not end with an extra blank line', () => {
  const root = initProject('gp-req-no-blank-eof-');
  writeRel(root, reqs.PRD_PATH, PRD_WITH_IDS);
  writeRel(root, reqs.ROADMAP_PATH, roadmap('building'));
  const md = reqs.renderLedger(reqs.derive(root));
  assert(!md.endsWith('\n'), 'render should not include final newline');
  assert(!/\n\n$/.test(md), 'render should not include final blank line');
});

test('writeLedger is stable when only the generated timestamp changes', () => {
  const root = initProject('gp-req-stable-write-');
  writeRel(root, reqs.PRD_PATH, PRD_WITH_IDS);
  writeRel(root, reqs.ROADMAP_PATH, roadmap('building'));

  const firstDerived = reqs.derive(root);
  firstDerived.updated = '2026-01-01T00:00:00.000Z';
  reqs.writeLedger(root, firstDerived);

  const fs = require('fs');
  const path = require('path');
  const file = path.join(root, reqs.LEDGER_PATH);
  const first = fs.readFileSync(file, 'utf8');

  const secondDerived = reqs.derive(root);
  secondDerived.updated = '2026-01-02T00:00:00.000Z';
  reqs.writeLedger(root, secondDerived);
  const second = fs.readFileSync(file, 'utf8');

  assert(first === second, 'ledger rewrote when only timestamp changed');
});

test('summarizeForState preserves updated when only the timestamp changes', () => {
  const root = initProject('gp-req-stable-summary-');
  writeRel(root, reqs.PRD_PATH, PRD_WITH_IDS);
  const firstDerived = reqs.derive(root);
  firstDerived.updated = '2026-01-01T00:00:00.000Z';
  const first = reqs.summarizeForState(firstDerived);

  const secondDerived = reqs.derive(root);
  secondDerived.updated = '2026-01-02T00:00:00.000Z';
  const second = reqs.summarizeForState(secondDerived, first);

  assert(second.updated === first.updated, 'updated timestamp should be stable');
});

test('renderProgressLines degrades gracefully with no requirements', () => {
  const root = initProject('gp-req-empty-');
  const d = reqs.derive(root);
  const lines = reqs.renderProgressLines(d);
  assert(lines.length >= 1 && /none declared/.test(lines[0]), 'graceful empty');
});

report();
