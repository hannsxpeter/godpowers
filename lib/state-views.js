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
const { legacyTwin } = require('./sync-fs');

const FENCE_BEGIN = '<!-- godpowers:state-view:begin -->';
const FENCE_END = '<!-- godpowers:state-view:end -->';
const CHECKSUM_PREFIX = '<!-- godpowers:checksum ';
const CHECKSUM_SUFFIX = ' -->';
const PROGRESS_VIEW_PATH = '.godpowers/PROGRESS.mdx';
const STATE_VIEW_SPECS = [
  { tierKey: 'tier-1', subStepKey: 'design', relPath: '.godpowers/design/STATE.mdx' },
  { tierKey: 'tier-2', subStepKey: 'build', relPath: '.godpowers/build/STATE.mdx' },
  { tierKey: 'tier-3', subStepKey: 'deploy', relPath: '.godpowers/deploy/STATE.mdx' },
  { tierKey: 'tier-3', subStepKey: 'observe', relPath: '.godpowers/observe/STATE.mdx' },
  { tierKey: 'tier-3', subStepKey: 'launch', relPath: '.godpowers/launch/STATE.mdx' }
];
const STATE_VIEW_PATHS = Object.freeze(STATE_VIEW_SPECS.reduce((acc, spec) => {
  acc[spec.subStepKey] = spec.relPath;
  return acc;
}, {}));
const KNOWN_SUBSTEP_FIELDS = new Set([
  'status',
  'artifact',
  'artifact-hash',
  'agent-version',
  'have-nots-passed',
  'updated',
  'notes',
  'verification'
]);

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

function formatValue(value) {
  if (value == null || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function subStepForSpec(currentState, spec) {
  return currentState &&
    currentState.tiers &&
    currentState.tiers[spec.tierKey] &&
    currentState.tiers[spec.tierKey][spec.subStepKey]
    ? currentState.tiers[spec.tierKey][spec.subStepKey]
    : null;
}

function existingStateViewSpecs(currentState) {
  return STATE_VIEW_SPECS.filter(spec => subStepForSpec(currentState, spec));
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

function buildVerificationLines(subStep) {
  const commands = subStep &&
    subStep.verification &&
    Array.isArray(subStep.verification.commands)
    ? subStep.verification.commands
    : [];
  const lines = [];

  lines.push('## Verification Commands');
  lines.push('');
  if (commands.length === 0) {
    lines.push('- [HYPOTHESIS] No verification command evidence is recorded in `state.json` for this step.');
    lines.push('');
    return lines;
  }

  lines.push('| Command | Status | Exit code | Ran at | Duration ms | Diagnostics |');
  lines.push('|---|---|---|---|---|---|');
  for (const command of commands) {
    lines.push([
      command.command,
      command.status,
      command.exitCode,
      command.ranAt,
      command.durationMs,
      command.diagnostics
    ].map(escapeTable).join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }
  lines.push('');
  return lines;
}

function buildEvidenceLines(subStep) {
  const entries = Object.entries(subStep || {})
    .filter(([key]) => !KNOWN_SUBSTEP_FIELDS.has(key))
    .sort(([a], [b]) => a.localeCompare(b));
  const lines = [];

  lines.push('## Evidence Fields');
  lines.push('');
  if (entries.length === 0) {
    lines.push('- [HYPOTHESIS] No additional evidence fields are recorded in `state.json` for this step.');
    lines.push('');
    return lines;
  }

  lines.push('| Field | Value |');
  lines.push('|---|---|');
  for (const [key, value] of entries) {
    lines.push(`| ${escapeTable(key)} | ${escapeTable(formatValue(value))} |`);
  }
  lines.push('');
  return lines;
}

function buildStateViewBody(currentState, spec) {
  const project = currentState && currentState.project ? currentState.project : {};
  const subStep = subStepForSpec(currentState, spec) || {};
  const status = subStep.status || 'pending';
  const tierLabel = TIER_LABELS[spec.tierKey] || labelFromKey(spec.tierKey);
  const subStepLabel = SUBSTEP_LABELS[spec.subStepKey] || labelFromKey(spec.subStepKey);
  const lines = [];

  lines.push(`# Godpowers ${subStepLabel} State`);
  lines.push('');
  lines.push(`- [DECISION] This file is a generated human-readable view of \`.godpowers/state.json\` for \`${spec.tierKey}.${spec.subStepKey}\`.`);
  lines.push('- [DECISION] The managed section may be replaced by Godpowers whenever project state changes.');
  lines.push('- [DECISION] Edit project state through Godpowers commands or owning command wrappers rather than editing this managed section.');
  lines.push(`- [DECISION] Project: ${project.name || 'unnamed'}.`);
  lines.push(`- [DECISION] Step: ${tierLabel}: ${subStepLabel}.`);
  lines.push(`- [DECISION] Status: \`${status}\`.`);
  if (subStep.artifact) {
    lines.push(`- [DECISION] Artifact: \`.godpowers/${subStep.artifact}\`.`);
  } else {
    lines.push('- [HYPOTHESIS] No artifact path is recorded in `state.json` for this step.');
  }
  if (subStep.updated) {
    lines.push(`- [DECISION] Updated: ${subStep.updated}.`);
  } else {
    lines.push('- [HYPOTHESIS] No updated timestamp is recorded in `state.json` for this step.');
  }
  if (subStep.notes) {
    lines.push(`- [DECISION] Notes: ${String(subStep.notes).replace(/\r?\n/g, ' ')}.`);
  }
  lines.push('');
  lines.push(...buildVerificationLines(subStep));
  lines.push(...buildEvidenceLines(subStep));
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

function nextManagedContent(sourcePath, body, opts = {}) {
  const parsed = parseManaged(sourcePath);
  maybeWarn(parsed, sourcePath, opts);
  const block = fencedBlock(body);
  if (!parsed.exists) return `${block}\n`;
  if (!parsed.hasFence) {
    const sep = parsed.before.endsWith('\n\n') ? '' : (parsed.before.endsWith('\n') ? '\n' : '\n\n');
    return `${parsed.before}${sep}${block}\n`;
  }
  return `${parsed.before}${block}${parsed.after}`;
}

// Content of a view outside the managed fence (human notes around the
// generated block). Returns '' for a missing file or one with no fence
// (whole-file content is treated as out-of-fence).
function outOfFenceText(filePath) {
  const parsed = parseManaged(filePath);
  if (!parsed.exists) return '';
  if (!parsed.hasFence) return parsed.before.trim();
  return `${parsed.before}${parsed.after}`.trim();
}

// Legacy migration: views written by a pre-mdx runtime live at the .md twin.
// When only the twin exists, its content outside the managed fence is carried
// into the new .mdx view and the twin is retired, so a project never holds two
// diverging views. When BOTH twins exist (a legacy .md reappeared after the
// .mdx was created, e.g. via a merge or a divergent runtime), the .mdx is
// authoritative but the legacy may hold out-of-fence content the .mdx never
// absorbed; retire the twin only when that content is already represented in
// what we just wrote, otherwise leave it in place and warn rather than lose it.
function planManagedWrite(filePath, body, opts) {
  const legacy = legacyTwin(filePath);
  const legacyExists = legacy ? fs.existsSync(legacy) : false;
  const migrating = legacyExists && !fs.existsSync(filePath);
  const next = nextManagedContent(migrating ? legacy : filePath, body, opts);
  const unchanged = !migrating
    && fs.existsSync(filePath)
    && fs.readFileSync(filePath, 'utf8') === next;
  let retireLegacy = legacyExists;
  if (legacyExists && !migrating) {
    const legacyOutOfFence = outOfFenceText(legacy);
    if (legacyOutOfFence && !next.includes(legacyOutOfFence)) {
      retireLegacy = false;
      if (typeof opts.onWarning === 'function') {
        const relPath = opts.relPath || filePath;
        opts.onWarning(`Legacy view twin for ${relPath} holds content not in the .mdx; left in place to avoid data loss, reconcile manually.`);
      }
    }
  }
  return { next, unchanged, legacy, retireLegacy };
}

function writeManaged(filePath, body, opts = {}) {
  const plan = planManagedWrite(filePath, body, opts);
  if (plan.unchanged) {
    if (plan.retireLegacy) fs.unlinkSync(plan.legacy);
    return { path: filePath, written: false };
  }
  atomic.writeFileAtomic(filePath, plan.next);
  if (plan.retireLegacy) fs.unlinkSync(plan.legacy);
  return { path: filePath, written: true };
}

async function writeManagedAsync(filePath, body, opts = {}) {
  const plan = planManagedWrite(filePath, body, opts);
  if (plan.unchanged) {
    if (plan.retireLegacy) fs.unlinkSync(plan.legacy);
    return { path: filePath, written: false };
  }
  await atomic.writeFileAtomicAsync(filePath, plan.next);
  if (plan.retireLegacy) fs.unlinkSync(plan.legacy);
  return { path: filePath, written: true };
}

function progressPath(projectRoot) {
  return path.join(projectRoot, PROGRESS_VIEW_PATH);
}

function stateViewPath(projectRoot, specOrStep) {
  // String-form lookups accept the sub-step key, the canonical .mdx relPath,
  // and the legacy .md relPath still recorded in older projects' state.
  const spec = typeof specOrStep === 'string'
    ? STATE_VIEW_SPECS.find(item => item.subStepKey === specOrStep
        || item.relPath === specOrStep
        || legacyTwin(item.relPath) === specOrStep)
    : specOrStep;
  if (!spec || !spec.relPath) return null;
  return path.join(projectRoot, spec.relPath);
}

function viewPathsForState(currentState) {
  return [
    PROGRESS_VIEW_PATH,
    ...existingStateViewSpecs(currentState).map(spec => spec.relPath)
  ];
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

function writeStateView(projectRoot, currentState, spec, opts = {}) {
  return writeManaged(stateViewPath(projectRoot, spec), buildStateViewBody(currentState, spec), {
    ...opts,
    relPath: spec.relPath
  });
}

async function writeStateViewAsync(projectRoot, currentState, spec, opts = {}) {
  return writeManagedAsync(stateViewPath(projectRoot, spec), buildStateViewBody(currentState, spec), {
    ...opts,
    relPath: spec.relPath
  });
}

function writeAll(projectRoot, currentState, opts = {}) {
  return [
    writeProgress(projectRoot, currentState, opts),
    ...existingStateViewSpecs(currentState).map(spec => writeStateView(projectRoot, currentState, spec, opts))
  ];
}

async function writeAllAsync(projectRoot, currentState, opts = {}) {
  const results = [await writeProgressAsync(projectRoot, currentState, opts)];
  for (const spec of existingStateViewSpecs(currentState)) {
    results.push(await writeStateViewAsync(projectRoot, currentState, spec, opts));
  }
  return results;
}

module.exports = {
  FENCE_BEGIN,
  FENCE_END,
  CHECKSUM_PREFIX,
  PROGRESS_VIEW_PATH,
  STATE_VIEW_PATHS,
  STATE_VIEW_SPECS,
  buildProgressBody,
  buildStateViewBody,
  parseManaged,
  writeManaged,
  writeManagedAsync,
  writeProgress,
  writeProgressAsync,
  writeStateView,
  writeStateViewAsync,
  writeAll,
  writeAllAsync,
  progressPath,
  stateViewPath,
  viewPathsForState,
  sha
};
