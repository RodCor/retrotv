# Multi-Account Owners Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a master "owner" account that owns several native Arcturus avatars; the website logs in as an owner, exposes one active avatar to the existing CMS, lets owners manage/launch avatars from a carousel, and enforces bans at the owner level.

**Architecture:** The owner is a new CMS-side identity (`account_owners`) linked to native `users` rows via `users.owner_id`. The emulator is untouched — it still validates per-avatar SSO tickets. The session JWT carries `ownerId` plus a single "active avatar" (`userId/username/rank`) so existing pages keep working unchanged. Launching mints one SSO ticket per selected avatar; banning any avatar cascades to the whole owner.

**Tech Stack:** Next.js 16 (App Router, Server Components/Actions, TypeScript), MariaDB via `mysql2` (`@/lib/db`), `jose` JWT sessions, `bcryptjs`, Tailwind v4. Arcturus Morningstar emulator (unchanged).

**Spec:** `docs/superpowers/specs/2026-06-15-multi-account-owners-design.md`

### Verification philosophy (read before starting)

This CMS has **no unit-test framework** (no vitest/jest; only Playwright as an unused dep) and the code is almost entirely DB-coupled server actions / RSCs. Per "follow existing patterns / don't unilaterally restructure," this plan does **not** add a test runner. Each task is verified the way the project is actually verified:

- **`npx tsc --noEmit`** (from `cms/`) — type safety after every code change.
- **`npm run build`** (from `cms/`) — catches RSC/route errors.
- **Live DB assertions** via `docker exec retrotv-mysql mariadb -u arcturus_user -p"$DBPW" habbo -N -e "…"` where `DBPW` is read from `.env`.
- **HTTP probes** against the running CMS on `http://localhost:3010`.

A reusable shell prelude for DB assertions (used throughout):
```bash
cd E:/RetroTv && DBPW=$(grep -iE "^DB_PASS|^DB_PASSWORD|^MARIADB" .env | head -1 | cut -d= -f2-)
DBX() { docker exec retrotv-mysql mariadb -u arcturus_user -p"$DBPW" habbo -N -e "$1" 2>&1 | grep -v "Using a password\|World-writable"; }
```

> **Important project rules:** Commit but **do not push** (the user pushes). Commit footer must end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. The CMS runs as a production build on host port 3010 — after CMS changes, `npm run build` then restart `next start` to see them live. Read `cms/AGENTS.md`: this is Next.js 16, consult `node_modules/next/dist/docs/` before using unfamiliar Next APIs.

---

## File Structure

**Created:**
- `database/21-multi-account.sql` — migration: `account_owners`, `users.owner_id`, cap setting.
- `cms/src/lib/owners.ts` — owner/avatar data-access + pure helpers (cap, login resolution, avatar creation).
- `cms/src/app/(site)/account/page.tsx` — owner avatar carousel (server component).
- `cms/src/app/(site)/account/carousel.tsx` — client carousel (`"use client"`).
- `cms/src/app/(site)/account/actions.ts` — create avatar, set primary, switch active avatar.
- `cms/src/app/(site)/play/page.tsx` — launch carousel (replaces the redirect route).
- `cms/src/app/api/play-ticket/route.ts` — POST: mint an SSO ticket for one owned avatar.

**Modified:**
- `cms/src/lib/auth.ts` — `SessionPayload` gains `ownerId`/`ownerName`; add `getOwnerSession()` guard.
- `cms/src/app/(site)/login/actions.ts` — authenticate against owners; load active avatar.
- `cms/src/app/(site)/register/actions.ts` — create owner + first avatar via `owners.ts`.
- `cms/src/app/admin/moderation/actions.ts` — shared single-avatar ban + owner cascade; correct ban `type`.
- `cms/src/app/admin/moderation/page.tsx` — owner-aware (sibling avatars + "ban owner").
- `cms/src/app/admin/moderation/forms.tsx` — add "ban owner" toggle to the form.

**Deleted:**
- `cms/src/app/(site)/play/route.ts` — replaced by `play/page.tsx`.

---

## Task 1: Database migration

**Files:**
- Create: `database/21-multi-account.sql`

- [ ] **Step 1: Write the migration SQL**

Create `database/21-multi-account.sql`:

```sql
-- Multi-account owners: one website identity ("owner") owns several native
-- Arcturus avatars (users rows). Idempotent / re-runnable.

-- 1) The owner identity (website login credential lives here, not on users).
CREATE TABLE IF NOT EXISTS account_owners (
  id              INT(11)      NOT NULL AUTO_INCREMENT,
  username        VARCHAR(64)  NOT NULL,
  email           VARCHAR(190) NULL,
  password        VARCHAR(64)  NOT NULL,
  primary_user_id INT(11)      NULL,
  max_avatars     INT(11)      NULL,
  banned          TINYINT(1)   NOT NULL DEFAULT 0,
  ban_reason      VARCHAR(255) NULL,
  created         INT(11)      NOT NULL DEFAULT 0,
  last_login      INT(11)      NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_owner_username (username),
  KEY idx_owner_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2) Link avatars to their owner.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS owner_id INT(11) NULL;

-- Index (guard against re-run: drop-if-exists then add is awkward in MariaDB;
-- ADD KEY IF NOT EXISTS is supported in MariaDB 10.5+).
ALTER TABLE users
  ADD KEY IF NOT EXISTS idx_users_owner (owner_id);

-- 3) Global avatar cap (per-owner override lives on account_owners.max_avatars).
INSERT IGNORE INTO emulator_settings (`key`, `value`, `comment`)
VALUES ('retrotv.multiaccount.max_avatars', '5',
        'RetroTV: max avatars a single owner account may have');

-- 4) Migrate every existing user into its own 1:1 owner (only when missing).
INSERT INTO account_owners (username, email, password, primary_user_id, created, last_login)
SELECT u.username, u.mail, u.password, u.id,
       COALESCE(u.account_created, UNIX_TIMESTAMP()), u.last_login
  FROM users u
  LEFT JOIN account_owners o ON o.primary_user_id = u.id
 WHERE u.owner_id IS NULL
   AND o.id IS NULL;

-- 5) Backfill users.owner_id from the owner that points at each user.
UPDATE users u
  JOIN account_owners o ON o.primary_user_id = u.id
   SET u.owner_id = o.id
 WHERE u.owner_id IS NULL;
```

- [ ] **Step 2: Apply the migration**

Run (uses the prelude from the header):
```bash
cd E:/RetroTv && DBPW=$(grep -iE "^DB_PASS|^DB_PASSWORD|^MARIADB" .env | head -1 | cut -d= -f2-)
docker exec -i retrotv-mysql mariadb -u arcturus_user -p"$DBPW" habbo < database/21-multi-account.sql 2>&1 | grep -v "Using a password\|World-writable"
```
Expected: no errors (empty output).

- [ ] **Step 3: Verify the schema and 1:1 migration**

```bash
cd E:/RetroTv && DBPW=$(grep -iE "^DB_PASS|^DB_PASSWORD|^MARIADB" .env | head -1 | cut -d= -f2-)
DBX() { docker exec retrotv-mysql mariadb -u arcturus_user -p"$DBPW" habbo -N -e "$1" 2>&1 | grep -v "Using a password\|World-writable"; }
DBX "SELECT (SELECT COUNT(*) FROM users) AS users,
            (SELECT COUNT(*) FROM users WHERE owner_id IS NOT NULL) AS linked,
            (SELECT COUNT(*) FROM account_owners) AS owners,
            (SELECT \`value\` FROM emulator_settings WHERE \`key\`='retrotv.multiaccount.max_avatars') AS cap;"
```
Expected: `linked == users`, `owners == users`, `cap == 5`. (e.g. `5  5  5  5`)

- [ ] **Step 4: Verify idempotency (re-run creates nothing new)**

```bash
cd E:/RetroTv && DBPW=$(grep -iE "^DB_PASS|^DB_PASSWORD|^MARIADB" .env | head -1 | cut -d= -f2-)
docker exec -i retrotv-mysql mariadb -u arcturus_user -p"$DBPW" habbo < database/21-multi-account.sql 2>&1 | grep -v "Using a password\|World-writable"
docker exec retrotv-mysql mariadb -u arcturus_user -p"$DBPW" habbo -N -e "SELECT COUNT(*) FROM account_owners;" 2>&1 | grep -v "Using a password\|World-writable"
```
Expected: same owner count as Step 3 (no duplicates created).

- [ ] **Step 5: Commit**

```bash
cd E:/RetroTv && git add database/21-multi-account.sql
git commit -m "$(printf 'feat(db): account_owners table + users.owner_id + avatar cap\n\nIdempotent migration; every existing user becomes a 1:1 owner.\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 2: Owner data-access helpers

**Files:**
- Create: `cms/src/lib/owners.ts`

- [ ] **Step 1: Write `owners.ts`**

Create `cms/src/lib/owners.ts`:

```ts
import "server-only";
import { headers } from "next/headers";
import { query, queryOne, execute } from "./db";
import { hashPassword } from "./auth";
import { config } from "./config";

export interface OwnerRow {
  id: number;
  username: string;
  email: string | null;
  password: string;
  primary_user_id: number | null;
  max_avatars: number | null;
  banned: number;
  ban_reason: string | null;
  created: number;
  last_login: number | null;
}

export interface AvatarRow {
  id: number;
  username: string;
  look: string;
  motto: string;
  rank: number;
  credits: number;
  last_login: number | null;
  gender: string;
  owner_id: number | null;
}

const GLOBAL_CAP_KEY = "retrotv.multiaccount.max_avatars";
const DEFAULT_CAP = 5;

// Same "join with unlimited coins + permanent HC" defaults registration uses.
const UNLIMITED_CREDITS = 1_000_000_000;
const SUB_INT_MAX = 2_147_483_647;
const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

export async function globalAvatarCap(): Promise<number> {
  const row = await queryOne<{ value: string }>(
    "SELECT `value` FROM emulator_settings WHERE `key` = :k",
    { k: GLOBAL_CAP_KEY },
  );
  const n = Number(row?.value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_CAP;
}

export async function effectiveCap(owner: Pick<OwnerRow, "max_avatars">): Promise<number> {
  if (owner.max_avatars && owner.max_avatars > 0) return owner.max_avatars;
  return globalAvatarCap();
}

export async function getOwnerById(id: number): Promise<OwnerRow | null> {
  return queryOne<OwnerRow>("SELECT * FROM account_owners WHERE id = :id", { id });
}

/**
 * Resolve an owner from a login string: exact username first; otherwise a
 * UNIQUELY-matching email. Returns "ambiguous" when an email matches >1 owner
 * (migrated emails are not unique), so the caller can ask for the username.
 */
export async function resolveOwnerByLogin(
  login: string,
): Promise<OwnerRow | "ambiguous" | null> {
  const l = login.trim();
  if (!l) return null;
  const byName = await queryOne<OwnerRow>(
    "SELECT * FROM account_owners WHERE username = :l",
    { l },
  );
  if (byName) return byName;
  const byEmail = await query<OwnerRow>(
    "SELECT * FROM account_owners WHERE email = :l LIMIT 2",
    { l },
  );
  if (byEmail.length === 1) return byEmail[0];
  if (byEmail.length > 1) return "ambiguous";
  return null;
}

export async function getOwnerAvatars(ownerId: number): Promise<AvatarRow[]> {
  return query<AvatarRow>(
    `SELECT id, username, look, motto, rank, credits, last_login, gender, owner_id
       FROM users WHERE owner_id = :o ORDER BY id`,
    { o: ownerId },
  );
}

/** An avatar row ONLY if it belongs to the given owner (ownership guard). */
export async function getAvatarForOwner(
  ownerId: number,
  avatarId: number,
): Promise<AvatarRow | null> {
  return queryOne<AvatarRow>(
    `SELECT id, username, look, motto, rank, credits, last_login, gender, owner_id
       FROM users WHERE id = :a AND owner_id = :o`,
    { a: avatarId, o: ownerId },
  );
}

async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "127.0.0.1";
}

export type CreateAvatarResult = { id: number } | { error: string };

/**
 * Create a native Arcturus `users` row owned by `ownerId`, with the same
 * starter defaults registration applies (unlimited credits, permanent HC,
 * default look). The avatar gets a random password — it never logs in
 * directly; only the owner does, then SSO carries it into the hotel.
 *
 * Pass `enforceCap=false` only for the very first avatar created alongside a
 * brand-new owner (the owner has no avatars yet by definition).
 */
export async function createAvatar(
  ownerId: number,
  username: string,
  gender: "M" | "F",
  enforceCap = true,
): Promise<CreateAvatarResult> {
  const name = username.trim();
  if (!USERNAME_RE.test(name)) {
    return { error: "El usuario debe tener 3–20 caracteres: letras, números o guiones bajos." };
  }

  const taken = await queryOne<{ id: number }>(
    "SELECT id FROM users WHERE username = :u",
    { u: name },
  );
  if (taken) return { error: "Ese nombre de avatar ya está en uso." };

  if (enforceCap) {
    const owner = await getOwnerById(ownerId);
    if (!owner) return { error: "Cuenta no encontrada." };
    const cap = await effectiveCap(owner);
    const countRow = await queryOne<{ n: number }>(
      "SELECT COUNT(*) AS n FROM users WHERE owner_id = :o",
      { o: ownerId },
    );
    if (Number(countRow?.n ?? 0) >= cap) {
      return { error: `Has alcanzado el máximo de ${cap} avatares.` };
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const ip = await clientIp();
  // Random, unusable-by-the-user emulator password (login is owner-only).
  const randomPass = await hashPassword(`avatar-${ownerId}-${now}-${Math.random()}`);

  const result = await execute(
    `INSERT INTO users
       (username, real_name, password, mail, account_created, last_login,
        last_online, motto, look, gender, rank, credits, pixels, points,
        auth_ticket, ip_register, ip_current, home_room, owner_id)
     VALUES
       (:username, :real_name, :password, :mail, :now, :now,
        :now, :motto, :look, :gender, 1, :credits, :pixels, :points,
        '', :ip, :ip, 0, :ownerId)`,
    {
      username: name,
      real_name: name,
      password: randomPass,
      mail: "",
      now,
      motto: config.hotel.defaultMotto,
      look: config.hotel.defaultLook,
      gender,
      credits: UNLIMITED_CREDITS,
      pixels: config.hotel.startPixels,
      points: config.hotel.startPoints,
      ip,
      ownerId,
    },
  );
  const id = result.insertId;

  await execute(
    `INSERT INTO users_subscriptions
       (user_id, subscription_type, timestamp_start, duration, active)
     VALUES (:id, 'HABBO_CLUB', :now, :duration, 1)`,
    { id, now, duration: SUB_INT_MAX - now },
  );

  return { id };
}
```

- [ ] **Step 2: Type-check**

Run: `cd E:/RetroTv/cms && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd E:/RetroTv && git add cms/src/lib/owners.ts
git commit -m "$(printf 'feat(cms): owner/avatar data-access helpers (owners.ts)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 3: Auth — session shape + owner login

**Files:**
- Modify: `cms/src/lib/auth.ts`
- Modify: `cms/src/app/(site)/login/actions.ts`

- [ ] **Step 1: Extend `SessionPayload` and add an owner guard in `auth.ts`**

In `cms/src/lib/auth.ts`, replace the `SessionPayload` interface:

```ts
export interface SessionPayload {
  ownerId: number;   // the logged-in identity (website account)
  ownerName: string;
  userId: number;    // the active avatar shown to the rest of the CMS
  username: string;
  rank: number;
  [key: string]: unknown;
}
```

Then add, at the end of `auth.ts`:

```ts
/**
 * Like getSession but guarantees an owner identity. Older cookies issued
 * before multi-account lack ownerId; treat those as logged-out so the user
 * re-authenticates into the owner model.
 */
export async function getOwnerSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session || typeof session.ownerId !== "number") return null;
  return session;
}
```

- [ ] **Step 2: Rewrite the login action to authenticate the owner**

Replace the body of `cms/src/app/(site)/login/actions.ts` with:

```ts
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { queryOne, execute } from "@/lib/db";
import {
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  type DbUser,
} from "@/lib/auth";
import { resolveOwnerByLogin } from "@/lib/owners";

export type FormResult = { type: "error" | "success"; text: string };

async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "127.0.0.1";
}

export async function loginAction(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const login = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!login || !password) {
    return { type: "error", text: "Escribe tu nombre de usuario y contraseña." };
  }

  const owner = await resolveOwnerByLogin(login);
  if (owner === "ambiguous") {
    return { type: "error", text: "Ese correo pertenece a varias cuentas. Inicia sesión con tu nombre de usuario." };
  }
  if (!owner || !(await verifyPassword(password, owner.password))) {
    return { type: "error", text: "Usuario o contraseña incorrectos." };
  }
  if (owner.banned) {
    return { type: "error", text: "Esta cuenta está suspendida." };
  }

  // Load the active avatar (the owner's primary, or its first avatar).
  const avatar = await queryOne<DbUser>(
    `SELECT * FROM users
      WHERE id = COALESCE(:primary, 0) OR owner_id = :ownerId
      ORDER BY (id = COALESCE(:primary, 0)) DESC, id ASC
      LIMIT 1`,
    { primary: owner.primary_user_id, ownerId: owner.id },
  );
  if (!avatar) {
    return { type: "error", text: "Tu cuenta no tiene ningún avatar. Contacta con el staff." };
  }

  const now = Math.floor(Date.now() / 1000);
  const ip = await clientIp();
  await execute(
    "UPDATE users SET last_login = :now, ip_current = :ip WHERE id = :id",
    { now, ip, id: avatar.id },
  );
  await execute("UPDATE account_owners SET last_login = :now WHERE id = :id", {
    now,
    id: owner.id,
  });

  const token = await createSessionToken({
    ownerId: owner.id,
    ownerName: owner.username,
    userId: avatar.id,
    username: avatar.username,
    rank: avatar.rank,
  });
  await setSessionCookie(token);

  redirect("/me");
}
```

- [ ] **Step 3: Type-check**

Run: `cd E:/RetroTv/cms && npx tsc --noEmit`
Expected: no errors. (Every `createSessionToken({...})` call site must now include `ownerId`/`ownerName` — register is updated in Task 6; if tsc flags register here, that's expected and fixed in Task 6. To keep this task green, temporarily it is fine because register still type-errors only if it omits required fields — see note.)

> **Note:** `SessionPayload` now requires `ownerId`/`ownerName`. The only other caller of `createSessionToken` is `register/actions.ts` (Task 6). To keep the build green between tasks, do Task 6 immediately after this task before running a full `npm run build`. `tsc` in this step will report the register call site; that is the expected, known gap closed in Task 6.

- [ ] **Step 4: Commit**

```bash
cd E:/RetroTv && git add cms/src/lib/auth.ts "cms/src/app/(site)/login/actions.ts"
git commit -m "$(printf 'feat(cms): owner-based login + active-avatar session\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 4: Registration creates owner + first avatar

**Files:**
- Modify: `cms/src/app/(site)/register/actions.ts`

- [ ] **Step 1: Rewrite registration to create an owner, then its first avatar**

Replace the body of `cms/src/app/(site)/register/actions.ts` with:

```ts
"use server";

import { redirect } from "next/navigation";
import { queryOne, execute } from "@/lib/db";
import {
  hashPassword,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import { createAvatar } from "@/lib/owners";

export type FormResult = { type: "error" | "success"; text: string };

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerAction(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!USERNAME_RE.test(username)) {
    return { type: "error", text: "El usuario debe tener 3–20 caracteres: letras, números o guiones bajos." };
  }
  if (!EMAIL_RE.test(email)) {
    return { type: "error", text: "Introduce un correo electrónico válido." };
  }
  if (password.length < 4) {
    return { type: "error", text: "La contraseña debe tener al menos 4 caracteres." };
  }
  if (password !== confirm) {
    return { type: "error", text: "Las contraseñas no coinciden." };
  }

  // Owner username and the first avatar share the chosen name; both must be free.
  const ownerTaken = await queryOne<{ id: number }>(
    "SELECT id FROM account_owners WHERE username = :u",
    { u: username },
  );
  const avatarTaken = await queryOne<{ id: number }>(
    "SELECT id FROM users WHERE username = :u",
    { u: username },
  );
  if (ownerTaken || avatarTaken) {
    return { type: "error", text: "Ese nombre de usuario ya está en uso." };
  }

  const now = Math.floor(Date.now() / 1000);
  const hashed = await hashPassword(password);

  // 1) Create the owner (website credential).
  const ownerResult = await execute(
    `INSERT INTO account_owners (username, email, password, created)
     VALUES (:username, :email, :password, :now)`,
    { username, email, password: hashed, now },
  );
  const ownerId = ownerResult.insertId;

  // 2) Create its first avatar (cap not enforced — owner has none yet).
  const avatar = await createAvatar(ownerId, username, "M", false);
  if ("error" in avatar) {
    // Roll back the orphan owner so the user can retry cleanly.
    await execute("DELETE FROM account_owners WHERE id = :id", { id: ownerId });
    return { type: "error", text: avatar.error };
  }

  // 3) Point the owner at its primary avatar.
  await execute(
    "UPDATE account_owners SET primary_user_id = :avatarId WHERE id = :ownerId",
    { avatarId: avatar.id, ownerId },
  );

  const token = await createSessionToken({
    ownerId,
    ownerName: username,
    userId: avatar.id,
    username,
    rank: 1,
  });
  await setSessionCookie(token);

  redirect("/me");
}
```

- [ ] **Step 2: Type-check and build**

Run: `cd E:/RetroTv/cms && npx tsc --noEmit && npm run build`
Expected: tsc clean; build succeeds (both `loginAction` and `registerAction` now satisfy `SessionPayload`).

- [ ] **Step 3: Restart the CMS and smoke-test register + login end to end**

```bash
# Rebuild already done. Restart next start on port 3010:
powershell -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { \$_.CommandLine -like '*next*start*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force }"
cd E:/RetroTv/cms && PORT=3010 nohup npm run start >/tmp/cms.log 2>&1 &
sleep 5
```
Then register a throwaway account and confirm DB state:
```bash
cd E:/RetroTv && DBPW=$(grep -iE "^DB_PASS|^DB_PASSWORD|^MARIADB" .env | head -1 | cut -d= -f2-)
DBX() { docker exec retrotv-mysql mariadb -u arcturus_user -p"$DBPW" habbo -N -e "$1" 2>&1 | grep -v "Using a password\|World-writable"; }
# Register via the running app:
curl -s -X POST http://localhost:3010/... # (or register in the browser)
DBX "SELECT o.id, o.username, o.primary_user_id, u.id AS avatar_id, u.owner_id
       FROM account_owners o JOIN users u ON u.id = o.primary_user_id
      ORDER BY o.id DESC LIMIT 1;"
```
Expected: newest owner has `primary_user_id` set, and that avatar's `owner_id` equals the owner id. (Registering through the browser at `http://localhost:3010/register` is the simplest path.)

- [ ] **Step 4: Commit**

```bash
cd E:/RetroTv && git add "cms/src/app/(site)/register/actions.ts"
git commit -m "$(printf 'feat(cms): registration creates owner + first avatar\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 5: Account page — avatar carousel, create, set primary, switch

**Files:**
- Create: `cms/src/app/(site)/account/actions.ts`
- Create: `cms/src/app/(site)/account/carousel.tsx`
- Create: `cms/src/app/(site)/account/page.tsx`

- [ ] **Step 1: Write the account actions**

Create `cms/src/app/(site)/account/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { execute } from "@/lib/db";
import {
  getOwnerSession,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import {
  getOwnerById,
  getAvatarForOwner,
  createAvatar,
} from "@/lib/owners";

export type FormResult = { type: "error" | "success"; text: string };

/** Create a new avatar under the logged-in owner (cap enforced). */
export async function createAvatarAction(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const session = await getOwnerSession();
  if (!session) return { type: "error", text: "No autorizado." };

  const username = String(formData.get("username") ?? "").trim();
  const gender = String(formData.get("gender") ?? "M") === "F" ? "F" : "M";

  const result = await createAvatar(session.ownerId, username, gender);
  if ("error" in result) return { type: "error", text: result.error };

  revalidatePath("/account");
  return { type: "success", text: `Avatar "${username}" creado.` };
}

/** Set which avatar is the owner's default/active on next login. */
export async function setPrimaryAction(formData: FormData): Promise<void> {
  const session = await getOwnerSession();
  if (!session) return;
  const avatarId = Number(formData.get("avatarId"));
  if (!Number.isInteger(avatarId)) return;

  const avatar = await getAvatarForOwner(session.ownerId, avatarId);
  if (!avatar) return; // not yours → ignore

  await execute(
    "UPDATE account_owners SET primary_user_id = :a WHERE id = :o",
    { a: avatarId, o: session.ownerId },
  );
  revalidatePath("/account");
}

/** Switch the active avatar in the current session (re-issues the JWT). */
export async function switchAvatarAction(formData: FormData): Promise<void> {
  const session = await getOwnerSession();
  if (!session) return;
  const avatarId = Number(formData.get("avatarId"));
  if (!Number.isInteger(avatarId)) return;

  const avatar = await getAvatarForOwner(session.ownerId, avatarId);
  if (!avatar) return; // ownership guard

  const owner = await getOwnerById(session.ownerId);
  const token = await createSessionToken({
    ownerId: session.ownerId,
    ownerName: owner?.username ?? session.ownerName,
    userId: avatar.id,
    username: avatar.username,
    rank: avatar.rank,
  });
  await setSessionCookie(token);
  redirect("/account");
}
```

- [ ] **Step 2: Write the client carousel**

Create `cms/src/app/(site)/account/carousel.tsx`:

```tsx
"use client";

import { useActionState, useState } from "react";
import { avatarImageUrl } from "@/lib/habbo-imaging";
import {
  createAvatarAction,
  setPrimaryAction,
  switchAvatarAction,
  type FormResult,
} from "./actions";

export interface AvatarCard {
  id: number;
  username: string;
  look: string;
  motto: string;
  rank: number;
  credits: number;
}

export function AccountCarousel({
  avatars,
  primaryId,
  activeId,
  cap,
}: {
  avatars: AvatarCard[];
  primaryId: number | null;
  activeId: number;
  cap: number;
}) {
  const slots = avatars.length;
  const canCreate = slots < cap;
  const total = slots + (canCreate ? 1 : 0); // trailing "+" card
  const [index, setIndex] = useState(0);
  const [createState, createAction, creating] = useActionState(createAvatarAction, null);

  const go = (d: number) => setIndex((i) => (i + d + total) % total);
  const onCreateSlot = canCreate && index === slots;
  const current = onCreateSlot ? null : avatars[index];

  return (
    <div className="account-carousel">
      <div className="account-stage">
        <button type="button" className="carousel-arrow" onClick={() => go(-1)} aria-label="Anterior" disabled={total <= 1}>‹</button>

        {current ? (
          <div className="avatar-slide">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="avatar-fullbody" src={avatarImageUrl(current.look, { size: "l" })} alt={current.username} />
            <div className="avatar-meta">
              <h2>
                {current.username}
                {current.id === primaryId && <span className="pill">principal</span>}
                {current.id === activeId && <span className="pill pill-active">activo</span>}
              </h2>
              <p className="avatar-motto">{current.motto}</p>
              <p className="avatar-stats">Rango {current.rank} · {current.credits.toLocaleString()} créditos</p>

              <div className="avatar-actions">
                <a className="hbtn hbtn-primary" href={`/play?launch=${current.id}`}>Jugar</a>
                <form action={switchAvatarAction}>
                  <input type="hidden" name="avatarId" value={current.id} />
                  <button className="hbtn" type="submit" disabled={current.id === activeId}>Usar en la web</button>
                </form>
                <form action={setPrimaryAction}>
                  <input type="hidden" name="avatarId" value={current.id} />
                  <button className="hbtn" type="submit" disabled={current.id === primaryId}>Marcar principal</button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="avatar-slide avatar-create">
            <form action={createAction} className="create-form">
              <h2>Nuevo avatar</h2>
              <label>Nombre
                <input name="username" required minLength={3} maxLength={20} placeholder="MiAlt" />
              </label>
              <label>Género
                <select name="gender" defaultValue="M">
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </label>
              <button className="hbtn hbtn-primary" type="submit" disabled={creating}>
                {creating ? "Creando…" : "Crear avatar"}
              </button>
              {createState && (
                <p className={createState.type === "error" ? "msg-error" : "msg-ok"}>{createState.text}</p>
              )}
            </form>
          </div>
        )}

        <button type="button" className="carousel-arrow" onClick={() => go(1)} aria-label="Siguiente" disabled={total <= 1}>›</button>
      </div>

      <div className="carousel-dots">
        {Array.from({ length: total }).map((_, i) => (
          <button key={i} type="button" className={i === index ? "dot dot-on" : "dot"} onClick={() => setIndex(i)} aria-label={`Ir a ${i + 1}`} />
        ))}
      </div>
      <p className="cap-note">{slots} / {cap} avatares</p>
    </div>
  );
}
```

- [ ] **Step 3: Write the account page (server component)**

Create `cms/src/app/(site)/account/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/auth";
import { getOwnerById, getOwnerAvatars, effectiveCap } from "@/lib/owners";
import { AccountCarousel, type AvatarCard } from "./carousel";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getOwnerSession();
  if (!session) redirect("/login");

  const owner = await getOwnerById(session.ownerId);
  if (!owner) redirect("/login");

  const avatars = await getOwnerAvatars(session.ownerId);
  const cap = await effectiveCap(owner);

  const cards: AvatarCard[] = avatars.map((a) => ({
    id: a.id,
    username: a.username,
    look: a.look,
    motto: a.motto,
    rank: a.rank,
    credits: a.credits,
  }));

  return (
    <main className="account-page">
      <header className="account-head">
        <h1>Tus avatares</h1>
        <p>Cuenta <strong>{owner.username}</strong> · elige uno para jugar o crea otro.</p>
      </header>
      <AccountCarousel
        avatars={cards}
        primaryId={owner.primary_user_id}
        activeId={session.userId}
        cap={cap}
      />
    </main>
  );
}
```

- [ ] **Step 4: (Confirmed) full-body avatar URL**

No action needed — verified against `cms/src/lib/habbo-imaging.ts`: `avatarImageUrl(look, { size: "l" })` renders a **full body** (defaults: `direction=2`, `head_direction=2`, `size="l"`, `img_format=png`; `headonly` is only set when `headOnly: true` is passed, which we do not). The `carousel.tsx` call above is correct as written.

- [ ] **Step 5: Add carousel styles**

Append to `cms/src/app/globals.css` (scoped under `.habbo` is unnecessary here since these are page-specific classes; keep them simple and self-contained):

```css
/* --- Multi-account avatar carousel --- */
.account-page { max-width: 720px; margin: 0 auto; padding: 2rem 1rem; }
.account-head h1 { font-size: 1.6rem; font-weight: 800; }
.account-head p { opacity: .8; margin-top: .25rem; }
.account-carousel { margin-top: 1.5rem; }
.account-stage { display: flex; align-items: center; gap: 1rem; }
.carousel-arrow { font-size: 2rem; line-height: 1; width: 2.5rem; height: 2.5rem; border-radius: 999px;
  border: 1px solid rgba(0,0,0,.15); background: #fff; cursor: pointer; }
.carousel-arrow:disabled { opacity: .3; cursor: default; }
.avatar-slide { flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; min-height: 320px; }
.avatar-fullbody { height: 220px; image-rendering: pixelated; }
.avatar-meta h2 { font-size: 1.25rem; font-weight: 800; display: flex; gap: .5rem; align-items: center; justify-content: center; }
.avatar-motto { opacity: .7; font-style: italic; }
.avatar-stats { opacity: .8; font-size: .9rem; margin-top: .25rem; }
.avatar-actions { display: flex; gap: .5rem; flex-wrap: wrap; justify-content: center; margin-top: 1rem; }
.pill { font-size: .7rem; padding: .1rem .5rem; border-radius: 999px; background: #ffd84d; color: #5a4500; }
.pill-active { background: #34e1d4; color: #00312e; }
.hbtn { padding: .45rem .9rem; border-radius: 8px; border: 1px solid rgba(0,0,0,.15); background: #fff; cursor: pointer; font-weight: 700; text-decoration: none; color: inherit; }
.hbtn-primary { background: #34e1d4; border-color: #34e1d4; color: #00312e; }
.hbtn:disabled { opacity: .4; cursor: default; }
.avatar-create .create-form { display: flex; flex-direction: column; gap: .75rem; width: 100%; max-width: 320px; }
.create-form label { display: flex; flex-direction: column; gap: .25rem; text-align: left; font-weight: 700; font-size: .85rem; }
.create-form input, .create-form select { padding: .5rem; border-radius: 8px; border: 1px solid rgba(0,0,0,.2); }
.carousel-dots { display: flex; gap: .4rem; justify-content: center; margin-top: 1rem; }
.dot { width: .6rem; height: .6rem; border-radius: 999px; border: none; background: rgba(0,0,0,.2); cursor: pointer; }
.dot-on { background: #34e1d4; }
.cap-note { text-align: center; opacity: .6; font-size: .8rem; margin-top: .5rem; }
.msg-error { color: #c0344d; font-size: .85rem; }
.msg-ok { color: #1c8a4d; font-size: .85rem; }
```

- [ ] **Step 6: Type-check and build**

Run: `cd E:/RetroTv/cms && npx tsc --noEmit && npm run build`
Expected: clean; route `/account` listed in the build output.

- [ ] **Step 7: Restart CMS and verify the page renders for a logged-in owner**

Restart (as in Task 4 Step 3), log in at `http://localhost:3010/login`, visit `http://localhost:3010/account`. Confirm: full-body avatar shows, arrows cycle, the trailing "+" slot creates an avatar (then re-appears in the carousel), "Marcar principal" and "Usar en la web" work. After creating, verify in DB:
```bash
cd E:/RetroTv && DBPW=$(grep -iE "^DB_PASS|^DB_PASSWORD|^MARIADB" .env | head -1 | cut -d= -f2-)
docker exec retrotv-mysql mariadb -u arcturus_user -p"$DBPW" habbo -N -e "SELECT id, username, owner_id FROM users WHERE owner_id IS NOT NULL ORDER BY id DESC LIMIT 5;" 2>&1 | grep -v "Using a password\|World-writable"
```
Expected: the newly created avatar shares the same `owner_id` as its siblings.

- [ ] **Step 8: Commit**

```bash
cd E:/RetroTv && git add "cms/src/app/(site)/account" cms/src/app/globals.css
git commit -m "$(printf 'feat(cms): account avatar carousel (create/primary/switch)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 6: Launch flow — picker page + per-avatar SSO ticket endpoint

**Files:**
- Create: `cms/src/app/api/play-ticket/route.ts`
- Delete: `cms/src/app/(site)/play/route.ts`
- Create: `cms/src/app/(site)/play/page.tsx`
- Create: `cms/src/app/(site)/play/launcher.tsx`

- [ ] **Step 1: Write the ticket endpoint (ownership-checked)**

Create `cms/src/app/api/play-ticket/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getOwnerSession } from "@/lib/auth";
import { getAvatarForOwner } from "@/lib/owners";
import { issueSsoTicket } from "@/lib/sso";
import { config } from "@/lib/config";

/**
 * POST /api/play-ticket { avatarId } → { url }
 * Mints a fresh SSO ticket for ONE avatar the session owner owns and returns
 * the Nitro client URL. Refuses avatars the owner does not own.
 */
export async function POST(request: NextRequest) {
  const session = await getOwnerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let avatarId: number;
  try {
    const body = await request.json();
    avatarId = Number(body?.avatarId);
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!Number.isInteger(avatarId)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const avatar = await getAvatarForOwner(session.ownerId, avatarId);
  if (!avatar) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const ticket = await issueSsoTicket(avatar.id);
  const url = `${config.hotel.clientUrl}/?sso=${encodeURIComponent(ticket)}`;
  return NextResponse.json({ url });
}
```

- [ ] **Step 2: Delete the old redirect route**

Run: `cd E:/RetroTv && git rm "cms/src/app/(site)/play/route.ts"`
Expected: file removed (a `page.tsx` replaces it in the same segment — a route can't have both).

- [ ] **Step 3: Write the launcher client component**

Create `cms/src/app/(site)/play/launcher.tsx`:

```tsx
"use client";

import { useState } from "react";
import { avatarImageUrl } from "@/lib/habbo-imaging";

export interface LaunchAvatar {
  id: number;
  username: string;
  look: string;
}

async function ticketFor(avatarId: number): Promise<string | null> {
  const res = await fetch("/api/play-ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ avatarId }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { url?: string };
  return data.url ?? null;
}

export function PlayLauncher({
  avatars,
  preselectId,
}: {
  avatars: LaunchAvatar[];
  preselectId?: number;
}) {
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(preselectId ? [preselectId] : avatars.length === 1 ? [avatars[0].id] : []),
  );
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const toggle = (id: number) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Single user click → mint a ticket per avatar, open each in its own tab.
  async function launch() {
    const ids = avatars.filter((a) => selected.has(a.id)).map((a) => a.id);
    if (ids.length === 0) return;
    setBusy(true);
    setNote(null);
    let opened = 0;
    for (let i = 0; i < ids.length; i++) {
      const url = await ticketFor(ids[i]);
      if (!url) continue;
      if (i === 0) {
        window.location.assign(url); // first in the current tab
      } else {
        const w = window.open(url, `retrotv_${ids[i]}`);
        if (w) opened++;
      }
    }
    if (ids.length > 1 && opened < ids.length - 1) {
      setNote("Tu navegador bloqueó algunas pestañas. Permite las ventanas emergentes de este sitio para abrir todos los avatares.");
    }
    setBusy(false);
  }

  return (
    <div className="play-launcher">
      <div className="play-grid">
        {avatars.map((a) => {
          const on = selected.has(a.id);
          return (
            <button
              key={a.id}
              type="button"
              className={on ? "play-card play-card-on" : "play-card"}
              onClick={() => toggle(a.id)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="avatar-fullbody" src={avatarImageUrl(a.look, { size: "l" })} alt={a.username} />
              <span className="play-name">{a.username}</span>
              <span className="play-check">{on ? "✓" : ""}</span>
            </button>
          );
        })}
      </div>
      <div className="play-actions">
        <button className="hbtn hbtn-primary" type="button" onClick={launch} disabled={busy || selected.size === 0}>
          {busy ? "Abriendo…" : selected.size > 1 ? `Jugar (${selected.size} pestañas)` : "Jugar"}
        </button>
      </div>
      {note && <p className="msg-error">{note}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Write the play page (server component)**

Create `cms/src/app/(site)/play/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/auth";
import { getOwnerAvatars } from "@/lib/owners";
import { PlayLauncher, type LaunchAvatar } from "./launcher";

export const dynamic = "force-dynamic";

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ launch?: string }>;
}) {
  const session = await getOwnerSession();
  if (!session) redirect("/login");

  const avatars = await getOwnerAvatars(session.ownerId);
  if (avatars.length === 0) redirect("/account");

  const sp = await searchParams;
  const preselect = Number(sp.launch);

  const list: LaunchAvatar[] = avatars.map((a) => ({
    id: a.id,
    username: a.username,
    look: a.look,
  }));

  return (
    <main className="account-page">
      <header className="account-head">
        <h1>Entrar al hotel</h1>
        <p>Elige uno o varios avatares. Cada uno se abre en su propia pestaña.</p>
      </header>
      <PlayLauncher
        avatars={list}
        preselectId={Number.isInteger(preselect) ? preselect : undefined}
      />
    </main>
  );
}
```

- [ ] **Step 5: Add launcher styles**

Append to `cms/src/app/globals.css`:

```css
/* --- Multi-account play launcher --- */
.play-launcher { margin-top: 1.5rem; }
.play-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem; }
.play-card { position: relative; display: flex; flex-direction: column; align-items: center; gap: .25rem;
  padding: 1rem .5rem; border-radius: 12px; border: 2px solid rgba(0,0,0,.12); background: #fff; cursor: pointer; }
.play-card-on { border-color: #34e1d4; box-shadow: 0 0 0 3px rgba(52,225,212,.25); }
.play-name { font-weight: 700; }
.play-check { position: absolute; top: .4rem; right: .6rem; color: #34e1d4; font-weight: 900; }
.play-actions { display: flex; justify-content: center; margin-top: 1.25rem; }
```

- [ ] **Step 6: Type-check and build**

Run: `cd E:/RetroTv/cms && npx tsc --noEmit && npm run build`
Expected: clean; routes `/play` and `/api/play-ticket` appear; no "conflicting route/page" error for the `play` segment.

- [ ] **Step 7: Restart CMS and verify launch + ownership guard**

Restart, log in, visit `http://localhost:3010/play`. Select one avatar → it opens the client in the same tab. Select two → first navigates current tab, second opens a new tab (allow pop-ups). Then verify the ownership guard rejects a foreign avatar:
```bash
# As a logged-in owner, request a ticket for an avatar id you do NOT own
# (pick an id whose owner_id differs). Replace COOKIE and FOREIGN_ID.
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3010/api/play-ticket \
  -H "Content-Type: application/json" -H "Cookie: retrotv_session=<COOKIE>" \
  --data '{"avatarId": <FOREIGN_ID>}'
```
Expected: `403`. (A valid owned id returns `200` with a `{ url }` body.)

- [ ] **Step 8: Commit**

```bash
cd E:/RetroTv && git add "cms/src/app/(site)/play" cms/src/app/api/play-ticket cms/src/app/globals.css
git commit -m "$(printf 'feat(cms): multi-launch play picker + per-avatar SSO ticket API\n\nReplaces the /play redirect with an avatar picker; launching N avatars\nmints N SSO tickets and opens one tab each. Ownership-checked.\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 7: Moderation — owner-ban cascade

**Files:**
- Modify: `cms/src/app/admin/moderation/actions.ts`
- Modify: `cms/src/app/admin/moderation/forms.tsx`
- Modify: `cms/src/app/admin/moderation/page.tsx`

- [ ] **Step 1: Refactor ban into a shared single-avatar helper + add owner cascade**

Replace the body of `cms/src/app/admin/moderation/actions.ts` with:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { execute, queryOne, query } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";

type ActionResult = { type: "error" | "success"; text: string };

async function requireStaff() {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) return null;
  return session;
}

interface BanTargetRow {
  id: number;
  ip_current: string | null;
  machine_id: string | null;
  owner_id: number | null;
}

/** Insert one Arcturus account ban for a single avatar id. */
async function banAvatar(
  avatar: BanTargetRow,
  staffId: number,
  reason: string,
  expire: number,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await execute(
    `INSERT INTO bans
       (user_id, ip, machine_id, user_staff_id, timestamp, ban_expire, ban_reason, type, cfh_topic)
     VALUES
       (:userId, :ip, :machineId, :staffId, :ts, :expire, :reason, 'account', 0)`,
    {
      userId: avatar.id,
      ip: avatar.ip_current ?? "",
      machineId: avatar.machine_id ?? "",
      staffId,
      ts: now,
      expire,
      reason,
    },
  );
}

async function loadBanTarget(name: string): Promise<BanTargetRow | null> {
  try {
    return await queryOne<BanTargetRow>(
      "SELECT id, ip_current, machine_id, owner_id FROM users WHERE username = :name",
      { name },
    );
  } catch {
    return await queryOne<BanTargetRow>(
      "SELECT id, ip_current, NULL AS machine_id, owner_id FROM users WHERE username = :name",
      { name },
    );
  }
}

/**
 * Ban a user by username. When `wholeOwner` is set, the ban cascades to every
 * avatar of the same owner and flags the owner account so it can't log into
 * the website either.
 */
export async function banUserByName(
  username: string,
  reason: string,
  hours: number,
  wholeOwner = false,
): Promise<ActionResult> {
  const staff = await requireStaff();
  if (!staff) return { type: "error", text: "No autorizado." };

  const name = (username ?? "").trim();
  if (!name) return { type: "error", text: "El usuario es obligatorio." };

  const cleanReason = (reason ?? "").trim() || "Sin motivo especificado";
  const dur = Number(hours);
  if (!Number.isFinite(dur) || dur <= 0) {
    return { type: "error", text: "Las horas deben ser un número positivo." };
  }

  const target = await loadBanTarget(name);
  if (!target) {
    return { type: "error", text: `No se encontró ningún usuario llamado "${name}".` };
  }

  const now = Math.floor(Date.now() / 1000);
  const expire = now + Math.floor(dur * 3600);

  try {
    if (wholeOwner && target.owner_id) {
      const siblings = await query<BanTargetRow>(
        "SELECT id, ip_current, machine_id, owner_id FROM users WHERE owner_id = :o",
        { o: target.owner_id },
      );
      for (const sib of siblings) {
        await banAvatar(sib, staff.userId, cleanReason, expire);
      }
      await execute(
        "UPDATE account_owners SET banned = 1, ban_reason = :reason WHERE id = :o",
        { reason: cleanReason, o: target.owner_id },
      );
      revalidatePath("/admin/moderation");
      return {
        type: "success",
        text: `Cuenta de ${name} baneada (${siblings.length} avatar(es)) durante ${dur} ${dur === 1 ? "hora" : "horas"}.`,
      };
    }

    await banAvatar(target, staff.userId, cleanReason, expire);
  } catch (err) {
    return {
      type: "error",
      text: `No se pudo banear: ${err instanceof Error ? err.message : "error desconocido"}`,
    };
  }

  revalidatePath("/admin/moderation");
  return { type: "success", text: `${name} baneado durante ${dur} ${dur === 1 ? "hora" : "horas"}.` };
}

/** Lift (delete) a ban by id; also clears the owner flag for that avatar's owner. */
export async function deleteBan(formData: FormData): Promise<void> {
  const staff = await requireStaff();
  if (!staff) return;

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;

  // Find the avatar this ban targets so we can clear its owner's flag too.
  const ban = await queryOne<{ user_id: number }>(
    "SELECT user_id FROM bans WHERE id = :id",
    { id },
  );
  await execute("DELETE FROM bans WHERE id = :id", { id });
  if (ban) {
    await execute(
      `UPDATE account_owners SET banned = 0, ban_reason = NULL
        WHERE id = (SELECT owner_id FROM users WHERE id = :uid)`,
      { uid: ban.user_id },
    );
  }
  revalidatePath("/admin/moderation");
}
```

> **Note (deliberate fix):** the previous code inserted `type='USER'`, which is **not** a member of the live `bans.type` enum (`account/ip/machine/super`). This refactor uses the valid `'account'` value so bans actually register. Existing behavior was broken for this DB schema; this corrects it as part of consolidating the ban path.

- [ ] **Step 2: Add a "ban whole owner" toggle to the form**

Replace the entire contents of `cms/src/app/admin/moderation/forms.tsx` with:

```tsx
"use client";

import { useActionState } from "react";
import { Field, ABtn, FormMsg, Ban } from "@/components/admin-ui";
import { banUserByName } from "./actions";

type ActionResult = { type: "error" | "success"; text: string };

async function banAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const username = String(formData.get("username") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const hours = Number(formData.get("hours") ?? 0);
  const wholeOwner = formData.get("wholeOwner") === "on";
  return banUserByName(username, reason, hours, wholeOwner);
}

/** Client form for banning a user, with inline validation messages. */
export function BanUserForm() {
  const [state, formAction, pending] = useActionState(banAction, null);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <Field
          label="Usuario"
          name="username"
          placeholder="HabboName"
          autoComplete="off"
          required
        />
        <Field
          label="Motivo"
          name="reason"
          placeholder="Incumplir las normas…"
          autoComplete="off"
        />
        <Field
          label="Duración (horas)"
          name="hours"
          type="number"
          min={1}
          step={1}
          defaultValue={24}
          required
        />
      </div>
      <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink-soft, #98a0b3)" }}>
        <input type="checkbox" name="wholeOwner" defaultChecked />
        Banear toda la cuenta (todos los avatares del mismo dueño)
      </label>
      <div className="flex items-center gap-3">
        <ABtn type="submit" variant="danger" disabled={pending}>
          <Ban size={14} strokeWidth={2} />
          {pending ? "Baneando…" : "Banear"}
        </ABtn>
      </div>
      <FormMsg message={state} />
    </form>
  );
}
```

- [ ] **Step 3: Make the moderation page owner-aware (sibling avatars)**

In `cms/src/app/admin/moderation/page.tsx`, add a query + panel that lists, for each active ban, the sibling avatars of that ban's owner. Insert after the existing `bans` query (around line 91) this query:

```tsx
interface SiblingRow { owner_id: number; username: string; banned: number }
let siblings: SiblingRow[] = [];
try {
  siblings = await query<SiblingRow>(
    `SELECT u.owner_id, u.username, o.banned
       FROM users u JOIN account_owners o ON o.id = u.owner_id
      WHERE u.owner_id IN (
        SELECT u2.owner_id FROM bans b JOIN users u2 ON u2.id = b.user_id
         WHERE u2.owner_id IS NOT NULL
      )
      ORDER BY u.owner_id, u.id`,
  );
} catch { siblings = []; }
```

Then render a new `ACard` titled "Avatares por cuenta baneada" after the bans table, grouping `siblings` by `owner_id` (a simple `Map<number, SiblingRow[]>` built inline) and showing each owner's avatar usernames with a red `Tag` when `banned`. Keep it presentational; no new actions needed.

- [ ] **Step 4: Type-check and build**

Run: `cd E:/RetroTv/cms && npx tsc --noEmit && npm run build`
Expected: clean.

- [ ] **Step 5: Verify the cascade against the DB**

Restart the CMS. As staff, ban a test owner's avatar with "Banear toda la cuenta" checked. Then:
```bash
cd E:/RetroTv && DBPW=$(grep -iE "^DB_PASS|^DB_PASSWORD|^MARIADB" .env | head -1 | cut -d= -f2-)
DBX() { docker exec retrotv-mysql mariadb -u arcturus_user -p"$DBPW" habbo -N -e "$1" 2>&1 | grep -v "Using a password\|World-writable"; }
# Replace <OWNER_ID> with the test owner:
DBX "SELECT (SELECT COUNT(*) FROM users WHERE owner_id=<OWNER_ID>) AS avatars,
            (SELECT COUNT(*) FROM bans b JOIN users u ON u.id=b.user_id WHERE u.owner_id=<OWNER_ID>) AS bans,
            (SELECT banned FROM account_owners WHERE id=<OWNER_ID>) AS owner_banned;"
```
Expected: `bans == avatars` and `owner_banned == 1`. Confirm login as that owner now returns "Esta cuenta está suspendida." Then lift one ban via the UI and confirm `owner_banned` returns to `0`.

- [ ] **Step 6: Commit**

```bash
cd E:/RetroTv && git add cms/src/app/admin/moderation
git commit -m "$(printf 'feat(cms): owner-level ban cascade + owner-aware moderation\n\nBanning an avatar can cascade to all siblings and flag the owner so it\ncannot log into the website. Fixes invalid bans.type value.\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 8: Navigation + final integration pass

**Files:**
- Modify: the site header/nav component (locate it) to add an "Mi cuenta" link to `/account`.

- [ ] **Step 1: Locate the site nav and add an account link**

Run: `cd E:/RetroTv && grep -rln "href=\"/me\"\|/play\|Cerrar sesión\|logout" "cms/src/app/(site)" cms/src/components | head`
Open the file that renders the logged-in header links (the one containing the `/me` link). Add a link to `/account` labelled "Mis avatares" next to the existing `/me`/`/play` links, following the same markup/classes already used there. Do not restructure the nav — just add one link.

- [ ] **Step 2: Type-check and build**

Run: `cd E:/RetroTv/cms && npx tsc --noEmit && npm run build`
Expected: clean.

- [ ] **Step 3: Full end-to-end walkthrough**

Restart the CMS. With a fresh browser session:
1. **Register** a new account → lands on `/me`; DB shows owner + 1 avatar (Task 4 check).
2. **/account** → create a 2nd and 3rd avatar via the carousel "+"; cap note shows `3 / 5`.
3. Create avatars until the cap is hit → the "+" slot disappears and a 6th creation attempt returns the cap error.
4. **Set primary** to the 2nd avatar; log out and back in → active avatar is the 2nd (check `/me`).
5. **/play** → select all → first opens in-tab, the rest in new tabs (allow pop-ups); each tab logs into the hotel as a different avatar. **Record the multi-tab spike result** (do two tabs stay connected, or does Nitro clobber? note the outcome in the spec's Section 4 risk box).
6. **Ban** that owner (whole account) from `/admin/moderation` (as staff) → owner login blocked, all avatars have bans (Task 7 check). Lift → restored.

- [ ] **Step 4: Record the spike outcome in the spec**

Edit `docs/superpowers/specs/2026-06-15-multi-account-owners-design.md`, in the "Known risk — multi-tab concurrency (spike)" box, append a line: `**Spike result (YYYY-MM-DD):** <observed behavior + chosen fallback>`.

- [ ] **Step 5: Commit**

```bash
cd E:/RetroTv && git add -A
git commit -m "$(printf 'feat(cms): account nav link + record multi-tab spike result\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Self-Review Notes (coverage map)

- Spec §1 Data model & migration → **Task 1**.
- Spec §1 cap setting / effective cap → **Task 1** (row) + **Task 2** (`globalAvatarCap`/`effectiveCap`).
- Spec §2 Auth & active avatar (session shape, owner login, email-uniqueness rule, banned-owner reject, staff per active avatar) → **Task 3** (+ `resolveOwnerByLogin` in Task 2).
- Spec §2 switch avatar → **Task 5** (`switchAvatarAction`).
- Spec §3 Avatar management (carousel, create, cap, primary, "+" card) → **Task 5**; row-creation reuse + registration owner+first avatar → **Task 2** (`createAvatar`) + **Task 4**.
- Spec §3 delete avatar staff-only → no new UI; existing staff user-management path unchanged (explicitly deferred in spec; no task needed).
- Spec §4 Launch flow (picker, single + multi, per-avatar tickets, ownership check, spike) → **Task 6** + spike recorded in **Task 8**.
- Spec §5 Moderation owner-ban cascade + owner-aware UI + login reject → **Task 7** (+ reject in Task 3).
- Spec §6 Testing → folded into each task's verification + the **Task 8** walkthrough.

**Known cross-task ordering constraint:** Task 3 makes `ownerId`/`ownerName` required on `SessionPayload`; Task 4 updates the only other `createSessionToken` caller (register). Run Task 4 immediately after Task 3 before a full `npm run build`.
