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

(none)

## Rules

- [DECISION] Treat shell execution helpers and install target paths as security-sensitive code.
- [DECISION] Prefer argument-array process execution over shell-interpolated command strings.
- [DECISION] Run `npm audit --omit=dev` through `npm run test:audit` before release work completes.
- [DECISION] Treat unresolved Critical harden findings as launch blockers.
- [DECISION] `hooks/pre-tool-use.sh` blocks destructive state deletion, hard reset, force push, npm publish, and GitHub release creation until the user confirms the release gate context.

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
