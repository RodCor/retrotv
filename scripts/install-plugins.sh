#!/usr/bin/env bash
# Installs the bundled Arcturus plugins into the running emulator and configures
# them. Run after `docker compose up` (the emulator container must be running).
#
# Bundled plugins (compatible with Arcturus Morningstar 3.5.x — our emulator):
#   - Camera-1.6.jar        in-game camera / photos  (com.eu.habbo:Habbo:3.5.2)
#   - bot-protection-2.0.jar SSO sterilization after login
#
# NOTE: duckietm's "Fun Commands" and "WordGuesser" plugins target Morningstar 4
# (the Extended fork) and are intentionally NOT bundled — they do not load on a
# 3.5.x emulator. See docs/PLUGINS.md.
set -e
cd "$(dirname "$0")/.."

EMU="${EMU_CONTAINER:-retrotv-arcturus}"
# Fall back to the dev container name used by the foundation compose project.
if ! docker inspect "$EMU" >/dev/null 2>&1; then EMU="arcturus"; fi
DB="${DB_CONTAINER:-retrotv-mysql}"
if ! docker inspect "$DB" >/dev/null 2>&1; then DB="mysql"; fi
DB_USER="${DB_USER:-arcturus_user}"
DB_PASS="${DB_PASSWORD:-arcturus_pw}"
DB_NAME="${DB_NAME:-arcturus}"

echo "==> Copying plugin JARs into $EMU:/app/arcturus/target/plugins"
docker exec "$EMU" sh -c "mkdir -p /app/arcturus/target/plugins"
for jar in plugins/*.jar; do
  docker cp "$jar" "$EMU:/app/arcturus/target/plugins/$(basename "$jar")"
  echo "    + $(basename "$jar")"
done

echo "==> Configuring the Camera plugin (Linux paths + HTTP serving)"
docker exec "$EMU" sh -c "mkdir -p /app/usercontent/camera/thumbnail" || true
cat <<SQL | docker exec -i "$DB" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" 2>/dev/null || true
UPDATE emulator_settings SET value='/app/usercontent/camera/'            WHERE \`key\`='imager.location.output.camera';
UPDATE emulator_settings SET value='/app/usercontent/camera/thumbnail/'  WHERE \`key\`='imager.location.output.thumbnail';
UPDATE emulator_settings SET value='http://127.0.0.1:8080/camera/'        WHERE \`key\`='camera.url';
UPDATE emulator_settings SET value='0'                                    WHERE \`key\`='camera.use.https';
SQL

echo "==> Restarting the emulator"
docker exec "$EMU" supervisorctl restart arcturus-emulator >/dev/null 2>&1 || docker restart "$EMU" >/dev/null

echo "Done. Plugins installed:"
docker exec "$EMU" sh -c "ls /app/arcturus/target/plugins/"
echo "Watch them load:  docker exec $EMU sh -c 'tail -f /tmp/arcturus-emulator-stdout*' | grep -i plugin"
