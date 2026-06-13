#!/bin/sh
# Waits for the database, then launches the Arcturus Morningstar Extended (MS4)
# emulator with the bundled plugins.
set -e

DB_HOST="${DB_HOST:-mysql}"
DB_PORT="${DB_PORT:-3306}"

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

cd /app
echo "[emulator] starting Arcturus Morningstar Extended ..."
exec java -Dfile.encoding=UTF-8 -Duser.country=EN -Duser.language=en -jar /app/Habbo.jar
