# Godpowers 2.4.2 Release

> Status: Ready for package verification
> Date: 2026-06-09

Godpowers 2.4.2 is a release-hardening patch for the 2.4 line. It keeps the
2.4 command-family UX intact while making parser failures, frontmatter
metadata, coverage visibility, and package hygiene more accountable before
publish.

## What's in this release

- 112 slash commands
- 40 specialist agents
- 13 executable workflows
- 42 intent recipes

## Highlights

- YAML parsing now exposes strict diagnostics for malformed skipped lines and
  unsafe prototype-pollution keys while preserving default legacy reads.
- Routing, recipe, and workflow YAML loaders now surface warnings with file and
  line context.
- Extension manifests now fail closed on malformed YAML lines and unsafe keys.
- Markdown frontmatter parsing is centralized in `lib/frontmatter.js` and
  enforced by `scripts/static-check.js`.
- Installer metadata, Pillars, skill validation, agent validation,
  checkpoints, context budgets, skill surface metadata, and DESIGN.md parsing
  now share the same frontmatter path.
- `npm run coverage` is available through dev-only `c8` tooling.
- Stale root package tarballs and `.DS_Store` clutter were removed before
  release.

## Validation

- `node scripts/test-yaml-parser.js` green
- `node scripts/test-frontmatter.js` green
- `node scripts/test-extensions.js` green
- `node scripts/test-router.js` green
- `node scripts/test-recipes.js` green
- `node scripts/test-install-smoke.js` green
- `npm run release:check` required before publish
- `npm pack` creates a local `godpowers-2.4.2.tgz` tarball for package
  inspection

## Upgrade

- `npm install -g godpowers@2.4.2` or `npx godpowers@2.4.2`
- Re-run `/god-context` in each project to refresh installed runtime metadata
- No breaking changes for valid `.godpowers/` state. Invalid extension
  manifests that were previously partially accepted now fail with parse errors.

## Notes

- GitHub release creation for `v2.4.2`
- The tag should match the npm package version
- The `v2.4.2` tag should point to the release commit that matches the npm
  `godpowers@2.4.2` package.
