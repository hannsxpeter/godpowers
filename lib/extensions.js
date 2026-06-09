/**
 * Extensions Manager
 *
 * Install, list, info, remove godpowers extension packs. Validates each
 * manifest against schema/extension-manifest.v1.json. Enforces a
 * capability handshake: an extension's `engines.godpowers` range must
 * include the running godpowers version, or install is rejected.
 *
 * Extensions live under `<runtime>/godpowers-extensions/<pack-name>/`.
 * Each pack has a `manifest.yaml`, plus copies of its agents/, skills/,
 * workflows/, and any have-nots additions. Lazy activation means the
 * pack's content is not loaded by the orchestrator until a skill from
 * the pack is invoked.
 *
 * Public API:
 *   extensionsDir(runtimeConfigDir) -> string
 *   parseManifest(yamlText) -> { manifest, errors }
 *   validateManifest(manifest, godpowersVersion) -> errors[]
 *   list(runtimeConfigDir) -> [{ name, version, path }]
 *   info(runtimeConfigDir, packName) -> { manifest, ... }
 *   install(runtimeConfigDir, sourceDir, godpowersVersion) -> { installed, path }
 *   remove(runtimeConfigDir, packName) -> { removed, path }
 *   isCompatible(range, version) -> bool
 */

const fs = require('fs');
const path = require('path');

const intentLib = require('./intent'); // reuses parseSimpleYaml
const { copyRecursive } = require('./installer-files');

function extensionsDir(runtimeConfigDir) {
  return path.join(runtimeConfigDir, 'godpowers-extensions');
}

/**
 * Parse an extension manifest YAML. Returns { manifest, errors }.
 */
function parseManifest(yamlText) {
  if (typeof yamlText !== 'string' || !yamlText.trim()) {
    return { manifest: null, errors: ['empty manifest'] };
  }
  try {
    const parsed = intentLib.parseSimpleYamlWithDiagnostics(yamlText, {
      strict: true,
      source: 'manifest.yaml',
      unsafeKeySeverity: 'error'
    });
    if (parsed.diagnostics.length > 0) {
      return {
        manifest: null,
        errors: parsed.diagnostics.map(intentLib.formatDiagnostic)
      };
    }
    return { manifest: parsed.data, errors: [] };
  } catch (e) {
    return { manifest: null, errors: ['parse error: ' + e.message] };
  }
}

/**
 * Validate manifest shape + compatibility.
 */
function validateManifest(manifest, godpowersVersion) {
  const errors = [];
  if (!manifest) return ['null manifest'];
  if (manifest.apiVersion !== 'godpowers/v1') {
    errors.push("apiVersion must be 'godpowers/v1'");
  }
  if (manifest.kind !== 'Extension') {
    errors.push("kind must be 'Extension'");
  }
  if (!manifest.metadata || !manifest.metadata.name) {
    errors.push('metadata.name required');
  } else if (!/^@[a-z0-9-]+\/[a-z0-9-]+$/.test(manifest.metadata.name)) {
    errors.push(`metadata.name must be scoped npm-style; got '${manifest.metadata.name}'`);
  }
  if (!manifest.metadata || !manifest.metadata.version) {
    errors.push('metadata.version required');
  } else if (!/^\d+\.\d+\.\d+$/.test(manifest.metadata.version)) {
    errors.push(`metadata.version must be SemVer; got '${manifest.metadata.version}'`);
  }
  if (!manifest.engines || !manifest.engines.godpowers) {
    errors.push('engines.godpowers required');
  } else if (godpowersVersion && !isCompatible(manifest.engines.godpowers, godpowersVersion)) {
    errors.push(`engines.godpowers '${manifest.engines.godpowers}' does not satisfy running godpowers ${godpowersVersion}`);
  }
  if (!manifest.provides) {
    errors.push('provides required');
  }
  return errors;
}

/**
 * Minimal SemVer range check. Supports:
 *   '>=X.Y.Z'
 *   '>=X.Y.Z <A.B.C'
 *   '^X.Y.Z'
 *   '~X.Y.Z'
 *   'X.Y.Z' (exact)
 *
 * Returns true if version satisfies range.
 */
function isCompatible(range, version) {
  if (!range || !version) return false;
  const v = parseSemver(version);
  if (!v) return false;
  const r = range.trim();

  // Exact
  if (/^\d+\.\d+\.\d+$/.test(r)) {
    return r === version;
  }
  // ^X.Y.Z -> >=X.Y.Z <X+1.0.0  (X>0) or >=0.Y.Z <0.Y+1.0  (X==0, Y>0) or =0.0.Z
  if (r.startsWith('^')) {
    const base = parseSemver(r.slice(1));
    if (!base) return false;
    if (base.major > 0) {
      return cmp(v, base) >= 0 && v.major === base.major;
    }
    if (base.minor > 0) {
      return cmp(v, base) >= 0 && v.major === 0 && v.minor === base.minor;
    }
    return cmp(v, base) === 0;
  }
  if (r.startsWith('~')) {
    const base = parseSemver(r.slice(1));
    if (!base) return false;
    return cmp(v, base) >= 0 && v.major === base.major && v.minor === base.minor;
  }
  // Combined: '>=X.Y.Z <A.B.C'
  const parts = r.split(/\s+/);
  return parts.every(p => satisfiesSingle(v, p));
}

function satisfiesSingle(v, expr) {
  const m = expr.match(/^(>=|<=|>|<|=)?(\d+\.\d+\.\d+)$/);
  if (!m) return false;
  const op = m[1] || '=';
  const target = parseSemver(m[2]);
  const c = cmp(v, target);
  switch (op) {
    case '>=': return c >= 0;
    case '<=': return c <= 0;
    case '>':  return c > 0;
    case '<':  return c < 0;
    case '=':  return c === 0;
  }
  return false;
}

function parseSemver(s) {
  const m = String(s).match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

function cmp(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

/**
 * Read all installed extensions in the runtime.
 */
function list(runtimeConfigDir) {
  const dir = extensionsDir(runtimeConfigDir);
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const scope of fs.readdirSync(dir)) {
    const scopePath = path.join(dir, scope);
    const scopeStat = fs.lstatSync(scopePath);
    if (scopeStat.isSymbolicLink() || !scopeStat.isDirectory()) continue;
    if (!scope.startsWith('@')) continue;
    for (const name of fs.readdirSync(scopePath)) {
      const packDir = path.join(scopePath, name);
      const packStat = fs.lstatSync(packDir);
      if (packStat.isSymbolicLink() || !packStat.isDirectory()) continue;
      const manifestFile = path.join(packDir, 'manifest.yaml');
      if (!fs.existsSync(manifestFile)) continue;
      const { manifest } = parseManifest(fs.readFileSync(manifestFile, 'utf8'));
      if (!manifest) continue;
      results.push({
        name: manifest.metadata && manifest.metadata.name,
        version: manifest.metadata && manifest.metadata.version,
        path: packDir
      });
    }
  }
  return results;
}

/**
 * Info on a single installed extension by name (e.g. '@godpowers/security-pack').
 */
function info(runtimeConfigDir, packName) {
  const all = list(runtimeConfigDir);
  return all.find(e => e.name === packName) || null;
}

/**
 * Install an extension from a source directory.
 *
 * sourceDir must contain manifest.yaml. The pack contents (agents,
 * skills, workflows) are copied under
 * <runtime>/godpowers-extensions/<name>/.
 *
 * Returns { installed: true, path } or throws on incompatibility.
 */
function install(runtimeConfigDir, sourceDir, godpowersVersion) {
  const manifestFile = path.join(sourceDir, 'manifest.yaml');
  if (!fs.existsSync(manifestFile)) {
    throw new Error(`no manifest.yaml at ${sourceDir}`);
  }
  const { manifest, errors: parseErrors } = parseManifest(
    fs.readFileSync(manifestFile, 'utf8')
  );
  if (parseErrors.length > 0) {
    throw new Error('manifest parse: ' + parseErrors.join('; '));
  }
  const errors = validateManifest(manifest, godpowersVersion);
  if (errors.length > 0) {
    throw new Error('manifest invalid: ' + errors.join('; '));
  }

  const destDir = path.join(extensionsDir(runtimeConfigDir), manifest.metadata.name);
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(destDir, { recursive: true });

  // Copy manifest + standard pack subdirs if they exist
  fs.copyFileSync(manifestFile, path.join(destDir, 'manifest.yaml'));
  for (const sub of ['agents', 'skills', 'workflows', 'references']) {
    const src = path.join(sourceDir, sub);
    if (fs.existsSync(src)) {
      copyRecursive(src, path.join(destDir, sub));
    }
  }
  return { installed: true, path: destDir, manifest };
}

/**
 * Remove an installed extension by name.
 */
function remove(runtimeConfigDir, packName) {
  const e = info(runtimeConfigDir, packName);
  if (!e) return { removed: false, reason: 'not-installed' };
  fs.rmSync(e.path, { recursive: true, force: true });
  return { removed: true, path: e.path };
}

module.exports = {
  extensionsDir,
  parseManifest,
  validateManifest,
  isCompatible,
  list,
  info,
  install,
  remove
};
