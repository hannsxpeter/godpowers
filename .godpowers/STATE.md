---
godpowers: 7
project: godpowers
stage: ship
verify: npm test
updated: 2026-09-26
---
# godpowers

## Goal
Keep Godpowers a small, verified core: durable project state, checks bound to exact code, an independent reviewer, and gates enforced by hooks in Claude Code and Codex.

## Now
- 7.0.0 is tagged and CI-green; npm publish is waiting on npm credentials (E404 from the registry).

## Next
- Fix npm auth (trusted publishing or a new NPM_TOKEN), rerun the publish job, then publish the draft GitHub release.

## Risks
- [ ] low: Windows behavior (process-tree kill, argument quoting) is untested
- [ ] low: the session-start snapshot takes about 5 seconds on repositories with 120,000 files
- [ ] low: the publish job installs npm@11 unpinned and runs dev-dependency install scripts while holding id-token: write, .github/workflows/publish.yml
