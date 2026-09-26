/**
 * `godpowers migrate`: move a Godpowers 6 project to the 7 layout.
 *
 * Nothing is deleted. Every 6.x file under `.godpowers/` moves to
 * `.godpowers/archive/v6/`, the new STATE.md takes its stage from the old tier
 * statuses, PLAN.md points at the archived planning documents, and the old
 * instruction blocks in AGENTS.md, CLAUDE.md, and editor rule files are
 * replaced by the short 7.x note.
 */

const fs = require('fs');
const path = require('path');

const { projectFiles, layout } = require('./paths');
const templates = require('./templates');
const context = require('./context');
const { detectVerify, isLocalOnly, ensureUnionMerge } = require('./init');

const DONE = new Set(['done', 'complete', 'completed', 'skipped', 'not-required', 'not-applicable', 'n/a']);

function readLegacyState(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return null;
  }
}

function subStatus(tiers, tier, sub) {
  const value = tiers && tiers[tier] && tiers[tier][sub];
  if (!value) return null;
  return typeof value === 'string' ? value : value.status || null;
}

/** Map 6.x tier statuses onto a 7.x stage. */
function stageFromTiers(tiers) {
  const done = (tier, sub) => {
    const value = subStatus(tiers, tier, sub);
    return value !== null && DONE.has(String(value).toLowerCase());
  };
  if (!(done('tier-1', 'prd') && done('tier-1', 'arch') && done('tier-1', 'roadmap'))) return 'plan';
  if (!done('tier-2', 'build')) return 'build';
  if (!done('tier-3', 'harden')) return 'harden';
  if (!(done('tier-3', 'deploy') && done('tier-3', 'launch'))) return 'ship';
  return 'done';
}

function firstExisting(dir, candidates) {
  return candidates.find(rel => fs.existsSync(path.join(dir, rel))) || null;
}

/** Work out what a migration would do without writing anything. */
function plan(root) {
  const kind = layout(root);
  if (kind !== 'v6') return { ok: false, reason: kind === 'v7' ? 'already on the 7.x layout' : 'no Godpowers 6 project here' };
  const files = projectFiles(root);
  const legacy = readLegacyState(files.legacyState) || {};
  const archiveName = fs.existsSync(path.join(files.archive, 'v6')) ? `v6-${Date.now()}` : 'v6';
  const archiveDir = path.join(files.archive, archiveName);
  const moves = fs.readdirSync(files.dir).filter(name => name !== 'archive');
  const docs = {
    prd: firstExisting(files.dir, ['prd/PRD.mdx', 'prd/PRD.md']),
    arch: firstExisting(files.dir, ['arch/ARCH.mdx', 'arch/ARCH.md']),
    roadmap: firstExisting(files.dir, ['roadmap/ROADMAP.mdx', 'roadmap/ROADMAP.md']),
    findings: firstExisting(files.dir, ['harden/FINDINGS.mdx', 'harden/FINDINGS.md']),
    todos: firstExisting(files.dir, ['todos/TODOS.mdx', 'todos/TODOS.md'])
  };
  return {
    ok: true,
    project: (legacy.project && legacy.project.name) || path.basename(path.resolve(root)),
    stage: stageFromTiers(legacy.tiers),
    verify: detectVerify(root) || '',
    archiveDir,
    moves,
    docs,
    context: context.cleanLegacy(root, { dryRun: true })
  };
}

function archived(result, rel) {
  return rel ? path.relative(result.root, path.join(result.archiveDir, rel)).split(path.sep).join('/') : null;
}

/** Run the migration. Returns the plan plus what was written. */
function migrate(root, { dryRun = false, agentsMd = true } = {}) {
  const result = { ...plan(root), root };
  if (!result.ok || dryRun) return result;
  const files = projectFiles(root);
  fs.mkdirSync(result.archiveDir, { recursive: true });
  for (const name of result.moves) fs.renameSync(path.join(files.dir, name), path.join(result.archiveDir, name));

  const prd = archived(result, result.docs.prd);
  const goal = prd ? `Carried over from Godpowers 6; see \`${prd}\`. Restate it here with /god-plan.` : undefined;
  const now = ['Migrated from Godpowers 6. The old files are in `.godpowers/archive/`.'];
  if (result.docs.findings) now.push(`Check \`${archived(result, result.docs.findings)}\` for security findings that are still open and list them under Risks.`);
  if (result.docs.todos) now.push(`Open work from 6.x: \`${archived(result, result.docs.todos)}\`.`);
  fs.writeFileSync(files.state, templates.stateTemplate({
    project: result.project,
    goal,
    verify: result.verify,
    stage: result.stage,
    now,
    next: ['Run /god-plan to refresh the plan from the archived documents.']
  }));
  const links = [['Requirements (PRD)', result.docs.prd], ['Architecture', result.docs.arch], ['Roadmap', result.docs.roadmap]]
    .filter(([, rel]) => rel)
    .map(([label, rel]) => `- ${label}: \`${archived(result, rel)}\``);
  fs.writeFileSync(files.plan, templates.planTemplate({
    goal,
    extra: links.length ? ['## Earlier planning (6.x)', ...links].join('\n') : undefined
  }));
  fs.writeFileSync(files.decisions, templates.decisionsTemplate({
    entries: [{
      title: 'Move to the Godpowers 7 layout',
      context: 'Godpowers 7 keeps one state file, a plan, this decision log, and an evidence ledger.',
      decision: `Archived the 6.x files under \`${path.relative(root, result.archiveDir).split(path.sep).join('/')}/\`.`,
      why: 'Less state to keep in sync; gates are enforced by code instead of instructions.'
    }]
  }));
  if (!fs.existsSync(files.evidence)) fs.writeFileSync(files.evidence, '');
  // Keep a copy of every instruction file the cleanup changes or deletes.
  for (const action of context.cleanLegacy(root, { dryRun: true })) {
    const copy = path.join(result.archiveDir, 'instruction-files', action.file);
    fs.mkdirSync(path.dirname(copy), { recursive: true });
    fs.copyFileSync(path.join(root, action.file), copy);
  }
  result.context = context.cleanLegacy(root);
  result.agents = !agentsMd ? 'skipped' : isLocalOnly(root) ? 'skipped (.godpowers/ is not tracked)' : context.writeAgentsNote(root);
  ensureUnionMerge(root);
  return result;
}

module.exports = { stageFromTiers, plan, migrate };
