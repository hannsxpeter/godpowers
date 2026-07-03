---
name: god-suite-patch
description: |
  Coordinated change touching multiple repos in a Mode D suite. One
  logical change; multiple PRs, atomically tracked. Use for refactors
  spanning shared code + dependents.

  Triggers on: "god suite patch", "/god-suite-patch",
  "coordinated patch", "cross-repo refactor"
---

# /god-suite-patch

A single change description applied across multiple repos in the
suite. Each affected repo's `god-orchestrator` runs the patch
locally; the coordinator tracks atomicity.

## Process

1. Verify suite is registered.
2. Prompt for:
   - Patch description (what's the change)
   - Repos in scope (defaults: all siblings; user can subset)
   - Per-repo any specific notes
3. Create `.godpowers/runs/<run-id>/COORDINATOR-HANDOFF.mdx` with the patch
   description, repos in scope, per-repo notes, dry-run flag, and patch-mode
   instruction.
4. Spawn `god-coordinator` in `patch` mode with only a display-safe payload:
   - Name the hub path.
   - Name the operation as `patch`.
   - Name the handoff file path.
   - Say: "Read the handoff file first, then coordinate the suite patch from
     disk state. Return only user-facing progress and final status."
   Do not put patch descriptions, per-repo notes, sibling paths, local file
   lists, or detailed instructions in the visible spawn message.
5. For each repo in scope:
   - Write a per-repo orchestrator handoff file and spawn that repo's
     `god-orchestrator` with only a display-safe pointer for the patch
     directive
   - Track success/failure
6. Coordinator aggregates results:
   - All succeeded: report success; append to SYNC-LOG.md
   - Some failed: report partial; suggest manual continuation OR
     rollback (`/god-suite-patch --rollback <patch-id>`)

## Forms

| Form | Action |
|---|---|
| `/god-suite-patch "<description>"` | Apply across all siblings |
| `/god-suite-patch "<description>" --repos a,b` | Subset |
| `/god-suite-patch --dry-run` | Show what would change per repo |
| `/god-suite-patch --rollback <id>` | Undo a previous suite-patch |

## Atomicity

Per-repo orchestrators run independently. If one fails:
- The coordinator does NOT auto-rollback the others
- It reports the failure and asks the user
- Rollback is opt-in via `--rollback`

This matches the Quarterback rule: each repo's orchestrator owns its
own state. Cross-repo atomicity is human-coordinated, not magic.

## Use cases

- "Rename X to Y everywhere it appears"
- "Update all repos to use the new shared-libs API"
- "Fix CVE-2026-XXXX across all services that use vulnerable lib"
- "Add a new shared CI step to all repos"

## What this does NOT do

- Bypass per-repo lint, design-review, or runtime gates
- Apply changes to repos that aren't declared siblings
- Auto-rollback (preserved as explicit user action)
