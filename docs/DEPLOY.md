# 🚀 RetroTV — Deployment & Operations Guide

This guide covers running RetroTV **locally** and on a **remote server**, creating staff
accounts, generating assets, backups, and troubleshooting.

---

## 1. Architecture recap

Four containers on one Docker network (`retrotv`):

| Service | Container | Internal | Host port | Purpose |
|---------|-----------|----------|-----------|---------|
| `mysql` | retrotv-mysql | 3306 | 13306 | **MariaDB 11.4** — database `habbo` (all game + CMS data) |
| `arcturus` | retrotv-arcturus | 3000 / 3001 / 2096 | 3000 / 3001 / 2096 | **Arcturus Morningstar Extended (MS4)**: game socket / RCON / **built-in Nitro websocket** |
| `nitro` | retrotv-nitro | 5154 / 8080 / 8081 | 1080 / 8080 / 8081 | Client / assets / swf servers |
| `cms` | retrotv-cms | 3000 | 3010 | Next.js CMS + Admin CRM |

The CMS and emulator share the same MariaDB (db `habbo`). Login flow: CMS writes a random
`users.auth_ticket`, opens the client at `?sso=<ticket>`, emulator validates it.

> **MariaDB 11.4+ is required** — the Extended (MS4) base database uses the
> `utf8mb4_uca1400` collations, which older MariaDB (10.x) cannot load.
> The game server runs the **prebuilt MS4 release jar** (pinned in
> `emulator/Dockerfile`), so there is no Maven compile step.

---

## 2. Local deployment (development)

### Prerequisites
- **Docker Desktop** (Windows: enable WSL2 integration). That's it.

### Steps
```bash
git clone https://github.com/RodCor/retrotv.git
cd retrotv
git submodule update --init --recursive
cp .env.example .env
# (edit .env — at minimum set a real SESSION_SECRET)
docker compose up -d --build
```

First boot downloads the prebuilt MS4 emulator jar and builds the client. Watch:
```bash
docker compose logs -f arcturus nitro
```
Wait until you see `Arcturus Morningstar has successfully loaded.` and
`WebSocket server started on 0.0.0.0:2096`.

### Generate the client assets (one-time)
The client needs Habbo SWF assets converted to `.nitro` bundles:
```bash
docker exec retrotv-nitro bash -c "cp /app/configuration/nitro-converter/configuration.json /app/nitro-converter/configuration.json"
docker exec retrotv-nitro bash -c "cd /app/nitro-converter; yarn ts-node-dev --transpile-only src/Main.ts"
docker exec retrotv-nitro bash -c "rsync -r /app/nitro-converter/assets/* /app/nitro-assets/"
```
This downloads + converts furniture, figures, effects and pets (several minutes).
After it finishes, hard-refresh the client.

> A `Makefile`/scripts wrapper for these commands is in the repo root (`make assets`).

### Open it
- Hotel: <http://127.0.0.1:1080>
- CMS: <http://127.0.0.1:3010> → Register → **Play Now**

---

## 3. Remote server deployment (production)

### 3.1 Server prerequisites
- A Linux box (2+ vCPU, **4 GB RAM minimum**, 8 GB recommended — JVM + Node).
- Docker Engine + Docker Compose plugin:
  ```bash
  curl -fsSL https://get.docker.com | sh
  ```
- Open/extra: ports **80/443** (reverse proxy), and game port **2096** (websocket) reachable.

### 3.2 Clone & configure
```bash
git clone https://github.com/RodCor/retrotv.git && cd retrotv
git submodule update --init --recursive
cp .env.example .env
```

Edit `.env` for your domain. **Key production values:**
```ini
SESSION_SECRET=<openssl rand -hex 32>
HOTEL_NAME=YourHotel
CLIENT_URL=https://play.yourdomain.com
IMAGING_URL=https://play.yourdomain.com/habbo-imaging
DB_PASSWORD=<a strong password>
DB_ROOT_PASSWORD=<a strong password>
```

### 3.3 Point the client at your public host
The Nitro client config lives in
`foundation/nitro/configuration/nitro-react/public/renderer-config.json` and
`ui-config.json`. Update the host/websocket URLs to your domain, e.g.:
```jsonc
// renderer-config.json
"socket.url": "wss://play.yourdomain.com:2096",
"asset.url": "https://play.yourdomain.com",   // (and the other *.url fields)
```
Then restart the client: `docker compose restart nitro`.

Also set the emulator's websocket origin allow-list if needed in
`emulator/config.ini` (`ws.whitelist=*` for any origin, or your domain) and rebuild the
emulator: `docker compose up -d --build arcturus`.

### 3.4 Bring it up
```bash
docker compose up -d --build
# generate assets (section 2) once
```

### 3.5 HTTPS reverse proxy (production overlay)
The repo ships a ready **Caddy** overlay (`docker-compose.prod.yml` + `Caddyfile`)
that fronts the whole stack with automatic TLS. An HTTPS page can't load `http://`
assets or `ws://` sockets, so it serves everything over HTTPS/WSS on subdomains:

| Subdomain | Proxies to | Purpose |
|---|---|---|
| `play.DOMAIN` | client:80 | the hotel client |
| `crm.DOMAIN` | cms:3000 | CMS / admin CRM |
| `assets.DOMAIN` | nitro:8080 | bundled `.nitro` + gamedata |
| `swf.DOMAIN` | nitro:8081 | furni SWFs, icons, c_images |
| `ws.DOMAIN` | arcturus:2096 | game websocket + API |

```bash
# 1. DNS: point A records for play / crm / assets / swf / ws at the server.
# 2. Set DOMAIN in .env (e.g. DOMAIN=retrotv.example.com).
# 3. Launch with the overlay — the client is auto-pointed at the HTTPS/WSS URLs:
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```
Caddy provisions and renews certificates for each subdomain. The overlay injects
`WS_URL=wss://ws.DOMAIN`, `ASSET_URL=https://assets.DOMAIN/bundled`, etc. into the
client, so there's nothing to edit by hand. Bind the raw service ports (1080,
3010, 8080, 8081, 2096) to `127.0.0.1` or firewall them — Caddy (80/443) is the
only public entry point.

### 3.6 Production hardening checklist
- **Secrets.** `make setup` generates a random `SESSION_SECRET` and DB passwords
  into `.env` on first run. Never deploy the `.env.example` placeholders.
  - *Rotating on an existing install* (the DB password is baked into the volume
    at first init): `ALTER USER 'arcturus_user'@'%' IDENTIFIED BY '<new>';` and
    `ALTER USER 'root'@'%' …`, then update `.env` to match. Changing only
    `SESSION_SECRET` is safe any time (it just logs everyone out).
- **Firewall.** Expose only 80/443 publicly. Keep MariaDB (13306) and RCON (3001)
  bound to localhost / the docker network.
- **CRM furni web-upload (optional).** "Crear mueble nuevo" shells out to the
  converter container, so the dockerized CMS needs the **Docker socket** —
  root-equivalent host access. Enable it only on a trusted/private deployment by
  uncommenting the `cms` socket block in `docker-compose.prod.yml` (set
  `DOCKER_GID`, and add the CMS container IP to `rcon.allowed` in
  `emulator/config.ini`). On internet-facing hotels, leave it off and add furni
  from the host with **`make add-furni`** instead — same pipeline, no socket.

---

## 4. Make yourself an admin

After registering an account in the CMS, promote it. `ADMIN_MIN_RANK` (default **5**)
is the minimum `users.rank` for the `/admin` CRM. Default Arcturus ranks: 7 = top staff.

```bash
docker exec retrotv-mysql mariadb -u arcturus_user -parcturus_pw habbo \
  -e "UPDATE users SET rank=7 WHERE username='YourName';"
```
Log out / back in (so the session cookie picks up the new rank), then visit
<http://127.0.0.1:3010/admin>.

---

## 5. The Admin CRM (`/admin`)

| Page | What you can do |
|------|-----------------|
| Dashboard | Live counts (users, online, rooms, catalog, bans) + recent signups |
| Users | Search; edit rank, credits/pixels/points, motto/look/email; reset password; ban; delete |
| Catalog | Create/hide/delete catalog pages; create/delete shop items |
| Clothing | Figure/look editor with live preview; push a look to any user |
| Rooms | Search; toggle staff-pick & public; delete rooms |
| Ranks | Create/edit/delete permission ranks & badges |
| Moderation | View/lift active bans; ban by username; view recent chatlogs |
| Settings | Edit selected `emulator_settings` |

In-game commands (`:commands` in the client) come from the Arcturus rank
permissions — edit those in **Ranks** or directly in the `permissions` table.

---

## 6. Operations

### Logs
```bash
docker compose logs -f arcturus      # emulator
docker compose logs -f cms           # CMS
docker exec retrotv-arcturus tail -f /var/log/supervisord.log
```

### Restart a single service
```bash
docker compose restart cms
docker compose restart arcturus
```

### Update the emulator (after editing config or plugins)
```bash
# Bump EMU_VERSION in emulator/Dockerfile to upgrade the jar; edit emulator/config.ini
# or drop a jar in emulator/plugins/, then rebuild + restart:
docker compose up -d --build arcturus
```

### Database backup / restore
```bash
# Backup
docker exec retrotv-mysql mariadb-dump -u root -parcturus_root_pw habbo > backup-$(date +%F).sql
# Restore
docker exec -i retrotv-mysql mariadb -u root -parcturus_root_pw habbo < backup-2026-06-13.sql
```

### Update the CMS only
```bash
docker compose up -d --build cms
```

---

## 7. Troubleshooting

| Symptom | Cause / Fix |
|---------|-------------|
| MySQL init: `Unknown collation: 'utf8mb4_uca1400_ai_ci'` | The DB image is too old. The Extended dump needs **MariaDB 11.4+** (set in `docker-compose.yml`). `docker compose down -v && docker compose up -d`. |
| Emulator log: `Table 'habbo.emulator_settings' doesn't exist` / `maxPoolSize < 1` | The DB didn't finish loading (often the collation error above). Reset the DB volume: `docker compose rm -sf mysql && docker volume rm retrotv_volume-mysql && docker compose up -d mysql`. |
| Client connects but stays on the loader | Emulator websocket off. Ensure `ws.enabled=true` in `emulator/config.ini` and that the log shows `WebSocket server started on 0.0.0.0:2096`. |
| Nitro `build.sh: : not found` (Windows) | The nitro submodule scripts have **CRLF** endings. Run `make setup` (or `sed -i 's/\r$//' foundation/nitro/scripts/build.sh foundation/nitro/supervisor/supervisord.conf`) then `docker compose up -d --force-recreate nitro`. |
| Client stuck at ~20% / missing textures | Assets not generated. Run the converter (section 2). Check the SWF server: `curl http://127.0.0.1:8081/gamedata/furnidata.xml`. |
| Client loads but can't connect | Websocket URL wrong. Check `renderer-config.json` `socket.url` matches the emulator host:2096 and that 2096 is reachable. |
| CMS: `ECONNREFUSED` to DB | DB not ready or wrong host. Inside compose the CMS uses `DB_HOST=mysql`; locally (CMS on host) use `127.0.0.1:13306`. |
| `/admin` redirects to `/login` even though logged in | Your rank is below `ADMIN_MIN_RANK`. Promote (section 4) and re-login. |
| Login works in CMS but not in-hotel | The hotel uses **SSO**, not username/password. Always enter via the CMS **Play Now** button (it issues a fresh ticket). |
| Port already in use | Edit the host ports in `docker-compose.yml` (left side of `host:container`). |

---

## 8. Resetting everything

```bash
make backup                 # dump first if you care about the data
make reset                  # ⚠️ docker compose down -v && up --build
```
`make reset` deletes all volumes (including the database) and rebuilds from
scratch. On the fresh volume, `database/*.sql` re-runs in order (`01` → `16`) and
reproduces the hotel exactly: schema + catalog + Spanish content + the migration
fixes (HC duration, user-save column, events table). The set is self-consistent —
there are no public rooms by default (that was an intentional removal). After it
comes up, run `make assets` once and re-create your admin (section 4).

---

Happy hoteling. 📺
