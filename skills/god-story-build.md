---
name: god-story-build
description: |
  Implement a single story. Reads STORY.md, spawns the standard build
  pipeline (god-planner + god-executor + reviewers) scoped to the
  story's slice plan and acceptance criteria.

  Triggers on: "god story build", "/god-story-build", "build story",
  "implement story"
---

# /god-story-build

Run the build pipeline for ONE story.

## Forms

| Form | Action |
|---|---|
| `/god-story-build <STORY-id>` | Build the named story |
| `/god-story-build --next` | Build the first pending story (next eligible by deps) |
| `/god-story-build --status` | Show build status of in-progress stories |

## Process

1. Verify story exists; parse via `lib/story-validator.parseStory`.
2. Validate dependencies are done:
   - For each dep: check that story's status === 'done'
   - If any dep is not done: pause and ask user (proceed anyway, or
     start the dep first)
3. Set story status to `in-progress` via `lib/story-validator.setStatus`.
4. Spawn `god-planner` with directive:
   "Plan a vertical slice for STORY-{id}. Slice plan from STORY.md:
   [steps]. Acceptance criteria from STORY.md: [criteria]. Don't
   exceed 7 commits."
5. Spawn `god-executor` to implement (TDD, atomic commits, code
   annotated `// Implements: STORY-{id}`).
6. Spawn `god-spec-reviewer` + `god-quality-reviewer` (two-stage).
7. On success: trigger `lib/reverse-sync.run()` (per Phase 6 pattern).
8. Story stays `in-progress` until user runs `/god-story-verify` AND
   `/god-story-close`. Build completion alone doesn't auto-close.

## Output

Code commits annotated with `// Implements: STORY-{id}`.
Reverse-sync writes Implementation Linkage footer to ROADMAP.md
(milestone-level credit) and the story's `Notes` section gets a
"Implemented in:" footer.

## Suggested next

- `/god-story-verify <id>` to runtime-test acceptance criteria
- `/god-story-close <id>` after verify passes

## What this does NOT do

- Auto-close the story (must explicitly /god-story-close)
- Run /god-test-runtime (that's /god-story-verify's job)
- Bypass design-reviewer if STORY changes UI (the standard gate
  still fires)


Locking: See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
