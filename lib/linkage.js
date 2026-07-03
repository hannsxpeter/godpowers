/**
 * Linkage Map Manager
 *
 * Bidirectional linkage between artifact elements (PRD requirements,
 * ADRs, ARCH containers, ROADMAP milestones, STACK decisions, DESIGN
 * tokens/components) and code files.
 *
 * Storage:
 *   .godpowers/links/artifact-to-code.json   - forward map
 *   .godpowers/links/code-to-artifact.json   - reverse map
 *   .godpowers/links/link-sources.json       - source ownership map
 *   .godpowers/links/LINKAGE-LOG.mdx          - append-only history
 *
 * Stable ID format:
 *   PRD requirement:  P-{MUST,SHOULD,COULD}-NN  (e.g., P-MUST-01)
 *   ADR:              ADR-NNN
 *   ARCH container:   C-{slug}                  (e.g., C-auth-service)
 *   ROADMAP milestone: M-{slug}                 (e.g., M-launch-v1)
 *   STACK decision:   S-{slug}                  (e.g., S-postgres-15)
 *   DESIGN token:     YAML path                 (e.g., colors.primary)
 *   DESIGN component: D-{slug}                  (e.g., D-button-primary)
 *   Plan task:        GP-NNN                    (godplans PLAN.mdx)
 *   Plan requirement: R-{DOM}-N or R-N.N        (e.g., R-SEC-12, R-1.1)
 *   Audit check:      A-{DOM}-N                 (e.g., A-SEC-3)
 *   Audit finding:    F-{DOM}-N                 (e.g., F-SEC-1)
 *   Remediation task: GA-NNN                    (godaudits AUDIT.mdx)
 */

const fs = require('fs');
const path = require('path');
const atomic = require('./atomic-write');
const { DOMAIN_CODES } = require('./sibling-artifacts');

const SIBLING_DOMAINS = DOMAIN_CODES.join('|');

const ID_PATTERNS = {
  prd: /^P-(MUST|SHOULD|COULD)-\d+$/,
  adr: /^ADR-\d+$/,
  container: /^C-[\w-]+$/,
  milestone: /^M-[\w-]+$/,
  stack: /^S-[\w-]+$/,
  story: /^STORY-[\w-]+-\d+$/,
  design: /^D-[\w-]+$/,
  // Sibling superskill ids (godplans/godaudits), preserved verbatim by
  // imported seeds so plan/audit references participate in the linkage map.
  planTask: /^GP-\d+$/,
  planRequirement: new RegExp(`^R-(?:${SIBLING_DOMAINS})-\\d+$|^R-\\d+\\.\\d+$`),
  auditCheck: new RegExp(`^A-(?:${SIBLING_DOMAINS})-\\d+$`),
  auditFinding: new RegExp(`^F-(?:${SIBLING_DOMAINS})-\\d+$`),
  remediation: /^GA-\d+$/,
  token: /^[a-z][\w-]*\.[\w.-]+$/   // colors.primary, typography.display, etc.
};

function classifyId(id) {
  for (const [kind, regex] of Object.entries(ID_PATTERNS)) {
    if (regex.test(id)) return kind;
  }
  return 'unknown';
}

function linksDir(projectRoot) {
  return path.join(projectRoot, '.godpowers', 'links');
}

function forwardPath(projectRoot) {
  return path.join(linksDir(projectRoot), 'artifact-to-code.json');
}

function reversePath(projectRoot) {
  return path.join(linksDir(projectRoot), 'code-to-artifact.json');
}

function sourcePath(projectRoot) {
  return path.join(linksDir(projectRoot), 'link-sources.json');
}

function logPath(projectRoot) {
  return path.join(linksDir(projectRoot), 'LINKAGE-LOG.mdx');
}

function legacyLogPath(projectRoot) {
  return path.join(linksDir(projectRoot), 'LINKAGE-LOG.md');
}

function ensureDir(projectRoot) {
  const dir = linksDir(projectRoot);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readMap(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return {};
  }
}

function writeMap(filePath, data) {
  atomic.writeJsonAtomic(filePath, data);
}

function linkKey(artifactId, filePath) {
  return `${artifactId}\u0000${filePath}`;
}

function parseLinkKey(key) {
  const i = key.indexOf('\u0000');
  return { artifactId: key.slice(0, i), file: key.slice(i + 1) };
}

function readSources(projectRoot) {
  return readMap(sourcePath(projectRoot));
}

/**
 * Read forward map: artifact ID -> array of file paths.
 */
function readForward(projectRoot) {
  return readMap(forwardPath(projectRoot));
}

/**
 * Read reverse map: file path -> array of artifact IDs.
 */
function readReverse(projectRoot) {
  return readMap(reversePath(projectRoot));
}

/**
 * Add a link: artifact ID <-> file path. Bidirectional, idempotent.
 * Returns { added: bool, ... }.
 */
function addLink(projectRoot, artifactId, filePath, opts = {}) {
  ensureDir(projectRoot);
  const fwd = readForward(projectRoot);
  const rev = readReverse(projectRoot);

  const normFile = path.relative(projectRoot, path.resolve(projectRoot, filePath));
  if (!fwd[artifactId]) fwd[artifactId] = [];
  if (!rev[normFile]) rev[normFile] = [];

  const fwdHad = fwd[artifactId].includes(normFile);
  const revHad = rev[normFile].includes(artifactId);

  if (!fwdHad) fwd[artifactId].push(normFile);
  if (!revHad) rev[normFile].push(artifactId);

  fwd[artifactId].sort();
  rev[normFile].sort();

  const sources = readSources(projectRoot);
  const source = opts.source || 'manual';
  const key = linkKey(artifactId, normFile);
  if (!sources[key]) sources[key] = [];
  if (!sources[key].includes(source)) sources[key].push(source);
  sources[key].sort();

  writeMap(forwardPath(projectRoot), fwd);
  writeMap(reversePath(projectRoot), rev);
  writeMap(sourcePath(projectRoot), sources);

  if (!fwdHad || !revHad) {
    appendLog(projectRoot, `+ link: ${artifactId} <-> ${normFile}` + (opts.source ? ` (via ${opts.source})` : ''));
  }
  return { added: !fwdHad || !revHad, artifactId, file: normFile };
}

/**
 * Remove a link.
 */
function removeLink(projectRoot, artifactId, filePath) {
  ensureDir(projectRoot);
  const fwd = readForward(projectRoot);
  const rev = readReverse(projectRoot);
  const normFile = path.relative(projectRoot, path.resolve(projectRoot, filePath));

  let removed = false;
  if (fwd[artifactId]) {
    const before = fwd[artifactId].length;
    fwd[artifactId] = fwd[artifactId].filter(f => f !== normFile);
    if (fwd[artifactId].length === 0) delete fwd[artifactId];
    if (before !== (fwd[artifactId] ? fwd[artifactId].length : 0)) removed = true;
  }
  if (rev[normFile]) {
    const before = rev[normFile].length;
    rev[normFile] = rev[normFile].filter(id => id !== artifactId);
    if (rev[normFile].length === 0) delete rev[normFile];
    if (before !== (rev[normFile] ? rev[normFile].length : 0)) removed = true;
  }

  const sources = readSources(projectRoot);
  delete sources[linkKey(artifactId, normFile)];

  writeMap(forwardPath(projectRoot), fwd);
  writeMap(reversePath(projectRoot), rev);
  writeMap(sourcePath(projectRoot), sources);

  if (removed) {
    appendLog(projectRoot, `- link: ${artifactId} <-> ${normFile}`);
  }
  return { removed };
}

/**
 * Query: given an artifact ID, return linked files.
 */
function queryByArtifact(projectRoot, artifactId) {
  const fwd = readForward(projectRoot);
  return fwd[artifactId] || [];
}

/**
 * Query: given a file path, return linked artifact IDs.
 */
function queryByFile(projectRoot, filePath) {
  const rev = readReverse(projectRoot);
  const normFile = path.relative(projectRoot, path.resolve(projectRoot, filePath));
  return rev[normFile] || [];
}

/**
 * List orphan artifact IDs (no implementing file).
 * `knownIds` is an array of artifact IDs the user wants to check (typically
 * sourced by parsing PRD/ARCH/etc. for declared IDs).
 */
function listOrphans(projectRoot, knownIds) {
  const fwd = readForward(projectRoot);
  return knownIds.filter(id => !fwd[id] || fwd[id].length === 0);
}

/**
 * Compute coverage: percentage of known IDs that have at least one link.
 */
function coverage(projectRoot, knownIds) {
  if (knownIds.length === 0) return 1;
  const fwd = readForward(projectRoot);
  const linked = knownIds.filter(id => fwd[id] && fwd[id].length > 0).length;
  return linked / knownIds.length;
}

/**
 * Append to LINKAGE-LOG.mdx. A legacy LINKAGE-LOG.md is migrated once (its
 * history is carried into the canonical .mdx file) on the first append.
 */
function appendLog(projectRoot, message) {
  ensureDir(projectRoot);
  const ts = new Date().toISOString();
  const line = `${ts} ${message}\n`;
  const target = logPath(projectRoot);
  const legacy = legacyLogPath(projectRoot);
  if (!fs.existsSync(target) && fs.existsSync(legacy)) {
    fs.renameSync(legacy, target);
  }
  fs.appendFileSync(target, line);
}

/**
 * Replace all links from a source (used by code-scanner to do bulk updates).
 */
function bulkReplaceFromSource(projectRoot, source, links) {
  ensureDir(projectRoot);
  const fwd = readForward(projectRoot);
  const rev = readReverse(projectRoot);
  const sources = readSources(projectRoot);
  const desired = new Set();
  let removed = 0;
  let added = 0;

  for (const { artifactId, file } of links) {
    const normFile = path.relative(projectRoot, path.resolve(projectRoot, file));
    desired.add(linkKey(artifactId, normFile));
  }

  const knownSourceKeys = Object.keys(sources)
    .filter(key => Array.isArray(sources[key]) && sources[key].includes(source));
  const hasSourceMetadata = Object.keys(sources).length > 0;
  const replaceKeys = knownSourceKeys.length > 0
    ? knownSourceKeys
    : hasSourceMetadata
      ? []
    : Object.entries(fwd).flatMap(([artifactId, files]) =>
      files.map(file => linkKey(artifactId, file)));

  for (const key of replaceKeys) {
    if (desired.has(key)) continue;
    const { artifactId, file } = parseLinkKey(key);
    sources[key] = (sources[key] || []).filter(s => s !== source);
    if (sources[key] && sources[key].length > 0) continue;

    delete sources[key];
    if (fwd[artifactId]) {
      fwd[artifactId] = fwd[artifactId].filter(f => f !== file);
      if (fwd[artifactId].length === 0) delete fwd[artifactId];
    }
    if (rev[file]) {
      rev[file] = rev[file].filter(id => id !== artifactId);
      if (rev[file].length === 0) delete rev[file];
    }
    appendLog(projectRoot, `- link: ${artifactId} <-> ${file} (via ${source})`);
    removed++;
  }

  for (const { artifactId, file } of links) {
    const normFile = path.relative(projectRoot, path.resolve(projectRoot, file));
    const key = linkKey(artifactId, normFile);
    if (!fwd[artifactId]) fwd[artifactId] = [];
    if (!rev[normFile]) rev[normFile] = [];
    const hadLink = fwd[artifactId].includes(normFile) && rev[normFile].includes(artifactId);
    if (!fwd[artifactId].includes(normFile)) fwd[artifactId].push(normFile);
    if (!rev[normFile].includes(artifactId)) rev[normFile].push(artifactId);
    if (!sources[key]) sources[key] = [];
    if (!sources[key].includes(source)) sources[key].push(source);
    sources[key].sort();
    if (!hadLink) {
      appendLog(projectRoot, `+ link: ${artifactId} <-> ${normFile} (via ${source})`);
      added++;
    }
  }

  for (const files of Object.values(fwd)) files.sort();
  for (const ids of Object.values(rev)) ids.sort();

  writeMap(forwardPath(projectRoot), fwd);
  writeMap(reversePath(projectRoot), rev);
  writeMap(sourcePath(projectRoot), sources);

  return {
    count: links.length,
    added,
    removed
  };
}

function clearSourceMetadata(projectRoot) {
  ensureDir(projectRoot);
  const file = sourcePath(projectRoot);
  if (fs.existsSync(file)) {
    fs.rmSync(file, { force: true });
  }
}

module.exports = {
  classifyId,
  ID_PATTERNS,
  readForward,
  readReverse,
  addLink,
  removeLink,
  queryByArtifact,
  queryByFile,
  listOrphans,
  coverage,
  appendLog,
  bulkReplaceFromSource,
  clearSourceMetadata,
  forwardPath,
  reversePath,
  sourcePath,
  logPath,
  linksDir
};
