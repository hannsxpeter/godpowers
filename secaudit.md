# Godpowers Security Audit

- [DECISION] This is the post-remediation security audit of branch `codex/product-trust-hardening` for the 5.3.0 release source on 2026-07-13.

## Snapshot

- [DECISION] Godpowers is a local Node.js CLI and AI-agent workflow package, not an internet-facing application and not a store of regulated user data.
- [DECISION] Security-relevant entry points are CLI arguments, project files, extension manifests, installation paths, evidence shell commands, GitHub Actions, npm publication, and prompt-driven agent behavior.
- [DECISION] Authentication, sessions, HTTP APIs, databases, uploads, containers, and cloud infrastructure are absent and not applicable.
- [DECISION] The audit reviewed installer, command, path, extension, workflow, secret, history, dependency, package, and publication trust boundaries.

## Attack Surface And Trust Boundaries

- [DECISION] The invoking local user supplies CLI arguments and project paths to code running with that user's filesystem authority.
- [DECISION] Installer code crosses from package-controlled sources into host configuration directories.
- [DECISION] Verification commands intentionally cross from a supplied command string into a local shell, with bounded execution and evidence capture.
- [DECISION] Project files and extension manifests are less trusted than package code, so path containment and manifest validation protect writes.
- [DECISION] A version tag crosses into GitHub-hosted npm credentials only after package identity, merged-main ancestry, dependency, test, and package gates pass.
- [DECISION] Sensitive assets are the workspace, host runtime configuration, npm publish credential, repository integrity, release provenance, and command output stored in local ledgers.

## Overall Score

### 98/100, Grade A

- [DECISION] No unresolved security finding blocks publication.
- [DECISION] The remaining two points reflect host-enforced prompt authority and external repository or npm policy that source code cannot independently guarantee.

| Dimension | Score | Grade | Normalized weight | Verdict |
|---|---:|---|---:|---|
| Authorization and Access Control | 97 | A | 23.4% | [DECISION] Local authority follows the invoking user and project-relative paths are contained. |
| Injection and Unsafe Input Handling | 95 | A | 20.8% | [DECISION] Intentional shell execution is explicit, bounded, and local, while filesystem and extension inputs are validated. |
| Cryptography and Data Protection | 98 | A | 14.3% | [DECISION] SHA-256 integrity records and registry provenance use platform controls without custom cryptography. |
| Security Misconfiguration and Hardening | 98 | A | 11.7% | [DECISION] Clean runners install the locked dependency graph before any publication gate. |
| Dependencies and Software Supply Chain | 100 | A | 11.7% | [DECISION] External Actions are pinned, tags match both package versions and merged main, and npm publishes with provenance. |
| Secrets Management | 98 | A | 10.4% | [DECISION] No committed credential was found and workflow credentials remain GitHub-managed secrets. |
| Logging, Monitoring and Data Privacy | 95 | A | 5.2% | [DECISION] Hash-chained events and explicit ledger sensitivity guidance fit a local CLI with no regulated data. |
| AI and LLM Application Security | 94 | A | 2.6% | [DECISION] High-impact actions remain bounded by host and user authority, while prompt-level controls remain advisory by design. |
| Weighted overall | 98 | A | 100% | [DECISION] The release supply chain is approved. |

## What To Fix First

- [DECISION] No confirmed unresolved security finding remains in the authorized 5.3.0 scope.
- [OPEN QUESTION] Repository branch protection, required reviews, npm trusted publishing policy, and organization recovery controls should continue to be reviewed outside source code.

## Strengths To Preserve

- [DECISION] `lib/router.js` resolves project-relative paths and rejects traversal outside the project root.
- [DECISION] `lib/installer-core.js` installs package-controlled sources into runtime-controlled destinations.
- [DECISION] `lib/evidence.js` applies timeouts and bounded capture to intentional verification shell commands.
- [DECISION] The root package has zero production dependencies and the dependency audit reports zero vulnerabilities.
- [DECISION] GitHub Actions use explicit least-privilege permissions and immutable external Action commits.
- [DECISION] The publication workflow verifies the tag, both package versions, and merged-main ancestry before the release gate or npm credentials.
- [DECISION] Both npm packages publish with provenance after package allowlist checks.

## Resolved Findings

| Finding | Prior severity | Resolution | Verification |
|---|---|---|---|
| SUPPLY-001 | High | [DECISION] The tag version must equal both package versions and the tagged commit must be an ancestor of `origin/main`. | [DECISION] Identity checks execute before release and publication steps. |
| SUPPLY-002 | Medium | [DECISION] Checkout and setup-node use reviewed 40-character commit SHAs with version comments. | [DECISION] Every external `uses` entry in the three workflows is immutable. |
| MISCFG-001 | Medium | [DECISION] Extension-pack publication runs `npm ci --no-audit --no-fund` before the release gate. | [DECISION] Clean-runner dependency installation is explicit and lockfile-backed. |

## Systemic Patterns

- [DECISION] Publication now binds source identity across Git, package manifests, CI, and npm.
- [DECISION] Credential-bearing jobs fail before credentials are used when tag identity, ancestry, dependencies, tests, audits, or package contents disagree.
- [DECISION] Runtime filesystem trust remains local, explicit, and contained rather than inventing an application principal model.

## Scope And Limitations

- [DECISION] The audit inspected current source and representative history for secrets but did not run exploits.
- [DECISION] External npm, GitHub, connector, and host-runtime policies were not treated as proven unless represented in source or authenticated release tooling.
- [HYPOTHESIS] Strong branch protection and npm organization controls can add defense in depth without changing the source score.

## How To Use This Report

1. [DECISION] Preserve immutable workflow dependencies and release identity checks.
2. [DECISION] Keep credential use after every fail-closed validation step.
3. [DECISION] Re-audit any change that widens shell, filesystem, extension, or publication authority.
4. [DECISION] Treat external organization policy as defense in depth, not a substitute for source controls.
