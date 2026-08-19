---
name: god-setup-wizard
description: |
  Generate a human-run Bash wizard for setup, credentials, dashboards,
  migrations, or cutovers that an agent cannot complete. Triggers on:
  "god setup wizard", "/god-setup-wizard", "make a setup wizard",
  "walk me through manual setup"
extension: "@godpowers/operations-pack"
---

# /god-setup-wizard

<!-- Implements: P-COULD-06 -->

Generate a human-only script for a bounded manual procedure. The agent authors
and statically checks the script. The agent must never run it end to end.

## Scope first

1. Inspect the repository before asking setup questions. Read environment
   examples, container files, framework configuration, documentation, and CI
   references to GitHub secrets and variables.
2. List the ordered stages, every captured value, whether each value is secret,
   and its destination: environment file, GitHub secret, GitHub variable, or no
   persisted destination.
3. Confirm the stage list with the user before writing the generated script.
4. For every dashboard stage, use an exact URL and verified current docs. Never
   invent a click path, product setting, command, or credential location.

## Generate

Copy `references/wizard-template.sh` from this installed extension into the
user-approved target. Keep its helpers intact, then add small ordered stages.

- Use hidden secret input for credentials.
- Use idempotent environment upserts for local values. Refuse tracked
  destinations, control-bearing values, and source-active unquoted output.
- Use `gh secret set` only for a GitHub secret referenced by CI and pass the
  value through standard input.
- Use `gh variable set` only for a public GitHub variable referenced by CI.
- Require an explicit verified `owner/repository` target for every GitHub write.
- Require confirmation immediately before each irreversible action.
- Avoid printing, logging, or passing secrets in command arguments.

## Verify and hand off

Run `bash -n <generated-script>` and run `shellcheck <generated-script>` when
ShellCheck is installed. Statically trace every value from capture to its
declared destination. Do not run the wizard end to end, open its URLs, enter
credentials, or confirm actions on the human's behalf.

Return the script path, static-check results, stage count, destinations, exact
documentation sources, and the command the human can run.

## Have-Nots

- OPS-06: run a generated wizard end to end as an agent.
- OPS-07: invent a dashboard journey or use an unverified URL.
- OPS-08: expose a secret in output, logs, arguments, or source control.
- OPS-09: perform an irreversible step without a just-in-time confirmation.
- OPS-10: overwrite unrelated environment keys or duplicate them on rerun.
