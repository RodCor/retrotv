#!/usr/bin/env bash
# RetroTV one-time setup: fetch the engine submodules and normalize line endings
# so the emulator/client shell scripts run inside their Linux containers
# regardless of the host OS / git autocrlf setting.
set -e

cd "$(dirname "$0")/.."

echo "==> Fetching engine submodules (Arcturus + Nitro + assets)..."
git submodule update --init --recursive

echo "==> Normalizing line endings for the Nitro container scripts..."
# The game server is our own image (emulator/); only the Nitro submodule's
# shell scripts need the CRLF->LF fix on Windows checkouts.
for f in \
  foundation/nitro/scripts/build.sh \
  foundation/nitro/supervisor/supervisord.conf ; do
  if [ -f "$f" ]; then
    sed -i 's/\r$//' "$f"
    echo "    fixed $f"
  fi
done

echo "==> Patching the nitro-converter to use the SWF pack's own figuredata..."
# The stock nitro-docker config pulls figuredata from habbo.com (latest), which
# does NOT match the older SWF pack's figuremap/bundles — ~63% of figure parts
# end up uncovered and avatars render broken. Use the pack's figuredata instead
# so figuredata + figuremap + bundles all come from one consistent revision.
CONV="foundation/nitro/configuration/nitro-converter/configuration.json"
if [ -f "$CONV" ]; then
  sed -i 's#"figuredata.load.url": "https://www.habbo.com/gamedata/figuredata/1"#"figuredata.load.url": "http://127.0.0.1:8081/gamedata/figuredata.xml"#' "$CONV"
  echo "    patched $CONV (figuredata)"
fi

# --- Language: HOTEL_LANG (default es) -------------------------------------
# Translates the in-game text (ExternalTexts) by pointing the converter at the
# bundled official-language external_flash_texts before `make assets`.
HOTEL_LANG="${HOTEL_LANG:-es}"
LANG_FILE="langs/external_flash_texts_${HOTEL_LANG}.txt"
if [ "$HOTEL_LANG" != "en" ] && [ -f "$LANG_FILE" ] && [ -f "$CONV" ]; then
  echo "==> Setting hotel language to '$HOTEL_LANG' (in-game texts)..."
  mkdir -p foundation/nitro/nitro-swf/gamedata
  cp "$LANG_FILE" "foundation/nitro/nitro-swf/gamedata/external_flash_texts_${HOTEL_LANG}.txt"
  sed -i "s#\"external.texts.url\": \"http://127.0.0.1:8081/gamedata/external_flash_texts.txt\"#\"external.texts.url\": \"http://127.0.0.1:8081/gamedata/external_flash_texts_${HOTEL_LANG}.txt\"#" "$CONV"
  echo "    in-game texts -> $HOTEL_LANG (run 'make assets' to apply)"
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "==> Created .env from .env.example — edit SESSION_SECRET before production!"
fi

echo ""
echo "Setup complete. Next:"
echo "  docker compose up -d --build     # first boot: emulator jar + client build"
echo "  make assets                      # generate Nitro client assets (once)"
echo ""
echo "Then open  http://127.0.0.1:3010  (CMS)  and  http://127.0.0.1:1080  (hotel)."
