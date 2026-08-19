# Building References

Per-tier reference content for Tier 2 (Building: Repo, Build).

## Files

- `BUILD-ANTIPATTERNS.md`: failure modes for implementation planning and execution.
- `BUILD-VERTICAL-SLICES.md`: guidance for slicing work into user-visible increments.
- `BUILD-WAVES.md`: dependency-aware parallelism patterns for multi-agent work.
- `BLAST-RADIUS.md`: Stage 2 safety-case protocol for one load-bearing fact, the five-level evidence ladder, 10 boundary classes, impact-based verdicts, ledger-backed proof, and conditional independent review for wide changes.
- `PRODUCT-FORM-ROUTER.md`: form-first vertical slices and completion evidence.
- `DOMAIN-COMPOSITION-REGISTRY.md`: ordered archetype, industry, regulatory, and stack-profile composition.
- `DOCUMENTATION-PROFILE.md`: derive the required documentation set from product form, scale, risk profile, and regulatory overlays; gate which document drafters run; defend every not-applicable row with an evidence state, a reason, and a revisit-when tripwire.
- `STYLE-GENOME.md`: the contract for `CODEDNA.md`, the house style profile `god-executor` and `god-quality-reviewer` read as an input, including the evidence order behind it and the 15 catalogued AI tells.
- `API-DESIGN.md`: API style, versioning, machine-readable contract, error envelope, and interaction safety (idempotency, real-time) for API and service surfaces.
- `FIELD-DELIVERY.md`: forward-deployed engineering, how field skills map to existing tiers and the distinct customer-site delivery mode.

## Use

Use these references when reviewing implementation plans, build execution, and
agent workstream shape. `BLAST-RADIUS.md` is consumed by the existing
`/god-review`, `/god-build`, executor, quality-reviewer, and orchestrator
contracts; it adds no command or reviewer type. Pair these references with
[HAVE-NOTS.md](../HAVE-NOTS.md) for the canonical failure-mode catalog.
