#!/usr/bin/env node
/*
 * add-furni — register a brand-new furni (from a .swf) into the running hotel.
 *
 * Pipeline (all validated against the live stack):
 *   1. stage the SWF into the nitro-converter and run its --convert-swf mode
 *      -> produces a .nitro bundle (the client-side furni assets)
 *   2. deploy the .nitro to the asset server (8080/bundled/furniture)
 *   3. register the furni in furnidata.xml (source of truth) AND FurnitureData.json
 *      (what the client reads) so the client knows its class/size/behaviour
 *   4. insert the items_base row so the emulator knows the furni
 *   5. best-effort hot-reload the emulator (:update_items + :update_catalog via an
 *      online staff member); otherwise the furni loads on the next emulator restart
 *
 * Usage:
 *   node scripts/add-furni.mjs --swf <path|url> --class <classname> --name "<name>" \
 *     [--type floor|wall] [--x 1] [--y 1] [--z 0] [--category chair] \
 *     [--siton] [--layon] [--standon] [--revision 1] [--description "..."]
 *
 * Then refresh the client to fetch the new assets. Add it to the shop from the
 * CRM (Mobiliario) or with --page <id> --credits <n> to also create a catalog offer.
 */
import { execFileSync } from "node:child_process";
import net from "node:net";
import fs from "node:fs";

const NITRO = process.env.NITRO_CONTAINER || "retrotv-nitro";
const MYSQL = process.env.MYSQL_CONTAINER || "retrotv-mysql";
const DB = process.env.DB_NAME || "habbo";
const DB_ROOT_PW = process.env.DB_ROOT_PASSWORD || "arcturus_root_pw";
const RCON_HOST = process.env.RCON_HOST || "127.0.0.1";
const RCON_PORT = Number(process.env.RCON_PORT || 3001);

// ----- tiny arg parser -------------------------------------------------------
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}
const args = parseArgs(process.argv.slice(2));
const die = (m) => { console.error(`\n✖ ${m}\n`); process.exit(1); };

// ----- shell helpers (execFile -> no shell escaping pitfalls) -----------------
const docker = (a, opts = {}) =>
  execFileSync("docker", a, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], ...opts });
function sql(query) {
  return docker([
    "exec", MYSQL, "mariadb", "-uroot", `-p${DB_ROOT_PW}`, DB, "-N", "-B", "-e", query,
  ]).trim();
}
function rconSend(key, data) {
  return new Promise((resolve) => {
    const s = net.createConnection({ host: RCON_HOST, port: RCON_PORT });
    let resp = ""; let done = false;
    const fin = () => { if (done) return; done = true; s.destroy(); resolve(resp); };
    s.setTimeout(2500);
    s.on("connect", () => s.write(JSON.stringify({ key, data })));
    s.on("data", (b) => (resp += b.toString()));
    s.on("end", fin); s.on("close", fin); s.on("timeout", fin); s.on("error", fin);
  });
}

// ----- validate inputs -------------------------------------------------------
const className = String(args.class || "").trim();
const name = String(args.name || "").trim();
const swf = String(args.swf || "").trim();
if (!swf) die("--swf <path|url> is required");
if (!/^[a-z0-9_]+$/i.test(className)) die("--class must be a classname like retrotv_chair ([a-z0-9_])");
if (!name) die("--name \"<display name>\" is required");

const isWall = String(args.type || "floor").toLowerCase() === "wall";
const xdim = Number(args.x ?? 1), ydim = Number(args.y ?? 1);
const stackHeight = Number(args.z ?? 0);
const revision = Number(args.revision ?? 1);
const category = String(args.category || (isWall ? "wall" : "floor"));
const description = String(args.description || "");
const siton = "siton" in args, layon = "layon" in args, standon = "standon" in args;

const baseType = isWall ? "i" : "s";
const section = isWall ? "wallitemtypes" : "roomitemtypes";

console.log(`\n▶ Adding furni "${className}" (${name}) — ${isWall ? "wall" : "floor"} ${xdim}x${ydim}\n`);

// ----- guard: class must not already exist -----------------------------------
const exists = sql(`SELECT COUNT(*) FROM items_base WHERE item_name = '${className}'`);
if (Number(exists) > 0) die(`A furni named "${className}" already exists in items_base. Aborting.`);

// ----- pick a free sprite/furni id -------------------------------------------
const nextId = Number(sql("SELECT GREATEST(COALESCE(MAX(id),0), COALESCE(MAX(sprite_id),0)) + 1 FROM items_base"));
console.log(`• furni id = ${nextId}`);

// ----- 1) stage the SWF + convert to .nitro ----------------------------------
const STAGE = "/app/nitro-converter/assets/swf/furniture";
docker(["exec", NITRO, "sh", "-c", `mkdir -p ${STAGE} && rm -f ${STAGE}/*.swf`]);
if (/^https?:\/\//i.test(swf)) {
  console.log(`• downloading SWF: ${swf}`);
  docker(["exec", NITRO, "sh", "-c", `curl -fsSL -o ${STAGE}/${className}.swf '${swf}'`]);
} else {
  if (!fs.existsSync(swf)) die(`SWF file not found: ${swf}`);
  console.log(`• staging local SWF: ${swf}`);
  docker(["cp", swf, `${NITRO}:${STAGE}/${className}.swf`]);
}

console.log("• converting SWF → .nitro …");
docker([
  "exec", NITRO, "bash", "-c",
  "cd /app/nitro-converter && yarn ts-node-dev --transpile-only src/Main.ts --convert-swf",
], { stdio: ["pipe", "inherit", "inherit"] });

const nitroPath = `/app/nitro-converter/assets/bundled/furniture/${className}.nitro`;
const ok = docker(["exec", NITRO, "sh", "-c", `test -f ${nitroPath} && echo yes || echo no`]).trim();
if (ok !== "yes") die("Conversion failed — no .nitro produced. Is the SWF a valid Habbo furni SWF?");

// ----- 2) deploy .nitro to the asset server ----------------------------------
docker(["exec", NITRO, "sh", "-c",
  `mkdir -p /app/nitro-assets/bundled/furniture && cp ${nitroPath} /app/nitro-assets/bundled/furniture/${className}.nitro`]);
console.log("• deployed .nitro to asset server");

// ----- 3) register in FurnitureData.json + furnidata.xml ----------------------
const entry = {
  id: nextId, classname: className, revision, category, defaultdir: 0,
  xdim, ydim, partcolors: { color: ["#0", "#0", "#0"] }, name, description,
  adurl: "", offerid: -1, buyout: false, rentofferid: -1, rentbuyout: false,
  bc: false, excludeddynamic: false, customparams: "", specialtype: 1,
  canstandon: standon, cansiton: siton, canlayon: layon, furniline: "", environment: "", rare: false,
};
docker(["exec", "-e", `ENTRY=${JSON.stringify(entry)}`, "-e", `SECTION=${section}`, NITRO, "node", "-e", `
  const fs = require('fs');
  const p = '/app/nitro-assets/gamedata/FurnitureData.json';
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  const e = JSON.parse(process.env.ENTRY), s = process.env.SECTION;
  d[s] = d[s] || { furnitype: [] };
  d[s].furnitype = d[s].furnitype.filter(f => f.classname !== e.classname);
  d[s].furnitype.push(e);
  fs.writeFileSync(p, JSON.stringify(d));
  console.log('• FurnitureData.json updated ('+d[s].furnitype.length+' '+s+')');
`], { stdio: ["pipe", "inherit", "inherit"] });

// furnidata.xml (source of truth — keeps the entry across future `make assets`)
const xmlEntry =
  `<furnitype id="${nextId}" classname="${className}">` +
  `<revision>${revision}</revision><category>${category}</category><defaultdir>0</defaultdir>` +
  `<xdim>${xdim}</xdim><ydim>${ydim}</ydim>` +
  `<partcolors><color>#0</color><color>#0</color><color>#0</color></partcolors>` +
  `<name>${name.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</name><description>${description.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</description>` +
  `<adurl></adurl><offerid>-1</offerid><buyout>0</buyout><rentofferid>-1</rentofferid><rentbuyout>0</rentbuyout>` +
  `<bc>0</bc><excludeddynamic>0</excludeddynamic><customparams></customparams><specialtype>1</specialtype>` +
  `<canstandon>${standon ? 1 : 0}</canstandon><cansiton>${siton ? 1 : 0}</cansiton><canlayon>${layon ? 1 : 0}</canlayon></furnitype>`;
docker(["exec", "-e", `XML=${xmlEntry}`, "-e", `SECTION=${section}`, "-e", `CLASS=${className}`, NITRO, "node", "-e", `
  const fs = require('fs');
  const p = '/app/nitro-swf/gamedata/furnidata.xml';
  if (!fs.existsSync(p)) { console.log('• furnidata.xml not found — skipping (FurnitureData.json is live)'); process.exit(0); }
  let xml = fs.readFileSync(p, 'utf8');
  if (xml.includes('classname="'+process.env.CLASS+'"')) { console.log('• furnidata.xml already has '+process.env.CLASS); process.exit(0); }
  const open = '<'+process.env.SECTION+'>';
  if (xml.includes(open)) { xml = xml.replace(open, open + process.env.XML); fs.writeFileSync(p, xml); console.log('• furnidata.xml updated'); }
  else console.log('• <'+process.env.SECTION+'> not found in furnidata.xml — skipped');
`], { stdio: ["pipe", "inherit", "inherit"] });

// ----- 4) insert items_base --------------------------------------------------
const esc = (s) => String(s).replace(/'/g, "''");
sql(
  `INSERT INTO items_base
     (id, sprite_id, public_name, item_name, type, width, length, stack_height,
      allow_stack, allow_sit, allow_lay, allow_walk, interaction_type, interaction_modes_count, customparams)
   VALUES
     (${nextId}, ${nextId}, '${esc(name)}', '${esc(className)}', '${baseType}', ${xdim}, ${ydim}, ${stackHeight},
      1, ${siton ? 1 : 0}, ${layon ? 1 : 0}, ${standon ? 1 : 0}, 'default', 1, '')`,
);
console.log(`• items_base row inserted (id ${nextId})`);

// ----- 5) hot-reload the emulator (best effort) ------------------------------
const staffId = Number(sql("SELECT id FROM users WHERE online = '1' ORDER BY rank DESC LIMIT 1") || 0);
let reloaded = false;
if (staffId > 0) {
  await rconSend("executecommand", { user_id: staffId, command: ":update_items" });
  await rconSend("updatecatalog", {});
  reloaded = true;
}

console.log(`\n✓ Furni "${className}" added.`);
console.log(reloaded
  ? "  Emulator hot-reloaded (items + catalog). Refresh the client to load the new assets."
  : "  No staff online to hot-reload — run `make emu-restart` (or :update_items in-game) so the emulator picks it up. Refresh the client afterwards.");
console.log("  Add it to the shop from the CRM → Mobiliario.\n");
