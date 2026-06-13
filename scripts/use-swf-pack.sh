#!/usr/bin/env bash
# Adopt a recent HabboAssets clothing/figure SWF pack so avatars use modern
# clothing. Updates the figure side (figuredata + figuremap + clothing SWFs)
# only; the furniture set is left untouched so the shop stays consistent.
#
# Usage:   PACK_REV=707 bash scripts/use-swf-pack.sh   (then: make assets)
#
# Furniture is NOT updated by this script — HabboAssets ships furniture SWFs as
# a separate download, and the furnidata must stay matched to the catalog DB.
set -e
cd "$(dirname "$0")/.."

PACK_REV="${PACK_REV:-707}"
SWF="foundation/nitro/nitro-swf"
TMP="$(mktemp -d)"

if [ ! -d "$SWF/gordon/PRODUCTION" ]; then
  echo "Run 'make setup' first (the SWF submodule must be present)." >&2
  exit 1
fi

echo "==> Downloading HabboAssets pack #$PACK_REV ..."
curl -sL -A "Mozilla/5.0" -o "$TMP/pack.zip" "https://www.habboassets.com/swfs/packs/$PACK_REV"

echo "==> Extracting ..."
unzip -q "$TMP/pack.zip" -d "$TMP/pack"

echo "==> Updating figure gamedata (figuredata / figuremap / effectmap) ..."
cp "$TMP/pack/gamedata/figuredata.xml" "$SWF/gamedata/figuredata.xml"
cp "$TMP/pack/figuremap.xml"           "$SWF/gamedata/figuremap.xml"
cp "$TMP/pack/effectmap.xml"           "$SWF/gamedata/effectmap.xml"
[ -f "$TMP/pack/HabboAvatarActions.xml" ] && cp "$TMP/pack/HabboAvatarActions.xml" "$SWF/gamedata/HabboAvatarActions.xml"

echo "==> Copying clothing/figure/effect/pet SWFs into gordon/PRODUCTION ..."
cp "$TMP"/pack/*.swf "$SWF/gordon/PRODUCTION/"

rm -rf "$TMP"
echo ""
echo "Done. Now regenerate the client assets:"
echo "  make assets"
echo ""
echo "(Furniture was left as-is. To modernise furniture too you need the"
echo " HabboAssets furniture SWF pack + a matching furnidata — see docs.)"
