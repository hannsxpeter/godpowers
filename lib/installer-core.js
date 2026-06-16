const fs = require('fs');
const path = require('path');

const { ensureDir, copyRecursive, copyRuntimeBundle } = require('./installer-files');
const { resolveRuntime } = require('./installer-runtimes');
const { selectedSkillNames, normalizeProfiles } = require('./install-profiles');
const identity = require('./package-identity');
const frontmatter = require('./frontmatter');
const { log, success, error } = require('./cli-log');

const VERSION = identity.PACKAGE_VERSION;

/**
 * @typedef {Object} InstallOptions
 * @property {boolean} [local] Install relative to the current working directory.
 * @property {boolean} [global] Install to the host runtime config directory.
 */

/**
 * @typedef {Object} InstallSurface
 * @property {number} skills Number of slash-command skill files.
 * @property {number} agents Number of specialist agent files.
 */

function installSkillFile(srcFile, skillsDest, runtimeKey, targetName = null) {
  const baseName = targetName || path.basename(srcFile, '.md');
  if (runtimeKey === 'codex') {
    const skillDir = path.join(skillsDest, baseName);
    if (fs.existsSync(skillDir)) {
      fs.rmSync(skillDir, { recursive: true, force: true });
    }
    ensureDir(skillDir);
    fs.copyFileSync(srcFile, path.join(skillDir, 'SKILL.md'));
    return;
  }
  fs.copyFileSync(srcFile, path.join(skillsDest, `${baseName}.md`));
}

function tomlString(value) {
  return JSON.stringify(value || '');
}

function tomlLiteral(value) {
  return `'''\n${(value || '').replace(/'''/g, "'''\\'''")}\n'''`;
}

function writeCodexAgentToml(srcFile, agentsDest) {
  const content = fs.readFileSync(srcFile, 'utf8');
  const metadata = frontmatter.parse(content, { strict: true, source: srcFile });
  const name = metadata.name || path.basename(srcFile, '.md');
  const description = metadata.description || `Godpowers specialist agent: ${name}.`;
  const instructions = frontmatter.strip(content);
  const toml = [
    `name = ${tomlString(name)}`,
    `description = ${tomlString(description)}`,
    'sandbox_mode = "workspace-write"',
    `developer_instructions = ${tomlLiteral(instructions)}`,
    ''
  ].join('\n');

  fs.writeFileSync(path.join(agentsDest, `${name}.toml`), toml);
}

function installAgentFile(srcFile, agentsDest, runtime) {
  fs.copyFileSync(srcFile, path.join(agentsDest, path.basename(srcFile)));
  if (runtime.agentMetadata === 'toml') {
    writeCodexAgentToml(srcFile, agentsDest);
  }
}

function removeSkillEntry(skillsDir, entry) {
  const entryPath = path.join(skillsDir, entry.name);
  if (entry.isDirectory()) {
    const skillFile = path.join(entryPath, 'SKILL.md');
    if (entry.name.startsWith('god-') || entry.name === 'god' || entry.name === 'godpowers') {
      if (fs.existsSync(skillFile)) {
        fs.rmSync(entryPath, { recursive: true, force: true });
        return true;
      }
    }
    return false;
  }
  if (entry.name.startsWith('god-') || entry.name === 'god.md' || entry.name === 'godpowers.md') {
    fs.unlinkSync(entryPath);
    return true;
  }
  return false;
}

function pruneGodpowersSkills(skillsDir) {
  let removed = 0;
  if (!fs.existsSync(skillsDir)) return removed;
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (removeSkillEntry(skillsDir, entry)) removed++;
  }
  return removed;
}

function installForRuntime(runtimeKey, srcDir, opts = {}) {
  const runtime = resolveRuntime(runtimeKey, opts);
  if (!runtime) {
    error(`Unknown runtime: ${runtimeKey}`);
    return false;
  }

  log(`\n  Installing for \x1b[36m${runtime.name}\x1b[0m to \x1b[36m${runtime.configDir}\x1b[0m\n`);
  ensureDir(runtime.configDir);

  installSkills(srcDir, runtimeKey, runtime, opts);
  installAgents(srcDir, runtime);
  installMasterSkill(srcDir, runtimeKey, runtime);
  installDataDirs(srcDir, runtime);
  installHooks(srcDir, runtimeKey, runtime);

  fs.writeFileSync(path.join(runtime.configDir, 'GODPOWERS_VERSION'), VERSION);
  success(`Wrote GODPOWERS_VERSION (${VERSION})`);
  fs.writeFileSync(path.join(runtime.configDir, 'GODPOWERS_PROFILE'), normalizeProfiles(opts.profile).join(','));
  success(`Wrote GODPOWERS_PROFILE (${normalizeProfiles(opts.profile).join(',')})`);
  return true;
}

function availableSkillFiles(srcDir) {
  const skillsSrc = path.join(srcDir, 'skills');
  if (!fs.existsSync(skillsSrc)) return [];
  return fs.readdirSync(skillsSrc)
    .filter(file => file.endsWith('.md'))
    .sort();
}

function installSkills(srcDir, runtimeKey, runtime, opts = {}) {
  const skillsSrc = path.join(srcDir, 'skills');
  const skillsDest = path.join(runtime.configDir, runtime.skillsDir);
  if (!fs.existsSync(skillsSrc)) return;

  ensureDir(skillsDest);
  pruneGodpowersSkills(skillsDest);
  const files = availableSkillFiles(srcDir);
  const names = files.map(file => path.basename(file, '.md'));
  const selected = selectedSkillNames(opts.profile, names);
  let count = 0;
  for (const file of files) {
    const name = path.basename(file, '.md');
    if (selected.has(name)) {
      installSkillFile(path.join(skillsSrc, file), skillsDest, runtimeKey);
      count++;
    }
  }
  const shape = runtimeKey === 'codex' ? 'Codex skill directories' : 'skills/';
  success(`Installed ${count} slash commands to ${shape}`);
}

function installAgents(srcDir, runtime) {
  const agentsSrc = path.join(srcDir, 'agents');
  const agentsDest = path.join(runtime.configDir, 'agents');
  if (!fs.existsSync(agentsSrc)) return;

  ensureDir(agentsDest);
  let count = 0;
  for (const file of fs.readdirSync(agentsSrc)) {
    if (/^god-.*\.md$/.test(file)) {
      installAgentFile(path.join(agentsSrc, file), agentsDest, runtime);
      count++;
    }
  }
  const shape = runtime.agentMetadata === 'toml' ? 'agents/ with Codex metadata' : 'agents/';
  success(`Installed ${count} specialist agents to ${shape}`);
}

function installMasterSkill(srcDir, runtimeKey, runtime) {
  const masterSkill = path.join(srcDir, 'SKILL.md');
  if (!fs.existsSync(masterSkill)) return;
  const skillsDest = path.join(runtime.configDir, runtime.skillsDir);
  installSkillFile(masterSkill, skillsDest, runtimeKey, 'godpowers');
  success('Installed master SKILL.md as godpowers');
}

function installDataDirs(srcDir, runtime) {
  const dataDirs = [
    ['templates', 'godpowers-templates', 'Installed templates/'],
    ['references', 'godpowers-references', 'Installed references/'],
    ['workflows', 'godpowers-workflows', 'Installed workflows/'],
    ['schema', 'godpowers-schema', 'Installed schema/'],
    ['routing', 'godpowers-routing', 'Installed routing/']
  ];

  for (const [sourceName, destName, message] of dataDirs) {
    const src = path.join(srcDir, sourceName);
    if (fs.existsSync(src)) {
      const dest = path.join(runtime.configDir, destName);
      // Clean replace. These destinations are entirely Godpowers-owned (the
      // uninstaller removes each one wholesale), so clearing first guarantees
      // a version upgrade never leaves behind files that no longer ship.
      fs.rmSync(dest, { recursive: true, force: true });
      copyRecursive(src, dest);
      success(message);
    }
  }

  const bundleDest = path.join(runtime.configDir, 'godpowers-runtime');
  fs.rmSync(bundleDest, { recursive: true, force: true });
  copyRuntimeBundle(srcDir, bundleDest);
  success('Installed runtime bundle/');
}

function installHooks(srcDir, runtimeKey, runtime) {
  if (runtimeKey !== 'claude') return;
  const hooksSrc = path.join(srcDir, 'hooks');
  const hooksDest = path.join(runtime.configDir, 'hooks');
  if (!fs.existsSync(hooksSrc)) return;

  ensureDir(hooksDest);
  for (const file of fs.readdirSync(hooksSrc)) {
    const src = path.join(hooksSrc, file);
    const dest = path.join(hooksDest, file);
    fs.copyFileSync(src, dest);
    try {
      fs.chmodSync(dest, 0o755);
    } catch (_) {
      // Preserve install success when chmod is unavailable on the host.
    }
  }
  success('Installed hooks/');
}

function uninstallForRuntime(runtimeKey, opts = {}) {
  const runtime = resolveRuntime(runtimeKey, opts);
  if (!runtime) {
    error(`Unknown runtime: ${runtimeKey}`);
    return false;
  }

  log(`\n  Uninstalling from \x1b[36m${runtime.name}\x1b[0m at \x1b[36m${runtime.configDir}\x1b[0m\n`);
  uninstallSkills(runtime);
  uninstallAgents(runtime);
  uninstallDataDirs(runtime);
  uninstallHooks(runtimeKey, runtime);

  const versionFile = path.join(runtime.configDir, 'GODPOWERS_VERSION');
  if (fs.existsSync(versionFile)) {
    fs.unlinkSync(versionFile);
  }
  return true;
}

function uninstallSkills(runtime) {
  const skillsDir = path.join(runtime.configDir, runtime.skillsDir);
  let removed = 0;
  if (!fs.existsSync(skillsDir)) return;
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (removeSkillEntry(skillsDir, entry)) {
      removed++;
    }
  }
  success(`Removed ${removed} god-* skill(s)`);
}

function uninstallAgents(runtime) {
  const agentsDir = path.join(runtime.configDir, 'agents');
  let removed = 0;
  if (!fs.existsSync(agentsDir)) return;
  for (const file of fs.readdirSync(agentsDir)) {
    if (file.startsWith('god-')) {
      fs.unlinkSync(path.join(agentsDir, file));
      removed++;
    }
  }
  success(`Removed ${removed} god-* agent(s)`);
}

function uninstallDataDirs(runtime) {
  for (const dir of [
    'godpowers-templates',
    'godpowers-references',
    'godpowers-workflows',
    'godpowers-schema',
    'godpowers-routing',
    'godpowers-runtime'
  ]) {
    const full = path.join(runtime.configDir, dir);
    if (fs.existsSync(full)) {
      fs.rmSync(full, { recursive: true, force: true });
      success(`Removed ${dir}/`);
    }
  }
}

function uninstallHooks(runtimeKey, runtime) {
  if (runtimeKey !== 'claude') return;
  const hooksDir = path.join(runtime.configDir, 'hooks');
  for (const hook of ['session-start.sh', 'pre-tool-use.sh']) {
    const hookPath = path.join(hooksDir, hook);
    if (fs.existsSync(hookPath)) {
      fs.unlinkSync(hookPath);
      success(`Removed hooks/${hook}`);
    }
  }
}

function countInstalledSurface(srcDir) {
  return countProfileSurface(srcDir, { profile: 'full' });
}

function countProfileSurface(srcDir, opts = {}) {
  const files = availableSkillFiles(srcDir);
  const names = files.map(file => path.basename(file, '.md'));
  const selected = selectedSkillNames(opts.profile, names);
  return {
    skills: selected.size,
    agents: fs.readdirSync(path.join(srcDir, 'agents')).filter(f => /^god-.*\.md$/.test(f)).length
  };
}

module.exports = {
  installForRuntime,
  uninstallForRuntime,
  countInstalledSurface: countProfileSurface,
  installSkillFile,
  parseAgentFrontmatter: frontmatter.parse,
  stripFrontmatter: frontmatter.strip,
  writeCodexAgentToml,
  removeSkillEntry,
  pruneGodpowersSkills,
  installSkills
};
