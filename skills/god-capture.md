---
name: god-capture
description: |
  Capture verb dispatcher. Routes thoughts, todos, backlog items, and seeds
  to the existing capture leaf commands.

  Triggers on: "god capture", "/god-capture", "capture this", "note this",
  "add todo", "add backlog", "plant seed"
---

# /god-capture

Route capture intent to the smallest existing capture command.

## Runtime module resolution

Resolve the Godpowers runtime root before inspecting routes:

1. If `<projectRoot>/routing/god-note.yaml` exists, use the repository checkout runtime at `<projectRoot>`.
2. Otherwise use the installed bundle at `<tool-config-dir>/godpowers-runtime`.
3. Read routing metadata from `<runtimeRoot>/routing/`.

## Dispatch

| Signal | Hand off to |
|---|---|
| `todo`, `task`, `remind`, `priority` | `/god-add-todo` |
| `backlog`, `later`, `someday`, `future` | `/god-add-backlog` |
| `when`, `if`, `after`, `once`, `trigger` | `/god-plant-seed` |
| `note`, `thought`, `remember` | `/god-note` |
| `GP-<n>` or `GA-<n>` reference | `/god-add-todo` (or `/god-add-backlog` for deferred GP tasks) with the source id and the sibling artifact path (`.godplans/PLAN.mdx` / `.godaudits/AUDIT.mdx`) recorded on the entry, so the captured item stays traceable for later sync-back through the managed GODPOWERS-SYNC.mdx companion |

Default to `/god-note` when no priority, backlog, or trigger signal exists.

## Process

1. Select the target leaf command from the table.
2. Read the selected leaf route YAML so prerequisites and next-step metadata stay source-controlled.
3. Show the selected command and the matched capture signal.
4. Hand off to the selected leaf command after user confirmation.

## Guardrails

- Do not write notes, todos, backlog items, or seeds directly from this dispatcher.
- Do not assign priority unless the user provided priority evidence.
- Keep each capture leaf callable as a direct shortcut.
- Never edit `.godplans/PLAN.mdx` or `.godaudits/AUDIT.mdx` from capture
  flows; they are read-only here and sync-back happens only through the
  managed GODPOWERS-SYNC.mdx companions.
