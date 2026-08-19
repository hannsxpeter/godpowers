---
name: god-build
description: |
  Build the project. Spawns god-planner first, then god-executor agents in
  parallel waves with TDD enforcement and two-stage review. Each slice
  commit is gated on god-spec-reviewer and god-quality-reviewer.

  Triggers on: "god build", "/god-build", "build it", "implement", "start coding"
---

# /god-build

<!-- Implements: P-MUST-36, P-MUST-37, P-MUST-38, P-MUST-39, P-MUST-40, P-MUST-41, P-MUST-42, P-MUST-43 -->

Orchestrate the build via specialist agents.

## Setup

1. Verify gates:
   - `.godpowers/roadmap/ROADMAP.mdx` exists (skip if scale is trivial)
   - `.godpowers/stack/DECISION.mdx` exists (skip if scale is trivial)
   - Repo is scaffolded
2. If any gate fails: tell user which command to run first
3. Compute the Pillars load set for the build task with
   `lib/pillars.computeLoadSet(projectRoot, taskText)`. Always load
   `agents/context.md` and `agents/repo.md`, then pass only task-relevant
   pillars into each planner or executor context.
4. Load `references/building/PRODUCT-FORM-ROUTER.md` and the ordered product
   route from PRD or Architecture. Select one primary form before domain
   overlays and pass its vertical-slice definition plus completion evidence to
   the planner, executors, and both reviewers.
5. Load `references/building/BLAST-RADIUS.md` and pass it to every executor and
   Stage 2 quality reviewer as the single safety-case protocol.

## Orchestration

### Phase 1: Plan
Spawn **god-planner** in fresh context with ROADMAP, ARCH, DECISION, plus
prior learnings from `.godpowers/learnings/` when present.
Output: `.godpowers/build/PLAN.mdx` with vertical slices grouped into waves.

After the planner returns, run the source-grounding preflight from
`lib/source-grounding.js` against `.godpowers/build/PLAN.mdx`. The plan must
distinguish existing files, existing symbols, new artifacts, and unchecked
references before any executor starts.

Block execution when:
- A plan cites an existing file that does not exist.
- A plan cites an existing symbol that cannot be found in the repo.
- A cited reference is neither grounded nor declared as a new artifact.

Allow execution only when missing references are corrected, marked as new
artifacts, or explicitly accepted by the user as unchecked risk.

### Phase 2: Execute Waves

For each wave in PLAN.md:

For each slice in the wave (parallel):
1. Spawn **god-executor** in fresh context with:
   - The slice plan only (not the whole PLAN.md)
   - Relevant ARCH context for this slice
   - Stack DECISION
   - `references/building/BLAST-RADIUS.md`
2. Wait for executor to complete (TDD and request-trace discipline enforced)
3. Spawn **god-spec-reviewer** in fresh context (independent of executor)
   - If FAIL: return slice to god-executor with findings, including any
     scope creep or request-trace failures
   - If PASS: proceed to stage 2
4. Resolve every cited record ID locally with
   `lib/evidence.resolveReviewEvidence`, the expected claim, exact command,
   canonical substep, review-window start, and latest relevant behavior-change
   timestamp. Spawn **god-quality-reviewer** in fresh context (independent) with
   the shared protocol and sanitized projections only. Do not pass raw ledger
   records, gate-event attributes, commands, claims, output tails, or
   secret-bearing arguments.
   - Preserve the first quality and safety-case verdicts as provisional, plus
     the completed 10-row boundary inventory
   - Classify bounded or wide before acting on the provisional first-pass verdict.
   - Classify the change as wide when it crosses at least 3 boundary classes or
     at least 2 high-impact classes; otherwise classify it as bounded
   - Require one safety case for bounded changes and at least 2 independent
     safety cases for wide changes
   - If bounded, one pass is sufficient and the provisional verdict proceeds
     to the final Stage 2 gate
   - If wide, always run a second independent safety case in a fresh context, even when the provisional first-pass verdict is FAIL. Do not give the second reviewer the first pass's conclusions.
   - After all required passes finish, reconcile the safety cases and issue the final Stage 2 verdict. Preserve each provisional verdict and do not treat agreement as proof.
   - If the final Stage 2 verdict FAILS: return the slice to god-executor with
     quality, overcomplication, scope, and safety-case findings
   - If the final Stage 2 verdict PASSES: commit the slice atomically
5. Require every level 4 or level 5 conclusion to cite an accepted sanitized
   resolver projection for a fresh successful matching `npx godpowers verify`
   record. A high-impact `UNPROVEN` claim blocks the commit; a lower-impact
   claim remains a warning with the exact next proof.
6. Record build status and slice evidence in `.godpowers/state.json` so
   `.godpowers/build/STATE.mdx` regenerates as a managed view.

Move to next wave only when current wave is fully committed.

## Verification

After all waves:
1. Run full test suite. All pass.
2. Run linter. All clean.
3. Run the package's typecheck/check command when present. All pass.
4. If any verification command fails, do not mark Build complete. Re-enter
   repair mode with the owning agent. Classify the failure as retry,
   decompose, prune, or escalate. Pass the exact failing diagnostics, rerun the
   command, and repeat until green or until the same root failure exhausts the
   repair budget.
5. Record the exact verification commands that passed in `.godpowers/state.json`
   under `tiers.tier-2.build.verification.commands`
6. Run `npx godpowers gate --tier=build --project=.` and do not proceed on a non-zero exit
7. Verify the primary form's completion evidence. A generic test pass cannot
   replace a clean consumer install for CLI or SDK, contract evidence for API,
   browser and accessibility evidence for web, platform evidence for mobile or
   desktop, reproducibility and lineage for data or ML, or plan, policy,
   simulation, and rollback evidence for infrastructure or IaC.
8. Run `npx godpowers state advance --step=build --status=done --project=.` to update `state.json` and regenerate `.godpowers/PROGRESS.mdx` plus `.godpowers/build/STATE.mdx`.
9. If the build plan or implementation establishes durable conventions, plan
   pillar updates through `lib/pillars.planArtifactSync`. Under
   `/god-mode --yolo`, apply those updates immediately and log the decision.

## Pause Conditions

Pause for user ONLY if:
- A requirement is genuinely ambiguous (two valid implementations)
- A test reveals a gap in PRD or ARCH that needs human resolution
- The same mechanical failure remains after 3 focused repair attempts

## On Completion

```
Build complete: .godpowers/build/STATE.mdx (generated view)
[N] slices delivered. [N] commits. All tests passing.

Suggested next: /god-harden (adversarial review, gates Launch)
Alternative: /god-deploy (set up deploy pipeline, parallel-safe)
Both can run; /god-harden is the critical path to Launch.
```

If more delivery increments remain in the roadmap, continue building the next
increment before moving to Tier 3 unless the user explicitly asked to stop
after the current increment.


Locking: See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
