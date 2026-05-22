# Godpowers 2.0.1 Release

Date: 2026-05-22

Godpowers 2.0.1 is the request-trace review release. It keeps the 2.0
executable proof surface stable while tightening existing build and review
workflows so implementation diffs stay narrow, verifiable, and tied to the
user request.

## What is stable

- 110 slash commands
- 40 specialist agents
- 13 executable workflows
- 40 intent recipes
- 15-runtime installer
- Codex installs with generated `god-*.toml` agent metadata files
- Markdown specialist agent contracts at `<runtime>/agents/god-*.md`
- Shared runtime bundle at `<runtime>/godpowers-runtime`
- Native Pillars project context through `AGENTS.md` and `agents/*.md`
- `.godpowers/` workflow state and artifact layout
- Dashboard action briefs for next-step compression
- Dashboard host guarantees for full, degraded, and unknown runtime capability
- `godpowers status --project .` and `godpowers next --project .`
- `godpowers quick-proof --project .`
- Planning-system migration for GSD, BMAD, and Superpowers
- Repository documentation sync checks
- Repository surface sync checks
- Route quality, recipe coverage, and release surface sync checks
- Messy-repo dogfood scenarios
- Extension authoring scaffold helper
- Mode D suite release dry-run planner
- Release gate enforcement through `npm run release:check`
- Request-trace discipline in `god-executor`
- Scope and request-trace checks in `god-spec-reviewer`
- Simplicity and surgicality checks in `god-quality-reviewer`

## What is new

- Added request-trace discipline to `god-executor`: assumptions, public
  behavior, expected files, and verification command must be explicit before
  implementation.
- Added scope and request-trace checks to `god-spec-reviewer`.
- Added simplicity and surgicality checks to `god-quality-reviewer`.
- Added `request-trace-review` to runtime feature awareness.
- Updated README, reference docs, roadmap, architecture, quality pillar,
  changelog, package metadata, and lockfile for `2.0.1`.

## Guardrails

- Quick proof is read-only and deterministic.
- Quick proof reports the user's current host guarantees separately from the
  shipped fixture state.
- Package contents checks require the quick-proof module and fixture state.
- Build and review commands keep the public command surface unchanged.
- Reviewers reject speculative abstraction, unrelated cleanup, and diff churn
  that cannot be traced to the request, slice plan, failing test, or
  implementation-caused cleanup.
- Published install verification checks quick proof, status, next, Claude
  install, and Codex metadata install against the registry artifact.
- The adoption canary harness captures CLI-verifiable signals only. Host slash
  commands such as `/god-preflight`, `/god-audit`, and `/god-reconstruct` still
  require an AI coding host.

## Validation

Release validation includes:

- `npm run test:quick-proof`
- `node scripts/run-adoption-canary.js <repo> --output=<report>`
- `npm run release:check`
- `npm pack --json`
- local uninstall of previous runtime installs
- local reinstall from the generated tarball
- npm publish with provenance when available
- `node scripts/verify-published-install.js godpowers@latest`
- GitHub release creation for `v2.0.1`

The `v2.0.1` tag should point to the release commit that matches the npm
`godpowers@2.0.1` package.
