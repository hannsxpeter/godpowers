---
name: god-status
description: |
  Re-derive project state from disk. Never from memory. Scans all artifact
  paths and reports what exists, what passes, and what's missing.

  Triggers on: "god status", "where are we", "project status", "what's done",
  "god status --locate", "god status --lifecycle"
---

# God Status

Re-derive state from disk. Your memory is not authoritative. The file system is.

## Status family views

`/god-status` is the continue-family overview. It renders operational state,
proactive checks, blockers, planning visibility, and the next action first.

| View | Shortcut | Purpose |
|------|----------|---------|
| Overview | `/god-status` | Operational state, proactive checks, and blockers. |
| Full dashboard | `/god-status --full` | Complete dashboard and every proactive check. |
| Progress ledger | `/god-progress` | Requirement and roadmap increment completion. |
| Lifecycle phase | `/god-status --lifecycle` | Project phase and fitting workflows. |
| Resume location | `/god-status --locate` | Orientation from checkpoint, handoff, and disk state. |
| Next action | `/god-next` | Single recommended command with reason. |

`/god-lifecycle` and `/god-locate` remain callable as full-profile compatibility
aliases for one minor release. New workflows should use `/god-status
--lifecycle` and `/god-status --locate`.

## Process

1. Check whether `.godpowers/state.json` exists. If it does not, treat `.godpowers/PROGRESS.mdx` only as a generated legacy fallback; if neither exists, report that no Godpowers project was found and suggest `/god-init`.
2. Resolve the runtime root and load `<runtimeRoot>/lib/dashboard.js`.
3. Call `dashboard.compute(projectRoot)` and render the compact action brief by default.
4. Prefer the MCP `status` tool when it is available, and fall back to the CLI or runtime module when it is not.
5. If `--full` is present, render the complete dashboard with all proactive checks.
6. If `--lifecycle` is present, emphasize lifecycle phase, fitting workflows, PRD visibility, roadmap visibility, and the next route.
7. If `--locate` is present, emphasize CHECKPOINT.md, HANDOFF.md, recent events, current step, and the next route.
8. Use `.godpowers/PROGRESS.mdx` only as generated fallback or legacy explanation when state.json is missing.
9. Scan canonical artifact paths for PRD, design, architecture, roadmap, stack, repo, build, deploy, observe, launch, harden, sync, checkpoint, and requirements evidence.
10. Compare disk state to recorded state and flag phantom resume or untracked work.
11. Offer `/god-repair` when recorded state and disk evidence conflict.

## Required reference

Read `<runtimeRoot>/references/shared/DASHBOARD-CONTRACT.md` before rendering output. The shared contract owns the compact status shape, full dashboard shape, proactive labels, and `Next commands:` block.

If the runtime module is unavailable, use a manual scan quietly and suggest `/god-doctor` only when the fallback changes the recommendation.

Never mix workflow progress with audit, hygiene, remediation, or launch-readiness scores. Label those scores separately when they appear.

## Proactive behavior

`/god-status` is read-only by default. It suggests Level 3 agents instead of spawning them unless the user asked status to continue work.

Report checkpoint, review, sync, docs, repo surface, host, runtime, automation, security, dependency, and hygiene signals only when they affect the recommendation. `/god-status --full` shows every label from the shared dashboard contract.

## Mode D awareness

If `lib/multi-repo-detector.detect(projectRoot)` returns `isMultiRepo: true`, append suite status with the suite name, role, hub path, aggregate status when available, and a suggestion to run `/god-suite-status`.

Omit the suite section when the project is not part of a registered suite.
