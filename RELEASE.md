# Godpowers 2.4.3 Release

> Status: Ready for package verification
> Date: 2026-06-09

Godpowers 2.4.3 is a review-followup release for the 2.4 line. It keeps the
2.4 command-family UX intact while adding external CLI proof, prompt-size
guardrails, legacy surface quarantine, lib coverage gating, and clean package
verification before publish.

## What's in this release

- 112 slash commands
- 40 specialist agents
- 13 executable workflows
- 42 intent recipes

## Highlights

- Three external CLI adoption canary case studies now cover sindresorhus/is,
  expressjs/cors, and tinyhttp/tinyhttp, including commit hashes, elapsed time,
  zero-dollar local CLI cost, pause counts, and explicit host-run gaps.
- `agents/god-orchestrator.md`, `skills/god-next.md`, and
  `skills/god-status.md` are now concise dispatch contracts that delegate
  detailed runbook content to `references/`.
- Repeated skill locking boilerplate now points to
  `references/shared/LOCKING.md`.
- `/god-roadmap-check` is deprecated, kept for full-profile compatibility, and
  excluded from non-full installer profiles by regression test.
- `npm run coverage:lib` enforces a 90 percent line coverage floor for
  `lib/**/*.js`.
- `npm run release:check` runs the full suite under the lib coverage floor
  before audit and package verification.
- Package verification now creates the npm tarball in a temporary directory and
  removes it automatically.

## Validation

- `node scripts/static-check.js` green
- `node scripts/test-cli-dispatch.js` green
- `node scripts/test-installer-profiles.js` green
- `node scripts/run-adoption-canary.js https://github.com/sindresorhus/is.git --output=docs/case-studies/sindresorhus-is-adoption-canary.md` green
- `node scripts/run-adoption-canary.js https://github.com/expressjs/cors.git --output=docs/case-studies/expressjs-cors-adoption-canary.md` green
- `node scripts/run-adoption-canary.js https://github.com/tinyhttp/tinyhttp.git --output=docs/case-studies/tinyhttp-adoption-canary.md` green
- `npm run release:check` required before publish

## Upgrade

- `npm install -g godpowers@2.4.3` or `npx godpowers@2.4.3`
- Re-run `/god-context` in each project to refresh installed runtime metadata
- No breaking changes for valid `.godpowers/` state.

## Notes

- GitHub release creation for `v2.4.3`
- The tag should match the npm package version.
- The `v2.4.3` tag should point to the release commit that matches the npm
  `godpowers@2.4.3` package.
