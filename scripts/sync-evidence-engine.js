#!/usr/bin/env node
/**
 * Re-sync the vendored evidence engine from upstream Mythify.
 *
 * lib/evidence.js is vendored from mythify-mcp (mcp-server/src/index.js, the
 * verify_run / verify_claim tools). This script re-pulls the upstream engine,
 * re-states the recorded adaptations, and flags any upstream record-shape change
 * for human review so the vendored copy never drifts silently.
 *
 * It does NOT auto-rewrite lib/evidence.js. Engine logic is hand-vendored once;
 * this script is the drift detector that tells a human when an upstream change
 * needs to be folded back in.
 *
 * Usage:
 *   node scripts/sync-evidence-engine.js [--source=<path to upstream index.js>] [--write] [--json]
 *
 * Source resolution order:
 *   1. --source=<path>
 *   2. MYTHIFY_SRC environment variable
 *   3. provenance.localSource (if recorded)
 *   4. ../mythify/mcp-server/src/index.js relative to this repo
 *
 * Exit code is non-zero when the upstream record shape changed (and --write was
 * not given), when an adaptation is missing from lib/evidence.js, or when the
 * upstream source cannot be found.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const atomic = require('../lib/atomic-write');

const ROOT = path.resolve(__dirname, '..');
const PROVENANCE_PATH = path.join(ROOT, 'lib', 'evidence', '.provenance.json');
const EVIDENCE_PATH = path.join(ROOT, 'lib', 'evidence.js');

function loadProvenance() {
  return JSON.parse(fs.readFileSync(PROVENANCE_PATH, 'utf8'));
}

function resolveUpstream(opts = {}) {
  const candidates = [
    opts.source,
    process.env.MYTHIFY_SRC,
    opts.provenance && opts.provenance.localSource,
    path.join(ROOT, '..', 'mythify', 'mcp-server', 'src', 'index.js')
  ].filter(Boolean);
  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (fs.existsSync(resolved)) return resolved;
  }
  return null;
}

function dedupe(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

/**
 * Extract the keys of a function's returned object literals. Used to expand a
 * `...spreadFn()` inside a record literal back into its contributed keys.
 */
function extractContextKeys(source, fnName) {
  const fnMatch = source.match(new RegExp(`function ${fnName}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!fnMatch) return [];
  const body = fnMatch[1];
  const keys = [];
  for (const line of body.split('\n')) {
    const km = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/);
    if (km) keys.push(km[1]);
  }
  return dedupe(keys);
}

/**
 * Extract the top-level key set of the executed and attested record literals.
 * Spreads such as `...verificationStepContext()` are expanded to their keys.
 */
function extractRecordShape(source) {
  const shape = {};
  const blockRegex = /const record = \{([\s\S]*?)\n\s*\};/g;
  let match;
  while ((match = blockRegex.exec(source)) !== null) {
    const body = match[1];
    const kindMatch = body.match(/kind:\s*"([a-z]+)"/);
    if (!kindMatch) continue;
    const kind = kindMatch[1];
    const keys = [];
    for (const line of body.split('\n')) {
      const spread = line.match(/^\s*\.\.\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
      if (spread) {
        keys.push(...extractContextKeys(source, spread[1]));
        continue;
      }
      const km = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*[:,]/);
      if (km) keys.push(km[1]);
    }
    shape[kind] = dedupe(keys);
  }
  return shape;
}

function diffShapes(expected, actual) {
  const expectedSet = new Set(expected || []);
  const actualSet = new Set(actual || []);
  const added = (actual || []).filter((key) => !expectedSet.has(key));
  const removed = (expected || []).filter((key) => !actualSet.has(key));
  return { added, removed, changed: added.length > 0 || removed.length > 0 };
}

function stripComments(source) {
  return String(source)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

/**
 * Verify the recorded adaptations are still present in the vendored module.
 * Comments are stripped first: a header comment may legitimately mention the
 * upstream paths while explaining the rebinding. We only flag drift in code.
 * Returns an array of problem strings (empty when every adaptation holds).
 */
function checkLocalAdaptations(rawSource) {
  const localSource = stripComments(rawSource);
  const problems = [];
  if (/\.mythify\//.test(localSource)) {
    problems.push('lib/evidence.js still references the upstream .mythify/ state dir');
  }
  if (!localSource.includes('.godpowers')) {
    problems.push('lib/evidence.js does not write under .godpowers/ledger/');
  }
  if (!/ledger/.test(localSource)) {
    problems.push('lib/evidence.js does not reference the ledger directory');
  }
  if (!/substep/.test(localSource)) {
    problems.push('lib/evidence.js does not rebind step context to substep');
  }
  if (!/atomic/.test(localSource)) {
    problems.push('lib/evidence.js does not append the ledger via lib/atomic-write.js');
  }
  return problems;
}

function readUpstreamVersion(upstreamPath) {
  let version = null;
  let commit = null;
  try {
    const source = fs.readFileSync(upstreamPath, 'utf8');
    const vm = source.match(/const VERSION = "([^"]+)"/);
    if (vm) version = vm[1];
  } catch (_) {
    version = null;
  }
  const repoRoot = path.resolve(path.dirname(upstreamPath), '..', '..');
  const git = spawnSync('git', ['-C', repoRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  if (git.status === 0 && git.stdout) commit = git.stdout.trim();
  return { version, commit };
}

function parseArgs(argv) {
  const opts = { source: null, write: false, json: false };
  for (const arg of argv.slice(2)) {
    if (arg === '--write') opts.write = true;
    else if (arg === '--json') opts.json = true;
    else if (arg.startsWith('--source=')) opts.source = arg.slice('--source='.length);
  }
  return opts;
}

function buildReport(opts) {
  const provenance = loadProvenance();
  const upstreamPath = resolveUpstream({ source: opts.source, provenance });

  const report = {
    provenancePath: path.relative(ROOT, PROVENANCE_PATH),
    recorded: { version: provenance.version, commit: provenance.commit, syncedAt: provenance.syncedAt },
    upstreamPath: upstreamPath ? path.relative(ROOT, upstreamPath) : null,
    upstreamFound: Boolean(upstreamPath),
    shapeDiff: null,
    adaptationProblems: [],
    upstream: null,
    ok: false
  };

  if (!upstreamPath) {
    report.error = 'upstream engine source not found; pass --source=<path to mcp-server/src/index.js>';
    return { report, provenance, upstreamPath: null };
  }

  const upstreamSource = fs.readFileSync(upstreamPath, 'utf8');
  const localSource = fs.readFileSync(EVIDENCE_PATH, 'utf8');

  const actualShape = extractRecordShape(upstreamSource);
  const expectedShape = provenance.upstreamRecordShape || {};
  report.shapeDiff = {
    executed: diffShapes(expectedShape.executed, actualShape.executed),
    attested: diffShapes(expectedShape.attested, actualShape.attested)
  };
  report.actualShape = actualShape;
  report.adaptationProblems = checkLocalAdaptations(localSource);
  report.upstream = readUpstreamVersion(upstreamPath);

  const shapeChanged = report.shapeDiff.executed.changed || report.shapeDiff.attested.changed;
  report.shapeChanged = shapeChanged;
  report.ok = !shapeChanged && report.adaptationProblems.length === 0;

  return { report, provenance, upstreamPath, actualShape };
}

function renderReport(report) {
  const lines = [];
  lines.push('Godpowers Evidence Engine Re-sync');
  lines.push('');
  lines.push(`Recorded: mythify-mcp@${report.recorded.version} (${report.recorded.commit}) synced ${report.recorded.syncedAt}`);
  lines.push(`Upstream source: ${report.upstreamPath || '(not found)'}`);
  if (!report.upstreamFound) {
    lines.push('');
    lines.push(`Error: ${report.error}`);
    return lines.join('\n');
  }
  if (report.upstream) {
    lines.push(`Upstream now: mythify-mcp@${report.upstream.version || '?'} (${report.upstream.commit || '?'})`);
  }
  lines.push('');
  for (const kind of ['executed', 'attested']) {
    const diff = report.shapeDiff[kind];
    if (!diff.changed) {
      lines.push(`Record shape (${kind}): unchanged`);
    } else {
      lines.push(`Record shape (${kind}): CHANGED - review needed`);
      if (diff.added.length > 0) lines.push(`  added upstream keys: ${diff.added.join(', ')}`);
      if (diff.removed.length > 0) lines.push(`  removed upstream keys: ${diff.removed.join(', ')}`);
    }
  }
  lines.push('');
  if (report.adaptationProblems.length === 0) {
    lines.push('Adaptations: all recorded adaptations still present in lib/evidence.js');
  } else {
    lines.push('Adaptations: PROBLEMS - review needed');
    for (const problem of report.adaptationProblems) lines.push(`  ${problem}`);
  }
  lines.push('');
  lines.push(report.ok
    ? 'Result: in sync. No record-shape drift and adaptations intact.'
    : 'Result: review needed. Re-vendor the changed engine logic into lib/evidence.js, then re-run with --write.');
  return lines.join('\n');
}

function writeProvenance(provenance, report, actualShape) {
  const next = { ...provenance };
  next.syncedAt = new Date().toISOString().slice(0, 10);
  if (report.upstream && report.upstream.version) next.version = report.upstream.version;
  if (report.upstream && report.upstream.commit) next.commit = report.upstream.commit;
  if (actualShape && actualShape.executed) next.upstreamRecordShape = actualShape;
  atomic.writeJsonAtomic(PROVENANCE_PATH, next);
  return next;
}

function main() {
  const opts = parseArgs(process.argv);
  const { report, provenance, actualShape } = buildReport(opts);

  if (opts.write && report.upstreamFound) {
    writeProvenance(provenance, report, actualShape);
    report.written = true;
  }

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(renderReport(report));
    if (report.written) console.log('\nWrote updated provenance to lib/evidence/.provenance.json.');
  }

  if (!report.upstreamFound) process.exit(1);
  if (!report.ok && !opts.write) process.exit(1);
}

if (require.main === module) main();

module.exports = {
  loadProvenance,
  resolveUpstream,
  extractContextKeys,
  extractRecordShape,
  diffShapes,
  stripComments,
  checkLocalAdaptations,
  readUpstreamVersion,
  parseArgs,
  buildReport,
  renderReport
};
