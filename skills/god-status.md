---
name: god-status
description: |
  Re-derive project state from disk. Never from memory. Scans all artifact
  paths and reports what exists, what passes, and what's missing.

  Triggers on: "god status", "where are we", "project status", "what's done"
---

# God Status

Re-derive state from disk. Your memory is not authoritative. The file system is.

## Status family views

`/god-status` is the continue-family overview. It renders operational state,
proactive checks, blockers, planning visibility, and the next action first.

| View | Shortcut | Purpose |
|------|----------|---------|
| Overview | `/god-status` | Operational state, proactive checks, and blockers. |
| Progress ledger | `/god-progress` | Requirement and roadmap increment completion. |
| Lifecycle phase | `/god-lifecycle` | Project phase and fitting workflows. |
| Resume location | `/god-locate` | Orientation from checkpoint, handoff, and disk state. |
| Next action | `/god-next` | Single recommended command with reason. |

`/god-lifecycle` remains separate because it answers phase and workflow-fit questions without the full dashboard. `/god-locate` remains separate because it is optimized for fresh-session resume from CHECKPOINT.md, handoff files, and disk state.

## Process

1. Check whether `.godpowers/state.json` or `.godpowers/PROGRESS.md` exists. If neither exists, report that no Godpowers project was found and suggest `/god-init`.
2. Resolve the runtime root and load `<runtimeRoot>/lib/dashboard.js`.
3. Call `dashboard.compute(projectRoot)` and render with `dashboard.render(result)`.
4. Prefer the MCP `status` tool when it is available, and fall back to the CLI or runtime module when it is not.
5. Use `.godpowers/PROGRESS.md` only as fallback or legacy explanation when `state.json` is missing.
6. Scan canonical artifact paths for PRD, design, architecture, roadmap, stack, repo, build, deploy, observe, launch, harden, sync, checkpoint, and requirements evidence.
7. Compare disk state to recorded state and flag phantom resume or untracked work.
8. Offer `/god-repair` when recorded state and disk evidence conflict.

## Required reference

Read `<runtimeRoot>/references/shared/DASHBOARD-CONTRACT.md` before rendering output. The shared contract owns the dashboard shape, proactive labels, and proposition block.

If the runtime module is unavailable, fall back to a manual scan and say `Dashboard engine: unavailable, manual scan used`.

Never mix workflow progress with audit, hygiene, remediation, or launch-readiness scores. Label those scores separately when they appear.

## Proactive behavior

`/god-status` is read-only by default. It suggests Level 3 agents instead of spawning them unless the user asked status to continue work.

Report checkpoint, review, sync, docs, repo surface, host, runtime, automation, security, dependency, and hygiene signals using the labels in the shared dashboard contract.

## Mode D awareness

If `lib/multi-repo-detector.detect(projectRoot)` returns `isMultiRepo: true`, append suite status with the suite name, role, hub path, aggregate status when available, and a suggestion to run `/god-suite-status`.

Omit the suite section when the project is not part of a registered suite.
