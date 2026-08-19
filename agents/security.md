---
pillar: security
status: present
always_load: false
covers: [security review, dependency audit, command execution, release gates]
triggers: [security, harden, audit, exec, shell, dependency, vulnerability]
must_read_with: [repo, quality]
see_also: [deploy]
---

## Scope

- [DECISION] This pillar captures security boundaries for Godpowers runtime and release work.

## Context

- [DECISION] Installer, bridge, shell-execution, dependency, and publication surfaces receive adversarial review before release.

## Decisions

- [DECISION] `lib/evidence.resolveReviewEvidence` is a read-only local resolver that checks one exact record against expected claim, command, canonical substep, freshness, digest-bound gate event, and event hash chain.
- [DECISION] Stage 2 receives the resolver's sanitized projection without raw ledger records, event attributes, commands, claims, stdout tails, or stderr tails.
- [DECISION] The resolver proves internal consistency only inside a trusted workspace; it does not authenticate against an actor able to rewrite every trusted file and recompute the chain.
- [DECISION] The 6.2.0 prepublication gate passed at `2026-08-19T10:07:48.020Z` against hardening revision `sha256:5f65a4de4bb0ab7dcce5e7fb11c182a77345f23b2e6f75077c549ccef4ce9268` with zero Critical findings.
- [DECISION] The isolated exact 6.2.0 package pair reported zero vulnerabilities, and `npm audit signatures` verified registry signatures and attestations for all 5 installed packages.
- [DECISION] The 6.3.0 decision writer and reader share one bounded allowlisted validator that rejects credential fields, common provider tokens, URL userinfo, all query strings, and unsafe fragments before append or projection.
- [DECISION] The 6.3.0 route loader derives command authority from canonical filenames and rejects duplicate, spoofed, or noncanonical route YAML.
- [DECISION] Unknown route prerequisite predicates fail closed, and every named non-prefixed predicate used by a canonical route has explicit bounded behavior.
- [DECISION] Event readers reject traversal and linked run paths, and event snapshots fail closed above 8 MiB or 50,000 lines.
- [DECISION] SkillUI validates remote targets but never passes URLs or remote repository locations to the external CLI; remote forms require an already reviewed local directory.
- [DECISION] Runtime verification profiles and debug feedback records cap collections and recursive validation before generating result objects.
- [DECISION] Manual pack workflow inputs cross through environment variables, then pass a pack allowlist and strict SemVer validation before shell use.
- [DECISION] Root and MCP recovery publication requires registry integrity and shasum to match the exact packed candidates before promotion.
- [DECISION] The final 6.3.0 harden gate passed with one executed-backed release command, and the fresh prepublication gate passed against hardening revision `sha256:69bd088dc44e405b144536bd51701088bb0da7d5e2200685e9b3e13be7403f5f` with zero unresolved or accepted Critical findings.
- [DECISION] The optional operations-pack setup template keeps secrets off command arguments, rejects tracked environment destinations, verifies exact repository authority, and uses temporary replacement with cleanup and error propagation.
- [DECISION] The exact published 6.3.0 root, MCP, and operations-pack install reported zero vulnerabilities, and `npm audit signatures` verified registry signatures and attestations for all 6 installed packages.

## Rules

- [DECISION] Treat shell execution helpers and install target paths as security-sensitive code.
- [DECISION] Prefer argument-array process execution over shell-interpolated command strings.
- [DECISION] Run `npm audit --omit=dev` through `npm run test:audit` before release work completes.
- [DECISION] Treat unresolved Critical harden findings as launch blockers.
- [DECISION] `hooks/pre-tool-use.sh` blocks destructive state deletion, hard reset, force push, npm publish, and GitHub release creation until the user confirms the release gate context.
- [DECISION] Blast-radius fixture subprocesses use fixed argument arrays and fail closed after a 10-second timeout or 1 MiB output cap.
- [DECISION] Blast-radius proof reuses the existing `godpowers verify` command, verification ledger, state rollup, and gate-event chain without adding a command, evidence store, dependency, state writer, or authority.

## Workflows

(none)

## Watchouts

- [HYPOTHESIS] Installer and bridge code are the highest-risk surfaces because they write runtime files into multiple AI tool directories.
- [HYPOTHESIS] Public publish actions are security-sensitive because a bad package or release note becomes externally visible immediately.

## Touchpoints

- [DECISION] Security context synchronizes from hardening evidence through the managed section below.

## Gaps

(none)

<!-- godpowers:pillar-sync:begin -->
### Godpowers artifact sources

- Sync mode: auto-applied by yolo.
- Related artifact: `SECURITY.md`.
- Rule: keep this pillar aligned when these artifacts change durable security truth.

### Extracted durable signals

From `SECURITY.md`:
- [DECISION] The fresh prepublication gate passed at `2026-08-19T16:01:41.336Z` against hardening revision `sha256:69bd088dc44e405b144536bd51701088bb0da7d5e2200685e9b3e13be7403f5f` with zero Critical findings.
- [DECISION] The isolated exact 6.3.0 root, MCP, and operations-pack set reported zero dependency vulnerabilities.
- [DECISION] `npm audit signatures` verified registry signatures and attestations for all 6 installed packages.
<!-- godpowers:pillar-sync:end -->
