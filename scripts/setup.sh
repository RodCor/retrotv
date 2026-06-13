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

if [ ! -f .env ]; then
  cp .env.example .env
  echo "==> Created .env from .env.example — edit SESSION_SECRET before production!"
fi

echo ""
echo "Setup complete. Next:"
echo "  docker compose up -d --build     # first boot ~10 min (Maven + client build)"
echo "  make assets                      # generate Nitro client assets (once)"
echo ""
echo "Then open  http://127.0.0.1:3010  (CMS)  and  http://127.0.0.1:1080  (hotel)."
