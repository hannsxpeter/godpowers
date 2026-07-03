---
name: god-discuss
description: |
  Adaptive Socratic discussion before planning. Surfaces hidden assumptions,
  identifies open questions, and produces a brief that gets fed into the
  next planning command. Different from /god-explore: this is for a specific
  next phase, not an open-ended idea.

  Triggers on: "god discuss", "/god-discuss", "discuss this", "think through"
---

# /god-discuss

Pre-planning Socratic discussion with domain and plan grilling.

## When to use

- Before /god-feature: scope the feature with the user
- Before /god-refactor: clarify what's changing
- Before /god-upgrade: nail down the migration target
- Generally: any time the next command's input is fuzzy

## Process

Spawn god-explorer in fresh context with focus="next-phase-scoping".

The agent:
1. Reads the active workflow context
2. Reads `.godpowers/domain/GLOSSARY.mdx` if it exists
3. Asks targeted questions one at a time, with a recommended answer for each
4. Explores the codebase instead of asking when repo evidence can answer
5. Challenges vague, overloaded, or conflicting terms against the glossary
6. Stress-tests domain relationships with concrete scenarios and edge cases
7. Attempts to falsify the proposed plan before accepting it:
   - What breaks if the smallest happy path is wrong?
   - Which dependency, user behavior, or edge case could invalidate the plan?
   - What would make this scope too broad for one safe slice?
   - What evidence would change the recommended next command?
8. Surfaces 2-3 hidden assumptions
9. Identifies what's [DECISION] vs [HYPOTHESIS] vs [OPEN QUESTION]
10. Drafts a brief in `.godpowers/discussions/<topic>.mdx`
11. Updates `.godpowers/domain/GLOSSARY.mdx` when a term or ambiguity is resolved

The brief and glossary get passed to the next planning command. The glossary is
preparation context, not a replacement for PRD, ARCH, ROADMAP, STACK, or Pillars
files.

## Domain Glossary Rules

- Create `.godpowers/domain/GLOSSARY.mdx` lazily from `templates/DOMAIN-GLOSSARY.mdx`
  only when the discussion resolves the first project-specific term.
- Keep `.godpowers/domain/GLOSSARY.mdx` free of implementation details.
- Use the glossary for canonical terms, avoided aliases, relationships, example
  dialogue, flagged ambiguities, and source notes.
- When the user uses a term that conflicts with the glossary, call out the
  conflict immediately and ask which meaning should win.
- When the user uses a fuzzy term, propose a precise canonical term and the
  avoided aliases.
- Offer ADRs only when all three are true: the decision is hard to reverse, a
  future reader would find it surprising without context, and the choice came
  from a real tradeoff.

## Output

```
Discussion complete: .godpowers/discussions/<topic>.mdx
Domain glossary: .godpowers/domain/GLOSSARY.mdx (created or updated if terms resolved)

Key findings:
  - [assumption surfaced]
  - [open question that needs human decision]
  - [term or ambiguity resolved]

Suggested next: [the planning command this discussion was for]

Next commands:
- /god-next: Continue with the safest command that uses this discussion.
- /god-mode [scope]: Run the full command that consumes this brief when safe.
- /god-discuss [specific unresolved question]: Resolve the open question before continuing.
- /god-mode [scope] if the user wants autonomous execution: Run the full autonomous project workflow when it fits.
```
