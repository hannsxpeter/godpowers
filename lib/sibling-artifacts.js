/**
 * Sibling Superskill Artifacts
 *
 * Read-only parser/consumer for the two sibling superskill artifacts:
 * `.godplans/PLAN.mdx` plus its pinned `validate-plan.sh` companion (Godplans
 * 1.1 master-plan contract), and `.godaudits/AUDIT.json` (godaudits 2.x
 * canonical state). A generated `.godaudits/AUDIT.mdx` report
 * and legacy 1.x MDX audits remain readable fallbacks. JSON computed state is
 * consumed directly; legacy MDX counts are recomputed from the body.
 * This module never writes to disk; import and sync-back stay in
 * lib/planning-systems.js and lib/source-sync.js.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const frontmatterHelper = require('./frontmatter');
const { exists, resolveArtifact } = require('./sync-fs');

const PLAN_PATH = '.godplans/PLAN.mdx';
const PLAN_VALIDATOR_PATH = '.godplans/validate-plan.sh';
const AUDIT_JSON_PATH = '.godaudits/AUDIT.json';
const AUDIT_REPORT_PATH = '.godaudits/AUDIT.mdx';
const AUDIT_LEGACY_PATH = '.godaudits/AUDIT.md';
const AUDIT_PATH = AUDIT_JSON_PATH;
const MAX_SIBLING_FILE_BYTES = 5 * 1024 * 1024;
const READ_NOFOLLOW = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0);

// Godplans 1.1.0 requires this exact self-contained validator beside every
// emitted plan. Unknown hashes fail closed for GP execution while remaining
// readable as migration context, so a future godplans validator update cannot
// silently weaken the execution gate.
const GODPLANS_VALIDATOR_HASHES = Object.freeze({
  'sha256:cec8691bb32f272bfe29acdab435be6f95d55405a914fc6ff33277aca5c8eb6b': '1.1.0'
});

// The 18 domain codes shared by R-<DOM>-n plan requirements, A-<DOM>-n audit
// checks, and F-<DOM>-n findings. A-n mirrors R-n one to one by design.
const DOMAIN_CODES = [
  'PRD', 'ARCH', 'STACK', 'DB', 'SEC', 'LLM', 'UX', 'UI', 'SEO',
  'CODE', 'DNA', 'MEM', 'REPO', 'BUILD', 'ROAD', 'DEPLOY', 'OBS', 'LAUNCH'
];
const DOMAIN_ALTERNATION = DOMAIN_CODES.join('|');

const PLAN_TASK_RE = /^- \[( |x)\] (GP-\d{3,})( \[P\])? \[W(\d+)\.(\d+)\] (.+)$/;
const AUDIT_TASK_RE = /^- \[( |x)\] (GA-\d{3,})( \[P\])? \[W(\d+)\.(\d+)\]( \[P\])? (.+)$/;
const SUPERSEDED_RE = /^~~- \[ \] (G[PA]-\d+)/;
const TASK_FIELD_RE = /^\s{2,}- ([A-Za-z ]+?):\s*(.*)$/;
const TASK_NOTE_RE = /^\s{2,}- Note \((\d{4}-\d{2}-\d{2})\): (.+)$/;
const FINDING_HEAD_RE = /^#### (F-[A-Z]+-\d+) (.+?) \[(Critical|High|Medium|Low) \| (Certain|Firm|Tentative) \| (S|M|L)\]$/;
const FINDING_FIELD_RE = /^- (Where|Evidence|Impact|Fix|Verify the fix|Checks|Status|Remediation|Resolved): (.+)$/;
const STORY_REQUIREMENT_RE = /\bR-\d+\.\d+\b/g;
const DOMAIN_REQUIREMENT_RE = new RegExp(`\\bR-(?:${DOMAIN_ALTERNATION})-\\d+\\b`, 'g');
const PLAN_STATUS_VALUES = new Set(['planning', 'approved', 'executing', 'done']);
const PLAN_MODE_VALUES = new Set(['greenfield', 'brownfield', 'replan']);
const PLAN_REQUIRED_FIELDS = ['Files', 'Depends on', 'Reuses', 'Acceptance', 'Verify', 'Requirements'];
const PLAN_REQUIRED_FRONTMATTER = [
  'name', 'plan_version', 'status', 'created', 'updated', 'mode', 'archetype',
  'domains_applicable', 'domains_excluded'
];
const PLAN_REQUIREMENT_CATALOG_MAX = Object.freeze({
  ARCH: 19,
  BUILD: 20,
  CODE: 22,
  DB: 22,
  DEPLOY: 18,
  DNA: 20,
  LAUNCH: 21,
  LLM: 23,
  MEM: 18,
  OBS: 20,
  PRD: 17,
  REPO: 20,
  ROAD: 20,
  SEC: 25,
  SEO: 22,
  STACK: 20,
  UI: 20,
  UX: 20
});
const PLAN_BANNED_UNICODE_RE = /[\u2013\u2014\u2018-\u201f\u2026\u2190-\u21ff\u2500-\u257f\ufe0f\u{1f000}-\u{1faff}]/u;

function normalize(text) {
  return String(text || '').replace(/\r\n/g, '\n');
}

// Frontmatter parsing delegates to the shared helper for PLAN.mdx plus legacy
// and generated audit reports. Canonical audit JSON bypasses this helper.
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
      status: head[1] === 'x' ? 'done' : 'open',
      parallel: Boolean(head[3] || (head.length > 7 && head[6])),
      phase: Number(head[4]),
      wave: `${head[4]}.${head[5]}`,
      title: head[head.length > 7 ? 7 : 6].trim(),
      files: [],
      dependsOn: [],
      reuses: null,
      fixes: [],
      acceptance: [],
      verify: null,
      requirements: [],
      checks: [],
      notes: [],
      finalGate: false
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

function countFindings(findings, statuses) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
  const included = new Set(statuses);
  for (const finding of findings) {
    if (!included.has(finding.status)) continue;
    counts.total += 1;
    const key = String(finding.severity || '').toLowerCase();
    if (key in counts) counts[key] += 1;
  }
  return counts;
}

function countCheckOutcomes(checks) {
  const counts = { pass: 0, fail: 0, unknown: 0, notApplicable: 0, total: checks.length };
  for (const check of checks) {
    if (check.outcome === 'not-applicable') counts.notApplicable += 1;
    else if (check.outcome in counts) counts[check.outcome] += 1;
  }
  return counts;
}

function parseCheckLedger(text) {
  const checks = [];
  const row = /^\| (A-[A-Z]+-\d+) \| (pass|fail|unknown|not-applicable) \| (Certain|Firm|Tentative) \| ([0-9.]+) \| (.*?) \|$/;
  for (const line of normalize(text).split('\n')) {
    const match = line.match(row);
    if (!match) continue;
    checks.push({
      id: match[1],
      domain: null,
      outcome: match[2],
      confidence: match[3],
      weight: Number(match[4]),
      evidenceIds: splitList(match[5]),
      findingIds: []
    });
  }
  return checks;
}

function parseCompliance(text) {
  const match = normalize(text).match(/^Result: (pass|findings-injected|unknown)\. Screened ([0-9]{4}-[0-9]{2}-[0-9]{2}) with (.+)\.$/m);
  return match
    ? { result: match[1], screened: match[2], policyPack: match[3] }
    : null;
}

function remediationPriority(task, findingsById) {
  const rank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  let priority = task.fixes.length > 0 ? 3 : (task.finalGate ? 1 : 2);
  for (const findingId of task.fixes) {
    const finding = findingsById.get(findingId);
    if (!finding || !(finding.severity in rank)) continue;
    priority = Math.min(priority, rank[finding.severity]);
  }
  return `P${priority}`;
}

function sectionListItems(text, heading) {
  const lines = normalize(text).split('\n');
  const target = `## ${heading}`.toLowerCase();
  const start = lines.findIndex((line) => line.trim().toLowerCase() === target);
  if (start === -1) return [];
  const items = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) break;
    const item = lines[i].match(/^- (.+)$/) ||
      lines[i].match(/^\d+\. (.+)$/) ||
      lines[i].match(/^### (Q\d+:.+)$/);
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

function parsePlanFrontmatterState(lines) {
  const fields = {};
  const fieldCounts = {};
  const counters = {};
  const counterCounts = {};
  let end = -1;
  if (lines[0] === '---') {
    end = lines.findIndex((line, index) => index > 0 && line === '---');
  }
  if (end < 0) return { end, fields, fieldCounts, counters, counterCounts };

  for (let i = 1; i < end; i++) {
    let match = lines[i].match(/^([a-z_]+):(?:[ \t]*(.*))?$/);
    if (match) {
      fieldCounts[match[1]] = (fieldCounts[match[1]] || 0) + 1;
      fields[match[1]] = String(match[2] || '').trim();
      continue;
    }
    match = lines[i].match(/^  (phases_total|phases_done|tasks_total|tasks_done):[ \t]*(.*)$/);
    if (match) {
      counterCounts[match[1]] = (counterCounts[match[1]] || 0) + 1;
      counters[match[1]] = String(match[2] || '').trim();
    }
  }
  return { end, fields, fieldCounts, counters, counterCounts };
}

function planRequirementCatalog() {
  const ids = new Set();
  for (const [prefix, max] of Object.entries(PLAN_REQUIREMENT_CATALOG_MAX)) {
    for (let number = 1; number <= max; number++) ids.add(`R-${prefix}-${number}`);
  }
  return ids;
}

/**
 * Static, non-executing preflight for the Godplans 1.1.0 PLAN contract.
 * The sibling validator remains the authoritative execution gate. This
 * mirror lets import, doctor, and routing fail closed without automatically
 * executing repository-owned shell code.
 */
function validatePlanText(text, opts = {}) {
  const source = normalize(text);
  const lines = source.split('\n').map((line) => line.replace(/\r$/, ''));
  const errors = [];
  const fail = (message) => errors.push(message);
  const raw = parsePlanFrontmatterState(lines);
  const allowPlanning = opts.allowPlanning !== false;

  if (lines[0] !== '---') fail('frontmatter must begin on line 1 with ---');
  else if (raw.end < 0) fail('frontmatter is missing its closing ---');

  for (const key of PLAN_REQUIRED_FRONTMATTER) {
    if (!(key in raw.fields)) fail(`missing frontmatter field: ${key}`);
    else if (!raw.fields[key] && key !== 'domains_excluded') fail(`frontmatter field is empty: ${key}`);
    if ((raw.fieldCounts[key] || 0) > 1) fail(`duplicate frontmatter field: ${key}`);
  }
  if (!('progress' in raw.fields)) fail('missing frontmatter field: progress');
  if ((raw.fieldCounts.progress || 0) > 1) fail('duplicate frontmatter field: progress');

  if ('plan_version' in raw.fields && !/^[1-9]\d*$/.test(raw.fields.plan_version)) {
    fail(`plan_version must be a positive integer, found '${raw.fields.plan_version}'`);
  }
  const status = raw.fields.status || null;
  if (status && !PLAN_STATUS_VALUES.has(status)) {
    fail(`invalid status '${status}'; expected planning, approved, executing, or done`);
  } else if (!allowPlanning && status && status !== 'approved' && status !== 'executing') {
    fail(`execution requires status approved or executing, found '${status}'`);
  }
  if (raw.fields.mode && !PLAN_MODE_VALUES.has(raw.fields.mode)) {
    fail(`invalid mode '${raw.fields.mode}'; expected greenfield, brownfield, or replan`);
  }
  for (const key of ['created', 'updated']) {
    if (raw.fields[key] && !/^\d{4}-\d{2}-\d{2}$/.test(raw.fields[key])) {
      fail(`${key} must use YYYY-MM-DD, found '${raw.fields[key]}'`);
    }
  }
  for (const key of ['phases_total', 'phases_done', 'tasks_total', 'tasks_done']) {
    if (!(key in raw.counters)) fail(`missing progress counter: ${key}`);
    else if (!/^\d+$/.test(raw.counters[key])) {
      fail(`progress counter ${key} must be a non-negative integer, found '${raw.counters[key]}'`);
    }
    if ((raw.counterCounts[key] || 0) > 1) fail(`duplicate progress counter: ${key}`);
  }

  const localRequirements = new Set();
  let inRequirements = false;
  for (const line of lines) {
    if (line === '## Requirements') {
      inRequirements = true;
      continue;
    }
    if (inRequirements && /^## /.test(line)) inRequirements = false;
    if (!inRequirements) continue;
    const prose = line.match(/^(R-\d+\.\d+):/);
    const table = line.match(/^\|\s*(R-\d+\.\d+)\s*\|/);
    if (prose || table) localRequirements.add((prose || table)[1]);
  }
  const catalog = planRequirementCatalog();
  const phases = [];
  const tasks = [];
  const definitions = new Map();
  let currentPhase = -1;

  for (let i = 0; i < lines.length; i++) {
    const phase = lines[i].match(/^## Phase ([1-9]\d*):\s*(.+?)\s*$/);
    if (phase) {
      phases.push({ number: Number(phase[1]), name: phase[2], line: i + 1, taskIndexes: [] });
      currentPhase = phases.length - 1;
      continue;
    }

    const head = lines[i].match(/^- \[([ x])\] (GP-[1-9]\d{2,})\b/);
    if (head) {
      const full = lines[i].match(/^- \[([ x])\] (GP-[1-9]\d{2,}) (?:\[P\] )?\[W([1-9]\d*)\.([1-9]\d*)\] \S/);
      const task = {
        id: head[2],
        done: head[1] === 'x',
        line: i + 1,
        phaseIndex: currentPhase,
        wavePhase: full ? Number(full[3]) : null,
        fields: {}
      };
      if (!full) fail(`${task.id} has malformed task heading`);
      if (currentPhase < 0) fail(`${task.id} is not inside a numbered phase`);
      else {
        phases[currentPhase].taskIndexes.push(tasks.length);
        if (task.wavePhase !== null && task.wavePhase !== phases[currentPhase].number) {
          fail(`${task.id} wave phase ${task.wavePhase} does not match Phase ${phases[currentPhase].number}`);
        }
      }
      if (definitions.has(task.id)) {
        fail(`duplicate task definition ID ${task.id} on lines ${definitions.get(task.id)} and ${i + 1}`);
      } else {
        definitions.set(task.id, i + 1);
      }
      for (let j = i + 1; j < lines.length; j++) {
        if (/^- \[[ x]\] GP-/.test(lines[j]) || /^## Phase [1-9]\d*:/.test(lines[j])) break;
        const field = lines[j].match(/^  - (Files|Depends on|Reuses|Acceptance|Verify|Requirements):[ \t]*(.*)$/);
        if (!field) continue;
        if (!task.fields[field[1]]) task.fields[field[1]] = [];
        task.fields[field[1]].push(field[2].trim());
      }
      tasks.push(task);
    } else if (/^- \[[^\]]*\] GP-/.test(lines[i])) {
      fail(`malformed task definition on line ${i + 1}`);
    }
  }

  phases.forEach((phase, index) => {
    const expected = index + 1;
    if (phase.number !== expected) {
      fail(`phase numbers must be sequential: expected Phase ${expected}, found Phase ${phase.number}`);
    }
  });

  for (const task of tasks) {
    for (const field of PLAN_REQUIRED_FIELDS) {
      const values = task.fields[field] || [];
      if (values.length === 0) fail(`${task.id} missing required field: ${field}`);
      else if (values.length > 1) fail(`${task.id} has duplicate required field: ${field}`);
      else if (!values[0]) fail(`${task.id} has empty required field: ${field}`);
    }
    const dependencyValue = (task.fields['Depends on'] || [])[0];
    if (dependencyValue && dependencyValue !== 'none') {
      const dependencies = dependencyValue.split(/\s*,\s*/);
      if (dependencies.length === 0 || dependencies.some((id) => !/^GP-[1-9]\d{2,}$/.test(id))) {
        fail(`${task.id} has malformed Depends on value '${dependencyValue}'`);
      } else {
        for (const dependency of dependencies) {
          if (dependency === task.id) fail(`${task.id} depends on itself`);
          else if (!definitions.has(dependency)) fail(`${task.id} depends on undefined task ${dependency}`);
          else if (definitions.get(dependency) > task.line) fail(`${task.id} depends on later task ${dependency}`);
        }
      }
    }
    const requirementValue = (task.fields.Requirements || [])[0];
    if (requirementValue) {
      const requirements = requirementValue.split(/\s*,\s*/);
      if (requirements.length === 0 || requirements.some((id) => !/^R-(?:\d+\.\d+|[A-Z][A-Z0-9-]*-\d+)$/.test(id))) {
        fail(`${task.id} has malformed Requirements value '${requirementValue}'`);
      } else {
        for (const id of requirements) {
          if (!localRequirements.has(id) && !catalog.has(id)) fail(`${task.id} cites undefined requirement ${id}`);
        }
      }
    }
  }

  let phasesDone = 0;
  for (const phase of phases) {
    if (phase.taskIndexes.length === 0) {
      fail(`Phase ${phase.number} has no task definitions`);
      continue;
    }
    if (phase.taskIndexes.every((index) => tasks[index].done)) phasesDone += 1;
  }
  const derived = {
    phases_total: phases.length,
    phases_done: phasesDone,
    tasks_total: tasks.length,
    tasks_done: tasks.filter((task) => task.done).length
  };
  for (const [key, value] of Object.entries(derived)) {
    if (/^\d+$/.test(raw.counters[key] || '') && Number(raw.counters[key]) !== value) {
      fail(`${key} is ${raw.counters[key]}, derived value is ${value}`);
    }
  }

  const openQuestionsCount = lines.filter((line) => line === '## Open Questions').length;
  if (openQuestionsCount !== 1) {
    fail(`expected exactly one ## Open Questions section, found ${openQuestionsCount}`);
  }
  const finalPhase = phases.length ? phases[phases.length - 1].name : 'none';
  if (finalPhase !== 'Verification') fail(`final phase must be Verification, found '${finalPhase}'`);
  lines.forEach((line, index) => {
    if (PLAN_BANNED_UNICODE_RE.test(line)) fail(`banned Unicode on line ${index + 1}`);
  });

  return {
    valid: errors.length === 0,
    errors,
    status,
    mode: raw.fields.mode || null,
    planVersion: /^\d+$/.test(raw.fields.plan_version || '') ? Number(raw.fields.plan_version) : null,
    counters: raw.counters,
    derived,
    phases: phases.map((phase) => ({
      number: phase.number,
      name: phase.name,
      line: phase.line,
      tasksTotal: phase.taskIndexes.length,
      tasksDone: phase.taskIndexes.filter((index) => tasks[index].done).length
    })),
    localRequirements: [...localRequirements]
  };
}

function parseRequirementDefinitions(text) {
  const definitions = [];
  let inRequirements = false;
  for (const line of normalize(text).split('\n')) {
    if (line === '## Requirements') {
      inRequirements = true;
      continue;
    }
    if (inRequirements && /^## /.test(line)) inRequirements = false;
    if (!inRequirements) continue;
    let match = line.match(/^(R-\d+\.\d+):\s*(.+)$/);
    if (match) {
      definitions.push({ id: match[1], text: match[2].trim() });
      continue;
    }
    match = line.match(/^\|\s*(R-\d+\.\d+)\s*\|\s*(.*?)\s*\|/);
    if (match) definitions.push({ id: match[1], text: match[2].trim() });
  }
  return definitions;
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
  const validation = validatePlanText(source, { allowPlanning: true });
  const requirementDefinitions = parseRequirementDefinitions(source);
  const lifecycleErrors = [];
  if (validation.status === 'done' && counts.open > 0) {
    lifecycleErrors.push(`done plan still has ${counts.open} open task(s)`);
  }

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
    phases: validation.phases,
    validation,
    lifecycle: {
      status: validation.status,
      requiresApproval: validation.status === 'planning',
      executionStatus: validation.status === 'approved' || validation.status === 'executing',
      closed: validation.status === 'done',
      consistent: lifecycleErrors.length === 0,
      errors: lifecycleErrors
    },
    requirementIds,
    requirementDefinitions,
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
 * Parse a legacy or generated `.godaudits/AUDIT.mdx` report. Structural tokens
 * are matched literally. Finding and GA counts are recomputed from the body;
 * frontmatter scores are passed through for backward compatibility.
 */
function parseAuditMdx(text) {
  const source = normalize(text);
  const frontmatter = readFrontmatter(source);
  const { tasks, superseded } = parseTasks(source, AUDIT_TASK_RE);
  const findings = parseFindings(source);
  const checks = parseCheckLedger(source);

  const openFindings = countFindings(findings, ['open']);
  const activeFindings = countFindings(findings, ['open', 'accepted-risk']);

  const rawScores = frontmatter && typeof frontmatter.scores === 'object' && frontmatter.scores !== null
    ? frontmatter.scores
    : frontmatter;
  const scores = {
    overall: typeof rawScores.overall === 'number' ? rawScores.overall : null,
    verdict: typeof rawScores.verdict === 'string' ? rawScores.verdict : null,
    domains: typeof rawScores.domains === 'object' && rawScores.domains !== null ? rawScores.domains : {}
  };

  return {
    sourceFormat: 'mdx',
    schemaVersion: null,
    frontmatter,
    tasks,
    superseded,
    counts: countTasks(tasks),
    findings,
    openFindings,
    activeFindings,
    checks,
    checkCounts: countCheckOutcomes(checks),
    evidenceRecords: [],
    compliance: parseCompliance(source),
    acceptedRisks: [],
    auditOpenQuestions: [],
    scores,
    scoreCaps: null,
    computedCounts: null,
    coverage: typeof frontmatter.coverage === 'number'
      ? { percent: frontmatter.coverage, evaluated: null, applicable: null }
      : null,
    parseError: null
  };
}

function emptyJsonAudit(parseError, schemaVersion = null) {
  return {
    ...parseAuditMdx(''),
    sourceFormat: 'json',
    schemaVersion,
    parseError
  };
}

function auditCoreError(data) {
  if (!data.audit || typeof data.audit !== 'object' || Array.isArray(data.audit)) {
    return 'invalid canonical audit metadata';
  }
  if (!Array.isArray(data.evidence) || data.evidence.some((item) => !item || typeof item !== 'object')) {
    return 'invalid canonical evidence state';
  }
  if (!Array.isArray(data.domains) || data.domains.some((domain) => (
    !domain ||
    typeof domain.id !== 'string' ||
    !Array.isArray(domain.checks) ||
    domain.checks.some((check) => (
      !check ||
      !/^A-[A-Z]+-\d+$/.test(check.id || '') ||
      !['pass', 'fail', 'unknown', 'not-applicable'].includes(check.outcome) ||
      !['Certain', 'Firm', 'Tentative'].includes(check.confidence) ||
      !Array.isArray(check.evidence) ||
      !Array.isArray(check.finding_ids)
    ))
  ))) {
    return 'invalid canonical check state';
  }
  if (!Array.isArray(data.findings) || data.findings.some((finding) => (
    !finding ||
    !/^F-[A-Z]+-\d+$/.test(finding.id || '') ||
    !['open', 'resolved', 'accepted-risk', 'superseded'].includes(finding.status) ||
    !['Critical', 'High', 'Medium', 'Low'].includes(finding.severity) ||
    !Array.isArray(finding.evidence) ||
    !Array.isArray(finding.remediation)
  ))) {
    return 'invalid canonical finding state';
  }
  if (!Array.isArray(data.tasks) || data.tasks.some((task) => (
    !task ||
    !/^GA-\d{3,}$/.test(task.id || '') ||
    !['open', 'done', 'superseded'].includes(task.status) ||
    typeof task.title !== 'string' ||
    !Array.isArray(task.fixes) ||
    typeof task.verify !== 'string'
  ))) {
    return 'invalid canonical task state';
  }
  return null;
}

function parseAuditJson(input) {
  const data = input && typeof input === 'object' ? input : {};
  if (data.schema_version !== '2.0') {
    return emptyJsonAudit(
      `unsupported schema version ${data.schema_version || 'missing'}`,
      data.schema_version || null
    );
  }
  const coreError = auditCoreError(data);
  if (coreError) return emptyJsonAudit(coreError, data.schema_version);
  const metadata = data.audit && typeof data.audit === 'object' ? data.audit : {};
  const evidence = new Map(data.evidence.map((item) => [item.id, item]));
  const evidenceRecords = data.evidence.map((item) => ({
    id: item.id,
    type: item.type || null,
    path: item.path || null,
    line: Number.isInteger(item.line) ? item.line : null,
    symbol: item.symbol || null,
    scope: item.scope || null,
    sha256: item.sha256 || null,
    sensitive: item.sensitive === true,
    redacted: item.redacted === true,
    tool: item.tool || null,
    toolVersion: item.tool_version || null
  }));
  const checks = data.domains.flatMap((domain) => domain.checks.map((check) => ({
    id: check.id,
    domain: domain.id,
    outcome: check.outcome,
    confidence: check.confidence,
    weight: check.weight,
    evidenceIds: [...check.evidence],
    findingIds: [...check.finding_ids]
  })));
  const rawTasks = Array.isArray(data.tasks) ? data.tasks : [];
  const superseded = rawTasks
    .filter((task) => task && task.status === 'superseded')
    .map((task) => task.id)
    .filter(Boolean);
  const tasks = rawTasks
    .filter((task) => task && task.status !== 'superseded')
    .map((task) => ({
      id: task.id,
      done: task.status === 'done',
      status: task.status || 'open',
      parallel: Boolean(task.parallel),
      phase: Number.isInteger(task.phase) ? task.phase : null,
      wave: task.wave || null,
      title: task.title || '',
      files: Array.isArray(task.files) ? task.files : [],
      dependsOn: Array.isArray(task.depends_on) ? task.depends_on : [],
      reuses: task.reuses || null,
      fixes: Array.isArray(task.fixes) ? task.fixes : [],
      acceptance: Array.isArray(task.acceptance) ? task.acceptance : [],
      verify: task.verify || null,
      requirements: [],
      checks: Array.isArray(task.checks) ? task.checks : [],
      notes: [],
      finalGate: task.final_gate === true
    }));
  const findings = (Array.isArray(data.findings) ? data.findings : []).map((finding) => {
    const evidenceIds = Array.isArray(finding.evidence) ? finding.evidence : [];
    const firstSource = evidenceIds
      .map((id) => evidence.get(id))
      .find((item) => item && item.path);
    const remediationIds = Array.isArray(finding.remediation) ? finding.remediation : [];
    return {
      id: finding.id,
      domain: (String(finding.id || '').match(/^F-([A-Z]+)-/) || [])[1] || finding.domain || null,
      domainId: finding.domain || null,
      title: finding.title || '',
      severity: finding.severity || null,
      confidence: finding.confidence || null,
      effort: finding.effort || null,
      where: firstSource ? `${firstSource.path}:${firstSource.line || 1}` : null,
      evidence: evidenceIds.join(', '),
      evidenceIds,
      impact: finding.impact || null,
      fix: finding.fix || null,
      verifyFix: finding.verify || null,
      checks: Array.isArray(finding.checks) ? finding.checks : [],
      status: finding.status || 'open',
      remediation: remediationIds[0] || null,
      remediationIds,
      resolved: finding.status === 'resolved' ? metadata.updated || null : null
    };
  });

  const openFindings = countFindings(findings, ['open']);
  const activeFindings = countFindings(findings, ['open', 'accepted-risk']);

  const computed = data.computed && typeof data.computed === 'object' ? data.computed : {};
  const rawDomains = computed.domains && typeof computed.domains === 'object' ? computed.domains : {};
  const domains = Object.fromEntries(Object.entries(rawDomains).map(([domain, value]) => [
    domain,
    value && typeof value.score === 'number' ? value.score : value
  ]));
  const overall = computed.overall && typeof computed.overall === 'object' ? computed.overall : {};
  const coverage = computed.coverage && typeof computed.coverage === 'object'
    ? computed.coverage
    : null;

  return {
    sourceFormat: 'json',
    schemaVersion: data.schema_version || null,
    frontmatter: metadata,
    tasks,
    superseded,
    counts: countTasks(tasks),
    findings,
    openFindings,
    activeFindings,
    checks,
    checkCounts: countCheckOutcomes(checks),
    evidenceRecords,
    compliance: data.compliance && typeof data.compliance === 'object'
      ? {
          result: data.compliance.result || null,
          screened: data.compliance.screened || null,
          policyPack: data.compliance.policy_pack || null
        }
      : null,
    acceptedRisks: Array.isArray(data.accepted_risks) ? data.accepted_risks : [],
    auditOpenQuestions: Array.isArray(data.open_questions) ? data.open_questions : [],
    scores: {
      overall: typeof overall.score === 'number' ? overall.score : null,
      verdict: typeof overall.verdict === 'string' ? overall.verdict : null,
      domains
    },
    scoreCaps: {
      coverage: typeof overall.coverage_cap === 'number' ? overall.coverage_cap : null,
      critical: typeof overall.critical_cap === 'number' ? overall.critical_cap : null,
      weakDomain: typeof overall.weak_domain_cap === 'number' ? overall.weak_domain_cap : null
    },
    computedCounts: computed.counts && typeof computed.counts === 'object'
      ? computed.counts
      : null,
    coverage,
    parseError: null
  };
}

function parseAudit(text, sourcePath = null) {
  if (text && typeof text === 'object') return parseAuditJson(text);
  const source = normalize(text).replace(/^\uFEFF/, '').trim();
  const expectsJson = sourcePath === AUDIT_JSON_PATH || String(sourcePath || '').endsWith('.json');
  if (expectsJson || source.startsWith('{')) {
    try {
      return parseAuditJson(JSON.parse(source));
    } catch (err) {
      return emptyJsonAudit('invalid JSON');
    }
  }
  return parseAuditMdx(source);
}

/**
 * Hash project-relative paths the same way lib/planning-systems.js hashes an
 * imported system (sorted path names and file contents, plus executable bits
 * for the Godplans validator), so staleness can compare against the recorded
 * source-systems import hash byte for byte.
 */
function hashPaths(projectRoot, relPaths) {
  const h = crypto.createHash('sha256');
  for (const relPath of [...relPaths].sort()) {
    h.update(relPath);
    const full = path.join(projectRoot, relPath);
    const stat = fs.existsSync(full) ? fs.lstatSync(full) : null;
    if (relPath === PLAN_VALIDATOR_PATH) {
      h.update(`mode:${stat && stat.isFile() ? stat.mode & 0o111 : 'non-regular'}`);
    }
    if (stat && stat.isFile()) {
      const fd = fs.openSync(full, READ_NOFOLLOW);
      const chunk = Buffer.allocUnsafe(64 * 1024);
      try {
        let bytesRead;
        do {
          bytesRead = fs.readSync(fd, chunk, 0, chunk.length, null);
          if (bytesRead > 0) h.update(chunk.subarray(0, bytesRead));
        } while (bytesRead > 0);
      } finally {
        fs.closeSync(fd);
      }
    }
  }
  return `sha256:${h.digest('hex')}`;
}

function readRegularBufferOrNull(projectRoot, relPath) {
  const full = path.join(projectRoot, relPath);
  if (!fs.existsSync(full)) return null;
  try {
    const stat = fs.lstatSync(full);
    if (!stat.isFile() || stat.isSymbolicLink()) return null;
    if (stat.size > MAX_SIBLING_FILE_BYTES) return null;
    const buffer = Buffer.allocUnsafe(stat.size);
    const fd = fs.openSync(full, READ_NOFOLLOW);
    let bytesRead = 0;
    try {
      while (bytesRead < stat.size) {
        const count = fs.readSync(fd, buffer, bytesRead, stat.size - bytesRead, bytesRead);
        if (count === 0) break;
        bytesRead += count;
      }
    } finally {
      fs.closeSync(fd);
    }
    return buffer.subarray(0, bytesRead);
  } catch (err) {
    return null;
  }
}

function readRegularFileOrNull(projectRoot, relPath) {
  const buffer = readRegularBufferOrNull(projectRoot, relPath);
  return buffer === null ? null : buffer.toString('utf8');
}

function inspectSiblingFile(projectRoot, relPath) {
  const full = path.join(projectRoot, relPath);
  if (!fs.existsSync(full)) {
    return { path: relPath, present: false, regular: false, executable: false, hash: null };
  }
  try {
    const stat = fs.lstatSync(full);
    const regular = stat.isFile() && !stat.isSymbolicLink();
    const buffer = regular ? readRegularBufferOrNull(projectRoot, relPath) : null;
    return {
      path: relPath,
      present: true,
      regular: regular && buffer !== null,
      executable: regular && (stat.mode & 0o111) !== 0,
      hash: buffer === null
        ? null
        : `sha256:${crypto.createHash('sha256').update(buffer).digest('hex')}`
    };
  } catch (err) {
    return { path: relPath, present: true, regular: false, executable: false, hash: null };
  }
}

function planContractReason(plan, validator, validatorVersion) {
  if (!plan.validation.valid) return 'plan-structure-invalid';
  if (!plan.lifecycle.consistent) return 'lifecycle-inconsistent';
  if (!validator.present) return 'validator-missing';
  if (!validator.regular) return 'validator-unreadable-or-non-regular';
  if (!validator.executable) return 'validator-not-executable';
  if (!validatorVersion) return 'validator-unsupported';
  if (plan.lifecycle.requiresApproval) return 'awaiting-explicit-approval';
  if (plan.lifecycle.closed) return 'plan-closed';
  if (!plan.lifecycle.executionStatus) return 'lifecycle-invalid';
  return 'ready-for-validator';
}

/**
 * Load both files in the Godplans 1.1.0 two-artifact contract without running
 * repository-owned shell. Callers must run validatorCommand immediately
 * before GP execution when executionEligible is true.
 */
function loadPlan(projectRoot, opts = {}) {
  const planInfo = inspectSiblingFile(projectRoot, PLAN_PATH);
  if (!planInfo.present) return null;
  const planText = readRegularFileOrNull(projectRoot, PLAN_PATH);
  if (!planInfo.regular || planText === null) {
    return {
      path: PLAN_PATH,
      validatorPath: PLAN_VALIDATOR_PATH,
      plan: parsePlan(''),
      contract: {
        complete: false,
        executionEligible: false,
        reason: 'plan-unreadable-or-non-regular',
        validatorVersion: null,
        validator: inspectSiblingFile(projectRoot, PLAN_VALIDATOR_PATH),
        validatorCommand: `bash ${PLAN_VALIDATOR_PATH} ${PLAN_PATH}`
      }
    };
  }

  const plan = parsePlan(planText);
  const validator = inspectSiblingFile(projectRoot, PLAN_VALIDATOR_PATH);
  const trusted = opts.trustedValidatorHashes || GODPLANS_VALIDATOR_HASHES;
  const validatorVersion = validator.hash && trusted[validator.hash]
    ? trusted[validator.hash]
    : null;
  const complete = plan.validation.valid && plan.lifecycle.consistent && validator.present && validator.regular &&
    validator.executable && Boolean(validatorVersion);
  const reason = planContractReason(plan, validator, validatorVersion);
  return {
    path: PLAN_PATH,
    validatorPath: PLAN_VALIDATOR_PATH,
    plan,
    contract: {
      complete,
      executionEligible: complete && plan.lifecycle.executionStatus,
      reason,
      validatorVersion,
      validator,
      validatorCommand: `bash ${PLAN_VALIDATOR_PATH} ${PLAN_PATH}`,
      structuralCommand: `bash ${PLAN_VALIDATOR_PATH} --allow-planning ${PLAN_PATH}`
    }
  };
}

function planExecutionState(projectRoot, opts = {}) {
  const loaded = loadPlan(projectRoot, opts);
  if (!loaded) {
    return {
      present: false,
      executionEligible: false,
      reason: 'plan-missing',
      validatorCommand: null,
      nextTasks: []
    };
  }
  const done = new Set(loaded.plan.tasks.filter((task) => task.done).map((task) => task.id));
  const openTasks = loaded.plan.tasks.filter((task) => !task.done);
  let nextTasks = [];
  if (loaded.contract.executionEligible && openTasks.length > 0) {
    const first = openTasks[0];
    if (first.dependsOn.every((dependency) => done.has(dependency))) {
      nextTasks = [first];
      if (first.parallel) {
        const claimedFiles = new Set(first.files);
        for (const candidate of openTasks.slice(1)) {
          if (candidate.wave !== first.wave || !candidate.parallel) break;
          if (!candidate.dependsOn.every((dependency) => done.has(dependency))) continue;
          if (candidate.files.some((file) => claimedFiles.has(file))) continue;
          nextTasks.push(candidate);
          candidate.files.forEach((file) => claimedFiles.add(file));
        }
      }
    }
  }
  return {
    present: true,
    executionEligible: loaded.contract.executionEligible,
    reason: loaded.contract.reason,
    status: loaded.plan.lifecycle.status,
    validatorCommand: loaded.contract.validatorCommand,
    nextTasks,
    openTasks: openTasks.length
  };
}

function detectOne(projectRoot, canonicalPath) {
  const resolved = resolveArtifact(projectRoot, canonicalPath);
  const full = path.join(projectRoot, resolved);
  if (!exists(projectRoot, resolved)) return null;
  try {
    const stat = fs.lstatSync(full);
    if (!stat.isFile() || stat.isSymbolicLink()) return null;
  } catch (err) {
    return null;
  }
  return {
    present: true,
    path: resolved,
    hash: hashPaths(projectRoot, [resolved])
  };
}

function resolveAuditSource(projectRoot) {
  for (const candidate of [AUDIT_JSON_PATH, AUDIT_REPORT_PATH, AUDIT_LEGACY_PATH]) {
    if (exists(projectRoot, candidate)) return candidate;
  }
  return AUDIT_JSON_PATH;
}

function readAuditSource(projectRoot) {
  const resolved = resolveAuditSource(projectRoot);
  return {
    path: resolved,
    present: exists(projectRoot, resolved),
    text: readRegularFileOrNull(projectRoot, resolved)
  };
}

function loadAudit(projectRoot) {
  const source = readAuditSource(projectRoot);
  if (!source.present) return null;
  if (source.text === null) {
    const audit = source.path.endsWith('.json')
      ? emptyJsonAudit('unreadable or non-regular audit source')
      : { ...parseAuditMdx(''), parseError: 'unreadable or non-regular audit source' };
    return {
      path: source.path,
      audit
    };
  }
  return {
    path: source.path,
    audit: parseAudit(source.text, source.path)
  };
}

/**
 * Detect the sibling artifacts. Audit reads resolve canonical JSON first,
 * then generated MDX and legacy MD fallbacks. Missing artifacts return null.
 */
function detect(projectRoot) {
  const auditPath = resolveAuditSource(projectRoot);
  return {
    plan: detectOne(projectRoot, PLAN_PATH),
    planValidator: detectOne(projectRoot, PLAN_VALIDATOR_PATH),
    audit: exists(projectRoot, auditPath) ? detectOne(projectRoot, auditPath) : null
  };
}

/**
 * Plain-text digest block suitable for IMPORTED-CONTEXT. Facts from complete
 * Godplans contracts and canonical audits are [DECISION]-grade; legacy plan
 * signals and absence lines stay [HYPOTHESIS].
 */
function summarize(projectRoot) {
  const lines = [];

  lines.push('## Executable Plan Signals');
  lines.push('');
  const loadedPlan = loadPlan(projectRoot);
  if (loadedPlan === null) {
    lines.push('- [HYPOTHESIS] No godplans master plan was detected.');
  } else {
    const plan = loadedPlan.plan;
    const fm = plan.frontmatter || {};
    const authoredGrade = loadedPlan.contract.complete ? '[DECISION]' : '[HYPOTHESIS]';
    lines.push(`- [DECISION] godplans master plan detected at ${loadedPlan.path}.`);
    lines.push(`- ${authoredGrade} Plan mode: ${fm.mode || 'unknown'}. Archetype: ${fm.archetype || 'unknown'}. Status: ${fm.status || 'unknown'}.`);
    lines.push(`- ${authoredGrade} Plan tasks recounted from checkboxes: ${plan.counts.total} total, ${plan.counts.done} done, ${plan.counts.open} open.`);
    lines.push(`- ${authoredGrade} Open requirement domains: ${plan.openRequirementDomains.length ? plan.openRequirementDomains.join(', ') : 'none'}.`);
    lines.push(`- ${authoredGrade} Open questions: ${plan.openQuestions.length}.`);
    if (loadedPlan.contract.complete) {
      lines.push(`- [DECISION] Godplans ${loadedPlan.contract.validatorVersion} two-artifact contract is complete: the validator is trusted, regular, executable, and the plan passes static structural preflight.`);
    } else {
      lines.push(`- [DECISION] Godplans execution is blocked: ${loadedPlan.contract.reason}. Treat GP tasks as read-only migration context until the contract is repaired.`);
      if (plan.validation.errors.length > 0) {
        lines.push(`- [DECISION] Plan structural preflight found ${plan.validation.errors.length} error(s); first error: ${plan.validation.errors[0]}.`);
      }
    }
    if (loadedPlan.contract.executionEligible) {
      lines.push(`- [DECISION] GP execution status is eligible, but ${loadedPlan.contract.validatorCommand} must pass immediately before work starts.`);
    } else if (plan.lifecycle.requiresApproval) {
      lines.push('- [DECISION] GP execution awaits explicit user approval; Godpowers must not change planning to approved on the user\'s behalf.');
    } else if (plan.lifecycle.closed) {
      lines.push('- [DECISION] The plan is closed; no GP task may be dispatched.');
    }
  }

  lines.push('');
  lines.push('## Audit Signals');
  lines.push('');
  const loaded = loadAudit(projectRoot);
  if (loaded === null) {
    lines.push('- [HYPOTHESIS] No godaudits audit report was detected.');
  } else {
    const audit = loaded.audit;
    const authority = audit.sourceFormat === 'json' ? 'canonical machine state' : 'legacy or generated report fallback';
    lines.push(`- [DECISION] godaudits audit detected at ${loaded.path} as ${authority}.`);
    if (audit.parseError) {
      lines.push(`- [DECISION] The canonical godaudits state is unreadable: ${audit.parseError}; no score or remediation task was imported.`);
    }
    lines.push(`- [DECISION] Audit overall score: ${audit.scores.overall === null ? 'unknown' : audit.scores.overall}. Verdict: ${audit.scores.verdict || 'unknown'}.`);
    if (audit.coverage && typeof audit.coverage.percent === 'number') {
      const coverageDetail = typeof audit.coverage.evaluated === 'number' && typeof audit.coverage.applicable === 'number'
        ? ` (${audit.coverage.evaluated} of ${audit.coverage.applicable} applicable checks evaluated)`
        : '';
      lines.push(`- [DECISION] Audit coverage: ${audit.coverage.percent}%${coverageDetail}.`);
    }
    if (audit.compliance && audit.compliance.result) {
      lines.push(`- [DECISION] Audit compliance gate: ${audit.compliance.result}; policy pack: ${audit.compliance.policyPack || 'unknown'}.`);
    }
    if (audit.scoreCaps && Object.values(audit.scoreCaps).some((value) => typeof value === 'number')) {
      lines.push(`- [DECISION] Audit score caps: coverage ${audit.scoreCaps.coverage ?? 'none'}, critical ${audit.scoreCaps.critical ?? 'none'}, weak-domain ${audit.scoreCaps.weakDomain ?? 'none'}.`);
    }
    if (audit.checkCounts.total > 0) {
      lines.push(`- [DECISION] Audit check outcomes: ${audit.checkCounts.pass} pass, ${audit.checkCounts.fail} fail, ${audit.checkCounts.unknown} unknown, ${audit.checkCounts.notApplicable} not applicable.`);
    }
    if (audit.evidenceRecords.length > 0) {
      const redacted = audit.evidenceRecords.filter((record) => record.redacted).length;
      lines.push(`- [DECISION] Audit evidence ledger: ${audit.evidenceRecords.length} records, ${redacted} redacted.`);
    }
    const domainScores = Object.entries(audit.scores.domains)
      .map(([domain, score]) => `${domain} ${score}`)
      .join(', ');
    lines.push(`- [DECISION] Domain scores: ${domainScores || 'none recorded'}.`);
    const findingCounts = audit.activeFindings || audit.openFindings;
    lines.push(`- [DECISION] Active findings by severity: ${findingCounts.critical} critical, ${findingCounts.high} high, ${findingCounts.medium} medium, ${findingCounts.low} low.`);
    lines.push(`- [DECISION] Open GA remediation tasks: ${audit.counts.open}.`);
    if (audit.sourceFormat === 'json') {
      lines.push(`- [DECISION] Accepted risks: ${audit.acceptedRisks.length}. Audit open questions: ${audit.auditOpenQuestions.length}.`);
    }
  }

  return lines.join('\n');
}

/**
 * Open GA remediation tasks from canonical `.godaudits/AUDIT.json`, with a
 * legacy MDX fallback, shaped for /god-fix dispatch.
 */
function remediationTasks(projectRoot) {
  const loaded = loadAudit(projectRoot);
  if (loaded === null || loaded.audit.parseError) return [];
  const findingsById = new Map(loaded.audit.findings.map((finding) => [finding.id, finding]));
  return loaded.audit.tasks
    .filter((task) => task.status === 'open')
    .map((task) => ({
      id: task.id,
      title: task.title,
      wave: task.wave,
      parallel: task.parallel,
      fixes: task.fixes,
      verify: task.verify,
      files: task.files,
      dependsOn: task.dependsOn,
      acceptance: task.acceptance,
      checks: task.checks,
      finalGate: task.finalGate,
      priority: remediationPriority(task, findingsById),
      source: loaded.path
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
    const canonical = entry.id === 'godplans' ? PLAN_PATH : resolveAuditSource(projectRoot);
    const files = Array.isArray(entry.files) && entry.files.length > 0
      ? entry.files
      : [resolveArtifact(projectRoot, canonical)];
    const currentHash = hashPaths(projectRoot, files);
    results.push({
      id: entry.id,
      path: entry.id === 'godplans' ? resolveArtifact(projectRoot, canonical) : canonical,
      recordedHash: entry['import-hash'],
      currentHash,
      stale: currentHash !== entry['import-hash']
    });
  }
  return results;
}

module.exports = {
  PLAN_PATH,
  PLAN_VALIDATOR_PATH,
  AUDIT_PATH,
  AUDIT_JSON_PATH,
  AUDIT_REPORT_PATH,
  AUDIT_LEGACY_PATH,
  MAX_SIBLING_FILE_BYTES,
  GODPLANS_VALIDATOR_HASHES,
  DOMAIN_CODES,
  detect,
  parsePlan,
  validatePlanText,
  loadPlan,
  planExecutionState,
  parseAudit,
  summarize,
  loadAudit,
  remediationTasks,
  staleness,
  _private: {
    readFrontmatter,
    parseTasks,
    parseRequirementDefinitions,
    parsePlanFrontmatterState,
    parseFindings,
    parseCheckLedger,
    parseCompliance,
    parseAuditMdx,
    parseAuditJson,
    emptyJsonAudit,
    resolveAuditSource,
    countFindings,
    countCheckOutcomes,
    remediationPriority,
    inspectSiblingFile,
    readRegularBufferOrNull,
    readRegularFileOrNull,
    hashPaths,
    PLAN_TASK_RE,
    AUDIT_TASK_RE
  }
};
