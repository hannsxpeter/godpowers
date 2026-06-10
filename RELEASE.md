# Godpowers 2.5.1 Release

> Status: Published
> Date: 2026-06-10

Godpowers 2.5.1 ships the Phase 2 host proof campaign as a docs patch release.
It keeps the 2.5.0 executable tier gates intact while adding Codex host-run
evidence for a CLI package, a browser app, and a TODO-backed React component
project.

## What's in this release

- 112 slash commands
- 40 specialist agents
- 13 executable workflows
- 42 intent recipes
- 8 installer CLI helpers

## Highlights

- Run A completed a Codex host proof on slugify-cli with 13 of 13 workflow steps
  complete, 16 of 16 requirements done, passing tests, passing production
  audit, passing pack dry run, and no tracked source diff.
- Run B completed a Codex host proof on Countdown with local browser evidence,
  6 of 7 requirements done, dependency audit repair, and deployed-origin proof
  deferred pending a staging URL.
- Run C completed a documented failed Codex host proof on
  react-github-readme-button, with local tests, lint, build, browser smoke, and
  production audit passing before the run blocked on Critical dev-tooling audit
  findings.
- The host proof campaign captured command usage, gate failures, repairs,
  blocker files, cost availability, and proof limits in `docs/case-studies/`.

## Validation

- `npm run test:e2e` passed.
- `node scripts/test-runtime-verification.js` passed.
- `node scripts/test-agent-browser.js` passed.
- `npm run release:check` passed before publish.

## Upgrade

- `npm install -g godpowers@2.5.1` or `npx godpowers@2.5.1`
- Re-run `/god-context` in each project to refresh installed runtime metadata.
- Existing `.godpowers/` state remains compatible.

## Notes

- GitHub release created for `v2.5.1`.
- The tag matches the npm package version.
- The `v2.5.1` tag points to the release commit that matches the npm
  `godpowers@2.5.1` package.
