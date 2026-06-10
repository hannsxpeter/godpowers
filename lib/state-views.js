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
  const text = value == null || value === '' ? '-' : String(value);
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
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
  lines.push(`- [DECISION] Project: ${project.name || 'unnamed'}.`);
  lines.push(`- [DECISION] Lifecycle phase: ${(currentState && currentState['lifecycle-phase']) || 'unknown'}.`);
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

function writeAll(projectRoot, currentState, opts = {}) {
  return [writeProgress(projectRoot, currentState, opts)];
}

async function writeAllAsync(projectRoot, currentState, opts = {}) {
  return [await writeProgressAsync(projectRoot, currentState, opts)];
}

module.exports = {
  FENCE_BEGIN,
  FENCE_END,
  CHECKSUM_PREFIX,
  PROGRESS_VIEW_PATH,
  buildProgressBody,
  parseManaged,
  writeManaged,
  writeManagedAsync,
  writeProgress,
  writeProgressAsync,
  writeAll,
  writeAllAsync,
  progressPath,
  sha
};
