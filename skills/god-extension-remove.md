---
name: god-extension-remove
description: |
  Uninstall a godpowers extension pack. Removes the pack's directory
  under <runtime>/godpowers-extensions/. Does NOT delete project-level
  data the pack may have written (e.g. SOC2 audit findings). Reversible
  by re-installing.

  Triggers on: "god extension remove", "/god-extension-remove",
  "uninstall pack", "remove extension"
---

# /god-extension-remove

Uninstall a godpowers extension pack.

## Usage

### `/god-extension-remove <pack-name>`

Example:
- `/god-extension-remove @godpowers/launch-pack`

## Process

1. Resolve `<pack-name>` to its installed path via
   `lib/extensions.info(runtimeConfigDir, packName)`.
2. If not found: report `not-installed` and exit.
3. Confirm with user: pack name, version, install path, what will be removed.
4. On confirmation: `fs.rmSync(packPath, { recursive: true, force: true })`.
5. Append `op:extension.remove` to reflog + emit `extension.remove` event.
6. Report: pack removed, list invalidated commands.

## What this does NOT remove

- Project-level artifacts the pack produced (e.g.
  `.godpowers/audits/soc2-2026-01.mdx`). These stay; re-install the
  pack to read them again.
- Have-nots IDs already recorded in linkage. Those references become
  dead until the pack is re-installed.

## Subcommands

### `/god-extension-remove <name>`
Interactive uninstall (asks for confirmation).

### `/god-extension-remove <name> --yes`
Skip confirmation.

### `/god-extension-remove <name> --dry-run`
Show what would be removed.

## Recovery

Re-install with `/god-extension-add` (no state is lost on the
project side).

## Implementation

Built-in. Calls `lib/extensions.js remove(runtimeConfigDir, packName)`.

## Related

- `/god-extension-add` - install
- `/god-extension-list` - what's installed
- `/god-extension-info` - one pack in detail
