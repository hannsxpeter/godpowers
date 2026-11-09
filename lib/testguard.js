/**
 * The test guard: flags changes that weaken the tests.
 *
 * It compares a base commit with the working tree and reports, for test files
 * only: deleted test files, fewer test declarations, fewer assertions, and
 * added skip or focus markers (including in untracked test files). It reads
 * patches, not code, so it knows common JavaScript, Python, Go, Rust, Java,
 * Kotlin, and C# spellings and nothing more.
 */

const fs = require('fs');
const path = require('path');

const gitTools = require('./git');

const TEST_DIRS = new Set(['test', 'tests', '__tests__', 'spec', 'specs', 'e2e']);
const GENERIC_TEST_NAME = /(?:\.test\.|\.spec\.|_test\.|_spec\.)/;
const PYTHON_TEST_NAME = /^test_.*\.py$/;
// Case-sensitive on purpose: Contest.java is not a test.
const TYPED_TEST_NAME = /Tests?\.(?:java|kt|cs)$/;
const MAX_UNTRACKED_BYTES = 2 * 1024 * 1024;
const MAX_DETAIL = 120;
// A line carrying this text is left out of every line-based finding.
const ALLOW_MARKER = 'godpowers: allow-test-change';

/** True when the slash-separated relative path is a test file. */
function isTestPath(rel) {
  const parts = String(rel).split('/');
  const name = parts[parts.length - 1];
  if (parts.slice(0, -1).some(dir => TEST_DIRS.has(dir.toLowerCase()))) return true;
  const lower = name.toLowerCase();
  return GENERIC_TEST_NAME.test(lower) || PYTHON_TEST_NAME.test(lower) || TYPED_TEST_NAME.test(name);
}

const JS_NAMES = 'it|test|describe|suite|context';
const JS_BEFORE = '(?:^|[^\\w$.])';

// Lines that declare a test.
const DECLARATIONS = [
  new RegExp(`${JS_BEFORE}(?:x|f)?(?:${JS_NAMES})(?:\\.(?:each|concurrent|serial|skip|only|todo))?\\s*\\(`),
  new RegExp(`${JS_BEFORE}(?:x|f)?(?:${JS_NAMES})\\.each\\s*\``),
  /^\s*(?:async\s+)?def\s+test_\w*\s*\(/,
  /^\s*func\s+Test\w*\s*\(/,
  /#\[(?:[\w:]+::)?test(?:\([^\]]*\))?\]/,
  /@(?:Test|ParameterizedTest|RepeatedTest)\b/,
  /\[(?:Test|Fact|Theory|TestMethod)\s*[\],(]/
];

// Lines that assert something.
const ASSERTIONS = [
  /\b[Aa]ssert[\w.]*!?\(/,
  /^\s*assert\s/,
  /\bexpect\s*\(/,
  /\bt\.(?:Error|Errorf|Fatal|Fatalf|Fail|FailNow)\s*\(/,
  /\brequire\.[A-Z]\w*\s*\(/
];

// Lines that switch a test off or focus on one test.
const SKIP_MARKERS = [
  new RegExp(`\\b(?:${JS_NAMES})\\.(?:skip|only|todo)\\b\\s*(?:\\(|\\.each\\b)`),
  new RegExp(`${JS_BEFORE}(?:xit|xtest|xdescribe|xcontext|fit|fdescribe)\\s*\\(`),
  /\{\s*(?:skip|todo)\s*:\s*(?:true|['"`])/,
  /\bpytest\.mark\.(?:skip|skipif|xfail)\b/,
  /@unittest\.(?:skip\w*|expectedFailure)\b/,
  /\bpytest\.skip\s*\(/,
  /\bt\.(?:Skip|SkipNow|Skipf)\s*\(/,
  /#\[ignore\b/,
  /@(?:Disabled\w*|Ignore)\b/,
  /\[[^\]]*\bIgnore\b/,
  /\[[^\]]*\bSkip\s*=/
];

const matchesAny = (patterns, line) => patterns.some(pattern => pattern.test(line));
const countLines = (patterns, lines) => lines.filter(line => matchesAny(patterns, line)).length;

/** Added and removed lines of one file's patch; added lines carry their new line number. */
function patchLines(patch) {
  const added = [];
  const removed = [];
  let inHunk = false;
  let next = 0;
  for (const line of patch.split('\n')) {
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunk) {
      inHunk = true;
      next = Number(hunk[1]);
    } else if (inHunk && line.startsWith('+')) {
      added.push({ line: next++, text: line.slice(1) });
    } else if (inHunk && line.startsWith('-')) {
      removed.push(line.slice(1));
    }
  }
  return { added, removed };
}

function trimmed(text) {
  const line = text.trim();
  return line.length > MAX_DETAIL ? `${line.slice(0, MAX_DETAIL - 3)}...` : line;
}

function readUntracked(root, rel) {
  try {
    const full = path.join(root, rel);
    const stat = fs.lstatSync(full);
    if (!stat.isFile() || stat.size > MAX_UNTRACKED_BYTES) return null;
    const buffer = fs.readFileSync(full);
    return buffer.subarray(0, 8000).includes(0) ? null : buffer.toString('utf8');
  } catch (_) {
    return null;
  }
}

function skipFindings(file, added) {
  return added
    .filter(entry => !entry.text.includes(ALLOW_MARKER) && matchesAny(SKIP_MARKERS, entry.text))
    .map(entry => ({ kind: 'skip-marker', file, line: entry.line, detail: trimmed(entry.text) }));
}

function plural(count, noun) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** Findings for one test file's patch (not for deletions). */
function patchFindings(file, patch) {
  const lines = patchLines(patch);
  const counted = text => !text.includes(ALLOW_MARKER);
  const added = lines.added;
  const removed = lines.removed.filter(counted);
  const addedText = added.map(entry => entry.text).filter(counted);
  const findings = [];
  const declaredBefore = countLines(DECLARATIONS, removed);
  const declaredAfter = countLines(DECLARATIONS, addedText);
  if (declaredBefore > declaredAfter) {
    findings.push({ kind: 'fewer-tests', file, line: null, detail: `${plural(declaredBefore, 'test declaration')} removed, ${declaredAfter} added` });
  }
  const assertedBefore = countLines(ASSERTIONS, removed);
  const assertedAfter = countLines(ASSERTIONS, addedText);
  if (assertedBefore > assertedAfter) {
    findings.push({ kind: 'fewer-assertions', file, line: null, detail: `${plural(assertedBefore, 'assertion line')} removed, ${assertedAfter} added` });
  }
  return [...findings, ...skipFindings(file, added)];
}

/** The blob id of `path` at the base commit, or null. */
function baseBlob(root, sha, rel) {
  const result = gitTools.git(root, ['rev-parse', '--verify', '--quiet', '--end-of-options', `${sha}:./${rel}`]);
  return result.ok ? result.stdout.trim() : null;
}

/**
 * Compare the base with the working tree. `base` is { ref, sha }. Returns
 * [{ kind, file, line, detail }], where `line` is the new line number for a
 * skip marker and null for the other kinds.
 */
function compute(root, base) {
  const findings = [];
  const diff = gitTools.diffSince(root, base.sha);
  const untracked = gitTools.untrackedFiles(root).filter(isTestPath);
  // A test file moved without `git add` shows as a deletion plus an untracked
  // file with the same content; that is a rename, not a deletion.
  const hashes = gitTools.hashPaths(root, untracked);
  const untrackedHashes = new Set(Object.values(hashes));
  for (const entry of diff.files) {
    const oldPath = entry.from || entry.path;
    if (entry.status === 'D') {
      if (isTestPath(entry.path) && !untrackedHashes.has(baseBlob(root, base.sha, entry.path))) {
        findings.push({ kind: 'deleted-test', file: entry.path, line: null, detail: 'test file deleted' });
      }
    } else if (!isTestPath(entry.path)) {
      if (entry.status === 'R' && isTestPath(oldPath)) {
        findings.push({ kind: 'deleted-test', file: oldPath, line: null, detail: `test file renamed to ${entry.path}, which is not a test path` });
      }
    } else {
      findings.push(...patchFindings(entry.path, entry.patch));
    }
  }
  for (const rel of untracked) {
    const text = readUntracked(root, rel);
    if (text === null) continue;
    const added = text.split('\n').map((line, index) => ({ line: index + 1, text: line }));
    findings.push(...skipFindings(rel, added));
  }
  return findings;
}

/** One line per finding for the terminal. */
function formatFinding(finding) {
  const where = finding.line ? `${finding.file}:${finding.line}` : finding.file;
  return `${finding.kind.padEnd(16)} ${where}: ${finding.detail}`;
}

function shortSha(sha) {
  return sha.slice(0, 7);
}

function formatReport(base, findings) {
  const lines = [`Compared with ${base.ref} (${shortSha(base.sha)}): ${findings.length} finding(s)`, ...findings.map(formatFinding)];
  if (findings.length) lines.push(`To mark a deliberate change, put \`${ALLOW_MARKER}\` in a comment on the line, and say why in the review.`);
  return lines.join('\n');
}

module.exports = { ALLOW_MARKER, isTestPath, compute, formatFinding, formatReport, shortSha };
