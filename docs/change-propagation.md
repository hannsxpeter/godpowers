# Change Propagation

How Godpowers keeps code and artifacts mutually aware. Three propagation
directions cover every change surface:

1. **Forward** (artifact -> code): when a PRD requirement, ARCH decision,
   STACK choice, or DESIGN token changes, the affected code files are
   identified and surfaced for review.
2. **Reverse** (code -> artifacts): when code is committed, scanning
   discovers new linkage signals; artifacts get fenced "Implementation:"
   footers; drift is detected and surfaced.
3. **Cross-artifact** (artifact -> artifact): when an upstream artifact
   changes, downstream artifacts get review suggestions (e.g., PRD
   requirement removed -> ARCH containers may be over-spec'd).

## The three load-bearing files

| File | Owner | Job |
|---|---|---|
| `REVIEW-REQUIRED.md` | god-updater (auto-populates) | Append-only registry of pending reviews. User clears via `/god-review-changes`. |
| `.godpowers/design/REJECTED.mdx` | god-design-reviewer (BLOCK verdicts) | Append-only audit trail of design changes that were rejected. |
| `.godpowers/links/{artifact-to-code,code-to-artifact}.json` | god-updater (via lib/code-scanner) | Bidirectional linkage map. |

User content is never overwritten. All auto-generated content lives in
fenced sections (`<!-- godpowers:linkage:begin -->` / `<!-- godpowers:linkage:end -->`)
that the system owns and refreshes.

## Forward propagation

Trigger: artifact change detected during `/god-sync`, `/god-feature`,
`/god-mode` mid-arc check, or manual edit between commands.

Pipeline:

```
artifact change detected
  -> god-design-reviewer (for DESIGN/PRODUCT only) - two-stage gate
       BLOCK: append to .godpowers/design/REJECTED.mdx; pause arc
       PASS or WARN: continue
  -> lib/impact.forArtifactDiff (or forDesign for DESIGN.md)
       returns: { idDiff, addedAffects, removedAffects, severity }
  -> lib/cross-artifact-impact.suggestArtifactReviews
       returns: which other artifacts may need review
  -> lib/review-required.appendBatch
       writes: REVIEW-REQUIRED.md with affected files + suggestions
  -> events.jsonl: review-required.populated event
```

Severity rules:

| Condition | Severity |
|---|---|
| Stable ID removed AND code links to it | error (gate-triggering) |
| Section regression (decision downgraded, acceptance reduced) | warning |
| Only additions / informational changes | info |

## Reverse propagation (Phase 6)

Trigger: code change committed during `/god-build`, `/god-feature`,
`/god-hotfix`, `/god-refactor`, `/god-update-deps`; or manual `/god-scan`.

Pipeline:

```
code change committed
  -> lib/code-scanner.scan(projectRoot)
       discovery via 6 mechanisms:
         1. comment annotations: // Implements: P-MUST-01
         2. filename heuristics: src/components/Button.tsx -> D-button
         3. import analysis (STACK linkage)
         4. style-system parsing (CSS var(), {token.path})
         5. test description parsing
         6. manual entries via /god-link
  -> lib/code-scanner.applyScan
       updates .godpowers/links/{artifact-to-code,code-to-artifact}.json
  -> lib/drift-detector.detectAll
       checks: design tokens still defined? STACK versions match?
       ARCH container responsibilities preserved?
  -> if impeccable installed and UI files touched:
       npx impeccable detect (anti-pattern findings)
  -> lib/reverse-sync.appendFooters
       writes fenced "Implementation Linkage" sections to PRD/ARCH/
       ROADMAP/STACK/DESIGN.md
  -> findings flow to REVIEW-REQUIRED.md
  -> events.jsonl: linkage.snapshot, drift.detected, agents-md.refreshed
```

What gets appended to each artifact:

| Artifact | Footer content |
|---|---|
| PRD.md | Each requirement (P-MUST/SHOULD/COULD): Implementation: <files> |
| ARCH.md | Each container: Source: <directories>; each ADR: Pattern: <files> |
| ROADMAP.md | Each milestone: implementing files |
| STACK/DECISION.md | Each S- decision: usage count |
| DESIGN.md | Each token: usage count; each component: Implements: <files> |

The fence is idempotent. Re-running `/god-sync` produces the same content
unless linkage state actually changed.

## Cross-artifact propagation (Phase 8)

Triggered alongside forward propagation. When PRD changes:
`lib/cross-artifact-impact.suggestArtifactReviews('prd', oldContent, newContent)`
returns:

```js
[
  { targetType: 'arch', reason: 'PRD requirements removed; ARCH containers may be over-spec\'d', severity: 'warning' },
  { targetType: 'roadmap', reason: 'PRD requirements changed; milestone gates may need updating', severity: 'warning' }
]
```

Six rule classes are defined:

- PRD removal -> ARCH review (warning)
- PRD changes -> ROADMAP review (warning)
- PRD register/audience changes -> DESIGN/PRODUCT review (info)
- ARCH container removal -> DESIGN component re-binding (warning)
- STACK changes -> ARCH ADR flip-point review (warning)
- STACK UI framework change -> DESIGN token review (info)
- DESIGN component changes -> ARCH UI surface description review (info)

These suggestions surface as additional items in `REVIEW-REQUIRED.md`.

## REVIEW-REQUIRED.md walkthrough

When you run `/god-review-changes`, you see something like:

```
Batch 1: design-impact
  Source: design-impact
  Summary: colors.primary darkened; affects 3 files

  [WARNING] [colors.primary] src/components/Button.tsx: token value changed
     Suggestion: review computed contrast on Button against background
  [WARNING] [colors.primary] src/components/Header.tsx: token value changed
     Suggestion: review header hierarchy

Batch 2: reverse-sync
  Source: reverse-sync
  Summary: 1 drift error, 0 drift warnings, 2 impeccable findings

  [ERROR] [colors.removed] src/old.css: File references token "colors.removed" that no longer exists in DESIGN.md.
     Suggestion: Remove reference or restore token.

Address now / defer / mark resolved? [a/d/r]
```

Per plan question 3: REVIEW-REQUIRED.md does NOT auto-clear. The user
must walk through and address (or explicitly clear with `--clear`).
This forces a look at every change.

## REJECTED.md (design-only)

god-design-reviewer's two-stage gate may issue a BLOCK verdict. When it
does, the rejection is logged here:

```markdown
## Rejected: 2026-05-10T15:42:11Z

### Verdict
BLOCK

### Stages
- Stage 1 (spec): misaligned
- Stage 2 (quality): errors

### Diff scope
colors.primary changed from oklch(20% 0.01 250) to #6366f1 (indigo)

### Findings
- [ERROR] D-CONTRAST: button-primary contrast 1.8:1 fails WCAG AA
- [ERROR] D-IMPECCABLE: indigo flagged as anti-reference per PRODUCT.md

### Resolution required
Pick a primary color outside the indigo family that maintains 4.5:1
contrast against the cream background.
```

REJECTED.md is append-only; it preserves the audit trail of attempted-
but-blocked changes.

## What this gives you

After all phases ship:

- No artifact change happens that the system can't trace to affected code
- No code change happens that the system doesn't see and document
- No artifact lies about reality (drift detection catches divergence)
- No PRD requirement floats unimplemented (orphan detection)
- Every cross-artifact dependency is rule-encoded; downstream reviews
  are surfaced automatically

This is the "no workflow operates in isolation" outcome the user asked
for. Run `/god-status` to see linkage coverage, drift count, and
pending reviews at any moment.

## See also

- [linkage.md](./linkage.md) - stable IDs, annotation conventions, scanner rules
- [validation.md](./validation.md) - the lint system, mechanical vs interpretive
- [design-md.md](./design-md.md) - DESIGN.md format and lifecycle
- `lib/impact.js`, `lib/reverse-sync.js`, `lib/cross-artifact-impact.js`,
  `lib/review-required.js`, `lib/drift-detector.js`
