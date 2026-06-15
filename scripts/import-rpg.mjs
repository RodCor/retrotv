#!/usr/bin/env node
/*
 * import-rpg — parse a community's markdown rulebook into rpg_abilities rows.
 *
 * Reads rpg_docs/<ruleset>/*.md (each file = one "rama"/discipline of ability
 * tables), extracts the structured fields (tipo, rango, cost ladder, alcance,
 * requisitos) + a best-effort damage formula, and keeps the full effect prose.
 * Writes a reviewable .sql file (DELETE + INSERT for the ruleset). The few
 * abilities whose effects can't be auto-structured are still fully playable as
 * assisted text — see docs/RPG-RULESETS.md.
 *
 *   node scripts/import-rpg.mjs --src rpg_docs/bhrpg --ruleset 2 --out database/_generated/bhrpg-abilities.sql
 */
import fs from "node:fs";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).join(" ").split(/\s+--/).filter(Boolean)
    .map((s) => s.replace(/^--/, "").split(/\s+/)).map(([k, ...v]) => [k, v.join(" ")]),
);
const SRC = args.src || "rpg_docs/bhrpg";
const RULESET = Number(args.ruleset || 2);
const OUT = args.out || "database/_generated/bhrpg-abilities.sql";

const sq = (s) => "'" + String(s ?? "").replace(/'/g, "''") + "'";
const clean = (s) => String(s ?? "")
  .replace(/\\([+\-.,#|~>!()\[\]{}])/g, "$1") // unescape markdown-escaped punctuation (incl. \+)
  .replace(/\*\*/g, "").replace(/\*/g, "")
  .replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();

/** "35 D | 45 C | 55 B" -> {D:35,C:45,B:55}; or {raw:"Variable"}. */
function parseCost(rei) {
  const pairs = [...String(rei).matchAll(/(\d+)\s*([DCBAS])\b/g)];
  if (!pairs.length) { const t = clean(rei); return t ? { raw: t } : null; }
  const o = {};
  for (const [, v, r] of pairs) o[r] = Number(v);
  return o;
}
function baseCost(costObj) {
  if (!costObj) return 0;
  for (const r of ["D", "C", "B", "A", "S"]) if (costObj[r] != null) return costObj[r];
  return 0;
}

/** "Directo 5, Área 3 sobre el objetivo" -> {shape:'direct', n:5, area:3}. */
function parseRange(al) {
  const a = clean(al).toLowerCase();
  let shape = "", n = 0, area = 0, m;
  if ((m = a.match(/directo\s*(\d+)/))) { shape = "direct"; n = +m[1]; }
  else if (/lineal\s*sala/.test(a)) { shape = "line"; n = 99; }
  else if ((m = a.match(/lineal\s*(\d+)/))) { shape = "line"; n = +m[1]; }
  else if ((m = a.match(/c[oó]nico\s*(\d+)/))) { shape = "cone"; n = +m[1]; }
  else if (/persecutor/.test(a)) { shape = "chase"; n = 6; }
  else if ((m = a.match(/(?:^|\s)alcance\s*(\d+)/))) { shape = "direct"; n = +m[1]; }
  else if (/propio/.test(a)) { shape = "self"; }
  else if (/sala/.test(a)) { shape = "area"; n = 99; }
  if ((m = a.match(/[áa]rea\s*(\d+)/))) { area = +m[1]; if (!shape) { shape = "area"; n = area; } }
  if (!shape && /propio/.test(a)) shape = "self";
  return { shape: shape || "self", n, area };
}

const STAT = "(?:NIVEL|FUE|DEF|VEL|VIT|REI|REIRYOKU|ARMA)";
/** Best-effort: pull a damage formula like "NIVELx1.5 + ARMA + FUE" or
 *  "NIVEL + 40% [x0.4] REI" out of the effect prose. */
function parseFormula(efecto) {
  const t = clean(efecto);
  const TERM = `(?:${STAT}(?:\\s*[x/]\\s*[\\d.]+)?|\\d+(?:\\.\\d+)?%?\\s*(?:\\[x[\\d.]+\\])?\\s*(?:${STAT})?)`;
  const re = new RegExp(`${STAT}(?:\\s*[x/]\\s*[\\d.]+)?(?:\\s*\\+\\s*${TERM}){1,}`, "i");
  const m = t.match(re);
  return m ? m[0].replace(/\s+/g, " ").replace(/\s*\+\s*$/, "").trim() : "";
}

const OLD_SHAPE = { self: "single", direct: "single", chase: "single", line: "line", cone: "cone", area: "radius" };

function field(text, label, until) {
  const re = new RegExp(`\\*\\*${label}\\*?\\*?:?\\*?\\*?\\s*([\\s\\S]*?)\\s*(?:${until})`, "i");
  const m = text.match(re);
  return m ? m[1] : "";
}

function parseDoc(file, rama) {
  const raw = fs.readFileSync(file, "utf8");
  const blocks = raw.split(/\n\s*\n/);
  const out = [];
  for (const block of blocks) {
    if (!/\*\*Tipo/i.test(block) && !/\*\*Reiryoku/i.test(block)) continue; // not an ability table
    const lines = block.split("\n").filter((l) => l.trim().startsWith("|") && !/^\s*\|\s*-+/.test(l));
    if (!lines.length) continue;
    const header = clean(lines[0].replace(/\|/g, " "));
    const name = (header.split(/ [-–] /)[0] || header).trim().slice(0, 70);
    if (!name) continue;
    const statsLine = lines.find((l) => /\*\*Tipo/i.test(l)) || "";
    const efectoLine = lines.find((l) => /\*\*Efecto/i.test(l)) || "";

    const tipo = clean(field(statsLine, "Tipo", "\\*\\*Rango")).replace(/^Habilidad de [^ ]+ /i, "").slice(0, 64);
    const rango = (clean(field(statsLine, "Rango", "\\*\\*Reiryoku|\\*\\*Alcance")).match(/[DCBAS]|-/) || [""])[0];
    const reiryoku = field(statsLine, "Reiryoku", "\\*\\*Alcance");
    const alcance = field(statsLine, "Alcance", "\\*\\*Requisitos|\\|");
    const requisitos = clean(field(statsLine, "Requisitos", "\\|\\s*\\||$")).slice(0, 500);
    const efecto = clean(field(efectoLine, "Efecto", "\\*\\*Aclaraciones|\\|\\s*\\||$")) || clean(efectoLine.replace(/\|/g, " "));

    const cost = parseCost(reiryoku);
    const range = parseRange(alcance);
    out.push({
      name, rama, tipo, rango,
      cost_json: cost ? JSON.stringify(cost) : null,
      base_cost: baseCost(cost),
      range_shape: range.shape, range_n: range.n, area_n: range.area,
      old_shape: OLD_SHAPE[range.shape] || "single",
      formula: parseFormula(efecto).slice(0, 255),
      requisitos,
      effect_text: efecto.slice(0, 4000),
    });
  }
  return out;
}

// ---- run ----
const files = fs.readdirSync(SRC).filter((f) => f.endsWith(".md")).sort();
let all = [];
const perRama = {};
for (const f of files) {
  const rama = f.replace(/_docx\.md$|\.md$/i, "").replace(/_/g, " ");
  const abilities = parseDoc(path.join(SRC, f), rama);
  perRama[rama] = abilities.length;
  all = all.concat(abilities);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const sql = [
  `-- Generated by scripts/import-rpg.mjs from ${SRC}. Do not edit by hand.`,
  `DELETE FROM rpg_abilities WHERE ruleset_id = ${RULESET};`,
  ...all.map((a) =>
    `INSERT INTO rpg_abilities (ruleset_id, name, rama, tipo, rango, cost, cost_json, ` +
    `range_shape, range_n, area_shape, range_tiles, area_size, formula, requisitos, effect_text, cooldown) VALUES (` +
    `${RULESET}, ${sq(a.name)}, ${sq(a.rama)}, ${sq(a.tipo)}, ${sq(a.rango)}, ${a.base_cost}, ` +
    `${a.cost_json ? sq(a.cost_json) : "NULL"}, ${sq(a.range_shape)}, ${a.range_n}, ${sq(a.old_shape)}, ` +
    `${a.range_n}, ${a.area_n}, ${sq(a.formula)}, ${sq(a.requisitos)}, ${sq(a.effect_text)}, 0);`),
].join("\n") + "\n";
fs.writeFileSync(OUT, sql);

console.log(`Parsed ${all.length} abilities from ${files.length} docs -> ${OUT}`);
for (const [r, n] of Object.entries(perRama)) console.log(`  ${r}: ${n}`);
const withFormula = all.filter((a) => a.formula).length;
console.log(`  with auto-extracted formula: ${withFormula}/${all.length}`);
