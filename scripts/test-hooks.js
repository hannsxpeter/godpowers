#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const { test, assert, mkProject, report } = require('./test-harness');

const hook = path.resolve(__dirname, '..', 'hooks', 'pre-tool-use.sh');

function runHook(project, toolInput) {
  return spawnSync('bash', [hook], {
    cwd: project,
    env: { ...process.env, CLAUDE_TOOL_INPUT: toolInput },
    encoding: 'utf8'
  });
}

// mkProject already creates a .godpowers/ directory inside the temp project.
function godProject() {
  return mkProject('godpowers-hook-');
}

// ---------------------------------------------------------------------------
// SEC-001: the advisory hook must catch common destructive spellings, not just
// the one canonical form, while never warning on safe commands.
// ---------------------------------------------------------------------------

test('pre-tool-use warns on rm -rf .godpowers across spelling variants (SEC-001)', () => {
  const project = godProject();
  const variants = [
    'rm -rf .godpowers',
    'rm -rf ./.godpowers',
    'rm -rf .godpowers/',
    'rm -fr .godpowers',
    'rm -r -f .godpowers',
    'cd build && rm   -rf   ./.godpowers'
  ];
  for (const variant of variants) {
    const r = runHook(project, variant);
    assert(r.status === 1, `expected warn (exit 1) for: ${variant} (got ${r.status})`);
    assert(/\.godpowers/.test(r.stdout), `warning should mention .godpowers for: ${variant}`);
  }
});

test('pre-tool-use warns on force push variants (SEC-001)', () => {
  const project = godProject();
  for (const variant of [
    'git push --force origin main',
    'git push -f origin main',
    'git push --force-with-lease origin main'
  ]) {
    const r = runHook(project, variant);
    assert(r.status === 1, `expected warn for: ${variant} (got ${r.status})`);
    // TEST-005: assert it warns for the right reason, not just any exit 1.
    assert(/Force pushing/.test(r.stdout), `expected force-push warning for: ${variant}`);
  }
});

test('pre-tool-use warns on git reset --hard, npm publish, gh release create', () => {
  const project = godProject();
  // Each case must produce its OWN warning text, not merely exit 1 (TEST-005).
  for (const [variant, marker] of [
    ['git reset --hard HEAD~1', /git reset --hard/],
    ['npm publish', /npm publish/],
    ['gh release create v9.9.9', /gh release create/]
  ]) {
    const r = runHook(project, variant);
    assert(r.status === 1, `expected warn for: ${variant} (got ${r.status})`);
    assert(marker.test(r.stdout), `expected the matching warning text for: ${variant} (got: ${r.stdout})`);
  }
});

test('pre-tool-use allows safe commands without a false warning', () => {
  const project = godProject();
  for (const variant of [
    'rm -rf node_modules',
    'git push origin main',
    'git push origin feature --set-upstream',
    'ls -la',
    'npm test',
    'cat .godpowers/state.json'
  ]) {
    const r = runHook(project, variant);
    assert(r.status === 0, `expected allow (exit 0) for: ${variant} (got ${r.status}; stdout=${r.stdout})`);
  }
});

test('pre-tool-use is a no-op outside a Godpowers project', () => {
  const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-hook-bare-'));
  try {
    const r = spawnSync('bash', [hook], {
      cwd: bare,
      env: { ...process.env, CLAUDE_TOOL_INPUT: 'rm -rf .godpowers' },
      encoding: 'utf8'
    });
    assert(r.status === 0, `bare dir should exit 0, got ${r.status}`);
  } finally {
    fs.rmSync(bare, { recursive: true, force: true });
  }
});

report('Hook tests');
