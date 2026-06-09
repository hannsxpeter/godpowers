# Godpowers Dashboard Contract

This reference owns the shared dashboard shape for `/god-status`, `/god-next`, `/god-mode` closeouts, and completed command closeouts.

## Runtime source

Prefer `lib/dashboard.js` for dashboard computation. Call `dashboard.compute(projectRoot)`, then render with `dashboard.render(result)` unless the caller needs a narrower brief view.

If the runtime module is unavailable, use a manual disk scan and say `Dashboard engine: unavailable, manual scan used`.

Never mix workflow progress with audit, hygiene, remediation, or launch-readiness scores. Label those scores separately when they appear.

## Required shape

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
  Ledger: .godpowers/REQUIREMENTS.md

What changed:
  1. <highest-signal user-visible change>
  2. <highest-signal user-visible change>

Validation:
  + <command>: <result>

Proactive checks:
  Checkpoint: <fresh | refreshed | missing | stale | conflicts with state.json>
  Reviews: <none | N pending, suggest /god-review-changes>
  Sync: <fresh | missing | stale | local helper ran | suggest /god-sync>
  Docs: <fresh | N stale, suggest /god-docs | repo-doc-sync ran>
  Repo surface: <fresh | N stale, suggest /god-doctor | repo-surface-sync ran>
  Host: <full | degraded | unknown with host and first gap>
  Runtime: <not-applicable | known URL, suggest /god-test-runtime | no known URL, defer deployed verification>
  Automation: <not configured | N active | available via provider, suggest /god-automation-setup>
  Security: <clear | sensitive files changed, suggest /god-harden>
  Dependencies: <clear | dependency files changed, suggest /god-update-deps>
  Hygiene: <fresh | stale, suggest /god-hygiene>

Open items:
  1. <deferred staging, unstaged files, pending review, blocker, or none>

Next:
  Recommended: <one concrete command or user decision>
  Why: <one sentence tied to current state>
```

## Proposition closeout

When a command only recommends work, end with this proposition block unless it already launched the selected command.

```text
Proposition:
  1. Implement partial: <single suggested command>
  2. Implement complete: <recipe sequence or /god-mode when safe>
  3. Discuss more: /god-discuss <routing ambiguity or missing prerequisite>
  4. Inspect status: /god-status, /god-locate, or /god-next
Recommended: <one option and why>
```

## Proactive rules

`/god-status` is read-only by default, so Level 3 agent work becomes a suggestion unless the user asked it to continue work.

`/god-next` may run Level 2 local helpers only when there is a direct trigger. Standalone `/god-next` turns Level 3 work into the recommended command or a proposition option.

Report checkpoint, review, sync, docs, repo surface, host, runtime, automation, security, dependency, and hygiene signals using the labels in the required shape.
