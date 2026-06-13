// Generates the Nitro-V3 runtime configuration from environment variables so the
// same image works locally and on any domain. Runs at container start.
import fs from "fs";

const DIR = process.env.CONFIG_DIR || "/app/dist/configuration";
const e = (k, d) => process.env[k] || d;

// Public URLs the player's browser will hit (host-mapped ports by default).
const WS_URL = e("WS_URL", "ws://127.0.0.1:2096");
const API_URL = e("API_URL", "http://127.0.0.1:2096");
const ASSET_URL = e("ASSET_URL", "http://127.0.0.1:8080/bundled");
const GAMEDATA_URL = e("GAMEDATA_URL", "http://127.0.0.1:8080/gamedata");
const IMAGE_LIBRARY_URL = e("IMAGE_LIBRARY_URL", "http://127.0.0.1:8081/c_images/");
const HOF_FURNI_URL = e("HOF_FURNI_URL", "http://127.0.0.1:8081/dcr/hof_furni");
const IMAGES_URL = e("IMAGES_URL", "http://127.0.0.1:8080/images");
const CLIENT_URL = e("CLIENT_URL", "http://127.0.0.1:1080");
const HOTEL_NAME = e("HOTEL_NAME", "RetroTV");

function patch(file, fn) {
  const p = `${DIR}/${file}`;
  if (!fs.existsSync(p)) { console.log(`[config] missing ${file}, skipping`); return; }
  const obj = JSON.parse(fs.readFileSync(p, "utf8"));
  fn(obj);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
  console.log(`[config] wrote ${file}`);
}

// Nitro-V3's UI texts ship as an example; expose them as served config files.
for (const lang of ["en", "es", "it", "nl"]) {
  const src = `${DIR}/UITexts_${lang}.json5.example`;
  const dst = `${DIR}/UITexts_${lang}.json5`;
  if (fs.existsSync(src) && !fs.existsSync(dst)) fs.copyFileSync(src, dst);
}
// Default (locale-less) UI texts = English.
if (fs.existsSync(`${DIR}/UITexts_en.json5`)) fs.copyFileSync(`${DIR}/UITexts_en.json5`, `${DIR}/UITexts.json5`);

patch("client-mode.json", (cm) => {
  cm.distObfuscationEnabled = false;
  cm.secureAssetsEnabled = false;
  cm.secureApiEnabled = false;
  cm.apiBaseUrl = API_URL;
  cm.plainConfigBaseUrl = `${CLIENT_URL}/configuration/`;
  cm.plainGamedataBaseUrl = `${GAMEDATA_URL}/`;
});

patch("renderer-config.json", (rc) => {
  rc["socket.url"] = WS_URL;
  rc["api.url"] = API_URL;
  rc["asset.url"] = ASSET_URL;
  rc["gamedata.url"] = GAMEDATA_URL;
  rc["image.library.url"] = IMAGE_LIBRARY_URL;
  rc["hof.furni.url"] = HOF_FURNI_URL;
  rc["images.url"] = IMAGES_URL;
  rc["login.turnstile.enabled"] = false;
  rc["hotel.name"] = HOTEL_NAME;
  // Serve UI texts from the client's own configuration folder.
  rc["external.texts.url"] = [
    `${GAMEDATA_URL}/ExternalTexts.json?t=%timestamp%`,
    `${CLIENT_URL}/configuration/UITexts.json5?t=%timestamp%`,
  ];
  rc["external.texts.translation.url"] = `${CLIENT_URL}/configuration/UITexts_%locale%.json5?t=%timestamp%`;
});

console.log("[config] done");
