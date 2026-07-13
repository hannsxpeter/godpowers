/**
 * Planning System Migration
 *
 * Detects legacy planning, BMAD, Superpowers, godplans, and godaudits project
 * artifacts, converts their useful signals into Godpowers preparation
 * artifacts, and records source-system state so /god-sync can later write
 * progress back through lib/source-sync.js.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const state = require('./state');
const siblingArtifacts = require('./sibling-artifacts');
const {
  exists,
  existsArtifact,
  legacyTwin,
  write: writeProjectFile
} = require('./sync-fs');

const MAX_FILE_BYTES = 80 * 1024;
const MAX_CANONICAL_AUDIT_BYTES = 5 * 1024 * 1024;
const MAX_SYSTEM_FILES = 80;
const GODAUDITS_TODOS_PATH = '.godpowers/todos/TODOS.mdx';
const GODAUDITS_TODOS_BEGIN = '<!-- GODPOWERS:GODAUDITS-TODOS:BEGIN -->';
const GODAUDITS_TODOS_END = '<!-- GODPOWERS:GODAUDITS-TODOS:END -->';
const READ_NOFOLLOW = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0);
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
    artifact: 'prd/PRD.mdx',
    title: 'Imported PRD Seed',
    sourceKinds: ['requirements', 'product', 'spec', 'story']
  },
  {
    key: 'arch',
    tier: 'tier-1',
    subStep: 'arch',
    artifact: 'arch/ARCH.mdx',
    title: 'Imported Architecture Seed',
    sourceKinds: ['architecture', 'technical', 'context']
  },
  {
    key: 'roadmap',
    tier: 'tier-1',
    subStep: 'roadmap',
    artifact: 'roadmap/ROADMAP.mdx',
    title: 'Imported Roadmap Seed',
    sourceKinds: ['roadmap', 'phase', 'epic', 'story', 'state', 'sprint']
  },
  {
    key: 'stack',
    tier: 'tier-1',
    subStep: 'stack',
    artifact: 'stack/DECISION.mdx',
    title: 'Imported Stack Seed',
    sourceKinds: ['stack', 'technical', 'config', 'context']
  },
  {
    key: 'build',
    tier: 'tier-2',
    subStep: 'build',
    artifact: 'build/STATE.mdx',
    title: 'Imported Build State Seed',
    sourceKinds: ['plan', 'summary', 'verification', 'review', 'uat', 'sprint']
  },
  {
    key: 'harden',
    tier: 'tier-3',
    subStep: 'harden',
    artifact: 'harden/FINDINGS.mdx',
    title: 'Imported Audit Findings Seed',
    sourceKinds: ['audit']
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
  },
  godplans: {
    displayName: 'godplans',
    markerPaths: [siblingArtifacts.PLAN_PATH],
    fileRoots: ['.godplans'],
    standalonePatterns: []
  },
  godaudits: {
    displayName: 'godaudits',
    markerPaths: [
      siblingArtifacts.AUDIT_JSON_PATH,
      siblingArtifacts.AUDIT_REPORT_PATH,
      siblingArtifacts.AUDIT_LEGACY_PATH
    ],
    fileRoots: ['.godaudits'],
    standalonePatterns: []
  }
};

// Primary sibling superskill artifacts. Canonical JSON, generated reports,
// and legacy fallbacks are distinctive enough to force high confidence even
// when no other sibling files exist.
const SIBLING_PRIMARY_MARKERS = [
  siblingArtifacts.PLAN_PATH,
  siblingArtifacts.AUDIT_JSON_PATH,
  siblingArtifacts.AUDIT_REPORT_PATH,
  siblingArtifacts.AUDIT_LEGACY_PATH
];
const SIBLING_SYSTEM_IDS = new Set(['godplans', 'godaudits']);

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
      const fd = fs.openSync(full, READ_NOFOLLOW);
      const chunk = Buffer.allocUnsafe(64 * 1024);
      try {
        let bytesRead;
        do {
          bytesRead = fs.readSync(fd, chunk, 0, chunk.length, null);
          if (bytesRead > 0) h.update(chunk.subarray(0, bytesRead));
        } while (bytesRead > 0);
      } finally {
        fs.closeSync(fd);
      }
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
  const maxBytes = relPath === siblingArtifacts.AUDIT_JSON_PATH
    ? MAX_CANONICAL_AUDIT_BYTES
    : MAX_FILE_BYTES;
  const length = Math.min(size, maxBytes);
  const buffer = Buffer.allocUnsafe(length);
  const fd = fs.openSync(full, READ_NOFOLLOW);
  let bytesRead = 0;
  try {
    while (bytesRead < length) {
      const count = fs.readSync(fd, buffer, bytesRead, length - bytesRead, bytesRead);
      if (count === 0) break;
      bytesRead += count;
    }
  } finally {
    fs.closeSync(fd);
  }
  const raw = buffer.subarray(0, bytesRead).toString('utf8');
  return raw.replace(/\r\n/g, '\n');
}

function boundedImportedText(value, maxLength = 500) {
  return String(value == null ? '' : value)
    .replace(/\r?\n/g, ' ')
    .slice(0, maxLength);
}

function safeImportedText(value, maxLength = 500) {
  return boundedImportedText(value, maxLength)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;')
    .replace(/\[/g, '&#91;')
    .replace(/\]/g, '&#93;')
    .replace(/`/g, '&#96;');
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

const SIBLING_DOMAIN_ALTERNATION = siblingArtifacts.DOMAIN_CODES.join('|');
const RE_PLAN_REQUIREMENT_ID = new RegExp(`\\bR-(?:${SIBLING_DOMAIN_ALTERNATION})-\\d+\\b`);
const RE_AUDIT_CHECK_ID = new RegExp(`\\bA-(?:${SIBLING_DOMAIN_ALTERNATION})-\\d+\\b`);
const RE_AUDIT_FINDING_ID = /\bF-[A-Z]+-\d+\b/;
const RE_FINDING_HEADING = /^#### F-[A-Z]+-\d+ /m;

function classifyFile(filePath, content) {
  const lower = filePath.toLowerCase();
  const body = `${lower}\n${content.slice(0, 3000).toLowerCase()}`;
  const kinds = new Set();

  // Sibling superskill id grammars are case-sensitive, so they match against
  // the raw content rather than the lowercased keyword body.
  if (/\bGP-\d{3,}\b/.test(content) || RE_PLAN_REQUIREMENT_ID.test(content)) {
    kinds.add('plan');
    kinds.add('requirements');
    kinds.add('roadmap');
  }
  const isKnownAuditPath = [
    siblingArtifacts.AUDIT_JSON_PATH,
    siblingArtifacts.AUDIT_REPORT_PATH,
    siblingArtifacts.AUDIT_LEGACY_PATH
  ].map((candidate) => candidate.toLowerCase()).includes(lower);
  if (isKnownAuditPath || /\bGA-\d{3,}\b/.test(content) || RE_AUDIT_CHECK_ID.test(content) || RE_AUDIT_FINDING_ID.test(content) || RE_FINDING_HEADING.test(content)) {
    kinds.add('audit');
  }

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
  const trimmed = String(content || '').trim().replace(/^\uFEFF/, '');
  if (trimmed.startsWith('{')) {
    try {
      const audit = JSON.parse(trimmed);
      if (audit.schema_version !== '2.0') return [];
      const signals = [];
      for (const finding of Array.isArray(audit.findings) ? audit.findings : []) {
        if (!finding || !finding.id || !['open', 'accepted-risk'].includes(finding.status)) continue;
        signals.push(`${finding.id} ${boundedImportedText(finding.title || 'Untitled finding')} [${boundedImportedText(finding.severity || 'unknown')} | ${boundedImportedText(finding.status)}]`);
        if (signals.length >= 4) break;
      }
      for (const task of Array.isArray(audit.tasks) ? audit.tasks : []) {
        if (!task || !task.id || task.status !== 'open') continue;
        const verify = task.verify ? ` Verify: ${boundedImportedText(task.verify, 1000)}` : '';
        signals.push(`${task.id} ${boundedImportedText(task.title || 'Untitled remediation task')}.${verify}`);
        if (signals.length >= 8) break;
      }
      if (signals.length > 0) return signals;
    } catch (err) {
      // Fall through to text extraction for malformed or non-audit JSON.
    }
  }
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

  let unique = [...new Set(files)].slice(0, MAX_SYSTEM_FILES);
  if (id === 'godaudits') {
    const canonical = [
      siblingArtifacts.AUDIT_JSON_PATH,
      siblingArtifacts.AUDIT_REPORT_PATH,
      siblingArtifacts.AUDIT_LEGACY_PATH
    ].find((candidate) => exists(projectRoot, candidate));
    if (canonical) unique = [canonical];
  }
  if (markerHits.length === 0 && unique.length === 0) return null;

  const fileRecords = unique.map((file) => {
    const content = readText(projectRoot, file);
    const canonicalAudit = id === 'godaudits' && file === siblingArtifacts.AUDIT_JSON_PATH
      ? siblingArtifacts.parseAudit(content, file)
      : null;
    const kinds = classifyFile(file, content);
    if (canonicalAudit && canonicalAudit.parseError) {
      const auditIndex = kinds.indexOf('audit');
      if (auditIndex !== -1) kinds.splice(auditIndex, 1);
      if (!kinds.includes('context')) kinds.push('context');
      kinds.sort();
    }
    return {
      path: file,
      kinds,
      signals: canonicalAudit && canonicalAudit.parseError ? [] : extractSignals(content),
      bytes: Buffer.byteLength(content),
      parseError: canonicalAudit ? canonicalAudit.parseError : null
    };
  });

  const hasPrimaryRoot = markerHits.some((marker) => ['.planning', '.legacy-planning', '_bmad-output', 'docs/superpowers'].includes(marker));
  const hasSiblingPrimary = markerHits.some((marker) => SIBLING_PRIMARY_MARKERS.includes(marker));
  const score = markerHits.length * 3 + fileRecords.length;
  const confidence = hasSiblingPrimary || score >= 10 || (hasPrimaryRoot && fileRecords.length >= 3)
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

// Sibling superskill files are authored, machine-checked artifacts, so
// plan-stated facts they carry (task lines, requirement ids, headings) are
// [DECISION]-grade; claims inferred from them stay [HYPOTHESIS].
function signalGrade(systemId) {
  return SIBLING_SYSTEM_IDS.has(systemId) ? '[DECISION]' : '[HYPOTHESIS]';
}

function buildSourceLine(system, file) {
  const label = file.signals[0] ? `, signal: ${safeImportedText(file.signals[0], 1500)}` : '';
  return `- ${signalGrade(system.id)} ${safeImportedText(system.name)} source ${safeImportedText(file.path)} maps to ${file.kinds.join(', ')}${label}.`;
}

function buildImportedContext(detection, projectRoot) {
  const lines = [];
  lines.push('# Imported Preparation Context');
  lines.push('');
  lines.push('> [DECISION] This artifact captures non-authoritative context imported from adjacent planning systems.');
  lines.push('> [DECISION] Godpowers artifacts remain the source of truth after they are created.');
  lines.push('');
  lines.push('## Sources Detected');
  lines.push('');

  if (detection.systems.length === 0) {
    lines.push('- [DECISION] No legacy planning, BMAD, Superpowers, godplans, or godaudits planning context was detected.');
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

  // Executable-plan and audit signals from the sibling superskill artifacts.
  // godaudits 2.x reads canonical AUDIT.json; legacy MDX is a fallback.
  if (projectRoot) {
    lines.push('');
    lines.push(siblingArtifacts.summarize(projectRoot));
  }

  lines.push('');
  lines.push('## Sync-Back Policy');
  lines.push('');
  lines.push('- [DECISION] Godpowers may write managed sync-back summaries only inside Godpowers-owned fences or companion files.');
  lines.push('- [DECISION] Godpowers must not rewrite legacy planning, BMAD, Superpowers, godplans, or godaudits source documents outside managed sync-back sections.');
  lines.push('- [DECISION] Sync-back exists so a project can return to the prior planning system with current Godpowers progress visible.');

  lines.push('');
  lines.push('## Use Rules');
  lines.push('');
  lines.push('- [DECISION] Godpowers agents may use this artifact as preparation context only.');
  lines.push('- [DECISION] This artifact must not override `.godpowers/intent.yaml`, `.godpowers/state.json`, `PROGRESS.mdx`, or any completed Godpowers artifact.');
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
      lines.push(`- [HYPOTHESIS] ${safeImportedText(system.name)} may inform ${destination}: ${safeImportedText(signal, 1500)}. Source: ${safeImportedText(file.path)}.`);
      count += 1;
    }
  }
  if (count === 0) {
    lines.push(`- [HYPOTHESIS] No imported ${destination} signal was detected.`);
  }
}

// Sibling superskill ids referenced in extracted signal lines.
const SIBLING_ID_SIGNAL_RE = /\b(?:GP|GA)-\d+\b|\b[RAF]-[A-Z]+-\d+\b|\bR-\d+\.\d+\b/;

// Sibling files are heading-heavy, so a plain slice(0, 3) would drop the
// id-bearing task lines that seeds must preserve verbatim; float those to
// the front and allow a slightly deeper slice for sibling systems.
function seedSignals(system, file) {
  if (!SIBLING_SYSTEM_IDS.has(system.id)) return file.signals.slice(0, 3);
  const idBearing = file.signals.filter((signal) => SIBLING_ID_SIGNAL_RE.test(signal));
  const rest = file.signals.filter((signal) => !SIBLING_ID_SIGNAL_RE.test(signal));
  return [...idBearing, ...rest].slice(0, 6);
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
    const grade = signalGrade(system.id);
    for (const file of filesForKinds(system, artifact.sourceKinds).slice(0, 12)) {
      lines.push(`- [HYPOTHESIS] ${safeImportedText(system.name)} source ${safeImportedText(file.path)} may inform this artifact.`);
      // Preserve GP-/GA-/R- ids for linkage while escaping authored text for
      // safe embedding in a generated MDX artifact.
      for (const signal of seedSignals(system, file)) {
        lines.push(`- ${grade} Imported signal from ${safeImportedText(file.path)}: ${safeImportedText(signal, 1500)}.`);
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

function buildGodauditsTodoSection(tasks) {
  const lines = [
    GODAUDITS_TODOS_BEGIN,
    '## Imported Godaudits Remediation',
    ''
  ];
  if (tasks.length === 0) {
    lines.push('- [DECISION] Canonical godaudits state has no open GA remediation tasks.');
  }
  for (const task of tasks) {
    const fixes = task.fixes.length ? task.fixes.join(', ') : 'final audit gate';
    const verify = task.verify ? `; verify: ${safeImportedText(task.verify, 1000)}` : '';
    lines.push(`- [ ] [${task.priority}] [DECISION] ${safeImportedText(task.id)} ${safeImportedText(task.title)} (source: ${safeImportedText(task.source)}; fixes: ${safeImportedText(fixes, 1000)}${verify})`);
  }
  lines.push('', GODAUDITS_TODOS_END);
  return lines.join('\n');
}

function writeGodauditsTodos(projectRoot, detection) {
  if (!detection.systems.some((system) => system.id === 'godaudits')) {
    return { written: false, reason: 'godaudits-not-detected', path: null, openCount: 0 };
  }
  const loaded = siblingArtifacts.loadAudit(projectRoot);
  if (!loaded || loaded.audit.parseError) {
    return { written: false, reason: 'godaudits-state-unreadable', path: null, openCount: 0 };
  }

  const target = path.join(projectRoot, GODAUDITS_TODOS_PATH);
  const existing = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  const begin = existing.indexOf(GODAUDITS_TODOS_BEGIN);
  const end = existing.indexOf(GODAUDITS_TODOS_END);
  if ((begin === -1) !== (end === -1) || (begin !== -1 && end < begin)) {
    return { written: false, reason: 'managed-section-corrupt', path: GODAUDITS_TODOS_PATH, openCount: 0 };
  }

  const tasks = siblingArtifacts.remediationTasks(projectRoot);
  if (tasks.length === 0 && begin === -1) {
    return { written: false, reason: 'no-open-tasks', path: null, openCount: 0 };
  }
  const section = buildGodauditsTodoSection(tasks);
  let next;
  if (begin !== -1) {
    next = `${existing.slice(0, begin)}${section}${existing.slice(end + GODAUDITS_TODOS_END.length)}`;
  } else {
    const prefix = existing || '# Todos';
    const separator = prefix.endsWith('\n\n') ? '' : (prefix.endsWith('\n') ? '\n' : '\n\n');
    next = `${prefix}${separator}${section}\n`;
  }
  if (next === existing) {
    return { written: false, reason: 'unchanged', path: GODAUDITS_TODOS_PATH, openCount: tasks.length };
  }
  ensureDir(target);
  writeProjectFile(projectRoot, GODAUDITS_TODOS_PATH, next);
  return { written: true, reason: null, path: GODAUDITS_TODOS_PATH, openCount: tasks.length };
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

  const importedContextRel = '.godpowers/prep/IMPORTED-CONTEXT.mdx';
  const importedContextPath = path.join(projectRoot, importedContextRel);
  const importedContext = buildImportedContext(detection, projectRoot);
  fs.writeFileSync(importedContextPath, importedContext);
  // Generated file: absorb a legacy .md twin so old projects do not keep two
  // diverging imported-context files. Content is fully regenerated above.
  const legacyImported = legacyTwin(importedContextRel);
  if (legacyImported && exists(projectRoot, legacyImported)) {
    fs.rmSync(path.join(projectRoot, legacyImported), { force: true });
  }

  const writtenArtifacts = [];
  if (opts.writeSeeds !== false && detection.systems.length > 0) {
    for (const artifact of GODPOWERS_ARTIFACTS) {
      const target = path.join(projectRoot, '.godpowers', artifact.artifact);
      // An existing legacy .md seed counts as "exists"; never fork a .mdx twin
      // next to a hand-edited legacy artifact.
      if (existsArtifact(projectRoot, `.godpowers/${artifact.artifact}`) && opts.overwrite !== true) continue;
      const hasSources = detection.systems.some((system) => filesForKinds(system, artifact.sourceKinds).length > 0);
      if (!hasSources && opts.writeEmptySeeds !== true) continue;
      ensureDir(target);
      fs.writeFileSync(target, buildSeedArtifact(detection, artifact));
      writtenArtifacts.push(artifact);
    }
  }

  const remediationTodos = opts.writeRemediationTodos === false
    ? { written: false, reason: 'disabled', path: null, openCount: 0 }
    : writeGodauditsTodos(projectRoot, detection);

  const nextState = updateState(projectRoot, detection, writtenArtifacts, opts);
  return {
    detection,
    importedContextPath: rel(projectRoot, importedContextPath),
    writtenArtifacts: writtenArtifacts.map((artifact) => artifact.artifact),
    remediationTodos,
    state: nextState
  };
}

module.exports = {
  detect,
  importPlanningContext,
  buildImportedContext,
  buildSeedArtifact,
  writeGodauditsTodos,
  SYSTEMS,
  GODPOWERS_ARTIFACTS,
  _private: {
    classifyFile,
    extractSignals,
    safeImportedText,
    buildGodauditsTodoSection,
    filesForKinds
  }
};
