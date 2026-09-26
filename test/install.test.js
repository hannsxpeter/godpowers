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
