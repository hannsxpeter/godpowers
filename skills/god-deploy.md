---
name: god-deploy
description: |
  Set up deploy pipeline. Spawns the god-deploy-engineer agent in a fresh
  context. Gated on Build.

  Triggers on: "god deploy", "/god-deploy", "deploy this", "CI/CD", "ship it"
---

# /god-deploy

Spawn the **god-deploy-engineer** agent in a fresh context via the host platform's native agent spawning mechanism.

## Setup

1. Verify build is complete (`.godpowers/build/STATE.md` exists with passing state).
2. Verify all tests pass.
3. Spawn god-deploy-engineer with ARCH and stack DECISION paths.
4. The agent writes `.godpowers/deploy/STATE.md`.

## Verification

After god-deploy-engineer returns:
1. Verify STATE.md exists on disk
2. Verify rollback procedure has been tested (not paper-only)
3. Verify the deploy path is one of:
   - real staging or production target tested
   - local staging harness tested with equivalent health, smoke, and rollback
     commands
   - local/CI deploy readiness complete with deployed staging verification
     deferred in `.godpowers/deploy/WAITING-FOR-EXTERNAL-ACCESS.md`
4. Update `.godpowers/PROGRESS.md`: Deploy status can be done when a tested
   real target or tested local staging harness exists. If deployed staging is
   deferred, annotate Deploy as done-local with the waiting artifact path and
   do not pause unless the user explicitly requested staging.

## On Completion

```
Deploy pipeline complete: .godpowers/deploy/STATE.md

Suggested next: /god-observe (wire SLOs, alerts, runbooks)
```

Under `/god-mode --yolo`, do not stop with a provider checklist. Create or
update the deploy scripts, smoke command, rollback command, health endpoints,
env manifest, and local staging harness first. If real external access is still
required, record the single access bundle in
`.godpowers/deploy/WAITING-FOR-EXTERNAL-ACCESS.md` and continue until the user
requests staging or final sign-off begins.

The single access bundle must be incremental. Do not ask for
`STAGING_APP_URL` mid-run unless the user requested deployed staging. At final
sign-off or explicit staging, ask for the smallest next item needed to run the
next command. If no live target URL is known, ask only for
`STAGING_APP_URL=<staging-origin>` and the exact smoke command that will run.
Do not ask for provider keys, API tokens, dashboards, DNS tokens, production
secrets, admin consoles, or test users until a specific scripted check proves
that exact item is required.

Live target URLs must be evidence-backed. Accept current user input, env/config
values, deployment config, CI variable references, IaC output, hosting CLI
output, or deployment docs that explicitly label the URL as owned and current.
Never invent a domain from the product name, repo name, package name, README
title, brand name, or common TLDs. If only local URLs exist, run local smoke
only, record deployed staging as deferred, and continue. If only production is
known, do not use it as staging without explicit user approval.


## Re-invocation contract

What happens if `/god-deploy` is run when `.godpowers/deploy/STATE.md` already exists:

| Existing state | Behavior |
|---|---|
| File does not exist | Spawn god-deploy-engineer; produce file; mark sub-step done |
| File exists, passes lint, state.json says `done` | Pause: ask user (A) re-run anyway with diff preview, (B) treat as imported (no-op), (C) cancel |
| File exists, fails lint or have-nots | Spawn god-deploy-engineer in update mode with current file + findings as input. Diff preview before overwrite. |
| File exists, state.json says `pending` | Treat as imported: hash + register, no agent spawn. User can `/god-deploy --force` to re-run. |
| `--force` flag passed | Snapshot existing file to `.godpowers/.trash/god-deploy-<ts>/`. Spawn agent fresh. |
| `--dry-run` flag passed | Show what would happen; touch nothing |

Snapshots in `.trash/` are recoverable via `/god-restore` for 30 days.
The reflog records every god-deploy invocation as `op:god-deploy` for `/god-undo`.

### Idempotency guarantees

- Running `/god-deploy` twice with no user input between them is a no-op
  (second call detects the artifact and pauses).
- Running `/god-deploy --dry-run` is always read-only.
- An interrupted `/god-deploy` (agent crashes mid-run) leaves state.json
  with `status: failed` and the artifact path either missing or marked
  for `/god-repair` review. Re-running picks up cleanly.


## Locking

See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
