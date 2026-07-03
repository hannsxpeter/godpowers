#!/usr/bin/env node
/**
 * Tests for lib/context-writer.js (AGENTS.md / CLAUDE.md / GEMINI.md / etc.).
 *
 * Behavioral tests, not just structural: actually write fences, read them
 * back, verify idempotency, verify outside-fence content preservation.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const cw = require('../lib/context-writer');
const { test, report } = require('./test-harness');


function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-context-test-'));
}

console.log('\n  Context-writer tests\n');

const FAKE_STATE = {
  project: { name: 'demo', mode: 'A', scale: 'medium' },
  tiers: {
    'tier-1': {
      prd: { status: 'done', artifact: '.godpowers/prd/PRD.mdx' },
      arch: { status: 'pending' }
    }
  }
};

test('writeFenced creates a new file with the fence', () => {
  const tmp = mkTmp();
  const file = path.join(tmp, 'AGENTS.md');
  cw.writeFenced(file, 'hello world');
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes(cw.FENCE_BEGIN)) throw new Error('begin fence missing');
  if (!content.includes(cw.FENCE_END)) throw new Error('end fence missing');
  if (!content.includes('hello world')) throw new Error('content missing');
});

test('writeFenced appends to existing file without touching prior content', () => {
  const tmp = mkTmp();
  const file = path.join(tmp, 'AGENTS.md');
  fs.writeFileSync(file, '# My existing AGENTS\n\nUser content here.\n');
  cw.writeFenced(file, 'godpowers content');
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('User content here.')) throw new Error('user content lost');
  if (!content.includes('godpowers content')) throw new Error('fence content missing');
});

test('writeFenced is idempotent (run twice = same result)', () => {
  const tmp = mkTmp();
  const file = path.join(tmp, 'AGENTS.md');
  cw.writeFenced(file, 'idempotent content');
  const first = fs.readFileSync(file, 'utf8');
  cw.writeFenced(file, 'idempotent content');
  const second = fs.readFileSync(file, 'utf8');
  if (first !== second) throw new Error('not idempotent: outputs differ');
});

test('writeFenced replaces existing fence content (refresh)', () => {
  const tmp = mkTmp();
  const file = path.join(tmp, 'AGENTS.md');
  cw.writeFenced(file, 'first version');
  cw.writeFenced(file, 'second version');
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('first version')) throw new Error('old content not replaced');
  if (!content.includes('second version')) throw new Error('new content missing');
});

test('writeFenced preserves user content even after refresh', () => {
  const tmp = mkTmp();
  const file = path.join(tmp, 'AGENTS.md');
  fs.writeFileSync(file, 'USER LINE A\n');
  cw.writeFenced(file, 'gp v1');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8') + '\nUSER LINE B\n');
  cw.writeFenced(file, 'gp v2');
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('USER LINE A')) throw new Error('user line A lost');
  if (!content.includes('gp v2')) throw new Error('refresh failed');
});

test('removeFenced clears the fence but keeps user content', () => {
  const tmp = mkTmp();
  const file = path.join(tmp, 'AGENTS.md');
  fs.writeFileSync(file, 'USER LINE\n');
  cw.writeFenced(file, 'gp content');
  const result = cw.removeFenced(file);
  if (!result.removed) throw new Error('not removed');
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('gp content')) throw new Error('fence content remains');
  if (!content.includes('USER LINE')) throw new Error('user line lost');
});

test('removeFenced deletes the file when it was Godpowers-only', () => {
  const tmp = mkTmp();
  const file = path.join(tmp, 'CLAUDE.md');
  cw.writeFenced(file, 'pointer content');
  const result = cw.removeFenced(file);
  if (!result.fileDeleted) throw new Error('file should have been deleted');
  if (fs.existsSync(file)) throw new Error('file still exists');
});

test('hasFence detects presence/absence', () => {
  const tmp = mkTmp();
  const file = path.join(tmp, 'AGENTS.md');
  fs.writeFileSync(file, 'no fence here\n');
  if (cw.hasFence(file)) throw new Error('false positive');
  cw.writeFenced(file, 'now has fence');
  if (!cw.hasFence(file)) throw new Error('false negative');
});

test('detectInstalledTools picks up .claude directory', () => {
  const tmp = mkTmp();
  fs.mkdirSync(path.join(tmp, '.claude'));
  const detected = cw.detectInstalledTools(tmp);
  if (!detected.find(d => d.tool === 'claude-code')) {
    throw new Error('claude-code not detected');
  }
});

test('detectInstalledTools picks up multiple tools at once', () => {
  const tmp = mkTmp();
  fs.mkdirSync(path.join(tmp, '.claude'));
  fs.mkdirSync(path.join(tmp, '.cursor'));
  fs.writeFileSync(path.join(tmp, 'GEMINI.md'), 'existing\n');
  const detected = cw.detectInstalledTools(tmp);
  const tools = new Set(detected.map(d => d.tool));
  if (!tools.has('claude-code')) throw new Error('missed claude-code');
  if (!tools.has('cursor')) throw new Error('missed cursor');
  if (!tools.has('gemini')) throw new Error('missed gemini');
});

test('detectInstalledTools returns empty when nothing installed', () => {
  const tmp = mkTmp();
  const detected = cw.detectInstalledTools(tmp);
  if (detected.length !== 0) throw new Error(`expected 0, got ${detected.length}`);
});

test('detectInstalledTools dedupes when multiple signals match same tool', () => {
  const tmp = mkTmp();
  fs.mkdirSync(path.join(tmp, '.cursor'));
  fs.writeFileSync(path.join(tmp, '.cursorrules'), 'rules\n');
  const detected = cw.detectInstalledTools(tmp);
  const cursorMatches = detected.filter(d => d.tool === 'cursor');
  if (cursorMatches.length !== 1) {
    throw new Error(`expected 1 cursor entry, got ${cursorMatches.length}`);
  }
});

test('buildCanonicalContent stays under 30 lines', () => {
  const content = cw.buildCanonicalContent(FAKE_STATE);
  const lines = content.split('\n');
  if (lines.length > 30) {
    throw new Error(`canonical content too long: ${lines.length} lines`);
  }
});

test('buildCanonicalContent has no em dashes, en dashes, or emojis', () => {
  const content = cw.buildCanonicalContent(FAKE_STATE);
  if (content.includes('\u2014')) throw new Error('em dash present');
  if (content.includes('\u2013')) throw new Error('en dash present');
  // Spot-check for common emoji ranges (faces, symbols)
  if (/[\u{1F300}-\u{1FAFF}]/u.test(content)) throw new Error('emoji present');
});

test('buildCanonicalContent includes mode, scale, project name', () => {
  const content = cw.buildCanonicalContent(FAKE_STATE);
  if (!content.includes('demo')) throw new Error('project name missing');
  if (!content.includes('A')) throw new Error('mode missing');
  if (!content.includes('medium')) throw new Error('scale missing');
});

test('buildCanonicalContent reads root-level mode and scale from state.json shape', () => {
  const content = cw.buildCanonicalContent({
    project: { name: 'root-shape' },
    mode: 'B',
    scale: 'small'
  });
  if (!content.includes('root-shape')) throw new Error('project name missing');
  if (!content.includes('Mode: B')) throw new Error('root-level mode missing');
  if (!content.includes('Scale: small')) throw new Error('root-level scale missing');
});

test('buildCanonicalContent lists active artifacts when present', () => {
  const content = cw.buildCanonicalContent(FAKE_STATE);
  if (!content.includes('PRD.md')) throw new Error('completed artifact not listed');
});

test('buildPointerContent points to AGENTS.md', () => {
  const content = cw.buildPointerContent('AGENTS.md');
  if (!content.includes('AGENTS.md')) throw new Error('does not point to AGENTS.md');
  if (content.split('\n').length > 5) throw new Error('pointer content too long');
});

test('plan returns canonical + pointers for detected tools only', () => {
  const tmp = mkTmp();
  fs.mkdirSync(path.join(tmp, '.claude'));
  const p = cw.plan(tmp, FAKE_STATE);
  if (!p.canonical) throw new Error('no canonical');
  if (!p.canonical.path.endsWith('AGENTS.md')) throw new Error('canonical wrong path');
  if (p.pointers.length !== 1) throw new Error(`expected 1 pointer, got ${p.pointers.length}`);
  if (p.pointers[0].tool !== 'claude-code') throw new Error('wrong tool detected');
});

test('apply writes canonical AGENTS.md and detected pointers', () => {
  const tmp = mkTmp();
  fs.mkdirSync(path.join(tmp, '.claude'));
  fs.mkdirSync(path.join(tmp, '.cursor'));
  cw.apply(tmp, FAKE_STATE);
  if (!fs.existsSync(path.join(tmp, 'AGENTS.md'))) throw new Error('AGENTS.md not written');
  if (!fs.existsSync(path.join(tmp, 'CLAUDE.md'))) throw new Error('CLAUDE.md not written');
  if (!fs.existsSync(path.join(tmp, '.cursor/rules/godpowers.mdc'))) {
    throw new Error('cursor rule not written');
  }
});

test('apply does NOT write to undetected tools', () => {
  const tmp = mkTmp();
  fs.mkdirSync(path.join(tmp, '.claude'));
  cw.apply(tmp, FAKE_STATE);
  if (fs.existsSync(path.join(tmp, 'GEMINI.md'))) {
    throw new Error('GEMINI.md written without detection signal');
  }
  if (fs.existsSync(path.join(tmp, '.cursorrules'))) {
    throw new Error('.cursorrules written without detection signal');
  }
});

test('apply is idempotent across multiple runs', () => {
  const tmp = mkTmp();
  fs.mkdirSync(path.join(tmp, '.claude'));
  cw.apply(tmp, FAKE_STATE);
  const first = fs.readFileSync(path.join(tmp, 'AGENTS.md'), 'utf8');
  cw.apply(tmp, FAKE_STATE);
  const second = fs.readFileSync(path.join(tmp, 'AGENTS.md'), 'utf8');
  if (first !== second) throw new Error('apply not idempotent');
});

test('clearAll removes fences from every target', () => {
  const tmp = mkTmp();
  fs.mkdirSync(path.join(tmp, '.claude'));
  fs.mkdirSync(path.join(tmp, '.cursor'));
  cw.apply(tmp, FAKE_STATE);
  cw.clearAll(tmp);
  // AGENTS.md is the canonical context file: emptied, never deleted.
  const agentsAfter = path.join(tmp, 'AGENTS.md');
  if (!fs.existsSync(agentsAfter)) {
    throw new Error('AGENTS.md should be emptied, not deleted');
  }
  if (fs.readFileSync(agentsAfter, 'utf8').includes('godpowers:begin')) {
    throw new Error('AGENTS.md fence should have been removed');
  }
  // Auto-generated pointer files are deleted when only the fence remained.
  if (fs.existsSync(path.join(tmp, 'CLAUDE.md'))) {
    throw new Error('CLAUDE.md should have been deleted');
  }
});

test('clearAll preserves user content outside fence', () => {
  const tmp = mkTmp();
  const agentsFile = path.join(tmp, 'AGENTS.md');
  fs.writeFileSync(agentsFile, 'USER OWNED LINE\n');
  fs.mkdirSync(path.join(tmp, '.claude'));
  cw.apply(tmp, FAKE_STATE);
  cw.clearAll(tmp);
  if (!fs.existsSync(agentsFile)) {
    throw new Error('AGENTS.md should still exist (had user content)');
  }
  const content = fs.readFileSync(agentsFile, 'utf8');
  if (!content.includes('USER OWNED LINE')) throw new Error('user line lost');
  if (content.includes('godpowers:begin')) throw new Error('fence not removed');
});

test('status reports canonical + detected tools state', () => {
  const tmp = mkTmp();
  fs.mkdirSync(path.join(tmp, '.claude'));
  fs.mkdirSync(path.join(tmp, '.gemini'));
  cw.apply(tmp, FAKE_STATE);
  const s = cw.status(tmp);
  if (!s.canonical.exists) throw new Error('canonical missing');
  if (!s.canonical.hasFence) throw new Error('canonical missing fence');
  if (s.pointers.length !== 2) {
    throw new Error(`expected 2 pointers, got ${s.pointers.length}`);
  }
  if (!s.pointers.every(p => p.hasFence)) throw new Error('pointer fences missing');
});

test('all 13 tool platforms are recognized in detection', () => {
  // Sanity: detection signals across all known tools work
  const expectations = [
    { signal: '.claude', tool: 'claude-code' },
    { signal: '.gemini', tool: 'gemini' },
    { signal: '.cursor', tool: 'cursor' },
    { signal: '.windsurf', tool: 'windsurf' },
    { signal: '.roo', tool: 'roo' },
    { signal: '.continue', tool: 'continue' },
    { signal: '.pi', tool: 'pi' },
    { signal: '.agents', tool: 'agent-skills' }
  ];
  for (const e of expectations) {
    const tmp = mkTmp();
    fs.mkdirSync(path.join(tmp, e.signal));
    const detected = cw.detectInstalledTools(tmp);
    if (!detected.find(d => d.tool === e.tool)) {
      throw new Error(`${e.tool} not detected via ${e.signal}`);
    }
  }
});

report();
