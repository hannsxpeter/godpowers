/**
 * Shared tier artifact map for dashboard, gates, and documentation checks.
 */

const TIER_ARTIFACTS = {
  prd: [
    { path: '.godpowers/prd/PRD.md', required: true, lint: true }
  ],
  design: [
    { path: 'DESIGN.md', required: true, lint: true },
    { path: 'PRODUCT.md', required: false, lint: true },
    { path: '.godpowers/state.json', required: true, lint: false }
  ],
  arch: [
    { path: '.godpowers/arch/ARCH.md', required: true, lint: true }
  ],
  roadmap: [
    { path: '.godpowers/roadmap/ROADMAP.md', required: true, lint: true }
  ],
  stack: [
    { path: '.godpowers/stack/DECISION.md', required: true, lint: true }
  ],
  repo: [
    { path: '.godpowers/repo/AUDIT.md', required: true, lint: true }
  ],
  build: [
    { path: '.godpowers/state.json', required: true, lint: false }
  ],
  harden: [
    { path: '.godpowers/harden/FINDINGS.md', required: true, lint: true }
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
