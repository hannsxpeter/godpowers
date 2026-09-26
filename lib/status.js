/**
 * `godpowers status`: one read-only view of state, evidence, and risks.
 */

const { layout, cliCommand } = require('./paths');
const stateStore = require('./state');
const evidence = require('./evidence');
const gitTools = require('./git');
const lint = require('./lint');

function firstLine(text, max = 160) {
  const line = String(text || '').split('\n').map(l => l.replace(/^\s*-\s+/, '').trim()).find(Boolean) || '';
  return line.length > max ? `${line.slice(0, max - 3)}...` : line;
}

function collect(root) {
  const kind = layout(root);
  const info = { root, layout: kind };
  if (kind !== 'v7') return info;
  const state = stateStore.read(root);
  const tree = gitTools.treeFingerprint(root);
  const { records, problems } = evidence.readAll(root);
  const command = state.data.verify && state.data.verify !== 'none' ? state.data.verify : null;
  const counts = {};
  for (const severity of stateStore.SEVERITIES) counts[severity] = stateStore.openRisks(state, severity).length;
  const lintResult = lint.lintProject(root);
  return {
    ...info,
    project: state.data.project || '(unnamed)',
    stage: state.data.stage || '(unset)',
    verify: state.data.verify || '',
    gate: state.data.gate === 'off' || process.env.GODPOWERS_GATE === 'off' ? 'off' : 'on',
    goal: firstLine(state.goal),
    now: firstLine(state.now),
    next: firstLine(state.next),
    git: tree !== null,
    evidence: evidence.statusFor(records, tree, { command }),
    records: records.length,
    ledgerProblems: problems.filter(p => p.severity === 'error').length,
    ledgerWarnings: problems.filter(p => p.severity === 'warning').length,
    risks: counts,
    lint: { errors: lintResult.errors, warnings: lintResult.warnings }
  };
}

function riskSummary(risks) {
  const open = Object.entries(risks).filter(([, n]) => n > 0).map(([severity, n]) => `${n} ${severity}`);
  return open.length ? open.join(', ') : 'none';
}

function checkSummary(info) {
  if (!info.git) return 'not a git repo (evidence is not bound to code)';
  const labels = { pass: 'passing', fail: 'FAILING', waived: 'waived', none: 'none' };
  return `${labels[info.evidence.check]} on current code`;
}

function formatStatus(info) {
  const cli = cliCommand();
  if (info.layout === 'none') return `No Godpowers project here. Run \`${cli} init\` (or /god-init).`;
  if (info.layout === 'v6') return `This project uses the Godpowers 6 layout. Run \`${cli} migrate --dry-run\`, then without --dry-run.`;
  const e = info.evidence;
  const lines = [
    `Project: ${info.project}`,
    `Stage:   ${info.stage}`,
    `Goal:    ${info.goal || '(not set)'}`,
    `Now:     ${info.now || '-'}`,
    `Next:    ${info.next || '-'}`,
    `Checks:  ${checkSummary(info)}${info.verify ? ` (verify: ${info.verify})` : ''}`,
    `Review:  ${e.review}   Security: ${e.harden}   Ship: ${e.ship}`,
    `Risks:   ${riskSummary(info.risks)}`,
    `Gate:    ${info.gate}`
  ];
  if (info.lint.errors || info.lint.warnings) lines.push(`Lint:    ${info.lint.errors} error(s), ${info.lint.warnings} warning(s): run \`${cli} lint\``);
  if (info.ledgerProblems) lines.push(`Ledger:  ${info.ledgerProblems} invalid or edited record(s)`);
  return lines.join('\n');
}

/** A short brief for session start context. */
function brief(info) {
  if (info.layout !== 'v7') return '';
  const lines = [
    `Godpowers: ${info.project} | stage ${info.stage} | checks ${checkSummary(info)} | open risks: ${riskSummary(info.risks)}`,
    `Goal: ${info.goal || '(not set)'}`,
    `Next: ${info.next || '(not set)'}`
  ];
  const cli = cliCommand();
  if (!cli.startsWith('npx')) lines.push(`Godpowers CLI: ${cli} (use it for verify, status, record, and gate)`);
  return lines.join('\n');
}

module.exports = { collect, formatStatus, brief, firstLine };
