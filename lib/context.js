/**
 * Project instruction files.
 *
 * Godpowers 7 writes one short fenced note into AGENTS.md and nothing else.
 * Godpowers 6 wrote a long block into AGENTS.md, pointer blocks into CLAUDE.md,
 * GEMINI.md and several editor rule files, and a Pillars block into AGENTS.md.
 * `cleanLegacy` removes those; a file left empty by the removal is deleted,
 * because Godpowers created it.
 */

const fs = require('fs');
const path = require('path');
const { NPX_SPEC, LEGACY_NPX_SPEC } = require('./paths');

const BEGIN = '<!-- godpowers:begin -->';
const END = '<!-- godpowers:end -->';
const PILLARS_BEGIN = '<!-- pillars:begin -->';
const PILLARS_END = '<!-- pillars:end -->';
// Early 6.x releases wrote GSD-style blocks: <!-- GODPOWERS:project-start ... -->.
const OLD_BLOCK_RE = /<!-- GODPOWERS:([a-z-]+)-start[^>]*-->[\s\S]*?<!-- GODPOWERS:\1-end -->\n*/g;

const LEGACY_POINTER_FILES = [
  'CLAUDE.md',
  'GEMINI.md',
  '.cursor/rules/godpowers.mdc',
  '.cursorrules',
  '.windsurf/rules/godpowers.md',
  '.windsurfrules',
  '.github/copilot-instructions.md',
  '.clinerules',
  '.roo/rules/godpowers.md',
  '.continue/rules/godpowers.md',
  '.pi/skills/godpowers.md',
  '.agents/skills/godpowers.md'
];

function blockBody() {
  return [
    '## Godpowers',
    '',
    'Project state lives in `.godpowers/` (STATE.md, PLAN.md, DECISIONS.md). Before calling code work done,',
    `run \`${NPX_SPEC} verify "<check command>"\`. \`/god\` shows the next step.`
  ].join('\n');
}

/**
 * Remove every fenced block whose inner text passes `predicate`. Each removed
 * block holds exactly one begin marker: an unterminated begin marker is left
 * alone rather than taking the text after it. Returns { text, removed }.
 */
function removeFence(text, begin, end, predicate = () => true) {
  let removed = false;
  let from = 0;
  for (;;) {
    const stop = text.indexOf(end, from);
    if (stop === -1) return { text, removed };
    const start = text.lastIndexOf(begin, stop);
    if (start === -1 || start < from || !predicate(text.slice(start + begin.length, stop))) {
      from = stop + end.length;
      continue;
    }
    const before = text.slice(0, start).replace(/\n+$/, '\n');
    const after = text.slice(stop + end.length).replace(/^\n+/, '');
    text = before.trim() === '' ? after : after.trim() === '' ? before : `${before}\n${after}`;
    from = 0;
    removed = true;
  }
}

function removeOldBlocks(text) {
  const next = text.replace(OLD_BLOCK_RE, '');
  return { text: next, removed: next !== text };
}

/** Insert or replace the Godpowers note in AGENTS.md. Returns 'created'|'updated'|'unchanged'. */
function writeAgentsNote(root) {
  const file = path.join(root, 'AGENTS.md');
  const block = `${BEGIN}\n${blockBody()}\n${END}\n`;
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, block);
    return 'created';
  }
  const current = fs.readFileSync(file, 'utf8');
  let next;
  const start = current.indexOf(BEGIN);
  const stop = current.indexOf(END, start + BEGIN.length);
  if (start !== -1 && stop !== -1) {
    next = `${current.slice(0, start)}${block.trimEnd()}${current.slice(stop + END.length)}`;
  } else {
    next = `${current.replace(/\s*$/, '')}\n\n${block}`;
  }
  if (next === current) return 'unchanged';
  fs.writeFileSync(file, next);
  return 'updated';
}

/**
 * Read-only check: does AGENTS.md at the project root still run the retired
 * unscoped package? Returns a warning line or null. Never writes, and skips
 * anything that is not a regular file (a symlink, a directory).
 */
function legacyNoteWarning(root) {
  const file = path.join(root, 'AGENTS.md');
  let fd = null;
  try {
    // O_NOFOLLOW refuses a symlink, and the type check runs on the open descriptor, not the path.
    fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0));
    if (!fs.fstatSync(fd).isFile()) return null;
    if (!fs.readFileSync(fd, 'utf8').includes(LEGACY_NPX_SPEC)) return null;
  } catch (_) {
    return null;
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
  return `AGENTS.md still runs \`${LEGACY_NPX_SPEC}\`; the package moved, replace it with \`${NPX_SPEC}\`.`;
}

function removeAgentsNote(root) {
  const file = path.join(root, 'AGENTS.md');
  if (!fs.existsSync(file)) return false;
  const result = removeFence(fs.readFileSync(file, 'utf8'), BEGIN, END);
  if (!result.removed) return false;
  if (result.text.trim() === '') fs.rmSync(file);
  else fs.writeFileSync(file, result.text);
  return true;
}

const isV7Note = inner => inner.includes(NPX_SPEC) || inner.includes(LEGACY_NPX_SPEC);
const isGeneratedPillars = inner => inner.includes('# Godpowers Project Context');

function isSymlink(file) {
  try {
    return fs.lstatSync(file).isSymbolicLink();
  } catch (_) {
    return false;
  }
}

function cleanText(text, { agents }) {
  let removed = false;
  if (agents) {
    const pillars = removeFence(text, PILLARS_BEGIN, PILLARS_END, isGeneratedPillars);
    text = pillars.text;
    removed = pillars.removed;
  }
  const own = removeFence(text, BEGIN, END, inner => !isV7Note(inner));
  const old = removeOldBlocks(own.text);
  return { text: old.text, removed: removed || own.removed || old.removed };
}

/**
 * Remove Godpowers 6 instruction blocks from AGENTS.md and the files 6.x
 * pointed at it. Symlinked files are skipped, since they usually point at
 * AGENTS.md itself. Returns [{ file, action: 'cleaned' | 'deleted' }]; with
 * dryRun nothing is written.
 */
function cleanLegacy(root, { dryRun = false } = {}) {
  const actions = [];
  for (const rel of ['AGENTS.md', ...LEGACY_POINTER_FILES]) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file) || isSymlink(file)) continue;
    const result = cleanText(fs.readFileSync(file, 'utf8'), { agents: rel === 'AGENTS.md' });
    if (!result.removed) continue;
    const empty = result.text.trim() === '';
    actions.push({ file: rel, action: empty ? 'deleted' : 'cleaned' });
    if (!dryRun) {
      if (empty) fs.rmSync(file);
      else fs.writeFileSync(file, result.text);
    }
  }
  return actions;
}

module.exports = {
  BEGIN,
  END,
  LEGACY_POINTER_FILES,
  blockBody,
  removeFence,
  removeOldBlocks,
  writeAgentsNote,
  legacyNoteWarning,
  removeAgentsNote,
  cleanLegacy
};
