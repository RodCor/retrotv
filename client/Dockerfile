# syntax=docker/dockerfile:1
# RetroTV game client — Nitro-V3 (matches the Arcturus Morningstar Extended / MS4
# emulator's packet protocol). Built from duckietm's Nitro_Render_V3 + Nitro-V3.

# --- Build stage -----------------------------------------------------------
FROM node:20-bookworm AS build
WORKDIR /src
ARG RENDERER_REPO=https://github.com/duckietm/Nitro_Render_V3.git
ARG CLIENT_REPO=https://github.com/duckietm/Nitro-V3.git
RUN git clone --depth 1 "$RENDERER_REPO" Nitro_Render_V3 \
 && git clone --depth 1 "$CLIENT_REPO" Nitro-V3
WORKDIR /src/Nitro-V3
# install.mjs: install + yarn-link the renderer, copy config examples, build dist/.
# (URLs here are placeholders; the runtime entrypoint rewrites them from env.)
RUN node install.mjs --non-interactive --json-mode=json5 \
      --renderer-dir=/src/Nitro_Render_V3 --skip-clone \
      --socket-url=ws://127.0.0.1:2096 \
      --api-url=http://127.0.0.1:2096 \
      --asset-url=http://127.0.0.1:8080/bundled

# --- Runtime stage ---------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app
RUN npm i -g http-server@14
COPY --from=build /src/Nitro-V3/dist ./dist
COPY generate-config.mjs ./generate-config.mjs
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/app/entrypoint.sh"]
