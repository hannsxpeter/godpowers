#!/usr/bin/env node
// Implements: P-COULD-05, P-COULD-06

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, spawnSync } = require('child_process');

const extensions = require('../lib/extensions');
const { test, assert, report } = require('./test-harness');

const ROOT = path.resolve(__dirname, '..');
const PACK = path.join(ROOT, 'extensions', 'operations-pack');

function read(rel) {
  return fs.readFileSync(path.join(PACK, rel), 'utf8');
}

console.log('\n  Operations pack tests\n');

test('P-COULD-05 and P-COULD-06: manifest and package expose the optional operations pack', () => {
  const parsed = extensions.parseManifest(read('manifest.yaml'));
  assert(parsed.errors.length === 0, parsed.errors.join('; '));
  const manifest = parsed.manifest;
  const pkg = JSON.parse(read('package.json'));
  assert(manifest.metadata.name === '@godpowers/operations-pack');
  assert(manifest.metadata.version === '0.1.0');
  assert(pkg.name === manifest.metadata.name && pkg.version === manifest.metadata.version);
  assert(pkg.publishConfig && pkg.publishConfig.access === 'public');
  assert(pkg.peerDependencies.godpowers === manifest.engines.godpowers);
  assert(extensions.isCompatible(manifest.engines.godpowers,
    require('../package.json').version), manifest.engines.godpowers);
  for (const name of ['god-issue-triage', 'god-setup-wizard']) {
    assert(manifest.provides.skills.includes(name), `manifest missing skill ${name}`);
  }
  for (const name of ['god-issue-triager', 'god-setup-wizard']) {
    assert(manifest.provides.agents.includes(name), `manifest missing agent ${name}`);
  }
});

test('P-COULD-05: triage contract has one category, one state, verification, and approval gates', () => {
  const skill = read('skills/god-issue-triage.md');
  const agent = read('agents/god-issue-triager.md');
  const combined = `${skill}\n${agent}`;
  for (const category of ['bug', 'enhancement']) assert(combined.includes(`\`${category}\``));
  for (const state of [
    'needs-triage',
    'needs-info',
    'ready-for-agent',
    'ready-for-human',
    'wontfix'
  ]) assert(combined.includes(`\`${state}\``), `missing state ${state}`);
  assert(/exactly one category/i.test(combined), 'category invariant missing');
  assert(/exactly one state/i.test(combined), 'state invariant missing');
  assert(/verify(?: the)? claim|claim verification/i.test(combined), 'claim verification missing');
  assert(/maintainer approval/i.test(combined), 'maintainer approval gate missing');
  assert(/before[^\n]{0,100}(?:label|comment|close|mutat)/i.test(combined),
    'approval must precede tracker mutation');
  assert(/rejected enhancement/i.test(combined) && /\.out-of-scope\//.test(combined),
    'rejected enhancement record missing');
  assert(/already implemented[\s\S]{0,220}(?:do not|never)[\s\S]{0,80}\.out-of-scope\//i.test(combined),
    'already implemented requests must not enter the rejected-concept record');
  assert(/ready-for-agent[\s\S]{0,240}STORY-/i.test(combined),
    'ready-for-agent must support a linked Godpowers story after approval');
});

test('P-COULD-06: setup wizard contract is human-only and statically verified', () => {
  const skill = read('skills/god-setup-wizard.md');
  const agent = read('agents/god-setup-wizard.md');
  const combined = `${skill}\n${agent}`;
  assert(/read (?:the )?repo|inspect (?:the )?repository|repository inspection/i.test(combined),
    'repository-first scoping missing');
  assert(/exact URL/i.test(combined) && /do not invent|never invent/i.test(combined),
    'exact URL anti-invention contract missing');
  assert(/human-only/i.test(combined), 'human-only boundary missing');
  assert(/never run[^\n]{0,100}end.to.end|do not run[^\n]{0,100}end.to.end/i.test(combined),
    'agent end-to-end execution ban missing');
  assert(/bash -n/.test(combined) && /shellcheck/.test(combined),
    'static shell verification missing');
  assert(/confirmation[^\n]{0,100}irreversible|confirm[^\n]{0,100}irreversible/i.test(combined),
    'irreversible action confirmation missing');
  for (const capability of ['hidden secret', 'idempotent', 'GitHub secret', 'GitHub variable']) {
    assert(combined.toLowerCase().includes(capability.toLowerCase()), `missing ${capability}`);
  }
});

test('wizard template is ASCII-safe, parses as Bash, and exposes bounded helpers', () => {
  const script = read('references/wizard-template.sh');
  assert(script.startsWith('#!/usr/bin/env bash'), 'wizard template shebang missing');
  assert(!/[\u2013\u2014]/.test(script), 'wizard template contains banned dash');
  assert(!/[^\x00-\x7F]/.test(script), 'wizard template must remain ASCII');
  for (const helper of [
    'open_url',
    'ask_secret',
    'upsert_env',
    'set_github_secret',
    'set_github_variable',
    'confirm_irreversible'
  ]) assert(new RegExp(`^${helper}\\(\\)`, 'm').test(script), `missing helper ${helper}`);
  assert(/read -r -s/.test(script), 'secret input is not hidden');
  assert(/mktemp/.test(script) && /mv --/.test(script), 'environment upsert is not atomic');
  assert(/trap[^\n]+EXIT/.test(script), 'temporary cleanup trap is missing');
  assert(/gh secret set/.test(script) && /gh variable set/.test(script),
    'GitHub writes are missing');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-operations-wizard-'));
  const file = path.join(tmp, 'wizard.sh');
  fs.writeFileSync(file, script);
  execFileSync('bash', ['-n', file], { stdio: 'pipe' });
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('wizard helpers preserve environment state and fail closed on unsafe input', () => {
  const template = path.join(PACK, 'references', 'wizard-template.sh');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-operations-helpers-'));
  try {
    const envFile = path.join(tmp, '.env');
    const output = execFileSync('bash', [
      '-c',
      'source "$1"; printf "KEEP=1\\nTARGET=old\\n" > "$2"; '
        + 'upsert_env TARGET first "$2"; upsert_env TARGET second "$2"; cat "$2"',
      'operations-test',
      template,
      envFile
    ], { encoding: 'utf8' });
    const lines = output.trim().split('\n');
    assert(lines.includes('KEEP=1'), output);
    assert(lines.filter((line) => line.startsWith('TARGET=')).length === 1, output);
    assert(lines.includes("TARGET='second'"), output);
    assert((fs.statSync(envFile).mode & 0o777) === 0o600,
      `unexpected env mode ${(fs.statSync(envFile).mode & 0o777).toString(8)}`);

    const invalid = spawnSync('bash', [
      '-c',
      'source "$1"; upsert_env "BAD-KEY" value "$2"',
      'operations-test',
      template,
      envFile
    ], { encoding: 'utf8' });
    assert(invalid.status !== 0, 'invalid environment key was accepted');

    const beforeUnsafe = fs.readFileSync(envFile, 'utf8');
    const multiline = spawnSync('bash', [
      '-c',
      'source "$1"; upsert_env TARGET "$UNSAFE_VALUE" "$2"',
      'operations-test',
      template,
      envFile
    ], { encoding: 'utf8', env: { ...process.env, UNSAFE_VALUE: 'first\nINJECTED=second' } });
    assert(multiline.status !== 0, 'multiline environment value was accepted');
    assert(fs.readFileSync(envFile, 'utf8') === beforeUnsafe,
      'environment file changed after unsafe value rejection');

    const fakeTools = path.join(tmp, 'failing-tools');
    fs.mkdirSync(fakeTools);
    const fakeGrep = path.join(fakeTools, 'grep');
    fs.writeFileSync(fakeGrep, '#!/bin/sh\nexit 2\n');
    fs.chmodSync(fakeGrep, 0o755);
    const readFailure = spawnSync('bash', [
      '-c',
      'source "$1"; upsert_env TARGET replacement "$2"',
      'operations-test',
      template,
      envFile
    ], { encoding: 'utf8', env: { ...process.env, PATH: `${fakeTools}:${process.env.PATH}` } });
    assert(readFailure.status !== 0, 'environment read failure was ignored');
    assert(fs.readFileSync(envFile, 'utf8') === beforeUnsafe,
      'environment file changed after read failure');
    assert(!fs.readdirSync(tmp).some((name) => name.startsWith('.env.tmp.')),
      'temporary environment file survived a failed update');

    const absentEnv = path.join(tmp, 'absent.env');
    const failingChmodTools = path.join(tmp, 'failing-chmod-tools');
    fs.mkdirSync(failingChmodTools);
    const fakeChmod = path.join(failingChmodTools, 'chmod');
    fs.writeFileSync(fakeChmod, '#!/bin/sh\nexit 1\n');
    fs.chmodSync(fakeChmod, 0o755);
    const absentFailure = spawnSync('bash', [
      '-c',
      'source "$1"; upsert_env TARGET replacement "$2"',
      'operations-test',
      template,
      absentEnv
    ], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${failingChmodTools}:${process.env.PATH}` }
    });
    assert(absentFailure.status !== 0, 'post-temporary write failure was ignored');
    assert(!fs.existsSync(absentEnv), 'failed update created a previously absent destination');
    assert(!fs.readdirSync(tmp).some((name) => name.startsWith('absent.env.tmp.')),
      'temporary file survived a failed update for an absent destination');

    const trackedRepo = path.join(tmp, 'tracked-repo');
    fs.mkdirSync(trackedRepo);
    execFileSync('git', ['init', '-q'], { cwd: trackedRepo });
    const trackedEnv = path.join(trackedRepo, '.env');
    fs.writeFileSync(trackedEnv, 'KEEP=tracked\n');
    execFileSync('git', ['add', '.env'], { cwd: trackedRepo });
    const trackedWrite = spawnSync('bash', [
      '-c',
      'source "$1"; upsert_env TARGET replacement "$2"',
      'operations-test',
      template,
      trackedEnv
    ], { encoding: 'utf8' });
    assert(trackedWrite.status !== 0, 'tracked environment destination was accepted');
    assert(fs.readFileSync(trackedEnv, 'utf8') === 'KEEP=tracked\n',
      'tracked environment destination changed');

    const exactYes = spawnSync('bash', [
      '-c',
      'source "$1"; printf "YES\\n" | confirm_irreversible "test action"',
      'operations-test',
      template
    ], { encoding: 'utf8' });
    const lowercaseYes = spawnSync('bash', [
      '-c',
      'source "$1"; printf "yes\\n" | confirm_irreversible "test action"',
      'operations-test',
      template
    ], { encoding: 'utf8' });
    assert(exactYes.status === 0, exactYes.stderr);
    assert(lowercaseYes.status !== 0, 'irreversible confirmation accepted a value other than exact YES');

    const bin = path.join(tmp, 'bin');
    const marker = path.join(tmp, 'opener-called');
    fs.mkdirSync(bin);
    const fakeOpen = path.join(bin, 'open');
    fs.writeFileSync(fakeOpen, '#!/bin/sh\nprintf called > "$OPENER_MARKER"\n');
    fs.chmodSync(fakeOpen, 0o755);
    const unsupported = spawnSync('bash', [
      '-c',
      'source "$1"; open_url "file:///tmp/not-allowed"',
      'operations-test',
      template
    ], {
      encoding: 'utf8',
      env: { ...process.env, PATH: bin, OPENER_MARKER: marker }
    });
    assert(unsupported.status !== 0, 'unsupported URL was accepted');
    assert(!fs.existsSync(marker), 'URL opener ran for a rejected URL');

    const ghBin = path.join(tmp, 'gh-bin');
    const ghArgs = path.join(tmp, 'gh-args');
    const ghStdin = path.join(tmp, 'gh-stdin');
    fs.mkdirSync(ghBin);
    const fakeGh = path.join(ghBin, 'gh');
    fs.writeFileSync(fakeGh, [
      '#!/bin/sh',
      'printf "%s\\n" "$*" >> "$GH_ARGS"',
      'if [ "$1 $2" = "auth status" ]; then exit 0; fi',
      'if [ "$1 $2" = "repo view" ]; then printf "owner/repository\\n"; exit 0; fi',
      'if [ "$1 $2" = "secret set" ]; then cat > "$GH_STDIN"; exit 0; fi',
      'if [ "$1 $2" = "variable set" ]; then exit 0; fi',
      'exit 1'
    ].join('\n') + '\n');
    fs.chmodSync(fakeGh, 0o755);
    const secretValue = 'secret-value-not-for-arguments';
    const ghEnv = {
      ...process.env,
      PATH: `${ghBin}:${process.env.PATH}`,
      GH_ARGS: ghArgs,
      GH_STDIN: ghStdin,
      SECRET_VALUE: secretValue
    };
    const secretWrite = spawnSync('bash', [
      '-c',
      'source "$1"; set_github_secret API_TOKEN "$SECRET_VALUE" owner/repository',
      'operations-test',
      template
    ], { encoding: 'utf8', env: ghEnv });
    assert(secretWrite.status === 0, secretWrite.stderr);
    assert(fs.readFileSync(ghStdin, 'utf8') === secretValue, 'secret was not delivered through stdin');
    assert(!fs.readFileSync(ghArgs, 'utf8').includes(secretValue),
      'secret appeared in GitHub CLI arguments');
    assert(fs.readFileSync(ghArgs, 'utf8').includes('--repo owner/repository'),
      'explicit GitHub repository target missing');

    const argsBeforeInvalid = fs.readFileSync(ghArgs, 'utf8');
    const optionName = spawnSync('bash', [
      '-c',
      'source "$1"; set_github_secret --repo "$SECRET_VALUE" owner/repository',
      'operations-test',
      template
    ], { encoding: 'utf8', env: ghEnv });
    const invalidRepository = spawnSync('bash', [
      '-c',
      'source "$1"; set_github_variable PUBLIC value owner/repository/extra',
      'operations-test',
      template
    ], { encoding: 'utf8', env: ghEnv });
    assert(optionName.status !== 0, 'option-like GitHub name was accepted');
    assert(invalidRepository.status !== 0, 'invalid GitHub repository target was accepted');
    assert(fs.readFileSync(ghArgs, 'utf8') === argsBeforeInvalid,
      'GitHub CLI ran after local target validation failed');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('operations pack is registered in release checks and the publish workflow', () => {
  const runner = fs.readFileSync(path.join(ROOT, 'scripts', 'run-tests.js'), 'utf8');
  const packageCheck = fs.readFileSync(path.join(ROOT, 'scripts', 'check-package-contents.js'), 'utf8');
  const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'publish-pack.yml'), 'utf8');
  assert(runner.includes("'scripts/test-operations-pack.js'"), 'full suite registration missing');
  assert(packageCheck.includes("'extensions/operations-pack/manifest.yaml'"),
    'package guard registration missing');
  assert(workflow.includes('          - operations-pack'), 'publish workflow choice missing');
  assert(workflow.includes('operations-pack'), 'publish workflow description missing');
});

test('operations pack installs lazily with skills, agents, and references', () => {
  const runtime = fs.mkdtempSync(path.join(os.tmpdir(), 'godpowers-operations-install-'));
  try {
    const result = extensions.install(runtime, PACK, require('../package.json').version);
    assert(result.installed, JSON.stringify(result));
    for (const rel of [
      'skills/god-issue-triage.md',
      'skills/god-setup-wizard.md',
      'agents/god-issue-triager.md',
      'agents/god-setup-wizard.md',
      'references/wizard-template.sh'
    ]) assert(fs.existsSync(path.join(result.path, rel)), `installed pack missing ${rel}`);
  } finally {
    fs.rmSync(runtime, { recursive: true, force: true });
  }
});

report('Operations pack tests');
