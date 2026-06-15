# 🧩 RetroTV RPG — data-driven rulesets & RPG import

> Goal: any RPG community can run in RetroTV with **their own rules**. We model
> rules as **data** (not code), auto-resolve the mechanical core (cost, range,
> area, damage formula, common effects), and surface the rest as text — turning
> text-roleplay into an *assisted, server-authoritative* experience. The first
> ruleset imported is **BHRPG** (a Bleach tactical RPG, ~14 disciplines, ~200+
> abilities; docs in `rpg_docs/bhrpg`).

---

## 1. What BHRPG taught us (the universal shape)

Across all 14 discipline docs the structure is the same — which is the whole
point: it generalises.

**Stats / resources** (configurable per ruleset): `NIVEL` (level), `FUE` (atk),
`DEF`, `VIT` (hp), `VEL` (speed + movement budget), `REI` (resource, also a
damage input), `ARMA` (weapon), `EXP`, plus **rango** D→S, **clase/etapa**
(Gillian→…→Arrancar), and `VR` (reaction tier).

**Every ability is the same record:**
- `tipo[]` — ofensiva / defensiva / suplementaria / reactiva / pasiva / entrenamiento
- `rango` — D C B A S
- **cost** — a rank-scaled ladder (`35 D | 45 C | 55 B | 65 A | 75 S`), with
  variants: flat, `por proyectil`, upkeep (`+10 REI/turno`), `Variable`, `% REI`.
- **alcance** — a shape + N: `Propio · Directo N · Lineal N · Cónico N · Área N ·
  Persecutor`, optionally compound (`Directo 5, Área 3 sobre el objetivo`).
- **requisitos** — rango + EXP + prerequisite abilities + combat feats.
- **efecto** — a damage **formula** (`NIVELx1.5 + ARMA + FUE`, `NIVEL + 40% REI`)
  plus a list of **effects** (below), often with *dominio*-tier upgrades.

**Effect taxonomy** (the universe of mechanics to model):
damage (physical/energy) · DoT (Hemorragia/Quemadura/Veneno) · status
(Aturdimiento/Paralizado/Inmovilización/Desarme/…) · stat buff/debuff with a
**duration unit** (acción / acción general / turno / ronda / combate) · movement
(push/knockback/pull/teleport) · reactive/trigger (anticipación/contraataque) ·
cooldown / limited-use · ignore-defense (% , stacks past 100%) · resource
drain/refund · terrain/zones · multi-hit/projectiles · transformations.

**Damage formulas** are additive scaled-stat expressions: tokens
`NIVEL FUE DEF VEL REI ARMA`, operators `+  xN  /N`, percent `N% [x0.NN]` (a
fraction of a stat) and post-multipliers `[x1.NN]` (final-damage), defense-ignore.

---

## 2. The realistic boundary: **automate the core, assist the rest**

Fully automating every conditional/reactive/dominio-tier BHRPG effect is
impractical (200+ abilities, deeply narrative). But the **mechanical core is
automatable**, and that's 80% of the friction in text-roleplay:

| Engine auto-resolves | GM/players still narrate (shown as text) |
|---|---|
| resource cost & cooldown | reactive/anticipation timing windows |
| **range + area** on the real grid (we already do this) | conditional "if blocked / if undefended" branches |
| **damage** from the formula (ATK/level/REI/… vs DEF) | dominio-tier upgrades, once-per-combat panic effects |
| simple **status / DoT** (bleed/burn/stun ticks) | terrain, summons, transformations |
| **push/knockback**, basic buffs/debuffs with durations | anything not yet expressible |

Every ability **always shows its full `efecto` text**, so nothing is lost — the
engine just does the math, positioning, dice, HP and the common effects for you.
This is a massive upgrade over pure text-roleplay **and** is generic.

---

## 3. Generalised data model

Per-**ruleset** (one community = one ruleset), all data-driven:

- **`rpg_rulesets`** — name + a `config` JSON: the stat list, dice, rank ladder,
  duration units, default formulas.
- **`rpg_characters`** — generic stat columns mapped per ruleset. BHRPG mapping:
  `VIT=hp, FUE=atk, DEF=def, VEL=spd, REI=resource` + add `nivel, arma, rango,
  rama, etapa`.
- **`rpg_abilities`** — enriched:
  `rama, tipo, rango, cost_json (ladder/variants), range_shape, range_n, area_n,
  formula (engine-evaluable), effects_json (typed nodes), effect_text (full prose),
  requisitos_json, cooldown`.
- **`rpg_status_effects`** — name, kind, `per_turn` formula, duration + unit, stacks.

**Effect node** (in `effects_json`, what the engine applies):
`{type: damage|dot|status|buff|debuff|push|move|resource|ignore_def, formula?,
status?, stat?, amount?, tiles?, duration?, unit?}`. Unknown/complex effects live
only in `effect_text`.

**Formula engine** (plugin): a small evaluator for
`NIVEL + FUE*2 + 0.4*REI - target.DEF` against caster/target stats — the one new
piece of engine code; everything else is the combat loop we already have.

---

## 4. The import pipeline (what makes it "automatic")

A parser turns a community's rulebook into ability rows:

1. **Parse** each markdown discipline → split ability tables.
2. **Extract** the structured fields: name, `tipo`, `rango`, the `cost` ladder
   (`35 D | 45 C…` → map), `alcance` (`Directo 1` / `Área 2` → shape + N),
   `requisitos`, and the raw `efecto`.
3. **Best-effort formula**: regex the `NIVEL + FUE… + N% REI` pattern out of the
   `efecto` into `formula`; tag obvious effects (Hemorragia/Aturdimiento/push) as
   effect nodes. Everything else → `effect_text`.
4. **Load** as `rpg_abilities` rows under the ruleset.

Result: ~200 BHRPG abilities become playable data automatically; a GM tweaks the
few that need it in the CRM. The same parser (or a generic CSV/JSON importer)
onboards the next RPG.

---

## 5. Phased plan

- **P1 — Schema + importer.** Enrich the tables; write the BHRPG doc parser;
  import all abilities (structured fields + effect_text). *Deliverable: every
  BHRPG ability searchable/listable; combat can already use cost/range/area + the
  base formula.*
- **P2 — Formula engine + effect nodes.** Evaluate `formula`; auto-apply
  damage + simple status/DoT/push from `effects_json`; `effect_text` shown for the
  rest. Extend the HUD to show ability cost/range/effect.
- **P3 — Status-effect runtime.** DoT ticks, timed buffs/debuffs in the turn loop
  (we have `WiredTickService` + the turn system).
- **P4 — CRM ruleset/ability editor.** Per-RPG personalisation: edit stats,
  abilities, formulas, effects without code; character sheets per ruleset.
- **P5 — Progression (optional).** ranks/EXP/prereqs/etapas, trainings.

**Recommended MVP:** P1 + a thin P2 — import BHRPG, and make a handful of clean
"core" abilities (e.g. a Cero, a Zangeki, a Bala) fully auto-resolve via the
formula engine, with the rest playable as assisted text. That proves the whole
pipeline on a real ruleset.

---

## 6. Open decisions

1. **Automation depth for v1** — auto-resolve only the core (cost/range/area/
   formula-damage/basic status) and show text for the rest (recommended), or push
   further into conditional effects?
2. **Stats** — keep our 4-stat combat (HP/ATK/DEF/SPD) as the engine's internal
   model and *map* ruleset stats onto it, or store the full BHRPG stat set
   natively? (Recommend native generic stats so formulas read like the rulebook.)
3. **Import target** — start by importing **all** abilities as data (even if many
   are text-only at first), or curate a **core set** that fully auto-resolves?
   (Recommend: import all + auto-resolve a curated core.)
