/**
 * Sibling Superskill Artifacts
 *
 * Read-only parser/consumer for the two sibling superskill artifacts:
 * `.godplans/PLAN.mdx` (godplans master plan) and `.godaudits/AUDIT.mdx`
 * (godaudits audit report). Both files declare frontmatter counters, but the
 * contract makes those cached digests: truth is the checkbox body and the
 * finding Status lines, so every count here is recomputed from the body.
 * This module never writes to disk; import and sync-back stay in
 * lib/planning-systems.js and lib/source-sync.js.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const frontmatterHelper = require('./frontmatter');
const { exists, resolveArtifact, readArtifactOrNull } = require('./sync-fs');

const PLAN_PATH = '.godplans/PLAN.mdx';
const AUDIT_PATH = '.godaudits/AUDIT.mdx';

// The 18 domain codes shared by R-<DOM>-n plan requirements, A-<DOM>-n audit
// checks, and F-<DOM>-n findings. A-n mirrors R-n one to one by design.
const DOMAIN_CODES = [
  'PRD', 'ARCH', 'STACK', 'DB', 'SEC', 'LLM', 'UX', 'UI', 'SEO',
  'CODE', 'DNA', 'MEM', 'REPO', 'BUILD', 'ROAD', 'DEPLOY', 'OBS', 'LAUNCH'
];
const DOMAIN_ALTERNATION = DOMAIN_CODES.join('|');

const PLAN_TASK_RE = /^- \[( |x)\] (GP-\d{3,})( \[P\])? \[W(\d+)\.(\d+)\] (.+)$/;
const AUDIT_TASK_RE = /^- \[( |x)\] (GA-\d{3,})( \[P\])? \[W(\d+)\.(\d+)\] (.+)$/;
const SUPERSEDED_RE = /^~~- \[ \] (G[PA]-\d+)/;
const TASK_FIELD_RE = /^\s{2,}- ([A-Za-z ]+?):\s*(.*)$/;
const TASK_NOTE_RE = /^\s{2,}- Note \((\d{4}-\d{2}-\d{2})\): (.+)$/;
const FINDING_HEAD_RE = /^#### (F-[A-Z]+-\d+) (.+?) \[(Critical|High|Medium|Low) \| (Certain|Firm|Tentative) \| (S|M|L)\]$/;
const FINDING_FIELD_RE = /^- (Where|Evidence|Impact|Fix|Verify the fix|Checks|Status|Remediation|Resolved): (.+)$/;
const STORY_REQUIREMENT_RE = /\bR-\d+\.\d+\b/g;
const DOMAIN_REQUIREMENT_RE = new RegExp(`\\bR-(?:${DOMAIN_ALTERNATION})-\\d+\\b`, 'g');

function normalize(text) {
  return String(text || '').replace(/\r\n/g, '\n');
}

// Frontmatter parsing delegates to the shared helper; both sibling files
// open with a --- fenced YAML block per their contract.
function readFrontmatter(text) {
  try {
    return frontmatterHelper.parse(normalize(text)) || {};
  } catch (err) {
    return {};
  }
}

function splitList(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed || trimmed.toLowerCase() === 'none') return [];
  return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
}

function extractVerify(value) {
  const trimmed = String(value || '').trim();
  const fenced = trimmed.match(/`([^`]+)`/);
  return fenced ? fenced[1] : trimmed;
}

function applyTaskField(task, field, value) {
  switch (field) {
    case 'Files': task.files = splitList(value); break;
    case 'Depends on': task.dependsOn = splitList(value); break;
    case 'Reuses': task.reuses = value.trim() || null; break;
    case 'Fixes': task.fixes = splitList(value); break;
    case 'Acceptance': if (value.trim()) task.acceptance.push(value.trim()); break;
    case 'Verify': task.verify = extractVerify(value); break;
    case 'Requirements': task.requirements = splitList(value); break;
    case 'Checks': task.checks = splitList(value); break;
    default: break;
  }
}

/**
 * Parse checkbox task lines for one id prefix. Frontmatter progress counters
 * are never consulted: the contract requires recounting from `- [ ]`/`- [x]`
 * lines. Superseded (struck-through) tasks are excluded from counts.
 */
function parseTasks(text, taskRe) {
  const lines = normalize(text).split('\n');
  const tasks = [];
  const superseded = [];

  for (let i = 0; i < lines.length; i++) {
    const struck = lines[i].match(SUPERSEDED_RE);
    if (struck) {
      superseded.push(struck[1]);
      continue;
    }
    const head = lines[i].match(taskRe);
    if (!head) continue;

    const task = {
      id: head[2],
      done: head[1] === 'x',
      parallel: Boolean(head[3]),
      wave: `${head[4]}.${head[5]}`,
      title: head[6].trim(),
      files: [],
      dependsOn: [],
      reuses: null,
      fixes: [],
      acceptance: [],
      verify: null,
      requirements: [],
      checks: [],
      notes: []
    };

    let lastField = null;
    let j = i + 1;
    for (; j < lines.length; j++) {
      if (!/^\s{2,}\S/.test(lines[j])) break;
      const note = lines[j].match(TASK_NOTE_RE);
      if (note) {
        task.notes.push({ date: note[1], text: note[2].trim() });
        lastField = null;
        continue;
      }
      const field = lines[j].match(TASK_FIELD_RE);
      if (field) {
        applyTaskField(task, field[1], field[2]);
        lastField = field[1];
        continue;
      }
      // Deeper bullets carry Acceptance conditions written one per line.
      const bullet = lines[j].match(/^\s{4,}- (.+)$/);
      if (bullet && lastField === 'Acceptance') task.acceptance.push(bullet[1].trim());
    }
    tasks.push(task);
    i = j - 1;
  }

  return { tasks, superseded };
}

function countTasks(tasks) {
  const done = tasks.filter((task) => task.done).length;
  return { total: tasks.length, done, open: tasks.length - done };
}

function sectionListItems(text, heading) {
  const lines = normalize(text).split('\n');
  const target = `## ${heading}`.toLowerCase();
  const start = lines.findIndex((line) => line.trim().toLowerCase() === target);
  if (start === -1) return [];
  const items = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) break;
    const item = lines[i].match(/^- (.+)$/) || lines[i].match(/^\d+\. (.+)$/);
    if (item) items.push(item[1].trim());
  }
  return items;
}

function matchAll(text, regex) {
  const out = [];
  const seen = new Set();
  let m;
  regex.lastIndex = 0;
  while ((m = regex.exec(text)) !== null) {
    if (!seen.has(m[0])) {
      seen.add(m[0]);
      out.push(m[0]);
    }
  }
  return out;
}

function requirementDomain(id) {
  const m = String(id).match(/^R-([A-Z]+)-\d+$/);
  return m ? m[1] : null;
}

/**
 * Parse `.godplans/PLAN.mdx` text. Tolerates missing frontmatter and missing
 * sections; counts are recomputed from checkboxes, never read from the
 * frontmatter progress digest.
 */
function parsePlan(text) {
  const source = normalize(text);
  const frontmatter = readFrontmatter(source);
  const { tasks, superseded } = parseTasks(source, PLAN_TASK_RE);
  const counts = countTasks(tasks);

  const requirementIds = {
    story: matchAll(source, STORY_REQUIREMENT_RE),
    domain: matchAll(source, DOMAIN_REQUIREMENT_RE)
  };

  const openDomains = new Set();
  for (const task of tasks) {
    if (task.done) continue;
    for (const id of task.requirements) {
      const domain = requirementDomain(id);
      if (domain) openDomains.add(domain);
    }
  }

  return {
    frontmatter,
    tasks,
    superseded,
    counts,
    requirementIds,
    openRequirementDomains: [...openDomains].sort(),
    openQuestions: sectionListItems(source, 'Open Questions')
  };
}

function parseFindings(text) {
  const lines = normalize(text).split('\n');
  const findings = [];
  let current = null;

  for (const line of lines) {
    const head = line.match(FINDING_HEAD_RE);
    if (head) {
      current = {
        id: head[1],
        domain: (head[1].match(/^F-([A-Z]+)-/) || [])[1] || null,
        title: head[2].trim(),
        severity: head[3],
        confidence: head[4],
        effort: head[5],
        where: null,
        evidence: null,
        impact: null,
        fix: null,
        verifyFix: null,
        checks: [],
        status: 'open',
        remediation: null,
        resolved: null
      };
      findings.push(current);
      continue;
    }
    if (/^#/.test(line)) {
      current = null;
      continue;
    }
    if (!current) continue;
    const field = line.match(FINDING_FIELD_RE);
    if (!field) continue;
    const value = field[2].trim();
    switch (field[1]) {
      case 'Where': current.where = value; break;
      case 'Evidence': current.evidence = value; break;
      case 'Impact': current.impact = value; break;
      case 'Fix': current.fix = value; break;
      case 'Verify the fix': current.verifyFix = extractVerify(value); break;
      case 'Checks': current.checks = splitList(value); break;
      case 'Status': current.status = value.toLowerCase(); break;
      case 'Remediation': current.remediation = value; break;
      case 'Resolved': current.resolved = value; break;
      default: break;
    }
  }
  return findings;
}

/**
 * Parse `.godaudits/AUDIT.mdx` text. The audit contract makes AUDIT.mdx pure
 * ASCII, so structural tokens are matched literally. Finding and GA counts
 * are recomputed from the body; frontmatter `scores` is a digest the audit
 * itself owns, so it is passed through as-is.
 */
function parseAudit(text) {
  const source = normalize(text);
  const frontmatter = readFrontmatter(source);
  const { tasks, superseded } = parseTasks(source, AUDIT_TASK_RE);
  const findings = parseFindings(source);

  const openFindings = { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
  for (const finding of findings) {
    if (finding.status !== 'open') continue;
    openFindings.total += 1;
    const key = finding.severity.toLowerCase();
    if (key in openFindings) openFindings[key] += 1;
  }

  const rawScores = frontmatter && typeof frontmatter.scores === 'object' && frontmatter.scores !== null
    ? frontmatter.scores
    : {};
  const scores = {
    overall: typeof rawScores.overall === 'number' ? rawScores.overall : null,
    verdict: typeof rawScores.verdict === 'string' ? rawScores.verdict : null,
    domains: typeof rawScores.domains === 'object' && rawScores.domains !== null ? rawScores.domains : {}
  };

  return {
    frontmatter,
    tasks,
    superseded,
    counts: countTasks(tasks),
    findings,
    openFindings,
    scores
  };
}

/**
 * Hash project-relative paths the same way lib/planning-systems.js hashes an
 * imported system (path names plus file contents, sorted), so staleness can
 * compare against the recorded source-systems import hash byte for byte.
 */
function hashPaths(projectRoot, relPaths) {
  const h = crypto.createHash('sha256');
  for (const relPath of [...relPaths].sort()) {
    h.update(relPath);
    const full = path.join(projectRoot, relPath);
    if (fs.existsSync(full) && fs.lstatSync(full).isFile()) {
      h.update(fs.readFileSync(full));
    }
  }
  return `sha256:${h.digest('hex')}`;
}

function detectOne(projectRoot, canonicalPath) {
  const resolved = resolveArtifact(projectRoot, canonicalPath);
  if (!exists(projectRoot, resolved)) return null;
  return {
    present: true,
    path: resolved,
    hash: hashPaths(projectRoot, [resolved])
  };
}

/**
 * Detect the sibling artifacts. Reads resolve mdx-first with a legacy .md
 * fallback; a missing artifact is reported as null.
 */
function detect(projectRoot) {
  return {
    plan: detectOne(projectRoot, PLAN_PATH),
    audit: detectOne(projectRoot, AUDIT_PATH)
  };
}

/**
 * Plain-text digest block suitable for IMPORTED-CONTEXT. Plan-stated facts
 * are [DECISION]-grade (the plan and audit are authored, machine-checked
 * artifacts); absence lines stay [HYPOTHESIS].
 */
function summarize(projectRoot) {
  const lines = [];

  lines.push('## Executable Plan Signals');
  lines.push('');
  const planText = readArtifactOrNull(projectRoot, PLAN_PATH);
  if (planText === null) {
    lines.push('- [HYPOTHESIS] No godplans master plan was detected.');
  } else {
    const plan = parsePlan(planText);
    const fm = plan.frontmatter || {};
    lines.push(`- [DECISION] godplans master plan detected at ${resolveArtifact(projectRoot, PLAN_PATH)}.`);
    lines.push(`- [DECISION] Plan mode: ${fm.mode || 'unknown'}. Archetype: ${fm.archetype || 'unknown'}. Status: ${fm.status || 'unknown'}.`);
    lines.push(`- [DECISION] Plan tasks recounted from checkboxes: ${plan.counts.total} total, ${plan.counts.done} done, ${plan.counts.open} open.`);
    lines.push(`- [DECISION] Open requirement domains: ${plan.openRequirementDomains.length ? plan.openRequirementDomains.join(', ') : 'none'}.`);
    lines.push(`- [DECISION] Open questions: ${plan.openQuestions.length}.`);
  }

  lines.push('');
  lines.push('## Audit Signals');
  lines.push('');
  const auditText = readArtifactOrNull(projectRoot, AUDIT_PATH);
  if (auditText === null) {
    lines.push('- [HYPOTHESIS] No godaudits audit report was detected.');
  } else {
    const audit = parseAudit(auditText);
    lines.push(`- [DECISION] godaudits audit detected at ${resolveArtifact(projectRoot, AUDIT_PATH)}.`);
    lines.push(`- [DECISION] Audit overall score: ${audit.scores.overall === null ? 'unknown' : audit.scores.overall}. Verdict: ${audit.scores.verdict || 'unknown'}.`);
    const domainScores = Object.entries(audit.scores.domains)
      .map(([domain, score]) => `${domain} ${score}`)
      .join(', ');
    lines.push(`- [DECISION] Domain scores: ${domainScores || 'none recorded'}.`);
    lines.push(`- [DECISION] Open findings by severity: ${audit.openFindings.critical} critical, ${audit.openFindings.high} high, ${audit.openFindings.medium} medium, ${audit.openFindings.low} low.`);
    lines.push(`- [DECISION] Open GA remediation tasks: ${audit.counts.open}.`);
  }

  return lines.join('\n');
}

/**
 * Open GA remediation tasks from `.godaudits/AUDIT.mdx`, shaped for
 * /god-fix dispatch. Returns [] when the audit is absent.
 */
function remediationTasks(projectRoot) {
  const text = readArtifactOrNull(projectRoot, AUDIT_PATH);
  if (text === null) return [];
  return parseAudit(text).tasks
    .filter((task) => !task.done)
    .map((task) => ({
      id: task.id,
      title: task.title,
      wave: task.wave,
      parallel: task.parallel,
      fixes: task.fixes,
      verify: task.verify,
      files: task.files
    }));
}

/**
 * Compare recorded source-systems import hashes for godplans/godaudits
 * against the current sibling files. A mismatch means the user replanned or
 * re-audited after the Godpowers import, so /god-migrate should re-import.
 */
function staleness(projectRoot, stateData) {
  const systems = stateData && Array.isArray(stateData['source-systems'])
    ? stateData['source-systems']
    : [];
  const results = [];
  for (const entry of systems) {
    if (entry.id !== 'godplans' && entry.id !== 'godaudits') continue;
    if (!entry['import-hash']) continue;
    const canonical = entry.id === 'godplans' ? PLAN_PATH : AUDIT_PATH;
    const files = Array.isArray(entry.files) && entry.files.length > 0
      ? entry.files
      : [resolveArtifact(projectRoot, canonical)];
    const currentHash = hashPaths(projectRoot, files);
    results.push({
      id: entry.id,
      path: resolveArtifact(projectRoot, canonical),
      recordedHash: entry['import-hash'],
      currentHash,
      stale: currentHash !== entry['import-hash']
    });
  }
  return results;
}

module.exports = {
  PLAN_PATH,
  AUDIT_PATH,
  DOMAIN_CODES,
  detect,
  parsePlan,
  parseAudit,
  summarize,
  remediationTasks,
  staleness,
  _private: {
    readFrontmatter,
    parseTasks,
    parseFindings,
    hashPaths,
    PLAN_TASK_RE,
    AUDIT_TASK_RE
  }
};
