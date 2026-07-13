/**
 * Release-blocking truth checks for the Godpowers repository itself.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const stateStore = require('./state');
const stateViews = require('./state-views');

const COMPLETE = new Set(['done', 'imported', 'skipped', 'not-required']);
const REQUIRED_STATE_STEPS = [
  'tier-0.orchestration',
  'tier-0.preflight',
  'tier-0.archaeology',
  'tier-0.tech-debt',
  'tier-0.greenfield-simulation',
  'tier-0.greenfieldify',
  'tier-0.sync',
  'tier-1.prd',
  'tier-1.design',
  'tier-1.product',
  'tier-1.arch',
  'tier-1.roadmap',
  'tier-1.stack',
  'tier-2.repo',
  'tier-2.build',
  'tier-3.deploy',
  'tier-3.observe',
  'tier-3.harden',
  'tier-3.launch'
];
const REQUIRED_ARTIFACTS = {
  'tier-0.preflight': '.godpowers/preflight/PREFLIGHT.mdx',
  'tier-0.archaeology': '.godpowers/archaeology/REPORT.mdx',
  'tier-0.tech-debt': '.godpowers/tech-debt/ASSESSMENT.mdx',
  'tier-0.greenfield-simulation': '.godpowers/audit/GREENFIELD-SIMULATION.mdx',
  'tier-0.greenfieldify': '.godpowers/audit/GREENFIELDIFY-PLAN.mdx',
  'tier-0.sync': '.godpowers/SYNC-LOG.mdx',
  'tier-1.prd': '.godpowers/prd/PRD.mdx',
  'tier-1.arch': '.godpowers/arch/ARCH.mdx',
  'tier-1.roadmap': '.godpowers/roadmap/ROADMAP.mdx',
  'tier-1.stack': '.godpowers/stack/DECISION.mdx',
  'tier-2.repo': '.godpowers/repo/AUDIT.mdx',
  'tier-2.build': stateViews.STATE_VIEW_PATHS.build,
  'tier-3.deploy': stateViews.STATE_VIEW_PATHS.deploy,
  'tier-3.observe': stateViews.STATE_VIEW_PATHS.observe,
  'tier-3.harden': '.godpowers/harden/FINDINGS.mdx',
  'tier-3.launch': stateViews.STATE_VIEW_PATHS.launch
};
const ROADMAP_HASH_SOURCES = [
  'package.json',
  '.godpowers/prd/PRD.mdx',
  '.godpowers/arch/ARCH.mdx',
  '.godpowers/stack/DECISION.mdx'
];

function read(root, relPath) {
  const file = path.join(root, relPath);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

function json(root, relPath) {
  const text = read(root, relPath);
  if (text === null) return null;
  try { return JSON.parse(text); } catch (_) { return null; }
}

function sha(text) {
  return `sha256:${crypto.createHash('sha256').update(text).digest('hex')}`;
}

function countFiles(root, relDir, predicate) {
  const dir = path.join(root, relDir);
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((name) => predicate(name)).length;
}

function add(result, id, pass, artifact, reason) {
  result.checks.push({ id, status: pass ? 'pass' : 'fail', artifact, reason });
  if (!pass) result.findings.push({ id, severity: 'error', artifact, reason });
}

function versionChecks(root, result, version) {
  const lock = json(root, 'package-lock.json');
  const mcp = json(root, 'packages/mcp/package.json');
  const mcpLock = lock && lock.packages ? lock.packages['packages/mcp'] : null;
  add(result, 'version:package-lock', Boolean(lock && lock.version === version), 'package-lock.json',
    `package-lock.json must record ${version}.`);
  add(result, 'version:mcp-package', Boolean(mcp && mcp.version === version), 'packages/mcp/package.json',
    `MCP package must record ${version}.`);
  add(result, 'version:mcp-lock', Boolean(mcpLock && mcpLock.version === version), 'package-lock.json',
    `MCP lock entry must record ${version}.`);

  const surfaces = [
    ['README.md', new RegExp(`version-${version.replace(/\./g, '\\.')}-(?:blue|green)`, 'i')],
    ['RELEASE.md', new RegExp(`^# Godpowers ${version.replace(/\./g, '\\.')} Release`, 'm')],
    ['USERS.md', new RegExp(`current source version is v?${version.replace(/\./g, '\\.')}`, 'i')],
    ['agents/context.md', new RegExp(`current repository version is [^\\n]*${version.replace(/\./g, '\\.')}`, 'i')],
    ['docs/reference.md', new RegExp(`for v${version.replace(/\./g, '\\.')}`, 'i')],
    ['docs/ROADMAP.md', new RegExp(`current source: v${version.replace(/\./g, '\\.')}`, 'i')]
  ];
  for (const [relPath, pattern] of surfaces) {
    const text = read(root, relPath);
    add(result, `version:${relPath}`, Boolean(text && pattern.test(text)), relPath,
      `${relPath} must identify current source version ${version}.`);
  }
}

function surfaceChecks(root, result, pkg) {
  const counts = {
    skills: countFiles(root, 'skills', (name) => name.endsWith('.md')),
    agents: countFiles(root, 'specialists', (name) => /^god-.*\.md$/.test(name)),
    workflows: countFiles(root, 'workflows', (name) => name.endsWith('.yaml')),
    recipes: countFiles(root, 'routing/recipes', (name) => name.endsWith('.yaml'))
  };
  result.summary.surface = counts;
  const surfaces = ['README.md', 'RELEASE.md', 'agents/context.md'];
  for (const relPath of surfaces) {
    const text = read(root, relPath) || '';
    for (const [kind, count] of Object.entries(counts)) {
      const noun = kind === 'skills' ? 'slash commands' : kind;
      const qualifier = kind === 'agents' ? '(?:specialist )?'
        : kind === 'workflows' ? '(?:executable )?'
          : kind === 'recipes' ? '(?:intent )?'
            : '';
      add(result, `surface:${relPath}:${kind}`, new RegExp(`\\b${count} ${qualifier}${noun}\\b`, 'i').test(text), relPath,
        `${relPath} must record ${count} ${noun}.`);
    }
  }
  add(result, 'surface:package-description', new RegExp(`\\b${counts.skills} slash commands\\b`).test(pkg.description || ''),
    'package.json', `package.json description must record ${counts.skills} slash commands.`);
}

function stateChecks(root, result) {
  const current = stateStore.read(root);
  add(result, 'state:present', Boolean(current), '.godpowers/state.json', 'state.json must exist and parse.');
  if (!current) return;
  add(result, 'state:lifecycle', current['lifecycle-phase'] === 'steady-state-active', '.godpowers/state.json',
    'Lifecycle must be steady-state-active before release.');

  for (const id of REQUIRED_STATE_STEPS) {
    const [tierKey, stepKey] = id.split('.');
    const present = Boolean(current.tiers && current.tiers[tierKey] && current.tiers[tierKey][stepKey]);
    add(result, `state:required:${id}`, present, '.godpowers/state.json', `${id} must exist in release state.`);
  }

  for (const [tierKey, tier] of Object.entries(current.tiers || {})) {
    for (const [stepKey, step] of Object.entries(tier || {})) {
      const id = `${tierKey}.${stepKey}`;
      const complete = step && COMPLETE.has(step.status);
      add(result, `state:complete:${id}`, complete, '.godpowers/state.json', `${id} must have a complete status.`);
      if (complete && step.status !== 'not-required') {
        const recorded = step && typeof step.artifact === 'string' ? step.artifact.replace(/^\.godpowers\//, '') : '';
        const artifact = recorded ? `.godpowers/${recorded}` : null;
        add(result, `artifact-record:${id}`, Boolean(artifact), '.godpowers/state.json',
          `${id} must record its release artifact path.`);
        if (artifact) {
          const canonical = REQUIRED_ARTIFACTS[id];
          if (canonical) {
            add(result, `artifact-path:${id}`, artifact === canonical, '.godpowers/state.json',
              `${id} must record canonical artifact ${canonical}.`);
          }
          const content = read(root, artifact);
          add(result, `artifact:${id}`, content !== null, artifact, `${id} requires ${artifact} on disk.`);
          if (content !== null && step['artifact-hash']) {
            add(result, `artifact-hash:${id}`, sha(content) === step['artifact-hash'], artifact,
              `${id} artifact hash must match the file on disk.`);
          }
        }
      }
    }
  }

  const progressPath = path.join(root, stateViews.PROGRESS_VIEW_PATH);
  const parsed = fs.existsSync(progressPath) ? stateViews.parseManaged(progressPath) : null;
  const summary = stateViews.progressSummary(current);
  add(result, 'progress:checksum', Boolean(parsed && parsed.validChecksum), stateViews.PROGRESS_VIEW_PATH,
    'PROGRESS.mdx must be the valid generated view of state.json.');
  add(result, 'progress:current', Boolean(parsed && parsed.body === stateViews.buildProgressBody(current)),
    stateViews.PROGRESS_VIEW_PATH, 'PROGRESS.mdx managed content must match current state.json.');
  add(result, 'progress:complete', summary.total > 0 && summary.completed === summary.total,
    stateViews.PROGRESS_VIEW_PATH, 'Generated progress must report every tracked step complete.');

  for (const spec of stateViews.STATE_VIEW_SPECS) {
    const step = current.tiers && current.tiers[spec.tierKey]
      ? current.tiers[spec.tierKey][spec.subStepKey]
      : null;
    if (!step || !COMPLETE.has(step.status) || step.status === 'not-required') continue;
    const file = stateViews.stateViewPath(root, spec);
    const view = file ? stateViews.parseManaged(file) : null;
    add(result, `state-view:${spec.tierKey}.${spec.subStepKey}`, Boolean(
      view && view.validChecksum && view.body === stateViews.buildStateViewBody(current, spec)
    ), spec.relPath, `${spec.relPath} managed content must match current state.json.`);
  }

  const requirements = read(root, '.godpowers/REQUIREMENTS.mdx') || '';
  const total = (requirements.match(/^- \[[ x]\] \*\*P-/gm) || []).length;
  const done = (requirements.match(/^- \[x\] \*\*P-/gm) || []).length;
  const deliverables = current.deliverables && current.deliverables.requirements;
  add(result, 'requirements:counts', Boolean(deliverables && deliverables.total === total && deliverables.done === done),
    '.godpowers/REQUIREMENTS.mdx', 'Requirement checkbox counts must match state deliverables.');
  add(result, 'requirements:complete', total > 0 && done === total, '.godpowers/REQUIREMENTS.mdx',
    'Every release requirement must be complete.');
}

function roadmapChecks(root, result, version) {
  const roadmapPath = '.godpowers/roadmap/ROADMAP.mdx';
  const roadmap = read(root, roadmapPath) || '';
  add(result, 'roadmap:generated-at', /Evidence generated at: `\d{4}-\d{2}-\d{2}T[^`]+`/.test(roadmap), roadmapPath,
    'Roadmap must record an evidence generation timestamp.');
  add(result, 'roadmap:source-version', roadmap.includes(`Source version: \`${version}\``), roadmapPath,
    `Roadmap source version must be ${version}.`);
  for (const relPath of ROADMAP_HASH_SOURCES) {
    const source = read(root, relPath);
    const expected = source === null ? null : sha(source);
    const pattern = expected ? `Source hash \`${relPath}\`: \`${expected}\`` : '';
    add(result, `roadmap:hash:${relPath}`, Boolean(expected && roadmap.includes(pattern)), roadmapPath,
      `Roadmap must contain the current hash for ${relPath}.`);
  }
}

function check(projectRoot = process.cwd()) {
  const root = path.resolve(projectRoot);
  const result = { verdict: 'fail', project: root, checks: [], findings: [], summary: {} };
  const pkg = json(root, 'package.json');
  add(result, 'package:godpowers', Boolean(pkg && pkg.name === 'godpowers'), 'package.json',
    'Self-project truth check requires the godpowers package root.');
  if (!pkg || pkg.name !== 'godpowers') return result;
  result.summary.version = pkg.version;
  versionChecks(root, result, pkg.version);
  surfaceChecks(root, result, pkg);
  stateChecks(root, result);
  roadmapChecks(root, result, pkg.version);
  result.verdict = result.findings.length === 0 ? 'pass' : 'fail';
  result.summary.passed = result.checks.filter((item) => item.status === 'pass').length;
  result.summary.failed = result.checks.filter((item) => item.status === 'fail').length;
  return result;
}

function render(result) {
  const lines = ['Godpowers Self-Project Truth', '', `Verdict: ${result.verdict}`];
  for (const finding of result.findings) {
    lines.push(`FAIL ${finding.id}: ${finding.artifact}: ${finding.reason}`);
  }
  lines.push('', `Checks: ${result.summary.passed || 0} passed, ${result.summary.failed || result.findings.length} failed`);
  return lines.join('\n');
}

module.exports = { REQUIRED_STATE_STEPS, REQUIRED_ARTIFACTS, ROADMAP_HASH_SOURCES, sha, check, render };
