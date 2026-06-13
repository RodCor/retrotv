# 🚀 RetroTV — Deployment & Operations Guide

This guide covers running RetroTV **locally** and on a **remote server**, creating staff
accounts, generating assets, backups, and troubleshooting.

---

## 1. Architecture recap

Four containers on one Docker network (`retrotv`):

| Service | Container | Internal | Host port | Purpose |
|---------|-----------|----------|-----------|---------|
| `mysql` | retrotv-mysql | 3306 | 13306 | MariaDB — all game + CMS data |
| `arcturus` | retrotv-arcturus | 3000 / 3001 / 2096 | 3000 / 3001 / 2096 | Emulator: game socket / RCON / **Nitro websocket** |
| `nitro` | retrotv-nitro | 5154 / 8080 / 8081 | 1080 / 8080 / 8081 | Client / assets / swf servers |
| `cms` | retrotv-cms | 3000 | 3010 | Next.js CMS + Admin CRM |

The CMS and emulator share the same MariaDB. Login flow: CMS writes a random
`users.auth_ticket`, opens the client at `?sso=<ticket>`, emulator validates it.

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

First boot compiles the emulator (~3 min Maven) and builds the client. Watch:
```bash
docker compose logs -f arcturus nitro
```
Wait until you see `Arcturus Morningstar has successfully loaded.` and
`Nitro Websockets Listening on ws://0.0.0.0:2096`.

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
- A Linux box (2+ vCPU, **4 GB RAM minimum**, 8 GB recommended — Maven + JVM + Node).
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

Also set the emulator's allowed origin if needed in
`foundation/emulator/config.ini` (`websockets.whitelist=*` for any origin, or your domain).

### 3.4 Bring it up
```bash
docker compose up -d --build
# generate assets (section 2) once
```

### 3.5 Reverse proxy (HTTPS) — recommended
Put **nginx** / **Caddy** / **Traefik** in front. Example Caddy:
```caddyfile
play.yourdomain.com {
    reverse_proxy 127.0.0.1:1080          # client + assets
}
www.yourdomain.com {
    reverse_proxy 127.0.0.1:3010          # CMS / CRM
}
# Websocket (emulator) — expose :2096 directly or proxy wss:
```
Caddy auto-provisions TLS. The websocket (`:2096`) can be exposed directly or
proxied via a `:443` route with `wss://`.

---

## 4. Make yourself an admin

After registering an account in the CMS, promote it. `ADMIN_MIN_RANK` (default **5**)
is the minimum `users.rank` for the `/admin` CRM. Default Arcturus ranks: 7 = top staff.

```bash
docker exec retrotv-mysql mysql -u arcturus_user -parcturus_pw arcturus \
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

### Recompile the emulator (after editing Java/config)
```bash
docker exec retrotv-arcturus sh -c "cd /app/arcturus && mvn package && cp /app/config.ini target/config.ini"
docker compose restart arcturus
```

### Database backup / restore
```bash
# Backup
docker exec retrotv-mysql mysqldump -u root -parcturus_root_pw arcturus > backup-$(date +%F).sql
# Restore
docker exec -i retrotv-mysql mysql -u root -parcturus_root_pw arcturus < backup-2026-06-13.sql
```

### Update the CMS only
```bash
docker compose up -d --build cms
```

---

## 7. Troubleshooting

| Symptom | Cause / Fix |
|---------|-------------|
| Emulator log: `can't cd to /app/arcturus` / `: not found` | Shell scripts have **CRLF** line endings (Windows checkout). Run `sed -i 's/\r$//' foundation/emulator/scripts/build.sh foundation/nitro/scripts/build.sh foundation/*/supervisor/supervisord.conf foundation/emulator/config.ini` and `docker compose up -d --force-recreate arcturus nitro`. (`.gitattributes` in the repo prevents this on fresh clones.) |
| Client stuck at ~20% / missing textures | Assets not generated. Run the converter (section 2). Check the SWF server: `curl http://127.0.0.1:8081/gamedata/furnidata.xml`. |
| Client loads but can't connect | Websocket URL wrong. Check `renderer-config.json` `socket.url` matches the emulator host:2096 and that 2096 is reachable. |
| CMS: `ECONNREFUSED` to DB | DB not ready or wrong host. Inside compose the CMS uses `DB_HOST=mysql`; locally (CMS on host) use `127.0.0.1:13306`. |
| `/admin` redirects to `/login` even though logged in | Your rank is below `ADMIN_MIN_RANK`. Promote (section 4) and re-login. |
| Login works in CMS but not in-hotel | The hotel uses **SSO**, not username/password. Always enter via the CMS **Play Now** button (it issues a fresh ticket). |
| Port already in use | Edit the host ports in `docker-compose.yml` (left side of `host:container`). |

---

## 8. Resetting everything

```bash
docker compose down -v      # ⚠️ deletes all volumes incl. the database
docker compose up -d --build
```

---

Happy hoteling. 📺
