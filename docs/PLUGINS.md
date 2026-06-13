# 🧩 Emulator plugins

The Arcturus emulator loads `.jar` plugins from `arcturus/target/plugins/`. RetroTV
bundles a couple of community plugins from
[duckietm/Plugins](https://github.com/duckietm/Plugins) and installs them with one command.

## Install

```bash
make plugins      # or: bash scripts/install-plugins.sh
```

This copies `plugins/*.jar` into the emulator, configures the Camera plugin, and
restarts the emulator. Re-run it after `make reset` (the plugins live in the
`arcturus-target` volume, which a full reset wipes).

Verify they loaded:
```bash
docker exec retrotv-arcturus sh -c "tail -200 /tmp/arcturus-emulator-stdout*" | grep -i plugin
# Expect: "Plugin Manager -> Loaded! 3 plugins!"  (NitroWebsockets + Camera + BotProtection)
```

## Bundled plugins (Morningstar 3.5.x — compatible with our emulator)

| Plugin | JAR | What it does |
|--------|-----|--------------|
| **Camera** | `Camera-1.6.jar` | In-game camera — players take/publish photos. Built against `Habbo:3.5.2`. |
| **Bot Protect** | `bot-protection-2.0.jar` | Sterilizes the SSO ticket right after login so it can't be replayed. Recommended for live hotels. |
| _NitroWebsockets_ | _(downloaded by the emulator build)_ | The `ws://…:2096` bridge the Nitro client connects to. |

### Camera configuration
The Camera plugin auto-creates its `emulator_settings` on first launch. The installer
sets Linux-friendly values:

| Setting | Value |
|---------|-------|
| `imager.location.output.camera` | `/app/usercontent/camera/` |
| `imager.location.output.thumbnail` | `/app/usercontent/camera/thumbnail/` |
| `camera.url` | `http://127.0.0.1:8080/camera/` |
| `camera.use.https` | `0` |

The root `docker-compose.yml` mounts a shared `volume-camera` into **both** the emulator
(write side) and the nitro host (`/app/nitro-assets/camera`, served at `:8080/camera/`),
so published photos are viewable. For a public deployment, change `camera.url` to your
domain (e.g. `https://play.yourdomain.com/camera/`) and set `camera.use.https=1`.

## Not bundled: Morningstar 4 (Extended) plugins

duckietm's **Fun Commands** (`:slime`, `:nuke`, super pull/push, brb/afk…) and
**WordGuesser** are built for **Morningstar 4** — the
[Arcturus-Morningstar-Extended](https://github.com/duckietm/Arcturus-Morningstar-Extended)
fork. They do **not** load on our 3.5.x Community emulator (they throw permission/SQL
errors and the Fun Commands README states "FOR Morningstar 4 ONLY").

To run those, RetroTV would need to migrate its game server to the Extended (MS4) fork,
which also uses a different base database (`myBoBBa`). That's a larger change — see the
project notes / ask to switch the `foundation/emulator/arcturus` submodule to the Extended
fork if you want the full MS4 plugin set.

## Adding your own plugins

Drop any 3.5.x-compatible `.jar` into `plugins/` and re-run `make plugins`, or build from
source (each duckietm plugin is a Maven project; `mvn package` against `com.eu.habbo:Habbo`).
