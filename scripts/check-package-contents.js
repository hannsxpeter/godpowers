#!/usr/bin/env node
/**
 * Assert that the npm package contains the load-bearing Godpowers runtime
 * surface and excludes local-only development files.
 */

const { execFileSync } = require('child_process');
const path = require('path');

const REQUIRED_FILES = [
  'package.json',
  'README.md',
  'CHANGELOG.md',
  'RELEASE.md',
  'AGENTS.md',
  'SKILL.md',
  'LICENSE',
  'bin/install.js',
  'skills/god.md',
  'skills/god-mode.md',
  'agents/god-orchestrator.md',
  'agents/god-pm.md',
  'templates/DOMAIN-GLOSSARY.md',
  'templates/PRD.md',
  'references/HAVE-NOTS.md',
  'references/planning/PRD-ANATOMY.md',
  'lib/adoption-metrics.js',
  'lib/command-families.js',
  'lib/frontmatter.js',
  'lib/workflow-runner.js',
  'lib/workflow-helper-groups.js',
  'lib/artifact-linter.js',
  'lib/have-nots-validator.js',
  'lib/state.js',
  'lib/dogfood-runner.js',
  'lib/quick-proof.js',
  'lib/extension-authoring.js',
  'lib/feature-awareness.js',
  'lib/host-capabilities.js',
  'lib/code-intelligence.js',
  'lib/repo-doc-sync.js',
  'lib/repo-surface-sync.js',
  'lib/route-quality-sync.js',
  'lib/recipe-coverage-sync.js',
  'lib/release-surface-sync.js',
  'schema/workflow.v1.json',
  'routing/god-mode.yaml',
  'routing/god-dogfood.yaml',
  'routing/god-export-otel.yaml',
  'routing/god-extension-scaffold.yaml',
  'routing/recipes/extension-authoring.yaml',
  'fixtures/dogfood/half-migrated-planning/manifest.json',
  'fixtures/dogfood/host-full/manifest.json',
  'fixtures/dogfood/extension-authoring/manifest.json',
  'fixtures/dogfood/suite-release-dry-run/manifest.json',
  'fixtures/quick-proof/manifest.json',
  'fixtures/quick-proof/project/.godpowers/state.json',
  'routing/recipes/greenfield-with-ideation.yaml',
  'workflows/full-arc.yaml',
  'workflows/brownfield-arc.yaml',
  'extensions/security-pack/manifest.yaml'
];

const FORBIDDEN_PREFIXES = [
  '.github/',
  'docs/',
  'scripts/',
  'tests/',
  'examples/',
  'node_modules/'
];

const FORBIDDEN_FILES = [
  'package-lock.json'
];

function main() {
  const raw = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const packs = JSON.parse(raw);
  const pack = packs[0];
  if (!pack || !Array.isArray(pack.files)) {
    throw new Error('npm pack did not return a file list');
  }

  const files = new Set(pack.files.map(file => file.path));
  const missing = REQUIRED_FILES.filter(file => !files.has(file));
  const forbidden = [...files].filter(file =>
    file.endsWith('.tgz') ||
    FORBIDDEN_FILES.includes(file) ||
    FORBIDDEN_PREFIXES.some(prefix => file.startsWith(prefix))
  );

  if (pack.name !== 'godpowers') {
    throw new Error(`expected package name godpowers, got ${pack.name}`);
  }
  const nonSpecialistAgents = [...files].filter(file =>
    file.startsWith('agents/') && !/^agents\/god-.*\.md$/.test(file)
  );
  if (pack.entryCount < 400) {
    throw new Error(`expected at least 400 package entries, got ${pack.entryCount}`);
  }
  if (missing.length > 0) {
    throw new Error(`missing required package files:\n  - ${missing.join('\n  - ')}`);
  }
  if (forbidden.length > 0) {
    throw new Error(`package includes local-only files:\n  - ${forbidden.join('\n  - ')}`);
  }
  if (nonSpecialistAgents.length > 0) {
    throw new Error(`package includes non-specialist agent files:\n  - ${nonSpecialistAgents.join('\n  - ')}`);
  }

  console.log(`  + package contents verified: ${pack.entryCount} files`);
}

try {
  main();
} catch (error) {
  console.error(`  x package contents check failed: ${error.message}`);
  process.exit(1);
}
