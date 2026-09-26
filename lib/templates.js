/**
 * Starting content for the three hand-edited Godpowers files.
 */

const frontmatter = require('./frontmatter');

const GOAL_PLACEHOLDER = 'Not set yet. Say who this is for and what success looks like.';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function stateTemplate({ project, goal, verify, stage = 'plan', date = today(), now, next, risks }) {
  const data = { godpowers: 7, project, stage, verify: verify || '', updated: date };
  const body = [
    `# ${project}`,
    '',
    '## Goal',
    goal || GOAL_PLACEHOLDER,
    '',
    '## Now',
    ...(now && now.length ? now : ['- Nothing in progress.']).map(line => (line.startsWith('- ') ? line : `- ${line}`)),
    '',
    '## Next',
    ...(next && next.length ? next : ['- Run /god with the goal; it plans first only when the requirements are not already clear.']).map(line => (line.startsWith('- ') ? line : `- ${line}`)),
    '',
    '## Risks',
    ...(risks && risks.length ? risks : ['- none']),
    ''
  ].join('\n');
  return frontmatter.stringify(data, body);
}

function planTemplate({ goal, extra } = {}) {
  return [
    '# Plan',
    '',
    '## Goal',
    goal || GOAL_PLACEHOLDER,
    '',
    '## Requirements',
    '- R1: (requirement). Done when: (observable check).',
    '',
    '## Non-goals',
    '- (what is deliberately out of scope)',
    '',
    '## Design',
    '(Structure, data, interfaces, and failure handling that matter. Name real files.)',
    '',
    '## Slices',
    '- [ ] 1. (thin end-to-end slice): (how it is verified)',
    '',
    '## Open questions',
    '- none',
    ...(extra ? ['', extra] : []),
    ''
  ].join('\n');
}

function decisionsTemplate({ date = today(), entries = [] } = {}) {
  const lines = [
    '# Decisions',
    '',
    'Append-only. Newest last. To change a decision, add an entry that supersedes it.',
    ''
  ];
  for (const entry of entries) {
    lines.push(`## ${entry.date || date}: ${entry.title}`);
    if (entry.context) lines.push(`Context: ${entry.context}`);
    if (entry.decision) lines.push(`Decision: ${entry.decision}`);
    if (entry.why) lines.push(`Why: ${entry.why}`);
    lines.push('');
  }
  return lines.join('\n');
}

module.exports = { GOAL_PLACEHOLDER, today, stateTemplate, planTemplate, decisionsTemplate };
