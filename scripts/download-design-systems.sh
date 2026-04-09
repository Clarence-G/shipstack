#!/bin/bash
# Download all DESIGN.md files from getdesign.md
# Usage: bash scripts/download-design-systems.sh

set -e

DEST_DIR=".agents/skills/design-md/references"
mkdir -p "$DEST_DIR"

brands=$(npx getdesign@latest list 2>/dev/null | awk -F' - ' '{print $1}' | tr -d ' ')
total=$(echo "$brands" | wc -l | tr -d ' ')
count=0

for brand in $brands; do
  count=$((count + 1))
  outfile="$DEST_DIR/$brand.md"
  echo "[$count/$total] Downloading $brand..."
  npx getdesign@latest add "$brand" --out "$outfile" --force 2>/dev/null
done

echo "Done. Downloaded $count design systems to $DEST_DIR/"
