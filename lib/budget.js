/**
 * Prompt budget for the shipped skills and agents.
 *
 * Tokens are estimated as bytes / 4, which is close enough to catch growth.
 * "Always loaded" is what a host pays in every session whether or not
 * Godpowers is used: skill and agent descriptions, the AGENTS.md note, and the
 * session-start brief. The test suite fails when any budget is exceeded.
 */

const fs = require('fs');
const path = require('path');

const frontmatter = require('./frontmatter');
const context = require('./context');
const { listSkills, listAgents } = require('./install');

const BUDGETS = {
  master: 1500,
  command: 800,
  agent: 800,
  descriptionChars: 300,
  alwaysLoaded: 1200,
  corpus: 8000
};
const SESSION_BRIEF_BYTES = 4 * 180;

const tokens = bytes => Math.ceil(bytes / 4);

function describe(rel, kind, text) {
  const doc = frontmatter.parse(text);
  const description = String(doc.data.description || '');
  return { rel, kind, bytes: Buffer.byteLength(text), tokens: tokens(Buffer.byteLength(text)), description, descriptionChars: description.length };
}

function measure(srcDir) {
  const files = [];
  for (const name of listSkills(srcDir)) {
    const rel = `skills/${name}/SKILL.md`;
    files.push(describe(rel, name === 'godpowers' ? 'master' : 'command', fs.readFileSync(path.join(srcDir, rel), 'utf8')));
  }
  for (const file of listAgents(srcDir)) {
    const rel = `agents/${file}`;
    files.push(describe(rel, 'agent', fs.readFileSync(path.join(srcDir, rel), 'utf8')));
  }
  const descriptionBytes = files.reduce((sum, f) => sum + Buffer.byteLength(f.description) + f.rel.length, 0);
  const noteBytes = Buffer.byteLength(context.blockBody());
  const alwaysLoaded = {
    tokens: tokens(descriptionBytes + noteBytes + SESSION_BRIEF_BYTES),
    parts: { descriptions: tokens(descriptionBytes), agentsNote: tokens(noteBytes), sessionBrief: tokens(SESSION_BRIEF_BYTES) }
  };
  const corpus = files.reduce((sum, f) => sum + f.tokens, 0);
  const violations = [];
  for (const f of files) {
    const limit = BUDGETS[f.kind];
    if (f.tokens > limit) violations.push(`${f.rel}: ${f.tokens} tokens (limit ${limit})`);
    if (!f.description) violations.push(`${f.rel}: missing description`);
    if (f.descriptionChars > BUDGETS.descriptionChars) violations.push(`${f.rel}: description is ${f.descriptionChars} chars (limit ${BUDGETS.descriptionChars})`);
  }
  if (alwaysLoaded.tokens > BUDGETS.alwaysLoaded) violations.push(`always-loaded context: ${alwaysLoaded.tokens} tokens (limit ${BUDGETS.alwaysLoaded})`);
  if (corpus > BUDGETS.corpus) violations.push(`full corpus: ${corpus} tokens (limit ${BUDGETS.corpus})`);
  return { files, alwaysLoaded, corpus, budgets: BUDGETS, violations };
}

function formatBudget(result) {
  const lines = ['Estimated tokens (bytes / 4)', ''];
  for (const f of result.files) lines.push(`  ${String(f.tokens).padStart(5)}  ${f.rel}  (limit ${result.budgets[f.kind]})`);
  lines.push('');
  lines.push(`  ${String(result.corpus).padStart(5)}  full corpus (limit ${result.budgets.corpus})`);
  lines.push(`  ${String(result.alwaysLoaded.tokens).padStart(5)}  always loaded per session (limit ${result.budgets.alwaysLoaded}): descriptions ${result.alwaysLoaded.parts.descriptions}, AGENTS.md note ${result.alwaysLoaded.parts.agentsNote}, session brief ${result.alwaysLoaded.parts.sessionBrief}`);
  lines.push('');
  lines.push(result.violations.length ? `Over budget:\n  ${result.violations.join('\n  ')}` : 'Within budget.');
  return lines.join('\n');
}

module.exports = { BUDGETS, tokens, measure, formatBudget };
