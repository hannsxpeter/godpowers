/**
 * Pillars integration helpers.
 *
 * Godpowers uses Pillars as its native project context layer. This module
 * treats files as pillars only when they have `pillar:` frontmatter, which
 * keeps Godpowers specialist agents from being mistaken for project context.
 */

const fs = require('fs');
const path = require('path');
const frontmatterLib = require('./frontmatter');
const { parseSimpleYaml } = require('./intent');
const syncFs = require('./sync-fs');

const PILLARS_FENCE_BEGIN = '<!-- pillars:begin -->';
const PILLARS_FENCE_END = '<!-- pillars:end -->';
const PILLAR_SYNC_FENCE_BEGIN = '<!-- godpowers:pillar-sync:begin -->';
const PILLAR_SYNC_FENCE_END = '<!-- godpowers:pillar-sync:end -->';

const CORE_PILLARS = {
  stack: {
    covers: ['tech choices', 'dependencies', 'version constraints'],
    triggers: ['stack', 'framework', 'library', 'dependency', 'package', 'version']
  },
  arch: {
    covers: ['system architecture', 'services', 'boundaries', 'data flow'],
    triggers: ['architecture', 'service', 'module', 'boundary', 'design', 'system']
  },
  data: {
    covers: ['data model', 'schema', 'migrations', 'queries', 'storage'],
    triggers: ['database', 'schema', 'migration', 'query', 'table', 'column', 'model']
  },
  api: {
    covers: ['api contract', 'http', 'rpc', 'request response shapes'],
    triggers: ['api', 'endpoint', 'route', 'request', 'response', 'http', 'rpc']
  },
  ui: {
    covers: ['visual ui', 'components', 'design tokens', 'interaction patterns'],
    triggers: ['ui', 'component', 'screen', 'page', 'design', 'css', 'accessibility']
  },
  auth: {
    covers: ['identity', 'sessions', 'access control', 'authorization'],
    triggers: ['auth', 'login', 'session', 'permission', 'role', 'invite', 'access']
  },
  quality: {
    covers: ['testing', 'error handling', 'code style', 'naming'],
    triggers: ['test', 'testing', 'lint', 'quality', 'error', 'style', 'refactor']
  },
  development: {
    covers: ['local setup', 'developer workflow', 'debugging', 'generated artifacts'],
    triggers: ['develop', 'development', 'local setup', 'bootstrap', 'debug']
  },
  release: {
    covers: ['versioning', 'release preparation', 'publication', 'changelog policy'],
    triggers: ['release', 'version', 'changelog', 'publish', 'semver']
  },
  deploy: {
    covers: ['environments', 'promotion', 'rollback', 'runtime delivery'],
    triggers: ['deploy', 'deployment', 'environment', 'rollback', 'promotion', 'cutover']
  },
  observe: {
    covers: ['logging', 'metrics', 'tracing', 'alerts', 'runbooks'],
    triggers: ['log', 'logging', 'metric', 'trace', 'alert', 'observability', 'monitor']
  }
};

const ALWAYS_PILLARS = {
  context: {
    covers: ['project identity', 'domain language', 'product invariants', 'glossary'],
    triggers: [],
    see_also: ['repo']
  },
  repo: {
    covers: ['file layout', 'naming conventions', 'where things go', 'repository structure'],
    triggers: [],
    see_also: ['context']
  }
};

const COMMON_PILLARS = {
  config: {
    covers: ['configuration', 'environment variables', 'feature flags', 'secrets'],
    triggers: ['config', 'configuration', 'environment variable', 'feature flag', 'secret']
  },
  security: {
    covers: ['input validation', 'threat model', 'dependency risk', 'adversarial concerns'],
    triggers: ['security', 'threat', 'vulnerability', 'owasp', 'cve', 'validation']
  },
  privacy: {
    covers: ['personal data', 'consent', 'retention', 'deletion', 'subject rights'],
    triggers: ['privacy', 'personal data', 'pii', 'consent', 'retention', 'deletion']
  },
  compliance: {
    covers: ['regulatory requirements', 'audit controls', 'control mappings'],
    triggers: ['compliance', 'soc2', 'hipaa', 'gdpr', 'pci', 'audit']
  },
  i18n: {
    covers: ['translation', 'locale', 'right-to-left layout', 'localization'],
    triggers: ['i18n', 'translation', 'locale', 'rtl', 'localization']
  },
  a11y: {
    covers: ['accessibility', 'wcag', 'assistive technology'],
    triggers: ['a11y', 'accessibility', 'wcag', 'screen reader']
  },
  analytics: {
    covers: ['product events', 'user telemetry', 'key metrics'],
    triggers: ['analytics', 'product event', 'telemetry', 'kpi']
  },
  integrations: {
    covers: ['third-party services', 'outbound contracts', 'webhooks'],
    triggers: ['integration', 'third party', 'webhook', 'external api']
  },
  async: {
    covers: ['background jobs', 'queues', 'schedules', 'events'],
    triggers: ['background job', 'queue', 'scheduler', 'cron', 'async']
  },
  cache: {
    covers: ['caching', 'invalidation', 'time to live'],
    triggers: ['cache', 'caching', 'invalidation', 'ttl']
  },
  notifications: {
    covers: ['transactional email', 'sms', 'push notifications'],
    triggers: ['notification', 'transactional email', 'sms', 'push']
  }
};

const REQUIRED_SECTIONS = [
  'Scope',
  'Context',
  'Decisions',
  'Rules',
  'Workflows',
  'Watchouts',
  'Touchpoints',
  'Gaps'
];

const PILLAR_BUDGETS = {
  alwaysWords: 1000,
  alwaysBytes: 8 * 1024,
  alwaysScopeWords: 2000,
  alwaysScopeBytes: 16 * 1024,
  routedWords: 2000,
  routedBytes: 16 * 1024
};

const KNOWN_PILLARS = {
  ...ALWAYS_PILLARS,
  ...CORE_PILLARS,
  ...COMMON_PILLARS
};

const ARTIFACT_PILLAR_MAP = [
  { pattern: /^README\.md$/i, pillars: ['context', 'repo'] },
  { pattern: /^CHANGELOG\.md$/i, pillars: ['context', 'deploy'] },
  { pattern: /^RELEASE\.md$/i, pillars: ['context', 'deploy'] },
  { pattern: /^CONTRIBUTING\.md$/i, pillars: ['repo', 'quality'] },
  { pattern: /^SECURITY\.md$/i, pillars: ['security'] },
  { pattern: /^SUPPORT\.md$/i, pillars: ['context'] },
  { pattern: /^docs\/ROADMAP\.md$/i, pillars: ['context', 'quality'] },
  { pattern: /^docs\/reference\.md$/i, pillars: ['repo'] },
  { pattern: /^docs\/repo-doc-sync\.md$/i, pillars: ['repo', 'quality'] },
  // .godpowers artifacts are canonically .mdx; \.mdx?$ also matches legacy .md
  // values persisted in old projects' state.json.
  { pattern: /(^|\/)prd\/PRD\.mdx?$/i, pillars: ['context'] },
  { pattern: /(^|\/)arch\/ARCH\.mdx?$/i, pillars: ['arch'] },
  { pattern: /(^|\/)arch\/adr\//i, pillars: ['arch'] },
  { pattern: /(^|\/)stack\/DECISION\.mdx?$/i, pillars: ['stack'] },
  { pattern: /(^|\/)roadmap\/ROADMAP\.mdx?$/i, pillars: ['context', 'quality'] },
  { pattern: /(^|\/)build\/PLAN\.mdx?$/i, pillars: ['quality', 'repo'] },
  { pattern: /^\.godpowers\/state\.json$/i, pillars: ['context', 'deploy', 'observe'] },
  { pattern: /(^|\/)harden\/FINDINGS\.mdx?$/i, pillars: ['security', 'auth'] },
  { pattern: /(^|\/)design\/DESIGN\.mdx?$/i, pillars: ['ui'] },
  { pattern: /(^|\/)design\/PRODUCT\.mdx?$/i, pillars: ['context', 'ui'] }
];

const GODPOWERS_ARTIFACTS = [
  '.godpowers/prd/PRD.mdx',
  '.godpowers/arch/ARCH.mdx',
  '.godpowers/stack/DECISION.mdx',
  '.godpowers/roadmap/ROADMAP.mdx',
  '.godpowers/build/PLAN.mdx',
  '.godpowers/state.json',
  '.godpowers/harden/FINDINGS.mdx',
  '.godpowers/design/DESIGN.mdx',
  '.godpowers/design/PRODUCT.mdx'
];

// ===========================================================================
// Pillar model: parse pillar files, detect installed pillars, compute the
// per-task load set, and construct/initialize pillar files. Shared with the
// artifact-sync workflow below (init/ensurePillar/pillarStub/detect are also
// part of the public API).
// ===========================================================================

function stripQuotes(value) {
  return String(value).trim().replace(/^['"]|['"]$/g, '');
}

const parseFrontmatter = (raw) => frontmatterLib.parse(raw, { strict: true });

function normalizeSelector(value) {
  return String(value || '')
    .replace(/[A-Z]/g, (character) => character.toLowerCase())
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function selectorMatches(taskText, selector) {
  const taskTokens = normalizeSelector(taskText).split(' ').filter(Boolean);
  const selectorTokens = normalizeSelector(selector).split(' ').filter(Boolean);
  if (selectorTokens.length === 0 || selectorTokens.length > taskTokens.length) return false;
  for (let index = 0; index <= taskTokens.length - selectorTokens.length; index += 1) {
    if (selectorTokens.every((token, offset) => taskTokens[index + offset] === token)) return true;
  }
  return false;
}

function validIdentity(identity) {
  const segment = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const parts = String(identity || '').split('/');
  return parts.length >= 1 && parts.length <= 2 && parts.every((part) => segment.test(part));
}

function derivedIdentity(filePath, agentsRoot) {
  return path.relative(agentsRoot, filePath).split(path.sep).join('/').replace(/\.md$/, '');
}

function countWords(value) {
  return (String(value || '').match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g) || []).length;
}

function walkMarkdown(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkMarkdown(full));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out.sort();
}

function parsePillarFile(filePath, agentsRoot = path.dirname(filePath)) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = frontmatterLib.split(raw, { strict: true, source: filePath, require: true });
  const frontmatter = parsed.frontmatter || {};
  if (!frontmatter || !frontmatter.pillar) return null;
  const identity = derivedIdentity(filePath, agentsRoot);
  return {
    path: filePath,
    name: identity,
    identity,
    leaf: frontmatter.pillar,
    status: frontmatter.status || 'present',
    always_load: frontmatter.always_load === true,
    covers: Array.isArray(frontmatter.covers) ? frontmatter.covers : [],
    triggers: Array.isArray(frontmatter.triggers) ? frontmatter.triggers : [],
    must_read_with: Array.isArray(frontmatter.must_read_with) ? frontmatter.must_read_with : [],
    see_also: Array.isArray(frontmatter.see_also) ? frontmatter.see_also : [],
    frontmatter,
    raw,
    body: parsed.body,
    diagnostics: parsed.diagnostics
  };
}

function listPillars(scopeRoot) {
  const agentsDir = path.join(scopeRoot, 'agents');
  return walkMarkdown(agentsDir)
    .map(file => parsePillarFile(file, agentsDir))
    .filter(Boolean);
}

function isCompleteScope(scopeRoot) {
  return fs.existsSync(path.join(scopeRoot, 'AGENTS.md')) &&
    fs.existsSync(path.join(scopeRoot, 'agents')) &&
    fs.statSync(path.join(scopeRoot, 'agents')).isDirectory();
}

function discoverScopes(projectRoot) {
  const root = path.resolve(projectRoot);
  const scopes = [];
  const skip = new Set(['.git', '.claude', '.codex', 'node_modules', 'coverage', 'dist', 'build', 'vendor']);
  function visit(directory) {
    if (isCompleteScope(directory)) scopes.push(directory);
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || skip.has(entry.name)) continue;
      visit(path.join(directory, entry.name));
    }
  }
  visit(root);
  return scopes.sort((a, b) => {
    const depth = (value) => path.relative(root, value).split(path.sep).filter(Boolean).length;
    return depth(a) - depth(b) || a.localeCompare(b);
  });
}

function applicableScopes(projectRoot, target = '.') {
  const root = path.resolve(projectRoot);
  const resolved = path.resolve(root, target);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Pillars target escapes project root: ${target}`);
  }
  const directory = fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()
    ? resolved
    : path.dirname(resolved);
  return discoverScopes(root).filter((scope) => scope === directory || directory.startsWith(`${scope}${path.sep}`));
}

function readAgents(projectRoot) {
  const file = path.join(projectRoot, 'AGENTS.md');
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file, 'utf8');
}

function hasPillarsProtocol(projectRoot) {
  const content = readAgents(projectRoot).toLowerCase();
  return content.includes('pillars') &&
    (content.includes('always-pillars') || content.includes('always_load: true') || content.includes('load every pillar')) &&
    content.includes('excluded');
}

function readExclusions(projectRoot) {
  const content = readAgents(projectRoot);
  const exclusions = new Map();
  const fences = [...content.matchAll(/```ya?ml\s*\n([\s\S]*?)```/g)];
  const source = fences.map((match) => match[1]).find((block) => /(^|\n)excluded\s*:/.test(block));
  if (!source) return exclusions;
  const parsed = parseSimpleYaml(source);
  const items = Array.isArray(parsed.excluded) ? parsed.excluded : [];
  for (const item of items) {
    if (typeof item === 'string' && validIdentity(item)) exclusions.set(item, null);
    if (item && typeof item === 'object' && validIdentity(item.name)) {
      exclusions.set(item.name, typeof item.reason === 'string' ? item.reason : null);
    }
  }
  return exclusions;
}

function readCatalog(scopeRoot) {
  const file = path.join(scopeRoot, 'agents', 'catalog.yaml');
  if (!fs.existsSync(file)) return { version: 1, entries: new Map(), issues: [] };
  const parsed = parseSimpleYaml(fs.readFileSync(file, 'utf8'));
  const issues = [];
  const entries = new Map();
  if (parsed.version !== 1) issues.push('agents/catalog.yaml version must be 1');
  const absent = Array.isArray(parsed.absent) ? parsed.absent : [];
  if (!Array.isArray(parsed.absent)) issues.push('agents/catalog.yaml absent must be a list');
  for (const entry of absent) {
    if (!entry || typeof entry !== 'object' || !validIdentity(entry.identity)) {
      issues.push('agents/catalog.yaml contains an invalid identity');
      continue;
    }
    if (!Array.isArray(entry.triggers) || entry.triggers.length === 0) {
      issues.push(`catalog identity ${entry.identity} requires triggers`);
      continue;
    }
    if (entries.has(entry.identity)) {
      issues.push(`catalog identity ${entry.identity} is duplicated`);
      continue;
    }
    entries.set(entry.identity, {
      identity: entry.identity,
      covers: Array.isArray(entry.covers) ? entry.covers : [],
      triggers: entry.triggers
    });
  }
  return { version: parsed.version, entries, issues, path: file };
}

function validatePillar(projectRoot, pillar) {
  const issues = [];
  const rel = path.relative(path.join(projectRoot, 'agents'), pillar.path);
  const expectedName = path.basename(rel, '.md');
  if (!validIdentity(pillar.identity)) {
    issues.push(`invalid path-derived pillar identity for ${rel}`);
  }
  if (pillar.leaf !== expectedName) {
    issues.push(`frontmatter pillar does not match filename for ${rel}`);
  }
  if (!['present', 'stub'].includes(pillar.status)) {
    issues.push(`${rel} status must be present or stub`);
  }
  if (!Array.isArray(pillar.covers) || pillar.covers.length === 0) {
    issues.push(`${rel} missing covers list`);
  }
  if (!pillar.always_load && (!Array.isArray(pillar.triggers) || pillar.triggers.length === 0)) {
    issues.push(`${rel} missing triggers list`);
  }
  const headings = [...pillar.body.matchAll(/^##\s+(.+?)\s*$/gm)].map((match) => match[1]);
  if (headings.join('\n') !== REQUIRED_SECTIONS.join('\n')) {
    issues.push(`${rel} must contain the eight Pillars sections in order`);
  }
  for (const field of ['covers', 'triggers']) {
    const values = pillar[field];
    const normalized = new Set();
    for (const value of values) {
      const key = normalizeSelector(value);
      if (!key) issues.push(`${rel} ${field} contains an empty portable selector`);
      if (normalized.has(key)) issues.push(`${rel} ${field} contains duplicate portable selectors`);
      normalized.add(key);
    }
  }
  for (const field of ['must_read_with', 'see_also']) {
    const seen = new Set();
    for (const reference of pillar[field]) {
      if (!validIdentity(reference)) issues.push(`${rel} ${field} contains invalid identity ${reference}`);
      if (reference === pillar.identity) issues.push(`${rel} ${field} contains a self-reference`);
      if (seen.has(reference)) issues.push(`${rel} ${field} contains duplicate identity ${reference}`);
      seen.add(reference);
    }
  }
  return issues;
}

function detect(projectRoot, opts = {}) {
  const agentsPath = path.join(projectRoot, 'AGENTS.md');
  const agentsDir = path.join(projectRoot, 'agents');
  const hasAgents = fs.existsSync(agentsPath);
  const hasAgentsDir = fs.existsSync(agentsDir);
  const protocol = hasPillarsProtocol(projectRoot);
  const pillars = listPillars(projectRoot);
  const byName = new Map(pillars.map(p => [p.name, p]));
  const exclusions = readExclusions(projectRoot);
  const catalog = readCatalog(projectRoot);
  const issues = [];
  const warnings = [];

  if (!hasAgents) issues.push('AGENTS.md missing');
  if (!hasAgentsDir) issues.push('agents directory missing');
  if (hasAgents && !protocol) issues.push('AGENTS.md does not declare Pillars protocol');

  for (const name of ['context', 'repo']) {
    if (!byName.has(name)) {
      if (exclusions.has(name)) warnings.push(`floor pillar ${name} is explicitly excluded`);
      else issues.push(`agents/${name}.md missing`);
    } else if (!byName.get(name).always_load) {
      issues.push(`agents/${name}.md must set always_load: true`);
    }
  }

  for (const pillar of pillars) {
    issues.push(...validatePillar(projectRoot, pillar));
    if (pillar.must_read_with.length > 3) {
      warnings.push(`${pillar.identity} must_read_with exceeds the recommended dependency fan-out`);
    }
  }

  issues.push(...catalog.issues);
  for (const identity of byName.keys()) {
    if (exclusions.has(identity)) issues.push(`${identity} is both present and excluded`);
    if (catalog.entries.has(identity)) issues.push(`${identity} is both present and cataloged as absent`);
  }
  for (const identity of exclusions.keys()) {
    if (catalog.entries.has(identity)) issues.push(`${identity} is both excluded and cataloged as absent`);
  }
  for (const pillar of pillars) {
    for (const reference of pillar.must_read_with) {
      if (!byName.has(reference) && !exclusions.has(reference)) {
        issues.push(`${pillar.identity} must_read_with reference ${reference} is unresolved`);
      }
    }
    for (const reference of pillar.see_also) {
      if (!byName.has(reference) && !exclusions.has(reference) && !catalog.entries.has(reference)) {
        issues.push(`${pillar.identity} see_also reference ${reference} is unresolved`);
      }
    }
  }

  const always = pillars.filter((pillar) => pillar.always_load);
  const alwaysWords = always.reduce((sum, pillar) => sum + countWords(pillar.raw), 0);
  const alwaysBytes = always.reduce((sum, pillar) => sum + Buffer.byteLength(pillar.raw), 0);
  for (const pillar of pillars) {
    const words = countWords(pillar.raw);
    const bytes = Buffer.byteLength(pillar.raw);
    const wordBudget = pillar.always_load ? PILLAR_BUDGETS.alwaysWords : PILLAR_BUDGETS.routedWords;
    const byteBudget = pillar.always_load ? PILLAR_BUDGETS.alwaysBytes : PILLAR_BUDGETS.routedBytes;
    if (words > wordBudget) warnings.push(`${pillar.identity} exceeds the recommended ${wordBudget}-word budget`);
    if (bytes > byteBudget) warnings.push(`${pillar.identity} exceeds the recommended ${byteBudget}-byte budget`);
  }
  if (alwaysWords > PILLAR_BUDGETS.alwaysScopeWords) warnings.push('always-loaded pillars exceed the scope word budget');
  if (alwaysBytes > PILLAR_BUDGETS.alwaysScopeBytes) warnings.push('always-loaded pillars exceed the scope byte budget');

  const hasAnySignal = hasAgents || hasAgentsDir || pillars.length > 0;
  const valid = protocol && issues.length === 0 &&
    (byName.has('context') || exclusions.has('context')) &&
    (byName.has('repo') || exclusions.has('repo'));

  const result = {
    status: valid ? 'present' : (hasAnySignal ? 'partial' : 'absent'),
    valid,
    hasAgents,
    hasAgentsDir,
    protocol,
    pillars,
    issues,
    warnings,
    exclusions: [...exclusions.keys()].sort(),
    catalog: [...catalog.entries.values()]
  };
  if (opts.recursive) {
    result.scopes = discoverScopes(projectRoot).map((scope) => ({
      root: scope,
      detection: scope === path.resolve(projectRoot) ? result : detect(scope)
    }));
    result.valid = result.scopes.every((scope) => scope.detection.valid);
    result.status = result.valid ? 'present' : 'partial';
  }
  return result;
}

function matchesTask(pillar, taskText) {
  return pillar.triggers.some((trigger) => selectorMatches(taskText, trigger));
}

function addLoad(load, pillar, reason) {
  if (!load.has(pillar.name)) {
    load.set(pillar.name, { pillar, reasons: [] });
  }
  load.get(pillar.name).reasons.push(reason);
}

function computeScopeLoad(scopeRoot, taskText) {
  const pillars = listPillars(scopeRoot);
  const byName = new Map(pillars.map(p => [p.name, p]));
  const excluded = readExclusions(scopeRoot);
  const catalog = readCatalog(scopeRoot);
  const load = new Map();
  const primaryNames = [];
  const missing = [];
  const absent = [];

  for (const name of ['context', 'repo']) {
    if (!byName.has(name) && !excluded.has(name)) missing.push({ pillar: name, reason: 'floor pillar missing' });
  }

  for (const pillar of pillars) {
    if (excluded.has(pillar.name)) continue;
    if (pillar.always_load) addLoad(load, pillar, 'always_load');
  }

  for (const pillar of pillars) {
    if (pillar.always_load || excluded.has(pillar.name)) continue;
    if (matchesTask(pillar, taskText)) {
      addLoad(load, pillar, 'task match');
      primaryNames.push(pillar.name);
    }
  }

  for (const entry of catalog.entries.values()) {
    if (excluded.has(entry.identity)) continue;
    if (entry.triggers.some((trigger) => selectorMatches(taskText, trigger))) {
      absent.push({ pillar: entry.identity, reason: 'catalog trigger match' });
    }
  }

  for (const primaryName of primaryNames) {
    const primary = byName.get(primaryName);
    for (const dep of primary.must_read_with) {
      if (excluded.has(dep)) continue;
      if (byName.has(dep)) {
        addLoad(load, byName.get(dep), `must_read_with from ${primaryName}`);
      } else {
        missing.push({ pillar: dep, reason: `must_read_with from ${primaryName}` });
      }
    }
  }

  for (const item of [...load.values()]) {
    for (const soft of item.pillar.see_also) {
      if (excluded.has(soft)) continue;
      const target = byName.get(soft) || catalog.entries.get(soft);
      if (!target) continue;
      const selectors = [soft, ...(target.triggers || []), ...(target.covers || [])];
      if (selectors.some((selector) => selectorMatches(taskText, selector))) {
        if (byName.has(soft)) addLoad(load, byName.get(soft), `see_also from ${item.pillar.name}`);
        else absent.push({ pillar: soft, reason: `see_also from ${item.pillar.name}` });
      }
    }
  }

  return {
    scope: scopeRoot,
    loadSet: [...load.values()].map(item => ({
      name: item.pillar.name,
      path: item.pillar.path,
      status: item.pillar.status,
      reasons: [...new Set(item.reasons)]
    })),
    missing: dedupeMissing(missing),
    absent: dedupeMissing(absent),
    primaries: [...new Set(primaryNames)].sort(),
    excluded: [...excluded.keys()].sort()
  };
}

function computeLoadSet(projectRoot, taskText, opts = {}) {
  const scopes = applicableScopes(projectRoot, opts.target || '.');
  if (scopes.length === 0) {
    return { loadSet: [], missing: [{ pillar: 'context', reason: 'no Pillars scope found' }], absent: [], excluded: [], scopes: [] };
  }
  const local = scopes.map((scope) => computeScopeLoad(scope, taskText));
  const loadSet = [];
  const missing = [];
  const absent = [];
  const excluded = [];
  for (let index = 0; index < local.length; index += 1) {
    const current = local[index];
    const scopeLabel = path.relative(path.resolve(projectRoot), current.scope) || 'root';
    const descendantExclusions = new Set(local.slice(index + 1).flatMap((entry) => entry.excluded));
    for (const item of current.loadSet) {
      const pillar = listPillars(current.scope).find((candidate) => candidate.identity === item.name);
      if (descendantExclusions.has(item.name) && pillar && !pillar.always_load) continue;
      loadSet.push({
        ...item,
        identity: item.name,
        scope: current.scope,
        scopeLabel
      });
    }
    missing.push(...current.missing.map((item) => ({ ...item, scope: current.scope, scopeLabel })));
    absent.push(...current.absent.map((item) => ({ ...item, scope: current.scope, scopeLabel })));
    excluded.push(...current.excluded.map((identity) => ({ identity, scope: current.scope, scopeLabel })));
  }
  return {
    loadSet,
    missing: dedupeMissing(missing),
    absent: dedupeMissing(absent),
    excluded,
    scopes: local.map((entry) => ({
      root: entry.scope,
      scopeLabel: path.relative(path.resolve(projectRoot), entry.scope) || 'root',
      primaries: entry.primaries
    }))
  };
}

function dedupeMissing(missing) {
  const seen = new Set();
  const out = [];
  for (const item of missing) {
    const key = `${item.scope || ''}:${item.pillar}:${item.reason}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function buildProtocolContent(exclusions = []) {
  const lines = [];
  lines.push('# Godpowers Project Context');
  lines.push('');
  lines.push('This is a Godpowers project. Godpowers uses the Pillars standard as its native project context layer.');
  lines.push('Coding agents read project context from `./agents/*.md` before changing code, while `.godpowers/` remains the Godpowers workflow state and artifact layer.');
  lines.push('');
  lines.push('This project follows Pillars 1.1.0. Coding agents read project pillar files before acting.');
  lines.push('');
  lines.push('## At the start of any task');
  lines.push('');
  lines.push('1. Resolve scopes from repository root to the task target. A scope contains both `AGENTS.md` and `agents/`. Apply outer scopes first and let the nearest scope win conflicts.');
  lines.push('2. Inventory pillar frontmatter recursively, local exclusions, and optional `agents/catalog.yaml` absent concerns in each scope.');
  lines.push('3. Load every pillar whose frontmatter has `always_load: true`. Match remaining `triggers` with the Pillars portable ASCII token matcher to select primaries and absent concerns.');
  lines.push('4. Add each primary pillar direct `must_read_with` dependencies, depth 1 only. Path-qualified sub-pillars use identities such as `auth/agent-registration`.');
  lines.push('5. Add a selected pillar `see_also` target only when the task matches the target identity, triggers, or covers. Do not follow soft references recursively.');
  lines.push('6. Read every selected body. Follow Rules, apply Workflows, heed Watchouts, and ask before deciding open Gaps.');
  lines.push('');
  lines.push('## Handling missing pillars');
  lines.push('');
  lines.push('| State | Action |');
  lines.push('|---|---|');
  lines.push('| `status: present` | Load and comply. |');
  lines.push('| `status: stub` | Treat the concern as acknowledged but undecided. Ask before making domain decisions. |');
  lines.push('| Name in `excluded:` | Treat as intentionally not applicable in that scope. |');
  lines.push('| Trigger matches local `agents/catalog.yaml` entry | Infer from code, state the assumption, and recommend authoring the pillar. |');
  lines.push('| No local file, exclusion, or catalog entry | Make no Pillars-specific claim about that concern. |');
  lines.push('');
  lines.push('If `context.md` or `repo.md` is missing and not explicitly excluded, pause and ask the human to create a stub or record an exclusion.');
  lines.push('');
  lines.push('## Excluded pillars');
  lines.push('');
  lines.push('```yaml');
  if (exclusions.length === 0) {
    lines.push('excluded: []');
  } else {
    lines.push('excluded:');
    for (const item of exclusions) {
      lines.push(`  - name: ${item.name}`);
      lines.push(`    reason: ${item.reason}`);
    }
  }
  lines.push('```');
  return lines.join('\n');
}

function writeFenced(filePath, begin, end, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const block = `${begin}\n${content}\n${end}`;
  const start = existing.indexOf(begin);
  const finish = existing.indexOf(end);
  let next;
  if (start !== -1 && finish !== -1 && finish > start) {
    next = `${existing.slice(0, start)}${block}${existing.slice(finish + end.length)}`;
  } else if (existing.trim()) {
    next = `${existing.replace(/\s*$/, '')}\n\n${block}\n`;
  } else {
    next = `${block}\n`;
  }
  fs.writeFileSync(filePath, next);
}

// ===========================================================================
// Artifact-sync workflow: turn Godpowers artifacts (PRD/ARCH/...) into durable
// pillar signals and write them into the routed pillar files. Builds on the
// model above (init/ensurePillar/pillarStub/detect/buildProtocolContent).
// ===========================================================================

function artifactToPillars(artifactPath) {
  const normalized = artifactPath.replace(/\\/g, '/');
  const pillars = [];
  for (const entry of ARTIFACT_PILLAR_MAP) {
    if (entry.pattern.test(normalized)) pillars.push(...entry.pillars);
  }
  return [...new Set(pillars)];
}

function sanitizeSignal(text) {
  return String(text)
    .replace(/\u2014|\u2013/g, '-')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripMarkdownPrefix(line) {
  return line
    .replace(/^\s{0,3}[-*+]\s+/, '')
    .replace(/^\s{0,3}\d+\.\s+/, '')
    .replace(/^#+\s+/, '')
    .replace(/^\|+|\|+$/g, '')
    .trim();
}

function extractDurableSignalsFromText(text, opts = {}) {
  const maxSignals = opts.maxSignals || 8;
  const signals = [];
  const seen = new Set();
  const lines = String(text || '').split(/\r?\n/);
  const labelPattern = /^\s*(?:[-*+]\s+)?\[(DECISION|HYPOTHESIS|OPEN QUESTION)\]\s*(.+)$/;
  const labelMention = /\[(?:DECISION|HYPOTHESIS|OPEN QUESTION)\]/;
  const blockBoundary = /^\s*(?:[-*+]\s+|\d+\.\s+|#{1,6}\s+|[>|]|```|~~~)/;
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(labelPattern);
    if (!match) continue;
    const label = match[1];
    const parts = [stripMarkdownPrefix(match[2])];
    let cursor = i + 1;
    while (cursor < lines.length) {
      const continuation = lines[cursor];
      if (!continuation.trim() || labelMention.test(continuation) || blockBoundary.test(continuation)) break;
      parts.push(continuation.trim());
      cursor += 1;
    }
    const body = sanitizeSignal(parts.join(' '));
    if (!body) continue;
    const key = `${label}:${body.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    signals.push({ label, body });
    if (signals.length >= maxSignals) break;
    i = cursor - 1;
  }
  return signals;
}

function extractDurableSignals(projectRoot, artifactPath, opts = {}) {
  // mdx-first with legacy .md fallback so signals still flow from projects
  // whose artifacts predate the .mdx rename.
  const content = syncFs.readArtifactOrNull(projectRoot, artifactPath);
  if (content === null) return [];
  return extractDurableSignalsFromText(content, opts);
}

function discoverGodpowersArtifacts(projectRoot) {
  // Existence resolves mdx-first with legacy .md fallback, but the recorded
  // identity stays the canonical .mdx name (generated pillar prose names the
  // canonical artifact; reads resolve the twin at access time).
  return GODPOWERS_ARTIFACTS
    .filter(rel => syncFs.existsArtifact(projectRoot, rel))
    .map(rel => ({
      path: rel,
      pillars: artifactToPillars(rel)
    }))
    .filter(item => item.pillars.length > 0);
}

function pillarStub(name, meta, opts = {}) {
  const always = opts.always === true;
  const status = opts.status || 'stub';
  const seeAlso = opts.see_also || meta.see_also || [];
  const mustReadWith = opts.must_read_with || meta.must_read_with || [];
  const lines = [];
  lines.push('---');
  lines.push(`pillar: ${name}`);
  lines.push(`status: ${status}`);
  lines.push(`always_load: ${always ? 'true' : 'false'}`);
  lines.push(`covers: [${meta.covers.join(', ')}]`);
  lines.push(`triggers: [${(meta.triggers || []).join(', ')}]`);
  lines.push(`must_read_with: [${mustReadWith.join(', ')}]`);
  lines.push(`see_also: [${seeAlso.join(', ')}]`);
  lines.push('---');
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push(`(stub) Capture project-specific guidance for ${name}.`);
  lines.push('');
  lines.push('## Context');
  lines.push('');
  lines.push('(stub) Fill with facts an agent cannot reliably infer from code alone.');
  for (const line of opts.context || []) {
    lines.push(`- ${sanitizeSignal(line)}`);
  }
  lines.push('');
  lines.push('## Decisions');
  lines.push('');
  lines.push('(none)');
  lines.push('');
  lines.push('## Rules');
  lines.push('');
  lines.push('(none)');
  lines.push('');
  lines.push('## Workflows');
  lines.push('');
  lines.push('(none)');
  lines.push('');
  lines.push('## Watchouts');
  lines.push('');
  lines.push('(none)');
  lines.push('');
  lines.push('## Touchpoints');
  lines.push('');
  lines.push('(none)');
  lines.push('');
  lines.push('## Gaps');
  lines.push('');
  lines.push(`- This pillar is a stub. Ask before making durable ${name} decisions.`);
  lines.push('');
  return lines.join('\n');
}

function ensurePillar(projectRoot, name, meta, opts = {}) {
  const dir = path.join(projectRoot, 'agents');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.md`);
  if (fs.existsSync(file)) return { path: file, action: 'kept' };
  fs.writeFileSync(file, pillarStub(name, meta, opts));
  return { path: file, action: 'created' };
}

function catalogContent(identities) {
  const lines = ['version: 1', 'absent:'];
  for (const identity of identities) {
    const meta = KNOWN_PILLARS[identity];
    if (!meta) continue;
    lines.push(`  - identity: ${identity}`);
    lines.push(`    covers: [${meta.covers.join(', ')}]`);
    lines.push(`    triggers: [${meta.triggers.join(', ')}]`);
  }
  if (lines.length === 2) lines[1] = 'absent: []';
  lines.push('');
  return lines.join('\n');
}

function ensureCatalog(projectRoot) {
  const agentsDir = path.join(projectRoot, 'agents');
  const file = path.join(agentsDir, 'catalog.yaml');
  if (fs.existsSync(file)) return { path: file, action: 'kept' };
  const present = new Set(listPillars(projectRoot).map((pillar) => pillar.identity));
  const excluded = readExclusions(projectRoot);
  const absent = Object.keys(KNOWN_PILLARS)
    .filter((identity) => !['context', 'repo'].includes(identity))
    .filter((identity) => !present.has(identity) && !excluded.has(identity))
    .sort();
  fs.mkdirSync(agentsDir, { recursive: true });
  fs.writeFileSync(file, catalogContent(absent));
  return { path: file, action: 'created' };
}

function init(projectRoot, opts = {}) {
  const agentsFile = path.join(projectRoot, 'AGENTS.md');
  const exclusions = opts.exclusions || [];
  writeFenced(agentsFile, PILLARS_FENCE_BEGIN, PILLARS_FENCE_END, buildProtocolContent(exclusions));

  const results = [];
  const context = [];
  if (opts.projectName) context.push(`[HYPOTHESIS] Project name: ${opts.projectName}`);
  results.push(ensurePillar(projectRoot, 'context', ALWAYS_PILLARS.context, { always: true, context }));
  results.push(ensurePillar(projectRoot, 'repo', ALWAYS_PILLARS.repo, { always: true }));

  const coreNames = opts.corePillars || Object.keys(CORE_PILLARS);
  for (const name of coreNames) {
    results.push(ensurePillar(projectRoot, name, CORE_PILLARS[name]));
  }
  const catalog = ensureCatalog(projectRoot);

  return {
    agentsFile,
    results,
    catalog,
    detection: detect(projectRoot)
  };
}

function buildPillarSyncContent(pillarName, artifactEntries, opts = {}) {
  const mode = opts.yolo ? 'auto-applied by yolo' : 'proposed for review';
  const entries = artifactEntries.map(entry =>
    typeof entry === 'string' ? { artifact: entry, signals: [] } : entry
  );
  const unique = [...new Set(entries.map(entry => entry.artifact))].sort();
  const lines = [];
  lines.push('### Godpowers artifact sources');
  lines.push('');
  lines.push(`- Sync mode: ${mode}.`);
  for (const artifact of unique) {
    lines.push(`- Related artifact: \`${artifact}\`.`);
  }
  lines.push(`- Rule: keep this pillar aligned when these artifacts change durable ${pillarName} truth.`);
  const signalEntries = entries.filter(entry => entry.signals && entry.signals.length > 0);
  if (signalEntries.length > 0) {
    lines.push('');
    lines.push('### Extracted durable signals');
    for (const entry of signalEntries) {
      lines.push('');
      lines.push(`From \`${entry.artifact}\`:`);
      for (const signal of entry.signals) {
        lines.push(`- [${signal.label}] ${signal.body}`);
      }
    }
  }
  return lines.join('\n');
}

function applyArtifactSync(projectRoot, artifactPaths, opts = {}) {
  const paths = Array.isArray(artifactPaths) ? artifactPaths : [artifactPaths];
  const byPillar = new Map();
  const results = [];

  init(projectRoot, { corePillars: opts.corePillars });

  for (const artifact of paths.filter(Boolean)) {
    for (const pillarName of artifactToPillars(artifact)) {
      if (!byPillar.has(pillarName)) byPillar.set(pillarName, []);
      byPillar.get(pillarName).push({
        artifact,
        signals: extractDurableSignals(projectRoot, artifact, opts)
      });
    }
  }

  for (const [pillarName, entries] of byPillar.entries()) {
    const meta = KNOWN_PILLARS[pillarName] || {
      covers: [`${pillarName} project context`],
      triggers: [pillarName]
    };
    const ensured = ensurePillar(projectRoot, pillarName, meta, {
      always: pillarName === 'context' || pillarName === 'repo'
    });
    writeFenced(
      ensured.path,
      PILLAR_SYNC_FENCE_BEGIN,
      PILLAR_SYNC_FENCE_END,
      buildPillarSyncContent(pillarName, entries, opts)
    );
    results.push({
      pillar: pillarName,
      path: ensured.path,
      artifacts: [...new Set(entries.map(entry => entry.artifact))].sort(),
      signals: entries.reduce((sum, entry) => sum + entry.signals.length, 0),
      action: opts.yolo ? 'auto-applied' : 'applied'
    });
  }

  return results;
}

function pillarizeExisting(projectRoot, opts = {}) {
  const before = detect(projectRoot);
  const initialized = init(projectRoot, opts);
  const artifacts = discoverGodpowersArtifacts(projectRoot);
  const synced = applyArtifactSync(
    projectRoot,
    artifacts.map(item => item.path),
    opts
  );

  return {
    before,
    after: detect(projectRoot),
    initialized,
    artifacts,
    synced
  };
}

function planArtifactSync(projectRoot, artifactPaths, opts = {}) {
  const yolo = opts.yolo === true;
  const existing = new Set(listPillars(projectRoot).map(p => p.name));
  const paths = Array.isArray(artifactPaths) ? artifactPaths : [artifactPaths];
  const proposals = [];

  for (const artifact of paths.filter(Boolean)) {
    const normalized = artifact.replace(/\\/g, '/');
    for (const entry of ARTIFACT_PILLAR_MAP) {
      if (!entry.pattern.test(normalized)) continue;
      for (const pillar of entry.pillars) {
        proposals.push({
          artifact,
          pillar,
          pillarExists: existing.has(pillar),
          action: yolo ? 'auto-apply' : 'propose',
          reason: yolo
            ? 'YOLO mode auto-applies durable context updates'
            : 'Default mode proposes durable context updates for review'
        });
      }
    }
  }

  return proposals;
}

module.exports = {
  PILLARS_FENCE_BEGIN,
  PILLARS_FENCE_END,
  PILLAR_SYNC_FENCE_BEGIN,
  PILLAR_SYNC_FENCE_END,
  CORE_PILLARS,
  ALWAYS_PILLARS,
  COMMON_PILLARS,
  KNOWN_PILLARS,
  REQUIRED_SECTIONS,
  PILLAR_BUDGETS,
  parseFrontmatter,
  parsePillarFile,
  listPillars,
  discoverScopes,
  applicableScopes,
  normalizeSelector,
  selectorMatches,
  validIdentity,
  readExclusions,
  readCatalog,
  hasPillarsProtocol,
  detect,
  computeLoadSet,
  buildProtocolContent,
  pillarStub,
  catalogContent,
  ensureCatalog,
  init,
  artifactToPillars,
  sanitizeSignal,
  extractDurableSignalsFromText,
  extractDurableSignals,
  discoverGodpowersArtifacts,
  planArtifactSync,
  applyArtifactSync,
  pillarizeExisting
};
