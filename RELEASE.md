# Godpowers 5.8.0 Release

> Status: Publishing via tag-triggered provenance workflow
> Date: 2026-07-16

- [DECISION] Godpowers 5.8.0 makes release maintenance derive-not-duplicate: the version lives only in package.json and every other surface is generated from it; the public surface is unchanged from 5.7.x.
- [DECISION] The public surface contains 122 slash commands, 40 specialist agents, 13 workflows, and 44 recipes.
- [DECISION] The core package contains 100 runtime library modules and keeps zero production dependencies.
- [DECISION] The `@godpowers/mcp` companion remains read-only and shares version 5.8.0.

## Changes

- [DECISION] `npm run version:sync` writes the single source of version truth, package.json, into every version surface: the docs, the MCP package and lockfile, the SECURITY supported series, the RELEASE header, and the two self-referential hashes (the roadmap package.json hash and the state roadmap artifact hash). `version:check` verifies without writing and prints the fix command, and is available as a fast guard.
- [DECISION] `npm run release:prepare -- <patch|minor|major|X.Y.Z>` bumps the version, runs version:sync (including the SECURITY roll and both hashes), and stubs a CHANGELOG entry, replacing the hand-edit of roughly fifteen files in lockstep with a single command. This release was cut with release:prepare.

## Validation

- [DECISION] The change adds two maintainer scripts under `scripts/` (not shipped in the package) and edits package.json scripts and the CHANGELOG, RELEASE, SECURITY, and version-surface files that a release already touches; the static check, self-project truth, and public-surface counts remain green.
- [DECISION] No runtime library module, skill, agent, workflow, or recipe was added or removed, so surface counts and coverage floors are unchanged from 5.7.x.
- [DECISION] The complete release gate and the official Agent Skills validator run in the GitHub publication workflow before the artifact is published.

## Upgrade

- [DECISION] Install with `npm install -g godpowers@5.8.0` or `npx godpowers@5.8.0`.
- [DECISION] Existing 5.x projects need no `.godpowers` artifact migration.
- [DECISION] Re-run the installer for each host runtime so the updated references replace installed copies.

## Publication Evidence

- [DECISION] Pushing tag `v5.8.0` triggers the identity-bound provenance publication workflow, which runs the release gate, publishes `godpowers@5.8.0` and `@godpowers/mcp@5.8.0` with npm provenance, and attaches the GitHub Release assets.
- [DECISION] Post-publication registry integrity, tarball digests, and isolated exact-version install verification are recorded in a follow-up publication-evidence commit, consistent with the 5.7.x release flow.
