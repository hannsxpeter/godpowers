/**
 * Artifact Linter
 *
 * Orchestrator for per-artifact lint runs. Detects artifact type from path,
 * loads the file, runs the right have-nots checks, returns structured
 * findings.
 *
 * Public API:
 *   detectType(filePath) -> 'prd'|'arch'|'roadmap'|'stack'|'design'|'product'|'domain'|null
 *   lintFile(filePath, opts) -> { type, findings, summary }
 *   lintAll(projectRoot, opts) -> [{ path, type, findings, summary }, ...]
 *
 * Findings structure:
 *   { code, severity, line, column, message, suggestion }
 */

const fs = require('fs');
const path = require('path');
const validator = require('./have-nots-validator');
const syncFs = require('./sync-fs');

/**
 * Detect artifact type from path. Returns null for unknown.
 * The extension is normalized so both .md and .mdx variants of each
 * artifact match ('.godpowers/prd/PRD.mdx' and legacy 'prd/PRD.md').
 */
function detectType(filePath) {
  const lower = filePath.toLowerCase();
  const basename = path.basename(lower).replace(/\.mdx$/, '.md');
  if (lower.includes('/prd/') || basename === 'prd.md') return 'prd';
  if (lower.includes('/arch/') || basename === 'arch.md') return 'arch';
  if (lower.includes('/roadmap/') || basename === 'roadmap.md') return 'roadmap';
  if (lower.includes('/stack/') || basename === 'stack-decision.md' || basename === 'decision.md') return 'stack';
  if (lower.includes('/domain/') || basename === 'domain-glossary.md' || basename === 'glossary.md') return 'domain';
  if (basename === 'design.md') return 'design';
  if (basename === 'product.md') return 'product';
  if (basename === 'postmortem.md') return 'postmortem';
  if (basename === 'spike.md') return 'spike';
  if (basename === 'migration.md') return 'migration';
  return null;
}

// ============================================================================
// U-13 MDX-safety mechanical check (see references/HAVE-NOTS.md)
// ============================================================================

// Banned characters: em/en dash, smart quotes, ellipsis, unicode arrows
// (arrows, supplemental arrows A/B, misc symbols and arrows), emoji.
const MDX_BANNED_CHARS = /[\u2013\u2014\u2018\u2019\u201C\u201D\u2026\u2190-\u21FF\u27F0-\u27FF\u2900-\u297F\u2B00-\u2BFF]|[\u{1F300}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

// Blank out inline code spans so structural scans skip them while columns
// still point at the original line.
function maskInlineCode(line) {
  return line.replace(/`[^`]*`/g, (span) => ' '.repeat(span.length));
}

function codePoint(ch) {
  return `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
}

/**
 * U-13: MDX-unsafe artifact content. Structural hazards (bare "<" before a
 * letter, bare "{" or "}", HTML comments) are checked outside inline code
 * spans and fenced code blocks; banned characters fail everywhere, matching
 * how U-08/U-09 scan the whole document.
 */
function checkMdxSafety(content) {
  const findings = [];
  const lines = content.split('\n');
  let inCodeBlock = false;
  let m;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    MDX_BANNED_CHARS.lastIndex = 0;
    while ((m = MDX_BANNED_CHARS.exec(line)) !== null) {
      findings.push({
        code: 'U-13',
        severity: 'error',
        line: i + 1,
        column: m.index + 1,
        message: `MDX-unsafe banned character "${m[0]}" (${codePoint(m[0])}).`,
        suggestion: 'Use plain ASCII: hyphen, straight quotes, three dots, ->, or words instead of emoji.'
      });
    }

    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const masked = maskInlineCode(line);

    const commentRegex = /<!--/g;
    while ((m = commentRegex.exec(masked)) !== null) {
      findings.push({
        code: 'U-13',
        severity: 'warning',
        line: i + 1,
        column: m.index + 1,
        message: 'HTML comment is not valid MDX outside code.',
        suggestion: 'Use an MDX comment ({/* ... */}) or move it into a code block.'
      });
    }

    const jsxOpenRegex = /<[A-Za-z]/g;
    while ((m = jsxOpenRegex.exec(masked)) !== null) {
      findings.push({
        code: 'U-13',
        severity: 'warning',
        line: i + 1,
        column: m.index + 1,
        message: `Bare "<" followed by a letter parses as JSX in MDX ("${masked.slice(m.index, m.index + 16)}").`,
        suggestion: 'Escape the "<" or wrap the fragment in backticks or a code block.'
      });
    }

    const braceRegex = /[{}]/g;
    while ((m = braceRegex.exec(masked)) !== null) {
      findings.push({
        code: 'U-13',
        severity: 'warning',
        line: i + 1,
        column: m.index + 1,
        message: `Bare "${m[0]}" outside code parses as a JSX expression in MDX.`,
        suggestion: 'Escape the brace or wrap the fragment in backticks or a code block.'
      });
    }
  }
  return findings;
}

/**
 * Lint a single file. Returns { type, findings, summary }.
 */
function lintFile(filePath, opts = {}) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const type = detectType(filePath);
  const ctx = {
    projectRoot: opts.projectRoot || process.cwd(),
    docDir: path.dirname(filePath),
    today: opts.today,
    prdContent: opts.prdContent,
    ...opts
  };

  // For ARCH, auto-load PRD if not provided (mdx-first, legacy .md fallback)
  if (type === 'arch' && !ctx.prdContent) {
    const prdContent = syncFs.readArtifactOrNull(ctx.projectRoot, '.godpowers/prd/PRD.mdx');
    if (prdContent !== null) {
      ctx.prdContent = prdContent;
    }
  }

  const findings = validator.runChecks(content, type, ctx);
  // U-13 MDX safety runs on every linted artifact regardless of type.
  findings.push(...checkMdxSafety(content));
  findings.sort((a, b) => a.line - b.line || (a.column || 0) - (b.column || 0));
  const summary = validator.summarize(findings);

  return {
    path: filePath,
    type: type || 'unknown',
    findings,
    summary
  };
}

/**
 * Lint all known artifacts in a project.
 */
function lintAll(projectRoot, opts = {}) {
  const root = projectRoot || process.cwd();
  // .godpowers candidates probe .mdx first with legacy .md fallback (one hit
  // per artifact). Note: .godpowers/design/DESIGN.mdx migrates to .mdx while
  // root DESIGN.md (impeccable convention) stays .md and is matched exactly.
  const candidates = [
    '.godpowers/prd/PRD.mdx',
    '.godpowers/arch/ARCH.mdx',
    '.godpowers/roadmap/ROADMAP.mdx',
    '.godpowers/stack/DECISION.mdx',
    '.godpowers/domain/GLOSSARY.mdx',
    '.godpowers/design/DESIGN.mdx',
    'DESIGN.md',
    'PRODUCT.md'
  ];
  const results = [];
  for (const rel of candidates) {
    const resolved = rel.startsWith('.godpowers/')
      ? syncFs.resolveArtifact(root, rel)
      : rel;
    const full = path.join(root, resolved);
    if (fs.existsSync(full)) {
      results.push(lintFile(full, { projectRoot: root, ...opts }));
    }
  }
  return results;
}

/**
 * Format findings as a human-readable report string.
 */
function formatReport(result) {
  const lines = [];
  lines.push(`\n${result.path}`);
  lines.push(`  Type: ${result.type}`);
  lines.push(`  Errors: ${result.summary.errors}, Warnings: ${result.summary.warnings}, Info: ${result.summary.infos}`);
  if (result.findings.length === 0) {
    lines.push('  Clean: no findings.');
    return lines.join('\n');
  }
  for (const f of result.findings) {
    lines.push(`  [${f.code}] ${f.severity.toUpperCase()} line ${f.line}: ${f.message}`);
    if (f.suggestion) {
      lines.push(`         -> ${f.suggestion}`);
    }
  }
  return lines.join('\n');
}

/**
 * Aggregate summary across multiple lint results.
 */
function aggregate(results) {
  const totals = { errors: 0, warnings: 0, infos: 0, byCode: {}, files: results.length };
  for (const r of results) {
    totals.errors += r.summary.errors;
    totals.warnings += r.summary.warnings;
    totals.infos += r.summary.infos;
    for (const code of Object.keys(r.summary.byCode)) {
      totals.byCode[code] = (totals.byCode[code] || 0) + r.summary.byCode[code];
    }
  }
  return totals;
}

module.exports = {
  detectType,
  lintFile,
  lintAll,
  formatReport,
  aggregate,
  checkMdxSafety
};
