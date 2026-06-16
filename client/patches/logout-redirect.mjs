// RetroTV build-time patch for the cloned Nitro-V3 client.
//
// The in-hotel logout button (Purse views) ends with `window.location.reload()`,
// which just reloads the client's own login screen. RetroTV's front door is the
// website avatar selection, so we swap that final reload for a config-driven
// redirect to `logout.redirect.url` (set from the WEBSITE_URL env at container
// start by generate-config.mjs), falling back to a reload when it isn't set.
//
// Runs in the Docker build stage BEFORE the Vite build, so if upstream ever
// changes this code the patch fails fast (non-zero exit) instead of silently
// shipping the old behavior. Idempotent: files already carrying the marker are
// skipped.
import fs from "fs";
import path from "path";

const root = process.argv[2] || ".";
const purseDir = path.join(root, "src", "components", "purse");

const MARKER = "logout.redirect.url";
const FIND = "window.location.reload();";
const REPLACEMENT =
  "{ const _retrotvRedirect = GetConfigurationValue<string>('logout.redirect.url', ''); " +
  "if (_retrotvRedirect) { window.location.href = _retrotvRedirect; } else { window.location.reload(); } }";

if (!fs.existsSync(purseDir)) {
  console.error(`[patch:logout] purse dir not found: ${purseDir}`);
  process.exit(1);
}

let patched = 0;
let skipped = 0;

for (const file of fs.readdirSync(purseDir)) {
  if (!file.endsWith(".tsx")) continue;
  const p = path.join(purseDir, file);
  const src = fs.readFileSync(p, "utf8");

  // Only touch files whose logout handler does the reload.
  if (!src.includes(FIND)) continue;
  if (src.includes(MARKER)) { skipped++; continue; } // already patched

  // The logout handler already uses GetConfigurationValue, so it's in scope.
  if (!src.includes("GetConfigurationValue")) {
    console.error(`[patch:logout] ${file} has the reload but no GetConfigurationValue import; aborting.`);
    process.exit(1);
  }

  // Replace only the first occurrence (the logout reload).
  const out = src.replace(FIND, REPLACEMENT);
  fs.writeFileSync(p, out);
  patched++;
  console.log(`[patch:logout] patched ${file}`);
}

if (patched === 0 && skipped === 0) {
  console.error(
    "[patch:logout] no purse file contained the logout reload — upstream layout changed. " +
    "Update client/patches/logout-redirect.mjs.",
  );
  process.exit(1);
}

console.log(`[patch:logout] done (patched ${patched}, already-patched ${skipped})`);
