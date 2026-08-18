/**
 * Style statistics: the measured layer of the style genome.
 *
 * `references/building/STYLE-GENOME.md` asks for numeric norms (comment density,
 * naming-casing histograms, function-length median and p90) and until now nothing
 * produced them, so `god-repo-scaffolder` would have had to estimate from a
 * handful of files and `god-quality-reviewer` judged style by eye. This counts.
 *
 * The measurement discipline comes from codedna (hannsxpeter/codedna). This is a
 * reimplementation for the Node runtime, not a copy of its Python helper, and
 * neither project imports the other. Port fixes by editing both.
 *
 * Numbers are evidence to interpret, not rules to paste. When a histogram and the
 * code disagree the code wins, which is why the report carries sample counts: a
 * casing split derived from four identifiers is noise, not a convention.
 *
 * Public API:
 *   scan(projectRoot, opts) -> aggregate style evidence from one bounded scan
 *   scanInventory(projectRoot, opts, onSourceFile) -> the same evidence while
 *     passing each included source body to a synchronous consumer exactly once
 *   classifyCasing(name) -> 'camelCase' | 'PascalCase' | ... | 'lower'
 *   EXCLUSION_RULES -> the immutable limits and directory exclusions shared by
 *     every source analyzer
 */

// Implements: P-MUST-28

const fs = require('fs');
const path = require('path');

const EXCLUSION_RULES = Object.freeze({
  version: 1,
  directoryNames: Object.freeze([
    '.git', 'node_modules', 'dist', 'build', 'out', 'target', 'vendor',
    'coverage', '.next', '.nuxt', '.svelte-kit', '.venv', 'venv', '__pycache__',
    '.godpowers', '.godaudits', '.godplans'
  ]),
  maxFileBytes: 1_000_000,
  maxFilesPerLanguage: 800,
  maxTraversalEntries: 10_000,
  maxTraversalDepth: 48
});

const IGNORED_DIRS = new Set(EXCLUSION_RULES.directoryNames);

// Extension to language, and per-language comment and function syntax. Kept to
// the languages godpowers actually routes for; an unlisted extension is skipped
// rather than guessed at, so an unfamiliar tree reports fewer languages instead
// of wrong numbers for one.
const LANGUAGES = {
  '.js': 'js', '.jsx': 'js', '.mjs': 'js', '.cjs': 'js',
  '.ts': 'ts', '.tsx': 'ts',
  '.py': 'py',
  '.go': 'go',
  '.rs': 'rs',
  '.rb': 'rb',
  '.java': 'java',
  '.swift': 'swift',
  '.php': 'php',
  '.cs': 'cs'
};

const LINE_COMMENT = {
  js: '//', ts: '//', go: '//', rs: '//', java: '//', swift: '//', cs: '//',
  php: '//', py: '#', rb: '#'
};

const FUNCTION_PATTERNS = {
  js: [/^\s*(?:export\s+)?(?:async\s+)?function\s+[A-Za-z_$]/, /^\s*(?:export\s+)?const\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?\(/],
  ts: [/^\s*(?:export\s+)?(?:async\s+)?function\s+[A-Za-z_$]/, /^\s*(?:export\s+)?const\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?\(/],
  py: [/^\s*(?:async\s+)?def\s+[A-Za-z_]/],
  go: [/^func\s+/],
  rs: [/^\s*(?:pub\s+)?(?:async\s+)?fn\s+/],
  rb: [/^\s*def\s+/],
  java: [/^\s*(?:public|private|protected)\s+[\w<>\[\], ]+\s+\w+\s*\(/],
  swift: [/^\s*(?:public|private|internal|fileprivate)?\s*func\s+/],
  cs: [/^\s*(?:public|private|protected|internal)\s+[\w<>\[\], ]+\s+\w+\s*\(/],
  php: [/^\s*(?:public|private|protected)?\s*function\s+/]
};

const MAX_FILE_BYTES = EXCLUSION_RULES.maxFileBytes;
const MAX_FILES_PER_LANGUAGE = EXCLUSION_RULES.maxFilesPerLanguage;

function classifyCasing(name) {
  if (/^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/.test(name)) return 'SCREAMING_SNAKE';
  if (/^[A-Z][A-Z0-9]*$/.test(name)) return 'UPPER';
  if (/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(name)) return 'snake_case';
  if (/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(name)) return 'kebab-case';
  if (/^[a-z][a-z0-9]*([A-Z][a-z0-9]*)+$/.test(name)) return 'camelCase';
  if (/^[A-Z][a-z0-9]*([A-Z][a-z0-9]*)*$/.test(name)) return 'PascalCase';
  if (/^[a-z][a-z0-9]*$/.test(name)) return 'lower';
  return 'other';
}

function percentile(sorted, fraction) {
  if (!sorted.length) return null;
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * fraction));
  return sorted[index];
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[middle];
  return Math.round(((sorted[middle - 1] + sorted[middle]) / 2) * 10) / 10;
}

function emptyLanguage() {
  return {
    files: 0,
    codeLines: 0,
    commentLines: 0,
    blankLines: 0,
    tabIndented: 0,
    spaceIndented: 0,
    quotes: { single: 0, double: 0, backtick: 0 },
    casing: {},
    identifierLengths: {},
    functionLengths: [],
    documentedFunctions: 0,
    markers: 0,
    todoFixmeMarkers: 0
  };
}

function mergeStats(target, source) {
  const scalarKeys = [
    'files', 'codeLines', 'commentLines', 'blankLines', 'tabIndented',
    'spaceIndented', 'documentedFunctions', 'markers', 'todoFixmeMarkers'
  ];
  for (const key of scalarKeys) target[key] += source[key];
  for (const key of Object.keys(target.quotes)) target.quotes[key] += source.quotes[key];
  for (const [kind, buckets] of Object.entries(source.casing)) {
    if (!target.casing[kind]) target.casing[kind] = {};
    for (const [name, count] of Object.entries(buckets)) {
      target.casing[kind][name] = (target.casing[kind][name] || 0) + count;
    }
  }
  for (const [kind, lengths] of Object.entries(source.identifierLengths)) {
    if (!target.identifierLengths[kind]) target.identifierLengths[kind] = [];
    target.identifierLengths[kind].push(...lengths);
  }
  target.functionLengths.push(...source.functionLengths);
}

function bump(bucket, key) {
  bucket[key] = (bucket[key] || 0) + 1;
}

function recordIdentifier(stats, kind, name) {
  if (!stats.casing[kind]) stats.casing[kind] = {};
  bump(stats.casing[kind], classifyCasing(name));
  if (!stats.identifierLengths[kind]) stats.identifierLengths[kind] = [];
  stats.identifierLengths[kind].push(name.length);
}

// One pass per file. Everything here is a heuristic over raw lines rather than a
// parse: a wrong number on a pathological file is acceptable, a dependency on a
// per-language parser is not.
function scanFile(content, language, stats) {
  const lines = content.split(/\r?\n/);
  const comment = LINE_COMMENT[language];
  const functionPatterns = FUNCTION_PATTERNS[language] || [];
  let openFunctionLine = null;
  let previousLineWasDoc = false;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      stats.blankLines += 1;
      return;
    }

    const isComment = trimmed.startsWith(comment)
      || trimmed.startsWith('/*') || trimmed.startsWith('*')
      || trimmed.startsWith('"""') || trimmed.startsWith("'''");
    if (isComment) {
      stats.commentLines += 1;
      if (/TODO|FIXME|HACK|XXX/.test(trimmed)) stats.markers += 1;
      stats.todoFixmeMarkers += (trimmed.match(/\b(?:TODO|FIXME)\b/g) || []).length;
      previousLineWasDoc = trimmed.startsWith('/**') || trimmed.startsWith('*')
        || trimmed.startsWith('"""') || trimmed.startsWith("'''");
      return;
    }

    stats.codeLines += 1;
    if (/^\t/.test(line)) stats.tabIndented += 1;
    else if (/^ {2,}/.test(line)) stats.spaceIndented += 1;

    stats.quotes.single += (line.match(/'/g) || []).length;
    stats.quotes.double += (line.match(/"/g) || []).length;
    stats.quotes.backtick += (line.match(/`/g) || []).length;

    const isFunction = functionPatterns.some((pattern) => pattern.test(line));
    if (isFunction) {
      if (openFunctionLine !== null) {
        stats.functionLengths.push(index - openFunctionLine);
      }
      openFunctionLine = index;
      if (previousLineWasDoc) stats.documentedFunctions += 1;
      const name = line.match(/(?:function|def|fn|func)\s+([A-Za-z_$][\w$]*)/)
        || line.match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)/);
      if (name) recordIdentifier(stats, 'function', name[1]);
    }

    for (const match of line.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) {
      const name = match[1];
      const kind = /^[A-Z][A-Z0-9_]*$/.test(name) ? 'constant' : 'variable';
      recordIdentifier(stats, kind, name);
    }
    for (const match of line.matchAll(/\b(?:class|interface|type|struct|enum)\s+([A-Za-z_$][\w$]*)/g)) {
      recordIdentifier(stats, 'type', match[1]);
    }

    previousLineWasDoc = false;
  });

  if (openFunctionLine !== null) {
    stats.functionLengths.push(lines.length - openFunctionLine);
  }
}

function relativePath(root, target) {
  const relative = path.relative(root, target).split(path.sep).join('/');
  return relative || '.';
}

function walk(root, dir, onFile, skipped, state = { entries: 0 }) {
  const relative = path.relative(root, dir);
  const depth = relative ? relative.split(path.sep).length : 0;
  if (depth > EXCLUSION_RULES.maxTraversalDepth) {
    throw new Error(`source traversal depth exceeds ${EXCLUSION_RULES.maxTraversalDepth}`);
  }
  let directory;
  try {
    directory = fs.opendirSync(dir);
  } catch (error) {
    skipped.push({ path: relativePath(root, dir), reason: error.code || 'unreadable' });
    return;
  }
  const entries = [];
  try {
    let entry;
    while ((entry = directory.readSync()) !== null) {
      state.entries += 1;
      if (state.entries > EXCLUSION_RULES.maxTraversalEntries) {
        throw new Error(`source inventory exceeds ${EXCLUSION_RULES.maxTraversalEntries} entries`);
      }
      entries.push(entry);
    }
  } finally {
    directory.closeSync();
  }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.') {
      if (IGNORED_DIRS.has(entry.name)) continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      walk(root, full, onFile, skipped, state);
    } else if (entry.isFile()) {
      onFile(full);
    }
  }
}

function validateInventoryRequest(projectRoot, opts) {
  const root = path.resolve(projectRoot || '.');
  let info;
  try {
    info = fs.statSync(root);
  } catch (error) {
    throw new Error(`project root is inaccessible: ${error.code || 'unreadable'}`);
  }
  if (!info.isDirectory()) throw new Error('project root must be a directory');
  try {
    fs.accessSync(root, fs.constants.R_OK | fs.constants.X_OK);
  } catch (error) {
    throw new Error(`project root is inaccessible: ${error.code || 'unreadable'}`);
  }
  if (!opts || typeof opts !== 'object' || Array.isArray(opts)) {
    throw new TypeError('scan options must be an object');
  }
  const suppliedCap = opts.maxFilesPerLanguage;
  if (suppliedCap !== undefined && (!Number.isInteger(suppliedCap) || suppliedCap <= 0)) {
    throw new TypeError('maxFilesPerLanguage must be a positive integer');
  }
  return { root, cap: suppliedCap || MAX_FILES_PER_LANGUAGE };
}

function summarize(stats) {
  const nonBlank = stats.codeLines + stats.commentLines;
  const sortedFunctions = [...stats.functionLengths].sort((a, b) => a - b);
  const casing = {};
  for (const [kind, buckets] of Object.entries(stats.casing)) {
    const total = Object.values(buckets).reduce((sum, n) => sum + n, 0);
    casing[kind] = {
      samples: total,
      dominant: Object.entries(buckets).sort((a, b) => b[1] - a[1])[0][0],
      distribution: Object.fromEntries(
        Object.entries(buckets)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => [name, Math.round((count / total) * 100)])
      )
    };
  }
  const identifierLengths = {};
  for (const [kind, lengths] of Object.entries(stats.identifierLengths)) {
    identifierLengths[kind] = { median: median(lengths), samples: lengths.length };
  }
  const quoteTotal = stats.quotes.single + stats.quotes.double + stats.quotes.backtick;
  return {
    files: stats.files,
    sourceFiles: stats.files,
    codeLines: stats.codeLines,
    sourceLines: stats.codeLines,
    commentLines: stats.commentLines,
    commentDensitySamples: nonBlank,
    commentDensityPct: nonBlank ? Math.round((stats.commentLines / nonBlank) * 1000) / 10 : 0,
    indentation: stats.tabIndented > stats.spaceIndented ? 'tabs' : 'spaces',
    indentSamples: { tabs: stats.tabIndented, spaces: stats.spaceIndented },
    quotes: quoteTotal
      ? Object.fromEntries(Object.entries(stats.quotes)
        .map(([name, count]) => [name, Math.round((count / quoteTotal) * 100)]))
      : { single: 0, double: 0, backtick: 0 },
    functionLength: {
      median: median(stats.functionLengths),
      p90: percentile(sortedFunctions, 0.9),
      samples: stats.functionLengths.length
    },
    functionCount: stats.functionLengths.length,
    docCoveragePct: stats.functionLengths.length
      ? Math.round((stats.documentedFunctions / stats.functionLengths.length) * 100)
      : 0,
    markers: stats.markers,
    todoFixmeMarkers: stats.todoFixmeMarkers,
    casing,
    identifierLengths
  };
}

/**
 * Scan a project tree and return per-language style statistics.
 *
 * opts.maxFilesPerLanguage caps work on large trees; the cap is reported rather
 * than applied silently, because a truncated sample that looks complete is the
 * measurement version of a doc that lies.
 */
function scanInventory(projectRoot, opts = {}, onSourceFile = null) {
  const { root, cap } = validateInventoryRequest(projectRoot, opts);
  if (onSourceFile !== null && typeof onSourceFile !== 'function') {
    throw new TypeError('source inventory consumer must be a function');
  }
  const languages = {};
  const totals = emptyLanguage();
  const skipped = [];
  const truncated = new Set();
  const omittedByLanguage = {};
  let files = 0;

  walk(root, root, (full) => {
    const language = LANGUAGES[path.extname(full)];
    if (!language) return;
    if (!languages[language]) languages[language] = emptyLanguage();
    const languageStats = languages[language];
    if (languageStats.files >= cap) {
      truncated.add(language);
      omittedByLanguage[language] = (omittedByLanguage[language] || 0) + 1;
      return;
    }
    let content;
    try {
      const info = fs.statSync(full);
      if (info.size > MAX_FILE_BYTES) {
        skipped.push({ path: relativePath(root, full), reason: 'too-large' });
        return;
      }
      content = fs.readFileSync(full, 'utf8');
    } catch (error) {
      skipped.push({ path: relativePath(root, full), reason: error.code || 'unreadable' });
      return;
    }
    const fileStats = emptyLanguage();
    fileStats.files = 1;
    files += 1;
    scanFile(content, language, fileStats);
    mergeStats(languageStats, fileStats);
    mergeStats(totals, fileStats);
    if (onSourceFile) {
      onSourceFile({
        absolutePath: full,
        relativePath: relativePath(root, full),
        extension: path.extname(full),
        language,
        content
      });
    }
  }, skipped);

  const summary = {};
  for (const [language, stats] of Object.entries(languages)) {
    summary[language] = summarize(stats);
    if (truncated.has(language)) summary[language].truncatedAt = cap;
  }
  const truncationEvidence = [...truncated].sort().map((language) => ({
    language,
    limit: cap,
    included: summary[language].sourceFiles,
    omitted: omittedByLanguage[language]
  }));
  return {
    languages: summary,
    totals: summarize(totals),
    files,
    skipped,
    truncated: truncationEvidence,
    exclusions: EXCLUSION_RULES
  };
}

function scan(projectRoot, opts = {}) {
  return scanInventory(projectRoot, opts, null);
}

module.exports = {
  scan,
  scanInventory,
  classifyCasing,
  LANGUAGES,
  EXCLUSION_RULES
};
