# syntax=docker/dockerfile:1
# RetroTV game server — Arcturus Morningstar Extended (Morningstar 4) emulator.
# Runs the official prebuilt release jar with the bundled plugins. No Maven build.
FROM eclipse-temurin:25-jre

ARG EMU_VERSION=4.2.44
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends wget default-mysql-client ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Pinned Extended release jar.
RUN wget -q -O /app/Habbo.jar \
    "https://github.com/duckietm/Arcturus-Morningstar-Extended/releases/download/v${EMU_VERSION}/Habbo-${EMU_VERSION}-jar-with-dependencies.jar" \
 && test -s /app/Habbo.jar

# Plugins are staged in plugins-available/; the entrypoint copies the ones marked
# enabled in the cms_plugins table into plugins/ (the dir Arcturus loads at boot).
COPY plugins/ /app/plugins-available/
COPY config.ini /app/config.ini
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000 3001 2096
ENTRYPOINT ["/app/entrypoint.sh"]
