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
- [DECISION] Source version `5.4.0` is published through the identity-bound tag workflow from merged main commit `13c0ce2905b870846c8170673eaed5415e09b235`.
- [DECISION] npm `godpowers@5.4.0` and `@godpowers/mcp@5.4.0` are tagged `latest`, and their registry integrity values match the tarballs attached to the GitHub Release.
- [DECISION] Isolated published-install verification passes for Quick Proof, read-only project inspection, dashboard, next route, Claude, Codex, and the MCP executable.
- [DECISION] The prior `v5.3.1` tag remains the tested rollback reference.

## Watchouts

- [HYPOTHESIS] A release is incomplete until git tag, GitHub release, npm version, package tarball, README badges, CHANGELOG, RELEASE, and local install verification agree.
- [HYPOTHESIS] Registry and published-install proof do not substitute for adoption evidence from an unaffiliated production user.

<!-- godpowers:pillar-sync:begin -->
## Godpowers artifact sources

- Sync mode: auto-applied by yolo.
- Related artifact: `.godpowers/state.json`.
- Rule: keep this pillar aligned when these artifacts change durable deploy truth.
<!-- godpowers:pillar-sync:end -->
