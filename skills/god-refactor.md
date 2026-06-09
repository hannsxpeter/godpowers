---
name: god-refactor
description: |
  Safe refactor with strict TDD. Refactors are regression-heavy; this workflow
  enforces tests-before-changes, slice-by-slice incremental change, and
  two-stage review per slice.

  Triggers on: "god refactor", "/god-refactor", "refactor this", "clean up",
  "extract", "rename"
---

# /god-refactor

Refactor without breaking things.

## When to use

- The feature works; you want to improve the code
- Renaming, extracting, restructuring without behavior change
- Performance improvements with measurable target

## When NOT to use

- The behavior should change: that's a feature, use /god-feature
- The bug is in production: use /god-hotfix
- It's a one-line rename: use /god-fast

## Orchestration

### Phase 1: Scope (god-explorer)
Spawn **god-explorer** in fresh context with:
"Help scope a refactor. The user wants to refactor X. Identify:
- What specifically changes (files, modules)
- What does NOT change (behavior, public API)
- Risks: where is regression most likely
- Existing test coverage on the affected surface"

### Phase 2: Test Coverage Audit
Before refactoring, verify:
- All affected behavior is covered by tests
- Run the test suite: it must currently pass
- If gaps exist: ADD TESTS FIRST (not refactor first then test)
- These tests are the safety net during refactor

If coverage is insufficient and tests can't be added economically: STOP. The
refactor is too risky. Spawn god-pm to write a [HYPOTHESIS] doc explaining
why and what would unblock it.

### Phase 3: Plan Slices (god-planner)
Spawn **god-planner** with refactor-mode instructions:
"Plan the refactor as a sequence of behavior-preserving slices. Each slice:
- Compiles
- All tests still pass
- Can be reverted independently

Avoid 'big leap' slices that break and re-fix in one commit."

### Phase 4: Execute Slices (god-executor + reviewers)
For each slice:
1. Spawn **god-executor**:
   - Make the change
   - Run all tests
   - All tests must pass (this is the contract)
2. Spawn **god-spec-reviewer**:
   - Did behavior change? (must be NO)
   - Did public API change? (must be unchanged unless plan said so)
3. Spawn **god-quality-reviewer**:
   - Is the code cleaner than before? (the whole point)
   - Any new technical debt?
4. Atomic commit: `refactor: <description> (no behavior change)`

### Phase 5: Verify
Run full test suite one more time. Run lint. Run any benchmarks if performance
was a goal.

### Phase 6: Deploy (incrementally)
For non-trivial refactors, deploy gradually. Watch metrics for any signal of
regression beyond what tests caught.

## On Completion

```
Refactor complete.
Slices: N committed
Tests: all passing
Behavior: unchanged

Suggested next: /god-status or continue with /god-feature
```

## Proposal Mode

When the user asks for a proposal, recommendation, or performance-improvement
approach and no files are edited, do not stop after the advice. End with a
proposition block that turns the recommendation into user-selectable next
moves.

Use this shape:

```
Proposition:
  1. Implement partial: /god-spike <measurement or smallest safe slice>
  2. Implement complete: /god-refactor <full scoped refactor>
  3. Discuss more: /god-discuss <unresolved scope question>
  4. Run God Mode: /god-mode <scope> if the user wants the full autonomous project run
Recommended: <one option and why>
```

For performance refactors, prefer partial implementation when measurement is
missing. Example:
`Implement partial: /god-spike startup timeline to measure load phases before
refactoring.`

## Have-Nots

Refactor FAILS if:
- Tests didn't exist before; refactor proceeded anyway
- Behavior changed (that's a feature, not a refactor)
- Public API changed without explicit plan
- Single big commit instead of slices
- Tests skipped or disabled to make refactor pass

## Linkage and reverse-sync

Per Phase 13 of the production-ready plan, this workflow participates
in the linkage system:

- On completion of any code change, `lib/reverse-sync.run(projectRoot)`
  is called via god-updater. This:
  - Scans new/modified code for linkage annotations (// Implements: P-MUST-NN, etc.)
  - Updates `.godpowers/links/{artifact-to-code,code-to-artifact}.json`
  - Detects drift via `lib/drift-detector`
  - Appends fenced footers to PRD/ARCH/ROADMAP/STACK/DESIGN
  - Surfaces drift findings to REVIEW-REQUIRED.md

- Stable IDs MUST be used in artifact deltas (P-MUST-NN, ADR-NNN,
  C-{slug}, M-{slug}, S-{slug}, D-{slug}, token paths). The scanner
  picks them up automatically via comment annotations.

- For UI work: agent-browser audit may run as part of /god-build
  post-wave or /god-launch gate (see `/god-test-runtime`).

- Findings flow into the standard REVIEW-REQUIRED.md walkthrough
  via `/god-review-changes`.


## Locking

See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
