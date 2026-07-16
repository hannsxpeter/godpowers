const COMMON = [
  'god',
  'god-first-run',
  'god-demo',
  'god-help',
  'god-surface',
  'god-status',
  'god-version'
];

const PROFILE_SKILLS = {
  starter: [
    'god',
    'god-first-run',
    'god-help',
    'god-status',
    'god-init',
    'god-plan',
    'god-build',
    'god-ship'
  ],
  core: [
    ...COMMON,
    'god-init',
    'god-plan',
    'god-mode',
    'god-build',
    'god-fix',
    'god-ship',
    'god-sync',
    'god-undo'
  ],
  builder: [
    ...COMMON,
    'god-next',
    'god-progress',
    'god-doctor',
    'god-settings',
    'god-init',
    'god-plan',
    'god-mode',
    'god-loop',
    'god-discuss',
    'god-explore',
    'god-list-assumptions',
    'god-prd',
    'god-design',
    'god-design-impact',
    'god-arch',
    'god-roadmap',
    'god-stack',
    'god-repo',
    'god-build',
    'god-fix',
    'god-add-tests',
    'god-feature',
    'god-story',
    'god-stories',
    'god-story-build',
    'god-story-verify',
    'god-story-close',
    'god-review',
    'god-ship',
    'god-audit',
    'god-capture',
    'god-test-runtime',
    'god-sync',
    'god-undo',
    'god-extend',
    'god-quick',
    'god-fast'
  ],
  maintainer: [
    ...COMMON,
    'god-next',
    'god-progress',
    'god-doctor',
    'god-settings',
    'god-audit',
    'god-fix',
    'god-ship',
    'god-capture',
    'god-undo',
    'god-extend',
    'god-hygiene',
    'god-update-deps',
    'god-docs',
    'god-repair',
    'god-lint',
    'god-standards',
    'god-preflight',
    'god-agent-audit',
    'god-context',
    'god-context-scan',
    'god-scan',
    'god-link',
    'god-review-changes',
    'god-reconcile',
    'god-reconstruct',
    'god-migrate',
    'god-automation-status',
    'god-automation-setup',
    'god-connect',
    'god-loop',
    'god-extension-scaffold',
    'god-extension-add',
    'god-extension-list',
    'god-extension-info',
    'god-extension-remove',
    'god-test-extension',
    'god-budget',
    'god-cost',
    'god-cache-clear',
    'god-logs',
    'god-metrics',
    'god-trace',
    'god-export-otel',
    'god-dogfood',
    'god-quick',
    'god-fast'
  ],
  suite: [
    ...COMMON,
    'god-next',
    'god-progress',
    'god-doctor',
    'god-settings',
    'god-sync',
    'god-undo',
    'god-suite-init',
    'god-suite-status',
    'god-suite-sync',
    'god-suite-patch',
    'god-suite-release',
    'god-workstream',
    'god-pr-branch',
    'god-reconcile',
    'god-review',
    'god-quick',
    'god-fast'
  ]
};

const PROFILE_DESCRIPTIONS = {
  starter: 'the eight-command 80% path for a first project: front door, first-run, help, status, and init to plan to build to ship',
  core: 'first-run guidance, front door, status, verbs, surface control, and autonomous compatibility',
  builder: 'core plus planning leaves, stories, and runtime verification',
  maintainer: 'core plus hygiene, deps, docs, repair, automation, and extensions',
  suite: 'core plus multi-repo suite and workstream coordination',
  full: 'all shipped slash commands'
};

function normalizeProfiles(value) {
  if (!value) return ['core'];
  const raw = String(value)
    .split(',')
    .map(part => part.trim().toLowerCase())
    .filter(Boolean);
  const profiles = raw.length > 0 ? raw : ['core'];
  for (const profile of profiles) {
    if (profile !== 'full' && !PROFILE_SKILLS[profile]) {
      throw new Error(`Unknown install profile: ${profile}`);
    }
  }
  if (profiles.includes('full')) return ['full'];
  return [...new Set(profiles)];
}

function selectedSkillNames(profileValue, availableNames) {
  const profiles = normalizeProfiles(profileValue);
  if (profiles.includes('full')) return new Set(availableNames);
  const selected = new Set();
  for (const profile of profiles) {
    for (const name of PROFILE_SKILLS[profile]) {
      if (availableNames.includes(name)) selected.add(name);
    }
  }
  return selected;
}

function describeProfiles(profileValue) {
  return normalizeProfiles(profileValue)
    .map(profile => `${profile}: ${PROFILE_DESCRIPTIONS[profile]}`)
    .join('; ');
}

module.exports = {
  PROFILE_SKILLS,
  PROFILE_DESCRIPTIONS,
  normalizeProfiles,
  selectedSkillNames,
  describeProfiles
};
