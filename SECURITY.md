# Security Policy

## Reporting a Vulnerability

Found something? Thank you. Please report it privately so users are not exposed
during the window before a fix ships.

### How to Report

**Do not open a public GitHub issue.**

Use GitHub's private vulnerability reporting instead:
https://github.com/hannsxpeter/godpowers/security/advisories/new

Include what you have. A partial report is far better than no report:

- What the vulnerability is
- How to reproduce it
- What the impact could be
- A suggested fix, if one occurs to you

### What to Expect

- Best-effort acknowledgment, typically within 7 days (this is a small,
  pre-launch project, so treat these as targets, not guarantees)
- Best-effort assessment, typically within 14 days
- Fix timeline based on severity
- Credit in the CHANGELOG when the fix ships (unless you prefer anonymity)

## Scope

Godpowers is a meta-prompting framework: it ships instructions and a small
runtime, not a server or a hosted service. That shapes what counts as a
vulnerability here.

### In scope
- Vulnerabilities in `bin/install.js` (file system access, path traversal)
- Vulnerabilities in `hooks/*.sh` (command injection, privilege escalation)
- Vulnerabilities in `scripts/*.{sh,js}` (CI / test infrastructure)
- Skill or agent prompts that could be exploited to leak credentials

### Out of scope
- AI model behavior (report to the model provider)
- Issues in dependencies (report upstream)
- Social engineering of AI agents (use `--conservative` mode)

## Hardening Recommendations

Read this if you are running Godpowers anywhere sensitive. Several items below
describe things that look like security boundaries and are not.

1. **Review `--yolo` decisions**: Before merging or deploying, read
   `.godpowers/YOLO-DECISIONS.mdx` to verify auto-picked defaults match intent
2. **Never accept Critical findings under `--yolo`**: This is enforced by the
   framework but worth re-checking
3. **Keep `.godpowers/` out of public repos** if it contains sensitive PRD
   content (add to `.gitignore` per-project)
4. **Hooks are advisory, not a sandbox**: `hooks/pre-tool-use.sh` and
   `hooks/session-start.sh` run with your shell privileges. The pre-tool-use
   hook only warns on common destructive command spellings (it is a typo guard
   and is easily bypassed by uncommon spellings, quoting, aliases, or a child
   process); do not rely on it as a security boundary. Review both before
   installing.
5. **Verify the npm package signature**: `npm audit signatures` (verifies
   registry provenance and the published package signature)
6. **Treat `.godpowers/ledger/` as executable, output-bearing state**: the
   evidence ledger records the exact commands you run via `verify`/`outcome`
   plus tails of their stdout/stderr. If a command or its output can contain a
   secret, add `.godpowers/ledger/` to `.gitignore` so it is not committed. The
   `outcome check` command re-runs a verifier stored in `goal.json`, so only run
   it in repositories you trust.
7. **Codex agents install with `sandbox_mode = "workspace-write"`**: the Codex
   runtime grants every installed Godpowers agent write access to the workspace
   (they need it to write artifacts). Combined with untrusted instructions in
   project files, an agent could write anywhere in the workspace; narrow the
   Codex sandbox per agent if that is a concern.
8. **Treat review evidence as trusted-workspace consistency, not
   authentication**: `lib/evidence.resolveReviewEvidence` checks one exact
   executed record against the expected claim, command, canonical substep,
   freshness window, SHA-256 digest-bound gate event, and event hash chain. Its
   projection omits raw claims, commands, and output tails before Stage 2 sees
   them. An actor able to rewrite the ledger, events, and chain can still
   recompute internally consistent evidence; signed commits, CI provenance,
   repository access controls, and publication provenance cover that stronger
   threat model.
9. **Fail closed around adversarial review subprocesses**: blast-radius fixture
   probes use argument-array process execution and treat a 10-second timeout or
   1 MiB output overflow as a failed detection result. The safety-case feature
   reuses the existing `godpowers verify` execution authority and ledger; it
   adds no command, store, dependency, or state writer.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 6.3.x   | Release candidate |
| 6.2.x   | Yes |
| 6.1.x   | Security fixes only |
| 6.0.x   | Security fixes only |
| 5.17.x   | Security fixes only |
| 5.16.x   | Security fixes only |
| 5.15.x   | Security fixes only |
| 5.14.x   | Security fixes only |
| 5.13.x   | Security fixes only |
| 5.12.x   | Security fixes only |
| 5.11.x   | Security fixes only |
| 5.10.x   | Security fixes only |
| 5.9.x   | Security fixes only |
| 5.8.x   | Security fixes only |
| 5.7.x   | Security fixes only |
| 5.6.x   | Security fixes only |
| 5.5.x   | Security fixes only |
| 5.4.x   | Security fixes only |
| 5.3.x   | Security fixes only |
| 5.2.x   | Security fixes only |
| 5.1.x   | Security fixes only |
| 5.0.x   | Security fixes only |
| 3.14.x  | Security fixes only |
| 3.13.x  | Security fixes only |
| 3.12.x  | Security fixes only |
| 3.11.x  | Security fixes only |
| 3.10.x  | Security fixes only |
| 3.9.x   | Security fixes only |
| 3.8.x   | Security fixes only |
| 3.7.x   | Security fixes only |
| 3.6.x   | Security fixes only |
| 3.5.x   | Security fixes only |
| 3.4.x   | Security fixes only |
| 3.3.x   | Security fixes only |
| 3.2.x   | Security fixes only |
| 3.1.x   | Security fixes only |
| 3.0.x   | Security fixes only |
| 2.7.x   | Security fixes only |
| 2.6.x   | Security fixes only |
| 2.5.x   | Security fixes only |
| 2.4.x   | Security fixes only |
| 2.3.x   | Security fixes only |
| 2.2.x   | Security fixes only |
| 2.1.x   | Security fixes only |
| < 2.1   | No |

Godpowers repo documentation sync checks this table as part of release
readiness, but support policy changes still require maintainer review.

## 6.2.0 Release Verification

- [DECISION] The fresh prepublication gate passed at
  `2026-08-19T10:07:48.020Z` against hardening revision
  `sha256:5f65a4de4bb0ab7dcce5e7fb11c182a77345f23b2e6f75077c549ccef4ce9268`
  with zero Critical findings.
- [DECISION] The isolated exact 6.2.0 package pair reported zero dependency
  vulnerabilities.
- [DECISION] `npm audit signatures` verified registry signatures and
  attestations for all 5 installed packages.

## Disclosure Policy

We follow coordinated disclosure:

1. Reporter privately reports the issue
2. We acknowledge within 7 days
3. We work on a fix
4. We coordinate disclosure timing with the reporter
5. Public disclosure happens after the fix is released

We aim for fix-to-disclosure within 90 days for most issues, faster for
Critical severity.
