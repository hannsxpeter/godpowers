---
name: god-pci-audit
description: |
  PCI-DSS 4.0 audit. Maps the 12 requirements to code/process evidence.
  Requires @godpowers/security-pack.

  Triggers on: "god pci", "/god-pci-audit", "PCI-DSS audit", "PCI audit"
extension: "@godpowers/security-pack"
---

# /god-pci-audit

PCI-DSS 4.0 audit.

## Setup

1. Verify @godpowers/security-pack is installed
2. Confirm system handles cardholder data (or determine SAQ scope)
3. Spawn god-pci-auditor

## Verification

After god-pci-auditor returns:
1. Verify `.godpowers/compliance/pci/FINDINGS.mdx` exists
2. SAQ scope correctly identified
3. Update PROGRESS.md

## On Completion

```
PCI-DSS audit complete: .godpowers/compliance/pci/FINDINGS.mdx

SAQ scope: [SAQ-A / SAQ-D / etc.]
Requirements with gaps: [N of in-scope]

Suggested next:
  - Address gaps via /god-feature workflows
  - Schedule quarterly scans (PCI requires quarterly)
  - Annual pen test (PCI requires annual)
```
