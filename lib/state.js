/**
 * STATE.md: the one state file of a Godpowers project.
 *
 * Frontmatter holds the machine fields (godpowers, project, stage, verify,
 * updated, optional gate). The body holds Goal, Now, Next, and Risks sections.
 * Risks use one checkbox line each so code can find open critical risks:
 *
 *   - [ ] critical: SQL injection in /search (src/api/search.ts:40)
 *   - [x] high: login has no rate limit (fixed in 4f2c1d9)
 */

const fs = require('fs');

const frontmatter = require('./frontmatter');
const { projectFiles } = require('./paths');
const { GOAL_PLACEHOLDER, today } = require('./templates');

const STAGES = ['plan', 'build', 'review', 'harden', 'ship', 'done'];
const SEVERITIES = ['critical', 'high', 'medium', 'low'];
const KNOWN_KEYS = new Set(['godpowers', 'project', 'stage', 'verify', 'updated', 'gate']);
const RISK_RE = /^\s*-\s+\[( |x|X)\]\s+(critical|high|medium|low):\s+(\S.*)$/i;
const EMPTY_RISK_RE = /^\s*-\s+none\.?\s*$/i;

/** Split a markdown body into `## ` sections with 1-based line numbers. */
function sections(body, firstLine = 1) {
  const result = {};
  let current = null;
  body.split('\n').forEach((line, index) => {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      current = heading[1];
      result[current] = { line: firstLine + index, lines: [] };
      return;
    }
    if (current) result[current].lines.push({ text: line, line: firstLine + index });
  });
  return result;
}

function parseRisks(section) {
  const risks = [];
  const invalid = [];
  if (!section) return { risks, invalid };
  for (const entry of section.lines) {
    if (!/^\s*-\s/.test(entry.text) || EMPTY_RISK_RE.test(entry.text)) continue;
    const match = RISK_RE.exec(entry.text);
    if (!match) {
      invalid.push(entry);
      continue;
    }
    risks.push({
      open: match[1] === ' ',
      severity: match[2].toLowerCase(),
      text: match[3].trim(),
      line: entry.line
    });
  }
  return { risks, invalid };
}

function sectionText(section) {
  if (!section) return '';
  return section.lines.map(entry => entry.text).join('\n').trim();
}

/** Parse STATE.md text. Never throws; problems are returned as diagnostics. */
function parse(text) {
  const doc = frontmatter.parse(text);
  const parts = sections(doc.body, doc.bodyLine);
  const { risks, invalid } = parseRisks(parts.Risks);
  return {
    data: doc.data,
    hasFrontmatter: doc.hasFrontmatter,
    frontmatterDiagnostics: doc.diagnostics,
    body: doc.body,
    sections: parts,
    goal: sectionText(parts.Goal),
    now: sectionText(parts.Now),
    next: sectionText(parts.Next),
    risks,
    invalidRisks: invalid
  };
}

function read(root) {
  const file = projectFiles(root).state;
  if (!fs.existsSync(file)) return null;
  return { file, ...parse(fs.readFileSync(file, 'utf8')) };
}

/** Diagnostics for a parsed STATE.md: [{ severity, line, message }]. */
function validate(state) {
  const out = [];
  const error = (line, message) => out.push({ severity: 'error', line, message });
  const warning = (line, message) => out.push({ severity: 'warning', line, message });
  if (!state.hasFrontmatter) {
    error(1, 'STATE.md needs frontmatter with godpowers, project, stage, and verify');
    return out;
  }
  for (const diag of state.frontmatterDiagnostics) error(diag.line, diag.message);
  const data = state.data;
  if (data.godpowers !== 7) error(1, 'frontmatter "godpowers" must be 7');
  if (!data.project) error(1, 'frontmatter "project" is required');
  if (!STAGES.includes(data.stage)) error(1, `frontmatter "stage" must be one of: ${STAGES.join(', ')}`);
  if (data.verify === undefined || data.verify === null || data.verify === '') {
    warning(1, 'frontmatter "verify" is empty; set the project check command, or "none" if there is no automated check');
  }
  if (data.gate !== undefined && data.gate !== 'on' && data.gate !== 'off') error(1, 'frontmatter "gate" must be on or off');
  for (const key of Object.keys(data)) {
    if (!KNOWN_KEYS.has(key)) warning(1, `unknown frontmatter key "${key}"`);
  }
  if (!state.sections.Goal) warning(1, 'missing "## Goal" section');
  else if (!state.goal || state.goal === GOAL_PLACEHOLDER) warning(state.sections.Goal.line, 'Goal is not set');
  if (!state.sections.Next) warning(1, 'missing "## Next" section');
  for (const entry of state.invalidRisks) {
    error(entry.line, `risk lines must look like "- [ ] critical: what and where" (severity: ${SEVERITIES.join(', ')})`);
  }
  return out;
}

function openRisks(state, severity) {
  return state.risks.filter(risk => risk.open && (!severity || risk.severity === severity));
}

/** Update frontmatter fields in place, keeping the body. Stamps `updated`. */
function setFields(root, updates) {
  const file = projectFiles(root).state;
  const doc = frontmatter.parse(fs.readFileSync(file, 'utf8'));
  if (!doc.hasFrontmatter) throw new Error('STATE.md has no frontmatter to update');
  if (updates.stage !== undefined && !STAGES.includes(updates.stage)) {
    throw new Error(`stage must be one of: ${STAGES.join(', ')}`);
  }
  const data = { ...doc.data, ...updates, updated: today() };
  fs.writeFileSync(file, frontmatter.stringify(data, doc.body));
  return data;
}

module.exports = { STAGES, SEVERITIES, sections, parse, read, validate, openRisks, setFields };
