/**
 * Design Detector
 *
 * Determines whether a project requires a DESIGN.md (i.e., has a UI surface).
 * Reads .godpowers/stack/DECISION.mdx and inspects package.json / pyproject.toml
 * / etc. for frontend frameworks.
 *
 * Public API:
 *   isUiProject(projectRoot) -> { required, frameworks, signals }
 *   isImpeccableInstalled(projectRoot) -> { installed, locations }
 */

const fs = require('fs');
const path = require('path');

const artifactMap = require('./artifact-map');
const syncFs = require('./sync-fs');

const FRONTEND_FRAMEWORKS = [
  // Web
  { name: 'react', signal: 'react' },
  { name: 'next.js', signal: 'next' },
  { name: 'nuxt', signal: 'nuxt' },
  { name: 'vue', signal: 'vue' },
  { name: 'svelte', signal: 'svelte' },
  { name: 'sveltekit', signal: '@sveltejs/kit' },
  { name: 'angular', signal: '@angular/core' },
  { name: 'remix', signal: '@remix-run' },
  { name: 'solid', signal: 'solid-js' },
  { name: 'solidstart', signal: '@solidjs/start' },
  { name: 'astro', signal: 'astro' },
  { name: 'qwik', signal: '@builder.io/qwik' },
  // Mobile
  { name: 'react-native', signal: 'react-native' },
  { name: 'flutter', signal: 'flutter' },
  { name: 'expo', signal: 'expo' },
  // Desktop
  { name: 'electron', signal: 'electron' },
  { name: 'tauri', signal: '@tauri-apps' },
  // CSS / Design libs (signal of UI work)
  { name: 'tailwindcss', signal: 'tailwindcss' },
  { name: 'styled-components', signal: 'styled-components' },
  { name: 'emotion', signal: '@emotion/react' },
  { name: 'shadcn', signal: 'class-variance-authority' },
  { name: 'mui', signal: '@mui/material' },
  { name: 'chakra', signal: '@chakra-ui/react' },
  { name: 'mantine', signal: '@mantine/core' }
];

/**
 * Detect frontend frameworks via package manifests.
 */
function detectFrameworks(projectRoot) {
  const detected = [];
  const pkgPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const fw of FRONTEND_FRAMEWORKS) {
        if (Object.keys(deps).some(d => d === fw.signal || d.startsWith(fw.signal + '/'))) {
          detected.push(fw.name);
        }
      }
    } catch (e) {
      // ignore JSON parse errors
    }
  }
  // Flutter via pubspec.yaml
  if (fs.existsSync(path.join(projectRoot, 'pubspec.yaml'))) {
    const content = fs.readFileSync(path.join(projectRoot, 'pubspec.yaml'), 'utf8');
    if (content.includes('flutter:')) detected.push('flutter');
  }
  // Native iOS/Android (heuristic)
  if (fs.existsSync(path.join(projectRoot, 'ios')) && fs.existsSync(path.join(projectRoot, 'android'))) {
    detected.push('mobile-native');
  }
  return [...new Set(detected)];
}

/**
 * Read the stack decision artifact and look for UI framework selections.
 */
function detectFromStack(projectRoot) {
  const stackRel = artifactMap.requiredArtifactsForTier('stack')[0].path;
  const raw = syncFs.readArtifactOrNull(projectRoot, stackRel);
  if (raw === null) return [];
  const content = raw.toLowerCase();
  const detected = [];
  for (const fw of FRONTEND_FRAMEWORKS) {
    if (content.includes(fw.name.toLowerCase()) || content.includes(fw.signal.toLowerCase())) {
      detected.push(fw.name);
    }
  }
  return [...new Set(detected)];
}

/**
 * Top-level detection: combines manifests + STACK.md + heuristic signals.
 */
function isUiProject(projectRoot) {
  const fromManifests = detectFrameworks(projectRoot);
  const fromStack = detectFromStack(projectRoot);
  const all = [...new Set([...fromManifests, ...fromStack])];
  const signals = [];
  if (fromManifests.length > 0) signals.push('package-manifests');
  if (fromStack.length > 0) signals.push('stack-decision');
  if (fs.existsSync(path.join(projectRoot, 'public'))) signals.push('public-dir');
  if (fs.existsSync(path.join(projectRoot, 'src/components'))) signals.push('src-components-dir');
  if (fs.existsSync(path.join(projectRoot, 'app'))) signals.push('app-dir');
  return {
    required: all.length > 0,
    frameworks: all,
    signals
  };
}

/**
 * Detect if impeccable is installed.
 * Checks: node_modules, .claude/skills, .cursor/skills, .gemini/skills, etc.
 */
function isImpeccableInstalled(projectRoot) {
  const locations = [];
  const candidates = [
    'node_modules/impeccable',
    'node_modules/@google/design.md',
    '.claude/skills/impeccable',
    '.cursor/skills/impeccable',
    '.gemini/skills/impeccable',
    '.opencode/skills/impeccable',
    '.kiro/skills/impeccable',
    '.qoder/skills/impeccable',
    '.rovodev/skills/impeccable',
    '.trae/skills/impeccable',
    '.trae-cn/skills/impeccable',
    '.agents/skills/impeccable',
    '.github/skills/impeccable'
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(projectRoot, c))) {
      locations.push(c);
    }
  }
  // Also check user-home installs
  const home = process.env.HOME || '';
  if (home) {
    const homeCandidates = [
      '.claude/skills/impeccable',
      '.cursor/skills/impeccable',
      '.gemini/skills/impeccable',
      '.agents/skills/impeccable'
    ];
    for (const c of homeCandidates) {
      if (fs.existsSync(path.join(home, c))) {
        locations.push(`~/${c}`);
      }
    }
  }
  return {
    installed: locations.length > 0,
    locations
  };
}

module.exports = {
  isUiProject,
  isImpeccableInstalled,
  detectFrameworks,
  detectFromStack,
  FRONTEND_FRAMEWORKS
};
