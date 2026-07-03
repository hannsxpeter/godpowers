---
name: god-thread
description: |
  Manage persistent context threads. Create, switch, list, and resume named
  conversation threads for cross-session work on specific topics.

  Triggers on: "god thread", "/god-thread", "context thread", "named thread"
---

# /god-thread

Manage persistent context threads.

## Subcommands

### `/god-thread new <name>`
Create a new thread. Records initial context to `.godpowers/threads/<name>.mdx`.

### `/god-thread list`
List all threads with last-updated timestamps.

### `/god-thread switch <name>`
Switch active thread. Loads previous context summary.

### `/god-thread resume <name>`
Resume a paused thread, loading its full context.

### `/god-thread archive <name>`
Archive a completed thread to `.godpowers/threads/archive/`.

## When to use

- Cross-session work on a specific topic ("auth migration", "billing refactor")
- Multi-week threads where you want to preserve reasoning
- Multiple parallel conversations on different parts of the project

## Output

Threads are markdown files with append-only context blocks per session.
