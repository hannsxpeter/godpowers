/**
 * Install and uninstall Godpowers for a host.
 *
 * An install:
 *   1. removes every Godpowers 6 leftover (old skills, agents, data dirs,
 *      version files, and hook scripts),
 *   2. copies the skills and agents,
 *   3. for Claude Code and Codex, copies the CLI runtime and registers the
 *      three hooks (settings.json for Claude Code, hooks.json for Codex).
 *
 * Only entries Godpowers owns are touched: skills and agents named `god`,
 * `god-*`, or `godpowers`, and hook commands that run `godpowers.js hook`.
 */

const fs = require('fs');
const path = require('path');

const { resolveRuntime } = require('./runtimes');
const frontmatter = require('./frontmatter');

const LEGACY_DATA_DIRS = [
  'godpowers-templates',
  'godpowers-references',
  'godpowers-workflows',
  'godpowers-schema',
  'godpowers-routing',
  'godpowers-runtime'
];
const LEGACY_FILES = ['GODPOWERS_VERSION', 'GODPOWERS_PROFILE'];
const LEGACY_HOOKS = [
  ['session-start.sh', 'Godpowers SessionStart Hook'],
  ['pre-tool-use.sh', 'Godpowers PreToolUse advisory hook']
];
const HOOK_EVENTS = ['SessionStart', 'Stop', 'PreToolUse'];
const OWN_HOOK_RE = /godpowers\.js"?\s+hook\s+(session-start|stop|pre-tool-use)\b/;

function isOwnName(name) {
  const base = name.replace(/\.(md|toml)$/, '');
  return base === 'god' || base === 'godpowers' || base.startsWith('god-');
}

function listSkills(srcDir) {
  const dir = path.join(srcDir, 'skills');
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && fs.existsSync(path.join(dir, entry.name, 'SKILL.md')))
    .map(entry => entry.name)
    .sort();
}

function listAgents(srcDir) {
  return fs.readdirSync(path.join(srcDir, 'agents')).filter(file => file.endsWith('.md')).sort();
}

/** Remove Godpowers-owned entries from a skills or agents directory. */
function pruneOwned(dir) {
  let removed = 0;
  if (!fs.existsSync(dir)) return removed;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!isOwnName(entry.name)) continue;
    fs.rmSync(path.join(dir, entry.name), { recursive: true, force: true });
    removed++;
  }
  return removed;
}

function removeLegacy(runtime) {
  const removed = [];
  for (const name of [...LEGACY_DATA_DIRS, ...LEGACY_FILES]) {
    const target = path.join(runtime.homeDir, name);
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
      removed.push(target);
    }
  }
  for (const dir of runtime.legacySkillDirs) {
    if (pruneOwned(dir)) removed.push(`${dir}/god*`);
  }
  if (runtime.hooks === 'claude') {
    for (const [file, marker] of LEGACY_HOOKS) {
      const target = path.join(runtime.homeDir, 'hooks', file);
      if (fs.existsSync(target) && fs.readFileSync(target, 'utf8').includes(marker)) {
        fs.rmSync(target);
        removed.push(target);
      }
    }
  }
  return removed;
}

// A JSON string literal is also a valid TOML basic string.
function tomlString(value) {
  return JSON.stringify(String(value || ''));
}

function codexAgentToml(source) {
  const doc = frontmatter.parse(source);
  return [
    `name = ${tomlString(doc.data.name)}`,
    `description = ${tomlString(doc.data.description)}`,
    `developer_instructions = ${tomlString(doc.body.trim())}`,
    ''
  ].join('\n');
}

/**
 * The command installed instructions use to run the CLI. Hosts that get the
 * runtime copy point at it, so agents run the same version as the hooks and
 * need no network (Codex's sandbox blocks it by default). Other hosts keep
 * `npx -y godpowers@7`.
 */
function installedCli(runtime, { local = false } = {}) {
  if (!runtime.hooks) return null;
  const script = local
    ? `${runtime.home}/godpowers/bin/godpowers.js`
    : path.join(runtime.runtimeDir, 'bin', 'godpowers.js');
  return `node "${script}"`;
}

function withCli(text, cli) {
  return cli ? text.split('npx -y godpowers@7').join(cli) : text;
}

function copySkills(srcDir, runtime, cli) {
  fs.mkdirSync(runtime.skillsDir, { recursive: true });
  pruneOwned(runtime.skillsDir);
  const names = listSkills(srcDir);
  for (const name of names) {
    const text = withCli(fs.readFileSync(path.join(srcDir, 'skills', name, 'SKILL.md'), 'utf8'), cli);
    if (runtime.skillLayout === 'dir') {
      fs.mkdirSync(path.join(runtime.skillsDir, name), { recursive: true });
      fs.writeFileSync(path.join(runtime.skillsDir, name, 'SKILL.md'), text);
    } else {
      fs.writeFileSync(path.join(runtime.skillsDir, `${name}.md`), text);
    }
  }
  return names;
}

function copyAgents(srcDir, runtime, cli) {
  fs.mkdirSync(runtime.agentsDir, { recursive: true });
  pruneOwned(runtime.agentsDir);
  const files = listAgents(srcDir);
  for (const file of files) {
    const text = withCli(fs.readFileSync(path.join(srcDir, 'agents', file), 'utf8'), cli);
    if (runtime.agentFormat === 'toml') {
      fs.writeFileSync(path.join(runtime.agentsDir, file.replace(/\.md$/, '.toml')), codexAgentToml(text));
    } else {
      fs.writeFileSync(path.join(runtime.agentsDir, file), text);
    }
  }
  return files.map(file => file.replace(/\.md$/, ''));
}

// Plain files only (bin/ and lib/ hold no symlinks); fs.cpSync is still
// experimental on Node 18.
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}

function copyRuntime(srcDir, runtime) {
  fs.rmSync(runtime.runtimeDir, { recursive: true, force: true });
  for (const dir of ['bin', 'lib']) copyDir(path.join(srcDir, dir), path.join(runtime.runtimeDir, dir));
  fs.copyFileSync(path.join(srcDir, 'package.json'), path.join(runtime.runtimeDir, 'package.json'));
  fs.chmodSync(path.join(runtime.runtimeDir, 'bin', 'godpowers.js'), 0o755);
  // Tells the CLI it is an installed copy, so it names itself by path (lib/paths.js).
  fs.writeFileSync(path.join(runtime.runtimeDir, '.godpowers-runtime'), `${runtime.key}\n`);
}

/** The shell command a host runs for one hook event. */
function hookCommand(runtime, event, { local = false } = {}) {
  // Claude Code substitutes ${CLAUDE_PROJECT_DIR} itself before any shell
  // runs, so a local install's settings stay portable across machines. Codex
  // has no such placeholder, so a local Codex install uses the absolute path.
  const script = local && runtime.hooks === 'claude'
    ? `\${CLAUDE_PROJECT_DIR}/${runtime.home}/godpowers/bin/godpowers.js`
    : path.join(runtime.runtimeDir, 'bin', 'godpowers.js');
  return `node "${script}" hook ${event}`;
}

/** Hook groups keyed by event, in the shared Claude Code and Codex schema. */
function hookGroups(runtime, opts = {}) {
  const handler = (event, timeout, extra = {}) => ({ type: 'command', ...extra, command: hookCommand(runtime, event, opts), timeout });
  return {
    SessionStart: [{ hooks: [handler('session-start', 20)] }],
    Stop: [{ hooks: [handler('stop', 120)] }],
    PreToolUse: [{
      matcher: runtime.hooks === 'codex' ? '^Bash$' : 'Bash',
      hooks: [handler('pre-tool-use', 60, runtime.hooks === 'claude' ? { if: 'Bash(git *)' } : {})]
    }]
  };
}

function isOwnHook(hook) {
  return Boolean(hook && typeof hook.command === 'string' && OWN_HOOK_RE.test(hook.command));
}

/**
 * A registration of a 6.x hook script that no longer exists. 6.x never wrote
 * settings.json, so such an entry was added by hand; it is only dropped once
 * the script it runs is gone, never while the user's own script is present.
 */
function isDanglingLegacyHook(hook, homeDir) {
  if (!hook || typeof hook.command !== 'string' || !homeDir) return false;
  return LEGACY_HOOKS.some(([file]) => hook.command.includes(`hooks/${file}`) && !fs.existsSync(path.join(homeDir, 'hooks', file)));
}

/** Return a copy of a hooks object with every Godpowers-owned handler removed. */
function withoutOwnHooks(hooks, homeDir) {
  const result = {};
  for (const [event, groups] of Object.entries(hooks || {})) {
    if (!Array.isArray(groups)) {
      result[event] = groups;
      continue;
    }
    const drop = h => isOwnHook(h) || isDanglingLegacyHook(h, homeDir);
    const kept = groups
      .map(group => (group && Array.isArray(group.hooks) ? { ...group, hooks: group.hooks.filter(h => !drop(h)) } : group))
      .filter(group => !(group && Array.isArray(group.hooks) && group.hooks.length === 0));
    if (kept.length) result[event] = kept;
  }
  return result;
}

function hooksFile(runtime) {
  if (runtime.hooks === 'claude') return path.join(runtime.homeDir, 'settings.json');
  if (runtime.hooks === 'codex') return path.join(runtime.homeDir, 'hooks.json');
  return null;
}

const isPlainObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** Read a settings or hooks file, refusing shapes Godpowers would have to overwrite. */
function readHooksFile(file) {
  if (!fs.existsSync(file)) return {};
  const text = fs.readFileSync(file, 'utf8');
  if (!text.trim()) return {};
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error(`${file} is not valid JSON (${error.message}); fix it before installing hooks`);
  }
  if (!isPlainObject(data)) throw new Error(`${file} must contain a JSON object`);
  if (data.hooks !== undefined && !isPlainObject(data.hooks)) throw new Error(`${file}: "hooks" must be an object`);
  for (const event of HOOK_EVENTS) {
    const groups = data.hooks && data.hooks[event];
    if (groups !== undefined && !Array.isArray(groups)) throw new Error(`${file}: "hooks.${event}" must be an array`);
  }
  return data;
}

/** Write through symlinks and keep the file's permissions. */
function writeJson(file, data) {
  const target = fs.existsSync(file) ? fs.realpathSync(file) : file;
  const mode = fs.existsSync(target) ? fs.statSync(target).mode & 0o777 : 0o600;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const tmp = `${target}.godpowers-tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, { mode });
  fs.chmodSync(tmp, mode);
  fs.renameSync(tmp, target);
}

function registerHooks(runtime, opts = {}) {
  const file = hooksFile(runtime);
  if (!file) return null;
  const data = readHooksFile(file);
  const hooks = withoutOwnHooks(data.hooks, runtime.homeDir);
  const groups = hookGroups(runtime, opts);
  for (const event of HOOK_EVENTS) hooks[event] = [...(hooks[event] || []), ...groups[event]];
  writeJson(file, { ...data, hooks });
  return file;
}

function unregisterHooks(runtime) {
  const file = hooksFile(runtime);
  if (!file || !fs.existsSync(file)) return null;
  const data = readHooksFile(file);
  const hooks = withoutOwnHooks(data.hooks, runtime.homeDir);
  const next = { ...data };
  if (Object.keys(hooks).length) next.hooks = hooks;
  else delete next.hooks;
  if (JSON.stringify(next) === JSON.stringify(data)) return null;
  writeJson(file, next);
  return file;
}

/** Install for one host. Returns a summary for printing. */
function install(key, { srcDir, base, local = false } = {}) {
  const runtime = resolveRuntime(key, { base });
  if (!runtime) throw new Error(`unknown runtime: ${key}`);
  // Validate the hooks file before changing anything, so a bad file stops
  // the install with nothing half done.
  if (runtime.hooks) readHooksFile(hooksFile(runtime));
  const cli = installedCli(runtime, { local });
  const legacy = removeLegacy(runtime);
  const skills = copySkills(srcDir, runtime, cli);
  const agents = copyAgents(srcDir, runtime, cli);
  let hooks = null;
  if (runtime.hooks) {
    copyRuntime(srcDir, runtime);
    hooks = registerHooks(runtime, { local });
  }
  return { runtime, skills, agents, hooks, legacy };
}

function uninstall(key, { base } = {}) {
  const runtime = resolveRuntime(key, { base });
  if (!runtime) throw new Error(`unknown runtime: ${key}`);
  if (runtime.hooks) readHooksFile(hooksFile(runtime));
  const removed = removeLegacy(runtime);
  if (pruneOwned(runtime.skillsDir)) removed.push(`${runtime.skillsDir}/god*`);
  if (pruneOwned(runtime.agentsDir)) removed.push(`${runtime.agentsDir}/god*`);
  if (fs.existsSync(runtime.runtimeDir)) {
    fs.rmSync(runtime.runtimeDir, { recursive: true, force: true });
    removed.push(runtime.runtimeDir);
  }
  const hooks = unregisterHooks(runtime);
  if (hooks) removed.push(`hooks in ${hooks}`);
  return { runtime, removed };
}

module.exports = {
  OWN_HOOK_RE,
  isOwnName,
  listSkills,
  listAgents,
  pruneOwned,
  removeLegacy,
  codexAgentToml,
  installedCli,
  withCli,
  hookCommand,
  hookGroups,
  isOwnHook,
  isDanglingLegacyHook,
  withoutOwnHooks,
  hooksFile,
  readHooksFile,
  registerHooks,
  unregisterHooks,
  install,
  uninstall
};
