# Migration: [From X to Y]

> Expand-contract pattern. Incremental slices. Metric-gated progression.
> No big-bang.

Date started: [ISO 8601]
Owner: [user]
Status: planning | expanding | migrating | contracting | complete

## Motivation

[Why this migration. Specific business reason, not "newer is better".]

## Surface

- Files affected: [count, with link to list]
- Modules: [list]
- Services: [list]
- External APIs touched: [list]

## Test Coverage Today

- Affected surface coverage: [%]
- Coverage gaps: [list]
- Plan to fill gaps before migration: [yes/no, by when]

## Breaking Changes (from upstream changelog)

| Change | Risk | Likelihood | Mitigation |
|--------|------|-----------|------------|
| [breaking change] | High/Med/Low | High/Med/Low | [specific plan] |

## Plan

### Phase 1: Expand
- [ ] Introduce new version alongside old
- [ ] Add abstraction layer (branch-by-abstraction or feature flag)
- [ ] Verify both code paths work
- [ ] Tests cover both paths

### Phase 2: Migrate (slices)

| Slice | Scope | Status | Deployed | Metrics window | Result |
|-------|-------|--------|----------|----------------|--------|
| 1 | [scope] | pending | -- | -- | -- |
| 2 | [scope] | pending | -- | -- | -- |

Each slice:
- Atomic commit
- Feature-flagged rollout: 1% -> 10% -> 50% -> 100%
- Metric monitoring window (default 24h) before next slice
- Rollback per slice if regression

### Phase 3: Contract
- [ ] Verify 100% of usage on new path
- [ ] Monitoring window passed (N days, default 7)
- [ ] Remove old code path
- [ ] Final commit: `chore(migration): remove old <thing>`

## Rollback Strategy

| Scenario | Action |
|----------|--------|
| Slice N regresses | Revert that slice's deploy, investigate |
| Multiple slices regress | Pause migration, full audit |
| Critical regression | Roll back all slices, restart with revised plan |

## Metrics to Watch

| Metric | Baseline | Threshold for rollback |
|--------|----------|----------------------|
| Error rate | [%] | [+0.5%] |
| p99 latency | [ms] | [+10%] |
| [Other] | | |

---

## Have-Nots Checklist

- [ ] Plan is incremental (no big-bang)
- [ ] Expand-contract pattern in use
- [ ] Tests added before migration started
- [ ] Each slice has independent rollback
- [ ] Metrics gate slice progression
- [ ] Old code removed only after 100% migrated
- [ ] Risk assessment complete
