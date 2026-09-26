# Migrating from Godpowers 6

Godpowers 7 keeps the parts of 6.x that still pay off (project state on disk,
recorded checks, independent review, a security pass, a ship gate) and drops the
prompt methodology that current models no longer need. This page covers what
moves and how.

## 1. Reinstall

```bash
npx godpowers@7 --claude --codex --global
```

Use the flags for your hosts. The installer removes the 6.x skills and agents,
the `godpowers-*` data folders, the version and profile files, and the old hook
scripts. It keeps everything that does not belong to Godpowers, including other
skills whose names start with `god` but not `god-` (for example `goddesign`).

Check the result:

```bash
npx godpowers@7 doctor
```

In Codex, open `/hooks` once and trust the three Godpowers hooks.

## 2. Migrate each project

```bash
npx godpowers@7 migrate --dry-run
npx godpowers@7 migrate
```

The migration:

- moves every 6.x file in `.godpowers/` to `.godpowers/archive/v6/` (nothing is
  deleted),
- writes `STATE.md` with a stage taken from the old tier statuses (plan, build,
  harden, ship, or done), the detected check command, and pointers to open
  security findings and TODOs in the archive,
- writes `PLAN.md` with links to the archived PRD, architecture, and roadmap,
- starts `DECISIONS.md` with an entry recording the migration,
- removes the 6.x instruction blocks from `AGENTS.md`, `CLAUDE.md`,
  `GEMINI.md`, and the editor rule files it created, deletes files that only
  held those blocks, and adds the short 7.x note to `AGENTS.md`, keeping a
  copy of every file it changes in `.godpowers/archive/v6/instruction-files/`
  and skipping symlinked files,
- adds `.godpowers/evidence.jsonl merge=union` to `.gitattributes`.

Afterwards, run `/god-plan` to restate the goal and slices from the archived
documents, list any open security findings under Risks in `STATE.md`, and
commit.

Until a project is migrated, the 7.x gates stay off there, and the session brief
reminds you to migrate.

Projects that never had `.godpowers/` state can still carry 6.x instruction
blocks (for example a "Godpowers Project Context" Pillars block in AGENTS.md).
Remove just those with `npx godpowers@7 clean --dry-run`, then
`npx godpowers@7 clean`.

## Command map

| 6.x | 7.x |
| --- | --- |
| `/god-mode`, `/god-next`, `/god-help`, `/god-locate`, `/god-progress` | `/god` |
| `/god-init`, `/god-migrate`, `/god-context`, `/god-doctor` | `/god-init`, `godpowers doctor`, `godpowers migrate` |
| `/god-prd`, `/god-arch`, `/god-roadmap`, `/god-stack`, `/god-explore`, `/god-discuss`, `/god-story`, `/god-chart` | `/god-plan` |
| `/god-feature`, `/god-fix`, `/god-hotfix`, `/god-refactor`, `/god-debug`, `/god-repo` | `/god-build` |
| `/god-review-changes`, `/god-audit`, `/god-preflight`, `/god-reconcile` | `/god-review` |
| `/god-deploy`, `/god-observe`, `/god-launch` | `/god-ship` |
| `/god-harden`, `/god-status` | unchanged |

Everything else was removed. If you rely on a removed command, keep using 6.x
with `npx godpowers@6`; the 6.4 source is tagged `v6.4.0`.

## What changed in the files

| 6.x | 7.x |
| --- | --- |
| `state.json` plus generated `PROGRESS.mdx` | `STATE.md` (frontmatter plus Goal, Now, Next, Risks) |
| `prd/`, `arch/`, `roadmap/`, `stack/` | `PLAN.md` |
| decisions spread across artifacts and events | `DECISIONS.md`, append-only |
| `ledger/verifications.jsonl` and hash-chained run events | `evidence.jsonl`, bound to tree fingerprints |
| `harden/FINDINGS.mdx` | risk lines in `STATE.md` plus a `harden` record |
