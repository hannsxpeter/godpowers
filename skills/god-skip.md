---
name: god-skip
description: |
  Explicitly skip a tier or sub-step with an audit reason. The skip is
  logged so /god-audit and /god-doctor can flag it later. Different
  from just not running the command: a skip is a recorded decision.

  Triggers on: "god skip", "/god-skip", "skip harden", "skip deploy
  for now"
---

# /god-skip

Mark a tier or sub-step as explicitly skipped, with a reason that
becomes part of the audit trail.

## Usage

### `/god-skip <tier-or-substep> --reason "..."`

Examples:
- `/god-skip harden --reason "internal-only POC, no public exposure"`
- `/god-skip deploy --reason "shipping as a library, no deploy needed"`
- `/god-skip observe --reason "tracked in parent platform's observability"`

The reason is required. Skips without reason are rejected.

## Process

1. Identify the tier or sub-step.
2. Verify the skip is allowed by the workflow (some sub-steps are
   mandatory; e.g. /god-mode rejects skipping the final /god-sync).
3. Mark the sub-step `status: skipped` in state.json with `skipped-reason`.
4. Append a `op:skip` event to the reflog.
5. Update PROGRESS.md so the user sees the skip annotated.

## What skip does NOT do

- Skip does not delete or move artifacts; if an artifact was partially
  produced, use `/god-undo` first then `/god-skip`.
- Skip does not silence audit findings. `/god-audit` still flags the
  skip with severity = info (or higher if the skip is risky, e.g.
  skipping harden in a public-facing project).

## Mandatory non-skippable steps

These cannot be skipped:
- The final `/god-sync` at the end of the project run
- `/god-harden` for projects with `public-facing: true` in intent.yaml
- Standards gates between tiers (use `/god-standards --override` to bypass with reason)

## Subcommands

### `/god-skip --list`
Show all currently-skipped sub-steps in the project.

### `/god-skip --unskip <tier-or-substep>`
Reverse a previous skip. Marks the sub-step `pending` again.

## Implementation

Built-in. Reads + writes `state.json` and PROGRESS.md. Appends to reflog.


## Locking

See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
