---
godpowers: 7
project: godpowers
stage: ship
verify: npm test
fast: node scripts/check-text.js
docs: README.md, CHANGELOG.md, CONTRIBUTING.md, ARCHITECTURE.md, SECURITY.md, INSPIRATION.md, CODE_OF_CONDUCT.md, docs/**
updated: 2026-11-23
---
# godpowers

## Goal
Keep Godpowers a small, verified core: durable project state, checks bound to exact code, an independent reviewer, and gates enforced by hooks in Claude Code and Codex.

## Now
- 7.3.0 is on npm as @hxp-tools/godpowers (latest, published 2026-11-23 by hand as the one allowed first publish of a new name) and is the Latest GitHub release. The command stays `godpowers`. The local Claude Code and Codex install is on 7.3.0.
- The unscoped `godpowers` package stops at 6.3.0. The v7.1.0 and v7.2.0 tags never reached npm; their GitHub releases stay drafts.
- No NPM_TOKEN secret is set. The v7.3.0 tag publish run failed at authentication before the manual publish, which is expected.

## Next
- Add a trusted publisher on npmjs.com for @hxp-tools/godpowers: GitHub Actions, hannsxpeter/godpowers, workflow publish.yml, blank environment, direct `npm publish` allowed. Until then a tag push cannot publish.
- Merge main into feat/feedback-loop so its AGENTS.md note and docs use the scoped package, then finish its review.

## Risks
- [ ] low: Windows behavior (process-tree kill, argument quoting) is untested
- [ ] low: the session-start snapshot takes about 5 seconds on repositories with 120,000 files
- [ ] low: the publish job installs npm@11 unpinned and runs dev-dependency install scripts while holding id-token: write, .github/workflows/publish.yml
- [ ] medium: a --local install follows symlinked .claude/, .codex/, or skills folders shipped by the repository and writes or prunes outside the project, lib/install.js copySkills, copyAgents, pruneOwned
- [ ] medium: hook commands and installed skill text wrap the CLI path in plain double quotes, so a directory name with $() or a double quote runs in the shell, lib/install.js hookCommand, installedCli
- [ ] medium: on multi-user Linux the session files live in a shared os.tmpdir() folder whose owner and mode are not checked, so another user could switch off the stop gate, lib/hooks.js
- [ ] low: 7.0.1 security pass backlog: runtime copy file modes follow umask, an empty or relative HOME gives relative hook paths, git honors core.fsmonitor from a copied repo's .git/config, the commit gate matches only plain `git commit`, a dev-only brace-expansion advisory (c8)
- [ ] medium: a repository-declared verify or fast command runs when the agent calls the CLI, with no Godpowers trust step; the host permission prompt is the trust step and fast prints the command, skills/godpowers/SKILL.md, lib/fast.js
