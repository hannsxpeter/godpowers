---
name: god-mode
description: |
  Full autonomous project-run orchestrator. Spawns the god-orchestrator agent in a
  fresh context which runs the entire workflow: idea to hardened production.
  Pauses only for legitimate human-only decisions.

  Triggers on: "god mode", "/god-mode", "autonomous build", "one-shot",
  "full arc", "idea to production", "build everything"
---

# /god-mode

You are receiving a /god-mode invocation. Your job is to spawn the
**god-orchestrator** agent in a fresh context to run the autonomous project
workflow.

## Process

1. Resolve whether this is a new project run or a resume:
   - If `.godpowers/state.json`, `.godpowers/PROGRESS.mdx`, or
     `.godpowers/CHECKPOINT.mdx` exists, this is a resume. Treat `state.json`
     as the source of truth and `PROGRESS.md` as a generated legacy fallback.
     Do not ask the user to describe the project again. Call
     `lib/pillars.pillarizeExisting(projectRoot)` first, then rehydrate intent
     from disk and continue.
   - If no durable Godpowers state exists and no project description was
     supplied in the invocation, greet briefly: "God Mode engaged. Describe
     what you want to build."
   - If no durable state exists and the invocation includes a description, use
     that description immediately.

2. **Auto-detect project type in background** (no jargon to user):
   - Scan working directory for code presence (package.json, src/, etc.)
   - Look for org-context.yaml (current dir + parents)
   - Decide: greenfield / brownfield / bluefield (internally A/B/C/E)
   - Announce in plain English what was detected (see god-orchestrator
     "How to announce" section)

3. Load durable resume context before asking anything:
   - Pillars load set from `lib/pillars.computeLoadSet(projectRoot, taskText)`,
     starting with `agents/context.md` and `agents/repo.md`
   - `.godpowers/CHECKPOINT.mdx` first, when present
   - `.godpowers/state.json`
   - `.godpowers/PROGRESS.mdx` only as a generated legacy fallback when state is missing
   - `.godpowers/intent.yaml`, when present
   - `.godpowers/prep/INITIAL-FINDINGS.mdx`, when present
   - `.godpowers/prep/IMPORTED-CONTEXT.mdx`, when present
   - `.godplans/PLAN.mdx`, when present (sibling godplans master plan; read-only)
   - `.godaudits/AUDIT.mdx`, when present (sibling godaudits audit; read-only)
   - Existing tier artifacts on disk

   If these files contain enough information to identify the project and next
   unfinished or red step, continue automatically. If the only missing data is
   a nice-to-have description, use a `[HYPOTHESIS]` from existing artifacts and
   keep moving.

   Ask for a description only when there is no durable intent, no completed
   artifact, and no resumable state.

4. Parse flags from the invocation:
   - `--yolo` (skip pauses, pick defaults)
   - `--conservative` (more checkpoints)
   - `--from=<tier>` (resume from specific tier)
   - `--audit` (score only, build nothing)
   - `--dry-run` (plan only, no agent dispatch)
   - `--workflow=<name>` (v0.14 workflow runtime; load
     `workflows/<name>.yaml`, run via `lib/workflow-runner`)
   - `--plan` (v0.14; emit plan to `.godpowers/runs/<id>/plan.yaml`
     and stop. Same effect as `--dry-run`. Use with `--workflow` for
     a specific project run's plan.)
   - `--brownfield` (force brownfield path even if detection says greenfield)
   - `--bluefield` (force bluefield path)
   - `--greenfield` (force greenfield, skip archaeology even if code exists)

5. Create a private disk handoff before spawning the orchestrator:
   - Path: `.godpowers/runs/<run-id>/ORCHESTRATOR-HANDOFF.mdx`
   - Create parent directories if needed.
   - Put all detailed orchestration context in this file, including:
     - The user's project description, or durable intent recovered from disk
     - The detected mode (A/B/C/E)
     - The active flags
     - Instruction that existing `.godpowers` state means resume, not prompt
     - Instruction to read `.godpowers/state.json` from disk, using `.godpowers/PROGRESS.mdx` only as generated legacy fallback when state is missing
     - Instruction to read `.godpowers/prep/INITIAL-FINDINGS.mdx` and
       `.godpowers/prep/IMPORTED-CONTEXT.mdx` if present before choosing the
       first planning or build step
     - Instruction to read `.godpowers/preflight/PREFLIGHT.mdx` if present
       before choosing the first brownfield or bluefield action
     - Instruction to read `.godplans/PLAN.mdx` and `.godaudits/AUDIT.mdx` if
       present before choosing the first step. When PLAN.mdx exists and
       Godpowers tiers are pending, prefer importing plan seeds via
       `/god-migrate` over re-running god-pm or god-architect from scratch,
       and honor the plan's GP task checkboxes as already-planned work. When
       AUDIT.mdx exists, feed its open GA remediation tasks into the repair
       loop instead of rediscovering them. Both files are read-only for
       Godpowers except when executing GP/GA tasks, in which case the
       executing agent follows the executor rules embedded in the files
       themselves; all other write-back goes through the managed
       `.godplans/GODPOWERS-SYNC.mdx` or `.godaudits/GODPOWERS-SYNC.mdx`
       companions.
     - Instruction to compute and load the Pillars load set before every major
       command, because Pillars is the native project context layer
     - Instruction to run `/god-design` after `/god-prd` and before
       `/god-arch` when initial findings, imported planning context, the PRD,
       or the codebase show UI or product-experience signals
     - Instruction that a red test, typecheck, lint, build, or check command
       is not a completed project run. It must enter the autonomous repair loop and
       continue the same `/god-mode` run until green, except for Critical
       security or a genuine human-only decision.
     - Instruction that deploy, observe, harden, and launch must follow the
       Shipping Closure Protocol: verify a real environment when available,
       otherwise create local/CI-verifiable deploy automation, defer deployed
       staging by default, and continue until the user requests staging or the
       project run reaches final sign-off.
     - Instruction that keys, API tokens, dashboards, admin consoles, and
       provider-specific access are last-mile inputs. Do not pause mid-run for
       `STAGING_APP_URL` unless the user requested deployed staging. At final
       sign-off, ask only for the smallest next item needed by a concrete
       command, usually `STAGING_APP_URL=<staging-origin>`. Ask for additional
       provider access only after a named check proves it is needed.
     - Instruction that staging, preview, and production URLs must come from
       direct evidence. Never infer or invent a domain from project name,
       package name, repo name, README title, or brand name. If no deployed
       origin is evidenced, record deployed staging as deferred and continue
       until staging is requested or final sign-off begins.
     - Instruction that brownfield and bluefield greenfield simulation audits
       must be acted on by god-greenfieldifier. The greenfieldifier writes
       `.godpowers/audit/GREENFIELDIFY-PLAN.mdx`, pauses before risky canonical
       artifact rewrites, and updates every affected artifact after approval.
     - Instruction that brownfield and bluefield arcs run `/god-preflight`
       automatically when `.godpowers/preflight/PREFLIGHT.mdx` is absent.
       Greenfield project runs skip preflight unless the user explicitly requests it.
     - Instruction to run routing prerequisites through `lib/router.js`
       `checkPrerequisites` before every direct command dispatch. If
       `safe-sync-clear` fails, run
       `/god-reconcile Release Truth And Safe Sync` before deploy, observe,
       harden, launch, broad migration, or resume work.
     - Instruction to run `npx godpowers gate --tier=<tier> --project=.`
       after each tier skill returns and before starting the downstream tier
       for PRD, design when required, architecture, roadmap, stack, repo,
       build, and harden. A non-zero exit pauses the project run for repair.
     - Instruction that `--yolo` cannot bypass safe sync blockers or
       unresolved Critical harden findings. These are release-truth gates, not
       preference pauses.
     - Instruction to run `npx godpowers gate --tier=<tier> --project=.` after
       each completed `god-prd`, `god-design`, `god-arch`, `god-roadmap`,
       `god-stack`, `god-repo`, `god-build`, and `god-harden` tier skill and
       before starting the downstream tier. A non-zero exit blocks progress
       until the artifact is repaired.

6. Spawn the **god-orchestrator** agent via the host platform's native agent spawning mechanism with only a
   display-safe payload:
   - Name the project root.
   - Name the invocation flags.
   - Name the handoff file path.
   - Say: "Read the handoff file first, then run the autonomous workflow from disk
     state. Return only user-facing progress and final status."

   Do not put recovered checkpoint facts, safe-sync plans, local file lists,
   hidden routing rules, or detailed instructions in the spawn message.
   Assume the host UI may display the raw spawn message to the user.

7. Keep the spawn payload display-safe. Do not echo or summarize raw spawn input,
   "Hard instructions", hidden orchestration rules, agent prompts, file
   loadout lists, or internal routing payloads into the user-visible transcript.
   The visible transcript may say only what phase is running, what durable state
   was detected, what commands are running, what changed, and the final
   `Project run complete` or `PAUSE: external access required` block.

8. Orchestrator runs the appropriate workflow:
   - Greenfield -> full project run
   - Brownfield -> brownfield project run (preflight -> archaeology -> reconstruct -> debt-assess -> greenfield simulation audit -> greenfieldify plan and approved artifact updates -> proceed)
   - Bluefield -> bluefield project run (org-context -> preflight -> greenfield simulation audit -> greenfieldify plan and approved artifact updates -> workflow with constraints)

9. Relay only the orchestrator's user-facing output to the user. If the
   platform displays raw spawn details automatically, the displayed payload
   should already be safe. Immediately follow with a clean public summary and
   never repeat detailed handoff contents.

10. When the orchestrator pauses, present the question to the user using the
   pause format (What / Why / Options / Default).

11. When the user answers, append the answer to the existing handoff file or
    create a new handoff file, then re-spawn god-orchestrator with only the
    display-safe pointer.

## Runbook Contracts

Detailed operator transcript rules, step cards, pause format, flag behavior, mandatory final sync, and completion templates live in `references/orchestration/GOD-MODE-RUNBOOK.md`.

When spawning `god-orchestrator`, include the runbook path in the private handoff file and instruct the orchestrator to follow it. Keep the visible spawn payload display-safe and never copy hidden handoff details into the transcript.

Use the runbook for:
- User-visible transcript contract
- Step cards
- Pause format
- Flag semantics
- Mandatory final sync
- Completion block
