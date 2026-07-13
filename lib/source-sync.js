/**
 * Source System Sync-Back
 *
 * Writes Godpowers progress back to detected source systems through managed
 * companion files and optional managed fences.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const state = require('./state');
const atomic = require('./atomic-write');
const syncFs = require('./sync-fs');

const FENCE_BEGIN = '<!-- godpowers:source-sync:begin -->';
const FENCE_END = '<!-- godpowers:source-sync:end -->';

const SYSTEM_TARGETS = {
  'legacy-planning': {
    companionCandidates: ['.planning/GODPOWERS-SYNC.md', '.legacy-planning/GODPOWERS-SYNC.md'],
    pointerCandidates: ['.planning/STATE.md']
  },
  bmad: {
    companionCandidates: ['_bmad-output/GODPOWERS-SYNC.md', '.bmad/GODPOWERS-SYNC.md'],
    pointerCandidates: ['_bmad-output/project-context.md']
  },
  superpowers: {
    companionCandidates: ['docs/superpowers/GODPOWERS-SYNC.md', '.superpowers/GODPOWERS-SYNC.md'],
    pointerCandidates: []
  },
  'arc-ready': {
    companionCandidates: ['.arc-ready/GODPOWERS-SYNC.md'],
    pointerCandidates: []
  },
  // Sibling superskill directories are mdx-family, so their companions are
  // .mdx (unlike the legacy .md companions in foreign dirs). PLAN.mdx,
  // validate-plan.sh, AUDIT.json, and its generated AUDIT.mdx view remain
  // owned by their sibling products and never receive fences, so
  // pointerCandidates stays empty for both.
  godplans: {
    companionCandidates: ['.godplans/GODPOWERS-SYNC.mdx'],
    pointerCandidates: []
  },
  godaudits: {
    companionCandidates: ['.godaudits/GODPOWERS-SYNC.mdx'],
    pointerCandidates: []
  }
};

function sha(input) {
  return `sha256:${crypto.createHash('sha256').update(input).digest('hex')}`;
}

function readFenced(filePath) {
  if (!fs.existsSync(filePath)) {
    return { exists: false, before: '', fenced: '', after: '' };
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const beginIdx = content.indexOf(FENCE_BEGIN);
  const endIdx = content.indexOf(FENCE_END);
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
    return { exists: true, before: content, fenced: '', after: '' };
  }
  return {
    exists: true,
    before: content.slice(0, beginIdx),
    fenced: content.slice(beginIdx + FENCE_BEGIN.length, endIdx),
    after: content.slice(endIdx + FENCE_END.length)
  };
}

function writeFenced(filePath, sectionContent) {
  const parsed = readFenced(filePath);
  const block = `${FENCE_BEGIN}\n${sectionContent}\n${FENCE_END}`;
  let next;
  if (!parsed.exists) {
    next = `${block}\n`;
  } else if (parsed.fenced === '') {
    const sep = parsed.before.endsWith('\n\n') ? '' : (parsed.before.endsWith('\n') ? '\n' : '\n\n');
    next = `${parsed.before}${sep}${block}\n`;
  } else {
    next = `${parsed.before}${block}${parsed.after}`;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  atomic.writeFileAtomic(filePath, next);
  return {
    written: true,
    hadFenceBefore: parsed.exists && parsed.fenced !== ''
  };
}

function firstExisting(projectRoot, candidates) {
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(projectRoot, candidate))) return candidate;
  }
  return candidates[0];
}

function readArtifact(projectRoot, relPath) {
  const full = path.join(projectRoot, relPath);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf8');
}

// Summaries resolve mdx-first with legacy .md fallback so projects created by
// older runtimes still report their artifacts. The resolved path is what the
// companion file cites, so the citation matches disk.
function summarizeArtifact(projectRoot, relPath, label) {
  const resolved = syncFs.resolveArtifact(projectRoot, relPath);
  const content = readArtifact(projectRoot, resolved);
  if (!content) return `- [HYPOTHESIS] ${label}: missing.`;
  const headings = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^#{1,3}\s+/.test(line))
    .map((line) => line.replace(/^#{1,3}\s+/, ''))
    .slice(0, 6);
  if (headings.length === 0) {
    return `- [HYPOTHESIS] ${label}: present at ${resolved}.`;
  }
  return `- [HYPOTHESIS] ${label}: ${headings.join('; ')}. Source: ${resolved}.`;
}

function progressLines(projectRoot) {
  const current = state.read(projectRoot);
  const lines = [];
  lines.push('# Godpowers Sync-Back');
  lines.push('');
  lines.push('- [DECISION] This file is managed by Godpowers source sync.');
  lines.push('- [DECISION] It lets the prior planning system see current Godpowers progress without Godpowers rewriting source-system documents.');
  lines.push('- [DECISION] Edit Godpowers artifacts, then run `/god-sync` or `/god-migrate --sync-back` to refresh this file.');
  lines.push('');

  if (current) {
    const summary = state.progressSummary(current);
    lines.push('## Progress');
    lines.push('');
    lines.push(`- [HYPOTHESIS] Godpowers progress is ${summary.percent}% with ${summary.completed} of ${summary.total} steps complete.`);
    if (summary.current) {
      lines.push(`- [HYPOTHESIS] Current Godpowers step is ${summary.current.tierLabel}: ${summary.current.subStepLabel} with status ${summary.current.status}.`);
    }
  }

  lines.push('');
  lines.push('## Current Godpowers Artifacts');
  lines.push('');
  lines.push(summarizeArtifact(projectRoot, '.godpowers/prd/PRD.mdx', 'PRD'));
  lines.push(summarizeArtifact(projectRoot, '.godpowers/arch/ARCH.mdx', 'Architecture'));
  lines.push(summarizeArtifact(projectRoot, '.godpowers/roadmap/ROADMAP.mdx', 'Roadmap'));
  lines.push(summarizeArtifact(projectRoot, '.godpowers/stack/DECISION.mdx', 'Stack'));
  lines.push(summarizeArtifact(projectRoot, '.godpowers/state.json', 'Godpowers state'));
  lines.push('');
  lines.push('## Return Path');
  lines.push('');
  lines.push('- [DECISION] If the project returns to its prior source system, use this file as a migration note rather than treating it as a native source-system artifact.');
  lines.push('- [OPEN QUESTION] Confirm which Godpowers decisions should be copied into native source-system documents before switching systems. Owner: user. Due: before switching systems.');
  lines.push('');
  return lines.join('\n');
}

function pointerContent(companionPath) {
  return [
    '## Godpowers Sync-Back Pointer',
    '',
    `- [DECISION] Current Godpowers progress is summarized in \`${companionPath}\`.`,
    '- [DECISION] This fenced pointer is managed by Godpowers and may be refreshed by `/god-sync`.',
    ''
  ].join('\n');
}

function updateStateSync(projectRoot, results, contentHash) {
  const current = state.read(projectRoot);
  if (!current || !Array.isArray(current['source-systems'])) return null;
  const now = new Date().toISOString();
  const byId = new Set(results.map((result) => result.system));
  current['source-systems'] = current['source-systems'].map((system) => {
    if (!byId.has(system.id)) return system;
    return {
      ...system,
      'last-sync-back-hash': contentHash,
      'last-sync-back-at': now
    };
  });
  state.write(projectRoot, current);
  return current;
}

function run(projectRoot, opts = {}) {
  const current = state.read(projectRoot);
  const configured = current && Array.isArray(current['source-systems'])
    ? current['source-systems']
    : [];
  const systems = configured.filter((system) => system['sync-back-enabled'] !== false);
  const content = progressLines(projectRoot);
  const contentHash = sha(content);
  const results = [];

  for (const system of systems) {
    const targets = SYSTEM_TARGETS[system.id];
    if (!targets) continue;
    const companionRel = firstExisting(projectRoot, targets.companionCandidates);
    const companionFull = path.join(projectRoot, companionRel);
    const companionResult = writeFenced(companionFull, content);
    const pointerResults = [];

    for (const pointerRel of targets.pointerCandidates) {
      const pointerFull = path.join(projectRoot, pointerRel);
      if (!fs.existsSync(pointerFull)) continue;
      const pointerResult = writeFenced(pointerFull, pointerContent(companionRel));
      pointerResults.push({ path: pointerRel, ...pointerResult });
    }

    results.push({
      system: system.id,
      name: system.name,
      companion: companionRel,
      companionWritten: companionResult.written,
      pointers: pointerResults
    });
  }

  const nextState = updateStateSync(projectRoot, results, contentHash);
  return {
    hash: contentHash,
    results,
    state: nextState
  };
}

module.exports = {
  run,
  progressLines,
  readFenced,
  writeFenced,
  FENCE_BEGIN,
  FENCE_END,
  SYSTEM_TARGETS
};
