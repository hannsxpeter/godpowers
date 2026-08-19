---
name: god-trace
description: |
  Deep dive on one tier's events across one run, or project durable
  decisions from internally hash-linked runs. Shows chronological evidence
  for debugging, performance review, and decision audits.

  Triggers on: "god trace", "/god-trace", "what happened in tier-1",
  "debug tier", "deep dive", "show decisions", "decision trail"
---

# /god-trace

Deep dive on one tier's events.

<!-- Implements: P-MUST-48 -->

## Usage

### `/god-trace <tier>`
Filter the most-recent run by tier (e.g. `tier-1`, `tier-2`).

### `/god-trace <tier> <run-id>`
Specific run.

### `/god-trace <tier> --json`
Machine-readable.

### `/god-trace --decisions`
Project `decision.recorded` events from internally hash-linked runs. The projection
contains the run ID, timestamp, material decision, reason, cited evidence,
result, and bounded metadata. Use exact `tier`, `agent`, `result`, and `since`
filters when supplied. Result and run counts remain bounded.

The stable return shape is `{ items, integrityFailures }`. Each integrity
failure contains only a run ID and reason. Any scanned run with a
broken internal chain is omitted from `items` and reported as `broken-chain`.

The observed hash links detect broken internal chains. They do not detect tail truncation,
full recomputation, or provide workspace authentication. Treat the projection
as local integrity evidence, not an authenticated external ledger.

## Output

```
TRACE tier-1  run=2026-05-10T21-42-00-abc12345

2026-05-10T21:42:00.000Z workflow.run         attrs={workflow:full-arc}
2026-05-10T21:42:01.234Z agent.start          agent=god-pm
2026-05-10T21:42:08.001Z tool.call            tool=Read path=examples/...
2026-05-10T21:42:12.456Z tool.call            tool=Write path=prd/PRD.md
2026-05-10T21:42:42.789Z agent.end            agent=god-pm status=success
2026-05-10T21:42:43.012Z gate.pass            gate=standards artifact=prd/PRD.md
2026-05-10T21:42:44.111Z agent.start          agent=god-architect
...
```

## Implementation

Built-in. Tier traces call `lib/event-reader.js trace(projectRoot, runId, tier)`.
Decision traces call `lib/event-reader.js decisions(projectRoot, runIds, opts)`.
Callers record a durable decision with `lib/events.js recordDecision(handle,
record)`, which rejects missing evidence and raw secrets before appending to
the existing event hash chain.

## Related

- `/god-logs` - whole-run timeline
- `/god-metrics` - aggregate stats
