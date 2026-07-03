# System Architecture

> Every decision below has a flip point. Every claim is substitution-tested.
> Every NFR from PRD has a corresponding architectural choice.

## System Context (C4 Level 1)

```
                    [External User]
                          |
                          v
                   ┌──────────────┐
[External API] -> │  THE SYSTEM  │ -> [External Service]
                   └──────────────┘
                          |
                          v
                   [External DB / Service]
```

[Each arrow labeled with: data flowing, protocol, frequency.]

## Container Diagram (C4 Level 2)

```
[Container 1] --[API/protocol]--> [Container 2]
     |
     v
[Container 3 (DB)]
```

| Container | Single Responsibility | Technology |
|-----------|----------------------|------------|
| [Name] | [One sentence. Single thing it owns.] | [Language/framework] |

## Architecture Decision Records

Only create an ADR when all three are true: the decision is hard to reverse,
surprising without context, and the result of a real tradeoff.

### ADR-001: [Decision Title]
- **Context**: [What forced this decision]
- **Decision**: [What was chosen]
- **Rationale**: [Why this over alternatives]
- **Flip point**: [Conditions under which this decision reverses]
- **Consequences**: [What this makes easier; what it makes harder]

### ADR-002: [Decision Title]
[Same structure]

## NFR-to-Architecture Map

| PRD NFR | Architectural Choice | ADR Reference |
|---------|---------------------|---------------|
| p99 < 100ms | [Choice that delivers this] | ADR-00X |
| 99.9% uptime | [Choice that delivers this] | ADR-00X |
| [Other NFR] | [Choice] | ADR-00X |

Every NFR from PRD MUST appear here. If an NFR has no corresponding choice,
flag it.

## Trust Boundaries

```
[External]
    |
=== TRUST BOUNDARY: [Auth method, data classification] ===
    |
[Internal]
```

For each external integration:
- **Boundary**: [Where it sits]
- **Auth model**: [How identity is established]
- **Data classification**: [What flows across; sensitive or public]
- **Failure mode**: [What happens if the boundary is breached]

## Data Model

### Entities

| Entity | Owner Service | Consistency Model |
|--------|--------------|-------------------|
| User | auth-service | Strong |
| Order | orders-service | Strong (own DB), Eventual (read replicas) |

### Relationships
- [User] 1:N [Order]
- [Description of relationships]

---

## Have-Nots Checklist

Before declaring done, verify:
- [ ] Every container has a clear single responsibility
- [ ] No two containers share responsibility without justification
- [ ] Every NFR from PRD has an architectural mapping
- [ ] Every ADR has a flip point
- [ ] "Scalable" never appears without numbers
- [ ] Every external integration has a trust boundary
- [ ] Every data entity has an ownership assignment
- [ ] No sentence is unlabeled
