#!/bin/bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
HTDOCS="/storage/emulated/0/htdocs"
TARGET="$HTDOCS/Alan-Toolkit"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

PASS=0
FAIL=0

function check() {
  local desc="$1"
  local result="$2"
  if [ "$result" = "true" ] || [ "$result" -eq 0 ] 2>/dev/null; then
    echo -e "  ${GREEN}[PASS]${NC} $desc"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}[FAIL]${NC} $desc"
    FAIL=$((FAIL + 1))
  fi
}

echo "========================================"
echo "  Alan-Toolkit KSWEB Deploy Check"
echo "========================================"
echo ""

echo "--- 1. Target Directory ---"
check "htdocs exists" "$([ -d "$HTDOCS" ] && echo true || echo false)"
check "Alan-Toolkit deployed" "$([ -d "$TARGET" ] && echo true || echo false)"

echo ""
echo "--- 2. Critical HTML Files ---"
check "index.html" "$([ -f "$TARGET/index.html" ] && echo true || echo false)"
check "apps/prompt-workflow-notes/index.html" \
  "$([ -f "$TARGET/apps/prompt-workflow-notes/index.html" ] && echo true || echo false)"
check "apps/aunt-house/index.html" \
  "$([ -f "$TARGET/apps/aunt-house/index.html" ] && echo true || echo false)"

echo ""
echo "--- 3. File Count Comparison ---"
SRC_COUNT=$(find "$PROJECT_DIR" \
  -not -path "$PROJECT_DIR/.git/*" \
  -not -path "$PROJECT_DIR/docs/*" \
  -not -path "$PROJECT_DIR/scripts/*" \
  -not -path "$PROJECT_DIR/node_modules/*" \
  -not -name "*.log" \
  -not -name ".gitignore" \
  -not -name "AGENTS.md" \
  -type f 2>/dev/null | wc -l)
DST_COUNT=$(find "$TARGET" -type f 2>/dev/null | wc -l || echo 0)
check "Source ($SRC_COUNT) == Deployed ($DST_COUNT)" \
  "$([ "$SRC_COUNT" -eq "$DST_COUNT" ] && echo true || echo false)"
if [ "$SRC_COUNT" -ne "$DST_COUNT" ]; then
  echo "    Diff: source=$SRC_COUNT deployed=$DST_COUNT"
fi

echo ""
echo "--- 4. Excluded Content Check ---"
check ".git/ not deployed" \
  "$([ ! -d "$TARGET/.git" ] && echo true || echo false)"
check ".gitignore not deployed" \
  "$([ ! -f "$TARGET/.gitignore" ] && echo true || echo false)"
check "AGENTS.md not deployed" \
  "$([ ! -f "$TARGET/AGENTS.md" ] && echo true || echo false)"
check "scripts/ not deployed" \
  "$([ ! -d "$TARGET/scripts" ] && echo true || echo false)"
check "docs/ not deployed" \
  "$([ ! -d "$TARGET/docs" ] && echo true || echo false)"

echo ""
echo "--- 5. Asset Integrity ---"
check "assets/variables.css exists" \
  "$([ -f "$TARGET/assets/variables.css" ] && echo true || echo false)"
check "assets/data/tools.json exists" \
  "$([ -f "$TARGET/assets/data/tools.json" ] && echo true || echo false)"
check "style.css exists" \
  "$([ -f "$TARGET/style.css" ] && echo true || echo false)"
check "script.js exists" \
  "$([ -f "$TARGET/script.js" ] && echo true || echo false)"

echo ""
echo "========================================"
echo -e "  ${GREEN}$PASS PASS${NC}" / "${RED}$FAIL FAIL${NC}"
echo "========================================"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
