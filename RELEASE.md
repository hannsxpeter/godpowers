# Godpowers 2.2.1 Release

> Status: Ready for release
> Date: 2026-05-30

Godpowers 2.2.1 is a patch release for the 2.2 deliverable-progress line. It
keeps the public slash-command surface stable and fixes ledger persistence,
idempotence, and release-state reconciliation.

## What's in this release

- 111 slash commands
- 40 specialist agents
- 13 executable workflows
- 41 intent recipes

## Highlights

- `.godpowers/REQUIREMENTS.md` no longer rewrites on timestamp-only no-op
  regenerations, and the generated ledger no longer carries an extra blank line
  at EOF.
- `lib/reverse-sync.js` now persists deliverable summaries into
  `state.json.deliverables`, matching the documented `/god-sync` behavior.
- The Godpowers self-ledger now reports the shipped deliverable-progress feature
  as done across roadmap, requirements ledger, and state cache.
- Regression tests cover no-op ledger writes, state-cache persistence, and
  no-op reverse-sync stability.

## Validation

- `npm test` green across the full suite
- `npm run lint` clean
- `npm run release:check` green (tests, audit, package contents)

## Upgrade

- `npm install -g godpowers@2.2.1` or `npx godpowers@2.2.1`
- Re-run `/god-context` in each project to refresh installed runtime metadata
- No breaking changes; existing `.godpowers/` state is compatible. Projects gain
  a `REQUIREMENTS.md` ledger the next time `/god-progress` or `/god-sync` runs.

## Notes

- GitHub release creation for `v2.2.1`
- The tag should match the npm package version
- The `v2.2.1` tag should point to the release commit that matches the npm
  `godpowers@2.2.1` package.
