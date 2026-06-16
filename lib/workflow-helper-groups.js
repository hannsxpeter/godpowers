/**
 * Workflow helper groups.
 *
 * Workflow YAML can use these groups to avoid repeating long closeout helper
 * lists. Plans still expand them into exact helper names for visibility.
 */

const HELPER_GROUPS = {
  'context-bootstrap': [
    'pillars-detect',
    'pillars-init'
  ],
  'standard-closeout': [
    'repo-doc-sync',
    'repo-surface-sync',
    'checkpoint-sync',
    'pillars-sync-plan'
  ],
  'repo-maintenance-closeout': [
    'repo-doc-sync',
    'repo-surface-sync'
  ],
  'runtime-awareness-closeout': [
    'feature-awareness',
    'host-capabilities'
  ],
  'release-readiness-closeout': [
    'route-quality-sync',
    'recipe-coverage-sync',
    'release-surface-sync'
  ],
  'source-sync-closeout': [
    'source-sync-back'
  ]
};

function expand(groups = [], helpers = []) {
  const expanded = [];
  const names = Array.isArray(groups) ? groups : [groups].filter(Boolean);
  for (const group of names) {
    for (const helper of HELPER_GROUPS[group] || []) {
      if (!expanded.includes(helper)) expanded.push(helper);
    }
  }
  for (const helper of helpers || []) {
    if (!expanded.includes(helper)) expanded.push(helper);
  }
  return expanded;
}

module.exports = {
  HELPER_GROUPS,
  expand
};
