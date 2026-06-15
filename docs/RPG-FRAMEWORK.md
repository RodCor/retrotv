# 🎲 RetroTV RPG Framework — Scope Draft

> **Status:** draft for review. Nothing built yet. This document scopes a *native,
> server-authoritative* RPG engine so any RPG community can open their hotel here
> and get turns, damage, area/range detection, timers and character sheets as
> first-class hotel features — our differentiator.

---

## 1. Vision

Most Habbo RPGs are run **manually**: a game-master narrates, players roll the
built-in dice, HP is tracked in a notepad, and "area of effect" is eyeballed. The
reference overlay **BHRPG** improves this with *client-side visual aids* (distance
calculator, AoE/range visualizers, turn timer, manual initiative tracker, status
badges, markers, line-of-sight) — but it's a browser extension layered on someone
else's client: **assistive, not enforced**, and HP/damage are still manual.

RetroTV owns **both the client (Nitro) and the server (Arcturus)**, so we can make
these mechanics **native and authoritative**: real stats and HP, server-validated
range/area using the room's actual geometry, enforced turn order, dice and damage
resolved on the server, persistent character sheets. The pitch:

> **"Open your RPG in RetroTV and the combat engine just works."**

Generic by design — communities configure their own ruleset (stats, formulas,
abilities, status effects); nothing is hardcoded to one franchise.

### Core principle: opt-in per room, off by default

The RPG engine must **never** be on hotel-wide — that would clutter normal users'
experience. It is a **per-room toggle owned by the room owner**, set from the
in-room **Room Settings** ("Modo RPG: on/off"), off by default. Only when a room
has RPG mode enabled do the RPG features (combat HUD, targeting overlay, turn
banner, character sheets) appear — and only for people in that room. Every other
room behaves exactly like today. The flag travels with the room data the client
already receives on entry, so the client simply shows or hides the RPG layer.

---

## 2. What BHRPG does — and how we go further

| BHRPG (client overlay, assistive) | RetroTV (native, authoritative) |
|---|---|
| Manhattan distance calculator (manual clicks) | Server computes range from real unit tiles; client previews |
| AoE / cone / line tracker drawn on a guessed grid | AoE resolved on the **actual room grid + heightmap** (true tiles) |
| Movement-range visualizer | Server-validated reachable tiles (walkability from layout) |
| Turn timer + manual initiative tracker | **Enforced** initiative order, auto-advance, server timer |
| HP in notepad, dice = Habbo's built-in | Server HP/resources, server dice + **damage formula** |
| Status badges toggled by hand | Status effects with per-turn ticks, durations, stacking |
| Room-synced OOC chat (61-line relay) | We already have room chat; add a combat-log channel |

We keep BHRPG's *visual* strengths (the tactical overlay is genuinely good) and add
the *authoritative* layer it can't have.

---

## 3. Architecture — where each piece lives

Grounded in what the stack already exposes:

- **Emulator (Arcturus, Java) — the authoritative core.** Has `RoomLayout`/`Room`
  (tiles + heightmap), `RoomUnit` (avatar x/y/z, goals, look-at), `PacketManager`
  (incoming packets), and `WiredTickService` (50 ms real-time loop). Delivered as a
  **plugin** (we already ship baked-in plugins) — no emulator fork — holding:
  combat sessions, turn manager, stats/HP, dice + damage resolution, range/area/LoS
  math, timers, status ticks, persistence.
- **Nitro client (React/TS) — the overlay UI.** We control the source
  (`foundation/nitro/nitro-react`). Renders the combat HUD (HP bars, initiative
  order, turn banner + countdown, action menu), floor highlighting for
  targeting/AoE/movement preview, status badges over avatars, combat log.
- **CMS / DB — configuration & management.** Ruleset editor, character sheets, RPG
  room registration, GM tools. New tables (draft):
  `rpg_rulesets`, `rpg_characters`, `rpg_abilities`, `rpg_status_effects`,
  `rpg_sessions`, `rpg_session_log`.

**Client ↔ server channel.** The HUD needs a few custom messages (start combat,
turn changed, action result, hp/status update). Two options:
- **(A) Custom packets** via `PacketManager` (cleanest, needs a small Nitro patch).
- **(B) Piggyback** on existing primitives (bots, room user-data, wired, chat) for
  a faster MVP with no client packet changes.

Recommendation: **B for the MVP, migrate to A** once the model stabilises.

---

## 4. Feature breakdown (phased)

### Phase 0 — Foundations
- **Per-room RPG toggle in Room Settings** (owner-only, off by default). Store
  `rooms.rpg_enabled` (+ optional `rpg_ruleset_id`); the emulator persists it and
  sends it in the room data on entry; the Nitro Room Settings panel gets a "Modo
  RPG" switch; the client shows/hides the whole RPG layer based on it. *This is the
  gate everything else hangs off — build it first.*
- **Character sheet**: configurable stats — HP, ATK, DEF, SPD/initiative, plus a
  resource pool (mana / "reiatsu" / energy). Per-ruleset.
- **Ability definitions**: name, cost, range, area shape, damage expression,
  cooldown, applied status.

### Phase 1 — Turns & timers *(authoritative)*
- Initiative order (SPD + tiebreak), round/turn tracking, **Next turn**, per-turn
  **countdown** with auto-skip, combat banner in the HUD. *(BHRPG #5/#13, enforced.)*

### Phase 2 — Area & range detection
- Server tile math on the room grid: Manhattan/Chebyshev distance, **line-of-sight**
  (heightmap blocking), AoE shapes (line / cone / radius) from a caster or target,
  reachable-movement tiles. Client renders the highlight **before** confirming.
  *(BHRPG #2/3/4/16/17 — native + validated.)*

### Phase 3 — Damage & abilities
- Use ability → select target/area → server validates range + LoS → rolls dice →
  **damage formula** (ATK vs DEF + modifiers + crit) → applies HP/resource → status
  → broadcasts a combat-log line. Cooldowns enforced. *(Beyond BHRPG.)*

### Phase 4 — Status effects & resources
- Burn / poison / stun / bleed etc. with per-turn ticks (hook `WiredTickService`),
  durations, stacking; resource regen; transformations with cooldowns. *(BHRPG #7/#8.)*

### Phase 5 — GM tools & QoL
- GM controls (force turn, edit HP, spawn enemy bot, start/stop combat), spectator
  HUD, combat-log export, tile markers/labels, **ruleset editor in the CMS** so each
  community sets its own stats/formulas/abilities without code.

---

## 5. Recommended MVP (first vertical slice)

Phase 0 + 1 + thin slices of 2 & 3, end-to-end and demonstrable:

1. **Room Settings → "Modo RPG" toggle** (owner-only): a room turns the engine on;
   the RPG HUD appears only there, for people in that room.
2. Character sheets for that room's participants (HP/ATK/DEF/SPD).
3. **Enforced turn order + per-turn timer** with a HUD banner.
4. A single-target **basic attack**: pick a target in range → server rolls + applies
   damage → HP bar updates → combat-log line.
5. Combat log + HP bars in the client.

To de-risk, the very first prototype can gate RPG mode with a temporary
owner command (e.g. `:rpg on`) before the Room Settings UI is wired — proving the
engine, then moving the switch into settings.

That proves the authoritative loop (turns → action → server resolution → HUD) on
real room geometry. Everything else (AoE, status, abilities, GM tools, ruleset
editor) layers on top.

---

## 6. Key decisions & risks

- **Authoritative vs GM-assisted.** Authoritative = anti-cheat, real engine, but
  more work (server logic + client HUD + a message channel). GM-assisted = faster,
  closer to BHRPG, but trust-based. *Recommend authoritative* — it's the whole point.
- **Custom packets vs piggyback** (see §3). Affects whether v1 needs a Nitro patch.
- **One configurable ruleset vs a full editor.** Start with one built-in,
  config-driven ruleset; promote to a CMS editor in Phase 5.
- **Maintainability.** Keep it a **plugin**, not an emulator fork, so MS4 upgrades
  stay clean. Custom packets are the only piece that may touch client + server.
- **Scope.** This is large and multi-surface (server + client + CMS). Build the MVP
  slice first, demo it, then iterate phase by phase.

---

## 7. Open questions for the team

1. **Authoritative or GM-assisted** for v1? (Recommend authoritative.)
2. The per-room toggle already needs a **small Nitro patch** (Room Settings switch
   + read the flag on entry). Given that, do we also add custom packets for the HUD
   now, or keep combat messaging on bots/wired/chat until the model settles?
3. One **built-in ruleset** to start (configurable), or full ruleset editor up front?
4. First target RPG style to design against — tactical grid combat (FF-Tactics-like,
   as BHRPG) or free-form? It shapes the area/movement rules.
