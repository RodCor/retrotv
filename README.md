# 📺 RetroTV — a modern Habbo-style retro hotel

RetroTV is a complete, self-hostable **Habbo Hotel-style virtual world**, built with the
current open-source stack used by modern retros (like hobba.tv):

| Layer | Technology | What it does |
|-------|-----------|--------------|
| **Game server** | [Arcturus Morningstar](https://git.krews.org/morningstar/Arcturus-Community) (Java) | The emulator — rooms, avatars, chat, furni, economy, pets, trading… |
| **Game client** | [Nitro React](https://github.com/billsonnn/nitro-react) (HTML5/TypeScript) | The in-browser hotel the players see. No Flash. |
| **Assets** | nitro-converter + swf server | Converts Habbo SWF assets into `.nitro` bundles the client loads |
| **Database** | MariaDB 10.6 | All persistent state (users, rooms, items, catalog…) |
| **CMS + CRM** | **Next.js 16 / React 19** (this repo's `cms/`) | Registration, login, SSO into the hotel, user dashboards, and a full **admin CRM** |

Everything runs with **Docker Compose** — one command brings up the whole hotel.

---

## ✨ Features

**Players**
- Register / log in on a modern, responsive site
- One-click **"Play Now"** — single-sign-on straight into the hotel (no re-login)
- Account dashboard: live avatar, edit look & motto, change password, view credits/pixels/points
- Walk into rooms, chat, decorate, trade, collect furni — the full Arcturus feature set

**Staff — Admin CRM (`/admin`)**
- 📊 **Dashboard** — live stats (users, online, rooms, catalog, bans)
- 👥 **Users** — search, edit rank/credits/look/email, reset passwords, ban, delete
- 🛒 **Catalog** — create/edit/hide catalog pages & shop items
- 👕 **Clothing** — figure/look editor with live avatar preview, push looks to users
- 🏠 **Rooms** — search, feature (staff-pick), toggle public, delete
- ⭐ **Ranks** — manage permission ranks & badges
- 🛡️ **Moderation** — active bans, lift bans, ban by username, chatlog viewer
- ⚙️ **Settings** — edit emulator settings

---

## 🚀 Quick start (local, Docker)

**Prerequisites:** [Docker Desktop](https://www.docker.com/get-started/) (with WSL2 on Windows). Nothing else — Java, Node, MySQL all run in containers.

```bash
git clone https://github.com/RodCor/retrotv.git
cd retrotv
git submodule update --init --recursive   # pulls the emulator + client sources
cp .env.example .env                       # then edit SESSION_SECRET
docker compose up -d --build
```

⏳ **First boot takes ~10 minutes** — the emulator compiles (Maven) and the client builds.
Watch progress with `docker compose logs -f arcturus nitro`.

Once up:

| URL | What |
|-----|------|
| http://127.0.0.1:1080 | 🎮 The hotel (Nitro client) |
| http://127.0.0.1:3010 | 🌐 CMS — register, login, **Play Now** |
| http://127.0.0.1:3010/admin | 🛠️ Admin CRM (needs a staff-rank account) |

**To play:** open the CMS → Register → from your dashboard click **Play Now**. It issues an
SSO ticket and drops you into the hotel.

> The first-run database ships with a default SSO ticket `123`, so http://127.0.0.1:1080?sso=123
> also works for a quick smoke test before you register.

Optional — install the bundled emulator plugins (in-game **Camera** + **Bot Protect**):
```bash
make plugins
```

See **[docs/DEPLOY.md](docs/DEPLOY.md)** for production/another-server deployment, making
yourself an admin, backups, and troubleshooting, and **[docs/PLUGINS.md](docs/PLUGINS.md)**
for the emulator plugins (and the Morningstar 4 / Extended note).

---

## 🗂️ Repository layout

```
retrotv/
├── docker-compose.yml      # the whole stack (mysql · arcturus · nitro · cms)
├── .env.example            # configuration
├── cms/                    # Next.js 16 CMS + Admin CRM  (this repo's own code)
├── foundation/             # the engine (Arcturus + Nitro + assets, via submodules)
│   ├── emulator/           #   Java game server + Dockerfile + config.ini
│   ├── nitro/              #   client, asset converter, swf server
│   └── mysql/dumps/        #   base Arcturus database
└── docs/DEPLOY.md          # deployment & operations guide
```

---

## 🧱 How the pieces talk

```
 Browser ──HTTP──► CMS (Next.js, :3010) ──SQL──► MariaDB (:3306)
    │                    │  sets users.auth_ticket, redirects with ?sso=<ticket>
    │                    ▼
    └────────► Nitro client (:1080) ──WebSocket :2096──► Arcturus emulator ──SQL──► MariaDB
                         ▲
                         └── assets (:8080) / swf (:8081)
```

The CMS and the emulator share **one MariaDB**. The CMS writes a random `auth_ticket` onto the
user row and opens the client at `?sso=<ticket>`; the emulator validates that ticket and logs
the player in. That's the standard Habbo CMS ↔ emulator handshake.

---

## ⚖️ Legal

RetroTV is a fan-made, educational project. It is **not affiliated with or endorsed by Sulake
Corporation**. "Habbo" is a trademark of Sulake. You are responsible for the assets you use.
The emulator (Arcturus Morningstar) and client (Nitro) are the property of their respective
authors under their own licenses.
```
