---
name: god-suite-sync
description: |
  Propagate byte-identical files across all repos in a Mode D suite.
  Detects drift via meta-linter; user picks canonical version; copies
  to all siblings.

  Triggers on: "god suite sync", "/god-suite-sync", "sync byte-identical",
  "propagate config", "fix .editorconfig drift"
---

# /god-suite-sync

Resolve byte-identical drift across siblings. Per locked Q2: drift is
warnings by default; surfaces in REVIEW-REQUIRED.md per repo.
`--strict` upgrades to hard gate.

## Process

1. Spawn `god-coordinator` in `sync` mode.
2. god-coordinator runs `lib/meta-linter.checkByteIdentical(hubPath)`.
3. For each drifted file:
   - Print the diff between siblings (showing hashes + first-line preview)
   - Ask user: which version is canonical?
   - On answer: copy canonical content to all other siblings
4. After all drifted files resolved: append entry to
   `.godpowers/suite/SYNC-LOG.mdx`
5. Refresh suite state.

## Forms

| Form | Action |
|---|---|
| `/god-suite-sync` | Interactive: prompt per drifted file |
| `/god-suite-sync --canonical <repo>` | Auto-apply: use this repo's version everywhere |
| `/god-suite-sync --dry-run` | Show what would change; no writes |

## Output

- Modified byte-identical files in non-canonical repos
- Append entry to `.godpowers/suite/SYNC-LOG.mdx`
- Refreshed `.godpowers/suite/state.json`

## What this does NOT do

- Touch files NOT declared in `byte-identical:` of suite-config.yaml
- Modify per-repo state.json (only the syncer agent writes; no
  Quarterback-level changes)
- Run any project run inside a sibling repo
