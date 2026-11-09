---
godpowers: 7
project: godpowers
stage: review
verify: npm test
fast: node scripts/check-text.js
docs: README.md, CHANGELOG.md, RELEASE.md, CONTRIBUTING.md, ARCHITECTURE.md, SECURITY.md, SUPPORT.md, USERS.md, INSPIRATION.md, CODE_OF_CONDUCT.md, docs/**
updated: 2026-11-08
---
# godpowers

## Goal
Keep Godpowers a small, verified core: durable project state, checks bound to exact code, an independent reviewer, and gates enforced by hooks in Claude Code and Codex.

## Now
- Building 7.1.0 on feat/faster-verification: faster, more selective verification (see PLAN.md). 7.0.0 and 7.0.1 never reached npm.

## Next
- Independent Codex review of main...feat/faster-verification, then the security pass (risk is high: ci.yml changed), the ship gate, and the v7.1.0 tag. npm publishing still needs working credentials (E404 since 7.0.0).

## Risks
- [ ] low: Windows behavior (process-tree kill, argument quoting) is untested
- [ ] low: the session-start snapshot takes about 5 seconds on repositories with 120,000 files
- [ ] low: the publish job installs npm@11 unpinned and runs dev-dependency install scripts while holding id-token: write, .github/workflows/publish.yml
- [ ] medium: a --local install follows symlinked .claude/, .codex/, or skills folders shipped by the repository and writes or prunes outside the project, lib/install.js copySkills, copyAgents, pruneOwned
- [ ] medium: hook commands and installed skill text wrap the CLI path in plain double quotes, so a directory name with $() or a double quote runs in the shell, lib/install.js hookCommand, installedCli
- [ ] medium: on multi-user Linux the session files live in a shared os.tmpdir() folder whose owner and mode are not checked, so another user could switch off the stop gate, lib/hooks.js
- [ ] low: 7.0.1 security pass backlog: runtime copy file modes follow umask, an empty or relative HOME gives relative hook paths, git honors core.fsmonitor from a copied repo's .git/config, the commit gate matches only plain `git commit`, a dev-only brace-expansion advisory (c8)
