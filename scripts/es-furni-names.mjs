// Overlays Spanish furni names/descriptions from a habbo.es furnidata_json onto a
// Nitro FurnitureData.json (which our converter builds from habbo.com = English).
// Matched by classname; only name/description are touched, sprites are untouched.
//
//   node es-furni-names.mjs <es-furnidata.json> <FurnitureData.json>
import fs from "fs";

const [, , esPath, fdPath] = process.argv;
if (!esPath || !fdPath) {
  console.error("usage: node es-furni-names.mjs <es-furnidata.json> <FurnitureData.json>");
  process.exit(1);
}

const es = JSON.parse(fs.readFileSync(esPath, "utf8"));
const fd = JSON.parse(fs.readFileSync(fdPath, "utf8"));

const map = new Map();
for (const sec of ["roomitemtypes", "wallitemtypes"]) {
  for (const f of es[sec]?.furnitype ?? []) {
    if (f.classname) map.set(f.classname, { name: f.name, description: f.description });
  }
}

let patched = 0;
for (const sec of ["roomitemtypes", "wallitemtypes"]) {
  for (const f of fd[sec]?.furnitype ?? []) {
    const s = map.get(f.classname);
    if (!s) continue;
    if (s.name) f.name = s.name;
    if (s.description != null) f.description = s.description;
    patched++;
  }
}

fs.writeFileSync(fdPath, JSON.stringify(fd));
console.log(`patched ${patched} furni names/descriptions -> ${fdPath}`);
