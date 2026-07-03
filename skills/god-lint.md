---
name: god-lint
description: |
  Mechanically validate Godpowers artifacts against the have-nots catalog.
  Returns structured findings (errors, warnings, info) with line numbers
  and remediation suggestions. Backed by lib/artifact-linter.js.

  Triggers on: "god lint", "/god-lint", "lint artifact", "validate prd",
  "check artifact", "validate artifact", "artifact errors"
---

# /god-lint

Mechanically validate one or more Godpowers artifacts against the
have-nots catalog. Real validation, not self-attestation. Catches:

- Em/en dashes (U-08), decorative emoji (U-09)
- Unlabeled sentences (U-02)
- Phantom references (U-10)
- Future-dated timestamps in body content (U-11)
- Generic claims that fail the substitution test (U-01)
- PRD have-nots: metric without timeline / method, empty no-gos, open
  questions without owner / due date (P-04, P-05, P-07, P-08, P-09)
- ARCH have-nots: NFR not mapped to architectural choice (A-04)
- Domain glossary have-nots: missing avoided aliases, implementation details,
  unresolved ambiguities, undefined relationship terms, behavior-heavy
  definitions (DG-01..DG-05)

More mechanical have-nots wired in over time. Interpretive checks (e.g.,
"is the architecture actually good") remain agent-mediated.

## Forms

| Form | What it does |
|---|---|
| `/god-lint` | Lint every known artifact in `.godpowers/` and project root |
| `/god-lint <path>` | Lint one specific file (e.g., `.godpowers/prd/PRD.mdx`) |
| `/god-lint --json` | Output structured JSON instead of human report |
| `/god-lint --errors-only` | Show only error-severity findings |

## Process

1. Verify `.godpowers/` exists. If not: "Run `/god-init` first."
2. Resolve target paths:
   - With argument: just that file
   - Without: scan `.godpowers/{prd,arch,roadmap,stack,domain,design}/` plus
     `DESIGN.md` and `PRODUCT.md` at project root
3. For each target:
   - Detect artifact type from path
   - Load file content
   - Call `lib/artifact-linter.lintFile(path, opts)`
   - Aggregate findings
4. Format output (human-readable by default, JSON if `--json`)
5. Exit with non-zero if any errors

## Output (human format)

```
/god-lint report

.godpowers/prd/PRD.mdx
  Type: prd
  Errors: 2, Warnings: 1, Info: 0
  [P-04] ERROR line 24: Success metric without timeline.
         -> Add a time bound to make the metric measurable.
  [P-08] ERROR line 67: Open question "Pricing model?" has no named owner.
         -> Assign a named owner.
  [U-02] WARNING line 12: Unlabeled sentence: "We will build the best..."
         -> Tag with [DECISION], [HYPOTHESIS], or [OPEN QUESTION].

.godpowers/arch/ARCH.mdx
  Type: arch
  Errors: 0, Warnings: 0, Info: 0
  Clean: no findings.

Aggregate: 2 errors, 1 warning, 0 info across 2 files.
```

## Output (JSON format)

```json
{
  "results": [
    {
      "path": ".godpowers/prd/PRD.mdx",
      "type": "prd",
      "summary": { "errors": 2, "warnings": 1, "infos": 0 },
      "findings": [
        {
          "code": "P-04",
          "severity": "error",
          "line": 24,
          "message": "Success metric without timeline.",
          "suggestion": "Add a time bound to make the metric measurable."
        }
      ]
    }
  ],
  "aggregate": { "errors": 2, "warnings": 1, "infos": 0, "files": 2 }
}
```

## Integration with workflows

Every Tier 1+ agent must call `/god-lint` (or invoke the linter directly
via `lib/artifact-linter.js`) before declaring its sub-step done. If
errors exist, the agent must address them before advancing. Warnings
are surfaced but do not block.

`/god-mode --yolo` does not bypass lint errors. Errors are mechanical
signal that something is structurally wrong; auto-resolving them would
violate the system's quality contract.

## Mechanical vs interpretive

This skill catches the mechanical have-nots only. Interpretive checks
("is the problem statement actually clear", "do these decisions make
sense") remain the responsibility of `god-auditor` (retroactive scoring)
and `god-spec-reviewer` / `god-quality-reviewer` (per-artifact two-stage
review).

The catalog of 99 have-nots is split:
- ~30 mechanical (cataloged in `lib/have-nots-validator.js`)
- ~69 interpretive (delegated to agents)

This split is published in `references/HAVE-NOTS.md` per check.

## Output

No new artifacts. Findings go to stdout (or JSON). Exit code reflects
error count.
