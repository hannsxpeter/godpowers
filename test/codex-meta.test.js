const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const install = require('../lib/install');
const { tempDir } = require('./helpers');

const SRC = path.join(__dirname, '..');
const metaPath = (base, root, name) => path.join(base, root, name, 'agents', 'openai.yaml');

test('every shipped skill has valid Codex metadata', () => {
  const names = install.listSkills(SRC);
  assert.equal(names.length, 9);
  for (const name of names) {
    const text = fs.readFileSync(path.join(SRC, 'skills', name, 'agents', 'openai.yaml'), 'utf8');
    assert.match(text, /^[\x20-\x7e\n]+$/, `${name}: plain ASCII`);
    const field = key => (text.match(new RegExp(`^  ${key}: "([^"]+)"$`, 'm')) || [])[1];
    assert.ok(text.startsWith('interface:\n'), name);
    assert.ok(field('display_name'), name);
    const short = field('short_description');
    assert.ok(short && short.length >= 25 && short.length <= 64, `${name}: short_description length`);
    assert.ok(field('default_prompt').includes(`$${name} `), `${name}: default_prompt names the skill`);
  }
});

test('Codex install writes the metadata, Claude does not, and uninstall removes it', () => {
  const names = install.listSkills(SRC);
  const base = tempDir('gp-meta-');
  install.install('codex', { srcDir: SRC, base });
  for (const name of names) assert.ok(fs.existsSync(metaPath(base, '.agents/skills', name)), name);
  const first = fs.readFileSync(metaPath(base, '.agents/skills', 'god'), 'utf8');
  fs.writeFileSync(metaPath(base, '.agents/skills', 'god'), 'stale');
  install.install('codex', { srcDir: SRC, base });
  assert.equal(fs.readFileSync(metaPath(base, '.agents/skills', 'god'), 'utf8'), first);
  install.uninstall('codex', { base });
  for (const name of names) assert.ok(!fs.existsSync(path.join(base, '.agents/skills', name)), name);

  const other = tempDir('gp-meta-');
  install.install('claude', { srcDir: SRC, base: other });
  for (const name of names) {
    assert.ok(fs.existsSync(path.join(other, '.claude/skills', name, 'SKILL.md')));
    assert.ok(!fs.existsSync(path.join(other, '.claude/skills', name, 'agents')), name);
  }
});

test('flat hosts get no metadata files', () => {
  const base = tempDir('gp-meta-');
  install.install('cursor', { srcDir: SRC, base });
  const found = fs.readdirSync(path.join(base, '.cursor/rules'));
  assert.ok(found.every(file => file.endsWith('.md')));
});
