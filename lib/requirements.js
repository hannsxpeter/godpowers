/**
 * Requirements / Deliverable Tracking
 *
 * Answers the question "which requirements are done, in progress, or not
 * started yet?" with a disk-derived, human-readable view. Nothing here is
 * remembered: status is computed every time from
 *
 *   .godpowers/prd/PRD.md          declared requirements (P-MUST/SHOULD/COULD)
 *   .godpowers/roadmap/ROADMAP.md  delivery increments and their member reqs
 *   .godpowers/links/              linkage forward map (requirement -> code)
 *   .godpowers/state.json          build/increment completion
 *
 * Status rules (honest, evidence-based):
 *   untouched   - no code is linked to the requirement yet
 *   in-progress - code is linked, but its increment (or the build) is not done
 *   done        - code is linked AND its increment is done (or build complete)
 *
 * Public API:
 *   parsePrdRequirements(projectRoot) -> [{ id, priority, text, acceptance }]
 *   parseRoadmapIncrements(projectRoot) -> [{ id, name, horizon, requirements, declaredStatus }]
 *   derive(projectRoot, opts) -> { hasRequirements, requirements, increments, summary, gaps, updated }
 *   progressBar(done, total, width) -> "[####----] 4/10"
 *   renderLedger(derived) -> markdown for .godpowers/REQUIREMENTS.md
 *   renderProgressLines(derived) -> string[] compact block for the dashboard
 *   writeLedger(projectRoot, derived) -> writes the ledger, returns its path
 *   summarizeForState(derived) -> small object cached under state.deliverables
 */

const fs = require('fs');
const path = require('path');

const linkage = require('./linkage');
const state = require('./state');

const PRD_PATH = '.godpowers/prd/PRD.md';
const ROADMAP_PATH = '.godpowers/roadmap/ROADMAP.md';
const LEDGER_PATH = '.godpowers/REQUIREMENTS.md';

const PRIORITIES = ['MUST', 'SHOULD', 'COULD'];
const REQ_ID_RE = /\bP-(MUST|SHOULD|COULD)-(\d+)\b/;
const REQ_ID_RE_G = /\bP-(MUST|SHOULD|COULD)-\d+\b/g;
const MILESTONE_ID_RE = /\bM-[\w-]+\b/;
const LABEL_RE = /\[(?:DECISION|HYPOTHESIS|OPEN QUESTION)\]/g;

function readText(projectRoot, relPath) {
  const file = path.join(projectRoot, relPath);
  if (!fs.existsSync(file)) return null;
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (e) {
    return null;
  }
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'increment';
}

// ============================================================================
// PRD parsing
// ============================================================================

/**
 * Parse declared requirements from the PRD. Each MUST/SHOULD/COULD bullet
 * becomes a requirement. Explicit `P-MUST-01` ids are honored; bullets without
 * an id are numbered by position within their priority so legacy PRDs still
 * parse.
 */
function parsePrdRequirements(projectRoot) {
  const content = readText(projectRoot, PRD_PATH);
  if (!content) return [];

  const lines = content.split(/\r?\n/);
  const reqs = [];
  const counters = { MUST: 0, SHOULD: 0, COULD: 0 };
  let priority = null;

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const heading = line.match(/^#{2,4}\s+(.*)$/);
    if (heading) {
      const title = heading[1].trim().toUpperCase();
      const hit = PRIORITIES.find(p => title.startsWith(p));
      priority = hit || null;
      continue;
    }
    if (!priority) continue;

    // Top-level list item only (requirement bullets are not indented).
    const item = line.match(/^[-*]\s+(.*)$/);
    if (!item) continue;
    let body = item[1].trim();
    if (!body) continue;
    // Drop a leading checkbox if a ledger-style PRD ever feeds back in.
    body = body.replace(/^\[[ xX~]\]\s*/, '');

    const idMatch = body.match(REQ_ID_RE);
    let id;
    let prio;
    if (idMatch) {
      prio = idMatch[1];
      id = idMatch[0];
      counters[prio] = Math.max(counters[prio], Number(idMatch[2]));
    } else {
      prio = priority;
      counters[prio] += 1;
      id = `P-${prio}-${pad2(counters[prio])}`;
    }

    let text = body
      .replace(REQ_ID_RE, '')
      .replace(LABEL_RE, '')
      .replace(/^[:\-\s]+/, '')
      .trim();

    let acceptance = '';
    const accSplit = text.split(/\s+--\s+(?:Acceptance|Validation):\s*/i);
    if (accSplit.length > 1) {
      text = accSplit[0].trim();
      acceptance = accSplit.slice(1).join(' / ').trim();
    }

    reqs.push({ id, priority: prio, text: text || '(unspecified)', acceptance });
  }

  // De-duplicate by id, keeping the first occurrence.
  const seen = new Set();
  return reqs.filter(r => (seen.has(r.id) ? false : seen.add(r.id)));
}

// ============================================================================
// ROADMAP parsing
// ============================================================================

/**
 * Parse delivery increments and the requirements each one covers. Increments
 * may carry an explicit `M-slug` id and a `Status:` field; both are optional.
 */
function parseRoadmapIncrements(projectRoot) {
  const content = readText(projectRoot, ROADMAP_PATH);
  if (!content) return [];

  const lines = content.split(/\r?\n/);
  const increments = [];
  let horizon = null;
  let current = null;
  let inHaveNots = false;

  const flush = () => {
    if (current) increments.push(current);
    current = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');

    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) {
      flush();
      const title = h2[1].trim().toLowerCase();
      inHaveNots = title.includes('have-not');
      if (title.startsWith('now')) horizon = 'now';
      else if (title.startsWith('next')) horizon = 'next';
      else if (title.startsWith('later')) horizon = 'later';
      else horizon = null;
      continue;
    }

    const h3 = line.match(/^###\s+(.*)$/);
    if (h3 && horizon && !inHaveNots) {
      flush();
      let name = h3[1].trim();
      name = name.replace(/^Delivery Increment\s*\d+\s*:\s*/i, '');
      name = name.replace(/^Theme\s*:\s*/i, '');
      const idMatch = h3[1].match(MILESTONE_ID_RE);
      current = {
        id: idMatch ? idMatch[0] : null,
        name: name || h3[1].trim(),
        horizon,
        requirements: [],
        declaredStatus: null
      };
      continue;
    }

    if (!current) continue;

    const idLine = line.match(/^\s*[-*]\s*\*\*ID\*\*\s*:\s*(.+)$/i);
    if (idLine) {
      const m = idLine[1].match(MILESTONE_ID_RE);
      if (m) current.id = m[0];
      continue;
    }

    const statusLine = line.match(/^\s*[-*]\s*\*\*Status\*\*\s*:\s*(.+)$/i);
    if (statusLine) {
      current.declaredStatus = normalizeStatus(statusLine[1].trim());
      continue;
    }

    let m;
    while ((m = REQ_ID_RE_G.exec(line)) !== null) {
      if (!current.requirements.includes(m[0])) current.requirements.push(m[0]);
    }
  }
  flush();

  for (const inc of increments) {
    if (!inc.id) inc.id = `M-${slugify(inc.name)}`;
  }
  return increments;
}

function normalizeStatus(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return null;
  if (['done', 'complete', 'completed', 'shipped', 'verified'].some(s => v.startsWith(s))) return 'done';
  if (['building', 'in-progress', 'in progress', 'active', 'wip'].some(s => v.startsWith(s))) return 'building';
  if (['pending', 'not started', 'not-started', 'todo', 'planned', 'queued'].some(s => v.startsWith(s))) return 'pending';
  return null;
}

// ============================================================================
// Status derivation
// ============================================================================

function buildComplete(projectRoot) {
  const s = state.read(projectRoot);
  const build = s && s.tiers && s.tiers['tier-2'] && s.tiers['tier-2'].build;
  return Boolean(build && state.isCompleteStatus(build.status));
}

/**
 * Compute the full deliverable picture from disk.
 */
function derive(projectRoot, opts = {}) {
  const requirements = parsePrdRequirements(projectRoot);
  const increments = parseRoadmapIncrements(projectRoot);
  const forward = linkage.readForward(projectRoot);
  const isBuilt = Object.prototype.hasOwnProperty.call(opts, 'buildComplete')
    ? Boolean(opts.buildComplete)
    : buildComplete(projectRoot);

  const isLinked = id => Array.isArray(forward[id]) && forward[id].length > 0;
  const reqById = new Map(requirements.map(r => [r.id, r]));

  // Requirement -> increment (first increment that lists it wins).
  const incForReq = new Map();
  for (const inc of increments) {
    for (const id of inc.requirements) {
      if (!incForReq.has(id)) incForReq.set(id, inc);
    }
  }

  // Derive increment status from member-requirement linkage + declared status.
  for (const inc of increments) {
    const members = inc.requirements.filter(id => reqById.has(id));
    const mustMembers = members.filter(id => reqById.get(id).priority === 'MUST');
    const anyLinked = members.some(isLinked);
    const gateMembers = mustMembers.length > 0 ? mustMembers : members;
    const gateLinked = gateMembers.length > 0 && gateMembers.every(isLinked);

    let status;
    if (inc.declaredStatus === 'done') status = 'done';
    else if (gateLinked && isBuilt) status = 'done';
    else if (anyLinked || inc.declaredStatus === 'building') status = 'building';
    else status = inc.declaredStatus || 'pending';

    inc.status = status;
    inc.memberIds = members;
  }

  // Derive each requirement's status.
  const enriched = requirements.map(r => {
    const inc = incForReq.get(r.id) || null;
    const linked = isLinked(r.id);
    const files = linked ? forward[r.id].slice() : [];
    let status;
    if (!linked) status = 'untouched';
    else if (inc ? inc.status === 'done' : isBuilt) status = 'done';
    else status = 'in-progress';
    const gap = Boolean(inc && inc.status === 'done' && !linked);
    return {
      id: r.id,
      priority: r.priority,
      text: r.text,
      acceptance: r.acceptance,
      status,
      gap,
      files,
      increment: inc ? inc.id : null,
      incrementName: inc ? inc.name : null
    };
  });

  // Increment done-counts based on final requirement statuses.
  const statusById = new Map(enriched.map(r => [r.id, r.status]));
  for (const inc of increments) {
    inc.doneCount = inc.memberIds.filter(id => statusById.get(id) === 'done').length;
    inc.totalCount = inc.memberIds.length;
  }

  const summary = summarize(enriched, increments);
  const gaps = enriched.filter(r => r.gap);

  return {
    hasRequirements: enriched.length > 0,
    requirements: enriched,
    increments,
    summary,
    gaps,
    updated: new Date().toISOString()
  };
}

function summarize(requirements, increments) {
  const byPriority = {};
  for (const p of PRIORITIES) {
    byPriority[p] = { done: 0, inProgress: 0, untouched: 0, total: 0 };
  }
  let done = 0;
  let inProgress = 0;
  let untouched = 0;
  for (const r of requirements) {
    const bucket = byPriority[r.priority] || (byPriority[r.priority] = { done: 0, inProgress: 0, untouched: 0, total: 0 });
    bucket.total += 1;
    if (r.status === 'done') { done += 1; bucket.done += 1; }
    else if (r.status === 'in-progress') { inProgress += 1; bucket.inProgress += 1; }
    else { untouched += 1; bucket.untouched += 1; }
  }
  const total = requirements.length;
  const incStatus = { done: 0, building: 0, pending: 0 };
  for (const inc of increments) incStatus[inc.status] = (incStatus[inc.status] || 0) + 1;

  return {
    total,
    done,
    inProgress,
    untouched,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    byPriority,
    increments: { total: increments.length, ...incStatus }
  };
}

// ============================================================================
// Rendering
// ============================================================================

function progressBar(done, total, width = 20) {
  if (!total || total <= 0) return `[${'-'.repeat(width)}] 0/0`;
  const filled = Math.max(0, Math.min(width, Math.round((done / total) * width)));
  return `[${'#'.repeat(filled)}${'-'.repeat(width - filled)}] ${done}/${total}`;
}

const MARK = { done: '[x]', 'in-progress': '[~]', untouched: '[ ]' };
const INC_MARK = { done: '[x]', building: '[~]', pending: '[ ]' };
const UPDATED_LINE_RE = /^Updated: .+$/m;

function finishLedger(lines) {
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

function normalizeLedgerTimestamp(content) {
  return String(content).replace(UPDATED_LINE_RE, 'Updated: <timestamp>');
}

function withoutUpdated(value) {
  if (!value || typeof value !== 'object') return value;
  const copy = JSON.parse(JSON.stringify(value));
  delete copy.updated;
  return copy;
}

function sameIgnoringUpdated(a, b) {
  return JSON.stringify(withoutUpdated(a)) === JSON.stringify(withoutUpdated(b));
}

/**
 * Compact lines for the dashboard "Deliverable progress" section.
 */
function renderProgressLines(derived) {
  if (!derived || !derived.hasRequirements) {
    return ['  Requirements: none declared yet (no PRD requirements found)'];
  }
  const s = derived.summary;
  const byPriority = PRIORITIES
    .filter(p => s.byPriority[p] && s.byPriority[p].total > 0)
    .map(p => `${p} ${s.byPriority[p].done}/${s.byPriority[p].total}`)
    .join(', ');
  const lines = [
    `  Requirements: ${progressBar(s.done, s.total)} done (${s.percent}%), ${s.inProgress} in progress, ${s.untouched} not started`
  ];
  if (byPriority) lines.push(`  By priority: ${byPriority}`);
  if (s.increments.total > 0) {
    lines.push(`  Increments: ${s.increments.done} done, ${s.increments.building} building, ${s.increments.pending} pending`);
  }
  if (derived.gaps.length > 0) {
    lines.push(`  Gaps: ${derived.gaps.length} requirement(s) in a done increment with no linked code`);
  }
  lines.push(`  Ledger: ${LEDGER_PATH}`);
  return lines;
}

/**
 * Full human-readable ledger written to .godpowers/REQUIREMENTS.md.
 */
function renderLedger(derived) {
  const s = derived.summary;
  const out = [];
  out.push('# Requirements Ledger');
  out.push('');
  out.push('> Disk-derived. Status comes from the linkage map (code that implements');
  out.push('> each requirement) plus build and roadmap-increment state. Regenerate with');
  out.push('> `/god-progress`, `/god-status`, or `/god-sync`. Do not hand-edit statuses;');
  out.push('> they are recomputed from disk.');
  out.push('');
  out.push(`Updated: ${derived.updated}`);
  out.push('Source: PRD + ROADMAP + linkage forward map + build state');

  if (!derived.hasRequirements) {
    out.push('');
    out.push('No requirements are declared yet. Once the PRD lists MUST/SHOULD/COULD');
    out.push('requirements with stable ids (P-MUST-01, ...), they appear here.');
    out.push('');
    return finishLedger(out);
  }

  out.push(`Progress: ${progressBar(s.done, s.total)} done (${s.percent}%) | ${s.inProgress} in progress | ${s.untouched} not started`);
  out.push('');
  out.push('## By priority');
  out.push('');
  out.push('| Priority | Done | In progress | Not started | Total |');
  out.push('|----------|------|-------------|-------------|-------|');
  for (const p of PRIORITIES) {
    const b = s.byPriority[p];
    if (!b || b.total === 0) continue;
    out.push(`| ${p} | ${b.done} | ${b.inProgress} | ${b.untouched} | ${b.total} |`);
  }
  out.push('');

  const groups = [
    ['Done', 'done'],
    ['In progress', 'in-progress'],
    ['Not started', 'untouched']
  ];
  for (const [label, key] of groups) {
    const items = derived.requirements.filter(r => r.status === key);
    out.push(`## ${label} (${items.length})`);
    out.push('');
    if (items.length === 0) {
      out.push('- (none)');
      out.push('');
      continue;
    }
    for (const r of items) {
      const inc = r.increment ? ` _(increment: ${r.increment})_` : '';
      const files = r.files.length > 0 ? ` - ${r.files.slice(0, 4).join(', ')}${r.files.length > 4 ? `, +${r.files.length - 4} more` : ''}` : '';
      out.push(`- ${MARK[r.status]} **${r.id}** ${r.text}${inc}${files}`);
    }
    out.push('');
  }

  if (derived.increments.length > 0) {
    out.push('## Increments');
    out.push('');
    for (const inc of derived.increments) {
      out.push(`- ${INC_MARK[inc.status]} **${inc.id}**: ${inc.name} _[${inc.horizon}]_ - ${inc.status} - ${inc.doneCount}/${inc.totalCount} requirements done`);
    }
    out.push('');
  }

  if (derived.gaps.length > 0) {
    out.push('## Gaps');
    out.push('');
    out.push('Requirements whose increment is marked done but have no implementing code linked:');
    out.push('');
    for (const r of derived.gaps) {
      out.push(`- **${r.id}** ${r.text} _(increment: ${r.increment})_`);
    }
    out.push('');
  }

  return finishLedger(out);
}

function writeLedger(projectRoot, derived) {
  const data = derived || derive(projectRoot);
  const file = path.join(projectRoot, LEDGER_PATH);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const rendered = renderLedger(data) + '\n';
  if (fs.existsSync(file)) {
    const current = fs.readFileSync(file, 'utf8');
    if (normalizeLedgerTimestamp(current) === normalizeLedgerTimestamp(rendered)) {
      return LEDGER_PATH;
    }
  }
  fs.writeFileSync(file, rendered);
  return LEDGER_PATH;
}

/**
 * Small cacheable summary for state.json (state.deliverables).
 */
function summarizeForState(derived, currentSummary = null) {
  const s = derived.summary;
  const next = {
    updated: derived.updated,
    source: 'PRD + ROADMAP + linkage + build state',
    requirements: {
      total: s.total,
      done: s.done,
      'in-progress': s.inProgress,
      untouched: s.untouched,
      percent: s.percent
    },
    increments: derived.increments.map(inc => ({
      id: inc.id,
      name: inc.name,
      horizon: inc.horizon,
      status: inc.status,
      done: inc.doneCount,
      total: inc.totalCount
    })),
    gaps: derived.gaps.length
  };
  if (currentSummary && currentSummary.updated && sameIgnoringUpdated(currentSummary, next)) {
    next.updated = currentSummary.updated;
  }
  return next;
}

module.exports = {
  PRD_PATH,
  ROADMAP_PATH,
  LEDGER_PATH,
  parsePrdRequirements,
  parseRoadmapIncrements,
  derive,
  progressBar,
  renderProgressLines,
  renderLedger,
  writeLedger,
  summarizeForState,
  normalizeStatus,
  slugify
};
