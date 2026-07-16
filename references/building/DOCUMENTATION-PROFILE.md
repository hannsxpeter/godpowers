# Documentation Profile

Which documents a project needs is a function of the project, not a fixed
checklist. Derive the required documentation set from the signals intake already
produced, do not draft a document because a template exists, and do not skip one
a comparable project of this shape would need. A prototype does not get a
business-continuity plan; a regulated multi-tenant platform does not ship without
a threat model and a traceability record.

## Inputs (already detected, do not re-derive)

- Product form: web-application, api-service, cli-sdk, mobile-desktop, data-ml, or
  infrastructure-iac (from `lib/product-routing.selectProductForm`).
- Scale: prototype, internal-tool, funded-product, or enterprise (git and intent
  signals).
- Risk profile: balanced, security-critical, growth, or library.
- Regulatory overlays: GDPR, CCPA/CPRA, PIPEDA, HIPAA, PCI DSS, and accessibility
  obligations, owner-verified.

## How to build the manifest

1. Start from the scale row. It sets the baseline document set.
2. Apply the form modifier: add the form's required documents, mark documents the
   form makes irrelevant as not-applicable with a reason.
3. Apply the risk and regulatory modifier: elevate security, privacy, and
   continuity documents from recommended to required.
4. Tag every document required, recommended, optional, or not-applicable, each
   with the signal that set it. Draft required documents; offer recommended ones;
   record not-applicable with a reason so a later audit does not read the gap as a
   miss. Multiple documents may live in one file for small projects.

## Scale baseline

| Document | prototype | internal-tool | funded-product | enterprise |
|---|---|---|---|---|
| README | required | required | required | required |
| Product brief / vision | required | required | required | required |
| Key ADRs | recommended | required | required | required |
| PRD | optional | required | required | required |
| Architecture document | recommended | required | required | required |
| User stories + acceptance | optional | recommended | required | required |
| Test strategy | optional | recommended | required | required |
| Deploy + rollback plan | n/a | required | required | required |
| Operations runbook | n/a | recommended | required | required |
| Release notes / changelog | recommended | required | required | required |
| Security / threat model | conditional | recommended | required | required |
| Risk, assumption, dependency log | optional | recommended | required | required |
| Requirements traceability matrix | n/a | optional | required | required |
| Incident response plan | n/a | optional | required | required |
| User / admin guide | optional | recommended | required | required |
| Initiation brief (charter + business case + stakeholders/RACI) | n/a | optional | recommended | required |
| Closeout report + lessons learned | n/a | optional | recommended | required |

## Form modifier

- web-application: UX/UI design spec and user flows required; adds SEO and
  accessibility conformance where a public surface exists.
- api-service: API specification required; UX/UI documents not-applicable.
- cli-sdk: CLI or SDK reference required; UX/UI not-applicable.
- library: public API reference required; deploy, ops runbook, and launch reduced
  to recommended or not-applicable; the `library` risk profile applies.
- data-ml: data model and data dictionary elevated; evaluation and dataset
  documentation required.
- infrastructure-iac: operations runbook, deploy/rollback, and disaster-recovery
  references elevated; UX not-applicable.

## Risk and regulatory modifier

- security-critical or a verified regulatory overlay: promote security design and
  threat model, privacy and data-handling records, audit-logging documentation,
  and incident response to required; add the regulatory-overlay records (GDPR
  ROPA and DPIA, HIPAA BAA, PCI scope) named in the compliance standards.
- enterprise scale with regulated data: the initiation brief and closeout become
  required, and a service-level and business-continuity reference is expected
  even when this suite does not draft the full contract.

## Drafting ownership

Existing agents draft the manifest's documents; the orchestrator runs a document
drafter only when the manifest marks its output required or the user requests it.

| Document | Drafter |
|---|---|
| PRD, initiation brief | god-pm |
| Architecture, ADRs | god-architect |
| Roadmap, release plan | god-roadmapper |
| User stories + acceptance | god-storyteller |
| UX/UI design spec | god-designer |
| Security / threat model | god-harden-auditor |
| Deploy + rollback | god-deploy-engineer |
| Operations runbook, SLOs, incident | god-observability-engineer, god-incident-investigator |
| Release notes / launch | god-launch-strategist |
| README, contributing, dev standards | god-repo-scaffolder |
| Requirements traceability matrix, user/admin guide, general docs | god-docs-writer |
| Closeout report + lessons learned | god-retrospective |

## Governance documents (high-value set)

- Initiation brief: one document combining the project charter (problem,
  objectives, sponsor, high-level scope, timeline, approval), a business case
  (benefits, costs, alternatives, justification), and a stakeholder register with
  a RACI for major activities. Drafted by god-pm before the PRD when the manifest
  requires it. Small projects fold it into the product brief.
- Requirements traceability matrix: links each requirement to its design
  component, build task or slice, and verifying test, reusing the plan-aware
  R-id-to-check-to-task tracing. Drafted by god-docs-writer and kept current by
  god-updater. It is the single artifact that proves nothing was planned but not
  built, or built but not verified.
- Closeout report + lessons learned: delivered-versus-committed scope, unresolved
  items, handover status, outcomes and approvals, plus what worked, what failed,
  root causes, and actions for next time. Drafted by god-retrospective at
  milestone or project close.

Governance documents are never certification or compliance theater; they capture
decisions, ownership, and outcomes so the project has continuity from the original
business need through production support.
