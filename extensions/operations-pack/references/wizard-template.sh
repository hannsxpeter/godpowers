#!/usr/bin/env bash

# Human-run setup wizard library.
# Copy this file, keep the helpers, and add project-specific stages below them.

set -euo pipefail
umask 077

WIZARD_ENV_FILE="${WIZARD_ENV_FILE:-.env}"

open_url() {
  local url="$1"
  case "$url" in
    https://*|http://localhost:*|http://127.0.0.1:*) ;;
    *) printf 'Refusing unsupported URL: %s\n' "$url" >&2; return 1 ;;
  esac
  if command -v wslview >/dev/null 2>&1; then
    wslview "$url"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url"
  elif command -v open >/dev/null 2>&1; then
    open "$url"
  else
    printf 'Open this URL manually: %s\n' "$url"
  fi
}

ask_value() {
  local variable_name="$1"
  local prompt="$2"
  local answer=""
  printf '%s: ' "$prompt"
  read -r answer
  printf -v "$variable_name" '%s' "$answer"
}

ask_secret() {
  local variable_name="$1"
  local prompt="$2"
  local answer=""
  printf '%s: ' "$prompt"
  read -r -s answer
  printf '\n'
  printf -v "$variable_name" '%s' "$answer"
}

environment_destination_is_untracked() {
  local env_path="$1"
  local env_dir=""
  env_dir=$(dirname -- "$env_path")
  if command -v git >/dev/null 2>&1 \
    && git -C "$env_dir" rev-parse --is-inside-work-tree >/dev/null 2>&1 \
    && git -C "$env_dir" ls-files --error-unmatch -- "$(basename -- "$env_path")" >/dev/null 2>&1; then
    printf 'Refusing tracked environment destination: %s\n' "$env_path" >&2
    return 1
  fi
}

quote_env_value() {
  local value="$1"
  local escaped=""
  if [[ "$value" == *$'\n'* || "$value" == *$'\r'* ]] \
    || printf '%s' "$value" | LC_ALL=C grep -q '[[:cntrl:]]'; then
    printf 'Environment values must not contain control characters.\n' >&2
    return 1
  fi
  escaped=$(printf '%s' "$value" | sed "s/'/'\\\\''/g")
  printf "'%s'" "$escaped"
}

upsert_env() (
  local key="$1"
  local value="$2"
  local env_path="${3:-$WIZARD_ENV_FILE}"
  local temporary=""
  local serialized=""
  local grep_status=0
  if [[ ! "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
    printf 'Invalid environment key.\n' >&2
    return 1
  fi
  mkdir -p -- "$(dirname -- "$env_path")"
  environment_destination_is_untracked "$env_path"
  serialized=$(quote_env_value "$value")
  if [[ -e "$env_path" && ( ! -f "$env_path" || ! -r "$env_path" ) ]]; then
    printf 'Environment destination must be a readable regular file.\n' >&2
    return 1
  fi
  temporary=$(mktemp "${env_path}.tmp.XXXXXX")
  trap '[[ -z "$temporary" ]] || rm -f -- "$temporary"' EXIT
  if [[ -e "$env_path" ]]; then
    grep -v -E "^${key}=" "$env_path" > "$temporary" || grep_status=$?
    if [[ "$grep_status" -gt 1 ]]; then
      printf 'Failed to read the existing environment file.\n' >&2
      return 1
    fi
  fi
  if ! printf '%s=%s\n' "$key" "$serialized" >> "$temporary"; then
    rm -f -- "$temporary"
    temporary=""
    return 1
  fi
  if ! chmod 600 "$temporary"; then
    rm -f -- "$temporary"
    temporary=""
    return 1
  fi
  if ! mv -- "$temporary" "$env_path"; then
    rm -f -- "$temporary"
    temporary=""
    return 1
  fi
  temporary=""
)

validate_github_target() {
  local name="$1"
  local repository="$2"
  local actual=""
  if [[ ! "$name" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
    printf 'Invalid GitHub setting name.\n' >&2
    return 1
  fi
  if [[ ! "$repository" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
    printf 'GitHub repository must be an explicit owner/name target.\n' >&2
    return 1
  fi
  if ! command -v gh >/dev/null 2>&1 || ! gh auth status >/dev/null 2>&1; then
    printf 'GitHub CLI is not authenticated.\n' >&2
    return 1
  fi
  actual=$(gh repo view "$repository" --json nameWithOwner --jq .nameWithOwner)
  if [[ "$actual" != "$repository" ]]; then
    printf 'GitHub repository target could not be verified.\n' >&2
    return 1
  fi
}

set_github_secret() {
  local name="$1"
  local value="$2"
  local repository="$3"
  validate_github_target "$name" "$repository"
  printf '%s' "$value" | gh secret set "$name" --repo "$repository"
}

set_github_variable() {
  local name="$1"
  local value="$2"
  local repository="$3"
  validate_github_target "$name" "$repository"
  gh variable set "$name" --repo "$repository" --body "$value"
}

confirm_irreversible() {
  local description="$1"
  local answer=""
  printf 'Irreversible action: %s\nType YES to continue: ' "$description"
  read -r answer
  [[ "$answer" == "YES" ]]
}

stage() {
  local number="$1"
  local total="$2"
  local title="$3"
  printf '\nStage %s of %s: %s\n' "$number" "$total" "$title"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  printf 'This is a library template. Copy it and add approved setup stages before running it.\n'
fi
