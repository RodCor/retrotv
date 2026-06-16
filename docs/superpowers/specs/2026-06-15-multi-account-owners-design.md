# Multi-Account Owners — Design

**Date:** 2026-06-15
**Status:** Approved (brainstorm) — pending implementation plan
**Author:** RetroTV + Claude

## Summary

Introduce a **master account ("owner")** identity that owns several in-hotel
avatars. A player logs into the website **as an owner**, sees their avatars in a
full-body carousel, and can launch one or several at once — each avatar opening
in its own browser tab via its own SSO ticket. Every existing player silently
becomes an owner with exactly one avatar, so nothing breaks on rollout.

General-purpose: everyone gets multi-account (capped). Useful for RPG/roleplay
(multiple characters), power users, and staff tooling alike.

## Goals

- One website login identity (owner) owning up to N avatars (default 5).
- Owner picks/launches avatars from a full-body avatar **carousel**.
- Launch several avatars at once, one tab each, from a single click.
- Bans enforce at the **owner** level to stop alt ban-evasion.
- Zero-friction migration: current users keep their credentials and avatar.

## Non-Goals (v1)

- Live owner-ban enforcement *inside* the emulator via a Java plugin
  (data-layer ban cascade is sufficient for v1; emulator plugin is a follow-up).
- Same-IP / duplicate-owner detection at registration.
- Owner self-service avatar deletion (staff-only in v1).
- Avatar renaming.
- "Any owned avatar is staff ⇒ owner is staff" (staff gating stays per active
  avatar in v1).

## Architecture Overview

The **owner** lives entirely in the CMS/database. Avatars stay 100% native
Arcturus `users` rows. The **emulator is untouched** — it still validates a
per-avatar SSO ticket against `users.auth_ticket`. The owner layer adds:

1. an identity/grouping table + FK,
2. owner-based website auth carrying one "active avatar",
3. an avatar-management carousel + creation,
4. per-avatar SSO ticket minting for multi-launch,
5. an owner-ban cascade at the data layer.

```
account_owners (1) ──< users (N)        users.auth_ticket → Arcturus SSO (unchanged)
      │
      └─ website login (owner creds) → session { ownerId, + active avatar fields }
```

## Section 1 — Data Model & Migration

### New table `account_owners`

| column | type | purpose |
|---|---|---|
| `id` | INT PK AI | owner id |
| `username` | VARCHAR(64) UNIQUE | owner login name |
| `email` | VARCHAR(190) | contact / login-by-email |
| `password` | VARCHAR(64) | bcrypt hash — the **website** credential |
| `primary_user_id` | INT NULL | default active avatar |
| `max_avatars` | INT NULL | per-owner override; NULL = global default |
| `banned` | TINYINT(1) DEFAULT 0 | owner-level ban |
| `ban_reason` | VARCHAR(255) NULL | reason |
| `created` | INT | unix ts |
| `last_login` | INT NULL | unix ts |

### `users` change

- Add `owner_id INT NULL`, indexed, FK → `account_owners(id)` ON DELETE SET NULL.
- Otherwise unchanged; avatars remain native Arcturus rows.

### Global cap setting

- One row in Arcturus `emulator_settings`:
  `retrotv.multiaccount.max_avatars` = `5`.
- Single source of truth shared by CMS (and future emulator logic).
- Effective cap for an owner = `account_owners.max_avatars ?? global default`.

### Migration (idempotent, re-runnable)

1. `CREATE TABLE IF NOT EXISTS account_owners …`;
   `ALTER TABLE users ADD COLUMN IF NOT EXISTS owner_id …`.
2. For every existing user **without** an owner, insert one owner copying its
   `username`, `mail`, `password`; set `primary_user_id` to that user.
3. Backfill `users.owner_id` to the matching owner.
4. Insert the `emulator_settings` cap row if absent.

After migration: every current player is an owner with exactly one avatar and
unchanged credentials.

## Section 2 — Auth & the Active Avatar

The whole CMS currently reads `session.userId / username / rank` for one user.
An owner has several avatars with different ranks, so the session carries the
owner **and one "active avatar"**:

```ts
SessionPayload = {
  ownerId: number;     // NEW — the logged-in identity
  ownerName: string;   // NEW
  userId: number;      // active avatar (back-compat: same field as before)
  username: string;    // active avatar
  rank: number;        // active avatar's rank
}
```

- **Login** (`auth.ts`) authenticates against `account_owners` by **username**
  (always unambiguous) **or email** + bcrypt `password`. Because migrated emails
  come from `users.mail` and are **not** guaranteed unique, email login resolves
  only when it matches exactly one owner; otherwise the user is asked to log in by
  username. On success it loads `primary_user_id` as the active avatar and fills
  `userId/username/rank` from that `users` row. Pages that read those fields keep
  working unchanged.
- **Switch avatar**: a server action re-issues the JWT with a different `userId`
  after verifying `avatar.owner_id === session.ownerId`. Header gets an avatar
  switcher. Updates `last_login` as appropriate.
- **Staff gating**: `isStaff(rank)` stays per **active avatar** — a staff member
  switches to their staff avatar to open the CRM. Cleaner security boundary than
  promoting the whole owner.
- **Owner-banned** owners are rejected at login regardless of avatar.

Code touched: `auth.ts` (login + session shape), a new switch-avatar action, and
a `getOwnerAvatars()` helper. Existing pages reading the active-avatar fields are
untouched.

## Section 3 — Avatar Management

A new owner-scoped **`/account`** page (distinct from `/me`, which still shows the
active avatar's public profile).

### Carousel

- Full-body avatar **carousel**: one avatar centered at a time, full-figure
  render via `avatarImageUrl` (full body, large size), arrows/swipe between them.
- Beneath the focused avatar: name, rank, credits, last login.
- Focused-avatar actions: **Set primary**, **Switch to this** (Section 2 action),
  **Launch** (Section 4).
- A trailing **"+" card** opens the create-avatar form when below the cap.

### Create avatar

- Form: hotel username + gender + starter look.
- Enforced against the cap: `COUNT(users WHERE owner_id = me) < effective cap`.
- Writes a native `users` row: `owner_id = me`, a **random** `password` (avatars
  never log in directly — only owner→SSO), plus the same starter defaults
  registration applies (look, motto, credits, home room).
- **Reuse the row-creation logic from `register/actions.ts`** so new avatars are
  identical to normally-registered ones.
- Avatar usernames stay globally unique in `users`. Owner `username` lives in its
  own table, so an owner and an avatar may share a name without colliding.

### Delete avatar

- **v1 = staff-only.** Arcturus user deletion touches many tables; owner
  self-delete is deferred. Follow-up.

### Registration

- A brand-new signup creates an **owner + its first avatar** in one transaction,
  setting `primary_user_id`.

## Section 4 — Launch Flow

- **`/play` becomes the carousel launch screen**, not an instant redirect.
- **Single launch** → server issues that avatar's SSO ticket and redirects the
  tab to `${CLIENT_URL}/?sso=…` (today's behavior, avatar-scoped).
- **Multi launch** → arm several avatars, then **Launch selected**. Handled in
  **one user click** (to dodge pop-up blockers): the handler calls
  **`POST /api/play-ticket { avatarId }`** once per selected avatar, each
  returning a fresh ticket URL; the first opens in the current tab, the rest via
  `window.open()` as new tabs.
- **Ownership check**: `/api/play-ticket` verifies `avatar.owner_id ===
  session.ownerId` before minting a ticket — you can never launch an avatar you
  don't own.
- **Ticket model unchanged**: each avatar keeps its own `users.auth_ticket`; N
  avatars = N independent tickets = N independent Arcturus sessions.

### Known risk — multi-tab concurrency (spike)

Running several Nitro clients in multiple tabs of the **same** browser is the one
unvalidated assumption. Each tab opens its own WebSocket (different users is fine
server-side), but Nitro may share `localStorage` across tabs and clobber itself.

- **Spike before relying on it:** open two avatars in two tabs of one browser,
  confirm both stay connected.
- **Fallback if it clobbers:** document "use separate browser profiles/windows
  for true simultaneous control"; single + sequential launch still works.

## Section 5 — Moderation & Owner-Ban Cascade

- **Owner ban is the enforcement unit.** Banning any avatar cascades: set
  `account_owners.banned = 1` (+ reason) **and** insert an Arcturus `bans` row
  (`type='account'`) for **every** sibling avatar so the emulator refuses all of
  them. Unban reverses both.
- **CMS login** rejects any `banned = 1` owner regardless of avatar credentials.
- **Admin moderation UI** (existing user moderation page) becomes owner-aware:
  viewing a user shows **all sibling avatars** and offers **"Ban owner (all N
  avatars)"** as the primary action; single-avatar ban remains for soft cases.
- **IP/machine bans** stay as Arcturus handles them — owner-ban is layered on top.

## Section 6 — Testing

- **Migration**: idempotent and re-runnable; every existing user ends with exactly
  one owner + `owner_id` backfilled; existing credentials still authenticate.
- **Auth**: login by owner username and by email; active avatar populates
  `userId/username/rank`; switch-avatar rejects unowned avatars; staff gating
  follows the active avatar; banned owner rejected.
- **Avatars**: cap enforced at global default and per-owner override; created
  avatar is a valid playable row (look/credits/home room); primary persists.
- **Launch**: `/api/play-ticket` refuses a foreign `avatarId`; N selections mint N
  distinct tickets; single launch matches today's flow.
- **Moderation**: banning one avatar blocks owner login and all siblings in-hotel;
  unban restores.
- **Spike**: record the two-tabs-one-browser concurrency result and chosen
  fallback.

## Open Follow-ups (post-v1)

- Emulator-side live owner-ban enforcement (Approach 3).
- Same-IP / duplicate-owner detection at registration.
- Owner self-service avatar deletion.
- Optional "any owned avatar is staff" admin convenience.
