---
name: god-update-deps
description: |
  Audit and update dependencies safely. Identifies CVEs, deprecation, and
  staleness. Plans incremental updates with regression tests between each.
  Distinguishes patch/minor (safe to batch) from major (needs migration).

  Triggers on: "god update deps", "/god-update-deps", "update dependencies",
  "audit deps", "npm audit", "dependency upgrade"
---

# /god-update-deps

Update dependencies safely.

## When to use

- Routine maintenance (monthly cadence recommended)
- After a CVE alert
- Before a major release (clean dep tree)
- When `npm outdated` shows accumulated drift

## When NOT to use

- A specific dependency is part of a framework migration: use /god-upgrade
- Single trivial bump in dev: use /god-fast

## Orchestration

### Phase 1: Audit (god-deps-auditor)
Spawn **god-deps-auditor** in fresh context.

The agent:
1. Runs the appropriate audit tool for the stack (`npm audit`, `pip-audit`,
   etc.)
2. Lists outdated and stale dependencies
3. Runs package legitimacy checks for new replacement candidates before
   recommending them
4. Classifies each: Critical CVE / Stale / Major behind / Minor behind / OK
5. Writes AUDIT.md

### Phase 2: Triage
The agent presents the audit. Priority order:
1. Critical CVEs (act now)
2. Stale + major behind (likely abandoned, plan replacement)
3. Minor/patch updates (batch them)

### Phase 3: Apply Updates

For **patch updates** (X.Y.Z -> X.Y.Z+1):
- Group by category (e.g., all eslint plugins together)
- Spawn **god-executor** to update + run tests
- Spawn reviewers (compressed)
- Atomic commit

For **minor updates** (X.Y -> X.Y+1):
- One package at a time
- Spawn **god-executor** to update + run tests + read changelog
- Spawn reviewers
- Atomic commit

For **major updates** (X -> X+1):
- DO NOT proceed in this workflow
- Route to /god-upgrade for each major update
- Defer in this AUDIT.md

### Phase 4: Verify
After all updates:
- Full test suite must pass
- CI must be green
- Lockfile committed

## On Completion

```
Dependency audit complete.

Critical CVEs: N (all addressed)
Patch updates: N applied
Minor updates: N applied
Major updates: N deferred to /god-upgrade

Audit: .godpowers/deps/AUDIT.md

Suggested next:
  - For each major version deferred: /god-upgrade
  - /god-status to verify project state
```

## Have-Nots

Deps update FAILS if:
- Critical CVE found and not addressed (without rationale)
- Multiple major updates batched in one commit
- No regression tests run between updates
- Bulk update without per-package commits (loses bisect-ability)
- Lockfile not committed

## Linkage and reverse-sync

Per Phase 13 of the production-ready plan, this workflow participates
in the linkage system:

- On completion of any code change, `lib/reverse-sync.run(projectRoot)`
  is called via god-updater. This:
  - Scans new/modified code for linkage annotations (// Implements: P-MUST-NN, etc.)
  - Updates `.godpowers/links/{artifact-to-code,code-to-artifact}.json`
  - Detects drift via `lib/drift-detector`
  - Appends fenced footers to PRD/ARCH/ROADMAP/STACK/DESIGN
  - Surfaces drift findings to REVIEW-REQUIRED.md

- Stable IDs MUST be used in artifact deltas (P-MUST-NN, ADR-NNN,
  C-{slug}, M-{slug}, S-{slug}, D-{slug}, token paths). The scanner
  picks them up automatically via comment annotations.

- For UI work: agent-browser audit may run as part of /god-build
  post-wave or /god-launch gate (see `/god-test-runtime`).

- Findings flow into the standard REVIEW-REQUIRED.md walkthrough
  via `/god-review-changes`.


Locking: See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
