#!/usr/bin/env bash
# Godpowers Release Script
# Runs release checks and pushes a version tag. The tag-triggered GitHub
# workflow publishes the root and companion packages to npm with provenance.
# Run with: bash scripts/release.sh <version>

set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 0.4.1"
  exit 1
fi

VERSION="$1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

cd "$ROOT"

echo "Releasing Godpowers v$VERSION"
echo ""

# 1. Verify clean working tree
if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: working tree is dirty. Commit or stash first."
  exit 1
fi

# 2. Verify on main branch
BRANCH="$(git branch --show-current)"
if [ "$BRANCH" != "main" ]; then
  echo "ERROR: not on main branch (on $BRANCH)"
  exit 1
fi

# 3. Run release checks
echo "Running release checks..."
npm run release:check

# 4. Verify version in package.json matches
PKG_VERSION="$(node -p "require('./package.json').version")"
if [ "$PKG_VERSION" != "$VERSION" ]; then
  echo "ERROR: package.json version is $PKG_VERSION, but releasing as $VERSION"
  echo "Update package.json first."
  exit 1
fi

# 5. Verify installer version source matches
INSTALL_VERSION="$(node -p "require('./package.json').version")"
if [ "$INSTALL_VERSION" != "$VERSION" ]; then
  echo "ERROR: installer version source is $INSTALL_VERSION, but releasing as $VERSION"
  echo "Update package.json first."
  exit 1
fi

# 6. Verify MCP companion version matches
MCP_VERSION="$(node -p "require('./packages/mcp/package.json').version")"
if [ "$MCP_VERSION" != "$VERSION" ]; then
  echo "ERROR: @godpowers/mcp version is $MCP_VERSION, but releasing as $VERSION"
  echo "Update packages/mcp/package.json first."
  exit 1
fi

# 7. Verify CHANGELOG has entry for this version
if ! grep -q "## \[$VERSION\]" CHANGELOG.md; then
  echo "ERROR: CHANGELOG.md has no entry for v$VERSION"
  exit 1
fi

echo ""
echo "All pre-release checks passed."
echo ""

# 8. Confirm with user
read -r -p "Tag v$VERSION and push it to trigger npm publish? (yes/no) " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

# 9. Tag
git tag -a "v$VERSION" -m "Godpowers v$VERSION"
echo "Tagged v$VERSION"

# 10. Push tag. GitHub Actions publishes to npm from .github/workflows/publish.yml.
git push origin "v$VERSION"

echo ""
echo "Release v$VERSION tag pushed."
echo "  - tag: git tag $VERSION pushed"
echo "  - npm publish: https://github.com/hannsxpeter/godpowers/actions/workflows/publish.yml"
echo "  - packages: godpowers and @godpowers/mcp"
echo ""
echo "Next: verify npm, then create a GitHub Release at https://github.com/hannsxpeter/godpowers/releases"
