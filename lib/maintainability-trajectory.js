/**
 * Deterministic maintainability snapshots and report-only trajectory deltas.
 * Repository source is inspected as text. Local imports are never executed.
 */

// Implements: P-MUST-28

const crypto = require('crypto');
const path = require('path');

const {
  scanInventory,
  LANGUAGES,
  EXCLUSION_RULES
} = require('./style-stats');

const SNAPSHOT_SCHEMA_VERSION = 1;
const NORMALIZED_BLOCK_LINES = 3;
const SOURCE_EXTENSIONS = Object.freeze(Object.keys(LANGUAGES).sort());
const METRIC_NAMES = Object.freeze([
  'sourceLines',
  'sourceFiles',
  'functionCount',
  'functionLengthMedian',
  'functionLengthP90',
  'commentDensityPct',
  'markerCount',
  'duplicatedBlockCount',
  'dependencyEdgeCount',
  'dependencyCycleCount'
]);
const METRIC_DEFINITIONS = Object.freeze({
  sourceLines: 'non-comment source lines',
  sourceFiles: 'included source files',
  functionCount: 'detected function declarations',
  functionLengthMedian: 'median detected function length in lines',
  functionLengthP90: 'p90 detected function length in lines',
  commentDensityPct: 'comment lines as a percentage of nonblank lines',
  markerCount: 'TODO and FIXME occurrences in comment lines',
  duplicatedBlockCount: 'normalized three-line block occurrences after the first',
  dependencyEdgeCount: 'unique resolved static local dependency edges',
  dependencyCycleCount: 'cyclic strongly connected components in the static local dependency graph'
});

function compareNames(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}

function normalizeSourceLine(line) {
  const normalized = line.trim();
  if (!normalized) return null;
  return normalized.replace(/\s+/g, ' ');
}

function stripComments(content, extension) {
  const supportsSlashComments = extension !== '.py' && extension !== '.rb';
  const supportsHashComments = extension === '.py' || extension === '.rb' || extension === '.php';
  let result = '';
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const next = content[index + 1];
    if (lineComment) {
      if (character === '\n') {
        result += '\n';
        lineComment = false;
      }
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index += 1;
      } else if (character === '\n') {
        result += '\n';
      }
      continue;
    }
    if (quote) {
      result += character;
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      result += character;
      continue;
    }
    if (supportsSlashComments && character === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (supportsSlashComments && character === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (supportsHashComments && character === '#') {
      lineComment = true;
      continue;
    }
    result += character;
  }
  return result;
}

function recordNormalizedBlocks(content, occurrences) {
  const lines = content.split(/\r?\n/).map(normalizeSourceLine).filter(Boolean);
  let samples = 0;
  for (let index = 0; index <= lines.length - NORMALIZED_BLOCK_LINES; index += 1) {
    const block = lines.slice(index, index + NORMALIZED_BLOCK_LINES).join('\n');
    if (block.length < 20) continue;
    const hash = crypto.createHash('sha256').update(block).digest('hex');
    occurrences.set(hash, (occurrences.get(hash) || 0) + 1);
    samples += 1;
  }
  return samples;
}

function duplicatedBlockCount(occurrences) {
  let duplicated = 0;
  for (const count of occurrences.values()) {
    if (count > 1) duplicated += count - 1;
  }
  return duplicated;
}

function pythonRelativeSpecifier(value) {
  const match = value.match(/^(\.+)(.*)$/);
  if (!match) return value;
  const parentLevels = Math.max(0, match[1].length - 1);
  const prefix = parentLevels ? '../'.repeat(parentLevels) : './';
  return prefix + match[2].replace(/\./g, '/');
}

function extractLocalSpecifiers(extension, uncommentedContent) {
  const values = [];
  const patterns = [];
  if (['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx'].includes(extension)) {
    patterns.push(/\b(?:require|import)\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
    patterns.push(/\b(?:import|export)\s+(?:[^'"\n]+?\s+from\s+)?['"]([^'"]+)['"]/g);
  } else if (extension === '.py') {
    patterns.push(/^\s*from\s+(\.+[A-Za-z0-9_.]*)\s+import\s+/gm);
  } else if (extension === '.rb') {
    patterns.push(/\brequire_relative\s*\(?\s*['"]([^'"]+)['"]/g);
  } else if (extension === '.php') {
    patterns.push(/\b(?:require|require_once|include|include_once)\s*\(?\s*['"]([^'"]+)['"]/g);
  }

  for (const pattern of patterns) {
    for (const match of uncommentedContent.matchAll(pattern)) {
      let value = match[1];
      if (extension === '.py') value = pythonRelativeSpecifier(value);
      if (value.startsWith('.')) values.push(value);
    }
  }
  return [...new Set(values)].sort(compareNames);
}

function resolveLocalSpecifier(sourceFile, specifier, sourcePaths) {
  const base = path.resolve(path.dirname(sourceFile), specifier);
  const candidates = [];
  if (SOURCE_EXTENSIONS.includes(path.extname(base))) candidates.push(base);
  else {
    for (const extension of SOURCE_EXTENSIONS) candidates.push(base + extension);
    for (const extension of SOURCE_EXTENSIONS) candidates.push(path.join(base, `index${extension}`));
  }
  return candidates.find((candidate) => sourcePaths.has(candidate)) || null;
}

function createBoundedAnalyzer() {
  const sourcePaths = new Set();
  const specifiersBySource = new Map();
  const blockOccurrences = new Map();
  let blockSamples = 0;

  return {
    consume(source) {
      sourcePaths.add(source.absolutePath);
      const uncommented = stripComments(source.content, source.extension);
      blockSamples += recordNormalizedBlocks(uncommented, blockOccurrences);
      specifiersBySource.set(
        source.absolutePath,
        extractLocalSpecifiers(source.extension, uncommented)
      );
    },
    finish() {
      const graph = new Map([...sourcePaths].sort(compareNames).map((source) => [source, new Set()]));
      let edgeCount = 0;
      for (const source of [...specifiersBySource.keys()].sort(compareNames)) {
        for (const specifier of specifiersBySource.get(source)) {
          const target = resolveLocalSpecifier(source, specifier, sourcePaths);
          if (!target || graph.get(source).has(target)) continue;
          graph.get(source).add(target);
          edgeCount += 1;
        }
      }
      return {
        duplicatedBlocks: duplicatedBlockCount(blockOccurrences),
        blockSamples,
        graph,
        edgeCount,
        sourceCount: sourcePaths.size
      };
    }
  };
}

function countCyclicDependencyComponents(graph) {
  let nextIndex = 0;
  const indexes = new Map();
  const lowLinks = new Map();
  const stack = [];
  const stacked = new Set();
  let cyclicComponents = 0;

  function connect(node) {
    indexes.set(node, nextIndex);
    lowLinks.set(node, nextIndex);
    nextIndex += 1;
    stack.push(node);
    stacked.add(node);

    for (const target of graph.get(node) || []) {
      if (!indexes.has(target)) {
        connect(target);
        lowLinks.set(node, Math.min(lowLinks.get(node), lowLinks.get(target)));
      } else if (stacked.has(target)) {
        lowLinks.set(node, Math.min(lowLinks.get(node), indexes.get(target)));
      }
    }

    if (lowLinks.get(node) !== indexes.get(node)) return;
    const component = [];
    let current;
    do {
      current = stack.pop();
      stacked.delete(current);
      component.push(current);
    } while (current !== node);
    if (component.length > 1) cyclicComponents += 1;
    else if ((graph.get(node) || new Set()).has(node)) cyclicComponents += 1;
  }

  for (const node of [...graph.keys()].sort(compareNames)) {
    if (!indexes.has(node)) connect(node);
  }
  return cyclicComponents;
}

function orderedValues(values) {
  return Object.fromEntries(METRIC_NAMES.map((name) => [name, values[name]]));
}

function orderedDefinitions() {
  return Object.fromEntries(METRIC_NAMES.map((name) => [name, METRIC_DEFINITIONS[name]]));
}

function captureSnapshot(projectRoot, opts = {}) {
  const analyzer = createBoundedAnalyzer();
  const style = scanInventory(projectRoot, opts, (source) => analyzer.consume(source));
  const analysis = analyzer.finish();
  const totals = style.totals;
  const snapshot = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    exclusionRuleVersion: EXCLUSION_RULES.version,
    metricDefinitions: orderedDefinitions(),
    metrics: orderedValues({
      sourceLines: totals.sourceLines,
      sourceFiles: totals.sourceFiles,
      functionCount: totals.functionCount,
      functionLengthMedian: totals.functionLength.median || 0,
      functionLengthP90: totals.functionLength.p90 || 0,
      commentDensityPct: totals.commentDensityPct,
      markerCount: totals.todoFixmeMarkers,
      duplicatedBlockCount: analysis.duplicatedBlocks,
      dependencyEdgeCount: analysis.edgeCount,
      dependencyCycleCount: countCyclicDependencyComponents(analysis.graph)
    }),
    samples: orderedValues({
      sourceLines: totals.sourceFiles,
      sourceFiles: totals.sourceFiles,
      functionCount: totals.sourceFiles,
      functionLengthMedian: totals.functionLength.samples,
      functionLengthP90: totals.functionLength.samples,
      commentDensityPct: totals.commentDensitySamples,
      markerCount: totals.sourceFiles,
      duplicatedBlockCount: analysis.blockSamples,
      dependencyEdgeCount: analysis.sourceCount,
      dependencyCycleCount: analysis.graph.size
    }),
    scanEvidence: {
      skipped: style.skipped.map((entry) => ({ path: entry.path, reason: entry.reason })),
      truncated: style.truncated.map((entry) => ({ ...entry }))
    }
  };
  validateSnapshot(snapshot, 'captured');
  return deepFreeze(snapshot);
}

function sameKeys(record, expected) {
  return record && typeof record === 'object'
    && !Array.isArray(record)
    && Object.keys(record).length === expected.length
    && expected.every((name) => Object.prototype.hasOwnProperty.call(record, name));
}

function validateSnapshot(snapshot, label) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new Error(`${label} snapshot is incomplete`);
  }
  if (snapshot.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) {
    throw new Error(`${label} snapshot schema version is incompatible`);
  }
  if (snapshot.exclusionRuleVersion !== EXCLUSION_RULES.version) {
    throw new Error(`${label} snapshot exclusion-rule version is incompatible`);
  }
  if (!sameKeys(snapshot.metricDefinitions, METRIC_NAMES)) {
    throw new Error(`${label} snapshot metric definitions are incomplete`);
  }
  if (!sameKeys(snapshot.metrics, METRIC_NAMES)) {
    throw new Error(`${label} snapshot metric schema is incomplete`);
  }
  if (!sameKeys(snapshot.samples, METRIC_NAMES)) {
    const missing = METRIC_NAMES.find((name) => !(name in (snapshot.samples || {})));
    throw new Error(`${label} snapshot sample ${missing || 'schema'} is incomplete`);
  }
  for (const name of METRIC_NAMES) {
    if (snapshot.metricDefinitions[name] !== METRIC_DEFINITIONS[name]) {
      throw new Error(`${label} snapshot metric definition ${name} is incompatible`);
    }
    if (!Number.isFinite(snapshot.metrics[name]) || snapshot.metrics[name] < 0) {
      throw new Error(`${label} snapshot metric ${name} must be a nonnegative number`);
    }
    if (!Number.isInteger(snapshot.samples[name]) || snapshot.samples[name] < 0) {
      throw new Error(`${label} snapshot sample ${name} must be a nonnegative integer`);
    }
  }
  if (!snapshot.scanEvidence || !Array.isArray(snapshot.scanEvidence.skipped)
    || !Array.isArray(snapshot.scanEvidence.truncated)) {
    throw new Error(`${label} snapshot scan evidence is incomplete`);
  }
  for (const entry of snapshot.scanEvidence.skipped) {
    if (!entry || typeof entry.path !== 'string' || typeof entry.reason !== 'string') {
      throw new Error(`${label} snapshot skipped-file evidence is invalid`);
    }
  }
  for (const entry of snapshot.scanEvidence.truncated) {
    if (!entry || typeof entry.language !== 'string'
      || !Number.isInteger(entry.limit) || entry.limit <= 0
      || !Number.isInteger(entry.included) || entry.included < 0
      || !Number.isInteger(entry.omitted) || entry.omitted <= 0) {
      throw new Error(`${label} snapshot truncation evidence is invalid`);
    }
  }
}

function cloneSnapshot(snapshot, label) {
  validateSnapshot(snapshot, label);
  return deepFreeze({
    schemaVersion: snapshot.schemaVersion,
    exclusionRuleVersion: snapshot.exclusionRuleVersion,
    metricDefinitions: orderedDefinitions(),
    metrics: orderedValues(snapshot.metrics),
    samples: orderedValues(snapshot.samples),
    scanEvidence: {
      skipped: snapshot.scanEvidence.skipped.map((entry) => ({
        path: entry.path,
        reason: entry.reason
      })),
      truncated: snapshot.scanEvidence.truncated.map((entry) => ({
        language: entry.language,
        limit: entry.limit,
        included: entry.included,
        omitted: entry.omitted
      }))
    }
  });
}

function compareSnapshots(before, after) {
  const ownedBefore = cloneSnapshot(before, 'before');
  const ownedAfter = cloneSnapshot(after, 'after');
  if (ownedBefore.schemaVersion !== ownedAfter.schemaVersion) {
    throw new Error('snapshot schema versions do not match');
  }
  if (ownedBefore.exclusionRuleVersion !== ownedAfter.exclusionRuleVersion) {
    throw new Error('snapshot exclusion-rule versions do not match');
  }
  const deltas = orderedValues(Object.fromEntries(
    METRIC_NAMES.map((name) => {
      const difference = ownedAfter.metrics[name] - ownedBefore.metrics[name];
      return [name, Math.round(difference * 1000) / 1000];
    })
  ));
  return deepFreeze({
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    mode: 'report-only',
    canFailBuild: false,
    before: ownedBefore,
    after: ownedAfter,
    deltas
  });
}

function formatSigned(value) {
  return `${value >= 0 ? '+' : ''}${value}`;
}

function renderTrajectory(trajectory) {
  if (!trajectory || trajectory.mode !== 'report-only' || trajectory.canFailBuild !== false) {
    throw new Error('trajectory must be report-only');
  }
  const lines = [
    '# Maintainability Trajectory',
    '',
    'Report only: yes',
    'Can fail build: no',
    ''
  ];
  for (const name of METRIC_NAMES) {
    lines.push(
      `${name}: ${trajectory.before.metrics[name]} -> ${trajectory.after.metrics[name]} `
      + `(${formatSigned(trajectory.deltas[name])}, n=${trajectory.before.samples[name]} -> ${trajectory.after.samples[name]})`
    );
  }
  return `${lines.join('\n')}\n`;
}

function serializeSnapshot(snapshot) {
  const canonical = cloneSnapshot(snapshot, 'maintainability');
  return `${JSON.stringify(canonical, null, 2)}\n`;
}

module.exports = {
  snapshot: captureSnapshot,
  diff: compareSnapshots,
  render: renderTrajectory,
  captureSnapshot,
  compareSnapshots,
  renderTrajectory,
  serializeSnapshot,
  METRIC_NAMES,
  METRIC_DEFINITIONS
};
