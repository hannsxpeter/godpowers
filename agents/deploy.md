---
pillar: deploy
status: active
always_load: false
covers: [ci, release, npm publish, package verification]
triggers: [deploy, publish, release, npm, ci, provenance]
must_read_with: [repo, quality]
see_also: [security, observe]
---

## Scope

- [DECISION] This pillar captures deployment and release context for Godpowers.

## Release Surface

- [DECISION] Godpowers deploys as an npm package published from tag-triggered GitHub Actions when provenance is available.
- [DECISION] `.github/workflows/ci.yml` runs the full matrix test suite and the Node 20 release gate on pushes and pull requests to `main`.
- [DECISION] `.github/workflows/publish.yml` runs `npm run release:check` before publishing tagged releases to npm with provenance.
- [DECISION] `.github/workflows/publish-pack.yml` runs `npm run release:check` before publishing first-party extension packs.
- [DECISION] `package.json` exposes `bin.godpowers` at `./bin/install.js`.
- [DECISION] Manual tarball publish is a fallback only when the tag-triggered workflow cannot run, and provenance is unavailable for that publish.
- [DECISION] Source version `5.3.1` is approved for publication through the identity-bound tag workflow.
- [DECISION] npm `godpowers@5.3.0` and `@godpowers/mcp@5.3.0` remain tagged `latest` until the v5.3.1 workflow completes.
- [DECISION] Published-install verification is required for the root CLI, Claude, Codex, and the MCP executable after publication.
- [DECISION] The prior `v5.3.0` tag remains the tested rollback reference.

## Watchouts

- [HYPOTHESIS] A release is incomplete until git tag, GitHub release, npm version, package tarball, README badges, CHANGELOG, RELEASE, and local install verification agree.
- [HYPOTHESIS] Production install evidence for `5.3.1` becomes available only after external publication completes.

<!-- godpowers:pillar-sync:begin -->
## Godpowers artifact sources

- Sync mode: auto-applied by yolo.
- Related artifact: `.godpowers/state.json`.
- Rule: keep this pillar aligned when these artifacts change durable deploy truth.
<!-- godpowers:pillar-sync:end -->
