/**
 * Intent Manager
 *
 * Read .godpowers/intent.yaml. Validate basic structure.
 *
 * Note: this is a minimal YAML reader, intentionally avoiding a YAML
 * dependency. Handles the subset of YAML our intent files use.
 * Strict callers can collect diagnostics for skipped lines and unsafe keys.
 * For complex YAML, agents read the file directly.
 */

const fs = require('fs');
const path = require('path');
const asyncFs = require('./fs-async');

/**
 * @typedef {Object} IntentDocument
 * @property {string} apiVersion Expected to be `godpowers/v1`.
 * @property {string} kind Expected to be `Project`.
 * @property {{ name: string, description?: string }} metadata Project metadata.
 * @property {string} mode Project mode.
 * @property {string} scale Project scale.
 */

function intentPath(projectRoot) {
  return path.join(projectRoot, '.godpowers', 'intent.yaml');
}

/**
 * Read intent.yaml. Returns parsed object or null if not found.
 *
 * Minimal YAML parser: handles the subset our schema uses
 * (key: value, nested objects, arrays of strings, booleans).
 * For full YAML, agents should use a real parser.
 *
 * @param {string} projectRoot
 * @returns {IntentDocument|null}
 */
function read(projectRoot) {
  const file = intentPath(projectRoot);
  if (!fs.existsSync(file)) return null;
  const content = fs.readFileSync(file, 'utf8');
  return parseSimpleYaml(content);
}

/**
 * @param {string} projectRoot
 * @returns {Promise<IntentDocument|null>}
 */
async function readAsync(projectRoot) {
  const file = intentPath(projectRoot);
  if (!(await asyncFs.exists(file))) return null;
  const content = await asyncFs.fs.readFile(file, 'utf8');
  return parseSimpleYaml(content);
}

/**
 * Reject keys that would mutate the Object prototype chain. intent.yaml and
 * extension manifests are untrusted input, so a key like `__proto__` must
 * never be assigned during parsing.
 */
function isUnsafeKey(key) {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}

/**
 * Parse a simple YAML subset. Just enough for intent.yaml structure.
 * Real-world: replace with `yaml` npm package when we add deps.
 */
function createDiagnostic(severity, line, message, source) {
  return {
    severity,
    line,
    source: source || null,
    message
  };
}

function formatDiagnostic(diagnostic) {
  const source = diagnostic.source ? `${diagnostic.source}:` : '';
  return `${source}${diagnostic.line}: ${diagnostic.message}`;
}

function diagnosticsError(diagnostics, label = 'YAML diagnostics') {
  const error = new Error(`${label}:\n  - ${diagnostics.map(formatDiagnostic).join('\n  - ')}`);
  error.diagnostics = diagnostics;
  return error;
}

function parseSimpleYaml(content, opts = {}) {
  const result = parseSimpleYamlWithDiagnostics(content, opts);
  if (opts.throwOnDiagnostics && result.diagnostics.length > 0) {
    throw diagnosticsError(result.diagnostics, opts.errorLabel);
  }
  return result.data;
}

function parseSimpleYamlWithDiagnostics(content, opts = {}) {
  const lines = content.split('\n');
  const result = {};
  const stack = [{ obj: result, indent: -1, key: null, isArray: false, parent: null }];
  const diagnostics = [];
  const strict = opts.strict === true;
  const source = opts.source || null;
  const unsafeKeySeverity = opts.unsafeKeySeverity || 'warning';

  function record(severity, lineNumber, message) {
    const diagnostic = createDiagnostic(severity, lineNumber, message, source);
    diagnostics.push(diagnostic);
    if (typeof opts.onDiagnostic === 'function') opts.onDiagnostic(diagnostic);
  }

  function recordSkipped(lineNumber, rawLine, reason) {
    if (!strict) return;
    record('warning', lineNumber, `${reason}: ${rawLine.trim()}`);
  }

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    line = stripInlineComment(line);
    if (!line.trim()) continue;

    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();

    // Pop stack to the right indent level
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].obj;

    if (trimmed === '[]') {
      const current = stack[stack.length - 1];
      if (current.parent && current.key && Object.keys(current.obj).length === 0) {
        current.parent[current.key] = [];
        stack.pop();
        continue;
      }
    }

    // List item: "- key: value" or "- value"
    if (trimmed.startsWith('- ')) {
      const rest = trimmed.slice(2);
      // If the rest is a quoted string, treat as simple value (don't split on colon)
      const isQuotedSimple = /^"[^"]*"$|^'[^']*'$/.test(rest.trim());
      const restColonIdx = isQuotedSimple ? -1 : findUnquotedColon(rest);

      // Ensure parent is array
      if (!Array.isArray(parent.__items__)) {
        parent.__items__ = [];
      }

      if (restColonIdx === -1) {
        // Simple list value: "- value"
        parent.__items__.push(parseValue(rest.trim()));
      } else {
        // List of objects: "- key: value"
        const itemKey = rest.slice(0, restColonIdx).trim();
        if (!itemKey) {
          recordSkipped(i + 1, lines[i], 'Missing list item key');
          continue;
        }
        if (isUnsafeKey(itemKey)) {
          record(unsafeKeySeverity, i + 1, `Unsafe YAML key rejected: ${itemKey}`);
          continue;
        }
        const itemVal = rest.slice(restColonIdx + 1).trim();
        const newObj = {};
        if (itemVal) {
          newObj[itemKey] = parseValue(itemVal);
        } else {
          newObj[itemKey] = {};
          // Inner object's properties start at indent+4 (2 for "- " + 2 for key indentation)
          stack.push({ obj: newObj[itemKey], indent: indent + 3, key: itemKey, parent: newObj });
        }
        parent.__items__.push(newObj);
        // Push the new object onto the stack at indent+1 so subsequent properties
        // at indent+2 (the "- " offset) go into it. The +1 ensures it's NOT popped
        // when we encounter properties at the same visual indent as the "-".
        stack.push({ obj: newObj, indent: indent + 1, key: '__item__', parent });
      }
      continue;
    }

    const colonIdx = findUnquotedColon(trimmed);
    if (colonIdx === -1) {
      recordSkipped(i + 1, lines[i], 'Unparseable YAML line skipped');
      continue;
    }
    const key = trimmed.slice(0, colonIdx).trim();
    if (!key) {
      recordSkipped(i + 1, lines[i], 'Missing YAML key');
      continue;
    }
    if (isUnsafeKey(key)) {
      record(unsafeKeySeverity, i + 1, `Unsafe YAML key rejected: ${key}`);
      continue;
    }
    const valueStr = trimmed.slice(colonIdx + 1).trim();

    if (!valueStr) {
      const child = {};
      parent[key] = child;
      stack.push({ obj: child, indent, key, parent });
    } else if (valueStr === '|' || valueStr === '>') {
      const block = readBlockScalar(lines, i + 1, indent, valueStr === '>');
      parent[key] = block.value;
      i = block.nextIndex - 1;
    } else {
      parent[key] = parseValue(valueStr);
    }
  }

  return { data: cleanArrays(result), diagnostics };
}

function readBlockScalar(lines, startIndex, parentIndent, folded) {
  const blockLines = [];
  let i = startIndex;

  for (; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) {
      blockLines.push('');
      continue;
    }
    const indent = raw.length - raw.trimStart().length;
    if (indent <= parentIndent) break;
    blockLines.push(raw);
  }

  const nonBlankIndents = blockLines
    .filter(line => line.trim())
    .map(line => line.length - line.trimStart().length);
  const trimIndent = nonBlankIndents.length
    ? Math.min(...nonBlankIndents)
    : parentIndent + 2;
  const normalized = blockLines.map(line => (
    line.trim() ? line.slice(Math.min(trimIndent, line.length)) : ''
  ));

  return {
    value: folded ? normalized.join(' ').replace(/\s+/g, ' ').trim() : normalized.join('\n').trimEnd(),
    nextIndex: i
  };
}

function parseValue(str) {
  str = str.trim();
  if (str === 'true') return true;
  if (str === 'false') return false;
  if (str === 'null' || str === '~') return null;
  if (/^-?\d+$/.test(str)) return parseInt(str, 10);
  if (/^-?\d+\.\d+$/.test(str)) return parseFloat(str);
  if (/^".*"$/.test(str)) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return str.slice(1, -1);
    }
  }
  if (/^'.*'$/.test(str)) return str.slice(1, -1).replace(/''/g, "'");
  // Inline array: [/god-mode, /god-foo]
  if (/^\[.*\]$/.test(str)) {
    const inner = str.slice(1, -1).trim();
    if (!inner) return [];
    return splitInlineArray(inner).map(s => parseValue(s.trim()));
  }
  return str;
}

function stripInlineComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === quote && line[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '#' && (i === 0 || /\s/.test(line[i - 1]))) {
      return line.slice(0, i).trimEnd();
    }
  }
  return line;
}

function findUnquotedColon(text) {
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote && text[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ':') return i;
  }
  return -1;
}

function splitInlineArray(text) {
  const parts = [];
  let quote = null;
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote && text[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '[') depth++;
    if (ch === ']') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

function cleanArrays(obj) {
  if (Array.isArray(obj)) return obj.map(cleanArrays);
  if (obj && typeof obj === 'object') {
    // Detect array container (legacy or new)
    if (obj.__items__) return obj.__items__.map(cleanArrays);
    if (obj.__pending_array__) return obj.__pending_array__;
    const cleaned = {};
    for (const [k, v] of Object.entries(obj)) {
      cleaned[k] = cleanArrays(v);
    }
    return cleaned;
  }
  return obj;
}

/**
 * Get a setting from intent.yaml using dot notation.
 * Example: get(root, 'config.yolo')
 */
function get(intent, key) {
  if (!intent) return undefined;
  return key.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), intent);
}

/**
 * Validate the structure of an intent object against expected shape.
 * Returns array of error messages (empty if valid).
 */
function validate(intent) {
  const errors = [];
  if (!intent) return ['intent is null'];
  if (intent.apiVersion !== 'godpowers/v1') errors.push('apiVersion must be godpowers/v1');
  if (intent.kind !== 'Project') errors.push('kind must be Project');
  if (!intent.metadata || !intent.metadata.name) errors.push('metadata.name required');
  if (!['A', 'B', 'C', 'E'].includes(intent.mode)) errors.push('mode must be A, B, C, or E (D is a suite-membership boolean, mode-d-suite, not a primary mode)');
  if (!['trivial', 'small', 'medium', 'large', 'enterprise'].includes(intent.scale)) {
    errors.push('scale must be trivial/small/medium/large/enterprise');
  }
  return errors;
}

module.exports = {
  read,
  readAsync,
  get,
  validate,
  intentPath,
  parseSimpleYaml,
  parseSimpleYamlWithDiagnostics,
  diagnosticsError,
  formatDiagnostic
};
