#!/usr/bin/env bash
# Godpowers PreToolUse advisory hook (best-effort, NOT a security boundary).
#
# Warns before some common destructive command spellings when run inside a
# Godpowers project: deleting .godpowers/, git reset --hard, force push,
# npm publish, gh release create. It matches command text heuristically after
# normalizing whitespace, so it tolerates spacing and short-flag variants
# (rm -fr, -r -f, ./ prefix, trailing slash, push -f). It is still deliberately
# conservative and is easily bypassed by uncommon spellings, quoting, aliases,
# or a child process that does the deletion. Treat it as a typo guard that buys
# a confirmation prompt, not as a guarantee. See SECURITY.md.

set -euo pipefail

TOOL_INPUT="${CLAUDE_TOOL_INPUT:-}"

if [ ! -d ".godpowers" ]; then
  exit 0
fi

# Collapse tabs and runs of spaces so spacing variants normalize to one form.
norm="$(printf '%s' "$TOOL_INPUT" | tr '\t' ' ' | tr -s ' ')"

matches() {
  printf '%s' "$norm" | grep -Eq -- "$1"
}

# rm targeting .godpowers (optional ./ or / prefix, optional trailing slash)
# that carries a recursive flag in any spelling: -rf, -fr, -r -f, -R, --recursive.
if matches 'rm( +-[a-zA-Z]+)* +\.?/?\.godpowers(/|$| )' && matches ' -[a-zA-Z]*[rR]|--recursive'; then
  echo "WARNING: About to delete the .godpowers/ directory."
  echo "This destroys all PROGRESS, PRD, ARCH, ROADMAP, and other artifacts."
  echo "If this is intentional, confirm in chat before proceeding."
  exit 1
fi

if matches 'git +reset +--hard'; then
  echo "WARNING: git reset --hard discards uncommitted work."
  echo "If you have artifacts not yet committed, they will be lost."
  echo "Consider git stash first."
  exit 1
fi

# git push with a force flag: --force, --force-with-lease, or a standalone -f.
if matches 'git +push +' && matches '(--force(-with-lease)?| -f( |$))'; then
  echo "WARNING: Force pushing. If pushing to main/master, this can"
  echo "destroy collaborators' work."
  exit 1
fi

if matches 'npm +publish'; then
  echo "WARNING: npm publish is a public release action."
  echo "Confirm release checklist, repo-doc-sync, repo-surface-sync,"
  echo "release-surface-sync, package contents, and installer smoke first."
  exit 1
fi

if matches 'gh +release +create'; then
  echo "WARNING: gh release create publishes public release notes."
  echo "Confirm README, badges, CHANGELOG, RELEASE, package, tag, and npm version agree."
  exit 1
fi

exit 0
