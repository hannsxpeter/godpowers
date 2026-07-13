/**
 * Repository documentation sync.
 *
 * Keeps mechanical public repository claims aligned with the actual runtime
 * surface. Narrative docs remain human or specialist-agent owned.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const pillars = require('./pillars');
const { read, write, exists, existsArtifact, readArtifact, legacyTwin } = require('./sync-fs');

const LOG_PATH = '.godpowers/docs/REPO-DOC-SYNC.mdx';

function countFiles(projectRoot, dir, pattern) {
  const full = path.join(projectRoot, dir);
  if (!fs.existsSync(full)) return 0;
  return fs.readdirSync(full).filter((name) => pattern.test(name)).length;
}

function readPackage(projectRoot) {
  const file = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return {};
  }
}

function packageVersion(projectRoot) {
  return readPackage(projectRoot).version || 'unknown';
}

function counts(projectRoot) {
  return {
    skills: countFiles(projectRoot, 'skills', /^god.*\.md$/),
    agents: countFiles(projectRoot, 'agents', /^god.*\.md$/),
    workflows: countFiles(projectRoot, 'workflows', /\.yaml$/),
    recipes: countFiles(projectRoot, path.join('routing', 'recipes'), /\.yaml$/)
  };
}

function expectedSurface(projectRoot) {
  const version = packageVersion(projectRoot);
  const surfaceCounts = counts(projectRoot);
  const published = read(projectRoot, 'USERS.md')
    .includes(`latest published release is v${version}`);
  return {
    version,
    published,
    counts: surfaceCounts,
    surface: `${surfaceCounts.skills} skills, ${surfaceCounts.agents} agents`,
    commandSurface: `${surfaceCounts.skills} slash commands`,
    workflowSurface: `${surfaceCounts.workflows} workflows`,
    recipeSurface: `${surfaceCounts.recipes} recipes`,
    minorSeries: version.split('.').slice(0, 2).join('.')
  };
}

function includes(projectRoot, relPath, expected) {
  const text = read(projectRoot, relPath);
  return text.includes(expected);
}

function makeCheck(id, relPath, expected, opts = {}) {
  return {
    id,
    path: relPath,
    expected,
    safeFix: opts.safeFix === true,
    owner: opts.owner || (opts.safeFix ? 'local runtime' : 'god-docs-writer'),
    reason: opts.reason || ''
  };
}

function checkDefinitions(projectRoot) {
  const expected = expectedSurface(projectRoot);
  return [
    makeCheck('package-description-surface', 'package.json',
      `${expected.counts.skills} slash commands and ${expected.counts.agents} specialist agents`,
      { safeFix: true, reason: 'package metadata is a mechanical count claim' }),
    makeCheck('readme-version-badge', 'README.md', `version-${expected.version}-blue`,
      { safeFix: true, reason: 'README badge mirrors package version' }),
    makeCheck('readme-reference-counts', 'README.md',
      `all ${expected.counts.skills} skills + ${expected.counts.agents} agents`,
      { safeFix: true, reason: 'README command reference count mirrors files on disk' }),
    makeCheck('users-version', 'USERS.md', `current source version is v${expected.version}`,
      { safeFix: true, reason: 'user support source version mirrors package version' }),
    makeCheck('architecture-version', 'ARCHITECTURE.md', `STABLE v${expected.version}`,
      { safeFix: true, reason: 'architecture release marker mirrors package version' }),
    ...(expected.published
      ? [makeCheck('architecture-publication-status', 'ARCHITECTURE.md',
          `STABLE v${expected.version} published release`,
          { safeFix: true, reason: 'published versions must not retain release-candidate status' })]
      : []),
    makeCheck('architecture-surface', 'ARCHITECTURE.md',
      `Core: ${expected.surface}, ${expected.workflowSurface}`,
      { safeFix: true, reason: 'architecture surface mirrors repository counts' }),
    makeCheck('roadmap-version', 'docs/ROADMAP.md', `Current source: v${expected.version}`,
      { safeFix: true, reason: 'roadmap current source marker mirrors package version' }),
    makeCheck('roadmap-command-count', 'docs/ROADMAP.md', `**${expected.commandSurface}**`,
      { safeFix: true, reason: 'roadmap command count mirrors skills directory' }),
    makeCheck('roadmap-agent-count', 'docs/ROADMAP.md',
      `**${expected.counts.agents} specialist agents**`,
      { safeFix: true, reason: 'roadmap agent count mirrors agents directory' }),
    makeCheck('reference-version', 'docs/reference.md', `reference for v${expected.version}`,
      { safeFix: true, reason: 'reference docs version mirrors package version' }),
    makeCheck('reference-command-count', 'docs/reference.md',
      `Slash commands (${expected.counts.skills} total)`,
      { safeFix: true, reason: 'reference command count mirrors skills directory' }),
    makeCheck('reference-agent-count', 'docs/reference.md',
      `Specialist agents (${expected.counts.agents} total)`,
      { safeFix: true, reason: 'reference agent count mirrors agents directory' }),
    makeCheck('god-version-surface', 'skills/god-version.md',
      `Surface: ${expected.surface}, ${expected.workflowSurface}, ${expected.recipeSurface}`,
      { safeFix: true, reason: '/god-version output mirrors repository counts' }),
    makeCheck('god-doctor-skill-count', 'skills/god-doctor.md',
      `[OK] ${expected.counts.skills} skills installed`,
      { safeFix: true, reason: '/god-doctor sample output mirrors skills directory' }),
    makeCheck('god-doctor-agent-count', 'skills/god-doctor.md',
      `[OK] ${expected.counts.agents} agents installed`,
      { safeFix: true, reason: '/god-doctor sample output mirrors agents directory' }),
    makeCheck('release-notes-version', 'RELEASE.md', `Godpowers ${expected.version}`,
      { reason: 'release notes are narrative and should be reviewed before publish' }),
    makeCheck('changelog-version', 'CHANGELOG.md', `## [${expected.version}]`,
      { reason: 'changelog entries are narrative and should be curated' }),
    makeCheck('security-supported-series', 'SECURITY.md', `${expected.minorSeries}.x`,
      { reason: 'supported versions are release policy and should be reviewed' }),
    makeCheck('contributing-release-sync', 'CONTRIBUTING.md', 'repo documentation sync',
      { reason: 'contributor release guidance is narrative policy' })
  ];
}

function detect(projectRoot, opts = {}) {
  const expected = expectedSurface(projectRoot);
  const checks = checkDefinitions(projectRoot).map((check) => {
    const present = exists(projectRoot, check.path);
    const fresh = present && includes(projectRoot, check.path, check.expected);
    return {
      ...check,
      status: !present ? 'missing' : (fresh ? 'fresh' : 'stale')
    };
  });
  const stale = checks.filter((check) => check.status !== 'fresh');
  const safeFixes = stale.filter((check) => check.safeFix);
  const prose = stale.filter((check) => !check.safeFix);
  const changedFiles = opts.changedFiles || [];
  const touchedDocs = changedFiles.filter((file) => isRepoDocPath(file));
  const pillarSyncPlan = touchedDocs.length > 0
    ? pillars.planArtifactSync(projectRoot, touchedDocs, opts)
    : [];

  return {
    version: expected.version,
    counts: expected.counts,
    status: stale.length === 0 ? 'fresh' : 'stale',
    checks,
    stale,
    safeFixes,
    prose,
    touchedDocs,
    pillarSyncPlan,
    adjacentOpportunities: adjacentOpportunities(),
    spawnRecommendation: prose.length > 0
      ? {
          agent: 'god-docs-writer',
          reason: 'Repo documentation has narrative release, contribution, or security policy drift.',
          paths: [...new Set(prose.map((check) => check.path))].sort()
        }
      : null
  };
}

function replaceOnce(text, regex, replacement) {
  if (!regex.test(text)) return text;
  return text.replace(regex, replacement);
}

function safeFixContent(relPath, text, expected) {
  switch (relPath) {
    case 'package.json':
      return fixPackageDescription(text, expected);
    case 'README.md':
      return replaceOnce(
        replaceOnce(text, /version-[0-9]+\.[0-9]+\.[0-9]+-blue/g, `version-${expected.version}-blue`),
        /all [0-9]+ skills \+ [0-9]+ agents/g,
        `all ${expected.counts.skills} skills + ${expected.counts.agents} agents`
      );
    case 'USERS.md':
      return replaceOnce(text,
        /(?:Godpowers is at|The current source version is) v[0-9]+\.[0-9]+\.[0-9]+(?:\. Stable release\.)?/g,
        `The current source version is v${expected.version}`);
    case 'ARCHITECTURE.md':
      return replaceOnce(
        replaceOnce(
          text,
          /STABLE v[0-9]+\.[0-9]+\.[0-9]+(?: (?:release candidate|published release))?/g,
          expected.published
            ? `STABLE v${expected.version} published release`
            : `STABLE v${expected.version}`
        ),
        /Core: [0-9]+ skills, [0-9]+ agents, [0-9]+ workflows/g,
        `Core: ${expected.surface}, ${expected.workflowSurface}`
      );
    case 'docs/ROADMAP.md':
      return replaceOnce(
        replaceOnce(
          replaceOnce(text, /Current (?:shipped|source): v[0-9]+\.[0-9]+\.[0-9]+/g,
            `Current source: v${expected.version}`),
          /\*\*[0-9]+ slash commands\*\*/g,
          `**${expected.commandSurface}**`
        ),
        /\*\*[0-9]+ specialist agents\*\*/g,
        `**${expected.counts.agents} specialist agents**`
      );
    case 'docs/reference.md':
      return replaceOnce(
        replaceOnce(
          replaceOnce(text, /reference for v[0-9]+\.[0-9]+\.[0-9]+/g,
            `reference for v${expected.version}`),
          /Slash commands \([0-9]+ total\)/g,
          `Slash commands (${expected.counts.skills} total)`
        ),
        /Specialist agents \([0-9]+ total\)/g,
        `Specialist agents (${expected.counts.agents} total)`
      );
    case 'skills/god-version.md':
      return replaceOnce(text,
        /Surface: [0-9]+ skills, [0-9]+ agents, [0-9]+ workflows, [0-9]+ recipes/g,
        `Surface: ${expected.surface}, ${expected.workflowSurface}, ${expected.recipeSurface}`);
    case 'skills/god-doctor.md':
      return replaceOnce(
        replaceOnce(text, /\[OK\] [0-9]+ skills installed/g,
          `[OK] ${expected.counts.skills} skills installed`),
        /\[OK\] [0-9]+ agents installed/g,
        `[OK] ${expected.counts.agents} agents installed`
      );
    default:
      return text;
  }
}

function fixPackageDescription(text, expected) {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed.description === 'string') {
      parsed.description = parsed.description.replace(
        /[0-9]+ slash commands and [0-9]+ specialist agents/g,
        `${expected.counts.skills} slash commands and ${expected.counts.agents} specialist agents`
      );
    }
    return `${JSON.stringify(parsed, null, 2)}\n`;
  } catch (err) {
    return text;
  }
}

function isRepoDocPath(file) {
  return [
    'README.md',
    'CHANGELOG.md',
    'RELEASE.md',
    'CONTRIBUTING.md',
    'SECURITY.md',
    'SUPPORT.md',
    'AGENTS.md'
  ].includes(file) || file.startsWith('docs/');
}

function appendLog(projectRoot, before, after, applied) {
  const now = new Date().toISOString();
  const lines = [];
  // Read back mdx-first with legacy .md fallback so a pre-.mdx log's history
  // is carried into the canonical file below.
  if (existsArtifact(projectRoot, LOG_PATH)) {
    lines.push(readArtifact(projectRoot, LOG_PATH).replace(/\s*$/, ''));
    lines.push('');
  } else {
    lines.push('# Repo Documentation Sync Log');
    lines.push('');
    lines.push('- [DECISION] This file records mechanical repository documentation syncs run by Godpowers.');
    lines.push('- [DECISION] Narrative release, contribution, support, and security policy prose remains owned by humans or `god-docs-writer`.');
    lines.push('');
  }
  lines.push(`## ${now}`);
  lines.push('');
  lines.push(`- [DECISION] Repo documentation sync status before apply was ${before.status}.`);
  lines.push(`- [DECISION] Repo documentation sync status after apply is ${after.status}.`);
  if (applied.length === 0) {
    lines.push('- [DECISION] No mechanical repo documentation files were changed.');
  } else {
    for (const item of applied) {
      lines.push(`- [DECISION] Refreshed ${item.path} for ${item.checks.join(', ')}.`);
    }
  }
  if (after.spawnRecommendation) {
    lines.push(`- [HYPOTHESIS] ${after.spawnRecommendation.agent} should review ${after.spawnRecommendation.paths.join(', ')}.`);
  }
  lines.push('');
  write(projectRoot, LOG_PATH, lines.join('\n'));
  const legacy = legacyTwin(LOG_PATH);
  if (legacy && exists(projectRoot, legacy)) {
    fs.rmSync(path.join(projectRoot, legacy), { force: true });
  }
}

function run(projectRoot, opts = {}) {
  const before = detect(projectRoot, opts);
  const expected = expectedSurface(projectRoot);
  const byPath = new Map();
  const applied = [];

  for (const check of before.safeFixes) {
    if (!byPath.has(check.path)) byPath.set(check.path, []);
    byPath.get(check.path).push(check);
  }

  for (const [relPath, checks] of byPath.entries()) {
    const original = read(projectRoot, relPath);
    if (!original) continue;
    const next = safeFixContent(relPath, original, expected);
    if (next !== original) {
      write(projectRoot, relPath, next);
      applied.push({
        path: relPath,
        checks: checks.map((check) => check.id)
      });
    }
  }

  const touched = applied.map((item) => item.path);
  const pillarResults = opts.applyPillars && touched.length > 0
    ? pillars.applyArtifactSync(projectRoot, touched, opts)
    : pillars.planArtifactSync(projectRoot, touched, opts);

  const after = detect(projectRoot, { ...opts, changedFiles: touched });
  if (opts.log !== false) appendLog(projectRoot, before, after, applied);

  return {
    before,
    after,
    applied,
    pillarResults,
    logPath: opts.log === false ? null : LOG_PATH,
    hash: sha(JSON.stringify({ before: before.status, after: after.status, applied }))
  };
}

function sha(input) {
  return `sha256:${crypto.createHash('sha256').update(input).digest('hex')}`;
}

function adjacentOpportunities() {
  return [
    {
      id: 'routing-surface-sync',
      trigger: '/god-doctor, /god-help, /god-next, /god-sync',
      behavior: 'detect missing routing YAML for installed slash-command skills',
      escalation: 'suggest fix by default, auto-apply only under fix mode'
    },
    {
      id: 'package-installer-sync',
      trigger: '/god-doctor, /god-sync, release checks',
      behavior: 'detect package file allowlist and installer smoke drift when runtime files are added',
      escalation: 'suggest fix because package contents affect release'
    },
    {
      id: 'agent-contract-sync',
      trigger: '/god-agent-audit, /god-doctor, /god-sync',
      behavior: 'compare route spawns, skill docs, agent files, and agent specs',
      escalation: 'spawn god-auditor when ownership or handoff conflicts need judgment'
    },
    {
      id: 'workflow-recipe-graph-sync',
      trigger: '/god-next, /god-mode, /god-doctor',
      behavior: 'compare workflow YAML, recipes, command flows, and orchestrator guidance',
      escalation: 'spawn god-reconciler when lifecycle intent is ambiguous'
    },
    {
      id: 'extension-pack-sync',
      trigger: '/god-extension-info, /god-extension-list, /god-doctor',
      behavior: 'compare first-party extension manifests, READMEs, skills, agents, and workflows',
      escalation: 'spawn god-coordinator for multi-pack release prep'
    }
  ];
}

module.exports = {
  LOG_PATH,
  counts,
  expectedSurface,
  detect,
  run,
  adjacentOpportunities
};
