---
name: god-suite-release
description: |
  Coordinate a release across siblings in a Mode D suite. When repo A
  bumps version, scan all dependents for impact and propagate updates.

  Triggers on: "god suite release", "/god-suite-release",
  "coordinated release", "bump and propagate"
---

# /god-suite-release

A version bump that knows about dependents. Different from `/god-launch`
(per-repo); this coordinates ACROSS repos.

## Process

1. Verify suite is registered.
2. Prompt for: which repo, new version, release notes.
3. Create `.godpowers/runs/<run-id>/COORDINATOR-HANDOFF.mdx` with the repo,
   new version, release notes, propagation flags, and suite release
   instruction.
4. Spawn `god-coordinator` in `release` mode with only a display-safe
   payload:
   - Name the hub path.
   - Name the operation as `release`.
   - Name the handoff file path.
   - Say: "Read the handoff file first, then coordinate the suite release
     from disk state. Return only user-facing progress and final status."
   Do not put release notes, dependency impact, sibling paths, local file
   lists, or detailed instructions in the visible spawn message.
5. god-coordinator:
   - Scans suite version-table for repos that depend on the bumped repo
   - For each dependent: writes a per-repo orchestrator handoff file and
     spawns its `god-orchestrator` with only a display-safe pointer for the
     `version-bump` directive (NOT a full project run)
   - Aggregates results per-repo
   - Updates `.godpowers/suite-config.yaml` version-table to match
   - Appends to `.godpowers/suite/SYNC-LOG.mdx`
6. Reports aggregated outcome (bumped + propagated repos).

## Forms

| Form | Action |
|---|---|
| `/god-suite-release <repo> <version>` | Bump and propagate |
| `/god-suite-release <repo> <version> --dry-run` | Show impact; no changes |
| `/god-suite-release <repo> <version> --no-propagate` | Bump only the named repo |

## What this does

- Updates the bumped repo's version (via its orchestrator)
- For each dependent: updates its package.json declared version
- Updates suite-config.yaml version-table
- Appends release entry to SYNC-LOG.mdx
- Triggers per-repo `/god-launch` (or equivalent) only when the user
  explicitly confirms each launch

## What this does NOT do

- Auto-launch all dependents (each repo's launch gate still runs;
  user confirms)
- Bypass per-repo critical-finding gates
- Modify code beyond what version bumps require

## Quarterback rule preserved

Each repo's `god-orchestrator` retains full control over its own
release. The coordinator orchestrates the cross-repo coordination
without bypassing per-repo gates.
