---
pillar: auth
status: stub
always_load: false
covers: [identity, sessions, access control, authorization]
triggers: [auth, login, session, permission, role, invite, access]
must_read_with: []
see_also: []
---

## Scope

(stub) Capture project-specific guidance for auth.

## Context

(stub) Fill with facts an agent cannot reliably infer from code alone.

## Decisions

(none)

## Rules

(none)

## Workflows

(none)

## Watchouts

(none)

## Touchpoints

(none)

## Gaps

- This pillar is a stub. Ask before making durable auth decisions.

<!-- godpowers:pillar-sync:begin -->
## Godpowers artifact sources

- Sync mode: auto-applied by yolo.
- Related artifact: `.godpowers/harden/FINDINGS.mdx`.
- Rule: keep this pillar aligned when these artifacts change durable auth truth.

## Extracted durable signals

From `.godpowers/harden/FINDINGS.mdx`:
- [DECISION] Date: 2026-07-13.
- [DECISION] Reviewer: autonomous product trust hardening run.
- [DECISION] Scope: installer, host capability detection, Quick Proof, state reconciliation, release checks, package contents, and production dependencies.
- [DECISION] Launch gate: PASSED.
- [DECISION] No unresolved security finding remains in the reviewed scope.
- [HYPOTHESIS] External connector writes and publish credentials remain last-mile provider risks controlled by authenticated tooling and explicit user authority.
<!-- godpowers:pillar-sync:end -->
