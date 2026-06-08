# Proof Transcript

This transcript captures the runnable proof path from the local repository.
It is short by design, because the goal is to show the shape of trust before a
user starts a full project run.

## Command

```bash
node bin/install.js quick-proof --project=. --brief
```

## Output

```text
Godpowers Quick Proof

Action brief:
  Next: /god-prd
  Why: PRD pending
  Readiness: ready
  Host guarantees: full on unknown

Evidence:
  State on disk: fixtures/quick-proof/project/.godpowers/state.json
  Fixture: fixtures/quick-proof/project
  PRD: missing
  Roadmap: missing

Outcome metrics:
  Commands to first signal: 1
  State source: fixtures/quick-proof/project/.godpowers/state.json
  Tracked steps: 3 of 13
  Missing planning artifacts: 2
  Next command: /god-prd
  Host level: full
  Host gaps: 0
```

## What The Transcript Shows

- [DECISION] The command reads a shipped fixture instead of relying on chat
  memory.
- [DECISION] The fixture has `.godpowers/state.json` but no PRD or roadmap
  artifacts.
- [DECISION] The next command is `/god-prd` because the PRD is pending.
- [DECISION] Host guarantees are reported separately from fixture state.
- [DECISION] Outcome metrics make the first proof measurable before any full
  project arc runs.

## Validation

```bash
npm run test:quick-proof
```

Expected result:

```text
Results: passed, 0 failed
```
