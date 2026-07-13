/**
 * Hash-bound pre-publication gate.
 *
 * A launch preparation result does not authorize publication. This module
 * re-reads hardening evidence, records the exact findings hash, and rejects a
 * gate after either the findings bytes or authoritative hardening timestamp
 * changes.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const FINDINGS_FILE = '.godpowers/harden/FINDINGS.mdx';
const STATE_FILE = '.godpowers/state.json';
const GATE_FILE = '.godpowers/launch/PREPUBLICATION.mdx';

function sha256(content) {
  return `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
}

function readText(projectRoot, relPath) {
  try {
    return fs.readFileSync(path.join(projectRoot, relPath), 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function readState(projectRoot) {
  const text = readText(projectRoot, STATE_FILE);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch (_error) {
    return null;
  }
}

function normalizedStatus(value) {
  return String(value || '').trim().toLowerCase().replace(/[_.\s]+/g, '-');
}

function classifyStatus(value) {
  const status = normalizedStatus(value);
  if (['fixed', 'resolved', 'closed', 'verified'].includes(status)) return 'resolved';
  if (['accepted-risk', 'accepted'].includes(status)) return 'accepted';
  return 'unresolved';
}

function parseCriticalFindings(content) {
  const text = String(content || '');
  const summary = text.match(/\|\s*Critical\s*\|\s*(\d+)\s*\|/i);
  const summaryTotal = summary ? Number(summary[1]) : null;
  const entries = [];

  const headingPattern = /^###\s+\[CRITICAL-[^\n]+\]([\s\S]*?)(?=^###\s+\[|(?![\s\S]))/gim;
  let match;
  while ((match = headingPattern.exec(text)) !== null) {
    const status = match[1].match(/(?:\*\*)?Status(?:\*\*)?:\s*([^\n.]+)/i);
    entries.push(classifyStatus(status ? status[1] : 'unknown'));
  }

  const yamlPattern = /^severity:\s*critical\s*$([\s\S]*?)(?=^severity:\s*|(?![\s\S]))/gim;
  while ((match = yamlPattern.exec(text)) !== null) {
    const status = match[1].match(/^status:\s*([^\n#]+)/im);
    entries.push(classifyStatus(status ? status[1] : 'unknown'));
  }

  const entryTotal = entries.length;
  const total = summaryTotal === null ? entryTotal : Math.max(summaryTotal, entryTotal);
  const resolved = entries.filter(status => status === 'resolved').length;
  const accepted = entries.filter(status => status === 'accepted').length;
  const unclassified = Math.max(0, total - entries.length);
  const unresolved = entries.filter(status => status === 'unresolved').length + accepted + unclassified;
  return { total, resolved, accepted, unresolved };
}

function hardeningState(state) {
  return state && state.tiers && state.tiers['tier-3'] && state.tiers['tier-3'].harden
    ? state.tiers['tier-3'].harden
    : null;
}

function snapshot(projectRoot) {
  const findings = readText(projectRoot, FINDINGS_FILE);
  const state = readState(projectRoot);
  const harden = hardeningState(state);
  return {
    findings,
    revision: findings === null ? null : sha256(findings),
    statePresent: state !== null,
    hardeningStatus: harden && harden.status ? harden.status : null,
    hardeningUpdatedAt: harden && harden.updated ? harden.updated : null,
    criticals: parseCriticalFindings(findings),
    explicitBlocked: findings !== null && /Launch gate(?:\*\*)?:\s*BLOCKED/i.test(findings)
  };
}

function evaluateSnapshot(current) {
  const reasons = [];
  if (current.findings === null) reasons.push(`missing ${FINDINGS_FILE}`);
  if (!current.statePresent) reasons.push(`missing or invalid ${STATE_FILE}`);
  if (current.hardeningStatus !== 'done') reasons.push(`hardening status is ${current.hardeningStatus || 'missing'}, expected done`);
  if (current.explicitBlocked) reasons.push('hardening findings record a blocked launch gate');
  if (current.criticals.unresolved > 0) reasons.push(`${current.criticals.unresolved} unresolved or accepted Critical finding(s)`);
  return {
    verdict: reasons.length === 0 ? 'pass' : 'block',
    reasons
  };
}

function frontmatterValue(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return String(value);
  return JSON.stringify(String(value));
}

function renderGate(record) {
  const lines = [
    '---',
    'schema-version: 1',
    `checked_at: ${frontmatterValue(record.checkedAt)}`,
    `hardening_revision: ${frontmatterValue(record.hardeningRevision)}`,
    `hardening_updated_at: ${frontmatterValue(record.hardeningUpdatedAt)}`,
    `critical_total: ${record.criticals.total}`,
    `critical_unresolved: ${record.criticals.unresolved}`,
    `critical_accepted: ${record.criticals.accepted}`,
    'policy: "block-unresolved-critical"',
    `verdict: ${frontmatterValue(record.verdict)}`,
    '---',
    '# Pre-Publication Gate',
    '',
    `- [DECISION] Checked at: ${record.checkedAt}.`,
    `- [DECISION] Hardening revision: ${record.hardeningRevision || 'missing'}.`,
    `- [DECISION] Hardening updated at: ${record.hardeningUpdatedAt || 'missing'}.`,
    `- [DECISION] Critical findings: ${record.criticals.total} total, ${record.criticals.unresolved} unresolved or accepted.`,
    `- [DECISION] Verdict: ${record.verdict}.`,
    '- [DECISION] Any later hardening revision or hardening state update invalidates this gate.',
    ''
  ];
  if (record.reasons.length > 0) {
    lines.push('## Blocking Reasons', '');
    for (const reason of record.reasons) lines.push(`- [DECISION] ${reason}.`);
    lines.push('');
  }
  return lines.join('\n');
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === 'null') return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch (_error) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function parseGate(content) {
  const match = String(content || '').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return null;
  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([a-z0-9_-]+):\s*(.*)$/i);
    if (field) result[field[1]] = parseScalar(field[2]);
  }
  return result;
}

function record(projectRoot, opts = {}) {
  const root = path.resolve(projectRoot || process.cwd());
  const current = snapshot(root);
  const evaluation = evaluateSnapshot(current);
  const checkedAt = opts.now || new Date().toISOString();
  if (!Number.isFinite(Date.parse(checkedAt))) throw new Error(`Invalid checked_at value: ${checkedAt}`);
  const hardeningUpdatedAt = Date.parse(current.hardeningUpdatedAt);
  if (Number.isFinite(hardeningUpdatedAt) && Date.parse(checkedAt) <= hardeningUpdatedAt) {
    evaluation.reasons.push('pre-publication check is not later than the authoritative hardening update');
    evaluation.verdict = 'block';
  }
  const result = {
    projectRoot: root,
    gateFile: GATE_FILE,
    checkedAt,
    hardeningRevision: current.revision,
    hardeningUpdatedAt: current.hardeningUpdatedAt,
    criticals: current.criticals,
    verdict: evaluation.verdict,
    reasons: evaluation.reasons
  };
  const target = path.join(root, GATE_FILE);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, renderGate(result));
  return result;
}

function check(projectRoot) {
  const root = path.resolve(projectRoot || process.cwd());
  const gateText = readText(root, GATE_FILE);
  const gate = parseGate(gateText);
  const current = snapshot(root);
  const evaluation = evaluateSnapshot(current);
  const reasons = [...evaluation.reasons];

  if (!gate) {
    reasons.push(`missing or invalid ${GATE_FILE}`);
  } else {
    if (gate.verdict !== 'pass') reasons.push(`recorded gate verdict is ${gate.verdict || 'missing'}`);
    if (gate.hardening_revision !== current.revision) reasons.push('hardening revision changed after the gate was recorded');
    if (gate.hardening_updated_at !== current.hardeningUpdatedAt) reasons.push('authoritative hardening update changed after the gate was recorded');
    if (gate.critical_unresolved !== current.criticals.unresolved) reasons.push('Critical finding counts changed after the gate was recorded');
    const checkedAt = Date.parse(gate.checked_at);
    const updatedAt = Date.parse(current.hardeningUpdatedAt);
    if (!Number.isFinite(checkedAt)) reasons.push('recorded checked_at is invalid');
    if (Number.isFinite(updatedAt) && (!Number.isFinite(checkedAt) || checkedAt <= updatedAt)) {
      reasons.push('pre-publication check is not later than the authoritative hardening update');
    }
  }

  return {
    projectRoot: root,
    gateFile: GATE_FILE,
    verdict: reasons.length === 0 ? 'pass' : 'block',
    reasons: [...new Set(reasons)],
    checkedAt: gate ? gate.checked_at : null,
    hardeningRevision: current.revision,
    recordedRevision: gate ? gate.hardening_revision : null,
    hardeningUpdatedAt: current.hardeningUpdatedAt,
    criticals: current.criticals
  };
}

function renderResult(result) {
  const lines = [
    'Godpowers Pre-Publication Gate',
    '',
    `Verdict: ${result.verdict}`,
    `Hardening revision: ${result.hardeningRevision || 'missing'}`,
    `Critical unresolved or accepted: ${result.criticals.unresolved}`,
    `Artifact: ${result.gateFile}`
  ];
  if (result.reasons.length > 0) {
    lines.push('', 'Blocking reasons:');
    for (const reason of result.reasons) lines.push(`- ${reason}`);
  }
  return lines.join('\n');
}

function parseArgs(argv) {
  const opts = { mode: 'check', projectRoot: process.cwd(), json: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--record') opts.mode = 'record';
    else if (arg === '--check') opts.mode = 'check';
    else if (arg === '--json') opts.json = true;
    else if (arg.startsWith('--project=')) opts.projectRoot = arg.slice('--project='.length);
    else if (arg === '--project' && argv[i + 1]) opts.projectRoot = argv[++i];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return opts;
}

function main(argv = process.argv) {
  let opts;
  try {
    opts = parseArgs(argv);
    const result = opts.mode === 'record' ? record(opts.projectRoot) : check(opts.projectRoot);
    if (opts.json) console.log(JSON.stringify(result, null, 2));
    else console.log(renderResult(result));
    if (result.verdict !== 'pass') process.exitCode = 1;
    return result;
  } catch (error) {
    console.error(`Pre-publication gate error: ${error.message}`);
    process.exitCode = 1;
    return null;
  }
}

if (require.main === module) main();

module.exports = {
  FINDINGS_FILE,
  STATE_FILE,
  GATE_FILE,
  sha256,
  parseCriticalFindings,
  snapshot,
  evaluateSnapshot,
  renderGate,
  parseGate,
  record,
  check,
  renderResult,
  parseArgs,
  main
};
