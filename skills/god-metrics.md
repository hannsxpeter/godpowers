---
name: god-metrics
description: |
  Aggregate per-tier statistics across runs (agent count, duration,
  pauses, errors), the loop accepted-change rate, and user-outcome metrics. Useful for
  spotting slow tiers, frequent pause points, error-prone steps, or a
  loop that is thrashing instead of shipping.

  Triggers on: "god metrics", "/god-metrics", "stats", "how long
  does tier-1 take", "performance", "accepted-change rate", "is the
  loop healthy"
---

# /god-metrics

Per-tier aggregate stats and the accepted-change rate across one or all runs.

## Usage

### `/god-metrics`
All runs in the project.

### `/god-metrics <run-id>`
Single run.

### `/god-metrics --since=<duration>`
Only runs that started within the duration.

### `/god-metrics --json`
Machine-readable.

## Output

```
GODPOWERS METRICS  (3 runs)

Per tier:
  tier-0  count=3   avg=0.4s   total=1.2s   pauses=0  errors=0
  tier-1  count=12  avg=44.2s  total=8.8m   pauses=2  errors=0
  tier-2  count=9   avg=2.1m   total=18.9m  pauses=1  errors=1
  tier-3  count=12  avg=18.5s  total=3.7m   pauses=0  errors=0

Totals: 3 runs, 36 agent spawns, 3 pauses, 1 error, 32.6m elapsed

Accepted-change rate: 82% (healthy, >= 50%)  proposed=17 accepted=14 rejected=3
```

## Accepted-change rate

The loop-health signal: of the changes proposed, what fraction survived review
instead of being rejected or rolled back. Above target (default 50%) means the
loop's first attempts hold up; below target means it is thrashing. It respects
the same `--since=<duration>` window as the per-tier stats.

## User-outcome metrics

The output also derives time to accepted change, recorded cost, manual
intervention, resume success, deployment completion, and rollback proof from
the event ledger. A metric reports `no event evidence` when the current event
history cannot prove it.

## Implementation

Built-in. Calls `lib/event-reader.js metrics(...)` for the per-tier stats and
`lib/change-metrics.js compute(...)` / `render(...)` for the accepted-change rate
(derived from the `change.*`, `gate.pass`/`gate.fail`, and `state.rollback`
events in the ledger), plus `lib/outcome-metrics.js` for user outcomes.

## Related

- `/god-loop` - the autonomous loop this rate measures
- `/god-logs` - readable event timeline
- `/god-trace <tier>` - one tier in detail
