#!/usr/bin/env node
/**
 * Install + state-init end-to-end smoke (dogfood-003 minimal cycle).
 *
 * Audits the install -> init -> read-back path without requiring an
 * actual AI session. Catches:
 *   - Installer fails on a clean home dir
 *   - Skills/agents/refs/routing not copied
 *   - VERSION marker missing or mismatched
 *   - state.init then state.read doesn't round-trip in a fresh project
 *
 * Replaces the spirit of "actually run /god-mode on a tmpdir" without
 * the LLM dependency.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, spawnSync } = require('child_process');
const installerFiles = require('../lib/installer-files');
const { test, report } = require('./test-harness');

const ROOT = path.resolve(__dirname, '..');
const INSTALLER = path.join(ROOT, 'bin', 'install.js');
const EXAMPLE = path.join(ROOT, 'examples', 'saas-mrr-tracker');


function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

const RUNTIME_SURFACES = {
  claude: { dir: '.claude', skillsDir: 'skills', skillFile: 'god-mode.md' },
  codex: { dir: '.codex', skillsDir: 'skills', skillFile: path.join('god-mode', 'SKILL.md'), codexAgents: true },
  cursor: { dir: '.cursor', skillsDir: 'rules', skillFile: 'god-mode.md' },
  windsurf: { dir: '.windsurf', skillsDir: 'rules', skillFile: 'god-mode.md' },
  opencode: { dir: '.opencode', skillsDir: 'skills', skillFile: 'god-mode.md' },
  gemini: { dir: '.gemini', skillsDir: 'skills', skillFile: 'god-mode.md' },
  copilot: { dir: '.copilot', skillsDir: 'skills', skillFile: 'god-mode.md' },
  augment: { dir: '.augment', skillsDir: 'skills', skillFile: 'god-mode.md' },
  trae: { dir: '.trae', skillsDir: 'skills', skillFile: 'god-mode.md' },
  cline: { dir: '.cline', skillsDir: 'skills', skillFile: 'god-mode.md' },
  kilo: { dir: '.kilo', skillsDir: 'skills', skillFile: 'god-mode.md' },
  antigravity: { dir: '.antigravity', skillsDir: 'skills', skillFile: 'god-mode.md' },
  qwen: { dir: '.qwen', skillsDir: 'skills', skillFile: 'god-mode.md' },
  codebuddy: { dir: '.codebuddy', skillsDir: 'skills', skillFile: 'god-mode.md' },
  pi: { dir: '.pi', skillsDir: 'skills', skillFile: 'god-mode.md' }
};

function godAgentSourceFiles() {
  return fs.readdirSync(path.join(ROOT, 'specialists')).filter(f => /^god-.*\.md$/.test(f));
}

console.log('\n  Install + init smoke test\n');

// 1. Run the installer with a fake HOME -----------------------------------

const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-install-smoke-'));

test('installer completes against a clean HOME', () => {
  const out = execFileSync('node', [INSTALLER, '--claude', '--global', '--profile=full'], {
    env: { ...process.env, HOME: fakeHome },
    encoding: 'utf8',
    timeout: 30_000
  });
  assert(/Installed Godpowers/i.test(out) || /skills installed/i.test(out) || /Done/i.test(out),
    `installer output looked wrong:\n${out.slice(-500)}`);
});

const installedDir = path.join(fakeHome, '.claude');

test('installer wrote ~/.claude/skills/ with at least 80 god-* files', () => {
  const skillsDir = path.join(installedDir, 'skills');
  assert(fs.existsSync(skillsDir), `${skillsDir} missing`);
  const files = fs.readdirSync(skillsDir).filter(f => /^god/.test(f));
  assert(files.length >= 80, `expected >=80 skills, got ${files.length}`);
});

test('installer writes Codex commands as skill directories', () => {
  const codexHome = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-codex-smoke-'));
  execFileSync('node', [INSTALLER, '--codex', '--global', '--profile=full'], {
    env: { ...process.env, HOME: codexHome },
    encoding: 'utf8',
    timeout: 30_000
  });
  const skillsDir = path.join(codexHome, '.codex', 'skills');
  assert(fs.existsSync(path.join(skillsDir, 'god-next', 'SKILL.md')),
    'god-next/SKILL.md missing');
  assert(fs.existsSync(path.join(skillsDir, 'god-status', 'SKILL.md')),
    'god-status/SKILL.md missing');
  assert(fs.existsSync(path.join(skillsDir, 'godpowers', 'SKILL.md')),
    'godpowers/SKILL.md missing');
  assert(!fs.existsSync(path.join(skillsDir, 'god-next.md')),
    'Codex should not receive flat god-next.md');
  fs.rmSync(codexHome, { recursive: true, force: true });
});

test('installer writes Codex agent metadata for spawnable agents', () => {
  const codexHome = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-codex-agents-'));
  execFileSync('node', [INSTALLER, '--codex', '--global'], {
    env: { ...process.env, HOME: codexHome },
    encoding: 'utf8',
    timeout: 30_000
  });
  const agentsDir = path.join(codexHome, '.codex', 'agents');
  const agentFiles = godAgentSourceFiles();
  const tomlFiles = fs.readdirSync(agentsDir).filter(f => /^god-.*\.toml$/.test(f));
  assert(tomlFiles.length === agentFiles.length,
    `expected ${agentFiles.length} Codex agent metadata files, got ${tomlFiles.length}`);
  for (const agentFile of agentFiles) {
    const agentName = path.basename(agentFile, '.md');
    const tomlPath = path.join(agentsDir, `${agentName}.toml`);
    assert(fs.existsSync(tomlPath), `${agentName}.toml missing`);
    const toml = fs.readFileSync(tomlPath, 'utf8');
    assert(toml.includes(`name = "${agentName}"`),
      `${agentName}.toml missing name`);
    assert(toml.includes('description = '),
      `${agentName}.toml missing description`);
    assert(toml.includes('sandbox_mode = "workspace-write"'),
      `${agentName}.toml missing sandbox mode`);
    assert(toml.includes('developer_instructions ='),
      `${agentName}.toml missing instructions`);
  }
  assert(fs.existsSync(path.join(agentsDir, 'god-orchestrator.md')),
    'god-orchestrator.md missing');
  fs.rmSync(codexHome, { recursive: true, force: true });
});

test('installer --local writes to current directory instead of HOME', () => {
  const localProject = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-local-install-'));
  const localHome = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-local-home-'));
  execFileSync('node', [INSTALLER, '--codex', '--local'], {
    cwd: localProject,
    env: { ...process.env, HOME: localHome },
    encoding: 'utf8',
    timeout: 30_000
  });

  const localCodex = path.join(localProject, '.codex');
  const homeCodex = path.join(localHome, '.codex');
  assert(fs.existsSync(path.join(localCodex, 'skills', 'god-mode', 'SKILL.md')),
    'local Codex god-mode skill missing');
  assert(fs.existsSync(path.join(localCodex, 'agents', 'god-orchestrator.toml')),
    'local Codex god-orchestrator metadata missing');
  assert(fs.existsSync(path.join(localCodex, 'GODPOWERS_VERSION')),
    'local Codex version marker missing');
  assert(!fs.existsSync(homeCodex),
    'local install should not write to HOME .codex');

  fs.rmSync(localProject, { recursive: true, force: true });
  fs.rmSync(localHome, { recursive: true, force: true });
});

test('installer --all writes runtime-specific skill and agent surfaces', () => {
  const allHome = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-all-runtimes-'));
  execFileSync('node', [INSTALLER, '--all'], {
    env: { ...process.env, HOME: allHome },
    encoding: 'utf8',
    timeout: 60_000
  });
  const expectedAgents = godAgentSourceFiles().length;
  for (const [runtime, surface] of Object.entries(RUNTIME_SURFACES)) {
    const runtimeDir = path.join(allHome, surface.dir);
    const skillPath = path.join(runtimeDir, surface.skillsDir, surface.skillFile);
    assert(fs.existsSync(skillPath), `${runtime} god-mode skill missing`);
    assert(fs.existsSync(path.join(runtimeDir, surface.skillsDir)),
      `${runtime} skills dir missing`);
    assert(fs.existsSync(path.join(runtimeDir, 'agents', 'god-orchestrator.md')),
      `${runtime} god-orchestrator agent missing`);
    assert(fs.existsSync(path.join(runtimeDir, 'agents', 'god-pm.md')),
      `${runtime} god-pm agent missing`);
    assert(fs.existsSync(path.join(runtimeDir, 'godpowers-runtime', 'lib', 'router.js')),
      `${runtime} runtime bundle missing router`);
    assert(fs.existsSync(path.join(runtimeDir, 'GODPOWERS_VERSION')),
      `${runtime} version marker missing`);

    const metadataPath = path.join(runtimeDir, 'agents', 'god-orchestrator.toml');
    if (surface.codexAgents) {
      const tomlCount = fs.readdirSync(path.join(runtimeDir, 'agents'))
        .filter(f => /^god-.*\.toml$/.test(f)).length;
      assert(tomlCount === expectedAgents,
        `${runtime} expected ${expectedAgents} agent metadata files, got ${tomlCount}`);
      assert(fs.existsSync(metadataPath), `${runtime} god-orchestrator metadata missing`);
    } else {
      assert(!fs.existsSync(metadataPath),
        `${runtime} should not receive Codex agent metadata`);
    }
  }
  fs.rmSync(allHome, { recursive: true, force: true });
});

test('installer wrote ~/.claude/agents/ with at least 30 god-* files', () => {
  const agentsDir = path.join(installedDir, 'agents');
  assert(fs.existsSync(agentsDir), `${agentsDir} missing`);
  const files = fs.readdirSync(agentsDir).filter(f => /^god-/.test(f));
  assert(files.length >= 30, `expected >=30 agents, got ${files.length}`);
});

test('installer wrote GODPOWERS_VERSION matching package.json', () => {
  const vFile = path.join(installedDir, 'GODPOWERS_VERSION');
  assert(fs.existsSync(vFile), `${vFile} missing`);
  const installed = fs.readFileSync(vFile, 'utf8').trim();
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert(installed === pkg.version,
    `version mismatch: installed=${installed} package.json=${pkg.version}`);
});

test('installer wrote godpowers-references/ with HAVE-NOTS.md', () => {
  const refsDir = path.join(installedDir, 'godpowers-references');
  const havenots = path.join(refsDir, 'HAVE-NOTS.md');
  assert(fs.existsSync(havenots), `${havenots} missing`);
});

test('installer wrote runtime bundle with lib next to workflow data', () => {
  const runtimeDir = path.join(installedDir, 'godpowers-runtime');
  assert(fs.existsSync(path.join(runtimeDir, 'bin', 'install.js')), 'runtime bin/install.js missing');
  assert(fs.existsSync(path.join(runtimeDir, 'lib', 'router.js')), 'runtime lib/router.js missing');
  assert(fs.existsSync(path.join(runtimeDir, 'routing', 'god-mode.yaml')), 'runtime routing missing');
  assert(fs.existsSync(path.join(runtimeDir, 'workflows', 'full-arc.yaml')), 'runtime workflow missing');
  assert(fs.existsSync(path.join(runtimeDir, 'specialists', 'god-orchestrator.md')),
    'runtime specialist source missing');
  assert(fs.existsSync(path.join(runtimeDir, 'package.json')), 'runtime package.json missing');
});

test('runtime bundle works as a local package for gate commands', () => {
  const runtimeDir = path.join(installedDir, 'godpowers-runtime');
  const out = execFileSync('npm', [
    'exec',
    '--yes',
    '--package',
    runtimeDir,
    '--',
    'godpowers',
    'gate',
    '--tier=prd',
    `--project=${EXAMPLE}`,
    '--json'
  ], {
    cwd: ROOT,
    env: { ...process.env, HOME: fakeHome },
    encoding: 'utf8',
    timeout: 30_000
  });
  const parsed = JSON.parse(out);
  assert(parsed.verdict === 'pass', `runtime gate verdict: ${parsed.verdict}`);
});

test('copyRecursive preserves symlinks without dereferencing them', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-copy-symlink-'));
  const src = path.join(root, 'src');
  const dest = path.join(root, 'dest');
  fs.mkdirSync(src, { recursive: true });
  fs.writeFileSync(path.join(src, 'target.txt'), 'target');
  fs.symlinkSync('target.txt', path.join(src, 'link.txt'));

  installerFiles.copyRecursive(src, dest);

  const copiedLink = path.join(dest, 'link.txt');
  assert(fs.lstatSync(copiedLink).isSymbolicLink(), 'copied link is not a symlink');
  assert(fs.readlinkSync(copiedLink) === 'target.txt',
    `link target: ${fs.readlinkSync(copiedLink)}`);
  fs.rmSync(root, { recursive: true, force: true });
});

test('installed OTel exporter reports package version', () => {
  const runtimeDir = path.join(installedDir, 'godpowers-runtime');
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const otel = require(path.join(runtimeDir, 'lib', 'otel-exporter.js'));
  const now = new Date().toISOString();
  const out = otel.convertRun([{
    trace_id: '0123456789abcdef0123456789abcdef',
    span_id: '0123456789abcdef',
    ts: now,
    name: 'workflow.run',
    attrs: { name: 'smoke' },
    prev: 'genesis'
  }]);
  const version = out[0].scopeSpans[0].scope.version;
  assert(version === pkg.version, `version mismatch: ${version} vs ${pkg.version}`);
});

test('installed router skills explain godpowers-runtime resolution', () => {
  const skillsDir = path.join(installedDir, 'skills');
  const god = fs.readFileSync(path.join(skillsDir, 'god.md'), 'utf8');
  const next = fs.readFileSync(path.join(skillsDir, 'god-next.md'), 'utf8');
  assert(god.includes('godpowers-runtime'), 'god.md missing runtime bundle guidance');
  assert(next.includes('godpowers-runtime'), 'god-next.md missing runtime bundle guidance');
});

test('the 9 freshly-built skills are all installed', () => {
  const want = ['god-doctor', 'god-help', 'god-version', 'god-redo',
                'god-skip', 'god-rollback', 'god-repair', 'god-restore',
                'god-smite'];
  const skillsDir = path.join(installedDir, 'skills');
  for (const s of want) {
    assert(fs.existsSync(path.join(skillsDir, `${s}.md`)),
      `${s}.md not installed`);
  }
});

// 2. Init a project in a separate tmpdir, verify state round-trip -------

test('state.init in a fresh project writes valid state.json', () => {
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-proj-'));
  fs.mkdirSync(path.join(proj, '.godpowers'), { recursive: true });
  const state = require('../lib/state');
  state.init(proj, 'smoke-test');
  const s = state.read(proj);
  assert(s && s.project.name === 'smoke-test', 'roundtrip failed');
  assert(s.tiers && s.tiers['tier-1'] && s.tiers['tier-1'].prd,
    'expected tier structure missing');
});

test('intent.validate accepts a minimal greenfield intent', () => {
  const intent = require('../lib/intent');
  const errors = intent.validate({
    apiVersion: 'godpowers/v1',
    kind: 'Project',
    metadata: { name: 'smoke' },
    mode: 'A',
    scale: 'small'
  });
  assert(errors.length === 0, `unexpected errors: ${JSON.stringify(errors)}`);
});

test('events.startRun creates an OTel-shape trace', () => {
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-evt-'));
  fs.mkdirSync(path.join(proj, '.godpowers'), { recursive: true });
  const events = require('../lib/events');
  const handle = events.startRun(proj, { workflow: 'full-arc' });
  assert(handle.traceId, 'no traceId');
  assert(handle.runId, 'no runId');
  const all = events.readRun(proj, handle.runId);
  assert(all.length === 1, 'expected 1 event after startRun');
  assert(all[0].name === 'workflow.run', 'first event should be workflow.run');
});

// 3. Cleanup ------------------------------------------------------------

test('cleanup runs (no error)', () => {
  try {
    fs.rmSync(fakeHome, { recursive: true, force: true });
  } catch (e) {
    // not fatal
  }
});

test('uninstaller removes all installed Godpowers data dirs', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-uninstall-smoke-'));
  execFileSync('node', [INSTALLER, '--claude', '--global'], {
    env: { ...process.env, HOME: home },
    encoding: 'utf8',
    timeout: 30_000
  });
  execFileSync('node', [INSTALLER, '--claude', '--global', '--uninstall'], {
    env: { ...process.env, HOME: home },
    encoding: 'utf8',
    timeout: 30_000
  });
  const claudeDir = path.join(home, '.claude');
  for (const dir of [
    'godpowers-templates',
    'godpowers-references',
    'godpowers-workflows',
    'godpowers-schema',
    'godpowers-routing',
    'godpowers-runtime'
  ]) {
    assert(!fs.existsSync(path.join(claudeDir, dir)), `${dir} should be removed`);
  }
  fs.rmSync(home, { recursive: true, force: true });
});

test('uninstaller removes Codex skill directories', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-codex-uninstall-'));
  execFileSync('node', [INSTALLER, '--codex', '--global'], {
    env: { ...process.env, HOME: home },
    encoding: 'utf8',
    timeout: 30_000
  });
  execFileSync('node', [INSTALLER, '--codex', '--global', '--uninstall'], {
    env: { ...process.env, HOME: home },
    encoding: 'utf8',
    timeout: 30_000
  });
  const skillsDir = path.join(home, '.codex', 'skills');
  const agentsDir = path.join(home, '.codex', 'agents');
  assert(!fs.existsSync(path.join(skillsDir, 'god-next')), 'god-next should be removed');
  assert(!fs.existsSync(path.join(skillsDir, 'godpowers')), 'godpowers should be removed');
  assert(!fs.existsSync(path.join(agentsDir, 'god-orchestrator.md')),
    'god-orchestrator.md should be removed');
  assert(!fs.existsSync(path.join(agentsDir, 'god-orchestrator.toml')),
    'god-orchestrator.toml should be removed');
  fs.rmSync(home, { recursive: true, force: true });
});

test('installer rejects an unknown subcommand instead of installing (USE-001)', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-smoke-unknown-'));
  fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
  const r = spawnSync('node', [INSTALLER, 'staus'], {
    env: { ...process.env, HOME: home }, encoding: 'utf8'
  });
  assert(r.status === 1, `expected exit 1 for a typo'd command, got ${r.status}`);
  assert(/Unknown command: staus/.test(r.stdout + r.stderr), 'should report the unknown command');
  assert(!fs.existsSync(path.join(home, '.claude', 'skills')), 'a typo must not write skills');
  fs.rmSync(home, { recursive: true, force: true });
});

test('installer rejects an unknown profile without a stack trace (USE-002)', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-smoke-profile-'));
  const r = spawnSync('node', [INSTALLER, '--claude', '--local', '--profile=bogus'], {
    cwd: home, env: { ...process.env, HOME: home }, encoding: 'utf8'
  });
  const out = r.stdout + r.stderr;
  assert(r.status === 1, `expected exit 1 for a bad profile, got ${r.status}`);
  assert(/Unknown install profile: bogus/.test(out), 'should report the unknown profile');
  assert(!/\n\s+at \w/.test(out), 'must not print a Node stack trace');
  assert(!fs.existsSync(path.join(home, '.claude')), 'a bad profile must not create a partial .claude dir');
  fs.rmSync(home, { recursive: true, force: true });
});

test('--help groups a short "Start here" set above the advanced commands (CNT-004)', () => {
  const r = spawnSync('node', [INSTALLER, '--help'], {
    env: { ...process.env, HOME: os.tmpdir() }, encoding: 'utf8'
  });
  assert(r.status === 0, `--help should exit 0, got ${r.status}`);
  const out = r.stdout + r.stderr;
  const startIdx = out.indexOf('Start here (most common):');
  const advIdx = out.indexOf('Advanced - ledger and evidence:');
  assert(startIdx !== -1, 'help should have a "Start here" section');
  assert(advIdx !== -1, 'help should have an "Advanced - ledger and evidence" section');
  assert(startIdx < advIdx, '"Start here" must come before the advanced commands');
  // The common set must stay short (<= 6 command lines) so a newcomer is not
  // flooded; count indented command lines between the two headers.
  const between = out.slice(startIdx, advIdx).split('\n').filter((l) => /^ {2}\S/.test(l));
  assert(between.length <= 6, `Start here should list <= 6 items, found ${between.length}`);
});

report();
