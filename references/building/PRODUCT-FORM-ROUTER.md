# Product Form Router

Select one primary product form before applying product archetype, industry,
or regulatory guidance. Product form defines how users operate the software,
what a vertical slice means, and which completion evidence can close Build.

## Routing procedure

1. Inventory the primary user interaction and distribution channel.
2. Select one primary form. Record a secondary form only when it has its own
   user, public contract, distribution path, and completion evidence.
3. Run `lib/product-routing.selectProductForm` when the available intent is
   explicit enough for deterministic selection. Treat an ambiguous or
   undetermined result as an open planning question.
4. Compose archetype, industry, and regulatory overlays through
   `references/building/DOMAIN-COMPOSITION-REGISTRY.md`.
5. Use common Build discipline plus the form-specific gate below.

Do not infer a web application from words such as product, platform, or tool.
Do not infer infrastructure from YAML files alone. A backend is required only
when the selected product form and architecture actually include one.

## Common vertical-slice discipline

| Product form | User-operable vertical slice |
|---|---|
| Web application | User action -> permission boundary -> service or API -> real data -> UI states -> tests |
| API or service | Contract -> validation and authorization -> domain operation -> dependency -> telemetry -> tests |
| CLI or SDK | Public command or API -> parsing and validation -> domain operation -> output contract -> consumer fixture -> tests |
| Mobile or desktop | Native interaction -> local state -> sync boundary -> offline and recovery states -> platform tests |
| Data or ML | Versioned input -> validated transform or training -> reproducible output -> evaluation -> lineage checks |
| Infrastructure or IaC | Versioned configuration -> static validation -> plan -> policy check -> isolated apply or simulation -> rollback proof |

## Form-specific completion gates

### Web application

Use when the primary job is delivered through a browser UI, authenticated
portal, SaaS surface, or customer or admin console.

Build closes only when one roadmap-grounded job crosses the real data boundary,
relevant loading, empty, error, and success states exist, permissions are
enforced at the server boundary, accessibility checks pass, and unit,
integration, and browser tests are green.

### API or service

Use for a headless HTTP or RPC contract, event consumer, worker, or internal
service.

Build closes only when a real consumer fixture completes one contract path
against real dependencies or faithful local substitutes, schema and error
responses are tested, retries are bounded and idempotent where required,
health and telemetry are observable, and contract plus integration tests pass.

### CLI or SDK

Use for a terminal workflow, globally installed binary, package consumed by
developers, language SDK, or embeddable library.

Build closes only when a clean consumer fixture installs the release artifact,
completes the primary job without repository internals, receives documented
errors for invalid input, executes or compiles the examples, passes supported
runtime or OS checks, and reproduces the release artifact.

### Mobile or desktop

Use for app-store distribution, native capabilities, offline clients, signed
installers, Electron, or Tauri.

Build closes only when a build runs on every declared platform class, the
primary job survives lifecycle and connectivity transitions, secrets use
platform storage, accessibility and device checks pass, crash telemetry is
wired, and packaging is reproducible.

### Data or ML

Use for dataset pipelines, analytics engineering, training, inference,
feature pipelines, model evaluation, or notebook-centered delivery.

Build closes only when a clean environment reproduces one pipeline or model
artifact from versioned inputs, explicit quality and evaluation thresholds
pass, lineage identifies code, data, and configuration versions, fixtures
contain no unauthorized sensitive data, and serving behavior is tested when
serving is in scope.

### Infrastructure or IaC

Use for Terraform or OpenTofu modules, Kubernetes packages, Ansible
automation, or cloud platform foundations.

Build closes only when formatting and static validation pass, an isolated plan
is reviewed, policy checks pass, a sandbox apply or faithful simulation proves
the main path, destructive behavior is guarded, state and secrets are
protected, and rollback or destroy is exercised.

## Secondary forms

A web console with a public SDK or a data pipeline with a separate inference
API can have a secondary form. Keep one primary form for sequencing. Give each
secondary form a distinct user, contract, distribution path, and completion
gate instead of merging its evidence into the primary form.
