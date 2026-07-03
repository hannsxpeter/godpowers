/**
 * Godpowers Automation Providers
 *
 * Detects host-native automation surfaces, renders opt-in setup guidance, and
 * records completed host setup after explicit confirmation. This module never
 * creates schedules, routines, background agents, commits, pushes, packages,
 * publishes, deploys, or clears reviews by itself.
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const os = require('os');

const CONFIG_PATH = '.godpowers/automations.json';

const STRICT_RELEASE_SURFACES = [
  'root docs: README.md, CHANGELOG.md, RELEASE.md, CONTRIBUTING.md, SUPPORT.md, USERS.md, ARCHITECTURE.md, ARCHITECTURE-MAP.md, AGENTS.md, SKILL.md',
  'docs/: release checklist, roadmap, reference, validation, concepts, getting started, feature awareness, auto-invoke visibility, repo sync docs',
  'agents/: pillar files and specialist agent contracts',
  'skills/: command skills and release-visible examples',
  'routing/: command routes and high-frequency recipes',
  'workflows/: full arc, feature, hotfix, refactor, migration, docs, deps, hygiene, suite, and audit workflows',
  'schema/: events, intent, routing, recipe, state, workflow, and extension schemas',
  'templates/: generated artifact templates and update logs',
  'references/: have-nots, orchestration, planning, building, design, and shared references',
  'hooks/: session-start and pre-tool-use runtime hooks',
  'lib/: sync detectors, release guardrails, host capabilities, automation providers, and runtime helpers',
  'scripts/: release gate, smoke, package, and sync tests',
  'tests/ and fixtures/: integration, dogfood, and golden fixtures',
  '.github/workflows/: CI, publish, and pack publish gates',
  'package surface: package.json, package-lock.json, npm files list, pack contents, npm latest, git tag, and release notes'
];

const SAFE_TEMPLATES = [
  {
    id: 'daily-status',
    title: 'Daily Godpowers status',
    cadence: 'Daily at 9am local time',
    risk: 'read-only',
    prompt: 'Run godpowers status --project . and summarize current phase, progress, open items, and recommended next action.'
  },
  {
    id: 'stale-checkpoint',
    title: 'Stale checkpoint watcher',
    cadence: 'Weekdays at 9am local time',
    risk: 'read-only',
    prompt: 'Check .godpowers/CHECKPOINT.mdx freshness (legacy projects may still hold .godpowers/CHECKPOINT.md). If stale, report that /god-sync or /god-resume-work should run.'
  },
  {
    id: 'review-queue',
    title: 'Review queue watcher',
    cadence: 'Daily at 10am local time',
    risk: 'read-only',
    prompt: 'Inspect .godpowers/REVIEW-REQUIRED.mdx and report unresolved review items without clearing them.'
  },
  {
    id: 'weekly-hygiene',
    title: 'Weekly hygiene report',
    cadence: 'Monday at 9am local time',
    risk: 'read-only',
    prompt: 'Run a read-only hygiene summary for docs drift, dependency signals, checkpoint age, and pending reviews.'
  },
  {
    id: 'strict-release-readiness',
    title: 'Strict release readiness report',
    cadence: 'Manual, before release, or weekly before planned releases',
    risk: 'read-only, fail-closed',
    surfaces: STRICT_RELEASE_SURFACES.slice(),
    prompt: [
      'Run strict release readiness for every required Godpowers release surface.',
      'Check root docs, docs/, agents/, skills/, routing/, workflows/, schema/, templates/, references/, hooks/, lib/, scripts/, tests/, fixtures/, .github/workflows/, package metadata, git tag state, GitHub release state, npm latest, and local install state.',
      'Run or report the status of repo documentation sync, repo surface sync, route quality sync, recipe coverage sync, release surface sync, automation surface sync, package content checks, release gate status, CI status, publish workflow status, forbidden character scan, stale version scan, and unstaged work.',
      'Fail closed when any required surface is unchecked, stale, missing from the package manifest, not covered by tests, or inconsistent with the intended version.',
      'Summarize blockers and exact next commands only. Do not modify files, stage, commit, tag, push, create a GitHub release, publish to npm, delete files, or clear caches.'
    ].join(' ')
  },
  {
    id: 'release-readiness',
    title: 'Release readiness report',
    cadence: 'Manual or before release',
    risk: 'read-only',
    prompt: 'Report release readiness from tests, package metadata, changelog, release notes, and unstaged work. Do not publish.'
  }
];

const PROVIDERS = [
  {
    id: 'codex-app',
    label: 'Codex App automations',
    runtime: 'codex',
    class: 'native-scheduler',
    detect: (ctx) => hasRuntime(ctx, 'codex') || hasEnv(ctx, 'CODEX_HOME'),
    setup: [
      'Use /god-automation-setup inside Codex App so the host can create reviewed automations.',
      'Prefer thread heartbeat for short follow-ups and worktree cron for durable project checks.'
    ]
  },
  {
    id: 'claude-routines',
    label: 'Claude Code routines',
    runtime: 'claude',
    class: 'native-scheduler',
    detect: (ctx) => hasCommand(ctx, 'claude') || hasRuntime(ctx, 'claude'),
    setup: [
      'Run /schedule in Claude Code for scheduled routines.',
      'Use claude.ai/code/routines for API or GitHub triggers.'
    ]
  },
  {
    id: 'cline-schedule',
    label: 'Cline scheduled agents',
    runtime: 'cline',
    class: 'native-scheduler',
    detect: (ctx) => hasCommand(ctx, 'cline') || hasRuntime(ctx, 'cline'),
    setup: [
      'Run cline schedule to create, list, trigger, pause, resume, or delete schedules.',
      'Use read-only prompts unless the user explicitly approves branch or PR automation.'
    ]
  },
  {
    id: 'kilo-scheduled-triggers',
    label: 'Kilo scheduled triggers',
    runtime: 'kilo',
    class: 'native-scheduler',
    detect: (ctx) => hasRuntime(ctx, 'kilo'),
    setup: [
      'Use KiloClaw Scheduled Triggers from Kilo settings.',
      'Limit each trigger to read-only Godpowers reports unless the user approves write scope.'
    ]
  },
  {
    id: 'qwen-loop',
    label: 'Qwen Code /loop',
    runtime: 'qwen',
    class: 'session-scheduler',
    detect: (ctx) => hasCommand(ctx, 'qwen') || hasRuntime(ctx, 'qwen'),
    setup: [
      'Enable Qwen experimental cron support, then use /loop for session-scoped recurring prompts.',
      'Do not treat Qwen loops as durable because they do not persist across restarts.'
    ]
  },
  {
    id: 'cursor-background-agent',
    label: 'Cursor Background Agents',
    runtime: 'cursor',
    class: 'background-agent',
    detect: (ctx) => hasCommand(ctx, 'cursor') || hasRuntime(ctx, 'cursor'),
    setup: [
      'Use Cursor Background Agent mode or Background Agent API for asynchronous branch work.',
      'Prefer issue or branch scoped tasks and require human review before merge.'
    ]
  },
  {
    id: 'github-copilot-cloud-agent',
    label: 'GitHub Copilot cloud agent',
    runtime: 'copilot',
    class: 'background-agent',
    detect: (ctx) => hasGitRemote(ctx) || hasRuntime(ctx, 'copilot'),
    setup: [
      'Use GitHub issues, pull requests, or Copilot chat to delegate work to Copilot cloud agent.',
      'Keep Godpowers automations branch or PR scoped and require human merge authority.'
    ]
  },
  {
    id: 'windsurf-workflows',
    label: 'Windsurf workflows',
    runtime: 'windsurf',
    class: 'manual-workflow',
    detect: (ctx) => hasRuntime(ctx, 'windsurf'),
    setup: [
      'Install reusable workflows under .windsurf/workflows/ or the global Windsurf workflow folder.',
      'Windsurf workflows are manual-only; use Skills when Cascade should discover a procedure.'
    ]
  },
  {
    id: 'gemini-headless',
    label: 'Gemini CLI headless mode',
    runtime: 'gemini',
    class: 'scriptable-headless',
    detect: (ctx) => hasCommand(ctx, 'gemini') || hasRuntime(ctx, 'gemini'),
    setup: [
      'Use gemini -p for non-interactive scripting.',
      'Use an external scheduler only when the user explicitly asks for OS or CI scheduling.'
    ]
  },
  {
    id: 'opencode-run',
    label: 'OpenCode run and serve',
    runtime: 'opencode',
    class: 'scriptable-headless',
    detect: (ctx) => hasCommand(ctx, 'opencode') || hasRuntime(ctx, 'opencode'),
    setup: [
      'Use opencode run for non-interactive prompts or opencode serve for an attachable server.',
      'Use opencode github install when repo-native GitHub automation is preferred.'
    ]
  },
  {
    id: 'augment-subagents',
    label: 'Augment Agent and subagents',
    runtime: 'augment',
    class: 'manual-workflow',
    detect: (ctx) => hasRuntime(ctx, 'augment'),
    setup: [
      'Use Augment Agent or Agent Auto for supervised tasks.',
      'Use Augment subagents for specialized review, test, or docs work.'
    ]
  },
  {
    id: 'codebuddy-sdk',
    label: 'CodeBuddy Agent SDK',
    runtime: 'codebuddy',
    class: 'scriptable-headless',
    detect: (ctx) => hasCommand(ctx, 'codebuddy') || hasRuntime(ctx, 'codebuddy'),
    setup: [
      'Use the CodeBuddy Agent SDK for programmatic automation.',
      'Keep filesystem config loading explicit so automation stays predictable.'
    ]
  },
  {
    id: 'pi-sdk',
    label: 'Pi CLI and SDK',
    runtime: 'pi',
    class: 'scriptable-headless',
    detect: (ctx) => hasCommand(ctx, 'pi') || hasRuntime(ctx, 'pi'),
    setup: [
      'Use Pi CLI or SDK for scriptable coding-agent sessions.',
      'Use host or CI scheduling only after explicit user approval.'
    ]
  },
  {
    id: 'trae',
    label: 'Trae',
    runtime: 'trae',
    class: 'unknown',
    detect: (ctx) => hasRuntime(ctx, 'trae'),
    setup: [
      'No stable scheduled automation provider is documented for Godpowers yet.',
      'Use manual Godpowers commands until a native Trae automation surface is confirmed.'
    ]
  },
  {
    id: 'antigravity',
    label: 'Google Antigravity',
    runtime: 'antigravity',
    class: 'unknown',
    detect: (ctx) => hasRuntime(ctx, 'antigravity'),
    setup: [
      'Agent-first workflows are supported, but scheduled automation is not confirmed for Godpowers yet.',
      'Use manual workflows and require artifact review for autonomous agent work.'
    ]
  }
];

const EXECUTION_ADAPTERS = {
  'codex-app': {
    method: 'host-tool-calling',
    hostTool: 'codex_app.automation_update',
    action: 'Call the Codex App automation tool after the user approves provider, template, cadence, and scope.'
  },
  'claude-routines': {
    method: 'host-native-command',
    hostCommand: '/schedule',
    action: 'Use Claude Code schedule or routine creation after explicit user approval.'
  },
  'cline-schedule': {
    method: 'local-command',
    localCommand: 'cline schedule',
    action: 'Use the Cline scheduler after explicit user approval.'
  },
  'kilo-scheduled-triggers': {
    method: 'host-native-ui',
    action: 'Use KiloClaw Scheduled Triggers after explicit user approval.'
  },
  'qwen-loop': {
    method: 'session-command',
    hostCommand: '/loop',
    action: 'Use Qwen Code loop only for session-scoped recurring checks.'
  },
  'cursor-background-agent': {
    method: 'background-agent',
    action: 'Use Cursor Background Agent mode or API for branch-scoped asynchronous work.'
  },
  'github-copilot-cloud-agent': {
    method: 'background-agent',
    action: 'Use GitHub issue, pull request, or Copilot cloud agent entry points for branch-scoped work.'
  },
  'windsurf-workflows': {
    method: 'manual-workflow',
    action: 'Install or select a Windsurf workflow manually because durable scheduling is not confirmed.'
  },
  'gemini-headless': {
    method: 'scriptable-headless',
    localCommand: 'gemini -p',
    action: 'Use Gemini CLI headless execution only with an approved host, CI, or OS scheduler.'
  },
  'opencode-run': {
    method: 'scriptable-headless',
    localCommand: 'opencode run',
    action: 'Use OpenCode run or serve only with an approved host, CI, or OS scheduler.'
  },
  'augment-subagents': {
    method: 'manual-workflow',
    action: 'Use Augment Agent, Agent Auto, or subagents manually unless a native scheduler is confirmed.'
  },
  'codebuddy-sdk': {
    method: 'scriptable-headless',
    action: 'Use CodeBuddy SDK only with an approved host, CI, or OS scheduler.'
  },
  'pi-sdk': {
    method: 'scriptable-headless',
    action: 'Use Pi CLI or SDK only with an approved host, CI, or OS scheduler.'
  },
  trae: {
    method: 'unsupported',
    action: 'Report scheduled automation as unknown until Trae exposes a confirmed provider.'
  },
  antigravity: {
    method: 'unsupported',
    action: 'Report scheduled automation as unknown until Antigravity exposes a confirmed provider.'
  }
};

const EXECUTION_GUARDRAILS = [
  'Ask for explicit approval before creating, updating, triggering, pausing, resuming, or deleting host automations.',
  'Use direct host tool calling only for one read-only template with a known provider and approved cadence.',
  'Spawn god-automation-engineer for multiple templates, write-capable automation, background agents, scriptable schedulers, or provider uncertainty.',
  'Write .godpowers/automations.json only after host setup succeeds.'
];

function detect(projectRoot = process.cwd(), opts = {}) {
  const ctx = {
    projectRoot,
    home: opts.home || os.homedir(),
    env: opts.env || process.env,
    commands: opts.commands || null,
    gitRemote: opts.gitRemote
  };
  const active = readConfig(projectRoot).automations || [];
  const providers = PROVIDERS.map(provider => {
    const installed = Boolean(provider.detect(ctx));
    return {
      id: provider.id,
      label: provider.label,
      runtime: provider.runtime,
      class: provider.class,
      installed,
      status: providerStatus(provider.class, installed),
      active: active.filter(item => item.provider === provider.id),
      setup: provider.setup.slice()
    };
  });

  const safeTemplates = SAFE_TEMPLATES.map(template => ({
    ...template,
    active: active.some(item => item.id === template.id && item.status !== 'disabled')
  }));

  return {
    configPath: path.join(projectRoot, CONFIG_PATH),
    providers,
    safeTemplates,
    active,
    recommendedProvider: recommendProvider(providers),
    safety: [
      'Do not create automations during install.',
      'Create schedules, routines, background agents, or API triggers only after explicit user approval.',
      'Default templates are read-only and must not commit, push, publish, deploy, clear reviews, or access provider dashboards.'
    ]
  };
}

function render(report) {
  const active = report.active && report.active.length > 0
    ? report.active.map(item => `  - ${item.id} via ${item.provider}: ${item.status || 'active'}`)
    : ['  - none recorded'];
  const providers = report.providers.map(provider => (
    `  - ${provider.label}: ${provider.status} (${provider.class})`
  ));
  const recommended = report.recommendedProvider
    ? `${report.recommendedProvider.label} (${report.recommendedProvider.class})`
    : 'none available';
  const templates = report.safeTemplates.map(template => (
    `  - ${template.id}: ${template.title}, ${template.cadence}, ${template.risk}`
  ));

  return [
    'Godpowers Automation Providers',
    '',
    `Config: ${report.configPath}`,
    `Recommended provider: ${recommended}`,
    '',
    'Active automations:',
    ...active,
    '',
    'Provider status:',
    ...providers,
    '',
    'Safe templates:',
    ...templates,
    '',
    'Safety rules:',
    ...report.safety.map(rule => `  - ${rule}`)
  ].join('\n');
}

function setupPlan(projectRoot = process.cwd(), opts = {}) {
  const report = detect(projectRoot, opts);
  const provider = report.recommendedProvider;
  const selectedTemplates = selectTemplates(report.safeTemplates, opts.templates);
  return {
    ...report,
    selectedTemplates,
    setup: provider ? provider.setup : ['No automation provider is available. Use /god-next or godpowers next --project . manually.'],
    execution: buildExecutionPlan(projectRoot, provider, selectedTemplates, opts)
  };
}

function renderSetupPlan(plan) {
  const provider = plan.recommendedProvider
    ? `${plan.recommendedProvider.label} (${plan.recommendedProvider.id})`
    : 'none available';
  return [
    'Godpowers Automation Setup Plan',
    '',
    `Recommended provider: ${provider}`,
    '',
    'Setup steps:',
    ...plan.setup.map((step, index) => `  ${index + 1}. ${step}`),
    '',
    'Execution path:',
    `  - Method: ${plan.execution.method}`,
    `  - Action: ${plan.execution.action}`,
    `  - Direct host tool calling: ${plan.execution.directHostToolCalling ? 'available after approval' : 'not available'}`,
    `  - Specialist agent: ${plan.execution.specialistAgent || 'not required for simple read-only setup'}`,
    `  - Record after success: ${plan.execution.recordPath}`,
    '',
    'Recommended safe templates:',
    ...plan.safeTemplates.map(template => `  - ${template.id}: ${template.prompt}`),
    '',
    'Approval required:',
    '  - Choose a provider',
    '  - Choose one or more templates',
    '  - Confirm any host-native schedule, routine, background agent, API trigger, or connector scope'
  ].join('\n');
}

function selectTemplates(safeTemplates, selectedIds) {
  if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
    const daily = safeTemplates.find(template => template.id === 'daily-status');
    return daily ? [daily] : safeTemplates.slice(0, 1);
  }
  const selected = [];
  for (const id of selectedIds) {
    const found = safeTemplates.find(template => template.id === id);
    if (found) selected.push(found);
  }
  return selected;
}

function buildExecutionPlan(projectRoot, provider, selectedTemplates, opts = {}) {
  if (!provider) {
    return {
      method: 'manual',
      action: 'No provider is available. Run Godpowers commands manually.',
      directHostToolCalling: false,
      hostTool: null,
      hostCommand: null,
      localCommand: null,
      specialistAgent: null,
      approvalRequired: true,
      recordPath: path.join(projectRoot, CONFIG_PATH),
      guardrails: EXECUTION_GUARDRAILS.slice()
    };
  }

  const adapter = EXECUTION_ADAPTERS[provider.id] || {
    method: provider.class,
    action: 'Use the provider-native setup surface after explicit user approval.'
  };
  const writeCapable = Boolean(opts.writeCapable);
  const complex = writeCapable ||
    selectedTemplates.length > 1 ||
    provider.class === 'background-agent' ||
    provider.class === 'scriptable-headless' ||
    provider.class === 'unknown';
  const directHostToolCalling = !complex && (
    adapter.method === 'host-tool-calling' ||
    adapter.method === 'host-native-command' ||
    adapter.method === 'local-command' ||
    adapter.method === 'session-command'
  );

  return {
    method: adapter.method,
    action: adapter.action,
    directHostToolCalling,
    hostTool: adapter.hostTool || null,
    hostCommand: adapter.hostCommand || null,
    localCommand: adapter.localCommand || null,
    specialistAgent: complex ? 'god-automation-engineer' : null,
    approvalRequired: true,
    recordPath: path.join(projectRoot, CONFIG_PATH),
    guardrails: EXECUTION_GUARDRAILS.slice()
  };
}

function buildAutomationRecord(providerId, templateId, opts = {}) {
  const provider = PROVIDERS.find(item => item.id === providerId);
  const template = SAFE_TEMPLATES.find(item => item.id === templateId);
  if (!provider) throw new Error(`unknown automation provider: ${providerId}`);
  if (!template) throw new Error(`unknown automation template: ${templateId}`);
  return {
    id: template.id,
    provider: provider.id,
    status: opts.status || 'active',
    cadence: opts.cadence || template.cadence,
    summary: opts.summary || template.prompt,
    risk: template.risk,
    createdAt: opts.createdAt || new Date().toISOString(),
    host: opts.host || provider.label,
    hostId: opts.hostId || null,
    hostSurface: opts.hostSurface || (EXECUTION_ADAPTERS[provider.id] && EXECUTION_ADAPTERS[provider.id].method) || provider.class
  };
}

function recordAutomation(projectRoot, record, opts = {}) {
  if (!opts.confirmedHostSuccess) {
    throw new Error('confirmedHostSuccess is required before recording automation');
  }
  const file = path.join(projectRoot, CONFIG_PATH);
  const config = readConfig(projectRoot);
  const next = config.automations.filter(item =>
    !(item.id === record.id && item.provider === record.provider)
  );
  next.push(record);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify({ automations: next }, null, 2)}\n`);
  return { automations: next };
}

function readConfig(projectRoot) {
  const file = path.join(projectRoot, CONFIG_PATH);
  if (!fs.existsSync(file)) return { automations: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      automations: Array.isArray(parsed.automations) ? parsed.automations : []
    };
  } catch (e) {
    return { automations: [] };
  }
}

function providerStatus(providerClass, installed) {
  if (providerClass === 'unknown') return installed ? 'installed, capability unknown' : 'unknown';
  if (providerClass === 'manual-workflow') return installed ? 'manual workflow available' : 'supported, not detected';
  if (providerClass === 'session-scheduler') return installed ? 'session scheduler available' : 'supported, not detected';
  if (providerClass === 'background-agent') return installed ? 'background agent available' : 'supported, not detected';
  if (providerClass === 'scriptable-headless') return installed ? 'scriptable headless available' : 'supported, not detected';
  if (providerClass === 'native-scheduler') return installed ? 'native scheduler available' : 'supported, not detected';
  return installed ? 'available' : 'not detected';
}

function recommendProvider(providers) {
  const order = [
    'native-scheduler',
    'background-agent',
    'scriptable-headless',
    'session-scheduler',
    'manual-workflow'
  ];
  for (const providerClass of order) {
    const found = providers.find(provider => provider.installed && provider.class === providerClass);
    if (found) return found;
  }
  return null;
}

function hasRuntime(ctx, runtime) {
  const homePath = path.join(ctx.home, `.${runtime}`, 'GODPOWERS_VERSION');
  return fs.existsSync(homePath);
}

function hasEnv(ctx, key) {
  return Boolean(ctx.env && ctx.env[key]);
}

function hasCommand(ctx, command) {
  if (ctx.commands) {
    return Boolean(ctx.commands[command]);
  }
  try {
    cp.execFileSync('which', [command], { stdio: ['ignore', 'ignore', 'ignore'] });
    return true;
  } catch (e) {
    return false;
  }
}

function hasGitRemote(ctx) {
  if (ctx.gitRemote !== undefined) return Boolean(ctx.gitRemote);
  try {
    const out = cp.execFileSync('git', ['remote', '-v'], {
      cwd: ctx.projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return /github\.com[:/]/.test(out);
  } catch (e) {
    return false;
  }
}

module.exports = {
  CONFIG_PATH,
  SAFE_TEMPLATES,
  PROVIDERS,
  detect,
  render,
  setupPlan,
  renderSetupPlan,
  selectTemplates,
  buildExecutionPlan,
  buildAutomationRecord,
  recordAutomation,
  readConfig
};
