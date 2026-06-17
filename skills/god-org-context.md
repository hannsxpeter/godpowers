---
name: god-org-context
description: |
  Set up or read organization-level context (bluefield support): shared
  standards, conventions, infrastructure, libraries. Constrains downstream
  agents to respect org-wide decisions when building new code in an
  established context.

  Triggers on: "god org context", "/god-org-context", "org standards",
  "bluefield setup", "shared conventions"
---

# /god-org-context

Bluefield: new code, established context.

## When to use

- Starting a new service in a microservices architecture
- Adding a new module to an existing monorepo
- Building within an organization that has shared standards
- Any greenfield-feeling project that lives within constraints

## Subcommands

### `/god-org-context init`
Create `.godpowers/org-context.yaml` from user input. Asks:
- Language and tooling standards
- Cloud provider and deploy platform
- Shared libraries available
- Shared services to integrate with
- Team conventions (branching, releases)
- Constraints (e.g., "must emit OpenTelemetry")

### `/god-org-context show`
Display current org context.

### `/god-org-context update <key>=<value>`
Update a specific value.

### `/god-org-context validate`
Check the project's decisions against org context. Flag conflicts.

## Process

Spawn god-org-context-loader in fresh context. Agent creates or reads
`.godpowers/org-context.yaml`.

## Effect on other commands

Once org-context.yaml exists, downstream agents respect it:
- god-stack-selector prefers org-standard tools (won't choose Python if org-standard is TypeScript without explicit override)
- /god-arch respects org infrastructure (won't propose Kubernetes if org uses Vercel)
- /god-deploy uses org's deploy platform
- /god-observe uses org's observability stack
- /god-harden checks against org security standards

## On Completion

```
Org context [created/updated]: .godpowers/org-context.yaml

Constraints that will apply to this project:
  - Language: TypeScript
  - Cloud: AWS
  - Auth: shared auth-service
  - Observability: Datadog
  ...

Downstream agents will respect these throughout the project run.

Suggested next: /god-init (or /god-mode if you're ready to build)
```

## Have-Nots

Org context FAILS if:
- Created without user-confirmed standards (would be guessing)
- Constraints not enforced by downstream agents
- Conflicts surface at code time instead of at decision time
- Multiple sources of truth (org-context.yaml + scattered notes)
