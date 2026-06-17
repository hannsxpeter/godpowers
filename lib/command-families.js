/**
 * Command family metadata.
 *
 * Keeps the user-facing command catalog small without removing leaf commands.
 * These groupings are used by help, routing, docs, and UX audits.
 */

const fs = require('fs');
const path = require('path');

const COMMAND_FAMILIES = [
  {
    id: 'start',
    label: 'Start',
    purpose: 'Start or import a project.',
    commands: [
      '/god',
      '/god-first-run',
      '/god-demo',
      '/god-init',
      '/god-mode',
      '/god-plan',
      '/god-explore',
      '/god-discuss',
      '/god-list-assumptions',
      '/god-prd',
      '/god-design',
      '/god-design-impact',
      '/god-arch',
      '/god-roadmap',
      '/god-stack',
      '/god-repo',
      '/god-preflight',
      '/god-map-codebase',
      '/god-archaeology',
      '/god-org-context',
      '/god-migrate'
    ]
  },
  {
    id: 'continue',
    label: 'Continue',
    purpose: 'Understand state and choose the next move.',
    commands: [
      '/god-status',
      '/god-next',
      '/god-progress',
      '/god-resume-work',
      '/god-pause-work'
    ]
  },
  {
    id: 'build',
    label: 'Build',
    purpose: 'Plan, implement, test, and ship product work.',
    commands: [
      '/god-build',
      '/god-fix',
      '/god-feature',
      '/god-story',
      '/god-stories',
      '/god-story-build',
      '/god-story-verify',
      '/god-story-close',
      '/god-fast',
      '/god-quick',
      '/god-debug',
      '/god-add-tests',
      '/god-refactor',
      '/god-spike'
    ]
  },
  {
    id: 'verify',
    label: 'Verify',
    purpose: 'Check artifacts, code, runtime behavior, and release readiness.',
    commands: [
      '/god-lint',
      '/god-standards',
      '/god-review',
      '/god-review-changes',
      '/god-test-runtime',
      '/god-audit',
      '/god-agent-audit',
      '/god-hygiene',
      '/god-dogfood',
      '/god-preflight'
    ]
  },
  {
    id: 'operate',
    label: 'Operate',
    purpose: 'Deploy, observe, harden, launch, and respond in production.',
    commands: [
      '/god-deploy',
      '/god-ship',
      '/god-observe',
      '/god-harden',
      '/god-launch',
      '/god-hotfix',
      '/god-postmortem',
      '/god-logs',
      '/god-metrics',
      '/god-trace',
      '/god-export-otel'
    ]
  },
  {
    id: 'maintain',
    label: 'Maintain',
    purpose: 'Keep artifacts, docs, dependencies, context, and repo surfaces current.',
    commands: [
      '/god-docs',
      '/god-sync',
      '/god-scan',
      '/god-link',
      '/god-reconcile',
      '/god-reconstruct',
      '/god-intel',
      '/god-tech-debt',
      '/god-update-deps',
      '/god-upgrade',
      '/god-context',
      '/god-context-scan',
      '/god-roadmap-update'
    ]
  },
  {
    id: 'capture',
    label: 'Capture',
    purpose: 'Save thoughts, tasks, backlog items, seeds, and learnings.',
    commands: [
      '/god-note',
      '/god-capture',
      '/god-add-todo',
      '/god-check-todos',
      '/god-add-backlog',
      '/god-plant-seed',
      '/god-extract-learnings',
      '/god-thread',
      '/god-graph'
    ]
  },
  {
    id: 'recover',
    label: 'Recover',
    purpose: 'Undo, repair, restore, skip, or diagnose broken state.',
    commands: [
      '/god-undo',
      '/god-redo',
      '/god-rollback',
      '/god-restore',
      '/god-repair',
      '/god-skip',
      '/god-smite',
      '/god-doctor'
    ]
  },
  {
    id: 'extend',
    label: 'Extend',
    purpose: 'Install, inspect, test, remove, or author extension packs.',
    commands: [
      '/god-extension-scaffold',
      '/god-extend',
      '/god-extension-add',
      '/god-extension-list',
      '/god-extension-info',
      '/god-extension-remove',
      '/god-test-extension',
      '/god-build-agent'
    ]
  },
  {
    id: 'collaborate',
    label: 'Collaborate',
    purpose: 'Coordinate people, workstreams, suites, sprints, and pull requests.',
    commands: [
      '/god-workstream',
      '/god-suite-init',
      '/god-suite-status',
      '/god-suite-sync',
      '/god-suite-patch',
      '/god-suite-release',
      '/god-party',
      '/god-sprint',
      '/god-pr-branch'
    ]
  },
  {
    id: 'configure',
    label: 'Configure',
    purpose: 'Tune settings, budgets, cache, profiles, help, and version info.',
    commands: [
      '/god-settings',
      '/god-surface',
      '/god-set-profile',
      '/god-budget',
      '/god-cost',
      '/god-cache-clear',
      '/god-automation-status',
      '/god-automation-setup',
      '/god-help',
      '/god-version'
    ]
  },
  {
    id: 'compatibility',
    label: 'Compatibility',
    purpose: 'Deprecated full-profile commands kept for backward compatibility.',
    visibility: 'hidden',
    commands: [
      '/god-roadmap-check',
      '/god-lifecycle',
      '/god-locate'
    ]
  }
];

const STATUS_VIEWS = [
  { id: 'overview', command: '/god-status', label: 'Overview', purpose: 'Operational state, proactive checks, and blockers.' },
  { id: 'progress', command: '/god-progress', label: 'Progress', purpose: 'Requirement and roadmap increment completion.' },
  { id: 'lifecycle', command: '/god-status --lifecycle', label: 'Lifecycle', purpose: 'Project phase and fitting workflows.' },
  { id: 'locate', command: '/god-status --locate', label: 'Locate', purpose: 'Resume orientation from checkpoint and disk state.' },
  { id: 'next', command: '/god-next', label: 'Next', purpose: 'Single recommended command with reason.' }
];

const CAPTURE_LADDER = [
  { id: 'note', command: '/god-note', signal: 'save only', purpose: 'Save a thought without priority or workflow impact.' },
  { id: 'todo', command: '/god-add-todo', signal: 'actionable soon', purpose: 'Create a prioritized action item.' },
  { id: 'backlog', command: '/god-add-backlog', signal: 'optional later', purpose: 'Park an idea for future roadmap review.' },
  { id: 'seed', command: '/god-plant-seed', signal: 'conditional future trigger', purpose: 'Store an idea until a metric, date, or event happens.' }
];

const WORK_SIZE_LADDER = [
  { id: 'fast', command: '/god-fast', signal: 'trivial direct edit', purpose: 'One tiny edit with existing verification.' },
  { id: 'quick', command: '/god-quick', signal: 'small TDD task', purpose: 'Small task with TDD and review but no full planning tier.' },
  { id: 'story', command: '/god-story', signal: 'fine-grained planned slice', purpose: 'Create a STORY.md before implementation.' },
  { id: 'feature', command: '/god-feature', signal: 'existing-product feature', purpose: 'Feature workflow with mini-PRD, build, harden, and sync.' },
  { id: 'build', command: '/god-build', signal: 'current milestone work', purpose: 'Build the planned roadmap increment.' },
  { id: 'debug', command: '/god-debug', signal: 'non-urgent bug', purpose: 'Run the systematic debug loop.' },
  { id: 'hotfix', command: '/god-hotfix', signal: 'production outage', purpose: 'Expedited production fix and postmortem trigger.' }
];

const VERIFY_LADDER = [
  { id: 'lint', command: '/god-lint', signal: 'mechanical artifact check', purpose: 'Fast file-level artifact validation.' },
  { id: 'standards', command: '/god-standards', signal: 'artifact quality gate', purpose: 'Substitution, labels, and have-nots for one artifact.' },
  { id: 'review', command: '/god-review', signal: 'code diff review', purpose: 'Two-stage spec and quality review.' },
  { id: 'runtime', command: '/god-test-runtime', signal: 'live behavior check', purpose: 'Browser-backed design and acceptance verification.' },
  { id: 'audit', command: '/god-audit', signal: 'artifact set score', purpose: 'Score existing Godpowers artifacts.' },
  { id: 'hygiene', command: '/god-hygiene', signal: 'ongoing project health', purpose: 'Composite audit, dependency, and docs check.' },
  { id: 'preflight', command: '/god-preflight', signal: 'existing repo intake', purpose: 'Read-only readiness check before stronger workflows.' },
  { id: 'dogfood', command: '/god-dogfood', signal: 'release fixture readiness', purpose: 'Messy-repo scenarios for release confidence.' }
];

const TRIGGER_PRECEDENCE = {
  continue: {
    default: '/god-next',
    conditional: [
      { command: '/god-resume-work', when: 'handoff-exists', reason: 'A handoff exists on disk.' }
    ],
    reason: 'Continue means resume a handoff when present, otherwise compute the next route.'
  },
  'think through': {
    default: '/god-discuss',
    conditional: [
      { command: '/god-explore', when: 'broad-idea', reason: 'The request is broad ideation rather than a concrete decision.' }
    ],
    reason: 'Discussion handles concrete decisions while exploration handles broad ideation.'
  },
  'what happened': {
    default: '/god-logs',
    conditional: [
      { command: '/god-postmortem', when: 'post-incident-pending', reason: 'The project is waiting on incident follow-up.' }
    ],
    reason: 'Logs answer run history unless an incident loop is open.'
  },
  "what's done": {
    default: '/god-progress',
    conditional: [
      { command: '/god-status', when: 'operational-status-request', reason: 'The wording asks for operational state, not deliverables.' }
    ],
    reason: 'Progress answers deliverables while status answers operational state.'
  },
  'where am i': {
    default: '/god-status --lifecycle',
    conditional: [
      { command: '/god-status --locate', when: 'checkpoint-or-handoff-exists', reason: 'Resume artifacts exist on disk.' }
    ],
    reason: 'Status flags explain the phase or orient a resumed session.'
  }
};

function familyForCommand(command) {
  return COMMAND_FAMILIES.find((family) => family.commands.includes(command)) || null;
}

function renderFamilyCards(
  families = COMMAND_FAMILIES.filter((family) => family.visibility !== 'hidden'),
  opts = {}
) {
  return families.map((family) => (
    opts.includeCommands
      ? `${family.label}: ${family.purpose} (${family.commands.join(', ')})`
      : `${family.label}: ${family.purpose}`
  ));
}

function renderLadder(ladder) {
  return ladder.map((step) => `${step.command}: ${step.signal} - ${step.purpose}`);
}

function detectCondition(condition, projectRoot, text = '') {
  if (!condition) return false;
  const root = projectRoot || process.cwd();
  if (condition === 'handoff-exists') {
    return fs.existsSync(path.join(root, '.godpowers', 'HANDOFF.md'));
  }
  if (condition === 'checkpoint-or-handoff-exists') {
    return fs.existsSync(path.join(root, '.godpowers', 'CHECKPOINT.md'))
      || fs.existsSync(path.join(root, '.godpowers', 'HANDOFF.md'));
  }
  if (condition === 'post-incident-pending') {
    try {
      const statePath = path.join(root, '.godpowers', 'state.json');
      if (!fs.existsSync(statePath)) return false;
      const parsed = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      return parsed['lifecycle-phase'] === 'post-incident-pending';
    } catch (e) {
      return false;
    }
  }
  if (condition === 'broad-idea') {
    return /\b(idea|brainstorm|explore|what if|possibilities|options)\b/i.test(text || '');
  }
  if (condition === 'operational-status-request') {
    return /\b(status|state|blocked|sync|health|where)\b/i.test(text || '');
  }
  return false;
}

function resolveTrigger(trigger, opts = {}) {
  const key = String(trigger || '').trim().toLowerCase();
  const rule = TRIGGER_PRECEDENCE[key];
  if (!rule) return null;
  for (const branch of rule.conditional || []) {
    if (detectCondition(branch.when, opts.projectRoot, opts.text)) {
      return { trigger: key, command: branch.command, reason: branch.reason, rule };
    }
  }
  return { trigger: key, command: rule.default, reason: rule.reason, rule };
}

function classifyCapture(text = '') {
  if (/\b(when|if|after|in \d+|once)\b/i.test(text)) return CAPTURE_LADDER.find((item) => item.id === 'seed');
  if (/\b(todo|task|remind|priority|p[0-3])\b/i.test(text)) return CAPTURE_LADDER.find((item) => item.id === 'todo');
  if (/\b(backlog|later|someday|future)\b/i.test(text)) return CAPTURE_LADDER.find((item) => item.id === 'backlog');
  return CAPTURE_LADDER.find((item) => item.id === 'note');
}

function classifyWorkSize(text = '') {
  if (/\b(production|outage|down|urgent|hotfix)\b/i.test(text)) return WORK_SIZE_LADDER.find((item) => item.id === 'hotfix');
  if (/\b(bug|debug|failing|error|regression)\b/i.test(text)) return WORK_SIZE_LADDER.find((item) => item.id === 'debug');
  if (/\b(story|acceptance criteria)\b/i.test(text)) return WORK_SIZE_LADDER.find((item) => item.id === 'story');
  if (/\b(feature|new capability|enhancement)\b/i.test(text)) return WORK_SIZE_LADDER.find((item) => item.id === 'feature');
  if (/\b(milestone|roadmap|increment)\b/i.test(text)) return WORK_SIZE_LADDER.find((item) => item.id === 'build');
  if (/\b(tiny|typo|one-line|config tweak|trivial)\b/i.test(text)) return WORK_SIZE_LADDER.find((item) => item.id === 'fast');
  // IA-002: only return the small-task default when there is an actual
  // small-coding-task signal. Otherwise return null so callers (the /god
  // router) fall back to the state-driven /god-next instead of confidently
  // mis-sizing an unrelated intent ("ship it", "check progress", "deploy") as
  // a /god-quick TDD coding task. A confident-but-wrong route is worse than a
  // no-match.
  if (/\b(quick|small|tdd|slice|minor|chore|refactor)\b/i.test(text)) return WORK_SIZE_LADDER.find((item) => item.id === 'quick');
  return null;
}

function classifyVerification(text = '') {
  if (/\b(dogfood|release readiness|fixture)\b/i.test(text)) return VERIFY_LADDER.find((item) => item.id === 'dogfood');
  if (/\b(preflight|intake|existing repo)\b/i.test(text)) return VERIFY_LADDER.find((item) => item.id === 'preflight');
  if (/\b(hygiene|health|weekly|monthly)\b/i.test(text)) return VERIFY_LADDER.find((item) => item.id === 'hygiene');
  if (/\b(audit|score artifacts)\b/i.test(text)) return VERIFY_LADDER.find((item) => item.id === 'audit');
  if (/\b(runtime|browser|e2e|flow|render|design audit)\b/i.test(text)) return VERIFY_LADDER.find((item) => item.id === 'runtime');
  if (/\b(review|diff|code review)\b/i.test(text)) return VERIFY_LADDER.find((item) => item.id === 'review');
  if (/\b(standard|substitution|have-nots)\b/i.test(text)) return VERIFY_LADDER.find((item) => item.id === 'standards');
  return VERIFY_LADDER.find((item) => item.id === 'lint');
}

module.exports = {
  COMMAND_FAMILIES,
  STATUS_VIEWS,
  CAPTURE_LADDER,
  WORK_SIZE_LADDER,
  VERIFY_LADDER,
  TRIGGER_PRECEDENCE,
  familyForCommand,
  renderFamilyCards,
  renderLadder,
  resolveTrigger,
  classifyCapture,
  classifyWorkSize,
  classifyVerification
};
