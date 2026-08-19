// Implements: P-MUST-26, P-MUST-46

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const frontmatter = require('./frontmatter');
const events = require('./events');

const REQUIRED_SECTIONS = [
  ['file-tree-delta', 'File Tree Delta'],
  ['module-boundaries', 'Module Boundaries'],
  ['public-contracts', 'Public Contracts'],
  ['call-and-data-flow', 'Call And Data Flow'],
  ['caller-usage', 'Caller Usage'],
  ['interface-burden', 'Interface Burden'],
  ['seam-justification', 'Seam Justification'],
  ['alternative-shapes', 'Alternative Shapes'],
  ['deviation-return-rule', 'Deviation Return Rule'],
  ['reused-patterns', 'Reused Patterns'],
  ['non-goals', 'Non-Goals'],
  ['verification-points', 'Verification Points']
];

function normalizeHeading(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function sectionMap(body) {
  const sections = new Map();
  const matches = [...body.matchAll(/^(#{2,6})\s+(.+?)\s*$/gm)];
  for (let index = 0; index < matches.length; index++) {
    const match = matches[index];
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : body.length;
    sections.set(normalizeHeading(match[2]), body.slice(start, end).trim());
  }
  return sections;
}

function namedSection(body, headingPattern) {
  const headings = [...body.matchAll(/^(#{2,6})\s+(.+?)\s*$/gm)];
  const selected = headings.findIndex((match) => headingPattern.test(match[2]));
  if (selected === -1) return '';
  const match = headings[selected];
  const level = match[1].length;
  const next = headings.slice(selected + 1).find((candidate) => candidate[1].length <= level);
  const start = match.index + match[0].length;
  return body.slice(start, next ? next.index : body.length).trim();
}

function recordedRationale(body, label) {
  const pattern = new RegExp(`${label}\\s*:\\s*([^\\n]+)`, 'i');
  const match = body.match(pattern);
  return match && match[1].trim().replace(/^\[DECISION\]\s*/i, '');
}

function addCheck(result, id, pass, reason) {
  result.checks.push({ id, status: pass ? 'pass' : 'fail', reason });
  if (!pass) result.findings.push({ id, severity: 'error', reason });
}

function alternativeShapes(content) {
  const alternatives = [...String(content || '').matchAll(
    /^(?:[-*]\s+)?(?:\[[^\]]+\]\s*)?Alternative\s+[^:,\n]+\s*[:,]\s*(.+)$/gim
  )].map((match) => normalizeHeading(match[1]));
  const selected = String(content || '').match(
    /^(?:[-*]\s+)?(?:\[[^\]]+\]\s*)?Selected shape\s*[:,]\s*(.+)$/im
  );
  return {
    distinct: new Set(alternatives.filter(Boolean)).size,
    selected: Boolean(selected && selected[1].trim())
  };
}

function validDeviationReturnRule(content) {
  const rule = String(content || '');
  const negatesStop = /(?:\bdo\s+not\b|\bdon['’]t\b|\bnever\b)\s+stop\b[\s\S]{0,80}\b(?:production\s+)?edit/i
    .test(rule);
  const negatesReturn = /(?:\bdo\s+not\b|\bdon['’]t\b|\bnever\b)\s+return\b[\s\S]{0,80}\b(?:planner|planning)\b/i
    .test(rule);
  const continuesEditing = /\b(?:continue|keep)\b[\s\S]{0,80}\b(?:production\s+)?edit(?:s|ing)?\b/i
    .test(rule)
    || /\bproduction\s+edit(?:s|ing)?\b[\s\S]{0,80}\b(?:may|can|should|will)\s+(?:proceed|continue|resume)\b/i
      .test(rule);
  const directStop = /\bsame\s+(?:plan\s+)?deviation\b[\s\S]{0,120}\b(?:twice|two times|second (?:occurrence|time))\b[\s\S]{0,120}\bstop\s+(?:(?:all|any|further|the)\s+)?production\s+edit(?:s|ing)?\b[\s\S]{0,120}\breturn\b[\s\S]{0,80}\b(?:planner|planning)\b/i
    .test(rule);
  const activeSliceStop = /\bsame\s+(?:plan\s+)?deviation\b[\s\S]{0,120}\b(?:twice|two times|second (?:occurrence|time))\b[\s\S]{0,120}\bstop\s+(?:the\s+)?active\s+slice\b[\s\S]{0,120}\breturn\b[\s\S]{0,80}\b(?:planner|planning)\b[\s\S]{0,120}\bbefore\b[\s\S]{0,80}\bproduction\s+edit(?:s|ing)?\b/i
    .test(rule);
  return !negatesStop
    && !negatesReturn
    && !continuesEditing
    && (directStop || activeSliceStop);
}

function planHash(text) {
  return `sha256:${crypto.createHash('sha256').update(String(text || ''), 'utf8').digest('hex')}`;
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (relative !== '..'
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative));
}

function humanApprovalForFile(projectRoot, file, text) {
  if (!projectRoot) return null;
  const root = fs.realpathSync(path.resolve(projectRoot));
  const realFile = fs.realpathSync(path.resolve(file));
  if (!isInside(root, realFile)) return null;
  const artifact = path.relative(root, realFile).split(path.sep).join('/');
  const artifactHash = planHash(text);
  const runsRoot = path.join(root, '.godpowers', 'runs');
  if (!fs.existsSync(runsRoot)) return null;
  const rootStat = fs.lstatSync(runsRoot);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) return null;

  let latest = null;
  for (const entry of fs.readdirSync(runsRoot, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    const eventFile = path.join(runsRoot, entry.name, 'events.jsonl');
    if (!fs.existsSync(eventFile)) continue;
    const eventStat = fs.lstatSync(eventFile);
    if (!eventStat.isFile() || eventStat.isSymbolicLink()) continue;
    const eventReal = fs.realpathSync(eventFile);
    if (!isInside(root, eventReal) || !events.verifyChain(eventReal).valid) continue;
    for (const event of events.readRun(root, entry.name)) {
      const attrs = event && event.attrs;
      if (event.name !== 'user.resolve' || !attrs || attrs.subject !== 'program-design') continue;
      if (attrs.artifact !== artifact || attrs.artifactHash !== artifactHash) continue;
      if (typeof attrs.reviewer !== 'string' || !attrs.reviewer.trim()) continue;
      latest = {
        decision: attrs.decision,
        reviewer: attrs.reviewer.trim(),
        event: `${entry.name}/events.jsonl`
      };
    }
  }
  return latest && latest.decision === 'approved' ? latest : null;
}

function approvalFor(metadata, body, opts) {
  const declared = String(metadata.program_design_approval || metadata['program-design-approval'] || '')
    .trim().toLowerCase();
  const mode = opts.mode === 'yolo' || /^(?:yolo|auto-approved)$/.test(declared) ? 'yolo' : 'human';
  if (mode === 'yolo') {
    const ledger = String(opts.yoloLedgerText || '');
    const programEntry = namedSection(ledger, /program[ -]design/i);
    const pickedLine = programEntry.match(/auto-picked\s*:\s*([^\n]+)/i);
    const pickedText = pickedLine ? pickedLine[1].trim() : '';
    const negativePick = /\b(?:no|not|never|reject(?:ed)?|deny|denied|decline(?:d)?|without|nothing|none)\b/i
      .test(pickedText)
      || /(?:has|have|is|was|did|does)n['’]?t\b/i.test(pickedText);
    const picked = /\b(?:approve|approved|authorize|authorized|accept|accepted)\b/i.test(pickedText)
      && !negativePick;
    const rationale = recordedRationale(programEntry, 'Reason(?: \\(default\\))?');
    const approved = /^(?:yolo|auto-approved|approved)$/.test(declared) && programEntry && picked && Boolean(rationale);
    return { status: approved ? 'approved' : 'missing', mode, reviewer: 'yolo', rationale: rationale || null };
  }

  const declaredApproved = /^(?:approved|user-authorized|human-approved)$/.test(declared);
  const approval = opts.humanApproval;
  const approved = declaredApproved && approval && approval.decision === 'approved';
  return {
    status: approved ? 'approved' : 'missing',
    mode,
    reviewer: approved ? approval.reviewer : null,
    rationale: approved ? `Bound to ${approval.event}.` : null
  };
}

function validateText(text, opts = {}) {
  const parsed = frontmatter.split(String(text || ''), { strict: true, source: opts.source || null });
  const metadata = parsed.frontmatter || {};
  const body = parsed.body || '';
  const scaleMatch = body.match(/\bScale\s*:\s*(small|medium|large)\b/i);
  const scale = String(metadata.scale || (scaleMatch && scaleMatch[1]) || '').toLowerCase();
  const result = { checks: [], findings: [], scale: scale || null, approval: null, verdict: 'fail' };

  addCheck(result, 'program-design:scale', ['small', 'medium', 'large'].includes(scale),
    scale ? `Plan scale is ${scale}.` : 'Plan must record scale as small, medium, or large.');

  if (scale === 'small') {
    const sizing = recordedRationale(body, 'Sizing rationale');
    const skip = recordedRationale(body, 'Program design skip rationale');
    addCheck(result, 'program-design:sizing-rationale', Boolean(sizing),
      sizing ? 'Small plan records a sizing rationale.' : 'Small plan must record a sizing rationale.');
    addCheck(result, 'program-design:skip-rationale', Boolean(skip),
      skip ? 'Small plan records a program design skip rationale.' : 'Small plan must record a program design skip rationale.');
    result.approval = { status: 'not-required', mode: 'small-skip', reviewer: null, rationale: skip || null };
  } else if (scale === 'medium' || scale === 'large') {
    const sections = sectionMap(namedSection(body, /^program design$/i));
    for (const [id, label] of REQUIRED_SECTIONS) {
      const content = sections.get(id);
      addCheck(result, `program-design:${id}`, Boolean(content),
        content ? `${label} is recorded.` : `${label} is required for ${scale} plans.`);
    }
    const shapes = alternativeShapes(sections.get('alternative-shapes'));
    addCheck(result, 'program-design:alternative-shapes:distinct', shapes.distinct >= 2,
      shapes.distinct >= 2
        ? 'Alternative Shapes records at least two distinct alternatives.'
        : 'Alternative Shapes must record at least two distinct alternatives.');
    addCheck(result, 'program-design:alternative-shapes:selected', shapes.selected,
      shapes.selected
        ? 'Alternative Shapes records the selected shape.'
        : 'Alternative Shapes must record one selected shape.');
    const deviationRule = sections.get('deviation-return-rule');
    const validDeviationRule = validDeviationReturnRule(deviationRule);
    addCheck(result, 'program-design:deviation-return-rule:semantics', validDeviationRule,
      validDeviationRule
        ? 'Deviation Return Rule stops editing and returns to planning after the same deviation occurs twice.'
        : 'Deviation Return Rule must stop editing and return to planning after the same deviation occurs twice.');
    result.approval = approvalFor(metadata, body, opts);
    addCheck(result, 'program-design:approval', result.approval.status === 'approved',
      result.approval.status === 'approved'
        ? `${result.approval.mode} program design approval is recorded.`
        : `${scale} plan requires recorded program design approval before execution.`);
  } else {
    result.approval = { status: 'missing', mode: opts.mode === 'yolo' ? 'yolo' : 'human', reviewer: null, rationale: null };
  }

  for (const diagnostic of parsed.diagnostics || []) {
    if (diagnostic.severity !== 'error') continue;
    result.findings.push({
      id: 'program-design:frontmatter',
      severity: 'error',
      reason: diagnostic.message
    });
  }
  result.verdict = result.findings.length === 0 ? 'pass' : 'fail';
  return result;
}

function validateFile(file, opts = {}) {
  const absolute = path.resolve(file);
  const nextOpts = { ...opts, source: absolute };
  if (nextOpts.mode === 'yolo' && nextOpts.yoloLedgerText === undefined && nextOpts.projectRoot) {
    const ledger = path.join(path.resolve(nextOpts.projectRoot), '.godpowers', 'YOLO-DECISIONS.mdx');
    nextOpts.yoloLedgerText = fs.existsSync(ledger) ? fs.readFileSync(ledger, 'utf8') : '';
  }
  const stat = fs.lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error('program design plan must be a non-symlink regular file');
  }
  const text = fs.readFileSync(absolute, 'utf8');
  if (nextOpts.mode !== 'yolo') {
    nextOpts.humanApproval = humanApprovalForFile(nextOpts.projectRoot, absolute, text);
  }
  return validateText(text, nextOpts);
}

module.exports = {
  REQUIRED_SECTIONS,
  planHash,
  humanApprovalForFile,
  validateText,
  validateFile
};
