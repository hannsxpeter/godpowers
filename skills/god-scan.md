---
name: god-scan
description: |
  Manually trigger a full reverse-sync of the codebase. Scans for
  linkage annotations, updates the linkage map, runs drift detection,
  appends fenced footers to artifacts, and surfaces findings to
  REVIEW-REQUIRED.md.

  Triggers on: "god scan", "/god-scan", "rescan code", "rebuild linkage",
  "scan codebase"
---

# /god-scan

Manual full-codebase scan + reverse-sync. Runs the same pipeline that
god-build, god-feature, god-hotfix etc. trigger automatically (per
Phase 7 workflow integration). Useful when you want to refresh state
between automatic triggers, or after manual code edits.

Because `/god-scan` calls the local reverse-sync runtime directly, keep the
default message concise:

```
Scanning code links and drift. Review items will be written to REVIEW-REQUIRED.md if found.
```

Use a detailed `Auto-invoked:` card only with `--verbose` or debugging.

## Forms

| Form | Action |
|---|---|
| `/god-scan` | Full pipeline: scan + linkage + drift + footers + REVIEW-REQUIRED |
| `/god-scan --linkage-only` | Just scan + update linkage map (no footers, no drift) |
| `/god-scan --drift-only` | Just drift detection, using existing linkage |
| `/god-scan --footers-only` | Just rewrite fenced footers from existing linkage |
| `/god-scan --json` | JSON summary of the run |

## Process

1. Verify `.godpowers/` exists.
2. Call `lib/reverse-sync.run(projectRoot)`:
   - Scan via `lib/code-scanner.scan` (annotations, filenames, style refs)
   - Apply to linkage map via `lib/code-scanner.applyScan`
   - Run drift detection via `lib/drift-detector.detectAll`
   - If impeccable installed and UI files touched: run `npx impeccable detect`
   - Append fenced footers to PRD, ARCH, ROADMAP, STACK, DESIGN via
     `lib/reverse-sync.appendFooters`
   - Surface drift + impeccable findings to REVIEW-REQUIRED.md
3. Report:
   - Files scanned, links discovered/added
   - Drift findings (errors, warnings, infos)
   - Footers updated
   - REVIEW-REQUIRED items added
4. End with sync status:

```
Sync status:
  Trigger: /god-scan
  Agent: none, local runtime only
  Local syncs:
    + reverse-sync: <scanned N files, updated M footers, populated K review items>
  Artifacts: <changed linkage files, fenced artifacts, REVIEW-REQUIRED.md, or no-op>
  Log: <REVIEW-REQUIRED.md or none>
```

## Fence rules

Fenced footers are wrapped in:

```
<!-- godpowers:linkage:begin -->
... auto-generated content ...
<!-- godpowers:linkage:end -->
```

Anything outside the fence is yours. /god-scan never touches it.
Re-running /god-scan replaces the fence with current linkage state
(idempotent).

## What gets appended where

| Artifact | Footer content |
|---|---|
| PRD.md | Each requirement (P-MUST, P-SHOULD, P-COULD) lists implementing files |
| ARCH.md | Each container lists Source: directories; each ADR lists Pattern: files |
| ROADMAP.md | Each milestone lists implementing files |
| STACK/DECISION.md | Each S- decision shows usage count |
| DESIGN.md | Each token shows usage count; each component shows Implements: files |

## Output

Updates:
- `.godpowers/links/{artifact-to-code,code-to-artifact}.json`
- `.godpowers/links/LINKAGE-LOG.mdx` (append)
- Fenced sections in PRD.md / ARCH.md / ROADMAP.md / STACK/DECISION.md / DESIGN.md
- `REVIEW-REQUIRED.md` (append, if drift / impeccable findings)
- `.godpowers/runs/<run-id>/events.jsonl` (append: linkage events to the current run's ledger, per `lib/events.js`)

User content outside fences is never modified.

## Output to the run event ledger

Events append to the run-scoped ledger at `.godpowers/runs/<run-id>/events.jsonl`
(the only location `lib/event-reader.js` and `lib/otel-exporter.js` read):

```json
{ "name": "scan.start" }
{ "name": "linkage.snapshot", "coverage-pct": 0.87, "drift-count": 1 }
{ "name": "drift.detected", "kind": "design-token-drift", ... }
{ "name": "review-required.populated", "items": 5 }
{ "name": "scan.end" }
```


Locking: See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
