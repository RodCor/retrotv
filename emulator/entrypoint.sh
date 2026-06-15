#!/bin/sh
# Waits for the database, then launches the Arcturus Morningstar Extended (MS4)
# emulator with the bundled plugins.
set -e

DB_HOST="${DB_HOST:-mysql}"
DB_PORT="${DB_PORT:-3306}"

# Inject DB credentials from the environment so real secrets stay OUT of the
# committed config.ini. Anything not provided keeps the file's default value.
CONFIG=/app/config.ini
[ -n "$DB_HOST" ]     && sed -i "s|^db.hostname=.*|db.hostname=${DB_HOST}|" "$CONFIG"
[ -n "$DB_PORT" ]     && sed -i "s|^db.port=.*|db.port=${DB_PORT}|" "$CONFIG"
[ -n "$DB_NAME" ]     && sed -i "s|^db.database=.*|db.database=${DB_NAME}|" "$CONFIG"
[ -n "$DB_USER" ]     && sed -i "s|^db.username=.*|db.username=${DB_USER}|" "$CONFIG"
[ -n "$DB_PASSWORD" ] && sed -i "s|^db.password=.*|db.password=${DB_PASSWORD}|" "$CONFIG"

echo "[emulator] waiting for MySQL at ${DB_HOST}:${DB_PORT} ..."
i=0
until mysqladmin ping -h "$DB_HOST" -P "$DB_PORT" --silent 2>/dev/null; do
  i=$((i + 1))
  if [ "$i" -gt 90 ]; then
    echo "[emulator] MySQL did not become ready in time" >&2
    exit 1
  fi
  sleep 2
done
echo "[emulator] MySQL is up."

mkdir -p /app/usercontent/camera/thumbnail

# --- Plugin sync ------------------------------------------------------------
# Load only the plugins marked enabled in cms_plugins. Staff toggle these from
# the CMS (Settings > Plugins); the choice is applied here on each boot.
AVAIL=/app/plugins-available
LOAD=/app/plugins
mkdir -p "$AVAIL" "$LOAD"

CFG=/app/config.ini
DB_NAME=$(sed -n 's/^db\.database=//p' "$CFG" | tr -d '\r')
DB_USER=$(sed -n 's/^db\.username=//p' "$CFG" | tr -d '\r')
DB_PASS=$(sed -n 's/^db\.password=//p' "$CFG" | tr -d '\r')
MYSQL="mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS -N -B $DB_NAME"

# Ensure the registry table exists even if the migration hasn't been applied.
$MYSQL -e "CREATE TABLE IF NOT EXISTS cms_plugins (jar VARCHAR(190) NOT NULL PRIMARY KEY, name VARCHAR(190) NOT NULL, description VARCHAR(255) NOT NULL DEFAULT '', enabled TINYINT(1) NOT NULL DEFAULT 1);" 2>/dev/null \
  || echo "[emulator] WARN: could not ensure cms_plugins table; loading all plugins"

# Register any newly-added jars (default enabled) so they show up in the CMS.
for jar in "$AVAIL"/*.jar; do
  [ -e "$jar" ] || continue
  base=$(basename "$jar")
  esc=$(printf '%s' "$base" | sed "s/'/''/g")
  $MYSQL -e "INSERT IGNORE INTO cms_plugins (jar, name, enabled) VALUES ('$esc', '$esc', 1);" 2>/dev/null || true
done

# Rebuild the load dir from the enabled set. If the DB query fails, fall back to
# loading everything so a DB hiccup never silently strips all plugins.
rm -f "$LOAD"/*.jar 2>/dev/null || true
ENABLED=$($MYSQL -e "SELECT jar FROM cms_plugins WHERE enabled = 1;" 2>/dev/null) || ENABLED=""
if [ -z "$ENABLED" ]; then
  cp "$AVAIL"/*.jar "$LOAD"/ 2>/dev/null || true
else
  printf '%s\n' "$ENABLED" | while IFS= read -r base; do
    [ -n "$base" ] && [ -f "$AVAIL/$base" ] && cp "$AVAIL/$base" "$LOAD/$base"
  done
fi
echo "[emulator] plugins loaded: $(ls -1 "$LOAD"/*.jar 2>/dev/null | wc -l) of $(ls -1 "$AVAIL"/*.jar 2>/dev/null | wc -l)"

cd /app
echo "[emulator] starting Arcturus Morningstar Extended ..."
exec java -Dfile.encoding=UTF-8 -Duser.country=EN -Duser.language=en -jar /app/Habbo.jar
