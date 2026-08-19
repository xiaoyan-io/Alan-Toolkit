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

echo "========================================"
echo "  Alan-Toolkit → KSWEB Lighttpd Deploy"
echo "========================================"
echo ""

# 1. Check project directory
if [ ! -f "$PROJECT_DIR/index.html" ]; then
  echo -e "${RED}[FAIL]${NC} Project directory check failed"
  echo "  Expected index.html at: $PROJECT_DIR/index.html"
  exit 1
fi
echo -e "${GREEN}[OK]${NC} Project directory: $PROJECT_DIR"

# 2. Check HTDOCS exists
if [ ! -d "$HTDOCS" ]; then
  echo -e "${RED}[FAIL]${NC} KSWEB htdocs not found at $HTDOCS"
  echo "  Please verify KSWEB is installed and Lighttpd is running"
  exit 1
fi
echo -e "${GREEN}[OK]${NC} KSWEB htdocs: $HTDOCS"

# 3. Create target directory if needed
if [ ! -d "$TARGET" ]; then
  mkdir -p "$TARGET"
  echo -e "${CYAN}[INFO]${NC} Created target directory: $TARGET"
else
  echo -e "${GREEN}[OK]${NC} Target directory exists: $TARGET"
fi

# 4. Run pre-sync scripts
echo ""
echo "--- Pre-sync: running sync-tools-fallback.js ---"
node "$SCRIPT_DIR/sync-tools-fallback.js" || {
  echo -e "${RED}[FAIL]${NC} sync-tools-fallback.js failed"
  exit 1
}

if [ -f "$SCRIPT_DIR/sync-notes-fallback.js" ]; then
  echo "--- Pre-sync: running sync-notes-fallback.js ---"
  node "$SCRIPT_DIR/sync-notes-fallback.js" || {
    echo -e "${RED}[FAIL]${NC} sync-notes-fallback.js failed"
    exit 1
  }
fi

# 5. Rsync
echo ""
echo "--- Syncing with rsync ---"
rsync -a --delete --delete-excluded \
  --exclude='.git/' \
  --exclude='.gitignore' \
  --exclude='AGENTS.md' \
  --exclude='docs/' \
  --exclude='scripts/' \
  --exclude='node_modules/' \
  --exclude='*.log' \
  "$PROJECT_DIR/" "$TARGET/"

echo -e "${GREEN}[OK]${NC} rsync completed"

# 6. Verify critical HTML files
echo ""
echo "--- Verification ---"
MISSING=0
for f in \
  "index.html" \
  "apps/prompt-workflow-notes/index.html" \
  "apps/aunt-house/index.html"; do
  if [ -f "$TARGET/$f" ]; then
    echo -e "${GREEN}[OK]${NC} $f"
  else
    echo -e "${RED}[FAIL]${NC} $f MISSING"
    MISSING=1
  fi
done

echo ""
if [ "$MISSING" -eq 0 ]; then
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}  Deploy successful!${NC}"
  echo -e "${GREEN}========================================${NC}"
else
  echo -e "${RED}========================================${NC}"
  echo -e "${RED}  Deploy completed with missing files${NC}"
  echo -e "${RED}========================================${NC}"
  exit 1
fi

echo ""
echo "Access URLs:"
echo "  http://localhost:8888/Alan-Toolkit/"
echo "  http://localhost:8888/Alan-Toolkit/apps/prompt-workflow-notes/"
echo "  http://localhost:8888/Alan-Toolkit/apps/aunt-house/"
echo ""
echo "LAN access (replace 192.168.x.x with your device IP):"
echo "  http://192.168.x.x:8888/Alan-Toolkit/"
echo ""
