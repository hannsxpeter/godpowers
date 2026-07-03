# God Mode Runbook

This reference contains the detailed transcript, flag, final sync, and completion contracts for `/god-mode`. The skill file remains the dispatch contract and points here for operational templates.

## User-Visible Transcript Contract

The God Mode transcript is an operator console, not a prompt debugger.

Show:
- detected resume or project mode in plain language
- a compact "Next step" card before each visible phase or tier sub-step
- a compact "Step result" card after each visible phase or tier sub-step
- concise notes for automatic work that changes artifacts, review items, or
  recommendations, with details written to logs
- plain-language workflow names. Say "project run" or "workflow" instead of
  unexplained "arc" in visible output
- PRD and roadmap visibility in status and closeout blocks when artifacts
  exist or are expected
- short progress updates for phases, commands, validations, and file edits
- concise validation summaries instead of full command noise when possible
- final changed paths, validation results, and completion or pause status
- final compact action brief from disk, with `/god-status --full` offered for
  the complete dashboard

Hide:
- raw spawn input
- "Hard instructions" sections
- spawned-agent prompt text
- detailed handoff file contents
- system, developer, or AGENTS.md rule recitations
- complete file loadout lists
- internal routing metadata unless it directly affects a user decision

If an internal instruction must influence a pause, translate it into the
smallest user-facing question. For example, ask for
`STAGING_APP_URL=<deployed staging origin>` at final sign-off instead of
exposing the full Shipping Closure Protocol.

## Step Cards

Relay the orchestrator's step cards when present. If the orchestrator output is
missing them, synthesize them from disk state before continuing.

Before work starts:

```text
Next step
Phase: <plain-language phase> (tier <human ordinal> of <human total>)
Step: <sub-step-label>
Progress: <pct>% (<done> of <total> steps complete; step <n> of <total>)
Why this now: <one sentence>
What will happen:
  1. <observable action>
  2. <observable action>
Expected output: <artifact path or verification result>
```

After work completes or pauses:

```text
Step result
Phase: <plain-language phase> (tier <human ordinal> of <human total>)
Step: <sub-step-label>
Progress: <pct>% (<done> of <total> steps complete; step <n> of <total>)
Result: <done | blocked | failed | skipped | imported>
What happened:
  1. <observable action completed>
  2. <artifact or verification result>
Next: <next command or pause question>
```

## Pause Format (relay from orchestrator)

```
PAUSE: [one-sentence question]

Why only you can answer: [one sentence]

| Option | Tradeoff |
|--------|----------|
| A: ... | ... |
| B: ... | ... |

Default: If you say "go", I'll pick [X] because [Y].
```

## Flags

### --yolo
Pass through to orchestrator. Orchestrator picks defaults at every pause point
and logs decisions to `.godpowers/YOLO-DECISIONS.mdx`. Pillar sync proposals
generated from durable Godpowers artifact changes are auto-applied in this
mode and logged as YOLO decisions.

`--yolo` does not skip release-truth gates. If safe sync is unresolved, route
to `/god-reconcile Release Truth And Safe Sync`. If harden has unresolved
Critical findings, pause even under `--yolo`.

For brownfield and bluefield, `--yolo` still runs `/god-preflight` first when
`.godpowers/preflight/PREFLIGHT.mdx` is absent. The orchestrator then follows
the preflight report's safest recommended route automatically, logging that
choice to `.godpowers/YOLO-DECISIONS.mdx`. Preflight may only pause under
`--yolo` for Critical security findings or a contradiction that makes route
selection impossible.

### --conservative
Pass through. Orchestrator pauses at every tier boundary.

### --from=<tier>
Pass through. Orchestrator re-derives state from disk and starts from named tier.

### --audit
Pass through. Orchestrator skips building, runs god-auditor on existing artifacts.

### --dry-run
Pass through. Orchestrator plans but writes nothing.

### --with-hygiene
After Launch, run a post-launch hygiene pass: god-auditor + god-deps-auditor +
god-docs-writer verification. Catches pre-existing CVEs, doc drift, artifact
quality drift before declaring complete.

### --skip-hygiene
Default. Skip the hygiene pass. Use when iterating quickly.

## Tier transition gates

After each tier skill returns, run the matching executable gate before starting
the downstream tier:

```bash
npx godpowers gate --tier=prd --project=.
npx godpowers gate --tier=design --project=.
npx godpowers gate --tier=arch --project=.
npx godpowers gate --tier=roadmap --project=.
npx godpowers gate --tier=stack --project=.
npx godpowers gate --tier=repo --project=.
npx godpowers gate --tier=build --project=.
npx godpowers gate --tier=harden --project=.
```

Run the design gate only when the project requires design. A non-zero gate exit
pauses the project run for repair and blocks downstream tier dispatch.

## Mandatory final sync

Regardless of flags, `/god-mode` always runs `/god-sync` before declaring
complete. This ensures all 14 core artifact categories and local sync surfaces
are in a consistent state:

- 10 Tier 0-3 artifacts validated (have-nots passing)
- 4 capture artifacts noted as `not-yet-created` (graceful handling)
- repo-doc, repo-surface, feature awareness, source sync-back, host capability,
  checkpoint, Pillars, and context refresh statuses reported
- SYNC-LOG.md updated with project-run completion entry
- state.json reflects final tier statuses

Under `--yolo`, the sync step auto-applies (no pause). Under
`--conservative`, it pauses for confirmation. Under `--with-hygiene`,
it runs alongside the hygiene pass.

Display this before the final completion block:

```
Sync status:
  Trigger: /god-mode final sync
  Agent: god-updater spawned
  Local syncs:
    + feature-awareness: <recorded runtime features, refreshed context, or no-op>
    + reverse-sync: <counts and result>
    + repo-doc-sync: <refreshed repo docs, recommended god-docs-writer, or no-op>
    + repo-surface-sync: <checked structural surfaces, recommended scoped agents, or no-op>
    + pillars-sync: <counts and result>
    + checkpoint-sync: <created, updated, no-op, or skipped>
    + context-refresh: <spawned, no-op, or skipped>
  Artifacts: <changed files or no-op>
  Log: .godpowers/SYNC-LOG.mdx
```

The sync step also reconciles native Pillars context. When `.godpowers`
artifacts create or change durable project truth, Godpowers maps those changes
to relevant pillar files through `lib/pillars.planArtifactSync`. Default mode
proposes pillar updates for review. `--yolo` applies them immediately and logs
the action to `.godpowers/YOLO-DECISIONS.mdx`.

When `/god-mode` resumes an existing `.godpowers` project, it auto-invokes
`lib/feature-awareness.run(projectRoot)` before the final sync report. This
keeps upgraded projects aware of new runtime features, current context fences,
and migration routes without rewriting user artifacts.

The mandatory final sync also receives repo documentation sync through
`/god-sync`. This keeps README badges, release surfaces, contribution guidance,
security policy checks, and Pillars context planning arc-ready before the
project run is declared complete.

The mandatory final sync also receives repo surface sync through `/god-sync`.
This keeps routes, packages, agent handoffs, workflow metadata, recipe routes,
extension packs, and release policy checks aligned before the project run is
declared complete.

If `/god-mode` resumes an existing `.godpowers` project that lacks Pillars,
it Pillar-izes the project before continuing. Existing `.godpowers` artifacts
become managed source references in the relevant `agents/*.md` files.

The sync step is what closes the loop between greenfield project-run creation and
the comprehensive 14-artifact reconciliation system. See
`docs/greenfield-coverage.md` for what's created when.

## Completion

When orchestrator returns "complete", display:

```
Godpowers project run complete.

Sync status:
  Trigger: /god-mode final sync
  Agent: god-updater spawned
  Local syncs:
    + feature-awareness: <recorded runtime features, refreshed context, or no-op>
    + reverse-sync: <counts and result>
    + repo-doc-sync: <refreshed repo docs, recommended god-docs-writer, or no-op>
    + repo-surface-sync: <checked structural surfaces, recommended scoped agents, or no-op>
    + pillars-sync: <counts and result>
    + checkpoint-sync: <created, updated, no-op, or skipped>
    + context-refresh: <spawned, no-op, or skipped>
  Artifacts: <changed files or no-op>
  Log: .godpowers/SYNC-LOG.mdx

Current status:
  State: complete
  Progress: <pct>% (<done> of <total> steps complete; current step <n> of <total>)
  Worktree: <clean | modified files unstaged | staged changes | mixed>
  Index: <untouched | staged files listed>

Planning visibility:
  PRD: <done | pending | missing | deferred> <artifact path when present>
  Roadmap: <done | pending | missing | deferred> <artifact path when present>
  Current milestone: <roadmap milestone, tier, or next planning gate when known>
  Completion: <pct>% <brief basis, for example done steps over total tracked steps>

Artifacts on disk:
  + PRD           .godpowers/prd/PRD.mdx
  + Architecture  .godpowers/arch/ARCH.mdx
  + Roadmap       .godpowers/roadmap/ROADMAP.mdx
  + Stack         .godpowers/stack/DECISION.mdx
  + Repo          .godpowers/repo/AUDIT.mdx
  + Build         .godpowers/build/STATE.mdx
  + Deploy        .godpowers/deploy/STATE.mdx
  + Observe       .godpowers/observe/STATE.mdx
  + Launch        .godpowers/launch/STATE.mdx
  + Harden        .godpowers/harden/FINDINGS.mdx

Built. Tested. Shipped. Hardened.

Project is now in STEADY STATE. From here, use these workflows:

  Adding features:        /god-feature
  Production bugs:        /god-hotfix
  Code cleanup:           /god-refactor
  Research questions:     /god-spike
  Post-incident:          /god-postmortem
  Framework upgrades:     /god-upgrade
  Documentation:          /god-docs
  Dependency updates:     /god-update-deps

Periodic hygiene:
  Quality audit:          /god-audit
  Health check:           /god-hygiene

Open items:
  1. <none, or deployed staging deferred, pending review, unstaged files, etc.>

Next commands:
- /god-status --full: Review the complete dashboard and proactive checks.
- /god-next: Continue with the safest state-derived next step.
- stage only the intended files, then commit: Commit release-ready changes.
- provide STAGING_APP_URL=<deployed staging origin>: Run deployed staging when needed.
```

If the run edited code but did not stage or commit, the completion block must
say so. If unrelated or pre-existing worktree changes are present, do not imply
the worktree is clean. Recommend a scoped review or explicit staging path.

If the run is a focused brownfield/refactor workflow rather than a full greenfield
project run, adapt the same closeout shape and replace "Project is now in STEADY
STATE" with the actual disk-derived lifecycle and next route.
