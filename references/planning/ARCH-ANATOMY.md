# Architecture Anatomy

> What a strong architecture document looks like. Every decision has a
> flip point. Every NFR maps to a choice.

## 1. Options Considered

Record the system shapes evaluated before choosing the context and containers.
Seed the obvious shape as a labeled baseline and allow it to win. Give every
rejected shape a specific reason tied to a PRD NFR or ADR. Keep trap-flagged
shapes in the table as `[HYPOTHESIS]`, with their scores demoted for the hidden
cost. Name a real tradeoff on the selected shape so the table does not flatter
its own choice. Novelty is not a scoring axis.

## 2. System Context (C4 Level 1)

A diagram showing the system + external actors and systems.

**What good looks like**: every arrow labeled with data flowing and protocol.

```
[User browser] --HTTPS, OAuth flow--> [MRR Tracker]
[Stripe webhooks] --HTTPS, signed payloads--> [MRR Tracker]
[MRR Tracker] --SMTP, daily digest--> [Email user]
[MRR Tracker] --HTTPS--> [Stripe API]
```

## 3. Container Diagram (C4 Level 2)

Major runtime containers with single responsibilities.

```
[Browser SPA] <--HTTPS--> [API Server (Node)]
                                   |
                                   v
                            [Postgres (managed)]
                                   |
                                   v
                            [Worker (BullMQ)]
                                   |
                                   v
                            [Stripe Sync Job]
```

| Container | Single Responsibility |
|-----------|----------------------|
| Browser SPA | Render dashboard, OAuth flow init |
| API Server | Auth, query data, serve dashboard endpoints |
| Postgres | Store user accounts, encrypted Stripe tokens, MRR snapshots |
| Worker | Async Stripe sync, daily digests |
| Stripe Sync Job | Pull Stripe events, compute MRR breakdown |

## 4. Architecture Decision Records (ADRs)

For each load-bearing decision:

### ADR-001: Monolith vs Microservices

**Context**: We need to ship V1 in 8 weeks with a solo founder. Scale
expectations are 1000 concurrent users by month 3.

**Decision**: Monolithic Node.js API with a single worker process.

**Rationale**: At 1000 users, complexity of microservices outweighs the
operational benefit. Solo founder can't afford the deploy/observability
overhead of multiple services.

**Flip point**: If we hit 10,000 concurrent users OR we add a second
team that needs independent deploy cadence, split the worker into a
separate service first.

**Consequences**:
- Easier: deploy, debug, develop locally
- Harder: scaling specific bottlenecks (e.g., the Stripe sync) independently

### ADR-002: Postgres vs MongoDB

**Context**: Data is structured (users, accounts, MRR snapshots). Queries
are mostly OLAP (time-series aggregations).

**Decision**: Postgres.

**Rationale**: Strong typing, mature OLAP support via materialized views,
team familiar with SQL.

**Flip point**: If we add document-shaped data (e.g., user-defined custom
metrics with arbitrary schemas), revisit.

**Consequences**:
- Easier: migrations, complex aggregations, integrity
- Harder: schema-less data (we'd have to use JSONB columns)

## 5. NFR-to-Architecture Map

Every NFR from the PRD MUST appear here.

| PRD NFR | Architectural Choice | ADR Reference |
|---------|---------------------|---------------|
| p99 dashboard load < 2s | Materialized views for MRR breakdown; cache layer in API; SPA only fetches deltas | ADR-002, ADR-005 |
| 99.9% uptime | Managed Postgres (auto-failover); single API server with automated restart; health check endpoint | ADR-003 |
| 10,000 users by month 6 | Monolith handles up to ~5000; split worker first when needed | ADR-001 |
| OAuth tokens encrypted at rest | Postgres pgcrypto extension; encryption key in secrets manager | ADR-006 |
| No Stripe API keys stored | We use OAuth (refresh tokens only); never the API key directly | ADR-007 |

If an NFR has no row here: that's a have-not failure (A-03).

## 6. Trust Boundaries

```
[User Browser] (untrusted)
    |
    | === BOUNDARY: OAuth bearer token, validated per request ===
    |
[Our API Server] (trusted)
    |
    | === BOUNDARY: Stripe API key from secrets manager, never logged ===
    |
[Stripe API] (trusted external)
```

For each boundary:
- Auth method: how identity is established
- Data classification: what flows across (sensitive vs public)
- Failure mode: what happens if the boundary is breached

## 7. Data Model

```
User (1) -- (N) StripeAccount
StripeAccount (1) -- (N) MRRSnapshot
MRRSnapshot {date, mrr, new_mrr, expansion_mrr, churn_mrr, contraction_mrr}
```

| Entity | Owner Service | Consistency Model |
|--------|---------------|-------------------|
| User | API Server | Strong (single Postgres) |
| StripeAccount | API Server | Strong |
| MRRSnapshot | Worker writes, API reads | Eventually consistent (sync lag <1h) |

## 8. Required Format

Every claim must be labeled. Examples:

> [DECISION] We use Postgres because the data is structured and queries
> are OLAP-shaped.
>
> [HYPOTHESIS] BullMQ will handle our worker volume; if we exceed 1000
> jobs/sec we'll need to evaluate alternatives. Validation plan:
> load test before launch.
>
> [OPEN QUESTION] Where do we store OAuth state during the redirect?
> Owner: architect. Due: before /god-build.
