---
name: god-remove-ai-marks
description: |
  Inspect and clean authorized AI provenance signals from text, images, and
  supported documents through a user-operated watermarks-remover service.
  Preserves the source by default and reports residual risk honestly.

  Triggers on: "god remove ai marks", "/god-remove-ai-marks", "remove C2PA",
  "clean AI metadata", "strip invisible Unicode", "inspect AI provenance"
extension: "@godpowers/provenance-pack"
---

# /god-remove-ai-marks

<!-- Implements: P-MUST-23, P-SHOULD-08, C-provenance-skill, ADR-004 -->

Inspect first, then clean only content you own or are authorized to process.

## Usage

```text
/god-remove-ai-marks <path> [options]
```

Options:

- `--inspect-only`: report findings without writing a cleaned file.
- `--output=<path>`: select the cleaned output path.
- `--in-place`: explicitly replace the source after creating a recoverable backup.
- `--rewrite=paraphrase|humanize|backtranslate|structural|off`: choose an optional prose rewrite strength.
- `--remove-pixel=ctrlregen|diffusion`: request a capability-gated image regeneration backend.
- `--keep-non-ai-metadata`: ask the service to preserve unrelated image metadata.

## Setup

1. Verify `@godpowers/provenance-pack` is installed.
2. Refuse the command when the stated purpose is disclosure evasion, false-authorship preparation, assessment cheating, or policy bypass. Offer policy-compliant disclosure or privacy alternatives instead.
3. Resolve the input path. Require a regular file for cleaning, or allow a directory only with `--inspect-only` for a sequential audit of supported regular files.
4. Confirm that the content is something you own or are authorized to process when the request does not already establish authorization.
5. Collect the requested output, rewrite, pixel, and metadata options without mutating the source.
6. Spawn `god-ai-provenance-cleaner` with the resolved input, requested options, and the user's stated authorization and purpose.

## Completion contract

The specialist returns:

- The inspected input and service version.
- The output path, or `none` for inspection-only work.
- Deterministic findings and verified cleaning actions.
- Any approved best-effort rewrite or pixel transformation.
- Residual risks and unsupported channels.

Do not describe a successful run as proof that content is human-written or
free of every provenance signal.

## On Completion

```text
AI provenance workflow complete.

Input: [path]
Output: [path or none]
Verified removals: [summary]
Best-effort transformations: [summary or none]
Residual risk: [summary]
```
