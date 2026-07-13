# Contributing to Godpowers

Thank you for your interest in contributing. This document explains how to
contribute changes and what we expect from contributors.

## Quick Start

1. Fork the repository
2. Create a feature branch: `git checkout -b your-change-name`
3. Make your changes
4. Run tests: `npm test`
5. Commit with a clear message
6. Open a PR

## What We're Looking For

We welcome contributions in these areas:

### High value
- Per-tier reference files (antipattern catalogs, worked examples)
- Real integration tests and messy-repo dogfood scenarios
- Mode D suite hardening, cross-repo release edge cases, and dependent impact tests
- Host capability tests for AI coding tools with different spawning guarantees
- Extension pack examples and extension authoring tests
- New specialist agents for domain-specific work
- Bug fixes
- Documentation improvements

### Lower value
- Trivial style changes
- Renaming internal variables
- Adding emoji decoration (reject by policy)

## Quality Standards

All contributions must pass these checks before merge:

### Style
- No em dashes or en dashes (use commas, colons, semicolons, parentheses,
  or hyphens)
- No emojis as decoration (real icons OK in UI code only)
- No AI-generated decoration words ("powerful", "seamless", "revolutionary")
  in docs without quantification

### Skill files
- YAML frontmatter with `name` and `description`
- `description` includes "Triggers on:" with example phrases
- Body is substantive (>100 chars beyond frontmatter)
- Documents what agent it spawns (or "(built-in)" if it doesn't spawn one)

### Agent files
- YAML frontmatter with `name`, `description`, `tools`
- `description` documents who spawns it
- Has `## Gate Check` if it's a tier agent (tier 1+)
- Has `## Have-Nots` if it produces an artifact
- Has `## YOLO Handling` if it has pause conditions
- Has `## Done Criteria`

### Tests
- All smoke checks pass: `bash scripts/smoke.sh`
- All skill validation passes: `node scripts/validate-skills.js`
- Full release gate passes: `npm run release:check`
- Dogfood scenarios pass when migration, host, extension, suite, or release surfaces change: `node scripts/test-dogfood-runner.js`
- Package payload checks pass when runtime files, fixtures, routing, or docs change: `npm run pack:check`
- New agents added to relevant test loops

## Commit Messages

Godpowers uses [Conventional Commits](https://www.conventionalcommits.org/)
as a discipline for clear history, not as a load-bearing contract.

Format:
```
<type>(<optional scope>): <short summary>

<body explaining what and why>
```

Common types: `feat`, `fix`, `perf`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`.

Examples:
- `feat(cost): split live vs estimated source`
- `fix(otel): handle missing span_id gracefully`

## Releasing

Releases are manual and explicit:
```
npm version patch --no-git-tag-version
npm run release:check
rm -f godpowers-*.tgz
npm cache clean --force
npm pack
git add -A
git commit -m "Release godpowers X.Y.Z"
git tag -a vX.Y.Z -m "Godpowers X.Y.Z"
git push origin main
git push origin vX.Y.Z
gh release create vX.Y.Z --title "vX.Y.Z" --notes-file RELEASE.md
npm publish godpowers-X.Y.Z.tgz --access public
```

Repo documentation sync must be clean before publishing. It keeps README
badges, public surface counts, release references, contribution guidance,
security policy, and Pillars planning signals aligned. CHANGELOG.md and
RELEASE.md are human-curated even when mechanical repo documentation sync has
run.

## Substitution Test

Every change to user-facing text (README, skill descriptions, agent
instructions) must pass the substitution test: replace "Godpowers" with a
competitor. If the sentence still reads true, it decides nothing. Rewrite.

## Adding a New Specialist Agent

1. Create `specialists/god-<name>.md` with required sections
2. Add or update routing metadata if the agent is spawned by a command
3. Add to `bin/install.js` if it needs special install handling (rare)
4. Add CHANGELOG entry under [Unreleased]
5. Update README's command table if it has a new slash command

## Adding a New Slash Command

1. Create `skills/god-<name>.md` with frontmatter + thin orchestration
2. The skill should spawn the right specialist agent (don't do work in skills)
3. Add `On Completion` section suggesting the next command
4. Create `routing/god-<name>.yaml` with atomic spawn tokens and trace events when agents are spawned
5. Add to `/god-next` routing logic if appropriate
6. Add to README command table
7. Add CHANGELOG entry
8. Add dogfood or release-surface coverage if the command touches migration, host guarantees, extensions, suites, package contents, or release behavior

## Reporting Bugs

Open an issue with:
- Godpowers version (`cat ~/.claude/GODPOWERS_VERSION`)
- Runtime (Claude Code, Codex, etc.)
- Steps to reproduce
- What you expected
- What happened
- Relevant artifacts from `.godpowers/` if applicable

## License

By contributing, you agree your contributions will be licensed under the
MIT License.
