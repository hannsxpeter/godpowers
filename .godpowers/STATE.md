---
godpowers: 7
project: godpowers
stage: ship
verify: npm test
fast: node scripts/check-text.js
docs: README.md, CHANGELOG.md, RELEASE.md, CONTRIBUTING.md, ARCHITECTURE.md, SECURITY.md, SUPPORT.md, USERS.md, INSPIRATION.md, CODE_OF_CONDUCT.md, docs/**
updated: 2026-11-09
---
# godpowers

## Goal
Keep Godpowers a small, verified core: durable project state, checks bound to exact code, an independent reviewer, and gates enforced by hooks in Claude Code and Codex.

## Now
- 7.1.0 is merged to main (c0b2900), tagged v7.1.0, and pushed; CI passed. The publish job (run 42567838762) passed the identity and release checks and failed at the final PUT with E404, so npm still has 6.3.0 as latest. The GitHub release is a draft until npm has 7.1.0.
- 7.2.0 (verdict block, reviewer on review records, review-growth and base-drift warnings, Codex skill metadata, trigger-style descriptions, unattended /god; ideas from tstack) is rebased on main in feat/tstack-picks, Codex-reviewed, and passes the ship gate at the normal tier.

## Next
- Merge feat/tstack-picks to main, tag v7.2.0, and keep its GitHub release a draft until npm has 7.2.0.
- Fix npm credentials (a trusted publisher for publish.yml and no NPM_TOKEN secret, or a new granular NPM_TOKEN). Then `gh run rerun 42567838762` for v7.1.0 first and re-run the v7.2.0 publish job after it, so `latest` ends on 7.2.0; publish both draft releases (`gh release edit <tag> --draft=false`); and upgrade the local install (`npx godpowers@7 --claude --codex --global`).

## Risks
- [ ] low: Windows behavior (process-tree kill, argument quoting) is untested
- [ ] low: the session-start snapshot takes about 5 seconds on repositories with 120,000 files
- [ ] low: the publish job installs npm@11 unpinned and runs dev-dependency install scripts while holding id-token: write, .github/workflows/publish.yml
- [ ] medium: a --local install follows symlinked .claude/, .codex/, or skills folders shipped by the repository and writes or prunes outside the project, lib/install.js copySkills, copyAgents, pruneOwned
- [ ] medium: hook commands and installed skill text wrap the CLI path in plain double quotes, so a directory name with $() or a double quote runs in the shell, lib/install.js hookCommand, installedCli
- [ ] medium: on multi-user Linux the session files live in a shared os.tmpdir() folder whose owner and mode are not checked, so another user could switch off the stop gate, lib/hooks.js
- [ ] low: 7.0.1 security pass backlog: runtime copy file modes follow umask, an empty or relative HOME gives relative hook paths, git honors core.fsmonitor from a copied repo's .git/config, the commit gate matches only plain `git commit`, a dev-only brace-expansion advisory (c8)
- [ ] medium: a repository-declared verify or fast command runs when the agent calls the CLI, with no Godpowers trust step; the host permission prompt is the trust step and fast prints the command, skills/godpowers/SKILL.md, lib/fast.js
