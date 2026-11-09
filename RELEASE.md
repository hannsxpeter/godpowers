# Godpowers 7.2.0

7.2.0 builds on 7.1.0. See
[CHANGELOG.md](CHANGELOG.md) for the 7.1.0 details, and
[docs/migrating-from-6.md](docs/migrating-from-6.md) for the 6.x command map
and upgrade steps.

Godpowers is still small: 8 commands, 4 agents, and about 6K tokens of
instructions, of which about 600 load per session.

## Changes in 7.2.0

- **`godpowers verdict`** prints the check, review rounds and reviewer,
  security record, and open risks for the current code, ready to paste into a
  PR description or release notes. It judges evidence like the ship gate,
  claims no pass while the ledger has integrity errors, and exits 0 whatever the evidence says (a bad `--base` exits 2).
- **Reviewer on the record.** `record review|harden --reviewer "<name>"` stores
  who reviewed. It is never guessed. `reviews` shows it.
- **Review growth.** `record review --base <ref>` stores the size of the change.
  `reviews` and `record review` warn when it grew by more than 25% (and at
  least 20 lines) during review.
- **Base drift.** `gate ship --onto <ref>` (default `origin/HEAD`, else `main`)
  warns, without blocking, when the target branch moved on in files this
  change also touches. It never fetches.
- **Codex metadata.** Codex installs get `agents/openai.yaml` next to each
  skill.
- **Trigger-style descriptions.** Skill and agent descriptions say when to use
  them. The always-loaded prompt fell from 957 to 605 tokens, with every
  trigger phrase kept.
- **Unattended runs.** When you are not watching, `/god` asks through the
  host's question tool and ends ready, waiting for approval, or blocked.
  Reviews judge severity against the goal and cut what review added beyond it.
  `/god-ship` pastes the verdict and runs the drift check.

Several of these ideas come from tstack (MIT, by Theo Browne). See
[INSPIRATION.md](INSPIRATION.md).

## Behavior change

None since 7.1.0. Old records stay valid: a review record without `reviewer`
or `diff` still counts, and the new warnings never block.

Coming from 6.x or 7.0, read the 7.1.0 behavior changes in
[CHANGELOG.md](CHANGELOG.md) too: run `godpowers verify` once after upgrading,
because 7.0 verify records no longer satisfy the gates, and the ship gate now
fails outside a git work tree.

## Upgrade

```bash
npx godpowers@7 --claude --codex --global
npx godpowers@7 migrate --dry-run   # 6.x projects only, then without --dry-run
```

In Codex, open `/hooks` once to trust the hooks if you have not already.
