// Nitro client patch: the emulator appends "(pageId)" to catalog page names and
// the client's label strip regex deliberately keeps numeric parens
// (/\s*\(\D[^)]*\)\s*$/). This removes the \D so a trailing "(123456)" is also
// stripped — catalog categories show "Asian" instead of "Asian (123456)".
// Usage: node patch-catalog-pageid.mjs <bundle.js> [<bundle.js> ...]
import fs from "fs";

const FIND = "\\(\\D[^)]*\\)"; // the regex source as it appears in the bundle
const REPL = "\\([^)]*\\)";

let total = 0;
for (const file of process.argv.slice(2)) {
  let s;
  try { s = fs.readFileSync(file, "utf8"); } catch { continue; }
  const n = s.split(FIND).length - 1;
  if (!n) continue;
  fs.writeFileSync(file, s.split(FIND).join(REPL));
  total += n;
  console.log(`patched ${n} occurrence(s) in ${file}`);
}
console.log(total ? `done (${total} total)` : "nothing to patch (already applied?)");
