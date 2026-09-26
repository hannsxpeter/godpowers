# Contributing to Godpowers

Thanks for helping. Godpowers 7 is small on purpose, and the most useful
contributions keep it that way: fixes, sharper instructions, better checks, and
evidence about what works.

## Quick start

```bash
git clone https://github.com/hannsxpeter/godpowers.git
cd godpowers
npm ci
npm test
```

Node.js 18 or newer. There are no production dependencies; `c8` is the only
dev dependency.

## Before you open a pull request

```bash
npm run lint        # JavaScript parses; no em dashes, en dashes, or emoji
npm test            # every test/*.test.js suite
npm run coverage    # 90% lines and 75% branches on lib/
npm run budget      # prompt size of skills and agents
npm run pack:check  # the npm package contains what an install needs
```

## Ground rules

- **Keep the budget.** `npm run budget` fails when the shared skill passes 1,500
  tokens, a command or agent passes 800, all skills and agents together pass
  8,000, or the per-session load passes 1,200. If an instruction does not
  change what a strong model does, leave it out.
- **Prefer a check to an instruction.** If a rule can be enforced by the CLI,
  lint, or a hook, write the code and a test instead of more prose.
- **New commands and agents need a strong case.** Show what a current model
  gets wrong without it, ideally with an A/B run (`docs/ab-eval.md`). Adding a
  skill means a folder under `skills/` with a `SKILL.md`, a row in the README
  table, and updates to `test/package.test.js` and `scripts/check-pack.js`.
- **No production dependencies.**
- **Write plainly.** Short sentences, named actors, real file paths. No em
  dashes, en dashes, or emoji anywhere in the repository.

## Tests

Tests use `node:test` and run against temporary git repositories and a
temporary HOME, never your real configuration. Each module in `lib/` has a
suite. Add a regression test with every fix.

## Commit messages

Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.
Say what changed and why in the body when it is not obvious.

## Releasing

1. Update the version in `package.json`, `.claude-plugin/plugin.json`, and
   `.claude-plugin/marketplace.json`, add the CHANGELOG entry, and rewrite
   `RELEASE.md`.
2. `npm run release:check`.
3. Commit and push `main`.
4. Tag and push the tag: `git tag v<version> && git push origin v<version>`.
   The publish workflow checks the tag against `package.json` and `main`, runs
   the release check again, and publishes with provenance. Never run
   `npm publish` by hand.
5. `gh release create v<version> --notes-file RELEASE.md`.

## Dependencies and security advisories

Dependabot is enabled. Merge its pull requests rather than adding npm
`overrides`, unless the patched version is outside every declared range.

## Reporting bugs

Open an issue with the output of `npx godpowers doctor` and
`npx godpowers status`, what you ran, and what happened. Report security
problems privately; see [SECURITY.md](SECURITY.md).

## License

By contributing you agree that your contributions are licensed under the MIT
License.
