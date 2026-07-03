---
name: god-add-backlog
description: |
  Add an idea to the backlog. Less urgent than a todo. Reviewed periodically
  via /god-add-backlog list. Captured in .godpowers/backlog/BACKLOG.mdx.

  Triggers on: "god add backlog", "/god-add-backlog", "backlog this", "for later"
---

# /god-add-backlog

Add an idea to the backlog parking lot.

## Process

1. Append to `.godpowers/backlog/BACKLOG.mdx`:

```markdown
- [date] [idea description] (source: [conversation context])
```

2. Confirm capture without ceremony.

## Subcommands

### `/god-add-backlog <text>`
Add an item.

### `/god-add-backlog list`
Show items, sorted by date.

### `/god-add-backlog promote <n>`
Promote item N to a todo via /god-add-todo, or to a roadmap milestone.

## Difference from /god-add-todo

- Todos are things you'll work on this sprint or this quarter
- Backlog is things you might work on someday, or might not
- Backlog gets reviewed less often
- Backlog items can age out
