---
name: god-harden
description: |
  Adversarial security review. Spawns the god-harden-auditor agent in a fresh
  context. Critical findings BLOCK launch.

  Triggers on: "god harden", "/god-harden", "security review", "OWASP", "pen test"
---

# /god-harden

Spawn the **god-harden-auditor** agent in a fresh context via the host platform's native agent spawning mechanism.

## Setup

1. Verify build is complete (`.godpowers/build/STATE.md` exists).
2. Spawn god-harden-auditor with full code access.
3. The agent writes `.godpowers/harden/FINDINGS.md`.

## Verification

After god-harden-auditor returns:
1. Verify FINDINGS.md exists on disk
2. Run `npx godpowers gate --tier=harden --project=.` and do not proceed on a non-zero exit
3. Read findings classification:
   - If any Critical: run `npx godpowers state advance --step=harden --status=failed --project=.` and block launch
   - If only High/Medium/Low: run `npx godpowers state advance --step=harden --status=done --project=.`

## Have-Nots

Hardening FAILS if:
- Only automated scanner output, no manual review
- Auth boundaries not tested (just code-read)
- No input validation audit
- Rate limiting not verified
- OWASP categories skipped without justification
- Findings have no severity classification

## Critical-Finding Gate

If ANY finding is Critical:
1. Pause god-mode immediately
2. Present finding to user using pause format
3. Launch remains BLOCKED until:
   - Critical finding is fixed and re-verified, OR
   - User explicitly accepts the risk in writing

## On Completion

If FINDINGS.md has 0 Critical findings:
```
Harden complete: .godpowers/harden/FINDINGS.md
[N] High, [N] Medium, [N] Low. 0 Critical. Launch gate: PASSED.

Suggested next: /god-launch (put it in front of users)
```

If FINDINGS.md has Critical findings:
```
Harden complete: .godpowers/harden/FINDINGS.md
[N] CRITICAL findings. Launch gate: BLOCKED.

Suggested next: Resolve Critical findings, then re-run /god-harden.
Use /god-debug if you need help with the fix.
```


## Re-invocation contract

What happens if `/god-harden` is run when `.godpowers/harden/FINDINGS.md` already exists:

| Existing state | Behavior |
|---|---|
| File does not exist | Spawn god-harden-auditor; produce file; mark sub-step done |
| File exists, passes lint, state.json says `done` | Pause: ask user (A) re-run anyway with diff preview, (B) treat as imported (no-op), (C) cancel |
| File exists, fails lint or have-nots | Spawn god-harden-auditor in update mode with current file + findings as input. Diff preview before overwrite. |
| File exists, state.json says `pending` | Treat as imported: hash + register, no agent spawn. User can `/god-harden --force` to re-run. |
| `--force` flag passed | Snapshot existing file to `.godpowers/.trash/god-harden-<ts>/`. Spawn agent fresh. |
| `--dry-run` flag passed | Show what would happen; touch nothing |

Snapshots in `.trash/` are recoverable via `/god-restore` for 30 days.
The reflog records every god-harden invocation as `op:god-harden` for `/god-undo`.

### Idempotency guarantees

- Running `/god-harden` twice with no user input between them is a no-op
  (second call detects the artifact and pauses).
- Running `/god-harden --dry-run` is always read-only.
- An interrupted `/god-harden` (agent crashes mid-run) leaves state.json
  with `status: failed` and the artifact path either missing or marked
  for `/god-repair` review. Re-running picks up cleanly.


## Locking

See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
