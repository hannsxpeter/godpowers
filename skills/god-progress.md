---
name: god-progress
description: |
  Deliverable progress report. Answers "what is done, what is in progress, and
  what is left?" at the requirement and roadmap-increment level (not the
  pipeline-stage level that /god-status leads with). Re-derives everything from
  disk and refreshes the .godpowers/REQUIREMENTS.mdx ledger.

  Triggers on: "god progress", "what's done", "what's left", "requirements
  status", "how far along are we", "show me the checklist", "deliverable
  progress", "what did we finish".
---

# God Progress

Report deliverable progress: which requirements are done, in progress, or not
started, and which roadmap increments are complete. This is the requirement-level
companion to `/god-status` (which leads with pipeline-stage progress and
proactive ops). Never report from memory; re-derive from disk every time.

## Process

1. If `.godpowers/state.json` is missing: say
   "No Godpowers project found. Run `/god-init` to start." and stop.
2. Resolve the runtime root and load `<runtimeRoot>/lib/requirements.js`.
3. Call `requirements.derive(projectRoot)`. This reads, all from disk:
   - `.godpowers/prd/PRD.mdx` for declared requirements (P-MUST/SHOULD/COULD ids)
   - `.godpowers/roadmap/ROADMAP.mdx` for delivery increments and their members
   - `.godpowers/links/` for the linkage forward map (requirement -> code)
   - `.godpowers/state.json` for build and increment completion
4. Refresh the ledger: `requirements.writeLedger(projectRoot, derived)` so
   `.godpowers/REQUIREMENTS.mdx` always reflects current disk truth.
5. Compute "what's next": the highest-priority requirement that is not yet done
   (MUST before SHOULD before COULD), preferring one whose increment is already
   building. Fall back to `router.suggestNext(projectRoot)` for the command.
6. Render the report below.

If `requirements.derive` reports `hasRequirements: false` (no PRD requirements
declared yet), say so plainly and route the user to `/god-prd`, then stop.

## Output Format

```text
Godpowers Progress

Source: disk (PRD + ROADMAP + linkage + build state)
Ledger: .godpowers/REQUIREMENTS.mdx

Requirements: [########------------] 8/14 done (57%)
  In progress: 3
  Not started: 3
  By priority:  MUST 6/8 | SHOULD 2/4 | COULD 0/2

Increments:
  [x] M-auth: Authentication [now] - done - 3/3 requirements
  [~] M-billing: Billing [now] - building - 1/4 requirements
  [ ] M-reports: Reporting [next] - pending - 0/3 requirements

Recently done:
  + P-MUST-05 Password reset emails send  (M-auth)
  + P-MUST-06 Sessions expire after 24h   (M-auth)

In progress now:
  ~ P-MUST-07 Stripe webhook handling      (M-billing) - src/billing/webhook.ts

Up next:
  P-MUST-08 Invoice PDF generation (M-billing, not started)
  Recommended command: /god-build
  Why: M-billing is the current increment and P-MUST-08 is its next MUST.

Gaps:
  none
  (or: P-MUST-09 is in a done increment but has no linked code)

Open the full checklist any time: .godpowers/REQUIREMENTS.mdx
```

Use plain text. No emoji, no box-drawing. Ledger marks are `[x]` done, `[~]`
in progress, `[ ]` not started, matching the ledger file.

## Next Commands Closeout

End every progress report with a Next commands block:

```text
Next commands:
- /god-build: Continue the next build step when the roadmap is unblocked.
- /god-mode: Continue the project run when the current phase is safe to resume.
- /god-status --full: Inspect the complete dashboard and proactive checks.
- /god-discuss <blocked requirement>: Resolve a gap before continuing.
```

If `derived.gaps` is non-empty, make `/god-review-changes` (or fixing the gap)
the partial option and call the gap out first, since a done increment with
unlinked code is a real inconsistency.

## Relationship to other commands

- `/god-status` - pipeline-stage progress (which tier/sub-step), proactive ops,
  and overall readiness. Use when you want the operational picture.
- `/god-progress` - deliverable progress (which requirements/increments).
  Use when you want to know how much of the actual product is built.
- `/god-next` - just the single recommended next command.
- `.godpowers/REQUIREMENTS.mdx` - the static checklist file to open or share.
