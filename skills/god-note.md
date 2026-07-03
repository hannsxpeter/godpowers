---
name: god-note
description: |
  Zero-friction idea capture. Append a note to .godpowers/notes/NOTES.mdx
  with timestamp. Optionally promote to a todo.

  Triggers on: "god note", "/god-note", "capture this", "remember this"
---

# /god-note

Capture an idea with zero ceremony.

## Process

1. Take the user's note text
2. Append to `.godpowers/notes/NOTES.mdx` with timestamp:

```markdown
- 2026-05-09 14:23:45: [note text]
```

3. Brief confirmation, no questions asked unless user wants to promote.

## Subcommands

### `/god-note <text>`
Append the note.

### `/god-note list`
Show recent notes (last 20).

### `/god-note promote <n>`
Promote note #n to a todo (calls /god-add-todo with the note as source).

## Why this exists

Mid-flow ideas need a fast capture point. /god-add-todo is heavier (asks
priority). /god-note is just "save this thought".
