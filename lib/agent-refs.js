const fs = require('fs');
const path = require('path');
const { isCompatible, parseManifest } = require('./extensions');

const AGENT_CONTRACT_VERSION = '1.0.0';

/**
 * @typedef {Object} AgentRef
 * @property {string|null} agent Agent name without the range suffix.
 * @property {string|null} range SemVer range declared after the final at sign.
 * @property {string} raw Original workflow `uses` value.
 */

/**
 * @typedef {AgentRef & { contractVersion: string, valid: boolean, errors: string[] }} AgentRefValidation
 */

/**
 * @param {string} ref
 * @returns {AgentRef}
 */
function parseAgentRef(ref) {
  if (!ref) return { agent: null, range: null, raw: ref };
  const raw = String(ref).trim();
  const at = raw.lastIndexOf('@');
  if (at <= 0) {
    return { agent: raw, range: null, raw };
  }
  return {
    agent: raw.slice(0, at),
    range: raw.slice(at + 1),
    raw
  };
}

/**
 * @param {string} ref
 * @param {string} [contractVersion]
 * @returns {AgentRefValidation}
 */
function validateAgentRef(ref, contractVersion = AGENT_CONTRACT_VERSION) {
  const parsed = parseAgentRef(ref);
  const errors = [];

  if (!parsed.agent || !/^[a-z][a-z0-9-]*$/.test(parsed.agent)) {
    errors.push(`invalid agent name in uses: ${ref}`);
  }
  if (!parsed.range) {
    errors.push(`agent ref must include a semver range: ${ref}`);
  } else if (!isCompatible(parsed.range, contractVersion)) {
    errors.push(`agent ref ${ref} does not satisfy agent contract ${contractVersion}`);
  }

  return { ...parsed, contractVersion, valid: errors.length === 0, errors };
}

/**
 * @param {string} ref
 * @param {string} [contractVersion]
 * @returns {AgentRefValidation}
 */
function assertAgentRef(ref, contractVersion = AGENT_CONTRACT_VERSION) {
  const result = validateAgentRef(ref, contractVersion);
  if (!result.valid) {
    throw new Error(result.errors.join('; '));
  }
  return result;
}

/**
 * @typedef {Object} ProseRef
 * @property {string} token Unresolved god-* token (leading slash stripped).
 * @property {string} file Repo-relative path where the token was found.
 * @property {number} count Occurrences of that token in that file.
 */

const PROSE_TOKEN = /(?<![A-Za-z0-9_])\/?god-[a-z0-9]+(?:-[a-z0-9]+)*/g;

/**
 * Collect the set of every god-* command/agent name that legitimately exists:
 * core skills, core agents, and the skills/agents provided by first-party
 * extension packs. {god, godpowers} are always valid (front door + binary).
 *
 * @param {string} rootDir Repository root.
 * @returns {Set<string>}
 */
function knownGodNames(rootDir) {
  const valid = new Set(['god', 'godpowers']);

  for (const f of fs.readdirSync(path.join(rootDir, 'skills'))) {
    if (f.endsWith('.md')) valid.add(f.replace(/\.md$/, ''));
  }
  for (const f of fs.readdirSync(path.join(rootDir, 'specialists'))) {
    if (/^god-.*\.md$/.test(f)) valid.add(f.replace(/\.md$/, ''));
  }

  const extDir = path.join(rootDir, 'extensions');
  if (fs.existsSync(extDir)) {
    for (const pack of fs.readdirSync(extDir)) {
      const manifestPath = path.join(extDir, pack, 'manifest.yaml');
      if (!fs.existsSync(manifestPath)) continue;
      let provides = {};
      try {
        const parsed = parseManifest(fs.readFileSync(manifestPath, 'utf8'));
        provides = (parsed && parsed.manifest && parsed.manifest.provides) || {};
      } catch (e) {
        continue;
      }
      for (const list of [provides.skills, provides.agents]) {
        if (Array.isArray(list)) {
          for (const name of list) valid.add(String(name).trim());
        }
      }
    }
  }

  return valid;
}

/**
 * Scan skill and agent prose for `god-*` references that do not resolve to a
 * real core skill, core agent, or extension-provided skill/agent. Catches
 * phantom references that the workflow `uses:` validator cannot see because
 * they live in markdown bodies rather than YAML.
 *
 * @param {string} rootDir Repository root.
 * @returns {ProseRef[]} Unresolved references (empty when everything resolves).
 */
function findUnresolvedProseRefs(rootDir) {
  const valid = knownGodNames(rootDir);
  const unresolved = [];

  for (const dir of ['skills', 'specialists']) {
    const dirPath = path.join(rootDir, dir);
    for (const f of fs.readdirSync(dirPath)) {
      if (!f.endsWith('.md')) continue;
      const text = fs.readFileSync(path.join(dirPath, f), 'utf8');
      const counts = new Map();
      let m;
      while ((m = PROSE_TOKEN.exec(text)) !== null) {
        const token = m[0].replace(/^\//, '');
        if (valid.has(token)) continue;
        counts.set(token, (counts.get(token) || 0) + 1);
      }
      for (const [token, count] of counts) {
        unresolved.push({ token, file: `${dir}/${f}`, count });
      }
    }
  }

  return unresolved;
}

module.exports = {
  AGENT_CONTRACT_VERSION,
  parseAgentRef,
  validateAgentRef,
  assertAgentRef,
  knownGodNames,
  findUnresolvedProseRefs
};
