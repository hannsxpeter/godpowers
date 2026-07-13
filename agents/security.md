---
pillar: security
status: active
always_load: false
covers: [security review, dependency audit, command execution, release gates]
triggers: [security, harden, audit, exec, shell, dependency, vulnerability]
must_read_with: [repo, quality]
see_also: [deploy]
---

## Scope

- [DECISION] This pillar captures security boundaries for Godpowers runtime and release work.

## Rules

- [DECISION] Treat shell execution helpers and install target paths as security-sensitive code.
- [DECISION] Prefer argument-array process execution over shell-interpolated command strings.
- [DECISION] Run `npm audit --omit=dev` through `npm run test:audit` before release work completes.
- [DECISION] Treat unresolved Critical harden findings as launch blockers.
- [DECISION] `hooks/pre-tool-use.sh` blocks destructive state deletion, hard reset, force push, npm publish, and GitHub release creation until the user confirms the release gate context.

## Watchouts

- [HYPOTHESIS] Installer and bridge code are the highest-risk surfaces because they write runtime files into multiple AI tool directories.
- [HYPOTHESIS] Public publish actions are security-sensitive because a bad package or release note becomes externally visible immediately.

<!-- godpowers:pillar-sync:begin -->
## Godpowers artifact sources

- Sync mode: auto-applied by yolo.
- Related artifact: `.godpowers/harden/FINDINGS.mdx`.
- Rule: keep this pillar aligned when these artifacts change durable security truth.

## Extracted durable signals

From `.godpowers/harden/FINDINGS.mdx`:
- [DECISION] Date: 2026-07-13.
- [DECISION] Reviewer: autonomous product trust hardening run.
- [DECISION] Scope: installer, host capability detection, Quick Proof, state reconciliation, release checks, package contents, and production dependencies.
- [DECISION] Launch gate: PASSED.
- [DECISION] No unresolved security finding remains in the reviewed scope.
- [HYPOTHESIS] External connector writes and publish credentials remain last-mile provider risks controlled by authenticated tooling and explicit user authority.
<!-- godpowers:pillar-sync:end -->
