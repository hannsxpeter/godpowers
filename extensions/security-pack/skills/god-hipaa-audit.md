---
name: god-hipaa-audit
description: |
  HIPAA Security Rule audit. Maps Administrative + Physical + Technical
  Safeguards to code/process evidence. Requires @godpowers/security-pack.

  Triggers on: "god hipaa", "/god-hipaa-audit", "HIPAA audit", "Security Rule"
extension: "@godpowers/security-pack"
---

# /god-hipaa-audit

HIPAA Security Rule audit (164.308, 164.310, 164.312).

## Setup

1. Verify @godpowers/security-pack is installed
2. Confirm system handles ePHI (or route to /god-soc2-audit)
3. Spawn god-hipaa-auditor

## Verification

After god-hipaa-auditor returns:
1. Verify `.godpowers/compliance/hipaa/FINDINGS.mdx` exists
2. No CRITICAL gaps unaddressed
3. Update PROGRESS.md with HIPAA audit timestamp

## On Completion

```
HIPAA audit complete: .godpowers/compliance/hipaa/FINDINGS.mdx

Administrative gaps: [N]
Physical gaps: [N]
Technical gaps: [N]

Suggested next:
  - Address gaps via /god-feature workflows
  - /god-pci-audit if PCI also applies
  - Schedule next HIPAA audit in 90 days
```
