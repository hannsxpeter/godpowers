# Security Policy

## Reporting a Vulnerability

Please report vulnerabilities privately so users are not exposed before a fix
ships. **Do not open a public GitHub issue.**

Use GitHub's private vulnerability reporting:
https://github.com/hannsxpeter/godpowers/security/advisories/new

Include what you have. A partial report is far better than none:

- what the vulnerability is,
- how to reproduce it,
- what the impact could be,
- a suggested fix, if you have one.

### What to expect

- Acknowledgment within 7 days, on a best-effort basis
- An assessment within 14 days
- A fix timeline based on severity
- Credit in the CHANGELOG when the fix ships, unless you prefer otherwise

## What Godpowers does on your machine

Knowing this helps you judge the risks.

- **The installer** writes skill and agent files into your AI tool's config
  directory, copies the CLI to `<config>/godpowers/`, and merges three hook
  entries into `~/.claude/settings.json` or `~/.codex/hooks.json`. It only
  changes entries it owns, writes through symlinks, keeps file permissions,
  and refuses a settings file that is not valid JSON. Uninstall removes exactly
  those entries.
- **The hooks** run `node <config>/godpowers/bin/godpowers.js hook <event>` at
  session start, at the end of each agent turn, and before `git commit`. They
  read the project's `.godpowers/` files and run read-only `git` commands, and
  write a small session file (mode 0600, pruned after a week) in your temp
  directory. They make no network calls and fail open.
- **`godpowers verify "<command>"`** runs the command you or your agent give it,
  through your shell, in the project directory. It has the same power as typing
  the command yourself. Treat verify commands like any other command an agent
  proposes.
- **The evidence ledger** stores the last 3,000 characters of each check's
  output. Common secret shapes (GitHub, OpenAI, Stripe, Slack, AWS, and npm
  tokens, JWTs, private keys, credentials in URLs, bearer headers, and
  `password=` style values) are masked before writing, but masking is not
  exhaustive. Do not print secrets in test output.
- **Tamper evidence** is not tamper proofing. The digest chain detects hand
  edits to the ledger. Anyone who can rewrite the whole file can recompute it.

## Scope

In scope:

- `bin/` and `lib/` (file system writes, hook handling, command execution,
  settings merges)
- the hook registrations and the plugin manifest
- skill or agent instructions that could lead an agent to leak credentials or
  take destructive actions

Out of scope:

- model behavior (report it to the model provider)
- vulnerabilities in dependencies (report them upstream)
- commands a user or agent chooses to pass to `godpowers verify`

## Supported versions

| Version | Supported |
| --- | --- |
| 7.0.x | Yes |
| 6.x and earlier | No. Upgrade to 7. |

## Disclosure policy

Coordinated disclosure: we acknowledge, fix, agree on timing with the reporter,
and publish after the fix is released. We aim for fix to disclosure within 90
days, faster for critical issues.
