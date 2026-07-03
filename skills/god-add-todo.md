---
name: god-add-todo
description: |
  Capture an idea or task as a todo from current conversation context. Adds
  to .godpowers/todos/TODOS.mdx with priority and source.

  Triggers on: "god add todo", "/god-add-todo", "remind me", "todo"
---

# /god-add-todo

Capture a todo without breaking flow.

## Process

1. Read the current conversation context for the source of the todo
2. Ask user (briefly): priority? (P0/P1/P2/P3, default P2)
3. Append to `.godpowers/todos/TODOS.mdx`:

```markdown
- [ ] [P2] [date] [todo description] (source: [conversation summary])
```

4. Confirm: "Captured. Run /god-check-todos to see them."

## On Completion

```
Todo captured: [description]
Priority: P2
Total open todos: 7
```
