# Godpowers 2.4.1 Release

> Status: Ready for package verification
> Date: 2026-06-08

Godpowers 2.4.1 is an adoption-proof patch for the 2.4 line. It keeps the
2.4.0 command-family UX intact while making the first trust step smaller,
measurable, and easier to inspect before a user commits to a full project arc.

## What's in this release

- 112 slash commands
- 40 specialist agents
- 13 executable workflows
- 42 intent recipes

## Highlights

- Quick Proof now reports outcome metrics: commands to first signal,
  disk-state source, tracked steps, missing planning artifacts, next command,
  host level, and host gaps.
- Adoption Canary reports now include CLI-verifiable outcome metrics for
  quick-proof, status, and next signals.
- README and Getting Started now lead with `--profile=core` and the brief Quick
  Proof path before full autonomy.
- The First 10 Minute Proof case study documents the local before-and-after
  proof while clearly naming what still requires an external repository canary.
- Reference and Roadmap docs now include surface-discipline guidance: try
  families, ladders, profiles, recipes, typed route outcomes, and docs before
  adding new public commands.
- Package guardrails now require `lib/adoption-metrics.js`.

## Validation

- `npm test` green across the full suite
- `npm run test:audit` green
- `npm run pack:check` green
- `npm pack` creates a local `godpowers-2.4.1.tgz` tarball for package
  inspection

## Upgrade

- `npm install -g godpowers@2.4.1` or `npx godpowers@2.4.1`
- Re-run `/god-context` in each project to refresh installed runtime metadata
- No breaking changes; existing `.godpowers/` state is compatible. Users who
  want a compact install can run `npx godpowers --profile=core`.

## Notes

- GitHub release creation for `v2.4.1`
- The tag should match the npm package version
- The `v2.4.1` tag should point to the release commit that matches the npm
  `godpowers@2.4.1` package.
