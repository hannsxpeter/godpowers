# Godpowers 5.11.0 Release

> Status: Publishing via tag-triggered provenance workflow
> Date: 2026-07-23

- [DECISION] Godpowers 5.11.0 adds the divergence pass, a gated widening step that produces candidate alternatives before a Tier 1 planning decision converges; the public surface is unchanged from 5.10.x.
- [DECISION] The public surface contains 122 slash commands, 40 specialist agents, 13 workflows, and 44 recipes.
- [DECISION] The core package contains 100 runtime library modules and keeps zero production dependencies.
- [DECISION] The `@godpowers/mcp` companion remains read-only and shares version 5.11.0.

## Changes

- [DECISION] `references/planning/DIVERGENCE.md` adds a gated, isolated candidate-generation pass that fires only on hard-to-reverse Tier 1 decisions, never under `--yolo`, never on closed phrasing, and never on cheap-to-reverse work; it spawns four isolated branches under lenses inverted from the repository's own antipattern catalogs, seeds the obvious answer as a labeled baseline that can still win, leaves the calling specialist's scoring rubric unchanged, and demotes trap-flagged candidates with a reason instead of deleting them.
- [DECISION] `templates/ARCH.mdx` gains a required `## Options Considered` section as architecture section 1, and `templates/STACK-DECISION.mdx` gains a per-category existence question and a rejection-with-reason line, so the widened pool has a landing site in the artifact.
- [DECISION] `specialists/god-architect.md`, `god-stack-selector.md`, `god-explorer.md`, and `god-debugger.md` consume the reference through their existing inputs, and `references/planning/ARCH-ANATOMY.md`, `references/planning/STACK-ANATOMY.md`, and both example fixtures carry the same contract so the anatomy references, the templates, the specialists, and the examples agree.
- [DECISION] The dependency tree goes from six advisories (two high, three moderate, one low) to zero: a plain `npm audit fix` cleared four, and an `overrides` pin of `@hono/node-server` to `^2.0.11` cleared the last without downgrading `@modelcontextprotocol/sdk`.

## Validation

- [DECISION] No runtime library module, skill, agent, workflow, or recipe was added or removed, so surface counts and coverage floors are unchanged from 5.10.x.
- [DECISION] The static check, self-project truth, public-surface counts, golden-artifact tests, and `npm audit --omit=dev` are green on the tagged commit.
- [DECISION] The complete release gate and the official Agent Skills validator run in the GitHub publication workflow before the artifact is published.

## Upgrade

- [DECISION] Install with `npm install -g godpowers@5.11.0` or `npx godpowers@5.11.0`.
- [DECISION] Existing 5.x projects need no `.godpowers` artifact migration.
- [DECISION] Re-run the installer for each host runtime so the updated references and templates replace installed copies.

## Publication Evidence

- [DECISION] Pushing tag `v5.11.0` triggers the identity-bound provenance publication workflow, which runs the release gate, publishes `godpowers@5.11.0` and `@godpowers/mcp@5.11.0` with npm provenance, and attaches the GitHub Release assets.
- [DECISION] Post-publication registry integrity, tarball digests, and isolated exact-version install verification are recorded in a follow-up publication-evidence commit, consistent with the 5.10.x release flow.
