# Godpowers Dashboard Contract

This reference owns the shared closeout shape for `/god-status`, `/god-next`,
`/god-mode` closeouts, and completed command closeouts.

## Runtime Source

Prefer `lib/dashboard.js` for status computation. Call
`dashboard.compute(projectRoot)`, then render a compact action brief unless the
user asks for `/god-status --full` or passes a verbose flag.

If the runtime module is unavailable, use a manual disk scan quietly. Mention
the fallback only when it changes the recommendation, then suggest
`/god-doctor`.

Never mix workflow progress with audit, hygiene, remediation, or
launch-readiness scores. Label those scores separately when they appear.

## Default Closeout

Completed work, proposals, diagnostics, lifecycle views, and status summaries
use this shape by default:

```text
<one sentence describing the result or current position>

Changed:
- <highest-signal user-visible change>
- <highest-signal user-visible change>

Validation:
- <command>: <result>

Attention:
- <only blockers or signals that change the recommendation>

Next commands:
- <recommended command>: <one sentence reason>
- /god-status --full: See the complete dashboard and proactive checks.
```

Omit empty sections. Do not render rows that only say `fresh`, `clear`,
`none`, or `not-applicable`.

## Full Dashboard

The full dashboard is available on request through `/god-status --full` and in
release-gate evidence. It may also appear when a user explicitly asks for all
status details.

```text
Godpowers Dashboard

Source: runtime dashboard (lib/dashboard.js)

Current status:
  State: <complete | partial | blocked | proposal | complete with deferred item>
  Phase: <plain-language phase> (tier <human ordinal> of <human total>)
  Step: <sub-step label> (step <n> of <total steps>)
  Progress: <pct>% workflow progress (<done> of <total> tracked steps complete)
  Worktree: <clean | modified files unstaged | staged changes | mixed>
  Index: <untouched | staged files listed>

Action brief:
  Next: <recommended command or user decision>
  Why: <route reason tied to disk state>
  Readiness: <ready | needs attention>
  Attention: <top blockers or none>
  Host guarantees: <full | degraded | unknown with host and first gap>

Planning visibility:
  PRD: <done | pending | missing | deferred> <artifact path when present>
  Roadmap: <done | pending | missing | deferred> <artifact path when present>
  Current milestone: <roadmap milestone, tier, or next planning gate when known>
  Completion basis: <state.json, PROGRESS.md, artifacts, or audit score source>

Deliverable progress:
  Requirements: <done>/<total> done (<pct>%), <in-progress> in progress, <untouched> not started
  Increments: <done> done, <building> building, <pending> pending
  Ledger: .godpowers/REQUIREMENTS.mdx

Proactive checks:
  Checkpoint: <fresh | refreshed | missing | stale | conflicts with state.json>
  Reviews: <none | N pending, suggest /god-review-changes>
  Sync: <fresh | missing | stale | local helper ran | suggest /god-sync>
  Docs: <fresh | N stale, suggest /god-docs | repo-doc-sync ran>
  Repo surface: <fresh | N stale, suggest /god-doctor | repo-surface-sync ran>
  Host: <full | degraded | unknown with host and first gap>
  Runtime: <not-applicable | known URL, suggest /god-test-runtime | no known URL>
  Automation: <not configured | N active | available via provider, suggest /god-automation-setup>
  Security: <clear | sensitive files changed, suggest /god-harden>
  Dependencies: <clear | dependency files changed, suggest /god-update-deps>
  Hygiene: <fresh | stale, suggest /god-hygiene>

Open items:
  1. <deferred staging, unstaged files, pending review, blocker, or none>

Next commands:
- <recommended command>: <one sentence reason>
- /god-next: Recompute the state-derived next step.
```

## Next Commands

When a command only recommends work, end with this block unless it already
launched the selected command.

```text
Next commands:
- <best runnable command>: <plain sentence reason>
- <second runnable command>: <plain sentence reason>
- <third runnable command>: <plain sentence reason>
```

Use 1 to 4 commands. Put the recommendation first. Do not show abstract
implementation choices when a slash command can name the next move.

## Proactive Rules

`/god-status` is read-only by default, so Level 3 agent work becomes a
suggestion unless the user asked it to continue work.

`/god-next` may run Level 1 read-only checks by default. It may run Level 2
local helpers only when there is a direct trigger and no destructive effect.
Standalone `/god-next` turns Level 3 work into the recommended command.

Report checkpoint, review, sync, docs, repo surface, host, runtime, automation,
security, dependency, and hygiene signals using the labels in the full
dashboard only when they affect the recommendation or the user asks for full
status.
