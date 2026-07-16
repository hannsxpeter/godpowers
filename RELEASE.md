# Godpowers 5.10.0 Release

> Status: Publishing via tag-triggered provenance workflow
> Date: 2026-07-16

- [DECISION] Godpowers 5.10.0 adds two building references (API design and field delivery); the public surface is unchanged from 5.9.x.
- [DECISION] The public surface contains 122 slash commands, 40 specialist agents, 13 workflows, and 44 recipes.
- [DECISION] The core package contains 100 runtime library modules and keeps zero production dependencies.
- [DECISION] The `@godpowers/mcp` companion remains read-only and shares version 5.10.0.

## Changes

- [DECISION] `references/building/API-DESIGN.md` adds contract-first API design guidance for systems that expose an API or service surface: one declared API style (REST, GraphQL, or RPC), a consumer-safe versioning strategy, a checked-in machine-readable contract (OpenAPI or GraphQL schema) kept in sync with the routes, one consistent error envelope (RFC 7807 or a documented equivalent), stable pagination, idempotency on retryable unsafe operations, and real-time (WebSocket or SSE) connection authentication with per-connection resource bounds. It mirrors the godaudits A-ARCH-23 and A-SEC-33 checks and the godplans R-ARCH-20 plan requirement.
- [DECISION] `references/building/FIELD-DELIVERY.md` adds a forward-deployed engineering mapping: it maps the FDE field skills to the agents and artifacts that already own them and names the one distinct mode, customer-site delivery, so a field engagement runs through the ordinary tiers with the customer environment wired in as a constraint rather than a parallel workflow.

## Validation

- [DECISION] The change adds two reference files and one index line; the static check, self-project truth, and public-surface counts remain green.
- [DECISION] No runtime library module, skill, agent, workflow, or recipe was added or removed, so surface counts and coverage floors are unchanged from 5.9.x.
- [DECISION] The complete release gate and the official Agent Skills validator run in the GitHub publication workflow before the artifact is published.

## Upgrade

- [DECISION] Install with `npm install -g godpowers@5.10.0` or `npx godpowers@5.10.0`.
- [DECISION] Existing 5.x projects need no `.godpowers` artifact migration.
- [DECISION] Re-run the installer for each host runtime so the updated references replace installed copies.

## Publication Evidence

- [DECISION] Pushing tag `v5.10.0` triggers the identity-bound provenance publication workflow, which runs the release gate, publishes `godpowers@5.10.0` and `@godpowers/mcp@5.10.0` with npm provenance, and attaches the GitHub Release assets.
- [DECISION] Post-publication registry integrity, tarball digests, and isolated exact-version install verification are recorded in a follow-up publication-evidence commit, consistent with the 5.9.x release flow.
