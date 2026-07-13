#!/usr/bin/env node
/**
 * Surface contraction evidence tests.
 *
 * Keeps the Phase 5 profile boundary tied to the proof-campaign artifacts
 * before installer defaults and command routing change.
 */

const fs = require('fs');
const path = require('path');
const profiles = require('../lib/install-profiles');
const frontmatter = require('../lib/frontmatter');
const { test, assert, report } = require('./test-harness');

const ROOT = path.resolve(__dirname, '..');
const DOC = 'docs/surface-contraction.md';

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function skillNames() {
  return fs.readdirSync(path.join(ROOT, 'skills'))
    .filter((file) => file.endsWith('.md'))
    .map((file) => path.basename(file, '.md'));
}

function assertIncludes(text, expected) {
  assert(text.includes(expected), `${DOC} missing expected text: ${expected}`);
}

console.log('\n  Surface contraction evidence tests\n');

test('surface contraction evidence doc is linked from reference docs', () => {
  assert(fs.existsSync(path.join(ROOT, DOC)), `${DOC} is missing`);
  assert(read('docs/reference.md').includes('[Surface Contraction Evidence](surface-contraction.md)'),
    'docs/reference.md does not link to surface contraction evidence');
});

test('surface contraction evidence cites proof campaign sources', () => {
  const text = read(DOC);
  for (const source of [
    'case-studies/run-a.md',
    'case-studies/run-b.md',
    'case-studies/run-c.md',
    'case-studies/sindresorhus-is-adoption-canary.md',
    'case-studies/expressjs-cors-adoption-canary.md',
    'case-studies/tinyhttp-adoption-canary.md'
  ]) {
    assertIncludes(text, source);
  }
});

test('surface contraction evidence records the current profile boundary', () => {
  const names = skillNames();
  const coreCount = profiles.selectedSkillNames('core', names).size;
  const fullCount = profiles.selectedSkillNames('full', names).size;
  const text = read(DOC);
  assertIncludes(text, `\`core\` profile currently selects ${coreCount} skills`);
  assertIncludes(text, `\`full\` profile currently selects ${fullCount} skills`);
});

test('phase 5 verb dispatch skills exist', () => {
  const names = skillNames();
  for (const name of ['god-plan', 'god-build', 'god-fix', 'god-ship', 'god-sync']) {
    assert(names.includes(name), `${name} dispatch skill is missing`);
    assert(fs.existsSync(path.join(ROOT, 'routing', `${name}.yaml`)), `${name} routing is missing`);
  }
});

test('deprecated command metadata names a successor', () => {
  const missing = [];
  for (const file of fs.readdirSync(path.join(ROOT, 'skills')).filter((name) => name.endsWith('.md')).sort()) {
    const parsed = frontmatter.parse(read(path.join('skills', file)), { strict: true });
    if (parsed.deprecated === true && !parsed.successor) {
      missing.push(file);
    }
  }
  assert(missing.length === 0, `deprecated skills missing successor: ${missing.join(', ')}`);
});

test('status flags replace locate and lifecycle in smaller profiles', () => {
  const names = skillNames();
  for (const profile of ['core', 'builder', 'maintainer', 'suite']) {
    const selected = profiles.selectedSkillNames(profile, names);
    assert(!selected.has('god-locate'), `${profile} should not install god-locate`);
    assert(!selected.has('god-lifecycle'), `${profile} should not install god-lifecycle`);
  }
  const status = read('skills/god-status.md');
  assert(status.includes('/god-status --locate'), 'status skill missing locate flag');
  assert(status.includes('/god-status --lifecycle'), 'status skill missing lifecycle flag');
});

test('observed host proof slash commands map to verbs or explicit exceptions', () => {
  const text = read(DOC);
  for (const command of [
    '/god-mode',
    '/god-preflight',
    '/god-archaeology',
    '/god-reconstruct',
    '/god-tech-debt',
    '/god-prd',
    '/god-design',
    '/god-arch',
    '/god-roadmap',
    '/god-stack',
    '/god-repo',
    '/god-build',
    '/god-deploy',
    '/god-observe',
    '/god-harden',
    '/god-launch',
    '/god-sync',
    '/god-status'
  ]) {
    assertIncludes(text, `| \`${command}\` |`);
  }
  assertIncludes(text, '| `quick-proof` CLI |');
  assertIncludes(text, '| `gate` CLI |');
  assertIncludes(text, '| `/god-observe` | `ship` |');
});

report('Surface contraction evidence tests');
