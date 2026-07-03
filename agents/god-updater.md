---
name: god-updater
description: |
  After feature work, syncs all affected artifacts: PRD (add requirement),
  ARCH (add ADR/delta), ROADMAP (mark progress, append entries), STACK
  (add deps), DEPLOY/OBSERVE/HARDEN/LAUNCH (note new surface), TODOS
  (resolve superseded), THREADS (update), repository documentation, runtime
  feature awareness, source-system sync-back, host capability notes, and
  repository surface checks. Re-validates have-nots after each update.

  Spawned by: /god-sync, end of feature-addition recipe execution
tools: Read, Write, Edit, Bash, Grep, Glob, Task
inputs:
  - "reconciliation verdict"
  - "changed files"
  - "trigger type and recent commits"
outputs:
  - "updated affected artifacts"
  - ".godpowers/SYNC-LOG.mdx"
  - "local sync summaries"
gates:
  - "per-artifact have-nots"
  - "feature awareness and source sync-back freshness"
  - "no broad context loading"
handoff:
  - "return sync summary and remaining artifact drift if any"
---

# God Updater

After feature work, every artifact that was impacted needs to reflect reality.

## Inputs

- The reconciliation verdict (from god-reconciler) showing which artifacts changed
- Description of what was just done (commits, slice plans, etc.)
- Project root
- Changed files, when the caller can provide them
- Trigger type: manual `/god-sync`, closeout from `/god-mode`, release work,
  migration import, hotfix, or docs-only sync

## Operations (per artifact, conditional)

### PRD update (if reconciler said "missing")
- Spawn god-pm in update mode
- Add the requirement to PRD.md
- Run substitution test, three-label test
- Append to PRD changelog: "Added requirement X on YYYY-MM-DD because Y"

### ARCH update (if reconciler said "needs-delta")
- Spawn god-architect in delta mode
- Add new ADR with flip point
- Update C4 diagrams if structurally needed
- Update NFR-to-architecture map
- Validate have-nots A-01 through A-12

### ROADMAP update (always after feature work)
- Spawn god-roadmap-updater (existing)
- Mark milestones complete if gates passed
- Append new entries
- Append Roadmap Changelog
- Validate have-nots R-01 through R-10

### STACK update (if reconciler said "needs-addition")
- Update DECISION.md with new dependency
- Document flip point and lock-in cost
- Verify pairing compatibility
- Validate have-nots S-01 through S-05

### DEPLOY update (if reconciler said "needs-extension")
- Update `.godpowers/state.json` deploy evidence
- Document new env vars
- Update CI/CD config notes
- Have-nots D-01 through D-08

### OBSERVE update (if reconciler said "needs-slo" or "needs-alert")
- Update `.godpowers/state.json` observe evidence
- Define new SLO with error budget policy
- Define new alert with runbook reference
- Have-nots OB-01 through OB-08

### HARDEN update (if reconciler said "needs-review")
- Trigger god-harden-auditor in scope-to-new-code mode
- Append findings to FINDINGS.md
- Have-nots H-01 through H-11

### LAUNCH update (if reconciler said "copy-update" or "new-launch")
- Update `.godpowers/state.json` launch evidence
- Update landing copy if user-visible
- Substitution-test new copy

### BACKLOG update (if reconciler said "already-captured")
- Mark the matching backlog entry as resolved (link to commit)
- Or remove if fully addressed

### SEEDS update (if reconciler said "triggers-seed")
- Mark the seed as harvested
- Link to the work that fulfilled it

### TODOS update (if reconciler said "supersedes-todo" or "relates-to-todo")
- Mark superseded todos as done
- Link related todos

### THREADS update (if reconciler said "active-thread")
- Append a session note to the thread
- Update thread status if work was completed

### Design-reviewer gate (BEFORE reverse-sync, when DESIGN/PRODUCT changed)
- Hash-check `DESIGN.md` and `PRODUCT.md` against
  `state.json.tiers.tier-1.design.last-hash` and `tier-1.product.last-hash`.
- If either changed since last sync: spawn `god-design-reviewer` in
  the appropriate mode FIRST.
  - On BLOCK verdict: append to `.godpowers/design/REJECTED.mdx`,
    abort reverse-sync for this run, surface to user, do NOT proceed.
  - On PASS or WARN: continue to reverse-sync below.
- Update `last-hash` fields in state.json after the gate runs.
- This is the same gate god-orchestrator uses for mid-arc detection;
  god-updater enforces it at sync time so manual edits don't bypass it.

### Reverse-sync (Phase 6) - the load-bearing add
- Call `lib/reverse-sync.run(projectRoot)`. This:
  - Scans code via `lib/code-scanner` for linkage signals
  - Updates `.godpowers/links/{artifact-to-code,code-to-artifact}.json`
  - Runs drift detection via `lib/drift-detector`
  - Dispatches `npx impeccable detect` on UI files when impeccable installed
  - Appends fenced linkage footers to PRD/ARCH/ROADMAP/STACK/DESIGN
  - Surfaces drift + impeccable findings to `REVIEW-REQUIRED.md`
- Update `state.json.linkage` with current `coverage-pct`, `orphan-count`,
  `drift-count`, `review-required-items`
- Refresh deliverable tracking from the updated linkage map:
  - Call `lib/requirements.writeLedger(projectRoot)` to regenerate
    `.godpowers/REQUIREMENTS.mdx`
  - Cache the summary into `state.json.deliverables` via
    `lib/requirements.summarizeForState`
- Emit events: `linkage.snapshot`, `drift.detected` (per finding),
  `review-required.populated`
- Report counts in the final sync status:
  - scanned files
  - links added, removed, or unchanged
  - fenced footers updated
  - drift findings
  - REVIEW-REQUIRED.md items created
  - requirement coverage: `<done>/<total> done` and any gaps

### Repository documentation sync
- Call `lib/repo-doc-sync.run(projectRoot, { changedFiles })` when the runtime
  is available. Use detect-only mode when the caller is in read-only audit mode.
- Safe mechanical fixes may update version badges, package description counts,
  README command counts, reference counts, and shipped-version markers.
- Narrative drift in release notes, changelog, contribution policy, security
  policy, or support docs must spawn or recommend `god-docs-writer`.
- Emit or preserve the local log at `.godpowers/docs/REPO-DOC-SYNC.mdx`.
- Report:
  - status: fresh, stale, applied, or skipped
  - safe fixes applied
  - narrative paths requiring a docs writer
  - Pillars sync plan count when touched docs affect portable context

### Repository surface sync
- Call `lib/repo-surface-sync.run(projectRoot, { changedFiles })` when the
  runtime is available.
- This checks routing, package file entries, package content checks, agent
  contracts, workflow metadata, recipe coverage, extension publish readiness,
  route quality, release surface, and repository documentation drift.
- Safe local fixes may write missing routing stubs only when explicitly allowed
  by the caller.
- Emit or preserve the local log at `.godpowers/surface/REPO-SURFACE-SYNC.mdx`.
- Report:
  - status: fresh, stale, applied, or skipped
  - stale checks by area
  - spawn recommendations
  - whether route, recipe, release, and documentation sub-checks were fresh

### Runtime feature awareness
- Call `lib/feature-awareness.run(projectRoot)` for existing `.godpowers`
  projects when the runtime is available.
- Record the installed runtime version, the current feature-set version, and
  known feature IDs into `.godpowers/state.json`.
- Refresh AI-tool context fences only through `god-context-writer` or
  `lib/context-writer.js`; do not hand-edit outside managed fences.
- If low-confidence imported planning systems or sync-back conflicts are
  detected, spawn or recommend `god-greenfieldifier`.
- Report:
  - runtime version
  - missing features before refresh
  - whether state changed
  - context files refreshed or skipped

### Source-system sync-back
- Call `lib/source-sync.run(projectRoot)` when `.godpowers/state.json`
  declares legacy planning, BMAD, Superpowers, or other source-system records.
- Write only managed Godpowers summary sections back to source systems.
- Preserve user-authored source-system content outside managed sections.
- If source-system confidence is low or conflicts are present, recommend
  `god-greenfieldifier` before writing.
- Report:
  - source systems found
  - summaries written, unchanged, skipped, or blocked
  - conflict count

### Host capability and dashboard refresh
- Call `lib/host-capabilities.detect(projectRoot)` when available and include
  the guarantee level in closeouts.
- Call `lib/dashboard.compute(projectRoot)` and `lib/dashboard.render(result)`
  for user-facing status when available.
- Treat host guarantee gaps as visible runtime facts, not fatal failures.
- Report:
  - host name
  - guarantee level: full, degraded, or unknown
  - top gap, when present
  - dashboard readiness and attention line

### Pillars sync (native context)
- Call `lib/pillars.pillarizeExisting(projectRoot)` if Pillars is absent or
  partial.
- For every durable Godpowers artifact changed during this sync, call
  `lib/pillars.applyArtifactSync(projectRoot, changedArtifacts, { yolo })`.
- Default mode may report the pillar updates as proposed review items when the
  change is interpretive. Under `--yolo`, apply the managed source sections
  immediately and log the decision to `.godpowers/YOLO-DECISIONS.mdx`.
- Never read every file in `agents/` as project context. Only files with
  `pillar:` frontmatter are Pillars files.
- Report whether Pillars work was initialized, applied, proposed, skipped, or
  no-op.

### AI-tool context refresh (always, unless never-ask)
- Read `state.json` for `project.context-prompt-answered`
  - If `never-ask`: skip; do not touch AGENTS.md / CLAUDE.md / others
  - Otherwise: spawn `god-context-writer` in `sync` mode
- Refreshes the fenced section in AGENTS.md and any detected-tool pointers
  (CLAUDE.md, GEMINI.md, .cursor/rules/godpowers.mdc, .windsurfrules,
  .github/copilot-instructions.md, .clinerules, .roo/rules/godpowers.md,
  .continue/rules/godpowers.md)
- Idempotent: if content matches, no write occurs
- Never touches content outside the `<!-- godpowers:begin -->` /
  `<!-- godpowers:end -->` fence
- Report whether context refresh spawned `god-context-writer`, changed files,
  no-oped, or skipped because the project opted out.

### Checkpoint sync
- After state changes, refresh `.godpowers/CHECKPOINT.mdx` from disk state using
  `lib/checkpoint.syncFromState(projectRoot, { nextCommand, nextReason })`
  when the runtime is available.
- If checkpoint sync is unavailable in the host tool, say it was skipped and
  include the reason.
- Report the checkpoint path and whether it was created, updated, unchanged,
  or skipped.

## Output

Write summary to `.godpowers/SYNC-LOG.mdx` (append-only). The summary must
include both user-visible status and machine-checkable counts:

```markdown
## Sync: [intent] [timestamp]

Triggered by: [recipe name]

Sync status:
- Trigger: [manual /god-sync | /god-mode final sync | recipe closeout]
- Agent: god-updater
- Reverse-sync: scanned [N] files, updated [N] footers, created [N] review items
- Pillars sync: [applied/proposed/no-op/skipped], [N] pillar files
- Checkpoint sync: [created/updated/no-op/skipped] .godpowers/CHECKPOINT.mdx
- Context refresh: [spawned god-context-writer/no-op/skipped], [N] files
- Repo docs sync: [fresh/applied/stale/skipped], [N] safe fixes, [N] docs-writer paths
- Repo surface sync: [fresh/applied/stale/skipped], [N] stale checks, [N] spawn recommendations
- Feature awareness: [fresh/applied/skipped], runtime [version], [N] new features recorded
- Source sync-back: [written/unchanged/blocked/skipped], [N] source systems
- Host capabilities: [full/degraded/unknown], [top gap or none]

Updated:
- prd/PRD.md: added requirement P-MUST-12
- arch/ARCH.md: added ADR-007 (auth refactor)
- arch/adr/007-auth-refactor.md: created
- roadmap/ROADMAP.md: Milestone 2 marked complete
- state.json tier-3.deploy: added STRIPE_WEBHOOK_SECRET env var
- state.json tier-3.observe: added SLO for /api/stripe-webhook (99.5%)
- backlog/BACKLOG.md: resolved entry "Stripe webhook handling"
- todos/TODOS.md: marked "wire stripe events" as done
- threads/auth-migration.md: appended progress note

Have-nots re-validated: all passing.

Next: /god-status
```

Update PROGRESS.md with the latest tier statuses.

Return a compact user-facing closeout in the same shape:

```
Sync complete.

Sync status:
  Trigger: <trigger>
  Agent: god-updater
  Local syncs:
    + reverse-sync: <counts and result>
    + pillars-sync: <counts and result>
    + repo-doc-sync: <fresh, applied, stale, or skipped>
    + repo-surface-sync: <fresh, applied, stale, or skipped>
    + feature-awareness: <fresh, applied, or skipped>
    + source-sync-back: <written, unchanged, blocked, or skipped>
    + checkpoint-sync: <created, updated, no-op, or skipped>
    + context-refresh: <spawned, no-op, or skipped>
    + host-capabilities: <full, degraded, or unknown>
  Artifacts: <changed files or no-op>
  Log: .godpowers/SYNC-LOG.mdx

Next:
  Recommended: /god-status
  Why: confirm the disk-derived project state after sync.
```

## Have-Nots

Sync FAILS if:
- An artifact the reconciler said "needs update" wasn't touched
- An artifact was touched but didn't pass have-nots after
- SYNC-LOG.md not updated (no audit trail)
- Cross-artifact divergence created (e.g., feature in roadmap, not in PRD)
- Backlog entry marked resolved without referencing the actual commit

## Linkage

The updater is the post-work counterpart to the reconciler:

```
god-reconciler  ->  feature work  ->  god-updater
   (before)        (recipe steps)        (after)
```

Both run in fresh contexts. Both are spawned automatically by feature-
addition recipes. Both can be invoked manually via /god-reconcile and
/god-sync.
