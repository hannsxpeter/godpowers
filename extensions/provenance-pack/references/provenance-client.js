#!/usr/bin/env node

/**
 * Dependency-free client for the watermarks-remover HTTP contract.
 *
 * The client treats file bytes and service responses as untrusted data. It
 * prints only a bounded, allowlisted summary for the calling specialist.
 *
 * Implements: P-MUST-23, P-SHOULD-08, C-provenance-client, ADR-005, ADR-006
 */

'use strict';

const crypto = require('crypto');
const dns = require('dns').promises;
const fs = require('fs');
const http = require('http');
const https = require('https');
const net = require('net');
const path = require('path');
const { TextDecoder } = require('util');

const MAX_INPUT_BYTES = 64 * 1024 * 1024;
const MAX_REPORT_NODES = 2000;
const MAX_REPORT_DEPTH = 8;
const MAX_REPORT_ARRAY = 500;
const MAX_REPORT_KEYS = 100;
const MAX_REPORT_STRING = 2048;
const STALE_TEMP_MS = 24 * 60 * 60 * 1000;
const TEMP_PREFIX = '.godpowers-provenance-';
const TEMP_NAME_PATTERN = /^\.godpowers-provenance-\d+\.[a-f0-9]{16}\.tmp$/;
const SUPPORTED_VERSION = /^v?0\.5\.\d+$/;
const SAFE_UNKNOWN_VERSION = /^[A-Za-z0-9._+-]{1,32}$/;
const KNOWN_KINDS = new Set(['text', 'image', 'container']);
const FORMAT_KINDS = new Map([
  ['', 'text'],
  ['.txt', 'text'], ['.text', 'text'], ['.css', 'text'], ['.js', 'text'],
  ['.py', 'text'], ['.rs', 'text'], ['.go', 'text'], ['.json', 'text'],
  ['.yaml', 'text'], ['.yml', 'text'], ['.toml', 'text'], ['.csv', 'text'],
  ['.png', 'image'], ['.jpg', 'image'], ['.jpeg', 'image'], ['.webp', 'image'],
  ['.avif', 'image'], ['.heic', 'image'], ['.heif', 'image'], ['.bmp', 'image'],
  ['.gif', 'image'], ['.tiff', 'image'], ['.tif', 'image'],
  ['.svg', 'container'], ['.pdf', 'container'], ['.docx', 'container'],
  ['.xlsx', 'container'], ['.pptx', 'container'], ['.odt', 'container'],
  ['.epub', 'container'], ['.html', 'container'], ['.htm', 'container'],
  ['.md', 'container'], ['.markdown', 'container'], ['.mdx', 'container']
]);
const UTF8_FORMATS = new Set([
  '', '.txt', '.text', '.css', '.js', '.py', '.rs', '.go', '.json',
  '.yaml', '.yml', '.toml', '.csv', '.svg', '.html', '.htm', '.md',
  '.markdown', '.mdx'
]);
const activeTemps = new Set();

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function parseIpv4(address) {
  const parts = String(address).split('.');
  if (parts.length !== 4) return null;
  const numbers = parts.map((part) => Number(part));
  if (numbers.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return numbers;
}

function classifyAddress(address) {
  const family = net.isIP(address);
  if (family === 4) {
    const parts = parseIpv4(address);
    const [a, b] = parts;
    if (a === 127) return 'loopback';
    if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
      return 'internal';
    }
    if (
      a === 0 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 192 && b === 0 && parts[2] === 2) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0 && parts[2] === 113) ||
      a >= 224
    ) {
      return 'special';
    }
    return 'public';
  }
  if (family === 6) {
    const normalized = String(address).toLowerCase().split('%')[0];
    if (normalized === '::1') return 'loopback';
    if (normalized === '::') return 'special';
    if (normalized.startsWith('::ffff:')) {
      return classifyAddress(normalized.slice('::ffff:'.length));
    }
    const first = Number.parseInt(normalized.split(':')[0] || '0', 16);
    if ((first & 0xfe00) === 0xfc00) return 'internal';
    if ((first & 0xffc0) === 0xfe80 || (first & 0xff00) === 0xff00) return 'special';
    return 'public';
  }
  return 'special';
}

async function defaultResolver(hostname) {
  if (net.isIP(hostname)) {
    return [{ address: hostname, family: net.isIP(hostname) }];
  }
  return dns.lookup(hostname, { all: true, verbatim: true });
}

function withTimeout(promise, timeoutMs, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function normalizedHostname(hostname) {
  const value = String(hostname || '');
  return value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1) : value;
}

function normalizeAddresses(addresses) {
  const unique = new Map();
  for (const item of addresses || []) {
    if (!item || !net.isIP(item.address)) continue;
    const family = Number(item.family) || net.isIP(item.address);
    unique.set(`${family}:${item.address}`, { address: item.address, family });
  }
  return [...unique.values()].sort((a, b) => (
    `${a.family}:${a.address}`.localeCompare(`${b.family}:${b.address}`)
  ));
}

async function resolveServiceTarget(rawUrl, opts = {}) {
  let url;
  try {
    url = new URL(rawUrl || 'http://127.0.0.1:8765');
  } catch (_) {
    throw new Error('invalid service URL');
  }
  if (url.username || url.password) throw new Error('service URL contains embedded credentials');
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('service URL must use HTTP or HTTPS');
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  url.search = '';
  url.hash = '';

  const resolver = opts.resolver || defaultResolver;
  const resolverTimeoutMs = opts.resolverTimeoutMs || 5000;
  const hostname = normalizedHostname(url.hostname);
  const addresses = normalizeAddresses(await withTimeout(
    Promise.resolve().then(() => resolver(hostname)),
    resolverTimeoutMs,
    'service DNS resolution timed out'
  ));
  if (addresses.length === 0) throw new Error('service hostname did not resolve');
  const classes = new Set(addresses.map((item) => classifyAddress(item.address)));
  const loopbackHost = classes.size === 1 && classes.has('loopback');

  if (classes.has('loopback') && !loopbackHost) {
    throw new Error('service hostname mixes loopback and non-loopback addresses');
  }
  if (!loopbackHost) {
    if (url.protocol !== 'https:') throw new Error('non-loopback service must use HTTPS');
    if (opts.approvedRemoteOrigin !== url.origin) {
      throw new Error(`exact remote origin grant is required for ${url.origin}`);
    }
  }
  if (classes.has('special')) throw new Error('service resolves to a blocked special-use address');
  if (classes.has('internal') && !loopbackHost && opts.approvedInternalOrigin !== url.origin) {
    throw new Error(`exact internal-network grant is required for ${url.origin}`);
  }
  if (loopbackHost && classes.has('public')) throw new Error('loopback hostname resolved outside loopback');

  return {
    url,
    origin: url.origin,
    hostname,
    addresses,
    resolver,
    resolverTimeoutMs,
    loopback: loopbackHost,
    approvedRemoteOrigin: opts.approvedRemoteOrigin || null,
    approvedInternalOrigin: opts.approvedInternalOrigin || null
  };
}

function addressFingerprint(addresses) {
  return normalizeAddresses(addresses).map((item) => `${item.family}:${item.address}`).join(',');
}

async function refreshTarget(target) {
  const current = normalizeAddresses(await withTimeout(
    Promise.resolve().then(() => target.resolver(target.hostname)),
    target.resolverTimeoutMs,
    'service DNS resolution timed out'
  ));
  if (addressFingerprint(current) !== addressFingerprint(target.addresses)) {
    throw new Error('service DNS resolution changed during the invocation');
  }
  return current[0];
}

async function requestBuffer(target, endpoint, opts = {}) {
  const timeoutMs = opts.timeoutMs || 15000;
  const connectTimeoutMs = Math.min(opts.connectTimeoutMs || 5000, timeoutMs);
  const deadline = Date.now() + timeoutMs;
  const chosen = await withTimeout(
    refreshTarget(target),
    connectTimeoutMs,
    'service connection resolution timed out'
  );

  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, target.url);
    if (url.origin !== target.origin) {
      reject(new Error('endpoint escaped the consented origin'));
      return;
    }
    const transport = url.protocol === 'https:' ? https : http;
    const body = opts.body || null;
    const headers = { accept: 'application/json', ...(opts.headers || {}) };
    if (body) {
      headers['content-type'] = 'application/json';
      headers['content-length'] = String(body.length);
    }
    const token = process.env.WATERMARKS_SERVICE_API_KEY || '';
    if (token && (!/^[\x21-\x7e]{1,4096}$/.test(token))) {
      reject(new Error('service API key contains invalid characters'));
      return;
    }
    if (token) headers.authorization = `Bearer ${token}`;

    let request;
    let settled = false;
    let connectionTimer = null;
    let deadlineTimer = null;
    const clearTimers = () => {
      if (connectionTimer) clearTimeout(connectionTimer);
      if (deadlineTimer) clearTimeout(deadlineTimer);
    };
    const finishReject = (error) => {
      if (settled) return;
      settled = true;
      clearTimers();
      reject(new Error(error && error.message ? error.message : 'service request failed'));
    };
    try {
      request = transport.request({
        protocol: url.protocol,
        hostname: target.hostname,
        port: url.port || undefined,
        method: opts.method || 'GET',
        path: `${url.pathname}${url.search}`,
        headers,
        servername: net.isIP(target.hostname) ? undefined : target.hostname,
        lookup(_hostname, _lookupOpts, callback) {
          callback(null, chosen.address, chosen.family);
        }
      });
    } catch (_) {
      finishReject(new Error('service request could not be constructed'));
      return;
    }
    const remainingMs = Math.max(1, deadline - Date.now());
    deadlineTimer = setTimeout(() => {
      request.destroy(new Error(`service request exceeded ${timeoutMs} ms deadline`));
    }, remainingMs);
    request.on('socket', (socket) => {
      if (!socket.connecting) return;
      const connectedEvent = socket.encrypted ? 'secureConnect' : 'connect';
      connectionTimer = setTimeout(() => {
        request.destroy(new Error(`service connection exceeded ${connectTimeoutMs} ms deadline`));
      }, Math.min(connectTimeoutMs, remainingMs));
      socket.once(connectedEvent, () => {
        if (connectionTimer) clearTimeout(connectionTimer);
        connectionTimer = null;
      });
    });
    request.on('error', finishReject);
    request.on('response', (response) => {
      const status = response.statusCode || 0;
      if (status >= 300 && status < 400) {
        response.resume();
        finishReject(new Error(`service redirect rejected for ${endpoint}`));
        return;
      }
      if (status < 200 || status >= 300) {
        response.resume();
        finishReject(new Error(`service returned HTTP ${status} for ${endpoint}`));
        return;
      }
      const contentType = String(response.headers['content-type'] || '').toLowerCase();
      if (!contentType.includes('application/json')) {
        response.resume();
        finishReject(new Error(`service returned non-JSON content for ${endpoint}`));
        return;
      }
      const maxBytes = opts.maxBytes || 1024 * 1024;
      const declared = Number(response.headers['content-length']);
      if (Number.isFinite(declared) && declared > maxBytes) {
        response.destroy();
        finishReject(new Error(`service response exceeded byte limit for ${endpoint}`));
        return;
      }
      const chunks = [];
      let total = 0;
      response.on('data', (chunk) => {
        total += chunk.length;
        if (total > maxBytes) {
          response.destroy(new Error('service response exceeded byte limit'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('error', finishReject);
      response.on('aborted', () => finishReject(new Error('service response ended unexpectedly')));
      response.on('end', () => {
        if (settled) return;
        settled = true;
        clearTimers();
        resolve(Buffer.concat(chunks, total));
      });
    });
    if (body) request.end(body);
    else request.end();
  });
}

async function requestJson(target, endpoint, opts = {}) {
  const raw = await requestBuffer(target, endpoint, opts);
  let parsed;
  try {
    parsed = JSON.parse(raw.toString('utf8'));
  } catch (_) {
    throw new Error(`service returned malformed JSON for ${endpoint}`);
  }
  if (!isPlainObject(parsed)) throw new Error(`service returned invalid object for ${endpoint}`);
  return parsed;
}

function validateReportBounds(value) {
  let nodes = 0;
  const visit = (current, depth) => {
    nodes += 1;
    if (nodes > MAX_REPORT_NODES) throw new Error('service report has too many values');
    if (depth > MAX_REPORT_DEPTH) throw new Error('service report is nested too deeply');
    if (current === null || typeof current === 'boolean') return;
    if (typeof current === 'number') {
      if (!Number.isFinite(current)) throw new Error('service report contains a non-finite number');
      return;
    }
    if (typeof current === 'string') {
      if (Buffer.byteLength(current, 'utf8') > MAX_REPORT_STRING) {
        throw new Error('service report string exceeds limit');
      }
      return;
    }
    if (Array.isArray(current)) {
      if (current.length > MAX_REPORT_ARRAY) throw new Error('service report array exceeds limit');
      for (const item of current) visit(item, depth + 1);
      return;
    }
    if (!isPlainObject(current)) throw new Error('service report contains an unsupported value');
    const keys = Object.keys(current);
    if (keys.length > MAX_REPORT_KEYS) throw new Error('service report object exceeds key limit');
    for (const key of keys) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) {
        throw new Error('service report contains an unsafe key');
      }
      visit(current[key], depth + 1);
    }
  };
  visit(value, 0);
  return true;
}

function decodeCanonicalBase64(value, maxDecodedBytes) {
  if (typeof value !== 'string') throw new Error('cleaned payload is not base64 text');
  if (value.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error('cleaned payload is not canonical base64');
  }
  const decoded = Buffer.from(value, 'base64');
  if (decoded.length > maxDecodedBytes) throw new Error('decoded output exceeds size limit');
  if (decoded.toString('base64') !== value) throw new Error('cleaned payload failed canonical base64 check');
  return decoded;
}

function validateServiceResponse(response, expectsCleaned) {
  if (response.ok !== true) throw new Error('service response did not confirm success');
  if (!KNOWN_KINDS.has(response.kind)) throw new Error('service response has unknown content kind');
  if (!isPlainObject(response.report)) throw new Error('service response has invalid report');
  validateReportBounds(response.report);
  if (expectsCleaned && typeof response.cleaned !== 'string') {
    throw new Error('service response omitted cleaned payload');
  }
}

function ensureSupportedService(health, allowUnknown) {
  if (health.ok !== true || typeof health.version !== 'string') {
    throw new Error('service health response is invalid');
  }
  if (!SAFE_UNKNOWN_VERSION.test(health.version)) throw new Error('service version is malformed');
  if (!SUPPORTED_VERSION.test(health.version) && !allowUnknown) {
    throw new Error('service version is unsupported; explicit unknown-service approval is required');
  }
}

function validateOpenApi(document) {
  if (document.openapi !== '3.0.3' || !isPlainObject(document.paths)) {
    throw new Error('service OpenAPI contract is invalid');
  }
  for (const [endpoint, method] of [
    ['/health', 'get'],
    ['/capabilities', 'get'],
    ['/inspect', 'post'],
    ['/clean', 'post']
  ]) {
    if (!isPlainObject(document.paths[endpoint]) || !isPlainObject(document.paths[endpoint][method])) {
      throw new Error(`service OpenAPI contract omitted ${method.toUpperCase()} ${endpoint}`);
    }
  }
}

function sanitizeCapabilities(value) {
  const group = (name, keys) => {
    const source = isPlainObject(value[name]) ? value[name] : {};
    return Object.fromEntries(keys.map((key) => [key, source[key] === true]));
  };
  return {
    tools: group('tools', ['c2patool', 'exiftool', 'qpdf']),
    pixelBackends: group('pixel_backends', ['ctrlregen', 'diffusion']),
    scorers: group('scorers', ['synthid', 'stylometry']),
    harnesses: group('harnesses', ['markllm'])
  };
}

function walkReport(value, visitor, depth = 0) {
  if (depth > MAX_REPORT_DEPTH) return;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, MAX_REPORT_ARRAY)) walkReport(item, visitor, depth + 1);
  } else if (isPlainObject(value)) {
    for (const [key, item] of Object.entries(value).slice(0, MAX_REPORT_KEYS)) {
      visitor(key, item);
      walkReport(item, visitor, depth + 1);
    }
  }
}

function sanitizeInspection(response) {
  const counts = { confirmed: 0, probable: 0, informational: 0, likelyFalsePositive: 0 };
  walkReport(response.report, (key, value) => {
    if (key !== 'confidence' || typeof value !== 'string') return;
    if (value === 'confirmed') counts.confirmed += 1;
    else if (value === 'probable') counts.probable += 1;
    else if (value === 'informational') counts.informational += 1;
    else if (value === 'likely_false_positive') counts.likelyFalsePositive += 1;
  });
  return { suspicious: response.suspicious === true, ...counts };
}

function sanitizeClean(response) {
  const result = { removedCount: 0, replacedCount: 0, actionCount: 0, residual: false, degraded: false };
  walkReport(response.report, (key, value) => {
    if (key === 'removed_count' && Number.isSafeInteger(value) && value >= 0) result.removedCount += value;
    if (key === 'replaced_count' && Number.isSafeInteger(value) && value >= 0) result.replacedCount += value;
    if (key === 'actions' && Array.isArray(value)) result.actionCount += value.length;
    if (['still_has_c2pa', 'still_has_ai_metadata', 'residual'].includes(key) && value === true) result.residual = true;
    if (key === 'degraded' && value === true) result.degraded = true;
  });
  return result;
}

function safeOpenInput(inputPath) {
  const resolved = path.resolve(inputPath);
  const before = fs.lstatSync(resolved);
  if (before.isSymbolicLink()) throw new Error('input symlinks are not allowed');
  if (!before.isFile()) throw new Error('input must be a regular file');
  if (before.size > MAX_INPUT_BYTES) throw new Error(`input exceeds ${MAX_INPUT_BYTES} byte client limit`);
  const noFollow = fs.constants.O_NOFOLLOW || 0;
  const fd = fs.openSync(resolved, fs.constants.O_RDONLY | noFollow);
  try {
    const opened = fs.fstatSync(fd);
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) {
      throw new Error('input changed while it was being opened');
    }
    const data = fs.readFileSync(fd);
    const after = fs.fstatSync(fd);
    if (!sameIdentity(opened, after)) {
      throw new Error('input changed while it was being read');
    }
    const expectedKind = validateInputFormat(resolved, data);
    return { path: resolved, data, identity: after, expectedKind };
  } finally {
    fs.closeSync(fd);
  }
}

function defaultOutputPath(inputPath) {
  const parsed = path.parse(inputPath);
  if (parsed.ext) return path.join(parsed.dir, `${parsed.name}.cleaned${parsed.ext}`);
  return path.join(parsed.dir, `${parsed.base}.cleaned`);
}

function destinationSnapshot(destination, overwrite, inPlace, inputIdentity) {
  try {
    const stat = fs.lstatSync(destination);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('destination must not be a symlink or special file');
    const aliasesInput = stat.dev === inputIdentity.dev && stat.ino === inputIdentity.ino;
    if (!inPlace && aliasesInput) throw new Error('destination aliases the input; use --in-place');
    if (!overwrite && !inPlace) throw new Error('destination already exists; explicit overwrite approval is required');
    if (inPlace && !sameIdentity(stat, inputIdentity)) {
      throw new Error('in-place input changed after it was opened');
    }
    return stat;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function createExclusiveFile(filePath, data) {
  const noFollow = fs.constants.O_NOFOLLOW || 0;
  const fd = fs.openSync(
    filePath,
    fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | noFollow,
    0o600
  );
  try {
    fs.writeFileSync(fd, data);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function sameIdentity(left, right) {
  return Boolean(
    left &&
    right &&
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs
  );
}

function sameNode(left, right) {
  return Boolean(left && right && left.dev === right.dev && left.ino === right.ino);
}

function readDestinationSnapshot(destination) {
  try {
    return fs.lstatSync(destination);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function prepareOutputPlan(input, outputPath, opts = {}) {
  const destination = path.resolve(outputPath);
  const parent = path.dirname(destination);
  fs.mkdirSync(parent, { recursive: true });
  const parentIdentity = fs.lstatSync(parent);
  if (parentIdentity.isSymbolicLink() || !parentIdentity.isDirectory()) {
    throw new Error('output parent must be a real directory, not a symlink');
  }
  return {
    destination,
    parent,
    parentRealPath: fs.realpathSync(parent),
    parentIdentity,
    destinationIdentity: destinationSnapshot(
      destination,
      opts.overwrite,
      opts.inPlace,
      input.identity
    )
  };
}

function assertOutputPlanUnchanged(plan) {
  const parent = fs.lstatSync(plan.parent);
  if (
    parent.isSymbolicLink() ||
    !parent.isDirectory() ||
    !sameNode(parent, plan.parentIdentity) ||
    fs.realpathSync(plan.parent) !== plan.parentRealPath
  ) {
    throw new Error('output parent changed after preflight');
  }
  const destination = readDestinationSnapshot(plan.destination);
  if (plan.destinationIdentity === null && destination !== null) {
    throw new Error('destination appeared after preflight');
  }
  if (plan.destinationIdentity !== null && !sameIdentity(plan.destinationIdentity, destination)) {
    throw new Error('destination changed after preflight');
  }
}

function sameFileVersion(left, right) {
  return Boolean(
    sameNode(left, right) &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs
  );
}

function restoreRecovery(recovery, destination) {
  try {
    fs.linkSync(recovery, destination);
    fs.unlinkSync(recovery);
    return null;
  } catch (_) {
    return recovery;
  }
}

function publishGuardedReplacement(plan, temporary) {
  const recovery = path.join(
    plan.parent,
    `.godpowers-provenance-recovery-${process.pid}.${crypto.randomBytes(8).toString('hex')}.bak`
  );
  assertOutputPlanUnchanged(plan);
  fs.renameSync(plan.destination, recovery);
  const displaced = fs.lstatSync(recovery);
  if (!sameFileVersion(plan.destinationIdentity, displaced)) {
    const retained = restoreRecovery(recovery, plan.destination);
    throw new Error(
      retained
        ? `destination changed during guarded replacement; recovery retained at ${retained}`
        : 'destination changed during guarded replacement and was restored'
    );
  }
  try {
    fs.linkSync(temporary, plan.destination);
  } catch (error) {
    const retained = restoreRecovery(recovery, plan.destination);
    throw new Error(
      retained
        ? `guarded replacement failed; prior destination retained at ${retained}`
        : `guarded replacement failed and prior destination was restored: ${error.message}`
    );
  }
  try {
    fs.unlinkSync(recovery);
    return null;
  } catch (_) {
    return recovery;
  }
}

function cleanupStaleTemps(directory, excludedPaths = []) {
  const now = Date.now();
  const uid = typeof process.getuid === 'function' ? process.getuid() : null;
  const excluded = new Set(excludedPaths.map((item) => path.resolve(item)));
  let entries = [];
  try {
    entries = fs.readdirSync(directory);
  } catch (_) {
    return;
  }
  for (const name of entries) {
    if (!TEMP_NAME_PATTERN.test(name)) continue;
    const candidate = path.join(directory, name);
    if (excluded.has(path.resolve(candidate))) continue;
    try {
      const stat = fs.lstatSync(candidate);
      if (stat.isSymbolicLink() || !stat.isFile()) continue;
      if (uid !== null && stat.uid !== uid) continue;
      if ((stat.mode & 0o077) !== 0) continue;
      if (now - stat.mtimeMs < STALE_TEMP_MS) continue;
      fs.unlinkSync(candidate);
    } catch (_) {
      // A concurrent process may own or remove the candidate.
    }
  }
}

function expectedKindForPath(inputPath) {
  const extension = path.extname(inputPath).toLowerCase();
  if (!FORMAT_KINDS.has(extension)) {
    throw new Error(`unsupported input extension: ${extension || '<none>'}`);
  }
  return { extension, kind: FORMAT_KINDS.get(extension) };
}

function hasZipEndRecord(output) {
  const minimum = Math.max(0, output.length - 65557);
  return output.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])) >= minimum;
}

function validateBytesForExtension(extension, output) {
  if (output.length === 0) {
    if (FORMAT_KINDS.get(extension) === 'text') return;
    throw new Error('cleaned output is unexpectedly empty');
  }
  const starts = (...bytes) => bytes.every((value, index) => output[index] === value);
  if (UTF8_FORMATS.has(extension)) {
    new TextDecoder('utf-8', { fatal: true }).decode(output);
    return;
  }
  const valid = {
    '.png': () => starts(0x89, 0x50, 0x4e, 0x47),
    '.jpg': () => starts(0xff, 0xd8),
    '.jpeg': () => starts(0xff, 0xd8),
    '.webp': () => output.slice(0, 4).toString('ascii') === 'RIFF' && output.slice(8, 12).toString('ascii') === 'WEBP',
    '.gif': () => ['GIF87a', 'GIF89a'].includes(output.slice(0, 6).toString('ascii')),
    '.bmp': () => output.slice(0, 2).toString('ascii') === 'BM',
    '.tif': () => starts(0x49, 0x49, 0x2a, 0x00) || starts(0x4d, 0x4d, 0x00, 0x2a),
    '.tiff': () => starts(0x49, 0x49, 0x2a, 0x00) || starts(0x4d, 0x4d, 0x00, 0x2a),
    '.pdf': () => output.slice(0, 5).toString('ascii') === '%PDF-',
    '.docx': () => starts(0x50, 0x4b, 0x03, 0x04) && hasZipEndRecord(output),
    '.xlsx': () => starts(0x50, 0x4b, 0x03, 0x04) && hasZipEndRecord(output),
    '.pptx': () => starts(0x50, 0x4b, 0x03, 0x04) && hasZipEndRecord(output),
    '.odt': () => starts(0x50, 0x4b, 0x03, 0x04) && hasZipEndRecord(output),
    '.epub': () => starts(0x50, 0x4b, 0x03, 0x04) && hasZipEndRecord(output),
    '.avif': () => output.slice(4, 8).toString('ascii') === 'ftyp',
    '.heic': () => output.slice(4, 8).toString('ascii') === 'ftyp',
    '.heif': () => output.slice(4, 8).toString('ascii') === 'ftyp'
  }[extension];
  if (!valid || !valid()) throw new Error('content bytes failed format validation');
}

function validateInputFormat(inputPath, input) {
  const expected = expectedKindForPath(inputPath);
  validateBytesForExtension(expected.extension, input);
  return expected.kind;
}

function validateDecodedFormat(inputPath, kind, output) {
  const expected = expectedKindForPath(inputPath);
  if (kind !== expected.kind) {
    throw new Error(`service kind ${kind} does not match ${expected.extension || '<none>'}`);
  }
  validateBytesForExtension(expected.extension, output);
}

function installSignalCleanup() {
  const cleanup = () => {
    for (const candidate of activeTemps) {
      try { fs.unlinkSync(candidate); } catch (_) { /* already absent */ }
    }
  };
  process.once('exit', cleanup);
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      cleanup();
      process.exit(128 + (signal === 'SIGINT' ? 2 : 15));
    });
  }
}

function writeOutputSafely(input, plan, data, opts = {}) {
  const { destination, parent, destinationIdentity } = plan;
  assertOutputPlanUnchanged(plan);
  cleanupStaleTemps(parent, [destination, input.path]);
  assertOutputPlanUnchanged(plan);
  let backup = null;
  if (opts.inPlace) {
    backup = `${destination}.bak.${Date.now()}.${crypto.randomBytes(4).toString('hex')}`;
    createExclusiveFile(backup, input.data);
  }
  const temporary = path.join(
    parent,
    `${TEMP_PREFIX}${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`
  );
  activeTemps.add(temporary);
  try {
    createExclusiveFile(temporary, data);
    assertOutputPlanUnchanged(plan);
    if (destinationIdentity === null) {
      fs.linkSync(temporary, destination);
      try {
        fs.unlinkSync(temporary);
        activeTemps.delete(temporary);
      } catch (_) {
        // Exit cleanup or the stale-temp sweep removes a leftover hard link.
      }
    } else {
      const recovery = publishGuardedReplacement(plan, temporary);
      try {
        fs.unlinkSync(temporary);
        activeTemps.delete(temporary);
      } catch (_) {
        // Exit cleanup or the stale-temp sweep removes a leftover hard link.
      }
      return { output: destination, backup, recovery };
    }
    return { output: destination, backup, recovery: null };
  } catch (error) {
    try { fs.unlinkSync(temporary); } catch (_) { /* already absent */ }
    activeTemps.delete(temporary);
    throw error;
  }
}

function parseArgs(argv) {
  const mode = argv[0];
  if (!['inspect', 'clean'].includes(mode)) throw new Error('usage: provenance-client.js inspect|clean --input PATH');
  const opts = { mode, overwrite: false, inPlace: false };
  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextValue = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`missing value after ${arg}`);
      return argv[index];
    };
    if (arg === '--input') opts.input = nextValue();
    else if (arg === '--output') opts.output = nextValue();
    else if (arg === '--overwrite') opts.overwrite = true;
    else if (arg === '--in-place') opts.inPlace = true;
    else if (arg === '--approve-remote-origin') opts.approvedRemoteOrigin = nextValue();
    else if (arg === '--approve-internal-origin') opts.approvedInternalOrigin = nextValue();
    else if (arg === '--allow-unknown-service') opts.allowUnknownService = true;
    else if (arg === '--keep-non-ai-metadata') opts.keepNonAiMetadata = true;
    else if (arg === '--remove-pixel') opts.removePixel = nextValue();
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!opts.input) throw new Error('--input is required');
  if (mode === 'inspect' && (opts.output || opts.inPlace || opts.overwrite || opts.removePixel)) {
    throw new Error('inspect mode does not accept output or cleaning options');
  }
  if (opts.inPlace && opts.output) throw new Error('--in-place and --output are mutually exclusive');
  if (opts.approvedInternalOrigin && !opts.approvedRemoteOrigin) {
    throw new Error('--approve-internal-origin requires --approve-remote-origin');
  }
  if (opts.removePixel && !['ctrlregen', 'diffusion'].includes(opts.removePixel)) {
    throw new Error('unsupported pixel backend');
  }
  return opts;
}

async function run(argv) {
  const opts = parseArgs(argv);
  const input = safeOpenInput(opts.input);
  const outputPath = opts.inPlace ? input.path : path.resolve(opts.output || defaultOutputPath(input.path));
  const outputPlan = opts.mode === 'clean'
    ? prepareOutputPlan(input, outputPath, opts)
    : null;

  const target = await resolveServiceTarget(
    process.env.WATERMARKS_SERVICE_URL || 'http://127.0.0.1:8765',
    {
      approvedRemoteOrigin: opts.approvedRemoteOrigin,
      approvedInternalOrigin: opts.approvedInternalOrigin
    }
  );
  const health = await requestJson(target, '/health', { maxBytes: 64 * 1024, timeoutMs: 15000 });
  ensureSupportedService(health, opts.allowUnknownService);
  const capabilitiesRaw = await requestJson(target, '/capabilities', {
    maxBytes: 256 * 1024,
    timeoutMs: 15000
  });
  if (capabilitiesRaw.ok !== true) throw new Error('service capabilities response is invalid');
  const capabilities = sanitizeCapabilities(capabilitiesRaw);
  const openApi = await requestJson(target, '/openapi.json', { maxBytes: 512 * 1024, timeoutMs: 15000 });
  validateOpenApi(openApi);

  if (opts.removePixel && !capabilities.pixelBackends[opts.removePixel]) {
    throw new Error(`requested pixel backend is unavailable: ${opts.removePixel}`);
  }
  const envelope = {
    file: input.data.toString('base64'),
    name: path.basename(input.path)
  };
  const inspectBody = Buffer.from(JSON.stringify(envelope));
  const inspected = await requestJson(target, '/inspect', {
    method: 'POST',
    body: inspectBody,
    maxBytes: 1024 * 1024,
    timeoutMs: 120000
  });
  validateServiceResponse(inspected, false);
  if (inspected.kind !== input.expectedKind) {
    throw new Error(`service kind ${inspected.kind} does not match the validated input format`);
  }
  const inspection = sanitizeInspection(inspected);
  if (opts.mode === 'inspect') {
    return {
      ok: true,
      mode: 'inspect',
      service: { origin: target.origin, version: health.version },
      kind: inspected.kind,
      capabilities,
      inspection
    };
  }

  const options = {};
  if (opts.keepNonAiMetadata) options.keep_non_ai_metadata = true;
  if (opts.removePixel) options.remove_pixel = opts.removePixel;
  const cleanBody = Buffer.from(JSON.stringify({ ...envelope, options }));
  const decodedLimit = Math.min(
    128 * 1024 * 1024,
    Math.max(1024 * 1024, input.data.length * 2 + 64 * 1024)
  );
  const responseLimit = Math.ceil(decodedLimit * 4 / 3) + 1024 * 1024;
  const cleaned = await requestJson(target, '/clean', {
    method: 'POST',
    body: cleanBody,
    maxBytes: responseLimit,
    timeoutMs: opts.removePixel ? 30 * 60 * 1000 : 120000
  });
  validateServiceResponse(cleaned, true);
  if (cleaned.kind !== inspected.kind) throw new Error('service changed the detected content kind');
  const decoded = decodeCanonicalBase64(cleaned.cleaned, decodedLimit);
  validateDecodedFormat(input.path, cleaned.kind, decoded);
  const written = writeOutputSafely(input, outputPlan, decoded, {
    overwrite: opts.overwrite,
    inPlace: opts.inPlace
  });
  return {
    ok: true,
    mode: 'clean',
    service: { origin: target.origin, version: health.version },
    kind: cleaned.kind,
    output: written.output,
    backup: written.backup,
    recovery: written.recovery,
    capabilities,
    inspection,
    clean: sanitizeClean(cleaned)
  };
}

installSignalCleanup();

if (require.main === module) {
  run(process.argv.slice(2))
    .then((summary) => {
      process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    })
    .catch((error) => {
      process.stderr.write(`provenance client failed: ${error.message}\n`);
      process.exitCode = 1;
    });
}

module.exports = {
  MAX_INPUT_BYTES,
  classifyAddress,
  cleanupStaleTemps,
  decodeCanonicalBase64,
  requestBuffer,
  resolveServiceTarget,
  run,
  validateReportBounds,
  validateDecodedFormat,
  validateInputFormat
};
