# MRR Tracker Architecture

## System Context

[DECISION] MRR Tracker runs as a single local web app that imports Stripe subscription events, computes weekly movement buckets, and renders a founder review dashboard.

## Containers

- [DECISION] The ingestion container reads Stripe subscription events from an exported JSON file during the example flow.
- [DECISION] The movement engine container normalizes subscription deltas into new, expansion, contraction, and churn buckets.
- [DECISION] The dashboard container renders bucket totals and account drill-down tables.

## NFR-to-Architecture Map

| NFR | Architectural choice |
|---|---|
| Accuracy | [DECISION] The movement engine stores each account delta and sums buckets from those deltas so totals can be reconciled within 1 dollar. |
| Privacy | [DECISION] The example keeps imported Stripe data in the local workspace and does not send account names to a hosted service. |

## Tradeoffs

[DECISION] The example uses local JSON import instead of live Stripe OAuth because the gate fixture must stay deterministic and dependency-free.

## ADR-001 Local Stripe Export

[DECISION] ADR-001 chooses local Stripe JSON export for the example so gate tests can verify artifact quality without network credentials.
