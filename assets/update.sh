#!/usr/bin/env bash

set -e

TARGET="${1:-bangs.json}"
CUSTOM="${2:-custom.json}"

echo "⬇️ Downloading bangs.json to $TARGET..."
curl -L -o "$TARGET" "https://github.com/kagisearch/bangs/raw/refs/heads/main/data/bangs.json"
echo "✅ Download complete."

echo "🧽 Removing entries from kagi.com..."
tmp=$(mktemp)
jq '[.[] | select(.d != "kagi.com")]' "$TARGET" > "$tmp" && mv "$tmp" "$TARGET"
echo "✅ kagi.com entries removed."

if [[ -f "$CUSTOM" ]]; then
  echo "➕ Merging $CUSTOM into $TARGET..."
  tmp=$(mktemp)
  jq -s 'add' "$TARGET" "$CUSTOM" > "$tmp" && mv "$tmp" "$TARGET"
  echo "✅ Merge complete."
else
  echo "⚠️  Warning: $CUSTOM not found. Skipping merge."
fi

echo "🎉 All done! Output saved to: $TARGET"
