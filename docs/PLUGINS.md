# 🧩 Emulator plugins

RetroTV runs the **Arcturus Morningstar Extended (Morningstar 4)** emulator, which loads
`.jar` plugins from its `plugins/` folder. The plugins are **baked into the emulator image**
(`emulator/plugins/`) and load automatically on boot — there is no separate install step.

All four community plugins from [duckietm/Plugins](https://github.com/duckietm/Plugins) are
bundled and run on the MS4 emulator:

| Plugin | JAR | What it does |
|--------|-----|--------------|
| **Fun Commands** | `fun-commands-2.0.jar` | In-room commands: `:slime`, `:nuke`, `:tp`/`:tptome`, `:spush` (super push), `:spull` (super pull), `:brb`/`:afk`. |
| **WordGuesser** | `wordguesser-1.1.jar` | `:rw` word-guessing mini-game. Reads words from the `random_words` table (seeded by `database/02-retrotv-extras.sql`). |
| **Camera** | `Camera-1.6.jar` | In-game camera — players take & publish photos. |
| **Bot Protect** | `bot-protection-2.0.jar` | Sterilizes the SSO ticket right after login so it can't be replayed. |

> The MS4 emulator also has a **built-in WebSocket** for the Nitro client (`ws.enabled=true`,
> `ws.port=2096` in `emulator/config.ini`) — no separate websocket plugin is needed.

Verify they loaded:
```bash
docker logs retrotv-arcturus | grep -i plugin
# Expect: "Plugin Manager -> Loaded! 4 plugins!"
# plus "[Camera] Plugin has loaded!" and "Fun Commands (2.0.0) has official loaded!"
```

## Command triggers (in the hotel chat)

| Command | Triggers |
|---------|----------|
| Slime someone | `:slime <user>` (also `:slijm`) |
| Nuke someone | `:nuke <user>` (also `:explode`) |
| Teleport to me | `:tptome <user>` / `:tp <user>` |
| Super push / pull | `:spush <user>` / `:spull <user>` |
| Away / back | `:brb` / `:afk` |
| Word guess | `:rw <word>` |

Command availability per rank is governed by the `permissions` table (edit it in the
**Ranks** page of the admin CRM). The `:afk` effect uses furni effect `565` — grab it from
duckietm's asset converter if you want the visual.

## Camera configuration

`database/02-retrotv-extras.sql` sets the Camera output to a Linux path served by the nitro
host, and the root `docker-compose.yml` mounts a shared `volume-camera` into both the emulator
(write side) and the nitro host (`/app/nitro-assets/camera`, served at `:8080/camera/`):

| Setting | Value |
|---------|-------|
| `imager.location.output.camera` | `/app/usercontent/camera/` |
| `camera.url` | `http://127.0.0.1:8080/camera/` |
| `camera.use.https` | `0` |

For a public deployment, change `camera.url` to your domain and set `camera.use.https=1`.

## Adding / updating plugins

Drop any MS4-compatible `.jar` into `emulator/plugins/` and rebuild the emulator image:
```bash
docker compose up -d --build arcturus
```
To build a plugin from source, each duckietm plugin is a Maven project — `mvn package`
against `com.eu.habbo:Habbo` and copy the jar into `emulator/plugins/`.
