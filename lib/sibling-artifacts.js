/**
 * Sibling Superskill Artifacts
 *
 * Read-only parser/consumer for the two sibling superskill artifacts:
 * `.godplans/PLAN.mdx` (godplans master plan) and `.godaudits/AUDIT.json`
 * (godaudits 2.x canonical state). A generated `.godaudits/AUDIT.mdx` report
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
const AUDIT_JSON_PATH = '.godaudits/AUDIT.json';
const AUDIT_REPORT_PATH = '.godaudits/AUDIT.mdx';
const AUDIT_LEGACY_PATH = '.godaudits/AUDIT.md';
const AUDIT_PATH = AUDIT_JSON_PATH;
const MAX_SIBLING_FILE_BYTES = 5 * 1024 * 1024;
const READ_NOFOLLOW = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0);

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
 * imported system (path names plus file contents, sorted), so staleness can
 * compare against the recorded source-systems import hash byte for byte.
 */
function hashPaths(projectRoot, relPaths) {
  const h = crypto.createHash('sha256');
  for (const relPath of [...relPaths].sort()) {
    h.update(relPath);
    const full = path.join(projectRoot, relPath);
    if (fs.existsSync(full) && fs.lstatSync(full).isFile()) {
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

function readRegularFileOrNull(projectRoot, relPath) {
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
    return buffer.subarray(0, bytesRead).toString('utf8');
  } catch (err) {
    return null;
  }
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
    audit: exists(projectRoot, auditPath) ? detectOne(projectRoot, auditPath) : null
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
  const resolvedPlan = resolveArtifact(projectRoot, PLAN_PATH);
  const planText = readRegularFileOrNull(projectRoot, resolvedPlan);
  if (planText === null) {
    lines.push('- [HYPOTHESIS] No godplans master plan was detected.');
  } else {
    const plan = parsePlan(planText);
    const fm = plan.frontmatter || {};
    lines.push(`- [DECISION] godplans master plan detected at ${resolvedPlan}.`);
    lines.push(`- [DECISION] Plan mode: ${fm.mode || 'unknown'}. Archetype: ${fm.archetype || 'unknown'}. Status: ${fm.status || 'unknown'}.`);
    lines.push(`- [DECISION] Plan tasks recounted from checkboxes: ${plan.counts.total} total, ${plan.counts.done} done, ${plan.counts.open} open.`);
    lines.push(`- [DECISION] Open requirement domains: ${plan.openRequirementDomains.length ? plan.openRequirementDomains.join(', ') : 'none'}.`);
    lines.push(`- [DECISION] Open questions: ${plan.openQuestions.length}.`);
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
  AUDIT_PATH,
  AUDIT_JSON_PATH,
  AUDIT_REPORT_PATH,
  AUDIT_LEGACY_PATH,
  DOMAIN_CODES,
  detect,
  parsePlan,
  parseAudit,
  summarize,
  loadAudit,
  remediationTasks,
  staleness,
  _private: {
    readFrontmatter,
    parseTasks,
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
    readRegularFileOrNull,
    hashPaths,
    PLAN_TASK_RE,
    AUDIT_TASK_RE
  }
};
