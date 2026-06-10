---
name: god-repo
description: |
  Scaffold a production-grade repository. Spawns the god-repo-scaffolder agent
  in a fresh context. Gated on Stack.

  Triggers on: "god repo", "/god-repo", "scaffold the repo", "set up the repo"
---

# /god-repo

Spawn the **god-repo-scaffolder** agent in a fresh context via the host platform's native agent spawning mechanism.

## Setup

1. Verify `.godpowers/stack/DECISION.md` exists. If not, tell user to run `/god-stack` first.
2. Spawn god-repo-scaffolder with the stack DECISION path.
3. The agent scaffolds the repo and writes `.godpowers/repo/AUDIT.md`.

## Verification

After god-repo-scaffolder returns:
1. Verify AUDIT.md exists on disk
2. Verify CI passes on the empty scaffold
3. Run `npx godpowers gate --tier=repo --project=.` and do not proceed on a non-zero exit
4. Run `npx godpowers state advance --step=repo --status=done --project=.` to update `state.json` and regenerate `.godpowers/PROGRESS.md`.

## On Completion

```
Repo scaffolded: .godpowers/repo/AUDIT.md

Suggested next: /god-build (start building the first milestone)
```


## Locking

See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
