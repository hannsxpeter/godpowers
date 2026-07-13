/**
 * Cross-Artifact Impact
 *
 * Generalizes the per-pair impact pattern (DESIGN -> code) to
 * artifact-to-artifact relationships:
 *   PRD -> ARCH (requirement removal may leave containers over-spec'd)
 *   ARCH -> DESIGN (container split may need DESIGN component re-binding)
 *   ARCH -> ROADMAP (container removal may invalidate milestones)
 *   STACK -> ARCH (dep change may force ADR flip-point review)
 *   STACK -> DESIGN (UI lib change may force token review)
 *   PRD -> ROADMAP (requirement change may invalidate milestone gates)
 *
 * Public API:
 *   forArtifactPair(projectRoot, sourceType, oldContent, newContent, targetType, targetContent)
 *     -> { impacts, severity }
 *   suggestArtifactReviews(projectRoot, sourceType, oldContent, newContent)
 *     -> [{ targetType, reason, severity }]
 */

const impact = require('./impact');
const siblingArtifacts = require('./sibling-artifacts');

/**
 * Define which target artifacts may be impacted by a source artifact change.
 */
const IMPACT_RULES = {
  prd: [
    {
      target: 'arch',
      check: (idDiff) => idDiff.removed.length > 0,
      reason: (idDiff) => `${idDiff.removed.length} PRD requirement(s) removed; ARCH containers may be over-spec'd`,
      severity: 'warning'
    },
    {
      target: 'roadmap',
      check: (idDiff) => idDiff.removed.length > 0 || idDiff.added.length > 0,
      reason: (idDiff) => `PRD requirements changed; ROADMAP milestone gates may need updating`,
      severity: 'warning'
    },
    {
      target: 'design',
      check: (idDiff, sectionChanges) => sectionChanges.some(c => c.section && c.section.match(/Target Users|Brand|Register/i)),
      reason: () => `PRD target users / register changed; DESIGN PRODUCT.md may need re-aligning`,
      severity: 'info'
    }
  ],
  arch: [
    {
      target: 'design',
      check: (idDiff) => idDiff.removed.some(id => id.startsWith('C-')),
      reason: (idDiff) => `ARCH container removed; DESIGN components bound to it may need re-binding`,
      severity: 'warning'
    },
    {
      target: 'roadmap',
      check: (idDiff) => idDiff.removed.length > 0,
      reason: () => `ARCH structure changed; ROADMAP milestone gates may reference removed elements`,
      severity: 'info'
    }
  ],
  stack: [
    {
      target: 'arch',
      check: (idDiff) => idDiff.removed.length > 0 || idDiff.added.length > 0,
      reason: () => `STACK changes; ADR flip-points may need review`,
      severity: 'warning'
    },
    {
      target: 'design',
      check: (idDiff, sectionChanges, oldContent, newContent) => {
        // Check if a UI framework changed
        const oldUi = /react|vue|svelte|next|nuxt|angular|solid|qwik|astro|tailwind|shadcn|mui|chakra/i;
        const newUi = oldUi;
        const hadUi = oldContent && oldUi.test(oldContent);
        const hasUi = newContent && newUi.test(newContent);
        return hadUi !== hasUi || (hadUi && hasUi && oldContent !== newContent);
      },
      reason: () => `STACK UI library may have changed; DESIGN tokens may need recomputation`,
      severity: 'info'
    }
  ],
  design: [
    {
      target: 'arch',
      check: (idDiff) => idDiff.added.some(id => id.startsWith('D-')) || idDiff.removed.some(id => id.startsWith('D-')),
      reason: () => `DESIGN components changed; ARCH UI surface descriptions may need updating`,
      severity: 'info'
    }
  ],
  roadmap: [
    // Roadmap changes are usually informational; rarely break upstream
  ],
  plan: [
    // Sibling godplans PLAN.mdx (or a plan-derived seed): dropped GP-/R- ids
    // mean imported seeds and the deliverable ledger may cite removed items.
    {
      target: 'prd',
      check: (idDiff) => idDiff.removed.length > 0,
      reason: (idDiff) => `${idDiff.removed.length} plan id(s) (GP-/R-) removed; PRD seeds and the deliverable ledger may reference removed plan items`,
      severity: 'warning'
    },
    {
      target: 'roadmap',
      check: (idDiff) => idDiff.removed.length > 0,
      reason: (idDiff) => `${idDiff.removed.length} plan id(s) (GP-/R-) removed; ROADMAP seeds may reference removed plan items`,
      severity: 'warning'
    }
  ],
  audit: [
    // Sibling godaudits AUDIT.json: GA ids leaving the open set (resolved or
    // removed) mean harden findings and todos citing them should be re-read.
    {
      target: 'harden',
      check: (idDiff) => idDiff.removed.length > 0,
      reason: (idDiff) => `${idDiff.removed.length} GA remediation id(s) resolved or removed; harden findings and todos referencing them should be re-checked`,
      severity: 'info'
    }
  ]
};

/**
 * lib/impact.extractIds does not know the sibling superskill grammars, so
 * plan/audit sources diff ids locally: plan ids are GP task ids plus R-
 * requirement ids; audit ids are OPEN GA task ids, so a task that resolves
 * ([ ] -> [x]) counts as removed just like a deleted one.
 */
function extractSiblingIds(sourceType, content) {
  const ids = new Set();
  if (!content) return ids;
  if (sourceType === 'plan') {
    const plan = siblingArtifacts.parsePlan(content);
    for (const task of plan.tasks) ids.add(task.id);
    for (const id of plan.requirementIds.story) ids.add(id);
    for (const id of plan.requirementIds.domain) ids.add(id);
  } else if (sourceType === 'audit') {
    const audit = siblingArtifacts.parseAudit(content);
    for (const task of audit.tasks) {
      if (!task.done) ids.add(task.id);
    }
  }
  return ids;
}

function diffIdsFor(sourceType, oldContent, newContent) {
  if (sourceType !== 'plan' && sourceType !== 'audit') {
    return impact.diffIds(sourceType, oldContent, newContent);
  }
  const oldIds = extractSiblingIds(sourceType, oldContent);
  const newIds = extractSiblingIds(sourceType, newContent);
  return {
    added: [...newIds].filter(id => !oldIds.has(id)),
    removed: [...oldIds].filter(id => !newIds.has(id)),
    kept: [...newIds].filter(id => oldIds.has(id))
  };
}

/**
 * For a given source artifact change, suggest which downstream artifacts
 * to review.
 *
 * Returns: [{ targetType, reason, severity }]
 */
function suggestArtifactReviews(projectRoot, sourceType, oldContent, newContent) {
  const rules = IMPACT_RULES[sourceType] || [];
  const idDiff = diffIdsFor(sourceType, oldContent, newContent);
  const results = [];

  // Compute section diff for prose-driven rules
  const artifactDiff = require('./artifact-diff');
  const sectionDiffResult = artifactDiff.diffArtifacts(oldContent || '', newContent || '');
  const sectionChanges = sectionDiffResult.changes || [];

  for (const rule of rules) {
    let triggered;
    try {
      triggered = rule.check(idDiff, sectionChanges, oldContent, newContent);
    } catch (e) {
      triggered = false;
    }
    if (triggered) {
      results.push({
        targetType: rule.target,
        reason: rule.reason(idDiff, sectionChanges),
        severity: rule.severity
      });
    }
  }
  return results;
}

/**
 * Specific pairwise impact: given a source change AND a target artifact
 * content, report what specifically might need to change in the target.
 */
function forArtifactPair(projectRoot, sourceType, oldContent, newContent, targetType, targetContent) {
  const suggestions = suggestArtifactReviews(projectRoot, sourceType, oldContent, newContent);
  const matched = suggestions.find(s => s.targetType === targetType);
  if (!matched) {
    return { impacts: [], severity: 'info' };
  }

  // Extract IDs from both source and target
  const sourceDiff = diffIdsFor(sourceType, oldContent, newContent);
  const targetIds = impact.extractIds(targetType, targetContent || '');

  // Find target IDs that mention removed source IDs
  const impacts = [];
  for (const removed of sourceDiff.removed) {
    if (targetContent && targetContent.includes(removed)) {
      impacts.push({
        kind: 'cross-reference',
        sourceId: removed,
        targetReference: 'mentioned in target',
        message: `Source ${removed} was removed; target ${targetType} still mentions it.`
      });
    }
  }
  return { impacts, severity: matched.severity, summary: matched.reason };
}

module.exports = {
  IMPACT_RULES,
  suggestArtifactReviews,
  forArtifactPair
};
