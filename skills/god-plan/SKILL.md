---
name: god-plan
description: Write or refresh .godpowers/PLAN.md with the goal, requirements that each have a "Done when" check, non-goals, design, and thin vertical slices. Use for /god-plan, "plan this", or before building a feature or product.
argument-hint: "[goal or change]"
---

# /god-plan

Size the plan to the work: a small feature gets a few lines, a new product gets every section.

1. Read STATE.md, PLAN.md and DECISIONS.md if they exist, and enough of the code to ground the plan in real files. For a large or unfamiliar codebase, give the goal to the god-planner subagent and work from its draft.
2. Write `.godpowers/PLAN.md` with these sections:
   - `## Goal`: who it is for and what success looks like.
   - `## Requirements`: `- R1: <requirement>. Done when: <observable check>.` Each needs a check that a test or a person can run.
   - `## Non-goals`: what is deliberately out.
   - `## Design`: structure, data, interfaces, and failure handling that matter, naming real files.
   - `## Slices`: ordered thin end-to-end slices, `- [ ] 1. <slice>: <how it is verified>`.
   - `## Open questions`: only ones that change the plan, each with who decides.
3. Append lasting choices (stack, data model, external services, trade-offs) to DECISIONS.md as `## YYYY-MM-DD: <decision>` with one line each for Context, Decision, and Why. Never edit old entries; add one that supersedes.
4. Put known risks in STATE.md, set `stage: build`, and name the first slice under Next.
5. Run `npx -y godpowers@7 lint` and fix any errors.
6. Ask the user only about open questions that block the first slice.
