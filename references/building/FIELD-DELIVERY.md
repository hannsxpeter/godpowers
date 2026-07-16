# Field Delivery (forward-deployed engineering)

Forward-deployed engineering is building and delivering an app inside a
customer's environment: full-stack delivery with high agency, plus the field
skills of scoping, business acumen, and proving in production. Most of this maps
to existing Godpowers work; this reference names that mapping and the one mode
that is distinct, so a customer engagement runs through the normal tiers rather
than off the map.

## Field skills already owned

| FDE field skill | Owned by |
|---|---|
| Requirements gathering | god-explorer (discovery), god-pm (PRD) |
| Technical scoping and sequencing | god-roadmapper, god-planner (slices, waves) |
| Tradeoffs: scope, speed, quality | god-pm appetite and MoSCoW; the documentation profile scales artifacts to the project |
| Business acumen: ROI, business case, stakeholders | the initiation brief (charter, business case, stakeholder register with RACI) that god-pm drafts when the documentation profile requires it |
| Enterprise workflow and stakeholder management | the initiation brief plus the reconciler's stakeholder-aware artifact updates |
| Product feedback loop | god-retrospective, god-postmortem, the closeout report |
| Technical writing and communication | god-docs-writer |
| Proving it will not break or go rogue in production | god-harden (adversarial security), god-observe (SLOs, runbooks), god-browser-tester (runtime verification), and godaudits verify-runtime |
| Full-stack, DevOps, cloud, IaC, AI engineering | the product-form router plus the build, deploy, and LLM domains |

## The distinct mode: customer-site delivery

What field delivery adds beyond a normal project run is the customer's
environment as a hard constraint. When the target is a customer or partner
environment rather than your own:

- Treat it as a bluefield or brownfield run with the customer's constraints as
  org context: their available libraries, cloud, identity, data-residency, and
  approval gates are inputs, not choices (god-org-context, god-archaeology).
- Environment parity is against the customer's environment, and the deploy tier
  promotes the same artifact into it with the customer's secrets path and
  approval mechanism, never a bespoke one-off.
- The proof obligation is explicit: a runtime verification and a harden pass run
  against the delivered system in the customer environment, and the closeout
  hands over runbooks, the traceability matrix, and the operations model so the
  customer can run it after handoff.

Run a field engagement through the ordinary tiers with these constraints wired
in; do not invent a parallel workflow.
