/**
 * Supported hosts and where each keeps skills, agents, and hooks.
 *
 * Paths are relative to a base directory: the home directory for a global
 * install, or the current directory for a local one. Claude Code and Codex get
 * skill directories (<name>/SKILL.md) and hooks; the other hosts get flat
 * markdown files, as before, and no hooks.
 */

const os = require('os');
const path = require('path');

function flatHost(name, dir, skillsSub = 'skills') {
  return { name, home: dir, skills: `${dir}/${skillsSub}`, skillLayout: 'flat', agents: `${dir}/agents`, agentFormat: 'md', hooks: null };
}

const RUNTIMES = {
  claude: {
    name: 'Claude Code',
    home: '.claude',
    skills: '.claude/skills',
    skillLayout: 'dir',
    agents: '.claude/agents',
    agentFormat: 'md',
    hooks: 'claude'
  },
  codex: {
    name: 'Codex',
    home: '.codex',
    skills: '.agents/skills',
    legacySkills: ['.codex/skills'],
    skillLayout: 'dir',
    agents: '.codex/agents',
    agentFormat: 'toml',
    hooks: 'codex'
  },
  cursor: flatHost('Cursor', '.cursor', 'rules'),
  windsurf: flatHost('Windsurf', '.windsurf', 'rules'),
  opencode: flatHost('OpenCode', '.opencode'),
  gemini: flatHost('Gemini CLI', '.gemini'),
  copilot: flatHost('GitHub Copilot', '.copilot'),
  augment: flatHost('Augment', '.augment'),
  trae: flatHost('Trae', '.trae'),
  cline: flatHost('Cline', '.cline'),
  kilo: flatHost('Kilo', '.kilo'),
  antigravity: flatHost('Antigravity', '.antigravity'),
  qwen: flatHost('Qwen Code', '.qwen'),
  codebuddy: flatHost('CodeBuddy', '.codebuddy'),
  pi: flatHost('Pi', '.pi')
};

/** Absolute locations for a runtime. `base` defaults to the home directory. */
function resolveRuntime(key, { base = os.homedir() } = {}) {
  const runtime = RUNTIMES[key];
  if (!runtime) return null;
  const abs = rel => path.join(base, rel);
  return {
    key,
    ...runtime,
    base,
    homeDir: abs(runtime.home),
    skillsDir: abs(runtime.skills),
    legacySkillDirs: [abs(`${runtime.home}/skills`), ...(runtime.legacySkills || []).map(abs)]
      .filter((dir, index, all) => dir !== abs(runtime.skills) && all.indexOf(dir) === index),
    agentsDir: abs(runtime.agents),
    runtimeDir: abs(`${runtime.home}/godpowers`)
  };
}

module.exports = { RUNTIMES, resolveRuntime, runtimeKeys: () => Object.keys(RUNTIMES) };
