#!/usr/bin/env bash
set -euo pipefail

# Simulate "new user creates project from GitHub Template" locally.
# Usage: ./scripts/test-template.sh [target-dir]

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ -n "${1:-}" ]; then
  TMP_DIR="$(mkdir -p "$1" && cd "$1" && pwd)"
  KEEP=1
else
  TMP_DIR=$(mktemp -d)
  KEEP=0
fi

if [ "$KEEP" -eq 0 ]; then
  cleanup() { rm -rf "$TMP_DIR"; }
  trap cleanup EXIT
fi

echo "==> Copying template to $TMP_DIR ..."
rsync -a \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='*.tsbuildinfo' \
  --exclude='.DS_Store' \
  --exclude='bun.lock' \
  --exclude='.git' \
  --exclude='pgdata' \
  --exclude='docs/plans' \
  "$REPO_ROOT/" "$TMP_DIR/"

cd "$TMP_DIR"

echo "==> git init ..."
git init -q

echo "==> bun install ..."
bun install

echo ""
echo "==> Checking key files ..."
MISSING=0
for f in \
  package.json \
  CLAUDE.md \
  .env.example \
  apps/backend/src/index.ts \
  apps/backend/src/test/setup.ts \
  apps/frontend/src/main.tsx \
  apps/mobile/src/app/_layout.tsx \
  packages/contract/src/index.ts \
  docs/backend.md \
  docs/frontend.md \
  docs/mobile.md \
  docs/orpc.md \
  docs/testing.md
do
  if [ ! -f "$f" ]; then
    echo "  MISSING: $f"
    MISSING=1
  fi
done
[ "$MISSING" -eq 0 ] && echo "  All key files present."

echo ""
echo "==> TypeScript check (contract) ..."
bunx tsc --noEmit -p packages/contract/tsconfig.json 2>&1 || true

echo ""
echo "==> Lint check ..."
bunx biome check . --max-diagnostics=5 2>&1 || true

echo ""
echo "==> Running backend tests ..."
cd apps/backend && bun test 2>&1 || true
cd "$TMP_DIR"

echo ""
echo "==> Creating .env from .env.example ..."
cp .env.example .env

echo ""
echo "Template test directory: $TMP_DIR"
echo ""
echo "Want to try starting dev servers? Run:"
echo "  cd $TMP_DIR"
echo "  bun run dev"

if [ "$KEEP" -eq 0 ]; then
  echo ""
  echo "(Directory auto-deleted when this script exits. Ctrl-C to keep it open.)"
  read -r -p "Press Enter to clean up, or Ctrl-C to keep ..."
else
  echo ""
  echo "Directory kept at: $TMP_DIR"
fi
