/**
 * `godpowers lint`: structural checks on the files in `.godpowers/`.
 *
 * Errors block commits through the PreToolUse hook. Warnings and prose notes
 * are advisory.
 */

const fs = require('fs');
const path = require('path');

const { projectFiles, layout, cliCommand } = require('./paths');
const stateStore = require('./state');
const evidence = require('./evidence');
const gitTools = require('./git');
const prose = require('./prose');

const DECISION_HEADING_RE = /^##\s+(\d{4}-\d{2}-\d{2}):\s+\S/;
const PLAN_PLACEHOLDERS = [
  '- R1: (requirement). Done when: (observable check).',
  '- [ ] 1. (thin end-to-end slice): (how it is verified)'
];

function relative(root, file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function lintPlan(root, file, push) {
  const text = fs.readFileSync(file, 'utf8');
  const parts = stateStore.sections(text);
  const rel = relative(root, file);
  if (!parts.Goal) push(rel, 1, 'error', 'PLAN.md needs a "## Goal" section');
  if (!parts.Slices) push(rel, 1, 'error', 'PLAN.md needs a "## Slices" section');
  if (PLAN_PLACEHOLDERS.some(placeholder => text.includes(placeholder))) {
    push(rel, 1, 'warning', 'PLAN.md still has template placeholders');
  }
  if (parts.Requirements) {
    for (const entry of parts.Requirements.lines) {
      if (/^\s*-\s+\S/.test(entry.text) && !/done when:/i.test(entry.text)) {
        push(rel, entry.line, 'warning', 'requirement has no "Done when:" check');
      }
    }
  }
  if (parts.Slices) {
    for (const entry of parts.Slices.lines) {
      if (/^\s*-\s+\S/.test(entry.text) && !/^\s*-\s+\[( |x|X)\]\s/.test(entry.text)) {
        push(rel, entry.line, 'warning', 'slice should be a checkbox line: "- [ ] 1. slice: how it is verified"');
      }
    }
  }
  return text;
}

function lintDecisions(root, file, push) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = relative(root, file);
  let lastDate = '';
  text.split('\n').forEach((line, index) => {
    if (!line.startsWith('## ')) return;
    const match = DECISION_HEADING_RE.exec(line);
    if (!match) {
      push(rel, index + 1, 'error', 'decision headings must look like "## YYYY-MM-DD: title"');
      return;
    }
    if (match[1] < lastDate) push(rel, index + 1, 'warning', 'decisions are out of date order (newest goes last)');
    lastDate = match[1] > lastDate ? match[1] : lastDate;
  });
  const removed = gitTools.removedLines(root, relative(root, file)).filter(line => line.trim() !== '');
  if (removed.length) {
    push(rel, 1, 'error', `DECISIONS.md is append-only, but ${removed.length} committed line(s) were changed or removed. Restore them and add a new entry that supersedes the old one.`);
  }
  return text;
}

/**
 * Lint a project. Returns { layout, diagnostics, errors, warnings, notes }.
 * Diagnostics are { file, line, severity: 'error'|'warning'|'note', message }.
 */
function lintProject(root) {
  const diagnostics = [];
  const push = (file, line, severity, message) => diagnostics.push({ file, line, severity, message });
  const kind = layout(root);
  const files = projectFiles(root);
  if (kind === 'v6') {
    push('.godpowers/state.json', 1, 'warning', `godpowers 6 layout: run \`${cliCommand()} migrate\``);
  }
  if (kind === 'v7') {
    const state = stateStore.read(root);
    for (const diag of stateStore.validate(state)) push(relative(root, files.state), diag.line, diag.severity, diag.message);
    const texts = [];
    if (fs.existsSync(files.plan)) texts.push([files.plan, lintPlan(root, files.plan, push)]);
    if (fs.existsSync(files.decisions)) texts.push([files.decisions, lintDecisions(root, files.decisions, push)]);
    for (const problem of evidence.readAll(root).problems) {
      push(relative(root, files.evidence), problem.line, problem.severity, `evidence ledger: ${problem.message}`);
    }
    for (const [file, text] of texts) {
      for (const finding of prose.scan(text)) {
        push(relative(root, file), finding.line, 'note', `${finding.ruleId}: ${finding.suggestion}`);
      }
    }
  }
  const count = severity => diagnostics.filter(d => d.severity === severity).length;
  return { layout: kind, diagnostics, errors: count('error'), warnings: count('warning'), notes: count('note') };
}

function formatLint(result, { showNotes = false } = {}) {
  if (result.layout === 'none') return `No .godpowers/ project here. Run \`${cliCommand()} init\`.`;
  const shown = result.diagnostics.filter(d => showNotes || d.severity !== 'note');
  const lines = shown.map(d => `${d.severity.padEnd(7)} ${d.file}:${d.line}  ${d.message}`);
  const hidden = showNotes ? '' : result.notes ? `, ${result.notes} prose note(s) (--notes to show)` : '';
  lines.push(`${result.errors} error(s), ${result.warnings} warning(s)${hidden}`);
  return lines.join('\n');
}

module.exports = { lintProject, formatLint };
