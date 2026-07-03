---
name: god-etl
description: |
  Build an ETL pipeline with idempotency, observability, and recovery.
  Requires @godpowers/data-pack.

  Triggers on: "god etl", "/god-etl", "data pipeline", "ETL pipeline"
extension: "@godpowers/data-pack"
---

# /god-etl

Spawn god-etl-engineer for an ETL pipeline build.

## Verification
- `.godpowers/data/etl/<pipeline-name>/PIPELINE.mdx` exists
- Idempotency verified
- Lag SLO defined
- Dead-letter wired

## On Completion
```
ETL pipeline ready: .godpowers/data/etl/<name>/

Suggested next:
  - /god-build to implement the pipeline
  - /god-observe to wire SLO + alerts
```
