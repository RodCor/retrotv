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
const HOTEL_LANG = e("HOTEL_LANG", "es");

function patch(file, fn) {
  const p = `${DIR}/${file}`;
  if (!fs.existsSync(p)) { console.log(`[config] missing ${file}, skipping`); return; }
  const obj = JSON.parse(fs.readFileSync(p, "utf8"));
  fn(obj);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
  console.log(`[config] wrote ${file}`);
}

// Nitro-V3's UI texts ship as examples; expose them as served config files.
// (UITexts_es.json5 is a real translation we bundle, not an example.)
for (const lang of ["en", "es", "it", "nl"]) {
  const src = `${DIR}/UITexts_${lang}.json5.example`;
  const dst = `${DIR}/UITexts_${lang}.json5`;
  if (fs.existsSync(src) && !fs.existsSync(dst)) fs.copyFileSync(src, dst);
}
// Default (locale-less) UI texts follow HOTEL_LANG, falling back to English.
const uiPick = fs.existsSync(`${DIR}/UITexts_${HOTEL_LANG}.json5`)
  ? `${DIR}/UITexts_${HOTEL_LANG}.json5`
  : `${DIR}/UITexts_en.json5`;
if (fs.existsSync(uiPick)) {
  fs.copyFileSync(uiPick, `${DIR}/UITexts.json5`);
  console.log(`[config] UI language: ${HOTEL_LANG} (${uiPick.split("/").pop()})`);
}

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

// Enable the built-in radio / "Hotel TV" widget (stations live in
// radio-stations.json5). Stock ui-config ships it disabled.
patch("ui-config.json", (uc) => {
  uc["radio_ui.enabled"] = true;
});

// Inject the RetroTV stylesheet + the classic top bar into index.html (idempotent).
// The top bar is a CSS/HTML layer (no Nitro fork has an in-client top bar); the
// client already leaves space for a CMS-rendered header at the top.
try {
  const indexPath = `${DIR}/../index.html`;
  if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, "utf8");
    if (!html.includes("configuration/retrotv-ui.css")) {
      html = html.replace(
        "</head>",
        `  <link rel="stylesheet" href="configuration/retrotv-ui.css">\n</head>`,
      );
      console.log("[config] injected retrotv-ui.css");
    }
    if (!html.includes("rtv-topbar")) {
      const bar = `<div id="rtv-topbar"><span class="rtv-tb-logo">${HOTEL_NAME}</span><span class="rtv-tb-tag">HOTEL RETRO · 2015</span></div>`;
      html = html.replace("<body>", `<body>\n  ${bar}`);
      console.log("[config] injected top bar");
    }
    fs.writeFileSync(indexPath, html);
  }
} catch (err) {
  console.log(`[config] index.html inject failed: ${err.message}`);
}

// Strip the "(pageId)" the emulator appends to catalog category names. The client
// keeps numeric parens (/\s*\(\D[^)]*\)\s*$/); drop the \D so "Asian (123456)"
// renders as "Asian". Idempotent — once patched the \D pattern is gone.
try {
  const assets = `${DIR}/../assets`;
  const FIND = "\\(\\D[^)]*\\)";
  const REPL = "\\([^)]*\\)";
  let patched = 0;
  for (const f of fs.existsSync(assets) ? fs.readdirSync(assets) : []) {
    if (!f.endsWith(".js")) continue;
    const p = `${assets}/${f}`;
    const s = fs.readFileSync(p, "utf8");
    const n = s.split(FIND).length - 1;
    if (!n) continue;
    fs.writeFileSync(p, s.split(FIND).join(REPL));
    patched += n;
  }
  console.log(patched ? `[config] catalog page-id strip: patched ${patched}` : "[config] catalog page-id strip: already applied");
} catch (err) {
  console.log(`[config] catalog page-id patch failed: ${err.message}`);
}

console.log("[config] done");
