/**
 * Impact Analysis
 *
 * Given a change to an artifact, identify what code is affected.
 * Uses the linkage map to propagate forward.
 *
 * Public API:
 *   forArtifactDiff(projectRoot, artifactType, oldContent, newContent)
 *     -> { changes, affectedFiles, severity, evidence }
 *   forIdSet(projectRoot, addedIds, removedIds, changedIds)
 *     -> { addedAffects, removedAffects, changedAffects }
 *   transitive(projectRoot, fileSet, depth) -> Set
 *   forDesign(projectRoot, oldContent, newContent)
 *     -> { tokenChanges, affectedFiles, severity, evidence }
 */

// Implements: P-MUST-43

const fs = require('fs');
const path = require('path');

const linkage = require('./linkage');
const designSpec = require('./design-spec');
const artifactDiff = require('./artifact-diff');

const STATIC_CANDIDATE_EVIDENCE = Object.freeze({
  kind: 'static-candidate',
  status: 'unproven',
  maximumLevel: 2,
  limitation: 'Static impact identifies candidate files and does not prove behavioral safety.'
});

function staticCandidateEvidence() {
  return { ...STATIC_CANDIDATE_EVIDENCE };
}

// ============================================================================
// ID extraction from artifact content
// ============================================================================

/**
 * Extract stable IDs declared in artifact content.
 * Different per artifact type.
 */
function extractIds(artifactType, content) {
  const ids = new Set();
  if (!content) return ids;

  if (artifactType === 'prd') {
    // P-MUST-NN, P-SHOULD-NN, P-COULD-NN appearing anywhere
    const regex = /\bP-(?:MUST|SHOULD|COULD)-\d+\b/g;
    let m;
    while ((m = regex.exec(content)) !== null) ids.add(m[0]);
  } else if (artifactType === 'arch') {
    const adrRegex = /\bADR-\d+\b/g;
    const containerRegex = /\bC-[\w-]+\b/g;
    let m;
    while ((m = adrRegex.exec(content)) !== null) ids.add(m[0]);
    while ((m = containerRegex.exec(content)) !== null) ids.add(m[0]);
  } else if (artifactType === 'roadmap') {
    const regex = /\bM-[\w-]+\b/g;
    let m;
    while ((m = regex.exec(content)) !== null) ids.add(m[0]);
  } else if (artifactType === 'stack') {
    const regex = /\bS-[\w-]+\b/g;
    let m;
    while ((m = regex.exec(content)) !== null) ids.add(m[0]);
  } else if (artifactType === 'design') {
    const parsed = designSpec.parse(content);
    if (parsed.frontmatter) {
      // Token paths: walk colors / typography / spacing / rounded
      walkTokens(parsed.frontmatter, '', ids);
      // Component IDs: D-{slug}
      if (parsed.frontmatter.components) {
        for (const compName of Object.keys(parsed.frontmatter.components)) {
          ids.add(`D-${compName}`);
        }
      }
    }
  }
  return ids;
}

function walkTokens(obj, prefix, set) {
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'name' || k === 'description' || k === 'components' || k === 'version') continue;
    const here = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      walkTokens(v, here, set);
    } else {
      // Only token leaves (values that are colors/dimensions)
      set.add(here);
    }
  }
}

// ============================================================================
// Diff at the ID level
// ============================================================================

/**
 * Compute added / removed / unchanged IDs from old vs new artifact content.
 */
function diffIds(artifactType, oldContent, newContent) {
  const oldIds = extractIds(artifactType, oldContent);
  const newIds = extractIds(artifactType, newContent);
  const added = [...newIds].filter(id => !oldIds.has(id));
  const removed = [...oldIds].filter(id => !newIds.has(id));
  const kept = [...newIds].filter(id => oldIds.has(id));
  return { added, removed, kept };
}

// ============================================================================
// Impact analysis
// ============================================================================

/**
 * Given added / removed / changed IDs, return affected files for each.
 */
function forIdSet(projectRoot, { added = [], removed = [], changed = [] } = {}) {
  function lookup(ids) {
    const result = {};
    for (const id of ids) {
      const files = linkage.queryByArtifact(projectRoot, id);
      if (files.length > 0) result[id] = files;
    }
    return result;
  }
  return {
    addedAffects: lookup(added),
    removedAffects: lookup(removed),
    changedAffects: lookup(changed)
  };
}

/**
 * High-level analysis from old/new artifact content.
 * Severity:
 *   error    if any ID was removed and code still references it
 *   warning  if any ID was changed (kept but content differs)
 *   info     if only additions
 */
function forArtifactDiff(projectRoot, artifactType, oldContent, newContent) {
  const idDiff = diffIds(artifactType, oldContent, newContent);
  const { addedAffects, removedAffects } = forIdSet(projectRoot, {
    added: idDiff.added,
    removed: idDiff.removed
  });

  // Also compute artifact-level diff for changed sections
  const sectionDiff = artifactDiff.diffArtifacts(oldContent || '', newContent || '');

  const affectedFiles = new Set();
  for (const files of Object.values(addedAffects)) {
    for (const f of files) affectedFiles.add(f);
  }
  for (const files of Object.values(removedAffects)) {
    for (const f of files) affectedFiles.add(f);
  }

  let severity = 'info';
  if (Object.keys(removedAffects).length > 0) severity = 'error';
  else if (sectionDiff.regression) severity = 'warning';
  else if (Object.keys(addedAffects).length > 0) severity = 'info';

  return {
    artifactType,
    idDiff,
    addedAffects,
    removedAffects,
    sectionChanges: sectionDiff.changes,
    affectedFiles: [...affectedFiles].sort(),
    severity,
    evidence: staticCandidateEvidence()
  };
}

/**
 * Specialized DESIGN.md impact: token + component changes.
 */
function forDesign(projectRoot, oldContent, newContent) {
  const oldParsed = oldContent ? designSpec.parse(oldContent) : { frontmatter: {} };
  const newParsed = newContent ? designSpec.parse(newContent) : { frontmatter: {} };

  const tokenChanges = computeTokenChanges(
    oldParsed.frontmatter || {},
    newParsed.frontmatter || {}
  );
  const componentChanges = computeComponentChanges(
    oldParsed.frontmatter || {},
    newParsed.frontmatter || {}
  );

  // Affected files = files linked to any changed token or component
  const affectedFiles = new Set();
  for (const t of tokenChanges) {
    const files = linkage.queryByArtifact(projectRoot, t.path);
    for (const f of files) affectedFiles.add(f);
  }
  for (const c of componentChanges) {
    const files = linkage.queryByArtifact(projectRoot, `D-${c.name}`);
    for (const f of files) affectedFiles.add(f);
  }

  const severity = tokenChanges.some(t => t.kind === 'removed') || componentChanges.some(c => c.kind === 'removed')
    ? 'error'
    : (tokenChanges.length || componentChanges.length) ? 'warning' : 'info';

  return {
    tokenChanges,
    componentChanges,
    affectedFiles: [...affectedFiles].sort(),
    severity,
    evidence: staticCandidateEvidence()
  };
}

function computeTokenChanges(oldFm, newFm) {
  const changes = [];
  const oldTokens = new Map();
  const newTokens = new Map();
  walkTokenValues(oldFm, '', oldTokens);
  walkTokenValues(newFm, '', newTokens);
  for (const [path, val] of oldTokens) {
    if (!newTokens.has(path)) {
      changes.push({ path, kind: 'removed', oldValue: val });
    } else if (newTokens.get(path) !== val) {
      changes.push({ path, kind: 'modified', oldValue: val, newValue: newTokens.get(path) });
    }
  }
  for (const [path, val] of newTokens) {
    if (!oldTokens.has(path)) {
      changes.push({ path, kind: 'added', newValue: val });
    }
  }
  return changes;
}

function walkTokenValues(obj, prefix, map) {
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'name' || k === 'description' || k === 'components' || k === 'version') continue;
    const here = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      walkTokenValues(v, here, map);
    } else {
      map.set(here, String(v));
    }
  }
}

function computeComponentChanges(oldFm, newFm) {
  const changes = [];
  const oldComps = oldFm.components || {};
  const newComps = newFm.components || {};
  for (const name of Object.keys(oldComps)) {
    if (!(name in newComps)) {
      changes.push({ name, kind: 'removed' });
    } else if (JSON.stringify(oldComps[name]) !== JSON.stringify(newComps[name])) {
      changes.push({ name, kind: 'modified' });
    }
  }
  for (const name of Object.keys(newComps)) {
    if (!(name in oldComps)) {
      changes.push({ name, kind: 'added' });
    }
  }
  return changes;
}

// ============================================================================
// Transitive expansion (depth-bounded)
// ============================================================================

/**
 * Expand affected file set transitively via simple import analysis.
 * Default depth = 2 (matches plan's recommendation).
 */
function transitive(projectRoot, fileSet, depth = 2) {
  const visited = new Set();
  let frontier = new Set(fileSet);
  for (let d = 0; d < depth; d++) {
    const next = new Set();
    for (const f of frontier) {
      if (visited.has(f)) continue;
      visited.add(f);
      const dependents = findDependents(projectRoot, f);
      for (const dep of dependents) {
        if (!visited.has(dep)) next.add(dep);
      }
    }
    frontier = next;
    if (frontier.size === 0) break;
  }
  return [...visited].sort();
}

function findDependents(projectRoot, targetFile) {
  // Heuristic: scan known files for imports matching the target.
  // For tests / fast V1: scan only files in the linkage reverse map.
  const rev = linkage.readReverse(projectRoot);
  const candidates = Object.keys(rev);
  const targetBase = path.basename(targetFile, path.extname(targetFile));
  const dependents = [];
  for (const cand of candidates) {
    const full = path.join(projectRoot, cand);
    if (!fs.existsSync(full)) continue;
    const ext = path.extname(cand);
    if (!['.js', '.jsx', '.ts', '.tsx', '.mjs', '.css', '.scss'].includes(ext)) continue;
    let content;
    try {
      content = fs.readFileSync(full, 'utf8');
    } catch (e) {
      continue;
    }
    if (content.includes(targetBase) && cand !== targetFile) {
      dependents.push(cand);
    }
  }
  return dependents;
}

module.exports = {
  extractIds,
  diffIds,
  forIdSet,
  forArtifactDiff,
  forDesign,
  transitive
};
