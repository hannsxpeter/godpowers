/**
 * `godpowers doctor`: what is installed where, and what is left over from 6.x.
 * Read-only.
 */

const fs = require('fs');
const path = require('path');

const { RUNTIMES, resolveRuntime } = require('./runtimes');
const install = require('./install');
const { layout } = require('./paths');
const lint = require('./lint');

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return null;
  }
}

function ownEntries(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(install.isOwnName);
}

function registeredEvents(file) {
  const data = readJson(file);
  if (!data || !data.hooks) return [];
  return Object.entries(data.hooks)
    .filter(([, groups]) => Array.isArray(groups) && groups.some(g => g && Array.isArray(g.hooks) && g.hooks.some(install.isOwnHook)))
    .map(([event]) => event);
}

function inspect(key, { base, srcDir }) {
  const runtime = resolveRuntime(key, { base });
  const expectedSkills = install.listSkills(srcDir);
  const expectedAgents = install.listAgents(srcDir).map(file => file.replace(/\.md$/, ''));
  const skillEntries = ownEntries(runtime.skillsDir);
  // A skill only counts in the layout its host loads: <name>/SKILL.md or <name>.md.
  const skills = runtime.skillLayout === 'dir'
    ? skillEntries.filter(name => fs.existsSync(path.join(runtime.skillsDir, name, 'SKILL.md')))
    : skillEntries.filter(name => name.endsWith('.md')).map(name => name.replace(/\.md$/, ''));
  const agentExt = runtime.agentFormat === 'toml' ? '.toml' : '.md';
  const agentEntries = ownEntries(runtime.agentsDir);
  const agents = agentEntries.filter(name => name.endsWith(agentExt)).map(name => name.slice(0, -agentExt.length));
  const legacy = [];
  for (const name of ['godpowers-templates', 'godpowers-references', 'godpowers-workflows', 'godpowers-schema', 'godpowers-routing', 'godpowers-runtime', 'GODPOWERS_VERSION', 'GODPOWERS_PROFILE']) {
    if (fs.existsSync(path.join(runtime.homeDir, name))) legacy.push(name);
  }
  for (const dir of runtime.legacySkillDirs) {
    const count = ownEntries(dir).length;
    if (count) legacy.push(`${count} old skill(s) in ${dir}`);
  }
  const stale = [
    ...skillEntries.filter(name => !skills.includes(name.replace(/\.md$/, '')) || !expectedSkills.includes(name.replace(/\.md$/, ''))),
    ...agentEntries.filter(name => !name.endsWith(agentExt) || !expectedAgents.includes(name.slice(0, -agentExt.length)))
  ];
  if (stale.length) legacy.push(`${stale.length} skill(s) or agent(s) no longer shipped`);
  const pkg = readJson(path.join(runtime.runtimeDir, 'package.json'));
  const hooksFile = install.hooksFile(runtime);
  return {
    key,
    name: runtime.name,
    present: fs.existsSync(runtime.homeDir),
    version: pkg ? pkg.version : null,
    skills: { expected: expectedSkills.length, missing: expectedSkills.filter(n => !skills.includes(n)) },
    agents: { expected: expectedAgents.length, missing: expectedAgents.filter(n => !agents.includes(n)) },
    hooks: hooksFile ? { file: hooksFile, events: registeredEvents(hooksFile) } : null,
    legacy
  };
}

function doctor({ base, srcDir, project }) {
  const runtimes = Object.keys(RUNTIMES).map(key => inspect(key, { base, srcDir }))
    .filter(r => r.present && (r.skills.missing.length < r.skills.expected || r.legacy.length || r.version));
  const result = { version: (readJson(path.join(srcDir, 'package.json')) || {}).version, runtimes };
  if (project) {
    const lintResult = lint.lintProject(project);
    result.project = { root: project, layout: layout(project), errors: lintResult.errors, warnings: lintResult.warnings };
  }
  return result;
}

function formatDoctor(result) {
  const lines = [`godpowers ${result.version}`];
  if (!result.runtimes.length) lines.push('', 'Not installed for any host. Run: npx godpowers --claude --global (or --codex)');
  for (const r of result.runtimes) {
    lines.push('', `${r.name}${r.version ? ` (installed ${r.version})` : ''}`);
    lines.push(`  skills: ${r.skills.expected - r.skills.missing.length}/${r.skills.expected}${r.skills.missing.length ? ` missing ${r.skills.missing.join(', ')}` : ''}`);
    lines.push(`  agents: ${r.agents.expected - r.agents.missing.length}/${r.agents.expected}${r.agents.missing.length ? ` missing ${r.agents.missing.join(', ')}` : ''}`);
    if (r.hooks) {
      const missing = ['SessionStart', 'Stop', 'PreToolUse'].filter(e => !r.hooks.events.includes(e));
      lines.push(`  hooks:  ${missing.length ? `missing ${missing.join(', ')} in ${r.hooks.file}` : `registered in ${r.hooks.file}`}`);
      if (r.key === 'codex' && !missing.length) lines.push('          Codex runs new hooks only after you trust them: open /hooks once.');
    }
    if (r.version && r.version !== result.version) lines.push(`  note:   installed ${r.version}, this CLI is ${result.version}; reinstall to update`);
    if (r.legacy.length) lines.push(`  6.x leftovers: ${r.legacy.join('; ')}. Reinstall to remove them.`);
  }
  if (result.project) {
    const p = result.project;
    const label = { v7: 'godpowers 7', v6: 'godpowers 6 layout (run `godpowers migrate`)', none: 'not a godpowers project' }[p.layout];
    lines.push('', `Project ${p.root}: ${label}${p.layout === 'v7' ? `, lint ${p.errors} error(s), ${p.warnings} warning(s)` : ''}`);
  }
  return lines.join('\n');
}

module.exports = { inspect, doctor, formatDoctor };
