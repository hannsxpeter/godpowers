# Godpowers 5.7.0 Release

> Status: Publishing via tag-triggered provenance workflow
> Date: 2026-07-16

- [DECISION] Godpowers 5.7.0 adds a documentation profile that derives the required documentation set from product form, scale, risk profile, and regulatory overlays, and the high-value governance drafters; the public surface is unchanged from 5.6.x.
- [DECISION] The public surface contains 122 slash commands, 40 specialist agents, 13 workflows, and 44 recipes.
- [DECISION] The core package contains 100 runtime library modules and keeps zero production dependencies.
- [DECISION] The `@godpowers/mcp` companion remains read-only and shares version 5.7.0.

## Changes

- [DECISION] A new reference, `references/building/DOCUMENTATION-PROFILE.md`, derives the required documentation set from product form, scale, risk profile, and regulatory overlays: a doc-set matrix that tags each document required, recommended, optional, or not-applicable with the signal that set it, so a prototype is not forced into a continuity plan and a regulated platform does not ship without a threat model and traceability record.
- [DECISION] The orchestrator consults the documentation profile and runs a document drafter only when the manifest marks its output required or the user requests it, recording not-applicable documents with a reason.
- [DECISION] Existing agents draft the high-value governance documents when the profile requires them: god-pm drafts the initiation brief (project charter, business case, and stakeholders with a RACI), god-docs-writer drafts the requirements-traceability matrix, and god-retrospective drafts the closeout with lessons learned. No new agents or skills, so the public surface is unchanged.

## Validation

- [DECISION] The change adds one reference and edits four existing specialist agents plus the building index; the static check, self-project truth, and public-surface counts remain green.
- [DECISION] No runtime library module, skill, agent, workflow, or recipe was added or removed, so surface counts and coverage floors are unchanged from 5.6.x.
- [DECISION] The complete release gate and the official Agent Skills validator run in the GitHub publication workflow before the artifact is published.

## Upgrade

- [DECISION] Install with `npm install -g godpowers@5.7.0` or `npx godpowers@5.7.0`.
- [DECISION] Existing 5.x projects need no `.godpowers` artifact migration.
- [DECISION] Re-run the installer for each host runtime so the updated references replace installed copies.

## Publication Evidence

- [DECISION] Pushing tag `v5.7.0` triggers the identity-bound provenance publication workflow, which runs the release gate, publishes `godpowers@5.7.0` and `@godpowers/mcp@5.7.0` with npm provenance, and attaches the GitHub Release assets.
- [DECISION] Post-publication registry integrity, tarball digests, and isolated exact-version install verification are recorded in a follow-up publication-evidence commit, consistent with the 5.6.x release flow.
