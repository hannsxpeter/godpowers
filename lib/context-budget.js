/**
 * Context Budget - deterministic per-agent context loadouts.
 *
 * Specialist context is declared explicitly with `file:` and `inline:`
 * entries. Human-facing `inputs` prose is never interpreted as a source.
 *
 * Implements: P-MUST-25
 */

const fs = require('fs');
const path = require('path');
const frontmatter = require('./frontmatter');

const BYTES_PER_TOKEN = 4;
const DEFAULT_MAX_TOKENS = 80_000;
const MAX_EXECUTION_SOURCES = 500;
const MAX_EVIDENCE_SOURCES = 16;
const MAX_IDENTIFIER_BYTES = 128;
const MAX_MANIFEST_BYTES = 8 * 1024;
const MAX_SOURCE_BYTES = 4 * 1024 * 1024;
const MAX_PROJECT_ENTRIES = 5000;
const MAX_PROJECT_DEPTH = 48;

function estimateTokens(input) {
  if (typeof input === 'number') return Math.ceil(input / BYTES_PER_TOKEN);
  if (typeof input === 'string' || Buffer.isBuffer(input)) {
    return Math.ceil(Buffer.byteLength(input) / BYTES_PER_TOKEN);
  }
  return 0;
}

function sourceDeclarations(requiredContext, optionalContext) {
  const declarations = [];
  for (const [values, required] of [[requiredContext, true], [optionalContext, false]]) {
    for (const value of values || []) {
      const declaration = String(value).trim();
      const match = declaration.match(/^(file|inline):(.*)$/);
      declarations.push({
        kind: match ? match[1] : 'invalid',
        key: match ? match[2].trim() : declaration,
        required,
        order: declarations.length,
        declaration
      });
    }
  }
  return declarations;
}

function readAgentMetadata(agentPath) {
  if (!fs.existsSync(agentPath)) return {};
  const raw = fs.readFileSync(agentPath, 'utf8');
  return frontmatter.parse(raw, { strict: true, source: agentPath });
}

function parseAgentBudget(agentPath) {
  if (!fs.existsSync(agentPath)) {
    return {
      name: null,
      sources: [],
      required: [],
      optional: [],
      maxTokens: null,
      noProjectContext: false
    };
  }
  const metadata = readAgentMetadata(agentPath);
  const sources = sourceDeclarations(
    Array.isArray(metadata['required-context']) ? metadata['required-context'] : [],
    Array.isArray(metadata['optional-context']) ? metadata['optional-context'] : []
  );
  return {
    name: typeof metadata.name === 'string' ? metadata.name : null,
    sources,
    required: sources.filter(source => source.required).map(source => source.key),
    optional: sources.filter(source => !source.required).map(source => source.key),
    maxTokens: Number.isFinite(metadata['max-tokens']) && metadata['max-tokens'] > 0
      ? metadata['max-tokens']
      : null,
    noProjectContext: metadata['no-project-context'] === true
  };
}

function validateAgentContract(agentPath) {
  const metadata = readAgentMetadata(agentPath);
  const contract = parseAgentBudget(agentPath);
  const errors = [];
  const hasInputs = Object.prototype.hasOwnProperty.call(metadata, 'inputs');
  const hasMaxTokens = Object.prototype.hasOwnProperty.call(metadata, 'max-tokens');
  const hasNoProjectContext = Object.prototype.hasOwnProperty.call(metadata, 'no-project-context');
  const hasRequiredContext = Object.prototype.hasOwnProperty.call(metadata, 'required-context');
  const hasOptionalContext = Object.prototype.hasOwnProperty.call(metadata, 'optional-context');

  if (typeof metadata.name !== 'string' || metadata.name.trim() === '') {
    errors.push('specialist name identifier must not be empty');
  }
  if (hasNoProjectContext && metadata['no-project-context'] !== true) {
    errors.push('no-project-context must be true when declared');
  }
  if (contract.noProjectContext) {
    if (hasInputs) errors.push('no-project-context cannot declare inputs');
    if (hasMaxTokens) errors.push('no-project-context cannot declare max-tokens');
    if (hasRequiredContext) errors.push('no-project-context cannot declare required-context');
    if (hasOptionalContext) errors.push('no-project-context cannot declare optional-context');
  } else {
    if (!Array.isArray(metadata.inputs) || metadata.inputs.length === 0) {
      errors.push('inputs must be a non-empty ordered list');
    }
    if (!Number.isFinite(metadata['max-tokens']) || metadata['max-tokens'] <= 0) {
      errors.push('max-tokens must be positive');
    }
    if (!Array.isArray(metadata['required-context'])) {
      errors.push('required-context must be an ordered list');
    }
    if (!Array.isArray(metadata['optional-context'])) {
      errors.push('optional-context must be an ordered list');
    }
    if (contract.sources.length === 0) errors.push('at least one explicit context source is required');
    if (contract.sources.length > MAX_EVIDENCE_SOURCES) {
      errors.push(`context declaration count exceeds ${MAX_EVIDENCE_SOURCES}`);
    }
  }

  const sourceStatus = new Map();
  for (const source of contract.sources) {
    if (source.kind === 'invalid') {
      errors.push(`context source ${source.declaration} must use file: or inline:`);
      continue;
    }
    if (source.key.trim() === '') {
      errors.push('source identifier must not be empty');
      continue;
    }
    if (Buffer.byteLength(source.key, 'utf8') > MAX_IDENTIFIER_BYTES) {
      errors.push(`source identifier exceeds ${MAX_IDENTIFIER_BYTES} UTF-8 bytes`);
    }
    if (sourceStatus.has(source.key) && sourceStatus.get(source.key) !== source.required) {
      errors.push(`source identifier ${source.key} cannot be both required and optional`);
    } else {
      sourceStatus.set(source.key, source.required);
    }
  }

  return {
    valid: errors.length === 0,
    mode: errors.length === 0
      ? contract.noProjectContext ? 'no-project-context' : 'bounded'
      : null,
    errors,
    contract
  };
}

function serializeInline(value) {
  if (value === undefined) return { valid: false, reason: 'invalid-inline-undefined' };
  if (Buffer.isBuffer(value)) return { valid: true, bytes: value.length };
  if (typeof value === 'string') {
    return { valid: true, bytes: Buffer.byteLength(value, 'utf8') };
  }
  const seen = new Set();
  function normalize(input) {
    if (input === null || typeof input === 'boolean') return input;
    if (typeof input === 'number') {
      if (!Number.isFinite(input)) throw new Error('unsupported');
      return input;
    }
    if (typeof input === 'undefined') throw new Error('undefined');
    if (typeof input !== 'object') throw new Error('unsupported');
    if (seen.has(input)) throw new Error('cyclic');
    if (!Array.isArray(input) && Object.getPrototypeOf(input) !== Object.prototype) {
      throw new Error('unsupported');
    }
    seen.add(input);
    let output;
    try {
      if (Array.isArray(input)) output = input.map(normalize);
      else {
        output = {};
        for (const key of Object.keys(input).sort()) output[key] = normalize(input[key]);
      }
    } finally {
      seen.delete(input);
    }
    return output;
  }
  try {
    const serialized = JSON.stringify(normalize(value));
    return { valid: true, bytes: Buffer.byteLength(serialized, 'utf8') };
  } catch (error) {
    const known = ['undefined', 'cyclic', 'unsupported'];
    const reason = known.includes(error.message) ? error.message : 'non-serializable';
    return { valid: false, reason: `invalid-inline-${reason}` };
  }
}

function isContained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function globRegex(pattern) {
  let out = '^';
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === '*' && pattern[i + 1] === '*') {
      if (pattern[i + 2] === '/') {
        out += '(?:.*/)?';
        i += 2;
      } else {
        out += '.*';
        i++;
      }
    } else if (char === '*') {
      out += '[^/]*';
    } else if (char === '?') {
      out += '[^/]';
    } else {
      out += char.replace(/[\\^$+?.()|{}[\]]/g, '\\$&');
    }
  }
  return new RegExp(`${out}$`);
}

function walkProject(root, current = root, out = [], state = { entries: 0 }) {
  const relative = path.relative(root, current);
  const depth = relative ? relative.split(path.sep).length : 0;
  if (depth > MAX_PROJECT_DEPTH) {
    throw new Error(`project traversal depth exceeds ${MAX_PROJECT_DEPTH}`);
  }
  const entries = [];
  const directory = fs.opendirSync(current);
  try {
    let entry;
    while ((entry = directory.readSync()) !== null) {
      state.entries += 1;
      if (state.entries > MAX_PROJECT_ENTRIES) {
        throw new Error(`project inventory exceeds ${MAX_PROJECT_ENTRIES} entries`);
      }
      entries.push(entry);
    }
  } finally {
    directory.closeSync();
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const file = path.join(current, entry.name);
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) walkProject(root, file, out, state);
    else if (stat.isFile()) out.push(toPosix(path.relative(root, file)));
  }
  return out;
}

function missingEvidence(declaration, reason) {
  return {
    kind: declaration.kind,
    key: declaration.key,
    required: declaration.required,
    order: declaration.order,
    reason
  };
}

function containsSymlink(root, absolute) {
  const relative = path.relative(root, absolute);
  if (!isContained(root, absolute)) return false;
  let current = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) return true;
    } catch (_) {
      return false;
    }
  }
  return false;
}

function readPinnedFile(file, declaration) {
  const noFollow = typeof fs.constants.O_NOFOLLOW === 'number' ? fs.constants.O_NOFOLLOW : 0;
  let descriptor;
  try {
    descriptor = fs.openSync(file, fs.constants.O_RDONLY | noFollow);
    const before = fs.fstatSync(descriptor, { bigint: true });
    if (!before.isFile()) return { missing: missingEvidence(declaration, 'not-file') };
    if (before.size > BigInt(MAX_SOURCE_BYTES)) {
      return { missing: missingEvidence(declaration, 'source-too-large') };
    }
    const content = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor, { bigint: true });
    const changed = ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']
      .some(key => before[key] !== after[key]);
    if (changed || BigInt(content.length) !== before.size) {
      return { missing: missingEvidence(declaration, 'changed-during-read') };
    }
    return {
      content,
      identity: {
        dev: before.dev.toString(),
        ino: before.ino.toString(),
        size: before.size.toString(),
        mtimeNs: before.mtimeNs.toString(),
        ctimeNs: before.ctimeNs.toString()
      }
    };
  } catch (error) {
    return { missing: missingEvidence(declaration, 'unreadable') };
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function fileEvidence(root, declaration, relativePath, matchOrder) {
  const absolute = path.resolve(root, relativePath);
  if (containsSymlink(root, absolute)) {
    return { missing: missingEvidence(declaration, 'symbolic-link') };
  }
  let real;
  try {
    real = fs.realpathSync(absolute);
  } catch (error) {
    return { missing: missingEvidence(declaration, 'missing') };
  }
  if (!isContained(root, real)) {
    return { missing: missingEvidence(declaration, 'outside-project') };
  }
  const pinned = readPinnedFile(real, declaration);
  if (pinned.missing) return pinned;
  return {
    source: {
      kind: 'file',
      key: declaration.key,
      path: toPosix(path.relative(root, real)),
      realPath: real,
      required: declaration.required,
      order: declaration.order,
      matchOrder,
      bytes: pinned.content.length,
      tokens: estimateTokens(pinned.content.length),
      content: pinned.content,
      identity: pinned.identity
    }
  };
}

function resolveFile(root, declaration, projectFiles) {
  const candidate = path.resolve(root, declaration.key);
  if (!isContained(root, candidate)) {
    return { sources: [], missing: [missingEvidence(declaration, 'outside-project')] };
  }
  if (/[*?]/.test(declaration.key)) {
    const relativePattern = toPosix(path.relative(root, candidate));
    const regex = globRegex(relativePattern);
    const matches = projectFiles.filter(file => regex.test(file)).sort();
    if (matches.length === 0) {
      return { sources: [], missing: [missingEvidence(declaration, 'missing')] };
    }
    const sources = [];
    const missing = [];
    matches.forEach((file, index) => {
      const result = fileEvidence(root, declaration, file, index);
      if (result.source) sources.push(result.source);
      if (result.missing) missing.push(result.missing);
    });
    return { sources, missing };
  }
  const result = fileEvidence(root, declaration, path.relative(root, candidate), 0);
  return {
    sources: result.source ? [result.source] : [],
    missing: result.missing ? [result.missing] : []
  };
}

function resolveSources(projectRoot, declarations, inlinePayloads = {}) {
  const root = fs.realpathSync(path.resolve(projectRoot));
  const sources = [];
  const missing = [];
  let projectFiles = null;
  for (const declaration of declarations || []) {
    if (declaration.kind === 'inline') {
      if (!Object.prototype.hasOwnProperty.call(inlinePayloads, declaration.key)) {
        missing.push(missingEvidence(declaration, 'missing'));
        continue;
      }
      const content = inlinePayloads[declaration.key];
      const serialized = serializeInline(content);
      if (!serialized.valid) {
        missing.push(missingEvidence(declaration, serialized.reason));
        continue;
      }
      const bytes = serialized.bytes;
      sources.push({ ...declaration, bytes, tokens: estimateTokens(bytes), content });
      continue;
    }
    if (/[*?]/.test(declaration.key) && projectFiles === null) projectFiles = walkProject(root);
    const result = resolveFile(root, declaration, projectFiles || []);
    sources.push(...result.sources);
    missing.push(...result.missing);
  }
  return { sources, missing };
}

function truncateUtf8(value, maxBytes) {
  const text = String(value);
  if (Buffer.byteLength(text, 'utf8') <= maxBytes) return text;
  let output = '';
  for (const character of text) {
    if (Buffer.byteLength(output + character, 'utf8') > maxBytes) break;
    output += character;
  }
  return output;
}

function safeGet(value, key, fallback) {
  try {
    return value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, key)
      ? value[key]
      : fallback;
  } catch (error) {
    return fallback;
  }
}

function boundedString(value) {
  return typeof value === 'string' ? truncateUtf8(value, MAX_IDENTIFIER_BYTES) : '';
}

function boundedNumber(value) {
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.min(Math.floor(value), Number.MAX_SAFE_INTEGER);
}

function boundedMeasure(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const output = {};
  for (const key of keys) {
    const number = boundedNumber(safeGet(value, key, null));
    if (number === null) return null;
    output[key] = number;
  }
  return output;
}

function boundedCountObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const output = {};
  for (const key of ['loaded', 'dropped', 'missing']) {
    const count = safeGet(value, key, null);
    if (!Number.isSafeInteger(count) || count < 0) return null;
    output[key] = count;
  }
  return output;
}

function safeArray(value) {
  try {
    return Array.isArray(value) ? value : [];
  } catch (error) {
    return [];
  }
}

function sourceEvidence(source) {
  const kind = safeGet(source, 'kind', 'unknown');
  const evidence = {
    kind: ['file', 'inline', 'contract', 'invalid'].includes(kind) ? kind : 'unknown',
    key: boundedString(safeGet(source, 'key', '')),
    required: safeGet(source, 'required', false) === true,
    order: boundedNumber(safeGet(source, 'order', null))
  };
  for (const key of ['path', 'reason']) {
    const value = safeGet(source, key, null);
    if (typeof value === 'string') evidence[key] = boundedString(value);
  }
  for (const key of ['matchOrder', 'bytes', 'tokens']) {
    const value = boundedNumber(safeGet(source, key, null));
    if (value !== null) evidence[key] = value;
  }
  return evidence;
}

function manifestFor(sources, details = {}) {
  const sourceList = safeArray(sources);
  const droppedList = safeArray(safeGet(details, 'dropped', []));
  const missingList = safeArray(safeGet(details, 'missing', []));
  const loaded = sourceList.slice(0, MAX_EVIDENCE_SOURCES).map(sourceEvidence);
  let remaining = MAX_EVIDENCE_SOURCES - loaded.length;
  const dropped = droppedList.slice(0, remaining).map(sourceEvidence);
  remaining -= dropped.length;
  const missing = missingList.slice(0, remaining).map(sourceEvidence);
  const budget = boundedMeasure(safeGet(details, 'budget', null), ['tokens']);
  const used = boundedMeasure(safeGet(details, 'used', null), ['bytes', 'tokens']);
  const sourceCounts = {
    loaded: sourceList.length,
    dropped: droppedList.length,
    missing: missingList.length
  };
  const manifest = {
    agent: boundedString(safeGet(details, 'agent', '')) || null,
    blocked: safeGet(details, 'blocked', false) === true,
    exceeded: safeGet(details, 'exceeded', false) === true,
    budget,
    used,
    loaded,
    dropped,
    missing,
    sourceCounts,
    omittedCounts: {
      loaded: sourceCounts.loaded - loaded.length,
      dropped: sourceCounts.dropped - dropped.length,
      missing: sourceCounts.missing - missing.length
    },
    truncated: loaded.length !== sourceCounts.loaded
      || dropped.length !== sourceCounts.dropped
      || missing.length !== sourceCounts.missing
  };
  return enforceManifestByteBound(manifest);
}

function enforceManifestByteBound(manifest) {
  while (Buffer.byteLength(JSON.stringify(manifest), 'utf8') > MAX_MANIFEST_BYTES) {
    if (manifest.missing.length > 0) manifest.missing.pop();
    else if (manifest.dropped.length > 0) manifest.dropped.pop();
    else if (manifest.loaded.length > 0) manifest.loaded.pop();
    else break;
    manifest.truncated = true;
    manifest.omittedCounts = {
      loaded: manifest.sourceCounts.loaded - manifest.loaded.length,
      dropped: manifest.sourceCounts.dropped - manifest.dropped.length,
      missing: manifest.sourceCounts.missing - manifest.missing.length
    };
  }
  return manifest;
}

function normalizeManifest(manifest) {
  const loaded = safeArray(safeGet(manifest, 'loaded', []));
  const dropped = safeArray(safeGet(manifest, 'dropped', []));
  const missing = safeArray(safeGet(manifest, 'missing', []));
  const normalized = manifestFor(loaded, {
    agent: safeGet(manifest, 'agent', null),
    blocked: safeGet(manifest, 'blocked', false),
    exceeded: safeGet(manifest, 'exceeded', false),
    budget: safeGet(manifest, 'budget', null),
    used: safeGet(manifest, 'used', null),
    dropped,
    missing
  });
  const sourceCounts = boundedCountObject(safeGet(manifest, 'sourceCounts', null));
  const omittedCounts = boundedCountObject(safeGet(manifest, 'omittedCounts', null));
  const consistent = sourceCounts && omittedCounts
    && sourceCounts.loaded === loaded.length + omittedCounts.loaded
    && sourceCounts.dropped === dropped.length + omittedCounts.dropped
    && sourceCounts.missing === missing.length + omittedCounts.missing;
  if (!consistent) return normalized;
  normalized.sourceCounts = sourceCounts;
  normalized.omittedCounts = {
    loaded: sourceCounts.loaded - normalized.loaded.length,
    dropped: sourceCounts.dropped - normalized.dropped.length,
    missing: sourceCounts.missing - normalized.missing.length
  };
  normalized.truncated = Object.values(normalized.omittedCounts).some(count => count > 0);
  return enforceManifestByteBound(normalized);
}

function capFor(budget, agentName, declaredMax) {
  const configured = budget && budget.perAgent && Number.isFinite(budget.perAgent[agentName])
    ? budget.perAgent[agentName]
    : budget && Number.isFinite(budget.defaultMaxTokens)
      ? budget.defaultMaxTokens
      : null;
  if (Number.isFinite(declaredMax) && declaredMax > 0 && Number.isFinite(configured) && configured > 0) {
    return Math.min(declaredMax, configured);
  }
  if (Number.isFinite(declaredMax) && declaredMax > 0) return declaredMax;
  if (Number.isFinite(configured) && configured > 0) return configured;
  return DEFAULT_MAX_TOKENS;
}

function planResolved(cap, resolved, agentName) {
  const loadout = [];
  const dropped = resolved.missing.filter(source => !source.required);
  const missing = resolved.missing.filter(source => source.required);
  let usedBytes = 0;
  for (const source of resolved.sources.filter(item => item.required)) {
    if (loadout.length >= MAX_EXECUTION_SOURCES) {
      missing.push({ ...source, reason: 'source-count-exceeded' });
      continue;
    }
    loadout.push(source);
    usedBytes += source.bytes;
  }
  const exceeded = estimateTokens(usedBytes) > cap;
  for (const source of resolved.sources.filter(item => !item.required)) {
    if (loadout.length >= MAX_EXECUTION_SOURCES) {
      dropped.push({ ...source, reason: 'source-count-exceeded' });
      continue;
    }
    if (estimateTokens(usedBytes + source.bytes) > cap) {
      dropped.push(source);
      continue;
    }
    loadout.push(source);
    usedBytes += source.bytes;
  }
  const used = { bytes: usedBytes, tokens: estimateTokens(usedBytes) };
  const blocked = missing.length > 0 || exceeded;
  const budget = { tokens: cap };
  const manifest = manifestFor(loadout, {
    agent: agentName,
    blocked,
    exceeded,
    budget,
    used,
    dropped,
    missing
  });
  return { loadout, dropped, missing, used, budget, exceeded, blocked, manifest };
}

function plan(budget, required, optional, agentName) {
  const declarations = [];
  for (const key of required || []) {
    declarations.push({ kind: 'file', key, required: true, order: declarations.length });
  }
  for (const key of optional || []) {
    declarations.push({ kind: 'file', key, required: false, order: declarations.length });
  }
  const sources = [];
  const missing = [];
  for (const declaration of declarations) {
    if (!fs.existsSync(declaration.key) || !fs.statSync(declaration.key).isFile()) {
      missing.push(missingEvidence(declaration, 'missing'));
      continue;
    }
    const bytes = fs.statSync(declaration.key).size;
    sources.push({ ...declaration, path: declaration.key, bytes, tokens: estimateTokens(bytes) });
  }
  const result = planResolved(capFor(budget, agentName, null), { sources, missing }, agentName);
  return {
    ...result,
    loadout: result.loadout.map(source => source.key),
    dropped: result.dropped.map(source => source.key),
    missing: result.missing.map(source => source.key)
  };
}

function planForAgent(projectRoot, agentPath, inlinePayloads = {}, budget = {}) {
  const validation = validateAgentContract(agentPath);
  const contract = validation.contract;
  if (validation.mode === 'no-project-context') {
    return {
      ...planResolved(0, { sources: [], missing: [] }, contract.name),
      contract,
      validation
    };
  }
  const resolved = resolveSources(projectRoot, contract.sources, inlinePayloads);
  if (!validation.valid) {
    validation.errors.slice().reverse().forEach((error, index) => {
      resolved.missing.unshift({
        kind: 'contract',
        key: error,
        required: true,
        order: -1 - index,
        reason: 'invalid-contract'
      });
    });
  }
  return {
    ...planResolved(capFor(budget, contract.name, contract.maxTokens), resolved, contract.name),
    contract,
    validation
  };
}

function loadoutSize(files) {
  let bytes = 0;
  for (const file of files || []) {
    if (!fs.existsSync(file)) continue;
    bytes += fs.statSync(file).size;
  }
  return { bytes, tokens: estimateTokens(bytes) };
}

module.exports = {
  estimateTokens,
  parseAgentBudget,
  validateAgentContract,
  resolveSources,
  plan,
  planForAgent,
  manifestFor,
  normalizeManifest,
  loadoutSize,
  BYTES_PER_TOKEN,
  DEFAULT_MAX_TOKENS,
  MAX_EXECUTION_SOURCES,
  MAX_EVIDENCE_SOURCES,
  MAX_IDENTIFIER_BYTES,
  MAX_MANIFEST_BYTES,
  MAX_SOURCE_BYTES,
  MAX_PROJECT_ENTRIES,
  MAX_PROJECT_DEPTH
};
