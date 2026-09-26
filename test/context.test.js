const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const context = require('../lib/context');
const { tempDir, write, read } = require('./helpers');

const V6_BLOCK = `${context.BEGIN}\n## Godpowers project\n\nThis project uses Godpowers. The on-disk state is the source of truth.\n### Quarterback rule\n${context.END}`;
const PILLARS_BLOCK = '<!-- pillars:begin -->\n# Godpowers Project Context\nLoad pillars.\n<!-- pillars:end -->';
const POINTER = `${context.BEGIN}\n## Godpowers project\n\nThis project uses Godpowers. See \`AGENTS.md\` for the project context.\n${context.END}\n`;

test('writes, updates, and removes the short AGENTS.md note', () => {
  const root = tempDir();
  assert.equal(context.writeAgentsNote(root), 'created');
  assert.match(read(root, 'AGENTS.md'), /npx -y godpowers@7 verify/);
  assert.equal(context.writeAgentsNote(root), 'unchanged');
  write(root, 'AGENTS.md', `# Team rules\n\nUse tabs.\n\n${context.BEGIN}\nold\n${context.END}\n\nFooter\n`);
  assert.equal(context.writeAgentsNote(root), 'updated');
  const text = read(root, 'AGENTS.md');
  assert.match(text, /# Team rules/);
  assert.match(text, /Footer/);
  assert.doesNotMatch(text, /\nold\n/);
  write(root, 'AGENTS.md', '# Only rules\n');
  assert.equal(context.writeAgentsNote(root), 'updated');
  assert.match(read(root, 'AGENTS.md'), /^# Only rules\n\n<!-- godpowers:begin -->/);
  assert.equal(context.removeAgentsNote(root), true);
  assert.equal(read(root, 'AGENTS.md'), '# Only rules\n');
  assert.equal(context.removeAgentsNote(root), false);
  context.writeAgentsNote(tempDir());
  const solo = tempDir();
  context.writeAgentsNote(solo);
  assert.equal(context.removeAgentsNote(solo), true);
  assert.equal(fs.existsSync(path.join(solo, 'AGENTS.md')), false);
  assert.equal(context.removeAgentsNote(tempDir()), false);
});

test('removeFence handles repeats and a predicate', () => {
  const text = `a\n${context.BEGIN}\nx\n${context.END}\nb\n${context.BEGIN}\nkeep\n${context.END}\n`;
  const result = context.removeFence(text, context.BEGIN, context.END, inner => !inner.includes('keep'));
  assert.equal(result.removed, true);
  assert.match(result.text, /keep/);
  assert.doesNotMatch(result.text, /\nx\n/);
  assert.deepEqual(context.removeFence('plain', context.BEGIN, context.END), { text: 'plain', removed: false });
});

test('cleanLegacy removes 6.x blocks and files Godpowers created, and keeps user content', () => {
  const root = tempDir();
  write(root, 'AGENTS.md', `# My rules\n\nBe kind.\n\n${PILLARS_BLOCK}\n\n${V6_BLOCK}\n`);
  write(root, 'CLAUDE.md', POINTER);
  write(root, 'GEMINI.md', `# Gemini notes\n\n${POINTER}`);
  write(root, '.cursor/rules/godpowers.mdc', POINTER);
  write(root, '.windsurfrules', 'unrelated rules\n');
  const dry = context.cleanLegacy(root, { dryRun: true });
  assert.deepEqual(dry, [
    { file: 'AGENTS.md', action: 'cleaned' },
    { file: 'CLAUDE.md', action: 'deleted' },
    { file: 'GEMINI.md', action: 'cleaned' },
    { file: '.cursor/rules/godpowers.mdc', action: 'deleted' }
  ]);
  assert.ok(fs.existsSync(path.join(root, 'CLAUDE.md')), 'dry run writes nothing');
  context.cleanLegacy(root);
  assert.equal(read(root, 'AGENTS.md'), '# My rules\n\nBe kind.\n');
  assert.equal(fs.existsSync(path.join(root, 'CLAUDE.md')), false);
  assert.equal(read(root, 'GEMINI.md'), '# Gemini notes\n');
  assert.equal(fs.existsSync(path.join(root, '.cursor/rules/godpowers.mdc')), false);
  assert.equal(read(root, '.windsurfrules'), 'unrelated rules\n');
});

test('cleanLegacy keeps the 7.x note and non-Godpowers pillars blocks, and deletes an emptied AGENTS.md', () => {
  const root = tempDir();
  context.writeAgentsNote(root);
  const before = read(root, 'AGENTS.md');
  assert.deepEqual(context.cleanLegacy(root), []);
  assert.equal(read(root, 'AGENTS.md'), before);
  const pillars = tempDir();
  write(pillars, 'AGENTS.md', '<!-- pillars:begin -->\n# Team pillars\n<!-- pillars:end -->\n');
  assert.deepEqual(context.cleanLegacy(pillars), []);
  const only = tempDir();
  write(only, 'AGENTS.md', `${PILLARS_BLOCK}\n${V6_BLOCK}\n`);
  assert.deepEqual(context.cleanLegacy(only), [{ file: 'AGENTS.md', action: 'deleted' }]);
  assert.equal(fs.existsSync(path.join(only, 'AGENTS.md')), false);
});

test('cleanLegacy removes the early uppercase GODPOWERS blocks too', () => {
  const root = tempDir();
  const old = '<!-- GODPOWERS:project-start source:.godpowers/PROGRESS.md -->\n## Godpowers Project Context\nUse /god-mode.\n<!-- GODPOWERS:project-end -->\n';
  write(root, 'AGENTS.md', `${old}\n<!-- GSD:project-start source:PROJECT.md -->\nkeep other tools\n<!-- GSD:project-end -->\n`);
  write(root, 'CLAUDE.md', old);
  assert.deepEqual(context.cleanLegacy(root), [{ file: 'AGENTS.md', action: 'cleaned' }, { file: 'CLAUDE.md', action: 'deleted' }]);
  assert.equal(read(root, 'AGENTS.md'), '<!-- GSD:project-start source:PROJECT.md -->\nkeep other tools\n<!-- GSD:project-end -->\n');
  assert.deepEqual(context.removeOldBlocks('plain'), { text: 'plain', removed: false });
});

test('cleanLegacy skips symlinks, leaves unterminated markers alone, and keeps user-written Pillars blocks', () => {
  const root = tempDir();
  context.writeAgentsNote(root);
  fs.symlinkSync('AGENTS.md', path.join(root, 'CLAUDE.md'));
  assert.deepEqual(context.cleanLegacy(root), []);
  assert.match(read(root, 'AGENTS.md'), /npx -y godpowers@7/, 'the 7.x note survives a CLAUDE.md symlink');
  assert.ok(fs.lstatSync(path.join(root, 'CLAUDE.md')).isSymbolicLink());
  const stray = tempDir();
  write(stray, 'GEMINI.md', `${context.BEGIN}\nstray marker, never closed\n\n# My notes\nKeep this.\n\n${context.BEGIN}\nold\n${context.END}\n`);
  context.cleanLegacy(stray);
  assert.match(read(stray, 'GEMINI.md'), /# My notes\nKeep this\./);
  const pillars = tempDir();
  write(pillars, 'AGENTS.md', '<!-- pillars:begin -->\n# Team pillars\nWe also use godpowers here.\n<!-- pillars:end -->\n');
  assert.deepEqual(context.cleanLegacy(pillars), []);
});
