---
name: god-soc2-audit
description: |
  SOC 2 Common Criteria audit. Maps controls to code/process evidence,
  produces auditor-ready findings. Requires @godpowers/security-pack.

  Triggers on: "god soc2", "/god-soc2-audit", "SOC 2 audit", "CC1", "CC2"
extension: "@godpowers/security-pack"
---

# /god-soc2-audit

SOC 2 Common Criteria audit. Extension command.

## Setup

1. Verify @godpowers/security-pack is installed
2. Verify deploy + observe tiers complete (`.godpowers/deploy/STATE.mdx` and
   `.godpowers/observe/STATE.mdx` exist)
3. Spawn god-soc2-auditor with full system access

## Verification

After god-soc2-auditor returns:
1. Verify `.godpowers/compliance/soc2/FINDINGS.mdx` exists
2. Verify no material weaknesses unaddressed
3. Update PROGRESS.md with compliance audit timestamp

## On Completion

```
SOC 2 audit complete: .godpowers/compliance/soc2/FINDINGS.mdx

Material weaknesses: [N]
Significant deficiencies: [N]
Observations: [N]

Suggested next:
  - If material weaknesses exist: address them via /god-feature workflows
  - Schedule next SOC 2 audit in 90 days
  - /god-pci-audit or /god-hipaa-audit if other compliance applies
```
