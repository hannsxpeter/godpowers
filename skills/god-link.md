---
name: god-link
description: |
  Manually add or remove a code-artifact link in the linkage map. Most
  links are discovered automatically by /god-scan and reverse-sync via
  comment annotations; this skill handles cases where annotations are
  awkward or impossible.

  Triggers on: "god link", "/god-link", "manually link", "associate file with"
---

# /god-link

Add or remove a manual link between an artifact ID and a code file.

## Forms

| Form | Action |
|---|---|
| `/god-link <artifact-id> <path>` | Add link |
| `/god-link --remove <artifact-id> <path>` | Remove link |
| `/god-link --query-artifact <artifact-id>` | List files linked to this ID |
| `/god-link --query-file <path>` | List artifact IDs linked to this file |
| `/god-link --orphans` | List artifact IDs with no linked files |

## Stable ID format

| Artifact | ID format | Example |
|---|---|---|
| PRD requirement | `P-{MUST,SHOULD,COULD}-NN` | `P-MUST-01` |
| ADR | `ADR-NNN` | `ADR-007` |
| ARCH container | `C-{slug}` | `C-auth-service` |
| ROADMAP milestone | `M-{slug}` | `M-launch-v1` |
| STACK decision | `S-{slug}` | `S-postgres-15` |
| DESIGN token | YAML path | `colors.primary` |
| DESIGN component | `D-{slug}` | `D-button-primary` |

## Process

1. Verify `.godpowers/` exists.
2. Validate the artifact ID matches one of the stable ID patterns. If
   not: refuse with a hint about the format.
3. Resolve the file path relative to project root.
4. Call `lib/linkage.addLink(projectRoot, artifactId, filePath)` or
   `removeLink(...)`.
5. Append to `.godpowers/links/LINKAGE-LOG.md`.
6. Report.

## When to use this vs comment annotations

Prefer comment annotations:

```ts
// Implements: P-MUST-01
function login(...) { }
```

This is the primary path. The scanner picks it up automatically.

Use `/god-link` when:

- The file is generated (e.g., compiled output) and cannot host a comment
- The link is conceptual (e.g., "this template implements P-MUST-03")
- You're adding a link discovered through another tool that doesn't
  modify source files

## Output

Updates:
- `.godpowers/links/artifact-to-code.json`
- `.godpowers/links/code-to-artifact.json`
- `.godpowers/links/LINKAGE-LOG.md` (append)

No source files are modified by this skill.


## Locking

See `<runtimeRoot>/references/shared/LOCKING.md` for the shared state-lock contract.
