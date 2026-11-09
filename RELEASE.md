# Godpowers 7.1.0

7.1.0 is the first 7.x release on npm. 7.0.0 and 7.0.1 were tagged but never
published, because the publish job failed with `E404` on npm credentials.

## What 7.0 brought

Godpowers 7 is a small core: 8 commands, 4 agents, and about 6K tokens of
instructions, down from 124 commands, 41 agents, and 1.35 MB of prompt files.
It keeps durable state, evidence bound to exact code, an independent review,
and gates that hooks enforce. See [CHANGELOG.md](CHANGELOG.md) for the full
7.0.0 and 7.0.1 notes and [docs/migrating-from-6.md](docs/migrating-from-6.md)
for the command map and upgrade steps.

## Changes in 7.1.0

- **`godpowers fast`** runs a file-local check declared as `fast:` in STATE.md
  on the changed files, for quick feedback. It is never recorded. `fast --hook`
  is a handler for a PostToolUse hook you add yourself.
- **`verify` reuses a passing record** of the same command on unchanged code.
  `--force` runs it again.
- **Bounded reviews.** Review records store the commit they saw and the findings
  you dismissed. `godpowers reviews` lists the rounds and says to rethink the
  approach after three failed ones. Re-reviews cover only the change since the
  last reviewed commit.
- **`godpowers tests`** flags deleted tests, fewer tests or assertions, and
  added skip or focus markers since the last release tag.
- **`godpowers risk` and a tiered ship gate.** Low-risk changes need a passing
  check, normal ones also a review, and high-risk ones also a security record.
  With no tag to compare against, the tier is high.
- **Documentation edits no longer void reviews.** Review, harden, and ship
  records match on a second fingerprint over non-documentation files. `docs:`
  in STATE.md changes what counts as documentation.
- **`godpowers stats`** reports check runs, recovery time, and review rounds.
- **Plan slices carry a kind**, `(behavior)` or `(refactor)`, and the skills
  keep the two apart. The shared skill no longer names a specific model.
- **CI** cancels superseded pull request runs, lints once, and runs the release
  check in parallel.

Godpowers does not register a hook that runs the `fast` command, because an
installed hook would run a command any cloned repository declares. The README
shows a hook you can add to your own settings.

## Behavior change

The ship gate no longer requires a security record for normal-risk changes, or
a review for low-risk ones. Add globs under `risk:` in STATE.md to make more
paths high risk.

## Upgrade

```bash
npx godpowers@7 --claude --codex --global
npx godpowers@7 migrate --dry-run   # 6.x projects only, then without --dry-run
```

In Codex, open `/hooks` once to trust the new hooks.
