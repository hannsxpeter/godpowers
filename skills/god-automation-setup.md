---
name: god-automation-setup
description: |
  Prepare an explicit opt-in setup plan for host-native Godpowers automation.
  Never creates schedules, routines, background agents, API triggers, or CI
  workflows without user approval.

  Triggers on: "god automation setup", "set up background automation", "make godpowers proactive"
---

# /god-automation-setup

Prepare and, after approval, execute safe host-native automation setup.

## Process

1. Resolve the runtime root and load `<runtimeRoot>/lib/automation-providers.js`.
2. Call `automation.setupPlan(projectRoot)`.
3. Print `automation.renderSetupPlan(plan)`.
4. Ask the user to choose:
   - provider
   - templates
   - cadence
   - connector or repository scope
   - whether write actions are allowed
5. If the plan reports `execution.directHostToolCalling: true`, and the user
   approved the exact provider, template, cadence, and scope, use the host
   automation tool or native command from `execution`.
6. If setup is complex, write-capable, multi-template, background-agent based,
   scriptable-scheduler based, or provider-uncertain, spawn
   `god-automation-engineer` with the approved provider, templates, cadence,
   scope, and plan output.
7. If no host tool is callable, return exact manual setup steps and do not
   record an active automation.
8. After host setup succeeds, write or update `.godpowers/automations.json`
   through `automation.buildAutomationRecord(...)` and
   `automation.recordAutomation(..., { confirmedHostSuccess: true })` with:
   - automation id
   - provider id
   - status
   - cadence
   - prompt summary
   - created timestamp
   - host surface used
9. Run `/god-automation-status` after setup and show the result.

## Tool Calling And Agent Use

Use host tool calling when available for simple, approved, read-only setup:

- Codex App: call the Codex automation tool.
- Claude Code: use the schedule or routine surface.
- Cline: use `cline schedule`.
- Qwen Code: use `/loop` and report that it is session-scoped.

Spawn `god-automation-engineer` when any of these are true:

- more than one template is requested
- any write-capable automation is requested
- provider setup needs background agents, API triggers, CI, OS scheduling, or
  repository scope
- the host tool exists but the setup requires multiple steps
- provider capability is uncertain

## Hard Stops

Do not create automations during install.

Do not create any automation that can do these unless the user explicitly asks
for that exact write-capable automation:

- stage, commit, push, merge, package, publish, or release
- deploy to staging or production
- access provider dashboards, DNS, credentials, secrets, or billing
- clear `.godpowers/REVIEW-REQUIRED.mdx`
- accept Critical security findings
- run broad dependency upgrades
- delete files, reset branches, or clean worktrees

## Safe Starting Templates

- `daily-status`: run `godpowers status --project .` and summarize current phase, progress, open items, and next action
- `stale-checkpoint`: inspect checkpoint freshness and suggest `/god-sync` or `/god-resume-work`
- `review-queue`: report unresolved review items without clearing them
- `weekly-hygiene`: report docs, dependencies, checkpoint, reviews, and hygiene signals
- `strict-release-readiness`: fail-closed release readiness across root docs, docs, agents, skills, routing, workflows, schema, templates, references, hooks, lib, scripts, tests, fixtures, GitHub workflows, package metadata, git tag state, GitHub release state, npm latest, and local install state
- `release-readiness`: report release readiness without publishing

Use `strict-release-readiness` for any background release automation. Use
`release-readiness` only for quick manual checks where the user explicitly
accepts a narrower report.

## Provider Guidance

- Codex App: use native Codex automations when the host exposes them.
- Claude Code: use `/schedule` for scheduled routines. Use Claude web for API or GitHub triggers.
- Cline: use `cline schedule` or the Cline SDK scheduler.
- Kilo: use KiloClaw Scheduled Triggers.
- Qwen Code: use `/loop` only for session-scoped checks and report that it is not durable.
- Cursor: use Background Agents or the Background Agent API for branch-scoped async work.
- GitHub Copilot: use issues, pull requests, or Copilot cloud agent entry points.
- Windsurf: install workflows or skills, but report that workflows are manual-only.
- Gemini CLI, OpenCode, CodeBuddy, and Pi: use headless or SDK execution only with an approved scheduler.
- Trae and Antigravity: report scheduled automation as unknown unless the host proves otherwise.

## Output Shape

```text
Godpowers Automation Setup Plan

Recommended provider: <provider>

Setup steps:
  1. <host-native setup step>

Execution path:
  - Method: <host-tool-calling | host-native-command | local-command | manual>
  - Action: <approved host action>
  - Direct host tool calling: <available after approval | not available>
  - Specialist agent: <god-automation-engineer | not required>
  - Record after success: .godpowers/automations.json

Recommended safe templates:
  - <template id>: <prompt>

Approval required:
  - Choose a provider
  - Choose one or more templates
  - Confirm any host-native schedule, routine, background agent, API trigger, or connector scope
```

## Next Commands Closeout

End with:

```text
Next commands:
- /god-automation-setup: Create one approved read-only automation.
- /god-automation-setup --all-safe: Create all approved safe read-only automations.
- /god-discuss automation policy: Tune provider, cadence, or safety rules.
- /god-automation-status: Inspect status before continuing.
```
