#!/usr/bin/env bash
# Build the RetroTV RPG plugin against the emulator's release jar, using a Maven
# Docker image (no host JDK/Maven needed). Outputs target/retrotv-rpg-*.jar and
# stages it into emulator/plugins-available/.
set -e
cd "$(dirname "$0")"

# 1) Make the Arcturus release jar available as the build classpath.
mkdir -p lib
if [ ! -f lib/Habbo.jar ]; then
  echo "==> Copying Habbo.jar from the running emulator..."
  docker cp retrotv-arcturus:/app/Habbo.jar lib/Habbo.jar
fi

# 2) Compile + package with Maven in Docker.
echo "==> Building plugin..."
MSYS_NO_PATHCONV=1 docker run --rm \
  -v "$(pwd)":/build -w /build \
  -v retrotv-m2:/root/.m2 \
  maven:3-eclipse-temurin-21 mvn -B -q package

# 3) Stage the jar where the emulator image picks it up.
JAR="$(ls target/retrotv-rpg-*.jar | head -1)"
cp "$JAR" ../plugins-available/ 2>/dev/null || cp "$JAR" ../plugins/
echo "==> Built $JAR and staged into emulator plugins."
