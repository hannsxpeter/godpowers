---
pillar: security
status: present
always_load: false
covers: [security review, dependency audit, command execution, release gates]
triggers: [security, harden, audit, exec, shell, dependency, vulnerability]
must_read_with: [repo, quality]
see_also: [deploy]
---

## Scope

- [DECISION] This pillar captures security boundaries for Godpowers runtime and release work.

## Context

- [DECISION] Installer, bridge, shell-execution, dependency, and publication surfaces receive adversarial review before release.

## Decisions

- [DECISION] `lib/evidence.resolveReviewEvidence` is a read-only local resolver that checks one exact record against expected claim, command, canonical substep, freshness, digest-bound gate event, and event hash chain.
- [DECISION] Stage 2 receives the resolver's sanitized projection without raw ledger records, event attributes, commands, claims, stdout tails, or stderr tails.
- [DECISION] The resolver proves internal consistency only inside a trusted workspace; it does not authenticate against an actor able to rewrite every trusted file and recompute the chain.

## Rules

- [DECISION] Treat shell execution helpers and install target paths as security-sensitive code.
- [DECISION] Prefer argument-array process execution over shell-interpolated command strings.
- [DECISION] Run `npm audit --omit=dev` through `npm run test:audit` before release work completes.
- [DECISION] Treat unresolved Critical harden findings as launch blockers.
- [DECISION] `hooks/pre-tool-use.sh` blocks destructive state deletion, hard reset, force push, npm publish, and GitHub release creation until the user confirms the release gate context.
- [DECISION] Blast-radius fixture subprocesses use fixed argument arrays and fail closed after a 10-second timeout or 1 MiB output cap.
- [DECISION] Blast-radius proof reuses the existing `godpowers verify` command, verification ledger, state rollup, and gate-event chain without adding a command, evidence store, dependency, state writer, or authority.

## Workflows

(none)

## Watchouts

- [HYPOTHESIS] Installer and bridge code are the highest-risk surfaces because they write runtime files into multiple AI tool directories.
- [HYPOTHESIS] Public publish actions are security-sensitive because a bad package or release note becomes externally visible immediately.

## Touchpoints

- [DECISION] Security context synchronizes from hardening evidence through the managed section below.

## Gaps

(none)

<!-- godpowers:pillar-sync:begin -->
### Godpowers artifact sources

- Sync mode: auto-applied by yolo.
- Related artifact: `SECURITY.md`.
- Rule: keep this pillar aligned when these artifacts change durable security truth.
<!-- godpowers:pillar-sync:end -->
