#!/usr/bin/env bash
# Godpowers Smoke Test
# Validates the slash command + specialist agent structure

set -euo pipefail

PASS=0
FAIL=0
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

pass() { echo "  + PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  x FAIL: $1"; FAIL=$((FAIL + 1)); }

echo ""
echo "  Godpowers Smoke Test"
echo "  ===================="
echo ""

# 1. SKILL.md exists and has frontmatter
if [ -f "$ROOT/SKILL.md" ]; then
  if head -1 "$ROOT/SKILL.md" | grep -q "^---"; then
    pass "SKILL.md exists with frontmatter"
  else
    fail "SKILL.md missing frontmatter"
  fi
else
  fail "SKILL.md not found"
fi

# 2. All skill files have frontmatter, name, description
for skill in "$ROOT/skills/"*.md; do
  name="$(basename "$skill")"
  if head -1 "$skill" | grep -q "^---"; then
    pass "skills/$name has frontmatter"
  else
    fail "skills/$name missing frontmatter"
  fi
  if grep -q "^name:" "$skill"; then
    pass "skills/$name has name field"
  else
    fail "skills/$name missing name field"
  fi
  if grep -q "^description:" "$skill"; then
    pass "skills/$name has description field"
  else
    fail "skills/$name missing description field"
  fi
done

# 3. All specialist agent files have frontmatter, name, description.
# Project Pillars may also live under agents/ (context.md, repo.md, etc.),
# but those are context files, not spawnable specialist agents.
for agent in "$ROOT/agents/"/god-*.md; do
  name="$(basename "$agent")"
  if head -1 "$agent" | grep -q "^---"; then
    pass "agents/$name has frontmatter"
  else
    fail "agents/$name missing frontmatter"
  fi
  if grep -q "^name:" "$agent"; then
    pass "agents/$name has name field"
  else
    fail "agents/$name missing name field"
  fi
done

# 4. No em/en dashes
# Use Python for proper UTF-8 handling. The previous bash byte-class regex
# false-positives on any UTF-8 char starting with 0xE2 (block chars, arrows, etc.)
DASH_HITS="$(python3 -c "
import os, sys
hits = []
for path in [sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]]:
    if os.path.isfile(path):
        files = [path]
    elif os.path.isdir(path):
        files = []
        for root, dirs, fs in os.walk(path):
            for f in fs:
                if f.endswith('.md'):
                    files.append(os.path.join(root, f))
    else:
        continue
    for fp in files:
        with open(fp, 'r', encoding='utf-8', errors='ignore') as f:
            for i, line in enumerate(f, 1):
                if '\u2013' in line or '\u2014' in line:
                    hits.append(f'{fp}:{i}')
print('\n'.join(hits))
" "$ROOT/SKILL.md" "$ROOT/skills" "$ROOT/agents" "$ROOT/README.md" 2>/dev/null)"

if [ -n "$DASH_HITS" ]; then
  echo "$DASH_HITS"
  fail "Em/en dashes found in content"
else
  pass "No em/en dashes in content"
fi

# 5. bin/install.js exists and has node shebang
if [ -f "$ROOT/bin/install.js" ]; then
  if head -1 "$ROOT/bin/install.js" | grep -q "node"; then
    pass "bin/install.js has node shebang"
  else
    fail "bin/install.js missing node shebang"
  fi
else
  fail "bin/install.js not found"
fi

# 6. package.json has correct name and bin
if [ -f "$ROOT/package.json" ]; then
  if grep -q '"godpowers"' "$ROOT/package.json"; then
    pass "package.json has correct name"
  else
    fail "package.json has wrong name"
  fi
  if grep -q '"./bin/install.js"' "$ROOT/package.json"; then
    pass "package.json points to install.js"
  else
    fail "package.json missing or wrong bin path"
  fi
fi

# 7. Each tier skill spawns the right specialist agent
# Format: skill_name:agent_name (bash 3.2 compatible)
PAIRS="
god-prd:god-pm
god-arch:god-architect
god-roadmap:god-roadmapper
god-stack:god-stack-selector
god-repo:god-repo-scaffolder
god-build:god-planner
god-deploy:god-deploy-engineer
god-observe:god-observability-engineer
god-launch:god-launch-strategist
god-harden:god-harden-auditor
god-debug:god-debugger
god-mode:god-orchestrator
god-spike:god-spike-runner
god-postmortem:god-incident-investigator
god-upgrade:god-migration-strategist
god-docs:god-docs-writer
god-update-deps:god-deps-auditor
"

while IFS=: read -r skill_name agent_name; do
  [ -z "$skill_name" ] && continue
  skill_file="$ROOT/skills/${skill_name}.md"
  agent_file="$ROOT/agents/${agent_name}.md"

  if [ -f "$skill_file" ] && grep -q "$agent_name" "$skill_file"; then
    pass "skills/${skill_name}.md spawns ${agent_name}"
  else
    fail "skills/${skill_name}.md does not reference ${agent_name}"
  fi

  if [ -f "$agent_file" ]; then
    pass "agents/${agent_name}.md exists"
  else
    fail "agents/${agent_name}.md missing"
  fi
done <<EOF
$PAIRS
EOF

# 8. Tier 1+ agents document have-nots (the actual quality definitions)
for tier_agent in god-pm god-architect god-roadmapper god-stack-selector god-repo-scaffolder god-deploy-engineer god-observability-engineer god-launch-strategist god-harden-auditor; do
  agent_file="$ROOT/agents/${tier_agent}.md"
  if [ -f "$agent_file" ]; then
    if grep -qi "have-not" "$agent_file"; then
      pass "agents/${tier_agent}.md documents have-nots"
    else
      fail "agents/${tier_agent}.md missing have-nots section"
    fi
  fi
done

# 9. Tier 1+ agents document gate checks
for gated_agent in god-architect god-roadmapper god-stack-selector god-repo-scaffolder god-planner god-deploy-engineer god-observability-engineer god-launch-strategist god-harden-auditor; do
  agent_file="$ROOT/agents/${gated_agent}.md"
  if [ -f "$agent_file" ]; then
    if grep -qi "gate check" "$agent_file"; then
      pass "agents/${gated_agent}.md has gate check"
    else
      fail "agents/${gated_agent}.md missing gate check"
    fi
  fi
done

# 10. Hooks present and executable
if [ -f "$ROOT/hooks/session-start.sh" ]; then
  if [ -x "$ROOT/hooks/session-start.sh" ]; then
    pass "hooks/session-start.sh is executable"
  else
    fail "hooks/session-start.sh not executable"
  fi
fi

if [ -f "$ROOT/hooks/pre-tool-use.sh" ]; then
  if [ -x "$ROOT/hooks/pre-tool-use.sh" ]; then
    pass "hooks/pre-tool-use.sh is executable"
  else
    fail "hooks/pre-tool-use.sh not executable"
  fi
fi

# 11. god-mode autonomous routing: orchestrator runbook references every tier's agent
ORCH="$ROOT/references/orchestration/GOD-ORCHESTRATOR-RUNBOOK.md"
for required_agent in god-pm god-architect god-roadmapper god-stack-selector god-repo-scaffolder god-planner god-executor god-spec-reviewer god-quality-reviewer god-deploy-engineer god-observability-engineer god-harden-auditor god-launch-strategist; do
  if grep -q "$required_agent" "$ORCH"; then
    pass "orchestrator routes to $required_agent"
  else
    fail "orchestrator does not route to $required_agent"
  fi
done

# 12. Build phase orchestration: orchestrator runbook documents the 4-agent build chain
if grep -qi "build phase orchestration" "$ORCH"; then
  pass "orchestrator documents Build phase multi-agent chain"
else
  fail "orchestrator missing Build phase orchestration section"
fi

# 13. YOLO handling: every pause-capable agent documents YOLO behavior
for yolo_agent in god-pm god-architect god-roadmapper god-stack-selector god-launch-strategist god-harden-auditor; do
  agent_file="$ROOT/agents/${yolo_agent}.md"
  if [ -f "$agent_file" ]; then
    if grep -qi "yolo" "$agent_file"; then
      pass "agents/${yolo_agent}.md documents YOLO handling"
    else
      fail "agents/${yolo_agent}.md missing YOLO handling"
    fi
  fi
done

# 14. Critical-finding carve-out: harden auditor must NOT auto-resolve Criticals
if grep -qi "Critical findings.*cannot.*auto" "$ROOT/agents/god-harden-auditor.md" || \
   grep -qi "yolo CANNOT auto-resolve" "$ROOT/agents/god-harden-auditor.md"; then
  pass "harden-auditor preserves Critical-finding pause under --yolo"
else
  fail "harden-auditor missing Critical-finding --yolo carve-out"
fi

# 15. Workflow YAMLs exist for each major slash command
for workflow in full-arc feature-arc hotfix-arc refactor-arc spike postmortem migration-arc docs-arc deps-audit audit-only hygiene; do
  workflow_file="$ROOT/workflows/${workflow}.yaml"
  if [ -f "$workflow_file" ]; then
    pass "workflows/${workflow}.yaml exists"
  else
    fail "workflows/${workflow}.yaml missing"
  fi
done

# 16. Workflow YAMLs have apiVersion + kind + metadata
for workflow_file in "$ROOT/workflows/"*.yaml; do
  name="$(basename "$workflow_file")"
  if grep -q "^apiVersion: godpowers/v1$" "$workflow_file"; then
    pass "workflows/${name} has apiVersion: godpowers/v1"
  else
    fail "workflows/${name} missing apiVersion"
  fi
  if grep -q "^kind: Workflow$" "$workflow_file"; then
    pass "workflows/${name} has kind: Workflow"
  else
    fail "workflows/${name} missing kind: Workflow"
  fi
done

# 17. JSON Schemas are valid JSON
for schema_file in "$ROOT/schema/"*.json; do
  name="$(basename "$schema_file")"
  if python3 -c "import json; json.load(open('$schema_file'))" 2>/dev/null; then
    pass "schema/${name} is valid JSON"
  else
    fail "schema/${name} is not valid JSON"
  fi
done

# 18. Routing files exist for core commands
for cmd in god-init god-prd god-arch god-roadmap god-stack god-repo god-build god-deploy god-observe god-launch god-harden god-mode god-feature god-hotfix god-refactor god-spike god-postmortem god-upgrade god-docs god-update-deps god-preflight god-audit god-hygiene god-status god-next god-help god-doctor god-undo god-redo god-skip; do
  routing_file="$ROOT/routing/${cmd}.yaml"
  if [ -f "$routing_file" ]; then
    pass "routing/${cmd}.yaml exists"
  else
    fail "routing/${cmd}.yaml missing"
  fi
done

# 19. Routing files all have required fields
for routing_file in "$ROOT/routing/"*.yaml; do
  name="$(basename "$routing_file")"
  if grep -q "^apiVersion: godpowers/v1$" "$routing_file"; then
    pass "routing/${name} has apiVersion"
  else
    fail "routing/${name} missing apiVersion"
  fi
  if grep -q "^kind: CommandRouting$" "$routing_file"; then
    pass "routing/${name} has kind: CommandRouting"
  else
    fail "routing/${name} missing kind"
  fi
done

# 20. god-standards-check agent exists with required fields
if [ -f "$ROOT/agents/god-standards-check.md" ]; then
  pass "agents/god-standards-check.md exists"
else
  fail "agents/god-standards-check.md missing"
fi

# 21. /god-standards skill exists
if [ -f "$ROOT/skills/god-standards.md" ]; then
  pass "skills/god-standards.md exists"
else
  fail "skills/god-standards.md missing"
fi

# 22. lib/router.js exists
if [ -f "$ROOT/lib/router.js" ]; then
  pass "lib/router.js exists"
else
  fail "lib/router.js missing"
fi

# 23. lib/recipes.js exists
if [ -f "$ROOT/lib/recipes.js" ]; then
  pass "lib/recipes.js exists"
else
  fail "lib/recipes.js missing"
fi

# 24. routing/recipes/ has 30+ recipe files
recipe_count=$(ls "$ROOT/routing/recipes/"*.yaml 2>/dev/null | wc -l)
if [ "$recipe_count" -ge 30 ]; then
  pass "routing/recipes/ has ${recipe_count} recipes"
else
  fail "routing/recipes/ has only ${recipe_count} recipes (expected 30+)"
fi

# 25. All recipes have apiVersion + kind: Recipe
for recipe_file in "$ROOT/routing/recipes/"*.yaml; do
  name="$(basename "$recipe_file")"
  if grep -q "^apiVersion: godpowers/v1$" "$recipe_file"; then
    pass "routing/recipes/${name} has apiVersion"
  else
    fail "routing/recipes/${name} missing apiVersion"
  fi
  if grep -q "^kind: Recipe$" "$recipe_file"; then
    pass "routing/recipes/${name} has kind: Recipe"
  else
    fail "routing/recipes/${name} missing kind: Recipe"
  fi
done

# 26. schema/recipe.v1.json exists and is valid JSON
if [ -f "$ROOT/schema/recipe.v1.json" ]; then
  if python3 -c "import json; json.load(open('$ROOT/schema/recipe.v1.json'))" 2>/dev/null; then
    pass "schema/recipe.v1.json is valid JSON"
  else
    fail "schema/recipe.v1.json is not valid JSON"
  fi
else
  fail "schema/recipe.v1.json missing"
fi

echo ""
echo "  Results: $PASS passed, $FAIL failed"
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
