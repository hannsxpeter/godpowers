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
  deploy: {
    covers: ['environments', 'promotion', 'rollback', 'release process'],
    triggers: ['deploy', 'deployment', 'environment', 'release', 'rollback', 'ci']
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
  security: {
    covers: ['input validation', 'threat model', 'dependency risk', 'adversarial concerns'],
    triggers: ['security', 'threat', 'vulnerability', 'owasp', 'cve', 'validation']
  }
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

function parsePillarFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const frontmatter = parseFrontmatter(raw);
  if (!frontmatter || !frontmatter.pillar) return null;
  return {
    path: filePath,
    name: frontmatter.pillar,
    status: frontmatter.status || 'present',
    always_load: frontmatter.always_load === true,
    covers: Array.isArray(frontmatter.covers) ? frontmatter.covers : [],
    triggers: Array.isArray(frontmatter.triggers) ? frontmatter.triggers : [],
    must_read_with: Array.isArray(frontmatter.must_read_with) ? frontmatter.must_read_with : [],
    see_also: Array.isArray(frontmatter.see_also) ? frontmatter.see_also : [],
    frontmatter,
    raw
  };
}

function listPillars(projectRoot) {
  const agentsDir = path.join(projectRoot, 'agents');
  return walkMarkdown(agentsDir)
    .map(file => parsePillarFile(file))
    .filter(Boolean);
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
  const exclusions = new Set();
  const inline = content.match(/excluded:\s*\[([^\]]*)\]/);
  if (inline) {
    for (const item of inline[1].split(',')) {
      const value = stripQuotes(item);
      if (value) exclusions.add(value);
    }
  }
  const nameMatches = content.matchAll(/^\s*-\s*name:\s*([A-Za-z0-9_-]+)/gm);
  for (const match of nameMatches) exclusions.add(match[1]);
  return exclusions;
}

function validatePillar(projectRoot, pillar) {
  const issues = [];
  const rel = path.relative(path.join(projectRoot, 'agents'), pillar.path);
  const expectedName = path.basename(rel, '.md');
  if (pillar.name !== expectedName) {
    issues.push(`frontmatter pillar does not match filename for ${rel}`);
  }
  if (!Array.isArray(pillar.covers) || pillar.covers.length === 0) {
    issues.push(`${rel} missing covers list`);
  }
  if (!pillar.always_load && !Array.isArray(pillar.triggers)) {
    issues.push(`${rel} missing triggers list`);
  }
  return issues;
}

function detect(projectRoot) {
  const agentsPath = path.join(projectRoot, 'AGENTS.md');
  const agentsDir = path.join(projectRoot, 'agents');
  const hasAgents = fs.existsSync(agentsPath);
  const hasAgentsDir = fs.existsSync(agentsDir);
  const protocol = hasPillarsProtocol(projectRoot);
  const pillars = listPillars(projectRoot);
  const byName = new Map(pillars.map(p => [p.name, p]));
  const issues = [];

  if (!hasAgents) issues.push('AGENTS.md missing');
  if (!hasAgentsDir) issues.push('agents directory missing');
  if (hasAgents && !protocol) issues.push('AGENTS.md does not declare Pillars protocol');

  for (const name of ['context', 'repo']) {
    if (!byName.has(name)) {
      issues.push(`agents/${name}.md missing`);
    } else if (!byName.get(name).always_load) {
      issues.push(`agents/${name}.md must set always_load: true`);
    }
  }

  for (const pillar of pillars) {
    issues.push(...validatePillar(projectRoot, pillar));
  }

  const hasAnySignal = hasAgents || hasAgentsDir || pillars.length > 0;
  const valid = protocol && byName.has('context') && byName.has('repo') &&
    byName.get('context').always_load && byName.get('repo').always_load &&
    issues.filter(issue => issue.includes('frontmatter') || issue.includes('missing') || issue.includes('must set')).length === 0;

  return {
    status: valid ? 'present' : (hasAnySignal ? 'partial' : 'absent'),
    valid,
    hasAgents,
    hasAgentsDir,
    protocol,
    pillars,
    issues
  };
}

function containsTerm(taskText, term) {
  const task = taskText.toLowerCase();
  const normalized = String(term).toLowerCase().replace(/[-_]/g, ' ');
  return task.includes(normalized) || task.includes(String(term).toLowerCase());
}

function matchesTask(pillar, taskText) {
  const terms = [pillar.name, ...pillar.triggers, ...pillar.covers];
  return terms.some(term => containsTerm(taskText, term));
}

function addLoad(load, pillar, reason) {
  if (!load.has(pillar.name)) {
    load.set(pillar.name, { pillar, reasons: [] });
  }
  load.get(pillar.name).reasons.push(reason);
}

function computeLoadSet(projectRoot, taskText) {
  const pillars = listPillars(projectRoot);
  const byName = new Map(pillars.map(p => [p.name, p]));
  const excluded = readExclusions(projectRoot);
  const load = new Map();
  const primaryNames = [];
  const missing = [];

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
      if (containsTerm(taskText, soft)) {
        if (byName.has(soft)) addLoad(load, byName.get(soft), `see_also from ${item.pillar.name}`);
        else missing.push({ pillar: soft, reason: `see_also from ${item.pillar.name}` });
      }
    }
  }

  for (const [name, meta] of Object.entries(CORE_PILLARS)) {
    if (byName.has(name) || excluded.has(name)) continue;
    if (matchesTask({ name, ...meta, must_read_with: [], see_also: [] }, taskText)) {
      missing.push({ pillar: name, reason: 'relevant known pillar absent' });
    }
  }

  return {
    loadSet: [...load.values()].map(item => ({
      name: item.pillar.name,
      path: item.pillar.path,
      status: item.pillar.status,
      reasons: [...new Set(item.reasons)]
    })),
    missing: dedupeMissing(missing),
    excluded: [...excluded].sort()
  };
}

function dedupeMissing(missing) {
  const seen = new Set();
  const out = [];
  for (const item of missing) {
    const key = `${item.pillar}:${item.reason}`;
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
  lines.push('## At the start of any task');
  lines.push('');
  lines.push('1. Load every pillar whose frontmatter has `always_load: true`.');
  lines.push('2. Scan remaining pillar frontmatter and select task-relevant primaries from `triggers` and `covers`.');
  lines.push('3. Add each primary pillar direct `must_read_with` dependencies, depth 1 only.');
  lines.push('4. Read every pillar body in the computed load set.');
  lines.push('5. Read `see_also` pillars only when the task explicitly touches that area.');
  lines.push('6. Follow Rules, apply Workflows, heed Watchouts, and ask before deciding open Gaps.');
  lines.push('');
  lines.push('## Handling missing pillars');
  lines.push('');
  lines.push('| State | Action |');
  lines.push('|---|---|');
  lines.push('| `status: present` | Load and comply. |');
  lines.push('| `status: stub` | Treat the concern as acknowledged but undecided. Ask before making domain decisions. |');
  lines.push('| Name in `excluded:` | Treat as intentionally not applicable. |');
  lines.push('| Relevant but absent | Infer from code, state the assumption, and recommend authoring the pillar. |');
  lines.push('');
  lines.push('If `context.md` or `repo.md` is missing, pause and create stubs before continuing.');
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

  return {
    agentsFile,
    results,
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
  lines.push('## Godpowers artifact sources');
  lines.push('');
  lines.push(`- Sync mode: ${mode}.`);
  for (const artifact of unique) {
    lines.push(`- Related artifact: \`${artifact}\`.`);
  }
  lines.push(`- Rule: keep this pillar aligned when these artifacts change durable ${pillarName} truth.`);
  const signalEntries = entries.filter(entry => entry.signals && entry.signals.length > 0);
  if (signalEntries.length > 0) {
    lines.push('');
    lines.push('## Extracted durable signals');
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
  parseFrontmatter,
  parsePillarFile,
  listPillars,
  readExclusions,
  hasPillarsProtocol,
  detect,
  computeLoadSet,
  buildProtocolContent,
  pillarStub,
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
