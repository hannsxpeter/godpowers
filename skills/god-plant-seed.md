---
name: god-plant-seed
description: |
  Capture a forward-looking idea with trigger conditions. Surfaces
  automatically when the trigger fires (e.g., "when MRR > $5k, revisit
  pricing"). Stored in .godpowers/seeds/.

  Triggers on: "god plant seed", "/god-plant-seed", "for the future",
  "when X happens"
---

# /god-plant-seed

Capture an idea that should surface later when conditions are right.

## When to use

- "When we hit 1000 users, we should revisit our database design"
- "When the next major Node version drops, evaluate the new fetch API"
- "When team size > 5, introduce sprint ceremonies"

## Process

1. Take the idea + trigger condition from the user
2. Write to `.godpowers/seeds/<seed-id>.mdx`:

```markdown
# Seed: [short name]

Date planted: [ISO 8601]
Trigger: [specific condition]
Idea: [what to do when triggered]
Source: [conversation context]
Status: dormant
```

3. The seed lies dormant until /god-status or another command checks if
   the trigger condition is met.

## Trigger types

- **Metric-based**: "When MRR > $5k"
- **Time-based**: "In 3 months, revisit"
- **Event-based**: "After first major incident"
- **Tool-based**: "When Node 24 is released"

## Subcommands

### `/god-plant-seed <description>`
Plant a seed.

### `/god-plant-seed list`
Show all dormant seeds.

### `/god-plant-seed check`
Check all seeds against current state. Surface any with met triggers.

### `/god-plant-seed harvest <id>`
Mark a seed as acted upon (route to /god-feature or /god-add-todo).
