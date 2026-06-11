/**
 * Canonical Godpowers artifact paths.
 *
 * This module is the shared source for tier and command artifact paths used by
 * dashboards, gates, and documentation helpers.
 */

const DEFINITIONS = Object.freeze({
  prd: Object.freeze({
    key: 'prd',
    label: 'PRD',
    tier: 'tier-1',
    command: '/god-prd',
    primary: '.godpowers/prd/PRD.md',
    paths: Object.freeze(['.godpowers/prd/PRD.md'])
  }),
  design: Object.freeze({
    key: 'design',
    label: 'Design',
    tier: 'tier-1',
    command: '/god-design',
    primary: 'DESIGN.md',
    paths: Object.freeze(['DESIGN.md', 'PRODUCT.md', '.godpowers/design/STATE.md']),
    compatibilityPaths: Object.freeze(['.godpowers/design/DESIGN.md', '.godpowers/design/PRODUCT.md'])
  }),
  arch: Object.freeze({
    key: 'arch',
    label: 'Architecture',
    tier: 'tier-1',
    command: '/god-arch',
    primary: '.godpowers/arch/ARCH.md',
    paths: Object.freeze(['.godpowers/arch/ARCH.md'])
  }),
  roadmap: Object.freeze({
    key: 'roadmap',
    label: 'Roadmap',
    tier: 'tier-1',
    command: '/god-roadmap',
    primary: '.godpowers/roadmap/ROADMAP.md',
    paths: Object.freeze(['.godpowers/roadmap/ROADMAP.md'])
  }),
  stack: Object.freeze({
    key: 'stack',
    label: 'Stack',
    tier: 'tier-1',
    command: '/god-stack',
    primary: '.godpowers/stack/DECISION.md',
    paths: Object.freeze(['.godpowers/stack/DECISION.md'])
  }),
  repo: Object.freeze({
    key: 'repo',
    label: 'Repo',
    tier: 'tier-2',
    command: '/god-repo',
    primary: '.godpowers/repo/AUDIT.md',
    paths: Object.freeze(['.godpowers/repo/AUDIT.md'])
  }),
  build: Object.freeze({
    key: 'build',
    label: 'Build',
    tier: 'tier-2',
    command: '/god-build',
    primary: '.godpowers/build/STATE.md',
    paths: Object.freeze(['.godpowers/build/PLAN.md', '.godpowers/build/STATE.md'])
  }),
  deploy: Object.freeze({
    key: 'deploy',
    label: 'Deploy',
    tier: 'tier-3',
    command: '/god-deploy',
    primary: '.godpowers/deploy/STATE.md',
    paths: Object.freeze(['.godpowers/deploy/STATE.md'])
  }),
  observe: Object.freeze({
    key: 'observe',
    label: 'Observe',
    tier: 'tier-3',
    command: '/god-observe',
    primary: '.godpowers/observe/STATE.md',
    paths: Object.freeze(['.godpowers/observe/STATE.md'])
  }),
  harden: Object.freeze({
    key: 'harden',
    label: 'Harden',
    tier: 'tier-3',
    command: '/god-harden',
    primary: '.godpowers/harden/FINDINGS.md',
    paths: Object.freeze(['.godpowers/harden/FINDINGS.md'])
  }),
  launch: Object.freeze({
    key: 'launch',
    label: 'Launch',
    tier: 'tier-3',
    command: '/god-launch',
    primary: '.godpowers/launch/STATE.md',
    paths: Object.freeze(['.godpowers/launch/STATE.md'])
  })
});

const ORDER = Object.freeze([
  'prd',
  'design',
  'arch',
  'roadmap',
  'stack',
  'repo',
  'build',
  'deploy',
  'observe',
  'harden',
  'launch'
]);

function all() {
  return ORDER.map((key) => DEFINITIONS[key]);
}

function get(key) {
  return DEFINITIONS[key] || null;
}

function requireArtifact(key) {
  const definition = get(key);
  if (!definition) throw new Error(`Unknown Godpowers artifact key: ${key}`);
  return definition;
}

function primaryPath(key) {
  return requireArtifact(key).primary;
}

function paths(key, opts = {}) {
  const definition = requireArtifact(key);
  const base = [...definition.paths];
  if (opts.includeCompatibility && definition.compatibilityPaths) {
    return base.concat(definition.compatibilityPaths);
  }
  return base;
}

function byTier(tier) {
  return all().filter((definition) => definition.tier === tier);
}

module.exports = {
  ORDER,
  DEFINITIONS,
  all,
  get,
  requireArtifact,
  primaryPath,
  paths,
  byTier
};
