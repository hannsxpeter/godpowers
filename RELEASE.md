# Godpowers 5.9.0 Release

> Status: Publishing via tag-triggered provenance workflow
> Date: 2026-07-16

- [DECISION] Godpowers 5.9.0 adds a `starter` install profile to lower the onboarding surface; the public surface is unchanged from 5.8.x.
- [DECISION] The public surface contains 122 slash commands, 40 specialist agents, 13 workflows, and 44 recipes.
- [DECISION] The core package contains 100 runtime library modules and keeps zero production dependencies.
- [DECISION] The `@godpowers/mcp` companion remains read-only and shares version 5.9.0.

## Changes

- [DECISION] A `starter` install profile installs the eight-command 80% path for a first project (front door, first-run, help, status, and init to plan to build to ship), sitting below `core` so a newcomer is not handed 122 commands at once. Install with `npx godpowers --claude --profile=starter`.

## Validation

- [DECISION] The change adds the `starter` profile to `lib/install-profiles.js` and its documented skill count to the surface-contraction record; the static check, self-project truth, and public-surface counts remain green.
- [DECISION] No runtime library module, skill, agent, workflow, or recipe was added or removed, so surface counts and coverage floors are unchanged from 5.8.x.
- [DECISION] The complete release gate and the official Agent Skills validator run in the GitHub publication workflow before the artifact is published.

## Upgrade

- [DECISION] Install with `npm install -g godpowers@5.9.0` or `npx godpowers@5.9.0`.
- [DECISION] Existing 5.x projects need no `.godpowers` artifact migration.
- [DECISION] Re-run the installer for each host runtime so the updated references replace installed copies.

## Publication Evidence

- [DECISION] Pushing tag `v5.9.0` triggers the identity-bound provenance publication workflow, which runs the release gate, publishes `godpowers@5.9.0` and `@godpowers/mcp@5.9.0` with npm provenance, and attaches the GitHub Release assets.
- [DECISION] Post-publication registry integrity, tarball digests, and isolated exact-version install verification are recorded in a follow-up publication-evidence commit, consistent with the 5.8.x release flow.
