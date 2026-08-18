# Godpowers documentation

Welcome. This folder holds two different kinds of writing: docs for people
**using** Godpowers, and docs for people **maintaining** it. The split below
tells you which is which, so you never end up reading release internals when you
wanted a tutorial.

**In a hurry?** [quick-proof.md](./quick-proof.md) shows you what Godpowers does
in about ten minutes, without installing anything.

**Ready to build?** [getting-started.md](./getting-started.md) takes you from
nothing installed to a finished project.

---

## Using Godpowers

New here? Read these in roughly this order. The first three are enough to be
productive; the rest are there when you need them.

**The essentials**

- [getting-started.md](./getting-started.md) - install and run your first commands.
- [quick-proof.md](./quick-proof.md) - prove value in ten minutes, no install required.
- [concepts.md](./concepts.md) - the vocabulary and the mental model: arcs, tiers, specialists, and quality gates.

**When you want more**

- [reference.md](./reference.md) - every slash command and agent, in full.
- [recipes.md](./recipes.md) - "I want to do X" mapped to the command that does it.
- [command-flows.md](./command-flows.md) - how commands chain together into flows.
- [host-capabilities.md](./host-capabilities.md) - what each AI tool can and cannot do.
- [mcp.md](./mcp.md) - the optional read-only `@godpowers/mcp` companion.
- [harness-quality.md](./harness-quality.md) - compact verification, bounded context, program design, handoffs, maintainability, and evolution evidence.

**Particular situations**

- [brownfield-bluefield.md](./brownfield-bluefield.md) - adopting Godpowers in a codebase or organization that already exists.
- [planning-system-migration.md](./planning-system-migration.md) - starting from work another tool left on disk: a plan, an audit report, or a foreign planning system.
- [automation-providers.md](./automation-providers.md) - opt-in host automation.
- [design-md.md](./design-md.md) - the DESIGN.md and PRODUCT.md design contract.
- [agent-specs.md](./agent-specs.md) - each specialist agent and what it owns.
- [extension-authoring.md](./extension-authoring.md) - build and publish your own extension pack.
- [ROADMAP.md](./ROADMAP.md) - what has shipped and what is planned.

**Evidence.** Worked proof and adoption stories live in
[case-studies/](./case-studies/): the ten-minute proof, CLI-verifiable canaries
against real third-party repositories, and host-run studies. That last set
includes a run that was blocked at the hardening gate, kept deliberately as
evidence rather than quietly removed.

---

## Maintaining Godpowers

Background, design records, and process docs for contributors and maintainers.
You do not need any of this to use the product.

- [FUSION-ARCHITECTURE.md](./FUSION-ARCHITECTURE.md) - the Mythify fusion architecture.
- [RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md) - the release process.
- [validation.md](./validation.md) - how the surface and docs are validated.
- [repo-doc-sync.md](./repo-doc-sync.md) and [repo-surface-sync.md](./repo-surface-sync.md) - the guards against docs drifting from reality.
- [surface-contraction.md](./surface-contraction.md) - installer profiles and the visible command surface.
- [change-propagation.md](./change-propagation.md) and [feature-awareness.md](./feature-awareness.md) - artifact reconciliation internals.
- [linkage.md](./linkage.md) - the artifact linkage map.
- [greenfield-coverage.md](./greenfield-coverage.md) and [arc-integrations.md](./arc-integrations.md) - arc coverage notes.
- [auto-invoke-visibility.md](./auto-invoke-visibility.md) - how proactive command suggestions behave.
- [dogfooding.md](./dogfooding.md) - the messy-repo dogfood scenarios.
- [accountability-hardening-plan.md](./accountability-hardening-plan.md) - the accountability hardening plan.
- [adoption-canary.md](./adoption-canary.md) and [proof-transcript.md](./proof-transcript.md) - adoption evidence internals.
- [phase-4-state-read-inventory.md](./phase-4-state-read-inventory.md) - a state-read inventory snapshot.
- [suite-release-dry-run.md](./suite-release-dry-run.md) - multi-repo suite release dry run.
- [RFC/](./RFC/) - design RFCs covering the state model, workflow YAML, and research brief.
