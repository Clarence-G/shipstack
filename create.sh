#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Usage ──────────────────────────────────────────────
usage() {
  echo "Usage: $0 <target-dir> [project-name]"
  echo ""
  echo "  <target-dir>     Directory to copy the scaffold into"
  echo "  [project-name]   Optional: rename the project (default: orpc-template)"
  echo ""
  echo "Examples:"
  echo "  $0 ~/Projects/my-saas"
  echo "  $0 ~/Projects/my-saas my-saas"
  exit 1
}

[ $# -lt 1 ] && usage

TARGET="$1"
PROJECT_NAME="${2:-}"

# ── Guard ──────────────────────────────────────────────
if [ -d "$TARGET" ] && [ "$(ls -A "$TARGET" 2>/dev/null)" ]; then
  echo "Error: $TARGET already exists and is not empty."
  echo "Remove it first or pick a different directory."
  exit 1
fi

# ── Copy ───────────────────────────────────────────────
mkdir -p "$TARGET"

rsync -a \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='*.tsbuildinfo' \
  --exclude='drizzle' \
  --exclude='.DS_Store' \
  --exclude='bun.lock' \
  --exclude='.git' \
  --exclude='.claude' \
  "$SCRIPT_DIR/" "$TARGET/"

# ── Rename project (optional) ─────────────────────────
if [ -n "$PROJECT_NAME" ]; then
  # root package.json
  sed -i '' "s/\"name\": \"orpc-template\"/\"name\": \"$PROJECT_NAME\"/" "$TARGET/package.json"
  echo "Renamed project to: $PROJECT_NAME"
fi

# ── Init fresh git repo ───────────────────────────────
cd "$TARGET"
git init -q
git add -A
git commit -q -m "init: scaffold from orpc-template"

# ── Done ───────────────────────────────────────────────
echo ""
echo "Scaffold copied to: $TARGET"
echo ""
echo "Next steps:"
echo "  cd $TARGET"
echo "  bun install"
echo "  cp .env.example apps/backend/.env  # then edit with your config"
echo "  bun run db:generate"
echo "  bun run db:migrate"
echo "  bun run dev"
