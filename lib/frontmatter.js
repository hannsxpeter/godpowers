/**
 * Shared YAML frontmatter helpers for markdown-backed Godpowers contracts.
 *
 * Frontmatter uses the same dependency-free YAML subset as intent, routing,
 * recipes, workflows, and extension manifests.
 */

const { parseSimpleYamlWithDiagnostics } = require('./intent');

function hasOpeningFence(text) {
  return typeof text === 'string' && text.startsWith('---');
}

function split(text, opts = {}) {
  const source = opts.source || null;
  if (!hasOpeningFence(text)) {
    return {
      frontmatter: null,
      body: text,
      rawFrontmatter: '',
      diagnostics: opts.require ? [{
        severity: 'warning',
        line: 1,
        source,
        message: 'Missing YAML frontmatter fence'
      }] : []
    };
  }

  const end = text.indexOf('\n---', 3);
  if (end === -1) {
    return {
      frontmatter: null,
      body: text,
      rawFrontmatter: '',
      diagnostics: [{
        severity: 'warning',
        line: 1,
        source,
        message: 'YAML frontmatter fence is not closed'
      }]
    };
  }

  const rawFrontmatter = text.slice(3, end).trim();
  const parsed = parseSimpleYamlWithDiagnostics(rawFrontmatter, {
    strict: opts.strict === true,
    source,
    unsafeKeySeverity: opts.unsafeKeySeverity || 'warning',
    onDiagnostic: opts.onDiagnostic
  });

  return {
    frontmatter: parsed.data,
    body: text.slice(end + 4).trimStart(),
    rawFrontmatter,
    diagnostics: parsed.diagnostics
  };
}

function parse(text, opts = {}) {
  const result = split(text, opts);
  return result.frontmatter || {};
}

function strip(text) {
  return split(text).body.trim();
}

module.exports = {
  split,
  parse,
  strip
};
