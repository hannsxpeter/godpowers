/**
 * Generated state views.
 *
 * Writes human-readable markdown views from .godpowers/state.json while
 * preserving user content outside managed fences.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const atomic = require('./atomic-write');

const FENCE_BEGIN = '<!-- godpowers:state-view:begin -->';
const FENCE_END = '<!-- godpowers:state-view:end -->';
const CHECKSUM_PREFIX = '<!-- godpowers:checksum ';
const CHECKSUM_SUFFIX = ' -->';
const PROGRESS_VIEW_PATH = '.godpowers/PROGRESS.md';
const TIER_STATE_VIEW_STEPS = [
  { tierKey: 'tier-1', subStepKey: 'design', relPath: '.godpowers/design/STATE.md' },
  { tierKey: 'tier-2', subStepKey: 'build', relPath: '.godpowers/build/STATE.md' },
  { tierKey: 'tier-3', subStepKey: 'deploy', relPath: '.godpowers/deploy/STATE.md' },
  { tierKey: 'tier-3', subStepKey: 'observe', relPath: '.godpowers/observe/STATE.md' },
  { tierKey: 'tier-3', subStepKey: 'launch', relPath: '.godpowers/launch/STATE.md' }
];
const TIER_STATE_VIEW_PATHS = TIER_STATE_VIEW_STEPS.map(step => step.relPath);
const VIEW_PATHS = [PROGRESS_VIEW_PATH, ...TIER_STATE_VIEW_PATHS];

const COMPLETE_STATUSES = new Set(['done', 'imported', 'skipped', 'not-required']);
const ACTIVE_STATUSES = new Set(['in-flight', 'failed', 're-invoked']);
const TIER_LABELS = {
  'tier-0': 'Orchestration',
  'tier-1': 'Planning',
  'tier-2': 'Building',
  'tier-3': 'Shipping'
};
const SUBSTEP_LABELS = {
  orchestration: 'Orchestration',
  prd: 'PRD',
  arch: 'Architecture',
  roadmap: 'Roadmap',
  stack: 'Stack',
  design: 'Design',
  product: 'Product',
  repo: 'Repo',
  build: 'Build',
  deploy: 'Deploy',
  observe: 'Observe',
  launch: 'Launch',
  harden: 'Harden'
};

function sha(content) {
  return `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
}

function cleanGeneratedText(value) {
  const text = value == null || value === '' ? '-' : String(value);
  return text
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\r?\n/g, ' ')
    .trim() || '-';
}

function tierNumber(tierKey) {
  const match = String(tierKey).match(/^tier-(\d+)$/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function labelFromKey(key) {
  return String(key)
    .split(/[-_]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function tierComparator(a, b) {
  const byNumber = tierNumber(a) - tierNumber(b);
  return byNumber === 0 ? String(a).localeCompare(String(b)) : byNumber;
}

function isCompleteStatus(status) {
  return COMPLETE_STATUSES.has(status);
}

function isActiveStatus(status) {
  return ACTIVE_STATUSES.has(status);
}

function escapeTable(value) {
  return cleanGeneratedText(value).replace(/\|/g, '\\|');
}

function orderedSubSteps(currentState) {
  if (!currentState || !currentState.tiers) return [];
  const steps = [];
  for (const tierKey of Object.keys(currentState.tiers).sort(tierComparator)) {
    const tier = currentState.tiers[tierKey] || {};
    for (const [subStepKey, subStep] of Object.entries(tier)) {
      const status = subStep && subStep.status ? subStep.status : 'pending';
      steps.push({
        tierKey,
        tierNumber: tierNumber(tierKey),
        tierLabel: TIER_LABELS[tierKey] || labelFromKey(tierKey),
        subStepKey,
        subStepLabel: SUBSTEP_LABELS[subStepKey] || labelFromKey(subStepKey),
        status,
        artifact: subStep && subStep.artifact,
        updated: subStep && subStep.updated
      });
    }
  }
  return steps.map((step, index) => ({ ...step, ordinal: index + 1 }));
}

function progressSummary(currentState) {
  const steps = orderedSubSteps(currentState);
  const total = steps.length;
  const completed = steps.filter(step => isCompleteStatus(step.status)).length;

  let currentIndex = steps.findIndex(step => isActiveStatus(step.status));
  if (currentIndex < 0) {
    currentIndex = steps.findIndex(step => !isCompleteStatus(step.status));
  }
  if (currentIndex < 0 && total > 0) currentIndex = total - 1;

  return {
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    completed,
    total,
    current: currentIndex >= 0 ? steps[currentIndex] : null
  };
}

function buildProgressBody(currentState) {
  const project = currentState && currentState.project ? currentState.project : {};
  const summary = progressSummary(currentState);
  const lines = [];

  lines.push('# Godpowers Progress');
  lines.push('');
  lines.push('- [DECISION] This file is a generated human-readable view of `.godpowers/state.json`.');
  lines.push('- [DECISION] The managed section may be replaced by Godpowers whenever project state changes.');
  lines.push('- [DECISION] Edit project state through Godpowers commands rather than editing this managed section.');
  lines.push(`- [DECISION] Project: ${cleanGeneratedText(project.name || 'unnamed')}.`);
  lines.push(`- [DECISION] Lifecycle phase: ${cleanGeneratedText((currentState && currentState['lifecycle-phase']) || 'unknown')}.`);
  if (summary.total > 0) {
    lines.push(`- [HYPOTHESIS] Workflow progress is ${summary.percent} percent with ${summary.completed} of ${summary.total} tracked steps complete.`);
    if (summary.current) {
      lines.push(`- [HYPOTHESIS] Current step is ${summary.current.tierLabel}: ${summary.current.subStepLabel} with status \`${summary.current.status}\`.`);
    }
  } else {
    lines.push('- [HYPOTHESIS] Workflow progress cannot be computed because no tracked steps exist.');
  }
  lines.push('');
  lines.push('## Workflow Steps');
  lines.push('');
  lines.push('| Step | Tier | Sub-step | Status | Artifact | Updated |');
  lines.push('|---|---|---|---|---|---|');
  for (const step of orderedSubSteps(currentState)) {
    lines.push([
      step.ordinal,
      escapeTable(step.tierLabel),
      escapeTable(step.subStepLabel),
      escapeTable(step.status),
      escapeTable(step.artifact),
      escapeTable(step.updated)
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }
  lines.push('');
  return lines.join('\n');
}

function tierStateViewDefinition(tierKey, subStepKey) {
  return TIER_STATE_VIEW_STEPS.find(step => step.tierKey === tierKey && step.subStepKey === subStepKey) || null;
}

function subStepForView(currentState, view) {
  const tiers = currentState && currentState.tiers ? currentState.tiers : {};
  const tier = tiers[view.tierKey] || {};
  return tier[view.subStepKey] || {};
}

function hasRecordedState(subStep) {
  if (!subStep || typeof subStep !== 'object') return false;
  if ((subStep.status || 'pending') !== 'pending') return true;
  if (subStep.artifact || subStep['artifact-hash'] || subStep.updated || subStep.notes || subStep['agent-version']) return true;
  if (Array.isArray(subStep['have-nots-passed']) && subStep['have-nots-passed'].length > 0) return true;
  return verificationCommands(subStep).length > 0;
}

function shouldWriteTierStateView(projectRoot, currentState, view) {
  const filePath = tierStateViewPath(projectRoot, view);
  return fs.existsSync(filePath) || hasRecordedState(subStepForView(currentState, view));
}

function tierStateViewsForState(projectRoot, currentState) {
  return TIER_STATE_VIEW_STEPS.filter(view => shouldWriteTierStateView(projectRoot, currentState, view));
}

function viewPathsForState(projectRoot, currentState) {
  return [
    PROGRESS_VIEW_PATH,
    ...tierStateViewsForState(projectRoot, currentState).map(view => view.relPath)
  ];
}

function verificationCommands(subStep) {
  if (!subStep || typeof subStep !== 'object') return [];
  const verification = subStep.verification && typeof subStep.verification === 'object'
    ? subStep.verification
    : {};
  const commands = verification.commands ||
    subStep.verificationCommands ||
    subStep['verification-commands'] ||
    [];
  return Array.isArray(commands) ? commands : [];
}

function commandName(entry) {
  if (!entry || typeof entry !== 'object') return '-';
  return entry.command || entry.cmd || entry.name || '-';
}

function commandStatus(entry) {
  if (!entry || typeof entry !== 'object') return '-';
  return entry.status || entry.result || entry.verdict || '-';
}

function buildTierStateBody(currentState, view) {
  const project = currentState && currentState.project ? currentState.project : {};
  const subStep = subStepForView(currentState, view);
  const tierLabel = TIER_LABELS[view.tierKey] || labelFromKey(view.tierKey);
  const subStepLabel = SUBSTEP_LABELS[view.subStepKey] || labelFromKey(view.subStepKey);
  const commands = verificationCommands(subStep);
  const fields = [
    ['Project', project.name || 'unnamed'],
    ['Step', `${view.tierKey}.${view.subStepKey}`],
    ['Tier', tierLabel],
    ['Sub-step', subStepLabel],
    ['Status', `\`${subStep.status || 'pending'}\``],
    ['Recorded artifact', subStep.artifact ? `\`${subStep.artifact}\`` : '-'],
    ['Updated', subStep.updated || '-'],
    ['Agent version', subStep['agent-version'] || '-'],
    ['Have-nots passed', Array.isArray(subStep['have-nots-passed']) && subStep['have-nots-passed'].length > 0
      ? subStep['have-nots-passed'].join(', ')
      : '-'],
    ['Notes', subStep.notes || '-'],
    ['Verification commands', String(commands.length)]
  ];
  const lines = [];

  lines.push(`# ${subStepLabel} State`);
  lines.push('');
  lines.push('- [DECISION] This file is a generated human-readable view of `.godpowers/state.json`.');
  lines.push('- [DECISION] The managed section may be replaced by Godpowers whenever project state changes.');
  lines.push(`- [DECISION] Edit \`${view.tierKey}.${view.subStepKey}\` through Godpowers commands rather than editing this managed section.`);
  lines.push('');
  lines.push('## State Fields');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('|---|---|');
  for (const [field, value] of fields) {
    lines.push(`| ${escapeTable(field)} | ${escapeTable(value)} |`);
  }
  lines.push('');
  lines.push('## Verification Commands');
  lines.push('');
  if (commands.length === 0) {
    lines.push('- [HYPOTHESIS] No verification commands are recorded for this step in `state.json`.');
  } else {
    lines.push('| Command | Status | Exit code | Ran at | Diagnostics |');
    lines.push('|---|---|---|---|---|');
    for (const entry of commands) {
      lines.push([
        escapeTable(commandName(entry)),
        escapeTable(commandStatus(entry)),
        escapeTable(Number.isInteger(entry.exitCode) ? String(entry.exitCode) : '-'),
        escapeTable(entry.ranAt || entry.updated || '-'),
        escapeTable(entry.diagnostics || '-')
      ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
    }
  }
  lines.push('');
  return lines.join('\n');
}

function parseManaged(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      exists: false,
      hasFence: false,
      before: '',
      body: '',
      checksum: null,
      after: '',
      validChecksum: null
    };
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const beginIdx = content.indexOf(FENCE_BEGIN);
  const endIdx = content.indexOf(FENCE_END);
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
    return {
      exists: true,
      hasFence: false,
      before: content,
      body: '',
      checksum: null,
      after: '',
      validChecksum: null
    };
  }

  const fenced = content.slice(beginIdx + FENCE_BEGIN.length, endIdx);
  const after = content.slice(endIdx + FENCE_END.length);
  const lines = fenced.replace(/^\r?\n/, '').replace(/\r?\n$/, '').split(/\r?\n/);
  const checksumLine = lines[0] || '';
  const checksum = checksumLine.startsWith(CHECKSUM_PREFIX) && checksumLine.endsWith(CHECKSUM_SUFFIX)
    ? checksumLine.slice(CHECKSUM_PREFIX.length, -CHECKSUM_SUFFIX.length)
    : null;
  const body = checksum ? lines.slice(1).join('\n') : lines.join('\n');
  return {
    exists: true,
    hasFence: true,
    before: content.slice(0, beginIdx),
    body,
    checksum,
    after,
    validChecksum: checksum ? checksum === sha(body) : false
  };
}

function fencedBlock(body) {
  return `${FENCE_BEGIN}\n${CHECKSUM_PREFIX}${sha(body)}${CHECKSUM_SUFFIX}\n${body}\n${FENCE_END}`;
}

function maybeWarn(parsed, filePath, opts) {
  if (!parsed.hasFence || parsed.validChecksum !== false) return;
  const relPath = opts.relPath || filePath;
  const warning = `Managed state view checksum mismatch in ${relPath}; replacing generated section from state.json.`;
  if (typeof opts.onWarning === 'function') opts.onWarning(warning);
}

function nextManagedContent(filePath, body, opts = {}) {
  const parsed = parseManaged(filePath);
  maybeWarn(parsed, filePath, opts);
  const block = fencedBlock(body);
  if (!parsed.exists) return `${block}\n`;
  if (!parsed.hasFence) {
    const sep = parsed.before.endsWith('\n\n') ? '' : (parsed.before.endsWith('\n') ? '\n' : '\n\n');
    return `${parsed.before}${sep}${block}\n`;
  }
  return `${parsed.before}${block}${parsed.after}`;
}

function writeManaged(filePath, body, opts = {}) {
  const next = nextManagedContent(filePath, body, opts);
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8') === next) {
    return { path: filePath, written: false };
  }
  atomic.writeFileAtomic(filePath, next);
  return { path: filePath, written: true };
}

async function writeManagedAsync(filePath, body, opts = {}) {
  const next = nextManagedContent(filePath, body, opts);
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8') === next) {
    return { path: filePath, written: false };
  }
  await atomic.writeFileAtomicAsync(filePath, next);
  return { path: filePath, written: true };
}

function progressPath(projectRoot) {
  return path.join(projectRoot, PROGRESS_VIEW_PATH);
}

function tierStateViewPath(projectRoot, view) {
  return path.join(projectRoot, view.relPath);
}

function writeProgress(projectRoot, currentState, opts = {}) {
  return writeManaged(progressPath(projectRoot), buildProgressBody(currentState), {
    ...opts,
    relPath: PROGRESS_VIEW_PATH
  });
}

async function writeProgressAsync(projectRoot, currentState, opts = {}) {
  return writeManagedAsync(progressPath(projectRoot), buildProgressBody(currentState), {
    ...opts,
    relPath: PROGRESS_VIEW_PATH
  });
}

function writeTierStateView(projectRoot, currentState, view, opts = {}) {
  return writeManaged(tierStateViewPath(projectRoot, view), buildTierStateBody(currentState, view), {
    ...opts,
    relPath: view.relPath
  });
}

async function writeTierStateViewAsync(projectRoot, currentState, view, opts = {}) {
  return writeManagedAsync(tierStateViewPath(projectRoot, view), buildTierStateBody(currentState, view), {
    ...opts,
    relPath: view.relPath
  });
}

function writeAll(projectRoot, currentState, opts = {}) {
  return [
    writeProgress(projectRoot, currentState, opts),
    ...tierStateViewsForState(projectRoot, currentState).map(view => writeTierStateView(projectRoot, currentState, view, opts))
  ];
}

async function writeAllAsync(projectRoot, currentState, opts = {}) {
  const results = [await writeProgressAsync(projectRoot, currentState, opts)];
  for (const view of tierStateViewsForState(projectRoot, currentState)) {
    results.push(await writeTierStateViewAsync(projectRoot, currentState, view, opts));
  }
  return results;
}

module.exports = {
  FENCE_BEGIN,
  FENCE_END,
  CHECKSUM_PREFIX,
  PROGRESS_VIEW_PATH,
  TIER_STATE_VIEW_STEPS,
  TIER_STATE_VIEW_PATHS,
  VIEW_PATHS,
  buildProgressBody,
  buildTierStateBody,
  parseManaged,
  writeManaged,
  writeManagedAsync,
  writeProgress,
  writeProgressAsync,
  writeTierStateView,
  writeTierStateViewAsync,
  writeAll,
  writeAllAsync,
  progressPath,
  tierStateViewDefinition,
  tierStateViewsForState,
  tierStateViewPath,
  viewPathsForState,
  sha
};
