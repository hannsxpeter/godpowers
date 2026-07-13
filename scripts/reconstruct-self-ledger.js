#!/usr/bin/env node
/**
 * Reconstruct Godpowers' own deliverable ledger.
 *
 * Godpowers dogfoods its own traceability system. This script maps every PRD
 * requirement (declared in .godpowers/prd/PRD.mdx) to the real file that
 * implements it, populates the linkage map (source: "reconstruct"), regenerates
 * .godpowers/REQUIREMENTS.mdx, and records PRD/ROADMAP completion plus the
 * deliverable summary in state.json.
 *
 * Re-runnable and idempotent: linkage.addLink and the ledger render are both
 * stable, so running it twice yields the same files. Update the MAP below when a
 * requirement's primary implementing file moves.
 *
 * Usage: node scripts/reconstruct-self-ledger.js
 */

const fs = require('fs');
const path = require('path');

const state = require('../lib/state');
const linkage = require('../lib/linkage');
const requirements = require('../lib/requirements');

const ROOT = path.resolve(__dirname, '..');

// Requirement id -> the real file(s) that implement it. Kept deliberately small
// (the primary implementing surface), not an exhaustive file list.
const MAP = {
  'P-MUST-01': ['specialists/god-orchestrator.md'],
  'P-MUST-02': ['lib/state.js'],
  'P-MUST-03': ['lib/multi-repo-detector.js'],
  'P-MUST-04': ['specialists/god-pm.md'],
  'P-MUST-05': ['specialists/god-architect.md'],
  'P-MUST-06': ['specialists/god-roadmapper.md'],
  'P-MUST-07': ['specialists/god-stack-selector.md'],
  'P-MUST-08': ['specialists/god-repo-scaffolder.md'],
  'P-MUST-09': ['specialists/god-executor.md', 'specialists/god-planner.md'],
  'P-MUST-10': ['specialists/god-spec-reviewer.md', 'specialists/god-quality-reviewer.md'],
  'P-MUST-11': ['lib/have-nots-validator.js'],
  'P-MUST-12': ['lib/artifact-linter.js'],
  'P-MUST-13': ['lib/linkage.js'],
  'P-MUST-14': ['lib/reverse-sync.js', 'lib/code-scanner.js'],
  'P-MUST-15': ['lib/drift-detector.js'],
  'P-MUST-16': ['lib/dashboard.js'],
  'P-MUST-17': ['lib/recipes.js'],
  'P-MUST-18': ['lib/router.js'],
  'P-MUST-19': ['lib/requirements.js', 'skills/god-progress.md'],
  'P-MUST-20': ['lib/checkpoint.js'],
  'P-MUST-21': ['lib/installer-core.js', 'bin/install.js'],
  'P-MUST-22': ['specialists/god-harden-auditor.md'],
  'P-SHOULD-01': ['specialists/god-deploy-engineer.md'],
  'P-SHOULD-02': ['specialists/god-observability-engineer.md'],
  'P-SHOULD-03': ['specialists/god-launch-strategist.md'],
  'P-SHOULD-04': ['specialists/god-updater.md'],
  'P-SHOULD-05': ['lib/host-capabilities.js'],
  'P-SHOULD-06': ['lib/runtime-test.js'],
  'P-SHOULD-07': ['lib/source-sync.js'],
  'P-COULD-01': ['specialists/god-coordinator.md'],
  'P-COULD-02': ['specialists/god-automation-engineer.md'],
  'P-COULD-03': ['lib/otel-exporter.js'],
  'P-COULD-04': ['specialists/god-spike-runner.md']
};

function fail(msg) {
  console.error(`reconstruct-self-ledger: ${msg}`);
  process.exit(1);
}

function stableArtifactStep(current, patch, now) {
  const next = { ...(current || {}), ...patch };
  const sameArtifact = current &&
    current.status === next.status &&
    current.artifact === next.artifact &&
    current['artifact-hash'] === next['artifact-hash'];
  next.updated = sameArtifact && current.updated ? current.updated : now;
  return next;
}

// 1. Validate: every declared PRD requirement is mapped, every mapped file exists.
const declared = requirements.parsePrdRequirements(ROOT).map(r => r.id);
if (declared.length === 0) fail('no requirements found in .godpowers/prd/PRD.mdx');

const unmapped = declared.filter(id => !MAP[id]);
if (unmapped.length > 0) fail(`requirements with no file mapping: ${unmapped.join(', ')}`);

const extra = Object.keys(MAP).filter(id => !declared.includes(id));
if (extra.length > 0) fail(`MAP has ids not in the PRD: ${extra.join(', ')}`);

for (const [id, files] of Object.entries(MAP)) {
  for (const f of files) {
    if (!fs.existsSync(path.join(ROOT, f))) fail(`${id} maps to missing file: ${f}`);
  }
}

// 2. Populate the linkage map from the mapping (source: reconstruct).
let links = 0;
for (const [id, files] of Object.entries(MAP)) {
  for (const f of files) {
    linkage.addLink(ROOT, id, f, { source: 'reconstruct' });
    links++;
  }
}

// 3. Derive status and regenerate the ledger.
const derived = requirements.derive(ROOT);
requirements.writeLedger(ROOT, derived);

// 4. Record PRD/ROADMAP completion and the deliverable summary in state.json.
const s = state.read(ROOT);
if (s) {
  const now = new Date().toISOString();
  s.tiers = s.tiers || {};
  s.tiers['tier-1'] = s.tiers['tier-1'] || {};
  s.tiers['tier-1'].prd = stableArtifactStep(s.tiers['tier-1'].prd, {
    status: 'done',
    artifact: 'prd/PRD.mdx',
    'artifact-hash': state.hashFile(path.join(ROOT, '.godpowers/prd/PRD.mdx'))
  }, now);
  s.tiers['tier-1'].roadmap = stableArtifactStep(s.tiers['tier-1'].roadmap, {
    status: 'done',
    artifact: 'roadmap/ROADMAP.mdx',
    'artifact-hash': state.hashFile(path.join(ROOT, '.godpowers/roadmap/ROADMAP.mdx'))
  }, now);
  s.deliverables = requirements.summarizeForState(derived, s.deliverables);
  const coveragePct = linkage.coverage(ROOT, declared);
  s.linkage = {
    ...(s.linkage || {}),
    'coverage-pct': coveragePct,
    'orphan-count': linkage.listOrphans(ROOT, declared).length,
    'drift-count': 0,
    'review-required-items': (s.linkage && s.linkage['review-required-items']) || 0
  };
  state.write(ROOT, s);
}

// 5. Report.
const sum = derived.summary;
console.log('Reconstructed Godpowers self-ledger:');
console.log(`  Requirements: ${sum.total} (${sum.done} done, ${sum.inProgress} in progress, ${sum.untouched} not started; ${sum.percent}%)`);
console.log(`  Increments:   ${sum.increments.done} done, ${sum.increments.building} building, ${sum.increments.pending} pending`);
console.log(`  Linkage:      ${links} links across ${declared.length} requirements (${Math.round(linkage.coverage(ROOT, declared) * 100)}% coverage)`);
console.log('  Ledger:       .godpowers/REQUIREMENTS.mdx');
console.log('  State:        .godpowers/state.json (tier-1 prd+roadmap done, deliverables cached)');
