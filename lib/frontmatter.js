/**
 * Flat YAML frontmatter for Godpowers markdown files.
 *
 * Supports `key: value` lines with strings (bare or quoted), integers,
 * booleans, and null. Nested maps and lists are rejected with a diagnostic:
 * the state format is deliberately flat so both models and code can edit it.
 */

const KEY_RE = /^([A-Za-z][A-Za-z0-9_-]*):(?:\s+(.*))?$/;

function parseScalar(raw) {
  const value = raw.trim();
  if (value === '' || value === '~' || value === 'null') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (value.length >= 2 && ((value[0] === '"' && value.endsWith('"')) || (value[0] === "'" && value.endsWith("'")))) {
    const inner = value.slice(1, -1);
    return value[0] === '"' ? inner.replace(/\\"/g, '"').replace(/\\\\/g, '\\') : inner.replace(/''/g, "'");
  }
  return value;
}

/**
 * Split a markdown document into frontmatter data and body.
 * Returns { data, body, hasFrontmatter, diagnostics, bodyLine }.
 * `bodyLine` is the 1-based line number where the body starts.
 */
function parse(text) {
  const diagnostics = [];
  const source = String(text || '').replace(/\r\n/g, '\n');
  if (!source.startsWith('---\n')) {
    return { data: {}, body: source, hasFrontmatter: false, diagnostics, bodyLine: 1 };
  }
  const end = source.indexOf('\n---', 3);
  if (end === -1) {
    diagnostics.push({ line: 1, message: 'frontmatter is not closed with ---' });
    return { data: {}, body: source, hasFrontmatter: false, diagnostics, bodyLine: 1 };
  }
  const lines = source.slice(4, end + 1).split('\n');
  const data = {};
  lines.forEach((line, index) => {
    if (line.trim() === '' || line.trim().startsWith('#')) return;
    const match = KEY_RE.exec(line);
    if (!match) {
      diagnostics.push({ line: index + 2, message: `unsupported frontmatter line: ${line.trim().slice(0, 60)}` });
      return;
    }
    if (Object.prototype.hasOwnProperty.call(data, match[1])) {
      diagnostics.push({ line: index + 2, message: `duplicate frontmatter key: ${match[1]}` });
    }
    data[match[1]] = parseScalar(match[2] || '');
  });
  let bodyStart = end + 4;
  if (source[bodyStart] === '\n') bodyStart += 1;
  const bodyLine = source.slice(0, bodyStart).split('\n').length;
  return { data, body: source.slice(bodyStart), hasFrontmatter: true, diagnostics, bodyLine };
}

function formatScalar(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  const text = String(value);
  if (text === '' || /^[\s'"]|[\s]$|: |#|^(true|false|null|~|-?\d+)$/.test(text)) {
    return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return text;
}

/** Render flat data as a frontmatter block followed by `body`. */
function stringify(data, body) {
  const lines = Object.keys(data).map(key => `${key}: ${formatScalar(data[key])}`.trimEnd());
  return `---\n${lines.join('\n')}\n---\n${body || ''}`;
}

module.exports = { parse, stringify, parseScalar, formatScalar };
