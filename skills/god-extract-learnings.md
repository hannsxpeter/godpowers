---
name: god-extract-learnings
description: |
  Extract decisions, lessons, patterns, and surprises from completed phase
  artifacts. Captures institutional knowledge for future projects.

  Triggers on: "god extract learnings", "/god-extract-learnings", "lessons learned",
  "what did we learn"
---

# /god-extract-learnings

Capture institutional knowledge from a completed phase or milestone.

## When to use

- After completing a milestone (Now -> Done)
- After a successful /god-mode project run
- Before a /god-postmortem (different focus: that's for incidents)

## Process

1. Read all artifacts from the completed phase:
   - PRD, ARCH, ROADMAP, STACK, build PLAN, deploy STATE, etc.
2. Extract:
   - **Decisions made**: with their flip points
   - **Lessons learned**: what would you do differently next time
   - **Patterns established**: techniques that worked, worth reusing
   - **Surprises**: things you didn't expect (good or bad)
3. Write to `.godpowers/learnings/<milestone>/LEARNINGS.mdx`
4. Optionally append summary to a global `~/.godpowers-knowledge.md` for
   cross-project learning (opt-in)

## Output

```markdown
# Learnings: [milestone]

## Decisions
- [DECISION] Used Postgres over MongoDB. Flip point: document data.
  Outcome: held up; no flip needed.

## Lessons Learned
- The Stripe webhook signature verification took 2 days longer than estimated;
  budget more for crypto-related work.

## Patterns Worth Reusing
- The "1 user_id, multiple stripe_account_id" data model. Reusable for any
  multi-account integration.

## Surprises
- Users wanted CSV export much earlier than we expected. Bumped from COULD
  to MUST in V1.1.
```

## Have-Nots

- Generic lessons ("communicate better")
- No flip-point references (decisions without context)
- Missing surprises (everything went perfectly: implausible)

## Applying recalled lessons

Recorded lessons and memory (the `lib/evidence.js` lessons and memory stores)
are applied silently on later runs, per the Voice and Craft contract
(`references/shared/VOICE.md`). Do the right thing the lesson implies; do not
narrate the recall with "based on your memory" or "according to prior runs".
Surface a recalled fact only when the person asks what you remember, or when it
changes a decision, and then state the decision, not the retrieval. A recalled
lesson reflects what was true when recorded, so verify any file, flag, or command
it names still exists before acting on it.
