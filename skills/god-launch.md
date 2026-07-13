---
name: god-launch
description: |
  Launch the product. Spawns the god-launch-strategist agent in a fresh
  context. Gated on Harden (no unresolved Critical findings).

  Triggers on: "god launch", "/god-launch", "go live", "Product Hunt", "landing page"
---

# /god-launch

Spawn the **god-launch-strategist** agent in a fresh context via the host platform's native agent spawning mechanism.

## Setup

1. Verify `.godpowers/harden/FINDINGS.mdx` exists with NO unresolved or
   accepted Critical findings.
2. If Critical findings exist, REFUSE public activation. Launch asset work may
   remain complete, but a Critical must be resolved and re-verified or public
   activation must be removed from scope.
3. Spawn god-launch-strategist with PRD path and harden FINDINGS.md path.
4. The agent returns structured launch evidence for `.godpowers/state.json` plus landing copy artifacts; the generated `.godpowers/launch/STATE.mdx` view refreshes after state mutation.
5. Immediately before any public release action, run:
   `node <runtimeRoot>/lib/prepublication-gate.js --record --project=.`
   followed by:
   `node <runtimeRoot>/lib/prepublication-gate.js --check --project=.`
   The first command records `.godpowers/launch/PREPUBLICATION.mdx` against the
   exact hardening findings hash and authoritative hardening update. The second
   command must pass in the same release attempt.
6. If hardening changes after the record, the revision or timestamp check
   fails. Re-run hardening as needed, then record and check a fresh gate.

## Verification

After god-launch-strategist returns:
1. Verify launch evidence is recorded in `.godpowers/state.json`
2. Verify landing copy passes substitution test
3. Verify OG cards rendered (not just meta tags)
4. Verify one of:
   - launch target is live and smoke checked
   - local launch-readiness harness passed and external access bundle is the
     only missing item
5. For public activation, verify the pre-publication gate after every other
   release-readiness check and immediately before the external write.
6. Run `npx godpowers state advance --step=launch --status=done --project=.`
   only when live launch or explicit local launch-readiness scope is complete.
   If external access is missing, record the waiting artifact path in launch
   state through the owning command wrapper rather than editing the generated
   progress or launch state views.

## Pause Conditions

Relay any pauses from god-launch-strategist. Brand voice and final headline
approval require human input.

## On Completion

```
Launch complete: .godpowers/launch/STATE.mdx (generated view)

All Godpowers tiers done. Project is live.

Suggested next: /god-audit (score all artifacts retrospectively)
Or: /god-status (see the final state)
```

Under `/god-mode --yolo`, do not stop by listing provider dashboards. Create
the launch runbook, smoke command, source attribution plan, and local
launch-readiness checks. If real launch is blocked by missing external access,
record the single access bundle from deploy or launch state and continue until
the user requests staging or final sign-off begins.

The launch pause must not expand into every possible channel, analytics, or
provider credential. Ask only for the next missing access item needed to run a
named live smoke, launch-readiness, attribution, or monitoring check. Do not
ask mid-run for `STAGING_APP_URL` unless the user requested deployed staging.
At final sign-off, if no live target URL is known, ask only for
`STAGING_APP_URL=<staging-origin>`.

Live target URLs must be evidence-backed. Never invent a domain from the
product name, repo name, package name, README title, brand name, or common TLDs.
If only localhost or `127.0.0.1` exists, launch can only mark local readiness.
If only production is known, do not treat it as staging without explicit user
approval.


## Re-invocation contract

What happens if `/god-launch` is run when launch state evidence already exists:

| Existing state | Behavior |
|---|---|
| State evidence does not exist | Spawn god-launch-strategist; record launch evidence; mark sub-step done |
| State evidence exists and state.json says `done` | Pause: ask user (A) re-run anyway with diff preview, (B) treat as imported (no-op), (C) cancel |
| State evidence fails checks or the owning wrapper reports a generated view checksum warning | Spawn god-launch-strategist in update mode with current evidence plus findings as input. Diff preview before overwrite. |
| State evidence exists, state.json says `pending` | Treat as imported: hash + register, no agent spawn. User can `/god-launch --force` to re-run. |
| `--force` flag passed | Snapshot existing evidence to `.godpowers/.trash/god-launch-<ts>/`. Spawn agent fresh. |
| `--dry-run` flag passed | Show what would happen; touch nothing |

Snapshots in `.trash/` are recoverable via `/god-restore` for 30 days.
The reflog records every god-launch invocation as `op:god-launch` for `/god-undo`.

### Idempotency guarantees

- Running `/god-launch` twice with no user input between them is a no-op
  (second call detects the artifact and pauses).
- Running `/god-launch --dry-run` is always read-only.
- An interrupted `/god-launch` (agent crashes mid-run) leaves state.json
  with `status: failed` and the artifact path either missing or marked
  for `/god-repair` review. Re-running picks up cleanly.


Locking: See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
