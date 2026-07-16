# Godpowers 5.5.1 Release

> Status: Publishing via tag-triggered provenance workflow
> Date: 2026-07-16

- [DECISION] Godpowers 5.5.1 is a documentation patch that strengthens the HARDEN antipatterns with behavioral, correctly-wired-control guidance; the public surface is unchanged from 5.5.0.
- [DECISION] The public surface contains 122 slash commands, 40 specialist agents, 13 workflows, and 44 recipes.
- [DECISION] The core package contains 100 runtime library modules and keeps zero production dependencies.
- [DECISION] The `@godpowers/mcp` companion remains read-only and shares version 5.5.1.

## Changes

- [DECISION] HARDEN antipattern "Auth Boundary Confusion" now requires authorization parity across every caller path to a privileged operation (interactive session, API key or bearer token, publicly exported function, action whose authorization runs in a non-writable query context, and agent or tool call), with suspension and step-up enforced at the data or function tier, not only at a page or edge gate.
- [DECISION] HARDEN antipattern "Trusted Input" now requires caller-supplied selectors (id, email, slug, hostname, model output) to be ownership-bound to the authenticated principal before use, with proof of control for email and hostname, and names public checkout, unauthenticated verification, and agent or tool arguments as the highest-risk cases.
- [DECISION] A new antipattern "The Unreconciled Money Flow" requires every money flow (charge, invoice, settlement, refund, payout or transfer) to reconcile end to end, with provider status confirmed before a record is final and released transfers reversed on refund.
- [DECISION] A new antipattern "The Dead Control or Unlawful Transition" requires every gating flag to be read on the enforcement path and every lifecycle transition to reject releasing a still-committed resource early or out of order.

## Validation

- [DECISION] The change is confined to `references/shipping/HARDEN-ANTIPATTERNS.md`; the static check, self-project truth, and public-surface counts remain green.
- [DECISION] No runtime library module, skill, agent, workflow, or recipe was added or removed, so surface counts and coverage floors are unchanged from 5.5.0.
- [DECISION] The complete release gate and the official Agent Skills validator run in the GitHub publication workflow before the artifact is published.

## Upgrade

- [DECISION] Install with `npm install -g godpowers@5.5.1` or `npx godpowers@5.5.1`.
- [DECISION] Existing 5.x projects need no `.godpowers` artifact migration.
- [DECISION] Re-run the installer for each host runtime so the updated references replace installed copies.
- [DECISION] Repository contributors should treat `agents/` as Pillars context and `specialists/` as portable specialist source contracts.

## Publication Evidence

- [DECISION] Pushing tag `v5.5.1` triggers the identity-bound provenance publication workflow, which runs the release gate, publishes `godpowers@5.5.1` and `@godpowers/mcp@5.5.1` with npm provenance, and attaches the GitHub Release assets.
- [DECISION] Post-publication registry integrity, tarball digests, and isolated exact-version install verification are recorded in a follow-up publication-evidence commit, consistent with the 5.5.0 release flow.
