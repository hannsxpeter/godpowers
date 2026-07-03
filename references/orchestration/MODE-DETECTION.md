# Mode Detection

> How god-orchestrator decides which mode (A/B/C/E) to use, and when Mode D
> suite coordination also applies.

## Mode A: Greenfield (default)

**Signals**:
- No `.godpowers/` directory exists
- Working directory is empty OR contains only `.git/` and `README.md`
- User describes a "new project" or "from scratch"

**Behavior**: run all tiers from PRD onwards.

**Greenfield-with-plan**: an empty repo plus `.godplans/PLAN.mdx` is still
Mode A, but not a bare one. The arc imports the plan as Tier 1 seeds
(`lib/planning-systems.importPlanningContext`; seeds marked `imported` with
GP/R ids preserved) and routes to execution, so god-pm and god-architect
harden the imported seeds instead of interviewing from zero. PLAN.mdx stays
read-only; Godpowers edits it only when executing GP tasks under the plan's
own embedded executor rules.

## Mode B: Gap-fill

**Signals**:
- Some `.godpowers/<tier>/<artifact>` files already exist
- OR existing codebase signals: package.json, Dockerfile, .github/workflows
- User describes an existing project they want to add Godpowers to
- legacy planning, BMAD, or Superpowers planning context is detected and should be imported
  into Godpowers preparation artifacts
- `.godplans/PLAN.mdx` or `.godaudits/AUDIT.mdx` -> sibling superskill
  artifacts; import before planning (`/god-migrate`), never reconstruct over
  an existing master plan

**Behavior**:
1. For each canonical artifact path: check existence on disk
2. For each existing artifact: spawn god-auditor to verify against have-nots
3. If passes: mark tier "imported" in PROGRESS.md, skip
4. If fails: mark tier "in-flight", will re-run
5. If missing: mark tier "pending"

Codebase signals (for inferring partial completion):
- `package.json` exists -> Repo tier likely done
- `.github/workflows/` or `.gitlab-ci.yml` exists -> CI present
- `tests/` or `*.test.*` files exist -> Build tier in progress
- `Dockerfile` + deploy config -> Deploy tier may be done
- `.planning/`, `.legacy-planning/`, `_bmad-output/`, `.bmad/`, or Superpowers specs ->
  source-system import and managed sync-back may be needed
- `.godplans/PLAN.mdx` or `.godaudits/AUDIT.mdx` -> sibling plan/audit import
  needed; sync-back goes through `.godplans/GODPOWERS-SYNC.mdx` or
  `.godaudits/GODPOWERS-SYNC.mdx` only

## Mode C: Audit

**Signals**:
- Triggered explicitly with `--audit` flag
- User says "audit the project" or "score everything"

**Behavior**: run god-auditor on all existing artifacts. Build nothing.

## Mode E: Bluefield

**Signals**:
- User is starting new code inside an existing organization or platform.
- Parent or sibling directories contain org standards, shared packages,
  deployment conventions, or platform contracts.
- User names shared constraints such as approved infrastructure, design system,
  compliance baseline, or internal libraries.

**Behavior**:
1. Load org context with `/god-org-context`.
2. Run `/god-preflight` against the surrounding environment.
3. Run a greenfield simulation audit against the org constraints.
4. Use `god-greenfieldifier` to plan approved artifact updates.
5. Continue the normal arc with the org constraints respected.

## Mode D: Multi-repo suite membership

**Signals**:
- Working directory contains workspace config (pnpm-workspace.yaml, nx.json, lerna.json, turbo.json)
- OR multiple sub-repos with their own `.git/`
- User describes a system spanning multiple repos
- `.godpowers/suite/` exists or sibling repos share byte-identical managed files

**Behavior**: Mode D is not a replacement for A/B/C/E. It is suite membership
managed by `god-coordinator` as a Tier-0 peer. Each repo still runs one of
A/B/C/E underneath, while `/god-suite-*` commands handle cross-repo status,
sync, patch, and release planning.

## Worked example

User runs `/god-mode` in a directory with:

```
existing-saas/
  .git/
  package.json
  src/
    auth.ts
    api.ts
  tests/
    auth.test.ts
```

god-orchestrator detects:
- No `.godpowers/` -> normally Mode A
- BUT package.json + src/ + tests/ -> existing codebase -> Mode B

Reports to user:
> "Detected an existing codebase (package.json, src/, tests/ present).
> Setting Mode B (gap-fill). I'll work backward to fill missing artifacts.
> First: I need to understand what this codebase does. Let me start with
> /god-explore or you can describe it briefly."

## Existing Godpowers projects after upgrades

When `.godpowers/state.json` already exists, mode detection should also run
feature awareness. The safe local helper records the installed Godpowers
feature set, refreshes managed AI-tool context fences, and reports missing
planning-system import or sync-back opportunities. It does not overwrite
product artifacts.
