# Godpowers documentation

This folder mixes docs written for people using Godpowers with internal docs
written for people maintaining it. Use the map below so you can tell which is
which.

## Start here (using Godpowers)

New to Godpowers? Read these in roughly this order.

- [getting-started.md](./getting-started.md) - install and run your first commands.
- [quick-proof.md](./quick-proof.md) - prove value in ten minutes, no install required.
- [concepts.md](./concepts.md) - the vocabulary: arc, tier, quarterback, quality gates.
- [reference.md](./reference.md) - the full slash-command and agent reference.
- [recipes.md](./recipes.md) - intent-to-command recipes for common goals.
- [command-flows.md](./command-flows.md) - how the commands chain into flows.
- [host-capabilities.md](./host-capabilities.md) - what each AI tool can and cannot do.
- [mcp.md](./mcp.md) - the optional read-only `@godpowers/mcp` companion.
- [brownfield-bluefield.md](./brownfield-bluefield.md) - adopting Godpowers in an existing repo or org.
- [planning-system-migration.md](./planning-system-migration.md) - importing a godplans plan, a godaudits report, or a foreign planning system.
- [automation-providers.md](./automation-providers.md) - opt-in host automation.
- [design-md.md](./design-md.md) - the DESIGN.md / PRODUCT.md design contract.
- [agent-specs.md](./agent-specs.md) - the specialist agents and what each owns.
- [extension-authoring.md](./extension-authoring.md) - build and publish an extension pack.
- [ROADMAP.md](./ROADMAP.md) - what is shipped and what is planned.

Worked proof and adoption stories live in
[case-studies/](./case-studies/): the ten-minute proof, CLI-verifiable canaries,
and host-run studies (including a blocked harden run kept as evidence).

## Internal and maintainer docs

Background, design records, and process docs for contributors and maintainers.
Not required to use the product.

- [FUSION-ARCHITECTURE.md](./FUSION-ARCHITECTURE.md) - the Mythify fusion architecture.
- [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md) - the release process.
- [validation.md](./validation.md) - how the surface and docs are validated.
- [repo-doc-sync.md](./repo-doc-sync.md) and [repo-surface-sync.md](./repo-surface-sync.md) - doc/surface drift guards.
- [surface-contraction.md](./surface-contraction.md) - installer profiles and the visible command surface.
- [change-propagation.md](./change-propagation.md) and [feature-awareness.md](./feature-awareness.md) - artifact reconciliation internals.
- [linkage.md](./linkage.md) - the artifact linkage map.
- [greenfield-coverage.md](./greenfield-coverage.md) and [arc-integrations.md](./arc-integrations.md) - arc coverage notes.
- [auto-invoke-visibility.md](./auto-invoke-visibility.md) - proactive command suggestion behavior.
- [dogfooding.md](./dogfooding.md) - the messy-repo dogfood scenarios.
- [accountability-hardening-plan.md](./accountability-hardening-plan.md) - the accountability hardening plan.
- [adoption-canary.md](./adoption-canary.md) and [proof-transcript.md](./proof-transcript.md) - adoption evidence internals.
- [phase-4-state-read-inventory.md](./phase-4-state-read-inventory.md) - a state-read inventory snapshot.
- [suite-release-dry-run.md](./suite-release-dry-run.md) - multi-repo suite release dry run.
- [RFC/](./RFC/) - design RFCs (state model, workflow YAML, research brief).
