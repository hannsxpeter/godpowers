/**
 * Checkpoint Manager
 *
 * Maintains `.godpowers/CHECKPOINT.md`, a human-readable + agent-readable
 * orientation file. Anyone (new chat session, new AI tool, returning user)
 * can read this single file and know where the project is, what the last
 * action was, and what comes next.
 *
 * Design intent (context-rot protection):
 *   - Long sessions cause the AI's mental model to drift from disk.
 *   - New sessions in any tool start with zero context.
 *   - CHECKPOINT.md is the disk-authoritative "you are here" pin.
 *   - It is updated after every significant action by the orchestrator.
 *   - Reads are cheap; writes are append-aware (last 20 actions kept).
 *
 * Schema:
 *   YAML frontmatter (machine-readable):
 *     id: CHECKPOINT-{ISO8601}
 *     project: {name}
 *     mode: {A|B|C|E}
 *     mode-d-suite: {bool}
 *     lifecycle: {pre-init|in-arc|steady-state-active|...}
 *     current-tier: {tier-N}
 *     current-substep: {substep-key}
 *     progress-pct: {number}
 *     progress-complete: {number}
 *     progress-total: {number}
 *     current-step: {number}
 *     last-action: {action-name}
 *     last-actor: {agent or user}
 *     last-update: {ISO8601}
 *     facts-hash: {sha256 of the held-facts section}
 *   Markdown body (human-readable):
 *     ## Where you are
 *     ## Last 20 actions (most recent first)
 *     ## Held facts (top 10 critical decisions)
 *     ## Next suggested command
 *     ## If you're a new session
 *
 * Public API:
 *   path(projectRoot) -> string
 *   read(projectRoot) -> { frontmatter, body, facts, actions } | null
 *   write(projectRoot, state, opts) -> path
 *   recordAction(projectRoot, action) -> updated checkpoint
 *   recordFact(projectRoot, fact) -> updated checkpoint
 *   diff(projectRoot, aiClaim) -> { drifts, matches } (for /god-context-scan)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const atomic = require('./atomic-write');
const frontmatterLib = require('./frontmatter');

const MAX_ACTIONS = 20;
const MAX_FACTS = 10;

function checkpointPath(projectRoot) {
  return path.join(projectRoot, '.godpowers', 'CHECKPOINT.md');
}

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * Parse a CHECKPOINT.md file. Returns structured form or null if missing.
 */
function read(projectRoot) {
  const file = checkpointPath(projectRoot);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf8');

  const parsed = frontmatterLib.split(raw, { strict: true, source: file });
  const frontmatter = parsed.frontmatter || {};
  const body = parsed.body.trim();

  // Section parse for actions and facts
  const actions = parseList(body, 'Last actions');
  const facts = parseList(body, 'Held facts');

  return { path: file, frontmatter, body, actions, facts };
}

function parseList(body, heading) {
  const re = new RegExp(`##\\s+${heading}[^\\n]*\\n([\\s\\S]*?)(?:\\n##\\s|$)`, 'i');
  const m = body.match(re);
  if (!m) return [];
  return m[1].split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('- '))
    .map(l => l.slice(2));
}

/**
 * Write a fresh CHECKPOINT.md. Overwrites prior content.
 *
 * state shape:
 *   { project, mode, modeDSuite, lifecycle, currentTier, currentSubstep,
 *     lastAction, lastActor, actions: [...], facts: [...], nextCommand,
 *     nextReason }
 */
function write(projectRoot, state) {
  const file = checkpointPath(projectRoot);
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const ts = nowIso();
  const id = `CHECKPOINT-${ts.replace(/[:.]/g, '-')}`;
  const actions = (state.actions || []).slice(0, MAX_ACTIONS);
  const facts = (state.facts || []).slice(0, MAX_FACTS);
  const factsHash = sha256(JSON.stringify(facts));
  const progress = state.progress || null;
  const lifecycleDisplay = state.lifecycle === 'in-arc'
    ? 'in progress'
    : (state.lifecycle || 'in progress');

  const fm = [
    '---',
    `id: ${id}`,
    `project: ${state.project || 'unnamed'}`,
    `mode: ${state.mode || '?'}`,
    `mode-d-suite: ${state.modeDSuite ? 'true' : 'false'}`,
    `lifecycle: ${state.lifecycle || 'in-arc'}`,
    `current-tier: ${state.currentTier || 'tier-0'}`,
    `current-substep: ${state.currentSubstep || 'orchestration'}`,
    progress ? `progress-pct: ${progress.percent}` : null,
    progress ? `progress-complete: ${progress.completed}` : null,
    progress ? `progress-total: ${progress.total}` : null,
    progress ? `current-step: ${progress.currentStep}` : null,
    `last-action: ${state.lastAction || 'unknown'}`,
    `last-actor: ${state.lastActor || 'unknown'}`,
    `last-update: ${ts}`,
    `facts-hash: sha256:${factsHash}`,
    '---',
    ''
  ].filter(line => line !== null).join('\n');

  const progressLine = progress
    ? `- Progress: **${progress.percent}%** (${progress.completed} of ${progress.total} steps complete; current step ${progress.currentStep} of ${progress.total})`
    : null;
  const recentSummary = actions.length === 0
    ? '_(no recent actions recorded yet)_'
    : actions.slice(0, 3).map(a => `- ${a}`).join('\n');
  const nextSummary = state.nextCommand
    ? `- ${state.nextCommand}\n- ${state.nextReason || 'No reason recorded.'}`
    : '- Run `/god-next` to compute the next command from disk state.';

  const body = [
    '# Checkpoint',
    '',
    '> **For a new chat session or new AI tool**: read this file first.',
    '> It is the authoritative "where you are" pin for this Godpowers project.',
    '> Disk state always wins over conversation memory.',
    '',
    '## Where you are',
    '',
    `- Project: **${state.project || 'unnamed'}**`,
    `- Mode: **${state.mode || '?'}**${state.modeDSuite ? ' (in multi-repo suite)' : ''}`,
    `- Lifecycle phase: **${lifecycleDisplay}**`,
    progressLine,
    `- Current tier: **${state.currentTier || 'tier-0'}** / **${state.currentSubstep || 'orchestration'}**`,
    `- Last action: \`${state.lastAction || 'unknown'}\` by ${state.lastActor || 'unknown'} at ${ts}`,
    '',
    '## What happened recently',
    '',
    recentSummary,
    '',
    '## What happens next',
    '',
    nextSummary,
    '',
    '## Next suggested command',
    '',
    state.nextCommand
      ? `\`${state.nextCommand}\` - ${state.nextReason || 'no reason given'}`
      : 'Run `/god-next` to see the next command based on disk state.',
    '',
    `## Last actions (most recent first, max ${MAX_ACTIONS})`,
    '',
    actions.length === 0
      ? '_(no actions recorded yet)_'
      : actions.map(a => `- ${a}`).join('\n'),
    '',
    `## Held facts (top ${MAX_FACTS} critical decisions)`,
    '',
    facts.length === 0
      ? '_(no facts recorded yet)_'
      : facts.map(f => `- ${f}`).join('\n'),
    '',
    '## If you are a new session',
    '',
    '1. Read this whole file.',
    '2. Run `/god-locate` for a full orientation including state.json',
    '   diff and recent events.',
    '3. Run `/god-status` to verify disk reality.',
    '4. Run `/god-next` for the next suggested command.',
    '5. To resume the autonomous arc, run `/god-mode` (plain, no `--yolo`',
    '   needed): it reads this checkpoint and continues from disk. Use',
    '   `/god-resume-work` only for a manual `/god-pause-work` handoff',
    '   (it reads HANDOFF.md, not this file).',
    '6. If anything in this file feels inconsistent with what you',
    '   know, run `/god-context-scan` to surface drift.',
    '',
    '## Provenance',
    '',
    `- Generated: ${ts}`,
    `- Schema version: 1.0`,
    `- Authoritative state: \`.godpowers/state.json\``,
    `- Authoritative history: \`.godpowers/runs/<id>/events.jsonl\` + \`.godpowers/log\``,
    ''
  ].filter(line => line !== null).join('\n');

  atomic.writeFileAtomic(file, fm + body);
  return file;
}

/**
 * Append a new action to the checkpoint. Trims to MAX_ACTIONS.
 *
 * action shape: { ts, actor, name, details? }
 */
function recordAction(projectRoot, action) {
  const existing = read(projectRoot);
  const actions = existing ? existing.actions.slice() : [];
  const line = `[${action.ts || nowIso()}] ${action.actor || 'unknown'}: ${action.name}${action.details ? ' - ' + action.details : ''}`;
  actions.unshift(line);

  const state = existing ? frontmatterToState(existing.frontmatter, existing.facts) : {};
  state.actions = actions;
  state.lastAction = action.name;
  state.lastActor = action.actor;
  return write(projectRoot, state);
}

/**
 * Append a new held fact. Trims to MAX_FACTS (LRU style by reorder).
 */
function recordFact(projectRoot, fact) {
  const existing = read(projectRoot);
  const facts = existing ? existing.facts.slice() : [];
  // Dedupe
  const f = typeof fact === 'string' ? fact : `${fact.label}: ${fact.value}`;
  const i = facts.indexOf(f);
  if (i >= 0) facts.splice(i, 1);
  facts.unshift(f);

  const state = existing ? frontmatterToState(existing.frontmatter, facts) : { facts };
  state.actions = existing ? existing.actions.slice() : [];
  state.facts = facts;
  return write(projectRoot, state);
}

function frontmatterToState(fm, facts) {
  const result = {
    project: fm.project,
    mode: fm.mode,
    modeDSuite: fm['mode-d-suite'] === true || fm['mode-d-suite'] === 'true',
    lifecycle: fm.lifecycle,
    currentTier: fm['current-tier'],
    currentSubstep: fm['current-substep'],
    lastAction: fm['last-action'],
    lastActor: fm['last-actor'],
    facts: facts || []
  };
  if (fm['progress-total']) {
    result.progress = {
      percent: Number(fm['progress-pct'] || 0),
      completed: Number(fm['progress-complete'] || 0),
      total: Number(fm['progress-total'] || 0),
      currentStep: Number(fm['current-step'] || 0)
    };
  }
  return result;
}

/**
 * Compare the AI's claim about state with disk.
 *
 * aiClaim shape: { project, mode, lifecycle, currentTier, currentSubstep, lastAction }
 *
 * Returns { drifts: [...], matches: [...] }.
 * Each drift: { field, claimed, actual }.
 */
function diff(projectRoot, aiClaim) {
  const cp = read(projectRoot);
  if (!cp) return { drifts: [{ field: 'checkpoint', claimed: aiClaim, actual: 'no checkpoint file' }], matches: [] };

  const drifts = [];
  const matches = [];
  const state = cp.frontmatter;
  for (const [k, claim] of Object.entries(aiClaim || {})) {
    const mapped = {
      project: state.project,
      mode: state.mode,
      modeDSuite: state['mode-d-suite'],
      lifecycle: state.lifecycle,
      currentTier: state['current-tier'],
      currentSubstep: state['current-substep'],
      lastAction: state['last-action']
    }[k];
    if (String(claim) === String(mapped)) {
      matches.push({ field: k, value: claim });
    } else {
      drifts.push({ field: k, claimed: claim, actual: mapped });
    }
  }
  return { drifts, matches };
}

/**
 * Reconstruct the checkpoint from current disk state.
 * Use when the orchestrator finishes a sub-step and wants to refresh
 * the pin in one call instead of fine-grained recordAction calls.
 *
 * Reads .godpowers/state.json and .godpowers/runs/<latest>/events.jsonl
 * to derive: project, mode, lifecycle, current tier/substep, last action,
 * and the most recent action stream.
 *
 * opts:
 *   extraFacts: string[] - facts to also record (prepended)
 *   nextCommand: string  - next suggested command
 *   nextReason: string   - reason for the suggestion
 *
 * Returns the path to the written checkpoint.
 */
function syncFromState(projectRoot, opts = {}) {
  // Defer the requires so checkpoint.js stays a leaf module
  const state = require('./state');
  const events = require('./events');

  const s = state.read(projectRoot);
  if (!s) throw new Error('state.json not initialized');
  const progress = state.progressSummary(s);

  // Find the current tier + sub-step from progressSummary, then keep a
  // separate lastAction pointer to the newest completed step.
  let currentTier = 'tier-0';
  let currentSubstep = 'orchestration';
  let lastAction = 'init';
  let lastUpdate = null;
  let lastActor = 'unknown';
  if (progress.current) {
    currentTier = progress.current.tierKey;
    currentSubstep = progress.current.subStepKey;
  }

  if (s.tiers) {
    for (const tierKey of Object.keys(s.tiers).sort()) {
      for (const [substepKey, sub] of Object.entries(s.tiers[tierKey])) {
        if (sub.status === 'done' && sub.updated) {
          if (!lastUpdate || sub.updated > lastUpdate) {
            lastUpdate = sub.updated;
            lastAction = `${tierKey}.${substepKey} done`;
          }
        }
      }
    }
  }

  // Pull last 20 actions from events tail
  const runs = events.listRuns(projectRoot);
  const actions = [];
  if (runs.length > 0) {
    const latest = runs[runs.length - 1];
    const all = events.readRun(projectRoot, latest);
    // Walk backward; emit lines for human-significant events
    const significant = ['agent.end', 'agent.pause', 'gate.fail', 'gate.pass',
                         'tier.skip', 'state.repair', 'state.rollback',
                         'extension.install', 'error'];
    for (let i = all.length - 1; i >= 0 && actions.length < MAX_ACTIONS; i--) {
      const e = all[i];
      if (!significant.includes(e.name)) continue;
      const tier = (e.attrs && e.attrs.tier) ? `[${e.attrs.tier}] ` : '';
      const agent = (e.attrs && e.attrs.agent) ? e.attrs.agent + ': ' : '';
      actions.push(`[${e.ts}] ${tier}${agent}${e.name}`);
      if (i === all.length - 1) {
        lastAction = e.name;
        lastActor = (e.attrs && e.attrs.agent) || 'system';
      }
    }
  }

  // Carry forward existing facts; prepend new ones from opts
  const existing = read(projectRoot);
  const facts = (opts.extraFacts || []).concat(
    existing ? existing.facts : []
  ).slice(0, MAX_FACTS);

  return write(projectRoot, {
    project: s.project && s.project.name,
    mode: s.mode,
    modeDSuite: !!s['mode-d-suite'],
    lifecycle: s['lifecycle-phase'] || 'in-arc',
    currentTier,
    currentSubstep,
    lastAction,
    lastActor,
    actions,
    facts,
    progress,
    nextCommand: opts.nextCommand,
    nextReason: opts.nextReason
  });
}

module.exports = {
  checkpointPath,
  path: checkpointPath,
  read,
  write,
  recordAction,
  recordFact,
  syncFromState,
  diff,
  MAX_ACTIONS,
  MAX_FACTS
};
