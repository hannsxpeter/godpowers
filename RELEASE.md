# Godpowers 5.6.0 Release

> Status: Publishing via tag-triggered provenance workflow
> Date: 2026-07-16

- [DECISION] Godpowers 5.6.0 adds compliance technical-readiness guidance and an opt-in godaudits-to-god-browser-tester dynamic verification handoff; the public surface is unchanged from 5.5.x.
- [DECISION] The public surface contains 122 slash commands, 40 specialist agents, 13 workflows, and 44 recipes.
- [DECISION] The core package contains 100 runtime library modules and keeps zero production dependencies.
- [DECISION] The `@godpowers/mcp` companion remains read-only and shares version 5.6.0.

## Changes

- [DECISION] A new HARDEN antipattern, The Compliance Certification Claim, separates the usage-policy gate (is this product allowed) from framework conformance (does the code evidence a regulation's controls), and requires compliance to be reported as technical-readiness rather than certification.
- [DECISION] Compliance frameworks are chosen by where users live and what data is handled, not only where the business sits: privacy and sovereignty (GDPR, CCPA/CPRA, PIPEDA), accessibility (WCAG 2.2 AA, AODA, ADA/Section 508), security frameworks (SOC 2, ISO/IEC 27001), and industry standards (PCI DSS, HIPAA); this mirrors godaudits, which models the same frameworks as standards mapped to its checks.
- [DECISION] god-browser-tester documents an opt-in dynamic verification handoff: it confirms or refutes godaudits behavioral findings (races and TOCTOU, dead controls, early or out-of-order resource release, non-primary caller-path authorization, and runtime consent or accessibility) against the runtime URL, never in production and never without explicit authorization.

## Validation

- [DECISION] The change is confined to `references/shipping/HARDEN-ANTIPATTERNS.md` and `specialists/god-browser-tester.md`; the static check, self-project truth, and public-surface counts remain green.
- [DECISION] No runtime library module, skill, agent, workflow, or recipe was added or removed, so surface counts and coverage floors are unchanged from 5.5.x.
- [DECISION] The complete release gate and the official Agent Skills validator run in the GitHub publication workflow before the artifact is published.

## Upgrade

- [DECISION] Install with `npm install -g godpowers@5.6.0` or `npx godpowers@5.6.0`.
- [DECISION] Existing 5.x projects need no `.godpowers` artifact migration.
- [DECISION] Re-run the installer for each host runtime so the updated references replace installed copies.

## Publication Evidence

- [DECISION] Pushing tag `v5.6.0` triggers the identity-bound provenance publication workflow, which runs the release gate, publishes `godpowers@5.6.0` and `@godpowers/mcp@5.6.0` with npm provenance, and attaches the GitHub Release assets.
- [DECISION] Post-publication registry integrity, tarball digests, and isolated exact-version install verification are recorded in a follow-up publication-evidence commit, consistent with the 5.5.x release flow.
