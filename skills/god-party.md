---
name: god-party
description: |
  Multi-persona collaboration session. Spawn multiple specialist agents in
  parallel to discuss a topic from different angles, then synthesize their
  views. Real multi-agent (separate fresh contexts), not simulated.

  Triggers on: "god party", "/god-party", "party mode", "multi-perspective",
  "what would the team say"
---

# /god-party

Get multiple specialist perspectives on a single question.

## When to use

- Cross-cutting design decision (affects multiple disciplines)
- Trade-off analysis (security vs UX, performance vs cost)
- Stakeholder simulation before a real meeting

Not the same as widening a candidate pool. `/god-party` evaluates a candidate
that already exists, from several specialist angles. To generate the candidates
in the first place, the Tier 1 specialists use
`references/planning/DIVERGENCE.md`. Party personas are critics by contract;
divergence branches are generators by contract.

## Process

1. Ask the user for the topic/question
2. Ask which personas should weigh in (or auto-select based on topic):
   - PM (god-pm) - user impact, prioritization
   - Architect (god-architect) - structural implications
   - Executor (god-executor mindset) - implementation cost
   - Quality reviewer (god-quality-reviewer) - code health risk
   - Harden auditor (god-harden-auditor) - security implications
   - Launch strategist (god-launch-strategist) - go-to-market implications

3. Spawn each selected persona IN PARALLEL via the host platform's native agent spawning mechanism:
   - Each gets fresh context
   - Each receives ONLY the question and the relevant artifact subset
   - Each is instructed: respond as your specialist, do not soften or hedge

4. Collect all responses

5. Synthesize:
   - Areas of agreement (consensus)
   - Areas of disagreement (with the trade-off)
   - Recommendation (with rationale)
   - Open questions for human decision

## Output

Write to `.godpowers/party/[topic-slug]-[timestamp].md`:

```markdown
# Party Discussion: [Topic]

## Question
[The question that was asked]

## Personas Consulted
[Who weighed in]

## Perspectives

### god-pm
[Verbatim response]

### god-architect
[Verbatim response]

### [other personas]

## Synthesis

### Consensus
- [Where they all agreed]

### Disagreements
- [Specific tradeoff: PM said X, Architect said Y because Z]

### Recommendation
[The synthesized view, with rationale]

### Open Questions for Human
- [Decision the personas could not resolve]
```

## On Completion

Present the synthesis to the user. Do NOT auto-implement; this is advisory.
The user decides what to do with the perspectives.
