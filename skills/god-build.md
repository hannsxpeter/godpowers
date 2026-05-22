---
name: god-build
description: |
  Build the project. Spawns god-planner first, then god-executor agents in
  parallel waves with TDD enforcement and two-stage review. Each slice
  commit is gated on god-spec-reviewer and god-quality-reviewer.

  Triggers on: "god build", "/god-build", "build it", "implement", "start coding"
---

# /god-build

Orchestrate the build via specialist agents.

## Setup

1. Verify gates:
   - `.godpowers/roadmap/ROADMAP.md` exists (skip if scale is trivial)
   - `.godpowers/stack/DECISION.md` exists (skip if scale is trivial)
   - Repo is scaffolded
2. If any gate fails: tell user which command to run first
3. Compute the Pillars load set for the build task with
   `lib/pillars.computeLoadSet(projectRoot, taskText)`. Always load
   `agents/context.md` and `agents/repo.md`, then pass only task-relevant
   pillars into each planner or executor context.

## Orchestration

### Phase 1: Plan
Spawn **god-planner** in fresh context with ROADMAP, ARCH, DECISION.
Output: `.godpowers/build/PLAN.md` with vertical slices grouped into waves.

### Phase 2: Execute Waves

For each wave in PLAN.md:

For each slice in the wave (parallel):
1. Spawn **god-executor** in fresh context with:
   - The slice plan only (not the whole PLAN.md)
   - Relevant ARCH context for this slice
   - Stack DECISION
2. Wait for executor to complete (TDD and request-trace discipline enforced)
3. Spawn **god-spec-reviewer** in fresh context (independent of executor)
   - If FAIL: return slice to god-executor with findings, including any
     scope creep or request-trace failures
   - If PASS: proceed to stage 2
4. Spawn **god-quality-reviewer** in fresh context (independent)
   - If FAIL: return slice to god-executor with findings, including any
     overcomplication, speculative abstraction, or unrelated cleanup
   - If PASS: commit the slice atomically
5. Update `.godpowers/build/STATE.md`

Move to next wave only when current wave is fully committed.

## Verification

After all waves:
1. Run full test suite. All pass.
2. Run linter. All clean.
3. Run the package's typecheck/check command when present. All pass.
4. If any verification command fails, do not mark Build complete. Re-enter
   repair mode with the owning agent, pass the exact failing diagnostics, rerun
   the command, and repeat until green or until the same root failure survives
   3 repair attempts.
5. Update PROGRESS.md: Build status = done
6. If the build plan or implementation establishes durable conventions, plan
   pillar updates through `lib/pillars.planArtifactSync`. Under
   `/god-mode --yolo`, apply those updates immediately and log the decision.

## Pause Conditions

Pause for user ONLY if:
- A requirement is genuinely ambiguous (two valid implementations)
- A test reveals a gap in PRD or ARCH that needs human resolution
- The same mechanical failure remains after 3 focused repair attempts

## On Completion

```
Build complete: .godpowers/build/STATE.md
[N] slices delivered. [N] commits. All tests passing.

Suggested next: /god-harden (adversarial review, gates Launch)
Alternative: /god-deploy (set up deploy pipeline, parallel-safe)
Both can run; /god-harden is the critical path to Launch.
```

If more delivery increments remain in the roadmap, continue building the next
increment before moving to Tier 3 unless the user explicitly asked to stop
after the current increment.


## Locking

The orchestrator acquires a state-lock before this skill mutates anything,
scoped to the smallest affected unit (e.g. `tier-1.prd` for `/god-prd`,
`linkage` for `/god-scan`). Lock TTL is 5 minutes; reentrant for the
same holder; force-reclaimable if stale via `/god-repair`.

Read-only inspection commands (`/god-status`, `/god-doctor`,
`/god-locate`) do NOT block on the lock. Concurrent writers on
non-overlapping scopes are allowed; on overlapping scopes, the second
writer pauses or routes elsewhere via `/god-next`.

See [ARCHITECTURE.md "Concurrency contract"](../ARCHITECTURE.md) for
the full contract.
