#!/usr/bin/env bash
# Overlays Spanish furni names/descriptions onto the live Nitro FurnitureData.json.
# The converter builds FurnitureData.json from habbo.com (English); this re-applies
# the Spanish names from habbo.es. Run AFTER `make assets`, then have players
# refresh the client. Asset sprites are untouched — only names/descriptions change.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
TMP="$HERE/../.tmp"
mkdir -p "$TMP"

echo "==> Fetching habbo.es furnidata..."
curl -sL --max-time 40 -A "Mozilla/5.0" "https://www.habbo.es/gamedata/furnidata_json/1" -o "$TMP/es_furni.json"

echo "==> Overlaying Spanish names onto FurnitureData.json..."
docker cp retrotv-nitro:/app/nitro-assets/gamedata/FurnitureData.json "$TMP/FurnitureData.json"
node "$HERE/es-furni-names.mjs" "$TMP/es_furni.json" "$TMP/FurnitureData.json"
docker cp "$TMP/FurnitureData.json" retrotv-nitro:/app/nitro-assets/gamedata/FurnitureData.json

echo "==> Done. Players should refresh the hotel to load the Spanish furni names."
