# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Godpowers, please report it
responsibly.

### How to Report

1. Do NOT open a public GitHub issue
2. Use GitHub's private vulnerability reporting:
   https://github.com/hannsxpeter/godpowers/security/advisories/new
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested remediation if you have one

### What to Expect

- Best-effort acknowledgment, typically within 7 days (this is a small,
  pre-launch project, so treat these as targets, not guarantees)
- Best-effort assessment, typically within 14 days
- Fix timeline based on severity
- Credit in the CHANGELOG when the fix ships (unless you prefer anonymity)

## Scope

Godpowers is a meta-prompting framework. Security concerns include:

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

When using Godpowers in a sensitive context:

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

## Supported Versions

| Version | Supported |
|---------|-----------|
| 5.8.x   | Yes |
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

## Disclosure Policy

We follow coordinated disclosure:

1. Reporter privately reports the issue
2. We acknowledge within 7 days
3. We work on a fix
4. We coordinate disclosure timing with the reporter
5. Public disclosure happens after the fix is released

We aim for fix-to-disclosure within 90 days for most issues, faster for
Critical severity.
