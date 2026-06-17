---
name: god-smite
description: |
  Clear the dependency cache (hard reset of the node-style layer): delete
  node_modules / .venv / vendor / target / .next / dist / .nuxt /
  .turbo / .nx as applicable, then reinstall. For when "have you tried
  turning it off and on again" applies to the dependency layer.

  Triggers on: "god smite", "/god-smite", "nuke node_modules", "clean
  reinstall", "dep cache is broken"
---

# /god-smite

Nuke the dependency cache. Reinstall fresh.

## What it deletes

Stack-aware. Detects from `package.json` / `pyproject.toml` / `go.mod`
/ `Cargo.toml` / etc., then nukes the appropriate caches:

| Stack | Deletes |
|---|---|
| Node (npm) | `node_modules/`, `package-lock.json` (if `--lock` flag) |
| Node (pnpm) | `node_modules/`, `pnpm-lock.yaml` (if `--lock`) |
| Node (yarn) | `node_modules/`, `yarn.lock` (if `--lock`) |
| Python | `.venv/`, `__pycache__/`, `*.egg-info/` |
| Go | `vendor/` (if present) |
| Rust | `target/` |
| Next.js | also `.next/` |
| Nuxt | also `.nuxt/` |
| Turborepo | also `.turbo/` |
| Nx | also `.nx/cache/` |

Also clears common build outputs: `dist/`, `build/`, `out/` (only if
they're not git-tracked).

## What it does NOT delete

- Source code (anything tracked by git)
- `.godpowers/` artifacts
- `node_modules/` inside `.godpowers/` if any
- Lock files (unless `--lock` is passed)
- Anything matched by `.gitignore` exclusions outside the cache list

## Process

1. Detect the stack from config files.
2. Build the deletion list. Show it to the user.
3. Confirm. This step is destructive (recoverable only from git).
4. Delete each path with progress output.
5. Run the corresponding install command:
   - `npm install` / `pnpm install` / `yarn install`
   - `python -m venv .venv && pip install -r requirements.txt`
   - `cargo build` (rebuilds target/)
6. Report final disk space reclaimed and time elapsed.

## Subcommands

### `/god-smite --dry-run`
Show what would be deleted; do nothing.

### `/god-smite --lock`
Also delete the lock file (forces version re-resolution).

### `/god-smite --no-install`
Delete but don't reinstall.

### `/god-smite --gentle`
Don't delete `node_modules/`; just run `npm ci` or equivalent.

## Difference from /god-update-deps

- `/god-smite`: hard reset because something is broken
- `/god-update-deps`: deliberate update with CVE awareness and bisect-able commits

## Safety

- Never runs in a dir without a recognized stack file (refuses early).
- Never deletes anything tracked by git.
- Appends `op:smite` event to reflog (lists what was deleted).

## Implementation

Built-in. Reads package.json / pyproject.toml / Cargo.toml / etc. for
stack detection. Uses `child_process` to run the install command.
