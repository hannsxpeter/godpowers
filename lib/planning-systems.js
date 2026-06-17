/**
 * Planning System Migration
 *
 * Detects legacy planning, BMAD, and Superpowers project artifacts, converts their useful
 * signals into Godpowers preparation artifacts, and records source-system state
 * so /god-sync can later write progress back through lib/source-sync.js.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const state = require('./state');
const { exists } = require('./sync-fs');

const MAX_FILE_BYTES = 80 * 1024;
const MAX_SYSTEM_FILES = 80;
const TEXT_EXTENSIONS = new Set(['.md', '.mdx', '.txt', '.json', '.yaml', '.yml', '.toml']);
const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  '.next',
  '.turbo',
  '.cache',
  'coverage',
  'vendor'
]);

const GODPOWERS_ARTIFACTS = [
  {
    key: 'prd',
    tier: 'tier-1',
    subStep: 'prd',
    artifact: 'prd/PRD.md',
    title: 'Imported PRD Seed',
    sourceKinds: ['requirements', 'product', 'spec', 'story']
  },
  {
    key: 'arch',
    tier: 'tier-1',
    subStep: 'arch',
    artifact: 'arch/ARCH.md',
    title: 'Imported Architecture Seed',
    sourceKinds: ['architecture', 'technical', 'context']
  },
  {
    key: 'roadmap',
    tier: 'tier-1',
    subStep: 'roadmap',
    artifact: 'roadmap/ROADMAP.md',
    title: 'Imported Roadmap Seed',
    sourceKinds: ['roadmap', 'phase', 'epic', 'story', 'state', 'sprint']
  },
  {
    key: 'stack',
    tier: 'tier-1',
    subStep: 'stack',
    artifact: 'stack/DECISION.md',
    title: 'Imported Stack Seed',
    sourceKinds: ['stack', 'technical', 'config', 'context']
  },
  {
    key: 'build',
    tier: 'tier-2',
    subStep: 'build',
    artifact: 'build/STATE.md',
    title: 'Imported Build State Seed',
    sourceKinds: ['plan', 'summary', 'verification', 'review', 'uat', 'sprint']
  }
];

const SYSTEMS = {
  'legacy-planning': {
    displayName: 'legacy planning',
    markerPaths: ['.planning', '.legacy-planning', 'LEGACY-PLANNING.md'],
    fileRoots: ['.planning', '.legacy-planning'],
    standalonePatterns: [/^legacy-planning.*\.md$/i]
  },
  bmad: {
    displayName: 'BMAD',
    markerPaths: ['_bmad', '_bmad-output', '.bmad-core', 'bmad-core', '.bmad', 'BMAD.md'],
    fileRoots: ['_bmad-output', '.bmad', '.bmad-core', 'bmad-core', 'docs'],
    standalonePatterns: [/^BMAD\.md$/i]
  },
  superpowers: {
    displayName: 'Superpowers',
    markerPaths: ['docs/superpowers', '.superpowers', 'superpowers', 'SUPERPOWERS.md'],
    fileRoots: ['docs/superpowers', '.superpowers', 'superpowers'],
    standalonePatterns: [/^SUPERPOWERS\.md$/i]
  }
};

function rel(projectRoot, absPath) {
  return path.relative(projectRoot, absPath).split(path.sep).join('/');
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function hashFiles(projectRoot, files) {
  const h = crypto.createHash('sha256');
  for (const file of files.map((f) => f.path).sort()) {
    const full = path.join(projectRoot, file);
    h.update(file);
    if (fs.existsSync(full) && fs.lstatSync(full).isFile()) {
      h.update(fs.readFileSync(full));
    }
  }
  return `sha256:${h.digest('hex')}`;
}

function isTextFile(filePath) {
  return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function readText(projectRoot, relPath) {
  const full = path.join(projectRoot, relPath);
  if (!fs.existsSync(full)) return '';
  const stat = fs.lstatSync(full);
  if (!stat.isFile()) return '';
  const size = stat.size;
  const buffer = fs.readFileSync(full);
  const raw = buffer.slice(0, Math.min(size, MAX_FILE_BYTES)).toString('utf8');
  return raw.replace(/\r\n/g, '\n');
}

function walkFiles(rootDir, projectRoot, out = []) {
  if (!fs.existsSync(rootDir) || out.length >= MAX_SYSTEM_FILES) return out;
  const stat = fs.lstatSync(rootDir);
  if (stat.isSymbolicLink()) return out;
  if (stat.isFile()) {
    if (isTextFile(rootDir)) out.push(rel(projectRoot, rootDir));
    return out;
  }
  if (!stat.isDirectory()) return out;

  const entries = fs.readdirSync(rootDir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (out.length >= MAX_SYSTEM_FILES) break;
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(rootDir, entry.name);
    if (entry.isDirectory()) walkFiles(full, projectRoot, out);
    else if (entry.isFile() && isTextFile(full)) out.push(rel(projectRoot, full));
  }
  return out;
}

function classifyFile(filePath, content) {
  const lower = filePath.toLowerCase();
  const body = `${lower}\n${content.slice(0, 3000).toLowerCase()}`;
  const kinds = new Set();

  if (/requirements|requirement|prd|p-must|fr-|nfr|acceptance/.test(body)) kinds.add('requirements');
  if (/project\.md|product|persona|user|problem|outcome|brief|prfaq|spec/.test(body)) kinds.add('product');
  if (/roadmap|milestone|phase|backlog|dependency|depends on/.test(body)) kinds.add('roadmap');
  if (/epic|story|sprint|sprint-status/.test(body)) {
    kinds.add('story');
    kinds.add('sprint');
  }
  if (/architecture|adr|container|service|integration|api|database/.test(body)) kinds.add('architecture');
  if (/stack|framework|runtime|package|dependency|config/.test(body)) kinds.add('stack');
  if (/plan\.md|implementation plan|task|wave/.test(body)) kinds.add('plan');
  if (/summary|verification|review|uat|test/.test(body)) {
    if (/summary/.test(body)) kinds.add('summary');
    if (/verification/.test(body)) kinds.add('verification');
    if (/review/.test(body)) kinds.add('review');
    if (/uat|acceptance/.test(body)) kinds.add('uat');
  }
  if (/context|rules|conventions|preferences/.test(body)) kinds.add('context');
  if (/technical|research|security|risk/.test(body)) kinds.add('technical');
  if (/design|ux|ui|screen|component|interaction/.test(body)) kinds.add('spec');

  if (kinds.size === 0) kinds.add('context');
  return [...kinds].sort();
}

function extractSignals(content) {
  const lines = content.split('\n');
  const signals = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^#{1,3}\s+/.test(trimmed)) signals.push(trimmed.replace(/^#{1,3}\s+/, ''));
    if (/^[-*]\s+\[[ xX]\]/.test(trimmed)) signals.push(trimmed.replace(/^[-*]\s+/, ''));
    if (signals.length >= 8) break;
  }
  return signals;
}

function findStandaloneFiles(projectRoot, system) {
  const rootEntries = fs.existsSync(projectRoot)
    ? fs.readdirSync(projectRoot, { withFileTypes: true })
    : [];
  return rootEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => system.standalonePatterns.some((pattern) => pattern.test(name)));
}

function detectSystem(projectRoot, id, system) {
  const markerHits = [];
  for (const marker of system.markerPaths) {
    if (exists(projectRoot, marker)) markerHits.push(marker);
  }

  if (id === 'superpowers') {
    for (const skillRoot of ['.claude/skills', '.codex/skills']) {
      const full = path.join(projectRoot, skillRoot);
      if (!fs.existsSync(full)) continue;
      const names = fs.readdirSync(full).join('\n').toLowerCase();
      if (/superpowers|brainstorming|writing-plans|test-driven-development|subagent-driven-development/.test(names)) {
        markerHits.push(skillRoot);
      }
    }
  }

  const standalone = findStandaloneFiles(projectRoot, system);
  markerHits.push(...standalone);

  const files = [];
  for (const root of system.fileRoots) {
    const full = path.join(projectRoot, root);
    if (!fs.existsSync(full)) continue;
    walkFiles(full, projectRoot, files);
  }
  for (const file of standalone) files.push(file);

  const unique = [...new Set(files)].slice(0, MAX_SYSTEM_FILES);
  if (markerHits.length === 0 && unique.length === 0) return null;

  const fileRecords = unique.map((file) => {
    const content = readText(projectRoot, file);
    return {
      path: file,
      kinds: classifyFile(file, content),
      signals: extractSignals(content),
      bytes: Buffer.byteLength(content)
    };
  });

  const hasPrimaryRoot = markerHits.some((marker) => ['.planning', '.legacy-planning', '_bmad-output', 'docs/superpowers'].includes(marker));
  const score = markerHits.length * 3 + fileRecords.length;
  const confidence = score >= 10 || (hasPrimaryRoot && fileRecords.length >= 3)
    ? 'high'
    : (score >= 4 ? 'medium' : 'low');
  return {
    id,
    name: system.displayName,
    confidence,
    markers: markerHits.sort(),
    files: fileRecords,
    importHash: hashFiles(projectRoot, fileRecords)
  };
}

function detect(projectRoot) {
  const systems = [];
  for (const [id, system] of Object.entries(SYSTEMS)) {
    const detected = detectSystem(projectRoot, id, system);
    if (detected) systems.push(detected);
  }
  return {
    systems,
    detected: systems.length > 0
  };
}

function filesForKinds(system, kinds) {
  const wanted = new Set(kinds);
  return system.files.filter((file) => file.kinds.some((kind) => wanted.has(kind)));
}

function buildSourceLine(system, file) {
  const label = file.signals[0] ? `, signal: ${file.signals[0]}` : '';
  return `- [HYPOTHESIS] ${system.name} source ${file.path} maps to ${file.kinds.join(', ')}${label}.`;
}

function buildImportedContext(detection) {
  const lines = [];
  lines.push('# Imported Preparation Context');
  lines.push('');
  lines.push('> [DECISION] This artifact captures non-authoritative context imported from adjacent planning systems.');
  lines.push('> [DECISION] Godpowers artifacts remain the source of truth after they are created.');
  lines.push('');
  lines.push('## Sources Detected');
  lines.push('');

  if (detection.systems.length === 0) {
    lines.push('- [DECISION] No legacy planning, BMAD, or Superpowers planning context was detected.');
  }

  for (const system of detection.systems) {
    lines.push(`- [DECISION] Source system: ${system.name}.`);
    lines.push(`- [DECISION] Confidence: ${system.confidence}.`);
    lines.push(`- [DECISION] Import hash: ${system.importHash}.`);
    lines.push(`- [HYPOTHESIS] Detection markers: ${system.markers.length ? system.markers.join(', ') : 'content files only'}.`);
    const sampleFiles = system.files.slice(0, 10);
    for (const file of sampleFiles) lines.push(buildSourceLine(system, file));
    if (system.files.length > sampleFiles.length) {
      lines.push(`- [HYPOTHESIS] ${system.name} has ${system.files.length - sampleFiles.length} additional imported files omitted from this summary.`);
    }
  }

  lines.push('');
  lines.push('## Product Signals For PRD');
  lines.push('');
  appendKindSignals(lines, detection, ['requirements', 'product', 'spec'], 'PRD');
  lines.push('- [OPEN QUESTION] Confirm which imported product signals should become authoritative Godpowers requirements. Owner: user. Due: before /god-prd.');

  lines.push('');
  lines.push('## Delivery Signals For Roadmap');
  lines.push('');
  appendKindSignals(lines, detection, ['roadmap', 'phase', 'epic', 'story', 'sprint'], 'roadmap');
  lines.push('- [OPEN QUESTION] Confirm whether completed imported phases should be marked done, imported, or pending review. Owner: user. Due: before /god-roadmap.');

  lines.push('');
  lines.push('## Technical Signals For Architecture And Stack');
  lines.push('');
  appendKindSignals(lines, detection, ['architecture', 'technical', 'stack', 'config', 'context'], 'architecture and stack');
  lines.push('- [OPEN QUESTION] Confirm which imported technical decisions still apply after migration to Godpowers. Owner: user. Due: before /god-arch.');

  lines.push('');
  lines.push('## Sync-Back Policy');
  lines.push('');
  lines.push('- [DECISION] Godpowers may write managed sync-back summaries only inside Godpowers-owned fences or companion files.');
  lines.push('- [DECISION] Godpowers must not rewrite legacy planning, BMAD, or Superpowers source documents outside managed sync-back sections.');
  lines.push('- [DECISION] Sync-back exists so a project can return to the prior planning system with current Godpowers progress visible.');

  lines.push('');
  lines.push('## Use Rules');
  lines.push('');
  lines.push('- [DECISION] Godpowers agents may use this artifact as preparation context only.');
  lines.push('- [DECISION] This artifact must not override `.godpowers/intent.yaml`, `.godpowers/state.json`, `PROGRESS.md`, or any completed Godpowers artifact.');
  lines.push('- [DECISION] This artifact must not override native Pillars files under `agents/*.md`.');
  lines.push('- [DECISION] If imported context conflicts with user intent or a Godpowers artifact, the Godpowers artifact wins and the conflict becomes an open question.');
  lines.push('- [DECISION] PRD, architecture, roadmap, and stack agents should cite imported signals as `[HYPOTHESIS]` until confirmed by Godpowers artifacts or the user.');
  lines.push('');
  return lines.join('\n');
}

function appendKindSignals(lines, detection, kinds, destination) {
  let count = 0;
  for (const system of detection.systems) {
    for (const file of filesForKinds(system, kinds).slice(0, 8)) {
      const signal = file.signals[0] || `${file.path} contains ${file.kinds.join(', ')} context`;
      lines.push(`- [HYPOTHESIS] ${system.name} may inform ${destination}: ${signal}. Source: ${file.path}.`);
      count += 1;
    }
  }
  if (count === 0) {
    lines.push(`- [HYPOTHESIS] No imported ${destination} signal was detected.`);
  }
}

function buildSeedArtifact(detection, artifact) {
  const lines = [];
  lines.push(`# ${artifact.title}`);
  lines.push('');
  lines.push('- [DECISION] This artifact was generated from imported planning-system context.');
  lines.push('- [DECISION] Treat this artifact as a Godpowers seed until a specialist command validates or rewrites it.');
  lines.push('- [DECISION] Imported source files remain historical evidence, not Godpowers source of truth.');
  lines.push('');
  lines.push('## Imported Sources');
  lines.push('');

  let count = 0;
  for (const system of detection.systems) {
    for (const file of filesForKinds(system, artifact.sourceKinds).slice(0, 12)) {
      lines.push(`- [HYPOTHESIS] ${system.name} source ${file.path} may inform this artifact.`);
      for (const signal of file.signals.slice(0, 3)) {
        lines.push(`- [HYPOTHESIS] Imported signal from ${file.path}: ${signal}.`);
      }
      count += 1;
    }
  }

  if (count === 0) {
    lines.push('- [HYPOTHESIS] No direct source file mapped to this artifact.');
  }

  lines.push('');
  lines.push('## Migration Notes');
  lines.push('');
  lines.push('- [OPEN QUESTION] Review this seed before treating it as authoritative. Owner: user. Due: before dependent Godpowers work.');
  lines.push('- [DECISION] Run the matching Godpowers command to harden this seed into a full artifact.');
  lines.push('');
  return lines.join('\n');
}

function updateState(projectRoot, detection, writtenArtifacts, opts = {}) {
  let current = state.read(projectRoot);
  if (!current) {
    const projectName = path.basename(projectRoot);
    current = state.init(projectRoot, projectName);
  }

  const now = new Date().toISOString();
  current['source-systems'] = detection.systems.map((system) => ({
    id: system.id,
    name: system.name,
    confidence: system.confidence,
    markers: system.markers,
    files: system.files.map((file) => file.path),
    'import-hash': system.importHash,
    'imported-at': now,
    'sync-back-enabled': opts.syncBackEnabled !== false,
    'last-sync-back-hash': null,
    'conflict-count': 0
  }));

  for (const written of writtenArtifacts) {
    if (!current.tiers[written.tier]) current.tiers[written.tier] = {};
    current.tiers[written.tier][written.subStep] = {
      ...(current.tiers[written.tier][written.subStep] || {}),
      status: 'imported',
      artifact: written.artifact,
      'artifact-hash': state.hashFile(path.join(projectRoot, '.godpowers', written.artifact)),
      updated: now,
      notes: 'Imported from detected planning-system context.'
    };
  }

  state.write(projectRoot, current);
  return current;
}

function importPlanningContext(projectRoot, opts = {}) {
  const detection = opts.detection || detect(projectRoot);
  const prepDir = path.join(projectRoot, '.godpowers', 'prep');
  fs.mkdirSync(prepDir, { recursive: true });

  const importedContextPath = path.join(prepDir, 'IMPORTED-CONTEXT.md');
  const importedContext = buildImportedContext(detection);
  fs.writeFileSync(importedContextPath, importedContext);

  const writtenArtifacts = [];
  if (opts.writeSeeds !== false && detection.systems.length > 0) {
    for (const artifact of GODPOWERS_ARTIFACTS) {
      const target = path.join(projectRoot, '.godpowers', artifact.artifact);
      if (fs.existsSync(target) && opts.overwrite !== true) continue;
      const hasSources = detection.systems.some((system) => filesForKinds(system, artifact.sourceKinds).length > 0);
      if (!hasSources && opts.writeEmptySeeds !== true) continue;
      ensureDir(target);
      fs.writeFileSync(target, buildSeedArtifact(detection, artifact));
      writtenArtifacts.push(artifact);
    }
  }

  const nextState = updateState(projectRoot, detection, writtenArtifacts, opts);
  return {
    detection,
    importedContextPath: rel(projectRoot, importedContextPath),
    writtenArtifacts: writtenArtifacts.map((artifact) => artifact.artifact),
    state: nextState
  };
}

module.exports = {
  detect,
  importPlanningContext,
  buildImportedContext,
  buildSeedArtifact,
  SYSTEMS,
  GODPOWERS_ARTIFACTS,
  _private: {
    classifyFile,
    extractSignals,
    filesForKinds
  }
};
