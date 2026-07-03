/**
 * Shared tier artifact map for dashboard, gates, and documentation checks.
 *
 * Scope: this owns the per-tier *gate artifacts* (which files a tier requires
 * and the state step it maps to). It is not a flat registry of every
 * `.godpowers/...` path: module-local artifacts (a sync module's log file, the
 * evidence ledger) live in their owning module, and `state.json` is named via
 * `state.STATE_FILE`.
 */

const TIER_ARTIFACTS = {
  prd: [
    { path: '.godpowers/prd/PRD.mdx', required: true, lint: true }
  ],
  design: [
    { path: 'DESIGN.md', required: true, lint: true },
    { path: 'PRODUCT.md', required: false, lint: true },
    { path: '.godpowers/state.json', required: true, lint: false }
  ],
  arch: [
    { path: '.godpowers/arch/ARCH.mdx', required: true, lint: true }
  ],
  roadmap: [
    { path: '.godpowers/roadmap/ROADMAP.mdx', required: true, lint: true }
  ],
  stack: [
    { path: '.godpowers/stack/DECISION.mdx', required: true, lint: true }
  ],
  repo: [
    { path: '.godpowers/repo/AUDIT.mdx', required: true, lint: true }
  ],
  build: [
    { path: '.godpowers/state.json', required: true, lint: false }
  ],
  harden: [
    { path: '.godpowers/harden/FINDINGS.mdx', required: true, lint: true }
  ]
};

const TIER_STATE_STEPS = {
  design: { tierKey: 'tier-1', subStepKey: 'design' },
  build: { tierKey: 'tier-2', subStepKey: 'build' },
  harden: { tierKey: 'tier-3', subStepKey: 'harden' }
};

function normalizeTier(tier) {
  if (!tier) return null;
  return String(tier).replace(/^\/?god-/, '').toLowerCase();
}

function tiers() {
  return Object.keys(TIER_ARTIFACTS);
}

function artifactsForTier(tier) {
  const key = normalizeTier(tier);
  if (!key || !TIER_ARTIFACTS[key]) return null;
  return TIER_ARTIFACTS[key].map((artifact) => ({ ...artifact }));
}

function requiredArtifactsForTier(tier) {
  const artifacts = artifactsForTier(tier);
  return artifacts ? artifacts.filter((artifact) => artifact.required) : null;
}

function stateStepForTier(tier) {
  const key = normalizeTier(tier);
  if (!key || !TIER_STATE_STEPS[key]) return null;
  return { ...TIER_STATE_STEPS[key] };
}

module.exports = {
  TIER_ARTIFACTS,
  normalizeTier,
  tiers,
  artifactsForTier,
  requiredArtifactsForTier,
  stateStepForTier
};
