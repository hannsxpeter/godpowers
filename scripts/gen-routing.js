#!/usr/bin/env node
/**
 * Generate routing YAML files for the remaining commands.
 * One-shot script. Run once.
 */

const fs = require('fs');
const path = require('path');
const commandFamilies = require('../lib/command-families');

const OUT = path.join(__dirname, '..', 'routing');
const SAFE_SYNC_PREREQ = {
  check: 'safe-sync-clear',
  autoComplete: '/god-reconcile Release Truth And Safe Sync',
  humanRequired: true
};

const commands = [
  // Tier 1 (remaining)
  {
    cmd: '/god-stack', tier: 1, agent: 'god-stack-selector', desc: 'Pick technology stack',
    gateTier: 'stack',
    prereq: ['state:tier-1.arch.status == done'],
    autoCompletePrereq: '/god-arch',
    template: 'STACK-DECISION.md',
    writes: ['.godpowers/stack/DECISION.md'],
    haveNots: ['S-01','S-02','S-03','S-04','S-05'],
    next: '/god-repo',
  },

  // Tier 2
  {
    cmd: '/god-repo', tier: 2, agent: 'god-repo-scaffolder', desc: 'Scaffold the repository',
    gateTier: 'repo',
    prereq: ['state:tier-1.stack.status == done'],
    autoCompletePrereq: '/god-stack',
    writes: ['.godpowers/repo/AUDIT.md', 'repo source files'],
    haveNots: ['RP-01','RP-02','RP-03','RP-04','RP-05','RP-06','RP-07','RP-08'],
    next: '/god-build',
  },
  {
    cmd: '/god-build', tier: 2, agent: 'god-planner',
    desc: 'Build slices with TDD enforcement and two-stage review',
    gateTier: 'build',
    prereq: ['state:tier-1.roadmap.status == done', 'state:tier-2.repo.status == done'],
    autoCompletePrereq: '/god-roadmap',
    secondarySpawns: ['god-executor', 'god-spec-reviewer', 'god-quality-reviewer'],
    writes: ['.godpowers/build/PLAN.md', '.godpowers/build/STATE.md', 'source code'],
    haveNots: ['B-01','B-02','B-03','B-04','B-05','B-06','B-07','B-08','B-09','B-10','B-11','B-12'],
    next: '/god-deploy',
    altWhen: { '/god-harden': 'parallel-with-deploy' },
  },

  // Tier 3
  {
    cmd: '/god-deploy', tier: 3, agent: 'god-deploy-engineer', desc: 'Set up deploy pipeline',
    prereq: ['state:tier-2.build.status == done'],
    extraPrereq: [SAFE_SYNC_PREREQ],
    autoCompletePrereq: '/god-build',
    writes: ['.godpowers/deploy/STATE.md'],
    haveNots: ['D-01','D-02','D-03','D-04','D-05','D-06','D-07','D-08'],
    next: '/god-observe',
  },
  {
    cmd: '/god-observe', tier: 3, agent: 'god-observability-engineer', desc: 'Wire observability',
    prereq: ['state:tier-3.deploy.status == done'],
    extraPrereq: [SAFE_SYNC_PREREQ],
    autoCompletePrereq: '/god-deploy',
    writes: ['.godpowers/observe/STATE.md'],
    haveNots: ['OB-01','OB-02','OB-03','OB-04','OB-05','OB-06','OB-07','OB-08'],
    next: '/god-harden',
  },
  {
    cmd: '/god-harden', tier: 3, agent: 'god-harden-auditor', desc: 'Adversarial security review',
    gateTier: 'harden',
    prereq: ['state:tier-2.build.status == done'],
    extraPrereq: [SAFE_SYNC_PREREQ],
    autoCompletePrereq: '/god-build',
    writes: ['.godpowers/harden/FINDINGS.md'],
    haveNots: ['H-01','H-02','H-03','H-04','H-05','H-06','H-07','H-08','H-09','H-10','H-11'],
    next: '/god-launch',
    blocksOn: { 'critical-finding': 'pause-required' },
  },
  {
    cmd: '/god-launch', tier: 3, agent: 'god-launch-strategist', desc: 'Launch the product',
    prereq: ['state:tier-3.harden.status == done', 'no-critical-findings'],
    extraPrereq: [SAFE_SYNC_PREREQ],
    autoCompletePrereq: '/god-harden',
    writes: ['.godpowers/launch/STATE.md'],
    haveNots: ['L-01','L-02','L-03','L-04','L-05','L-06','L-07','L-08'],
    next: 'steady-state',
    lifecycleTransition: 'in-arc -> steady-state-active',
  },

  // Beyond greenfield
  {
    cmd: '/god-feature', tier: 0, agent: 'god-pm', desc: 'Add feature to existing project',
    prereq: ['state:lifecycle-phase == steady-state-active OR state:tier-1.arch.status == done'],
    autoCompletePrereq: '/god-init',
    secondarySpawns: ['god-architect', 'god-planner', 'god-executor', 'god-spec-reviewer', 'god-quality-reviewer', 'god-harden-auditor', 'god-launch-strategist'],
    writes: ['.godpowers/features/<slug>/PRD.md', 'feature code'],
    next: '/god-status',
  },
  {
    cmd: '/god-hotfix', tier: 0, agent: 'god-debugger', desc: 'Urgent production bug fix',
    prereq: ['state:lifecycle-phase == steady-state-active'],
    secondarySpawns: ['god-executor', 'god-spec-reviewer', 'god-quality-reviewer', 'god-deploy-engineer', 'god-observability-engineer'],
    writes: ['regression test', 'fix commit', 'deploy'],
    next: '/god-postmortem',
    lifecycleTransition: 'steady-state-active -> post-incident-pending',
  },
  {
    cmd: '/god-postmortem', tier: 0, agent: 'god-incident-investigator', desc: 'Post-incident investigation',
    prereq: ['state:lifecycle-phase == post-incident-pending OR incident-resolved'],
    secondarySpawns: ['god-docs-writer'],
    writes: ['.godpowers/postmortems/<id>/POSTMORTEM.md'],
    haveNots: ['PM-01','PM-02','PM-03','PM-04','PM-05','PM-06','PM-07','PM-08'],
    next: '/god-status',
    lifecycleTransition: 'post-incident-pending -> steady-state-active',
  },
  {
    cmd: '/god-refactor', tier: 0, agent: 'god-explorer', desc: 'Safe refactor with TDD',
    prereq: ['state:tier-2.repo.status == done', 'tests-exist-on-affected-surface'],
    autoCompletePrereq: '/god-add-tests',
    secondarySpawns: ['god-auditor', 'god-planner', 'god-executor', 'god-spec-reviewer', 'god-quality-reviewer'],
    next: '/god-status',
  },
  {
    cmd: '/god-spike', tier: 0, agent: 'god-spike-runner', desc: 'Time-boxed research',
    prereq: [],
    writes: ['.godpowers/spikes/<slug>/SPIKE.md'],
    haveNots: ['SP-01','SP-02','SP-03','SP-04','SP-05'],
    next: '/god-feature',
    altWhen: { '/god-spike': 'inconclusive-needs-narrower-question' },
  },
  {
    cmd: '/god-upgrade', tier: 0, agent: 'god-migration-strategist', desc: 'Framework migration',
    prereq: ['state:tier-2.build.status == done'],
    secondarySpawns: ['god-planner', 'god-executor', 'god-spec-reviewer', 'god-quality-reviewer', 'god-deploy-engineer', 'god-observability-engineer'],
    writes: ['.godpowers/migrations/<slug>/MIGRATION.md'],
    haveNots: ['MG-01','MG-02','MG-03','MG-04','MG-05','MG-06','MG-07'],
    next: '/god-status',
  },
  {
    cmd: '/god-docs', tier: 0, agent: 'god-docs-writer', desc: 'Documentation work',
    prereq: [],
    writes: ['.godpowers/docs/UPDATE-LOG.md', 'README and docs'],
    haveNots: ['DC-01','DC-02','DC-03','DC-04','DC-05'],
    next: '/god-status',
  },
  {
    cmd: '/god-update-deps', tier: 0, agent: 'god-deps-auditor', desc: 'Audit and update dependencies',
    prereq: ['state:tier-2.repo.status == done'],
    secondarySpawns: ['god-executor', 'god-quality-reviewer'],
    writes: ['.godpowers/deps/AUDIT.md'],
    haveNots: ['DP-01','DP-02','DP-03','DP-04','DP-05','DP-06'],
    next: '/god-upgrade',
    altWhen: { '/god-status': 'no-major-bumps' },
  },
  {
    cmd: '/god-audit', tier: 0, agent: 'god-auditor', desc: 'Score artifacts against have-nots',
    prereq: ['file:.godpowers/PROGRESS.md'],
    autoCompletePrereq: '/god-init',
    writes: ['.godpowers/AUDIT-REPORT.md'],
    next: '/god-status',
    altWhen: { '/god-redo': 'failures-found' },
  },
  {
    cmd: '/god-preflight', tier: 0, agent: 'god-auditor', desc: 'Read-only intake audit before project-run readiness and pillars',
    prereq: ['codebase-present'],
    writes: ['.godpowers/preflight/PREFLIGHT.md'],
    next: '/god-archaeology',
    altWhen: {
      '/god-init': 'missing-basic-project-state',
      '/god-reconstruct': 'planning-artifacts-missing',
      '/god-tech-debt': 'debt-dominates-risk',
      '/god-audit': 'artifacts-exist',
    },
  },
  {
    cmd: '/god-hygiene', tier: 0, agent: 'god-auditor', desc: 'Composite health check',
    prereq: ['state:lifecycle-phase == steady-state-active'],
    secondarySpawns: ['god-deps-auditor', 'god-docs-writer'],
    writes: ['.godpowers/HYGIENE-REPORT.md'],
    next: '/god-status',
  },
  {
    cmd: '/god-mode', tier: 0, agent: 'god-orchestrator', desc: 'Full autonomous project run',
    prereq: ['file:.godpowers/PROGRESS.md OR mode-A-greenfield'],
    extraPrereq: [SAFE_SYNC_PREREQ],
    autoCompletePrereq: '/god-init',
    secondarySpawns: ['god-auditor', 'god-pm', 'god-architect', 'god-roadmapper', 'god-stack-selector', 'god-repo-scaffolder', 'god-planner', 'god-executor', 'god-spec-reviewer', 'god-quality-reviewer', 'god-deploy-engineer', 'god-observability-engineer', 'god-harden-auditor', 'god-launch-strategist'],
    next: 'steady-state',
    lifecycleTransition: 'pre-init/in-arc -> steady-state-active',
  },

  // Recovery & meta
  { cmd: '/god-status', tier: 0, agent: 'built-in', desc: 'Re-derive state from disk', prereq: [], writes: [], next: '/god-next' },
  { cmd: '/god-next', tier: 0, agent: 'built-in', desc: 'Suggest next command', prereq: [], writes: [], next: 'varies' },
  { cmd: '/god-help', tier: 0, agent: 'built-in', desc: 'Discoverable contextual help', prereq: [], writes: [], next: 'varies' },
  { cmd: '/god-doctor', tier: 0, agent: 'built-in', desc: 'Diagnose install + state', prereq: [], writes: [], next: 'varies' },
  { cmd: '/god-undo', tier: 0, agent: 'built-in', desc: 'Revert last operation', prereq: ['file:.godpowers/log'], writes: [], next: '/god-status' },
  { cmd: '/god-redo', tier: 0, agent: 'built-in', desc: 'Re-run a tier and downstream', prereq: [], writes: [], next: 'varies' },
  { cmd: '/god-skip', tier: 0, agent: 'built-in', desc: 'Explicit skip with audit', prereq: [], writes: [], next: '/god-next' },
  { cmd: '/god-repair', tier: 0, agent: 'built-in', desc: 'Fix detected drift', prereq: [], writes: [], next: '/god-status' },
  { cmd: '/god-rollback', tier: 0, agent: 'built-in', desc: 'Walk back tier and downstream', prereq: [], writes: [], next: '/god-status' },
  { cmd: '/god-restore', tier: 0, agent: 'built-in', desc: 'Recover from .trash/', prereq: [], writes: [], next: '/god-status' },
  { cmd: '/god-debug', tier: 0, agent: 'god-debugger', desc: '4-phase systematic debug', prereq: [], writes: ['regression test', 'fix'], next: '/god-status' },
  { cmd: '/god-review', tier: 0, agent: 'god-spec-reviewer', desc: 'Two-stage code review', prereq: [], secondarySpawns: ['god-quality-reviewer'], writes: [], next: '/god-status' },
  { cmd: '/god-fast', tier: 0, agent: 'built-in', desc: 'Trivial inline edit', prereq: [], writes: [], next: '/god-status' },
  { cmd: '/god-quick', tier: 0, agent: 'god-planner', desc: 'Small task with TDD', prereq: [], secondarySpawns: ['god-executor', 'god-spec-reviewer', 'god-quality-reviewer'], writes: [], next: '/god-status' },
  { cmd: '/god-explore', tier: 0, agent: 'god-explorer', desc: 'Pre-init Socratic ideation', prereq: [], writes: ['.godpowers/explore/<slug>.md'], next: '/god-init' },
  { cmd: '/god-discuss', tier: 0, agent: 'god-explorer', desc: 'Pre-planning discussion', prereq: [], writes: ['.godpowers/discussions/<topic>.md'], next: 'varies' },
  { cmd: '/god-list-assumptions', tier: 0, agent: 'god-explorer', desc: 'Surface assumptions', prereq: [], writes: [], next: 'varies' },
  { cmd: '/god-add-tests', tier: 0, agent: 'god-executor', desc: 'Add tests to legacy code', prereq: ['state:tier-2.repo.status == done'], writes: [], next: '/god-refactor' },
  { cmd: '/god-pause-work', tier: 0, agent: 'built-in', desc: 'Save context handoff', prereq: [], writes: ['.godpowers/HANDOFF.md'], next: 'session-end' },
  { cmd: '/god-resume-work', tier: 0, agent: 'built-in', desc: 'Restore from handoff', prereq: ['file:.godpowers/HANDOFF.md'], writes: [], next: 'varies' },
  { cmd: '/god-lifecycle', tier: 0, agent: 'built-in', desc: 'Show project phase', prereq: [], writes: [], next: 'varies' },
];

function generate(c) {
  const family = commandFamilies.familyForCommand(c.cmd);
  const familyLine = family ? `  family: ${family.id}\n` : '';
  const writes = c.writes && c.writes.length ? c.writes.map(w => `    - ${w}`).join('\n') : '    []';
  const haveNots = c.haveNots && c.haveNots.length
    ? `  have-nots: [${c.haveNots.join(', ')}]\n  gate-on-failure: pause-for-user`
    : '';
  const gateCommand = c.gateTier
    ? `\n  gate-command: npx godpowers gate --tier=${c.gateTier} --project=.`
    : '';
  const standards = c.haveNots && c.haveNots.length
    ? `\nstandards:\n  substitution-test: true\n  three-label-test: true\n${haveNots}${gateCommand}`
    : '';
  const prereqs = [
    ...(c.prereq || []),
    ...(c.extraPrereq || [])
  ];
  const prereq = prereqs.length
    ? prereqs.map(p => formatPrereq(p, c)).join('\n')
    : '    []';
  const secondarySpawns = c.secondarySpawns && c.secondarySpawns.length
    ? `\n  secondary-spawns: [${c.secondarySpawns.join(', ')}]`
    : '';
  const blocksOn = c.blocksOn
    ? `\n  blocks-on:\n` + Object.entries(c.blocksOn).map(([k, v]) => `    - ${k}: ${v}`).join('\n')
    : '';
  const altWhen = c.altWhen
    ? Object.entries(c.altWhen).map(([cmd, when]) => `    - command: ${cmd}\n      when: ${when}`).join('\n')
    : '';
  const lifecycle = c.lifecycleTransition ? `\n  lifecycle-transition: ${c.lifecycleTransition}` : '';
  const outcome = renderOutcome(c.next);

  return `apiVersion: godpowers/v1
kind: CommandRouting
metadata:
  command: ${c.cmd}
  description: ${c.desc}
  tier: ${c.tier}
${familyLine}

prerequisites:
  required:
${prereq}

execution:
  spawns: [${c.agent}]
  context: fresh${secondarySpawns}
  writes:
${writes}${blocksOn}
${standards}

success-path:
  next-recommended: ${c.next}${outcome}${altWhen ? '\n  alternatives:\n' + altWhen : ''}

failure-path:
  on-error: /god-doctor

endoff:
  state-update: tier-${c.tier} updated for ${c.cmd}
  events: [agent.start, artifact.created, agent.end]${lifecycle}
`;
}

function renderOutcome(next) {
  const type = inferOutcomeType(next);
  if (!type) return '';
  const detail = outcomeDetail(type, next);
  return `
  outcome:
    type: ${type}
    label: ${detail.label}
    reason: ${detail.reason}
    allowed-next: [${detail.allowedNext.join(', ')}]`;
}

function inferOutcomeType(next) {
  if (next === 'varies') return 'contextual';
  if (next === 'varies-by-verdict') return 'verdict-based';
  if (next === 'steady-state') return 'steady-state';
  if (next === 'session-end') return 'session-end';
  if (/\s+or\s+/.test(String(next))) return 'requires-selection';
  return null;
}

function outcomeDetail(type, next) {
  if (type === 'requires-selection') {
    return {
      label: 'User selection required',
      reason: 'The route offers multiple valid next commands and the user should choose one.',
      allowedNext: [...new Set(String(next).match(/\/god(?:-[a-z-]+)?/g) || [])]
    };
  }
  const byType = {
    contextual: {
      label: 'Context-specific next route',
      reason: 'The next route depends on current disk state, command arguments, or user choice.',
      allowedNext: ['/god-status', '/god-next', '/god-help']
    },
    'verdict-based': {
      label: 'Verdict-based next route',
      reason: 'The next route depends on the returned verdict.',
      allowedNext: ['/god-status', '/god-next', '/god-discuss']
    },
    'steady-state': {
      label: 'Steady state',
      reason: 'The project run has completed and ongoing work should start from steady-state commands.',
      allowedNext: ['/god-status', '/god-feature', '/god-hygiene']
    },
    'session-end': {
      label: 'Session handoff complete',
      reason: 'The command intentionally ends the active work session.',
      allowedNext: ['/god-resume-work', '/god-status']
    }
  };
  return byType[type];
}

function formatPrereq(prereq, command) {
  const check = typeof prereq === 'string' ? prereq : prereq.check;
  const autoComplete = typeof prereq === 'string'
    ? command.autoCompletePrereq
    : prereq.autoComplete;
  const humanRequired = typeof prereq === 'string'
    ? true
    : prereq.humanRequired !== false;

  if (autoComplete) {
    return `    - check: ${check}\n      auto-complete: ${autoComplete}\n      human-required: ${humanRequired}`;
  }
  return `    - check: ${check}`;
}

let count = 0;
for (const c of commands) {
  const filename = c.cmd.replace('/god-', 'god-') + '.yaml';
  const filepath = path.join(OUT, filename);
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, generate(c));
    count++;
  }
}
console.log(`Generated ${count} routing files in ${OUT}`);
