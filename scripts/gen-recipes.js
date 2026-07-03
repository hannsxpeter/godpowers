#!/usr/bin/env node
/**
 * Generate the structured recipe YAML files from recipe definitions.
 * One-shot script.
 */

const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'routing', 'recipes');

const recipes = [
  // STARTING
  {
    name: 'greenfield-fast',
    category: 'starting',
    description: 'Greenfield idea to production with one command',
    keywords: ['build something new', 'start from scratch', 'greenfield', 'new project', 'idea to production', 'start a product', 'start product', 'build a product'],
    stateConditions: ['no-godpowers-dir'],
    sequence: [
      { cmd: '/god-mode', why: 'Full autonomous project run, idea to hardened production' }
    ]
  },
  {
    name: 'greenfield-with-ideation',
    category: 'starting',
    description: 'Idea is fuzzy; explore first, then init and build',
    keywords: ['fuzzy idea', 'not sure', 'think first', 'multiple ideas', 'brainstorm'],
    stateConditions: ['no-godpowers-dir'],
    sequence: [
      { cmd: '/god-explore', why: 'Pre-init Socratic ideation' },
      { cmd: '/god-init', why: 'Commit to clarified framing' },
      { cmd: '/god-mode', why: 'Run autonomous project run' }
    ]
  },
  {
    name: 'greenfield-manual',
    category: 'starting',
    description: 'Greenfield with manual control through each step',
    keywords: ['step by step', 'manual', 'control each step'],
    stateConditions: ['no-godpowers-dir'],
    sequence: [
      { cmd: '/god-init' },
      { cmd: '/god-prd' },
      { cmd: '/god-arch' },
      { cmd: '/god-roadmap' },
      { cmd: '/god-stack' },
      { cmd: '/god-repo' },
      { cmd: '/god-build' },
      { cmd: '/god-deploy' },
      { cmd: '/god-observe' },
      { cmd: '/god-harden' },
      { cmd: '/god-launch' }
    ]
  },
  {
    name: 'existing-codebase-onboarding',
    category: 'starting',
    description: 'Joining or inheriting an existing codebase',
    keywords: ['existing codebase', 'inherit code', 'joining project', 'mode b', 'gap fill'],
    stateConditions: ['no-godpowers-dir', 'has-package-json'],
    sequence: [
      { cmd: '/god-map-codebase', why: '4 parallel mappers analyze tech, arch, quality, concerns' },
      { cmd: '/god-init', why: 'Mode B detection from existing artifacts' },
      { cmd: '/god-status', why: 'See what tiers are imported vs missing' },
      { cmd: '/god-next', why: 'Suggests the first missing tier' }
    ]
  },
  {
    name: 'returning-after-break',
    category: 'starting',
    description: 'Returning to a project after a long break',
    keywords: ['returning', 'after break', 'pick up where left', 'resume project', 'coming back after a week', 'back after a week', 'coming back'],
    stateConditions: ['state:initialized == true'],
    sequence: [
      { cmd: '/god-resume-work', why: 'If HANDOFF.mdx exists, restore context', skipWhen: 'no-handoff' },
      { cmd: '/god-status', why: 'Current state from disk' },
      { cmd: '/god-hygiene', why: 'Check what may have drifted' },
      { cmd: '/god-next', why: 'Pick up where you left off' }
    ]
  },
  {
    name: 'brownfield-onboarding',
    category: 'starting',
    description: 'Inheriting an existing codebase; preflight before archaeology',
    keywords: ['brownfield', 'inherit codebase', 'legacy code', 'understand existing', 'audit an existing repo', 'audit existing repo', 'audit existing codebase'],
    stateConditions: ['has-package-json'],
    sequence: [
      { cmd: '/god-preflight', why: 'Read-only intake audit before project-run readiness and pillars' },
      { cmd: '/god-archaeology', why: 'Deep history, decisions, conventions, risks' },
      { cmd: '/god-reconstruct', why: 'Reverse-engineer PRD/ARCH/ROADMAP/STACK from code' },
      { cmd: '/god-audit', why: 'Score reconstructed artifacts' },
      { cmd: '/god-tech-debt', why: 'Categorize and prioritize debt' },
      { cmd: '/god-feature', why: 'Now safe to add new work with reconciliation' }
    ]
  },
  {
    name: 'bluefield-org-aware',
    category: 'starting',
    description: 'New project in an established org; respect org standards',
    keywords: ['bluefield', 'new service', 'org standards', 'shared platform', 'within organization'],
    sequence: [
      { cmd: '/god-org-context init', why: 'Capture org-level standards and constraints' },
      { cmd: '/god-preflight', why: 'Inspect inherited context before project-run readiness and pillars' },
      { cmd: '/god-init', why: 'Detect bluefield mode' },
      { cmd: '/god-mode --bluefield', why: 'Arc constrained by org context' }
    ]
  },

  // FEATURE ADDITION (the "mid-development" scenarios)
  {
    name: 'add-feature-tiny',
    category: 'feature-addition',
    description: 'Tiny scope feature: typo, config, 1-line change',
    keywords: ['add feature tiny', 'typo', 'config tweak', 'one line', 'trivial change', 'tiny fix'],
    sequence: [
      { cmd: '/god-fast', why: 'No planning ceremony; direct edit + tests pass' }
    ]
  },
  {
    name: 'add-feature-small',
    category: 'feature-addition',
    description: 'Small feature: 1-3 hours, with TDD discipline',
    keywords: ['add feature small', 'add new feature', 'small feature', 'small task', 'few hours', 'with TDD'],
    sequence: [
      { cmd: '/god-quick', why: 'TDD-disciplined small task; one atomic commit' }
    ]
  },
  {
    name: 'add-feature-mid-arc-pause',
    category: 'feature-addition',
    description: 'Bigger feature during the current project run; reconcile with roadmap, pause, do feature, update roadmap, resume',
    keywords: ['mid arc', 'mid development', 'pause arc', 'feature during build', 'add a feature', 'feature addition', 'add a feature during the current project run', 'add a feature without breaking the current project run', 'without breaking current project run', 'do not disturb current work'],
    stateConditions: ['lifecycle-phase == in-arc'],
    sequence: [
      { cmd: '/god-reconcile', why: 'Multi-artifact reconciliation across PRD/ARCH/ROADMAP/STACK/etc.' },
      { cmd: '/god-pause-work', why: 'Save current project-run state', skipWhen: 'reconciliation-says-already-done-or-prereq' },
      { cmd: '/god-feature', why: 'Run feature workflow with full discipline' },
      { cmd: '/god-sync', why: 'Update all affected artifacts (PRD, ARCH, ROADMAP, etc.)' },
      { cmd: '/god-resume-work', why: 'Restore project-run state' }
    ]
  },
  {
    name: 'add-feature-defer-current-milestone',
    category: 'feature-addition',
    description: 'Defer feature to end of current milestone',
    keywords: ['defer feature', 'finish milestone first', 'after current'],
    sequence: [
      { cmd: '/god-add-backlog "<feature description>"', why: 'Capture without disrupting current work' }
    ]
  },
  {
    name: 'add-feature-next-milestone',
    category: 'feature-addition',
    description: 'Big feature, want it in next milestone (rebuild roadmap)',
    keywords: ['next milestone', 'rebuild roadmap', 'big feature later'],
    sequence: [
      { cmd: '/god-add-backlog "<feature>"', why: 'Capture intent' },
      { cmd: '/god-redo roadmap', why: 'Regenerate with feature included' }
    ]
  },
  {
    name: 'add-feature-prd-update',
    category: 'feature-addition',
    description: 'Feature requires PRD-level requirement update',
    keywords: ['update prd', 'change requirement', 'prd missing'],
    sequence: [
      { cmd: '/god-redo prd', why: 'Re-run PRD; downstream tiers re-validate' }
    ]
  },
  {
    name: 'add-feature-parallel',
    category: 'feature-addition',
    description: 'Parallel feature, do not disrupt main work',
    keywords: ['parallel feature', 'parallel work', 'isolated branch'],
    sequence: [
      { cmd: '/god-reconcile', why: 'Multi-artifact reconciliation across all impacted sections' },
      { cmd: '/god-workstream new <feature-name>', why: 'Isolated git worktree + state' },
      { cmd: '/god-feature', why: 'Runs on the workstream' },
      { cmd: '/god-sync', why: 'Sync all affected artifacts (PRD, ARCH, ROADMAP, etc.)' },
      { cmd: '/god-workstream merge <feature-name>', why: 'Merge back when done' }
    ]
  },
  {
    name: 'add-feature-future-conditional',
    category: 'feature-addition',
    description: 'Feature needed in 6+ months, conditional on a trigger',
    keywords: ['future feature', 'when team grows', 'conditional on'],
    sequence: [
      { cmd: '/god-plant-seed "<idea> when <trigger condition>"', why: 'Dormant until trigger fires' }
    ]
  },

  // PRODUCTION
  {
    name: 'production-broken',
    category: 'production',
    description: 'Production is broken now',
    keywords: ['production down', 'production is broken', 'production broken', 'fix production', 'prod is broken', 'urgent', 'p0', 'p1', 'fire drill', 'users seeing errors'],
    stateConditions: ['lifecycle-phase == steady-state-active'],
    sequence: [
      { cmd: '/god-hotfix', why: 'Skip planning, debug, fix with TDD, expedited deploy, schedule postmortem' }
    ]
  },
  {
    name: 'incident-postmortem',
    category: 'production',
    description: 'Incident resolved, need investigation',
    keywords: ['postmortem', 'after incident', 'rca', 'class of bug'],
    stateConditions: ['lifecycle-phase == post-incident-pending'],
    sequence: [
      { cmd: '/god-postmortem', why: 'Required within 48h of hotfix' }
    ]
  },
  {
    name: 'bug-no-urgency',
    category: 'production',
    description: 'Bug found in dev, no urgency',
    keywords: ['bug found', 'broken in dev', 'investigate bug'],
    sequence: [
      { cmd: '/god-debug', why: '4-phase systematic debug, not expedited' }
    ]
  },

  // MAINTAINING
  {
    name: 'weekly-health-check',
    category: 'maintaining',
    description: 'Weekly composite health check',
    keywords: ['weekly check', 'health check', 'hygiene', 'project health', 'maintain project health', 'maintain health'],
    stateConditions: ['lifecycle-phase == steady-state-active'],
    sequence: [
      { cmd: '/god-hygiene', why: 'Audit + deps + docs in one composite report' }
    ]
  },
  {
    name: 'monthly-deps',
    category: 'maintaining',
    description: 'Monthly dependency audit and update',
    keywords: ['update dependencies', 'monthly deps', 'audit deps', 'cve check'],
    sequence: [
      { cmd: '/god-update-deps', why: 'Critical CVEs first, batched patches, per-package minors' }
    ]
  },
  {
    name: 'major-framework-upgrade',
    category: 'maintaining',
    description: 'Major framework version upgrade',
    keywords: ['react 19', 'node 22', 'framework upgrade', 'major version', 'migrate'],
    sequence: [
      { cmd: '/god-upgrade', why: 'Expand-contract pattern with metric-gated slices' }
    ]
  },
  {
    name: 'docs-drift',
    category: 'maintaining',
    description: 'Documentation has drifted from code',
    keywords: ['docs drift', 'fix readme', 'documentation outdated'],
    sequence: [
      { cmd: '/god-docs', why: 'Verifies every claim against code' }
    ]
  },
  {
    name: 'code-cleanup',
    category: 'maintaining',
    description: 'Refactor without behavior change',
    keywords: ['refactor', 'clean up', 'rename', 'extract', 'restructure'],
    sequence: [
      { cmd: '/god-refactor', why: 'Strict TDD, behavior-preserving, gradual rollout' }
    ]
  },
  {
    name: 'audit-remediate',
    category: 'maintaining',
    description: 'Audit the codebase, then drive the findings to zero',
    keywords: ['audit and fix', 'fix all the audit findings', 'drive the audit to clean', 'remediate tech debt', 'fix the codebase until clean', 'pay down tech debt', 'address all the findings', 'code audit and fix'],
    sequence: [
      { cmd: '/god-tech-debt', why: 'Score the codebase and write the prioritized, self-contained audit report (god-debt-assessor)' },
      { cmd: '/god-debug', why: 'Fix each Confirmed Critical/High finding worst-first; an independent reviewer verifies each fix against the cited evidence' },
      { cmd: '/god-tech-debt', why: 'Re-audit to confirm findings are resolved not relocated and no strength regressed; the orchestrator loops this under an outcome budget until clean' }
    ]
  },

  // RECOVERING
  {
    name: 'undo-last',
    category: 'recovering',
    description: 'Undo the last operation',
    keywords: ['undo', 'revert last', 'rollback last'],
    sequence: [
      { cmd: '/god-undo', why: 'Reflog-based revert; files moved to .trash/' }
    ]
  },
  {
    name: 'state-drift',
    category: 'recovering',
    description: 'State seems out of sync with disk',
    keywords: ['state drift', 'state mismatch', 'progress wrong'],
    sequence: [
      { cmd: '/god-repair', why: 'Detects and fixes drift between state.json and disk' }
    ]
  },
  {
    name: 'rerun-tier',
    category: 'recovering',
    description: 'Re-run a specific tier',
    keywords: ['rerun', 'redo tier', 'run again'],
    sequence: [
      { cmd: '/god-redo <tier>', why: 'Marks tier in-flight; downstream tiers also marked' }
    ]
  },
  {
    name: 'broken-install',
    category: 'recovering',
    description: 'Install seems broken or state is impossible',
    keywords: ['install broken', 'doctor', 'diagnose', 'something wrong'],
    sequence: [
      { cmd: '/god-doctor', why: 'Diagnose install + state, suggest fixes' }
    ]
  },

  // COLLABORATION
  {
    name: 'parallel-engineers',
    category: 'collaborating',
    description: 'Two engineers working on parallel features',
    keywords: ['team work', 'parallel engineers', 'two features', 'independent work'],
    sequence: [
      { cmd: '/god-workstream new <feature>', why: 'Each engineer gets isolated workstream' },
      { cmd: '/god-feature', why: 'Build the feature in the workstream' },
      { cmd: '/god-workstream merge <feature>', why: 'Merge back when ready' }
    ]
  },
  {
    name: 'pause-handoff',
    category: 'collaborating',
    description: 'Pause work, hand off to teammate',
    keywords: ['hand off', 'teammate takes over', 'pause for someone'],
    sequence: [
      { cmd: '/god-pause-work', why: 'Save HANDOFF.mdx with context' }
    ]
  },
  {
    name: 'clean-pr',
    category: 'collaborating',
    description: 'Create PR without exposing .godpowers/',
    keywords: ['pr branch', 'clean pr', 'filter planning'],
    sequence: [
      { cmd: '/god-pr-branch', why: 'Filter .godpowers/ commits from PR branch' }
    ]
  },

  // KNOWLEDGE
  {
    name: 'capture-idea',
    category: 'knowledge',
    description: 'Mid-flow idea, want to capture without disrupting',
    keywords: ['note', 'capture', 'remember this', 'quick note'],
    sequence: [
      { cmd: '/god-note "<idea>"', why: 'Zero-ceremony capture' }
    ]
  },
  {
    name: 'capture-todo',
    category: 'knowledge',
    description: 'Capture as a real todo with priority',
    keywords: ['todo', 'remind me', 'add task'],
    sequence: [
      { cmd: '/god-add-todo "<task>" --priority=<P0/P1/P2>', why: 'Tracked, routable to a workflow' }
    ]
  },
  {
    name: 'extract-learnings',
    category: 'knowledge',
    description: 'Capture institutional knowledge after a milestone',
    keywords: ['lessons learned', 'extract learnings', 'milestone done', 'capture knowledge'],
    sequence: [
      { cmd: '/god-extract-learnings', why: 'Decisions, lessons, patterns, surprises' }
    ]
  },

  // META
  {
    name: 'whats-next',
    category: 'meta',
    description: 'Want to know what to run next',
    keywords: ['whats next', 'what now', 'next step', 'next command'],
    sequence: [
      { cmd: '/god-next', why: 'Reads disk state, suggests with reason' }
    ]
  },
  {
    name: 'where-am-i',
    category: 'meta',
    description: 'See current project state',
    keywords: ['where am i', 'current state', 'project status'],
    sequence: [
      { cmd: '/god-status', why: 'Re-derive state from disk' }
    ]
  },
];

function gen(r) {
  const keywords = r.keywords.map(k => `    - "${k}"`).join('\n');
  const stateConds = (r.stateConditions || []).map(c => `    - "${c}"`).join('\n');
  const stateBlock = stateConds ? `\n  state-conditions:\n${stateConds}` : '';
  const steps = r.sequence.map(s => {
    const skipWhen = s.skipWhen ? `\n        skip-when: ${s.skipWhen}` : '';
    const why = s.why ? `\n        why: "${s.why}"` : '';
    return `      - command: "${s.cmd}"${why}${skipWhen}`;
  }).join('\n');

  return `apiVersion: godpowers/v1
kind: Recipe
metadata:
  name: ${r.name}
  category: ${r.category}
  description: "${r.description}"

triggers:
  intent-keywords:
${keywords}${stateBlock}

sequences:
  default:
    description: "${r.description}"
    steps:
${steps}

default-sequence: default
`;
}

let count = 0;
for (const r of recipes) {
  const filename = `${r.name}.yaml`;
  const filepath = path.join(OUT, filename);
  fs.writeFileSync(filepath, gen(r));
  count++;
}
console.log(`Generated ${count} recipe files in ${OUT}`);
