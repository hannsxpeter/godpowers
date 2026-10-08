const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const install = require('../lib/install');
const doctorTools = require('../lib/doctor');
const { resolveRuntime } = require('../lib/runtimes');
const { tempDir, write, read } = require('./helpers');

const SRC = path.join(__dirname, '..');
const SKILLS = ['god', 'god-build', 'god-harden', 'god-init', 'god-plan', 'god-review', 'god-ship', 'god-status', 'godpowers'];
const AGENTS = ['god-executor', 'god-planner', 'god-reviewer', 'god-security-auditor'];
const json = (base, rel) => JSON.parse(read(base, rel));
const ownCommands = hooks => Object.values(hooks).flat().flatMap(g => g.hooks).map(h => h.command).filter(c => c.includes('godpowers.js'));

/** A home directory that looks like a Godpowers 6 user with other tools installed. */
function legacyHome() {
  const base = tempDir('gp-home-');
  write(base, '.claude/skills/god-mode.md', 'old flat skill');
  write(base, '.claude/skills/god-smite.md', 'old flat skill');
  write(base, '.claude/skills/godpowers.md', 'old master');
  write(base, '.claude/skills/goddesign/SKILL.md', 'someone else');
  write(base, '.claude/skills/gsd-next/SKILL.md', 'someone else');
  write(base, '.claude/agents/god-orchestrator.md', 'old agent');
  write(base, '.claude/agents/gsd-planner.md', 'someone else');
  write(base, '.claude/godpowers-references/HAVE-NOTS.md', 'old');
  write(base, '.claude/godpowers-runtime/lib/x.js', 'old');
  write(base, '.claude/GODPOWERS_VERSION', '6.4.0');
  write(base, '.claude/GODPOWERS_PROFILE', 'core');
  write(base, '.claude/hooks/session-start.sh', '# Godpowers SessionStart Hook\n');
  write(base, '.claude/hooks/gsd-check-update.js', 'keep');
  write(base, '.claude/settings.json', JSON.stringify({
    model: 'opus',
    hooks: {
      SessionStart: [{ hooks: [{ type: 'command', command: 'node /x/gsd-check-update.js' }] }],
      PreToolUse: [{ matcher: 'Write|Edit', hooks: [{ type: 'command', command: 'node /x/gsd-guard.js' }] }]
    }
  }, null, 2));
  write(base, '.codex/skills/god-mode/SKILL.md', 'old codex skill');
  write(base, '.codex/skills/codeauditor/SKILL.md', 'someone else');
  write(base, '.codex/agents/god-orchestrator.toml', 'old');
  write(base, '.codex/agents/god-orchestrator.md', 'old');
  write(base, '.codex/godpowers-workflows/a.yaml', 'old');
  return base;
}

/** A copy of the package sources (bin, lib, skills, agents, package.json) outside the repo. */
function sourceTree() {
  const base = tempDir('gp-src-');
  install.install('claude', { srcDir: SRC, base });
  const dir = path.join(base, '.claude/godpowers');
  fs.rmSync(path.join(dir, '.godpowers-runtime'));
  return dir;
}

test('Claude Code install writes skill directories, agents, runtime, and hooks, and removes 6.x leftovers', () => {
  const base = legacyHome();
  const result = install.install('claude', { srcDir: SRC, base });
  assert.deepEqual(result.skills, SKILLS);
  assert.deepEqual(result.agents, AGENTS);
  for (const name of SKILLS) assert.ok(fs.existsSync(path.join(base, '.claude/skills', name, 'SKILL.md')), name);
  for (const name of AGENTS) assert.ok(fs.existsSync(path.join(base, '.claude/agents', `${name}.md`)), name);
  assert.ok(fs.existsSync(path.join(base, '.claude/godpowers/bin/godpowers.js')));
  assert.equal(json(base, '.claude/godpowers/package.json').name, 'godpowers');
  for (const gone of ['skills/god-mode.md', 'skills/god-smite.md', 'skills/godpowers.md', 'agents/god-orchestrator.md', 'godpowers-references', 'godpowers-runtime', 'GODPOWERS_VERSION', 'GODPOWERS_PROFILE', 'hooks/session-start.sh']) {
    assert.equal(fs.existsSync(path.join(base, '.claude', gone)), false, gone);
  }
  for (const kept of ['skills/goddesign/SKILL.md', 'skills/gsd-next/SKILL.md', 'agents/gsd-planner.md', 'hooks/gsd-check-update.js']) {
    assert.ok(fs.existsSync(path.join(base, '.claude', kept)), kept);
  }
  const settings = json(base, '.claude/settings.json');
  assert.equal(settings.model, 'opus');
  assert.equal(settings.hooks.SessionStart.length, 2, 'existing hooks are kept');
  assert.match(settings.hooks.Stop[0].hooks[0].command, /^node ".*\.claude\/godpowers\/bin\/godpowers\.js" hook stop$/);
  const pre = settings.hooks.PreToolUse.find(g => g.matcher === 'Bash');
  assert.equal(pre.hooks[0].if, 'Bash(git *)');
  const cli = `node "${path.join(base, '.claude/godpowers/bin/godpowers.js')}"`;
  const skill = read(base, '.claude/skills/god-build/SKILL.md');
  assert.ok(skill.includes(`${cli} verify`), 'installed skills call the installed CLI');
  assert.ok(!skill.includes('npx -y godpowers@7'));
  assert.ok(read(base, '.claude/agents/god-executor.md').includes(cli));
  assert.ok(fs.existsSync(path.join(base, '.claude/godpowers/.godpowers-runtime')));
  assert.equal(settings.hooks.PreToolUse.length, 2);
  install.install('claude', { srcDir: SRC, base });
  assert.equal(ownCommands(json(base, '.claude/settings.json').hooks).length, 3, 'reinstalling does not duplicate hooks');
});

test('Codex install uses ~/.agents/skills, TOML agents, and hooks.json', () => {
  const base = legacyHome();
  const result = install.install('codex', { srcDir: SRC, base });
  assert.equal(result.hooks, path.join(base, '.codex/hooks.json'));
  for (const name of SKILLS) assert.ok(fs.existsSync(path.join(base, '.agents/skills', name, 'SKILL.md')), name);
  assert.equal(fs.existsSync(path.join(base, '.codex/skills/god-mode')), false);
  assert.ok(fs.existsSync(path.join(base, '.codex/skills/codeauditor/SKILL.md')));
  assert.equal(fs.existsSync(path.join(base, '.codex/agents/god-orchestrator.toml')), false);
  assert.equal(fs.existsSync(path.join(base, '.codex/agents/god-orchestrator.md')), false);
  assert.equal(fs.existsSync(path.join(base, '.codex/godpowers-workflows')), false);
  const toml = read(base, '.codex/agents/god-reviewer.toml');
  const field = key => JSON.parse(new RegExp(`^${key} = (".*")$`, 'm').exec(toml)[1]);
  assert.equal(field('name'), 'god-reviewer');
  assert.match(field('description'), /Independent reviewer/);
  assert.match(field('developer_instructions'), /You review a change you did not write/);
  assert.ok(read(base, '.codex/agents/god-executor.toml').includes('.codex/godpowers/bin/godpowers.js'));
  assert.ok(read(base, '.agents/skills/god/SKILL.md').includes('.codex/godpowers/bin/godpowers.js'));
  assert.equal(fs.readdirSync(path.join(base, '.codex/agents')).filter(f => f.endsWith('.md')).length, 0);
  const hooks = json(base, '.codex/hooks.json').hooks;
  assert.equal(hooks.PreToolUse[0].matcher, '^Bash$');
  assert.equal(hooks.PreToolUse[0].hooks[0].if, undefined);
  assert.match(hooks.SessionStart[0].hooks[0].command, /\.codex\/godpowers\/bin\/godpowers\.js" hook session-start$/);
});

test('flat hosts get markdown files and no hooks; local installs use project-relative hook paths', () => {
  const base = tempDir('gp-home-');
  const cursor = install.install('cursor', { srcDir: SRC, base });
  assert.equal(cursor.hooks, null);
  assert.ok(fs.existsSync(path.join(base, '.cursor/rules/god-build.md')));
  assert.ok(read(base, '.cursor/rules/god-build.md').includes('npx -y godpowers@7'), 'hosts without a runtime copy keep npx');
  assert.ok(fs.existsSync(path.join(base, '.cursor/agents/god-reviewer.md')));
  assert.equal(fs.existsSync(path.join(base, '.cursor/godpowers')), false);
  const project = tempDir('gp-local-');
  install.install('claude', { srcDir: SRC, base: project, local: true });
  assert.equal(json(project, '.claude/settings.json').hooks.Stop[0].hooks[0].command, 'node "${CLAUDE_PROJECT_DIR}/.claude/godpowers/bin/godpowers.js" hook stop');
  assert.ok(read(project, '.claude/skills/god/SKILL.md').includes('node ".claude/godpowers/bin/godpowers.js"'));
  install.install('codex', { srcDir: SRC, base: project, local: true });
  assert.equal(json(project, '.codex/hooks.json').hooks.Stop[0].hooks[0].command, `node "${path.join(project, '.codex/godpowers/bin/godpowers.js')}" hook stop`);
  assert.throws(() => install.install('nope', { srcDir: SRC, base }), /unknown runtime/);
  assert.throws(() => install.uninstall('nope', { base }), /unknown runtime/);
});

test('uninstall removes only Godpowers entries and hooks', () => {
  const base = legacyHome();
  install.install('claude', { srcDir: SRC, base });
  const result = install.uninstall('claude', { base });
  assert.ok(result.removed.length >= 3);
  assert.deepEqual(fs.readdirSync(path.join(base, '.claude/skills')).sort(), ['goddesign', 'gsd-next']);
  assert.deepEqual(fs.readdirSync(path.join(base, '.claude/agents')), ['gsd-planner.md']);
  assert.equal(fs.existsSync(path.join(base, '.claude/godpowers')), false);
  const settings = json(base, '.claude/settings.json');
  assert.equal(ownCommands(settings.hooks).length, 0);
  assert.equal(settings.hooks.SessionStart.length, 1);
  assert.equal(settings.hooks.Stop, undefined);
  assert.equal(install.uninstall('claude', { base }).removed.length, 0);
  const bare = tempDir('gp-home-');
  install.install('codex', { srcDir: SRC, base: bare });
  install.uninstall('codex', { base: bare });
  assert.deepEqual(json(bare, '.codex/hooks.json'), {});
});

test('install refuses to overwrite an invalid settings file', () => {
  const base = tempDir('gp-home-');
  write(base, '.claude/settings.json', '{ broken');
  assert.throws(() => install.install('claude', { srcDir: SRC, base }), /not valid JSON/);
  assert.equal(read(base, '.claude/settings.json'), '{ broken');
  write(base, '.claude/settings.json', '[]');
  assert.throws(() => install.install('claude', { srcDir: SRC, base }), /must contain a JSON object/);
  write(base, '.claude/settings.json', '');
  install.install('claude', { srcDir: SRC, base });
  assert.equal(ownCommands(json(base, '.claude/settings.json').hooks).length, 3);
});

test('withoutOwnHooks keeps foreign entries, odd shapes, and the user own legacy-named scripts', () => {
  const home = tempDir('gp-home-');
  const hooks = {
    Stop: [{ hooks: [{ command: 'node "/h/.claude/godpowers/bin/godpowers.js" hook stop' }, { command: 'other' }] }],
    SessionStart: [{ hooks: [{ command: 'bash ~/.claude/hooks/session-start.sh' }] }],
    Custom: 'not an array',
    Broken: [null, { matcher: 'x' }]
  };
  assert.deepEqual(install.withoutOwnHooks(hooks, home), {
    Stop: [{ hooks: [{ command: 'other' }] }],
    Custom: 'not an array',
    Broken: [null, { matcher: 'x' }]
  }, 'a registration whose script is gone is dropped');
  write(home, 'hooks/session-start.sh', '# my own guard\n');
  assert.deepEqual(install.withoutOwnHooks(hooks, home).SessionStart, hooks.SessionStart, 'the user own script stays registered');
  assert.deepEqual(install.withoutOwnHooks(undefined), {});
  assert.equal(install.isOwnName('goddesign'), false);
  assert.equal(install.isOwnName('god-x.toml'), true);
});

test('settings are written through symlinks with their permissions kept', () => {
  const base = tempDir('gp-home-');
  const dotfiles = tempDir('gp-dotfiles-');
  write(dotfiles, 'claude-settings.json', JSON.stringify({ env: { TOKEN: 'x' } }));
  fs.chmodSync(path.join(dotfiles, 'claude-settings.json'), 0o600);
  fs.mkdirSync(path.join(base, '.claude'), { recursive: true });
  fs.symlinkSync(path.join(dotfiles, 'claude-settings.json'), path.join(base, '.claude/settings.json'));
  install.install('claude', { srcDir: SRC, base });
  assert.ok(fs.lstatSync(path.join(base, '.claude/settings.json')).isSymbolicLink());
  const target = JSON.parse(read(dotfiles, 'claude-settings.json'));
  assert.equal(target.env.TOKEN, 'x');
  assert.equal(ownCommands(target.hooks).length, 3);
  assert.equal(fs.statSync(path.join(dotfiles, 'claude-settings.json')).mode & 0o777, 0o600);
});

test('a symlink planted at a temp name cannot redirect the settings write', () => {
  const base = tempDir('gp-project-');
  const victim = write(tempDir('gp-victim-'), 'rc', 'echo original\n');
  write(base, '.claude/settings.json', JSON.stringify({ model: 'opus' }));
  // The name 7.0.0 used, then the name a fixed random draw would produce.
  fs.symlinkSync(victim, path.join(base, '.claude/settings.json.godpowers-tmp'));
  install.install('claude', { srcDir: SRC, base, local: true });
  assert.equal(fs.readFileSync(victim, 'utf8'), 'echo original\n');
  assert.equal(fs.lstatSync(path.join(base, '.claude/settings.json')).isSymbolicLink(), false);
  assert.equal(ownCommands(json(base, '.claude/settings.json').hooks).length, 3);
  const crypto = require('crypto');
  const randomBytes = crypto.randomBytes;
  crypto.randomBytes = size => Buffer.alloc(size, 7);
  try {
    const guess = `settings.json.godpowers-${process.pid}-${Buffer.alloc(6, 7).toString('hex')}`;
    fs.symlinkSync(victim, path.join(base, '.claude', guess));
    assert.throws(() => install.install('claude', { srcDir: SRC, base, local: true }), /EEXIST/);
  } finally {
    crypto.randomBytes = randomBytes;
  }
  assert.equal(fs.readFileSync(victim, 'utf8'), 'echo original\n', 'an existing name is refused, not followed');
});

test('a bad hooks shape stops the install before anything changes', () => {
  const base = legacyHome();
  write(base, '.claude/settings.json', JSON.stringify({ hooks: { Stop: { command: 'x' } } }));
  assert.throws(() => install.install('claude', { srcDir: SRC, base }), /"hooks\.Stop" must be an array/);
  assert.ok(fs.existsSync(path.join(base, '.claude/skills/god-mode.md')), 'old files are untouched');
  write(base, '.claude/settings.json', JSON.stringify({ hooks: [] }));
  assert.throws(() => install.install('claude', { srcDir: SRC, base }), /"hooks" must be an object/);
  assert.throws(() => install.uninstall('claude', { base }), /"hooks" must be an object/);
});

test('the plugin hooks.json matches what the installer registers', () => {
  const plugin = JSON.parse(fs.readFileSync(path.join(SRC, 'hooks/hooks.json'), 'utf8')).hooks;
  const groups = install.hookGroups(resolveRuntime('claude', { base: '/h' }));
  assert.deepEqual(Object.keys(plugin).sort(), Object.keys(groups).sort());
  for (const event of Object.keys(groups)) {
    const a = plugin[event][0];
    const b = groups[event][0];
    assert.equal(a.matcher, b.matcher, event);
    assert.equal(a.hooks[0].timeout, b.hooks[0].timeout, event);
    assert.equal(a.hooks[0].if, b.hooks[0].if, event);
    assert.equal(a.hooks[0].command.split(' hook ')[1], b.hooks[0].command.split(' hook ')[1], event);
    assert.match(a.hooks[0].command, /^node "\$\{CLAUDE_PLUGIN_ROOT\}\/bin\/godpowers\.js" hook /);
  }
});

test('doctor reports installs, missing hooks, and leftovers', () => {
  const base = legacyHome();
  write(base, '.claude/skills/god-build.md', 'a 6.x flat file Claude Code cannot load');
  let result = doctorTools.doctor({ base, srcDir: SRC });
  const claude = result.runtimes.find(r => r.key === 'claude');
  assert.equal(claude.version, null);
  assert.ok(claude.skills.missing.includes('god-build'), 'flat files do not count for a directory-layout host');
  assert.ok(claude.legacy.some(l => /no longer shipped/.test(l)));
  const codex = result.runtimes.find(r => r.key === 'codex');
  assert.ok(codex.agents.missing.length === 4, '.md agents do not count for Codex');
  assert.match(doctorTools.formatDoctor(result), /6\.x leftovers/);
  install.install('claude', { srcDir: SRC, base });
  install.install('codex', { srcDir: SRC, base });
  result = doctorTools.doctor({ base, srcDir: SRC, project: tempDir() });
  const after = result.runtimes.find(r => r.key === 'claude');
  assert.deepEqual(after.skills.missing, []);
  assert.deepEqual(after.hooks.events.sort(), ['PreToolUse', 'SessionStart', 'Stop']);
  assert.deepEqual(after.legacy, []);
  const text = doctorTools.formatDoctor(result);
  assert.match(text, /hooks: {2}registered in/);
  assert.match(text, /open \/hooks once/);
  assert.match(text, /not a godpowers project/);
  const settings = json(base, '.claude/settings.json');
  delete settings.hooks.Stop;
  fs.writeFileSync(path.join(base, '.claude/settings.json'), JSON.stringify(settings));
  assert.match(doctorTools.formatDoctor(doctorTools.doctor({ base, srcDir: SRC })), /missing Stop/);
  assert.match(doctorTools.formatDoctor(doctorTools.doctor({ base: tempDir(), srcDir: SRC })), /Not installed for any host/);
});

test('an installed copy names itself by path in agent-facing hints', () => {
  const base = tempDir('gp-home-');
  install.install('claude', { srcDir: SRC, base });
  const installed = path.join(base, '.claude/godpowers');
  const probe = spawnSync(process.execPath, ['-e', `console.log(require(${JSON.stringify(path.join(installed, 'lib/paths.js'))}).cliCommand())`], { encoding: 'utf8' });
  assert.equal(probe.stdout.trim(), `node "${path.join(installed, 'bin/godpowers.js')}"`);
  assert.equal(require('../lib/paths').cliCommand(), 'npx -y godpowers@7', 'the source checkout falls back to npx');
  const plugin = spawnSync(process.execPath, ['-e', 'console.log(require("./lib/paths").cliCommand())'], { cwd: SRC, encoding: 'utf8', env: { ...process.env, CLAUDE_PLUGIN_ROOT: SRC } });
  assert.equal(plugin.stdout.trim(), `node "${path.join(SRC, 'bin/godpowers.js')}"`);
});

test('doctor, budget, and a reinstall run from the installed copy', () => {
  const base = tempDir('gp-home-');
  install.install('claude', { srcDir: SRC, base });
  const installed = path.join(base, '.claude/godpowers');
  const cli = args => spawnSync(process.execPath, [path.join(installed, 'bin/godpowers.js'), ...args], {
    cwd: base,
    encoding: 'utf8',
    env: { ...process.env, HOME: base, USERPROFILE: base }
  });
  const budget = cli(['budget', '--json']);
  assert.equal(budget.status, 0, budget.stderr);
  assert.equal(JSON.parse(budget.stdout).corpus, require('../lib/budget').measure(SRC).corpus, 'the copy measures the shipped sources');
  const doctor = cli(['doctor', '--json']);
  assert.equal(doctor.status, 0, doctor.stderr);
  const claude = JSON.parse(doctor.stdout).runtimes.find(r => r.key === 'claude');
  assert.deepEqual(claude.skills.missing, []);
  assert.deepEqual(claude.agents.missing, []);
  const again = cli(['--claude', '--global']);
  assert.equal(again.status, 0, again.stderr);
  for (const rel of ['bin/godpowers.js', 'skills/god/SKILL.md', 'agents/god-reviewer.md', '.godpowers-runtime']) {
    assert.ok(fs.existsSync(path.join(installed, rel)), `the runtime copy keeps ${rel}`);
  }
  for (const name of SKILLS) assert.ok(fs.existsSync(path.join(base, '.claude/skills', name, 'SKILL.md')), name);
  assert.ok(read(base, '.claude/skills/god/SKILL.md').includes(`node "${path.join(installed, 'bin/godpowers.js')}"`));
  assert.equal(ownCommands(json(base, '.claude/settings.json').hooks).length, 3);
  const codex = cli(['--codex', '--global']);
  assert.equal(codex.status, 0, codex.stderr);
  assert.ok(fs.existsSync(path.join(base, '.codex/godpowers/skills/god/SKILL.md')), 'Codex installs from the Claude Code copy');
  assert.ok(fs.existsSync(path.join(base, '.codex/godpowers/agents/god-reviewer.md')));
});

test('a reinstall replaces the runtime copy whole, whatever path names it', () => {
  const base = tempDir('gp-home-');
  install.install('claude', { srcDir: SRC, base });
  const installed = path.join(base, '.claude/godpowers');
  write(installed, 'lib/stale.js', 'left by an older version');
  write(installed, 'package.json', JSON.stringify({ name: 'godpowers', version: '0.0.1' }));
  install.install('claude', { srcDir: SRC, base });
  assert.equal(fs.existsSync(path.join(installed, 'lib/stale.js')), false, 'files the new version does not ship are gone');
  assert.equal(json(base, '.claude/godpowers/package.json').version, require('../package.json').version);
  // The same folder reached through a symlinked home: the copy must not delete its own source.
  const link = path.join(tempDir('gp-link-'), 'home');
  fs.symlinkSync(base, link);
  install.install('claude', { srcDir: path.join(link, '.claude/godpowers'), base });
  assert.ok(fs.existsSync(path.join(installed, 'lib/install.js')));
  assert.ok(fs.existsSync(path.join(installed, 'skills/god/SKILL.md')));
  // On a case-insensitive filesystem (the macOS default), a differently cased path.
  const upper = path.join(base, '.CLAUDE/GODPOWERS');
  if (fs.existsSync(upper)) {
    install.install('claude', { srcDir: upper, base });
    assert.ok(fs.existsSync(path.join(installed, 'lib/install.js')), 'a differently cased source path keeps the copy');
  }
  assert.deepEqual(fs.readdirSync(path.join(base, '.claude')).filter(name => name.startsWith('.godpowers-new-')), [], 'no staging folder is left behind');
});

test('a runtime folder symlinked to a checkout becomes a real copy and the checkout is untouched', () => {
  const base = tempDir('gp-home-');
  const checkout = sourceTree();
  fs.mkdirSync(path.join(base, '.claude'), { recursive: true });
  fs.symlinkSync(checkout, path.join(base, '.claude/godpowers'));
  install.install('claude', { srcDir: checkout, base });
  const installed = path.join(base, '.claude/godpowers');
  assert.equal(fs.lstatSync(installed).isSymbolicLink(), false);
  assert.ok(fs.existsSync(path.join(installed, '.godpowers-runtime')));
  assert.equal(fs.existsSync(path.join(checkout, '.godpowers-runtime')), false, 'no marker is written into the checkout');
  assert.ok(fs.existsSync(path.join(checkout, 'lib/install.js')));
});

test('a failed swap puts the old runtime copy back and leaves no staging folder', () => {
  const base = tempDir('gp-home-');
  install.install('claude', { srcDir: SRC, base });
  const installed = path.join(base, '.claude/godpowers');
  write(installed, 'lib/marker-of-old-copy.js', 'old');
  const renameSync = fs.renameSync;
  let failed = false;
  fs.renameSync = (from, to) => {
    if (!failed && to === installed && from.includes('.godpowers-new-')) {
      failed = true;
      throw Object.assign(new Error('EACCES: simulated'), { code: 'EACCES' });
    }
    return renameSync(from, to);
  };
  try {
    assert.throws(() => install.install('claude', { srcDir: SRC, base }), /EACCES/);
  } finally {
    fs.renameSync = renameSync;
  }
  assert.ok(fs.existsSync(path.join(installed, 'lib/marker-of-old-copy.js')), 'the old copy is back in place');
  assert.ok(fs.existsSync(path.join(installed, 'bin/godpowers.js')));
  assert.deepEqual(fs.readdirSync(path.join(base, '.claude')).filter(name => name.startsWith('.godpowers-new-')), []);
});

test('staging folders left by a killed install are swept by the next install and by uninstall', () => {
  const base = tempDir('gp-home-');
  write(base, '.claude/.godpowers-new-killed/lib/x.js', 'left by a killed install');
  install.install('claude', { srcDir: SRC, base });
  assert.equal(fs.existsSync(path.join(base, '.claude/.godpowers-new-killed')), false);
  write(base, '.claude/.godpowers-new-killed/lib/x.js', 'left by a killed install');
  install.uninstall('claude', { base });
  assert.equal(fs.existsSync(path.join(base, '.claude/.godpowers-new-killed')), false);
});

test('the runtime copy folder follows the umask, and settings keep their mode under any umask', () => {
  const previous = process.umask(0o022);
  try {
    const open = tempDir('gp-home-');
    install.install('claude', { srcDir: SRC, base: open });
    assert.equal(fs.statSync(path.join(open, '.claude/godpowers')).mode & 0o777, 0o755);
    process.umask(0o077);
    const strict = tempDir('gp-home-');
    write(strict, '.claude/settings.json', JSON.stringify({ model: 'opus' }));
    fs.chmodSync(path.join(strict, '.claude/settings.json'), 0o644);
    install.install('claude', { srcDir: SRC, base: strict });
    assert.equal(fs.statSync(path.join(strict, '.claude/godpowers')).mode & 0o777, 0o700, 'a strict umask is not widened');
    assert.equal(fs.statSync(path.join(strict, '.claude/settings.json')).mode & 0o777, 0o644, 'the settings mode survives the umask');
  } finally {
    process.umask(previous);
  }
});

test('a failed settings write removes its temp file', () => {
  const base = tempDir('gp-home-');
  write(base, '.claude/settings.json', JSON.stringify({ model: 'opus' }));
  const renameSync = fs.renameSync;
  fs.renameSync = (from, to) => {
    if (/\.godpowers-\d+-[0-9a-f]{12}$/.test(from)) throw Object.assign(new Error('EIO: simulated'), { code: 'EIO' });
    return renameSync(from, to);
  };
  try {
    assert.throws(() => install.install('claude', { srcDir: SRC, base }), /EIO/);
  } finally {
    fs.renameSync = renameSync;
  }
  assert.deepEqual(fs.readdirSync(path.join(base, '.claude')).filter(name => name.startsWith('settings.json.')), []);
  assert.equal(json(base, '.claude/settings.json').model, 'opus');
});

test('a source that cannot be copied fails with the installed copy intact', () => {
  const base = tempDir('gp-home-');
  install.install('claude', { srcDir: SRC, base });
  const noSkills = tempDir('gp-src-');
  assert.throws(() => install.install('claude', { srcDir: noSkills, base }), /ENOENT/);
  for (const name of SKILLS) assert.ok(fs.existsSync(path.join(base, '.claude/skills', name, 'SKILL.md')), `${name} survives a source without skills`);
  const empty = tempDir('gp-src-');
  fs.mkdirSync(path.join(empty, 'skills'));
  fs.mkdirSync(path.join(empty, 'agents'));
  assert.throws(() => install.install('claude', { srcDir: empty, base }), /holds no skills or agents/);
  assert.equal(fs.readdirSync(path.join(base, '.claude/skills')).filter(install.isOwnName).length, SKILLS.length, 'empty source folders remove nothing');
  const noPackage = sourceTree();
  fs.rmSync(path.join(noPackage, 'package.json'));
  assert.throws(() => install.install('claude', { srcDir: noPackage, base }), /ENOENT/);
  assert.equal(json(base, '.claude/godpowers/package.json').name, 'godpowers', 'the old runtime copy is still in place');
  assert.ok(fs.existsSync(path.join(base, '.claude/godpowers/lib/install.js')));
  assert.deepEqual(fs.readdirSync(path.join(base, '.claude')).filter(name => name.startsWith('.godpowers-new-')), []);
});
