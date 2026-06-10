# Godpowers 2.5.0 Release

> Status: Published
> Date: 2026-06-10

Godpowers 2.5.0 ships executable tier gates for the code-first kernel
migration. It keeps the slash-command workflow intact while giving command
capable hosts a stable JSON gate contract and non-zero exit codes for blocked
tier transitions.

## What's in this release

- 112 slash commands
- 40 specialist agents
- 13 executable workflows
- 42 intent recipes
- 8 installer CLI helpers

## Highlights

- `npx godpowers gate --tier=<tier> --project=.` checks PRD, design,
  architecture, roadmap, stack, repo, build, and harden artifacts.
- Gate JSON returns `{tier, verdict, artifacts, checks, findings, summary}` for
  host-visible evidence.
- Build gates require `.godpowers/build/STATE.md` to record exact verification
  commands that passed.
- Harden gates fail unresolved Critical findings and blocked launch gates.
- `/god-mode` now runs executable gates between tier transitions.
- Tier routes declare `standards.gate-command`, and static checks enforce the
  skill and route metadata.
- CLI command dispatch now lives in `lib/cli-dispatch.js`, keeping
  `bin/install.js` thin.

## Validation

- `node scripts/test-gate.js` green
- `node scripts/test-cli-dispatch.js` green
- `node scripts/static-check.js` green
- `npm run release:check` passed before publish
- GitHub Publish to npm workflow `27282180092` passed
- `npm run verify:published-install` passed against `godpowers@latest`

## Upgrade

- `npm install -g godpowers@2.5.0` or `npx godpowers@2.5.0`
- Re-run `/god-context` in each project to refresh installed runtime metadata.
- Existing `.godpowers/` state remains compatible.

## Notes

- GitHub release created for `v2.5.0`.
- The tag matches the npm package version.
- The `v2.5.0` tag points to the release commit that matches the npm
  `godpowers@2.5.0` package.
