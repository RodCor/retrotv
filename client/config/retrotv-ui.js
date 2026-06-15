// RetroTV client UI runtime hook — injected into index.html by generate-config.mjs.
// Pure DOM tweaks that CSS alone can't express. Keep it tiny and defensive: the
// Nitro bundle is minified and may change, so every lookup is guarded.
(function () {
  "use strict";

  // The in-room chat history ("Chat window") is a generic draggable window with
  // no unique selector — only its hard-coded header text identifies it. Tag its
  // outer window so retrotv-ui.css can slide the card in from the side instead of
  // having it pop into place. (We animate the inner .nitro-card-shell, which has
  // no inline transform, so we never fight React's drag positioning.)
  var CHATLOG_HEADER = "chat window";

  function tagChatlog(win) {
    if (!win || win.classList.contains("retrotv-chatlog")) return;
    var header = win.querySelector(".nitro-card-header-shell, .nitro-card-header");
    if (!header) return;
    if ((header.textContent || "").trim().toLowerCase().indexOf(CHATLOG_HEADER) === -1) return;
    win.classList.add("retrotv-chatlog");
  }

  function scan(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.classList && root.classList.contains("draggable-window")) tagChatlog(root);
    var wins = root.querySelectorAll && root.querySelectorAll(".draggable-window");
    if (wins) for (var i = 0; i < wins.length; i++) tagChatlog(wins[i]);
  }

  function start() {
    scan(document.body);
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) scan(added[j]);
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

/* ===========================================================================
   RetroTV RPG combat HUD (client overlay).
   The emulator's RPG plugin broadcasts the combat log as chat. We read those
   lines from the DOM, keep an authoritative-mirror model, and render a clean
   HP/turn panel. Action buttons drive the same `:rpg` chat commands, so there's
   no extra client↔server plumbing. Defensive throughout (minified Nitro bundle).
   =========================================================================== */
(function () {
  "use strict";

  var state = { visible: false, ended: false, round: 0, turn: "", order: [], fighters: {}, log: [] };
  var el = {}; // cached DOM nodes

  function key(n) { return (n || "").trim().toLowerCase(); }

  function upsertFighter(name, hp, max) {
    var k = key(name);
    if (!k) return;
    var f = state.fighters[k] || (state.fighters[k] = { name: name.trim(), hp: hp, max: max, dead: false });
    if (typeof hp === "number") f.hp = hp;
    if (typeof max === "number" && max > 0) f.max = max;
    if (state.order.indexOf(k) === -1) state.order.push(k);
    f.dead = f.hp <= 0;
  }

  // Parse one combat line. Returns true if it was a combat line.
  function parseLine(text) {
    if (!text) return false;
    var t = String(text).replace(/\s+/g, " ").trim();
    var isCombat = /[⚔▶💀🏆⏱]/.test(t) || /\[[█░\s]*\]\s*-?\d+\s*\/\s*\d+/.test(t)
                || /orden de turno/i.test(t) || /combate/i.test(t);
    if (!isCombat) return false;

    if (/¡?combate iniciado/i.test(t) || /orden de turno/i.test(t)) {
      // fresh fight — reset, then read the order "A(15) → B(12)"
      state.fighters = {}; state.order = []; state.ended = false;
      var m = t.match(/orden de turno:\s*(.+)$/i);
      if (m) {
        m[1].split(/→|->/).forEach(function (p) {
          var nm = p.replace(/\(.*?\)/g, "").trim();
          if (nm) upsertFighter(nm, undefined, undefined);
        });
      }
    }

    var hp = t.match(/([^\[\]]+?)\s*\[[█░\s]*\]\s*(-?\d+)\s*\/\s*(\d+)/);
    if (hp) {
      var parts = hp[1].trim().split(" ");
      upsertFighter(parts[parts.length - 1], parseInt(hp[2], 10), parseInt(hp[3], 10));
    }
    var rt = t.match(/ronda\s+(\d+).*?turno de\s+([^.]+?)(?:\.|$)/i);
    if (rt) { state.round = parseInt(rt[1], 10); state.turn = rt[2].trim(); }
    var ko = t.match(/💀\s*(.+?)\s+ha ca[ií]do/i);
    if (ko) { var fk = state.fighters[key(ko[1])]; if (fk) { fk.dead = true; fk.hp = 0; } }
    if (/🏆/.test(t) || /fin del combate/i.test(t)) { state.ended = true; state.turn = ""; }

    state.log.push(t);
    if (state.log.length > 40) state.log.shift();
    state.visible = true;
    render();
    return true;
  }

  /* ----------------------------- chat sending ----------------------------- */
  function chatInput() {
    return document.querySelector("#toolbar-chat-input-container input")
        || document.querySelector(".nitro-chat-input-container input");
  }
  function sendChat(text) {
    var input = chatInput();
    if (!input) return;
    var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
    ["keydown", "keypress", "keyup"].forEach(function (type) {
      input.dispatchEvent(new KeyboardEvent(type, { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
    });
  }

  /* ------------------------------- rendering ------------------------------ */
  function build() {
    if (el.root) return;
    var root = document.createElement("div");
    root.id = "rtv-rpg-hud";
    root.className = "rtv-rpg";
    root.style.display = "none";
    root.innerHTML =
      '<div class="rtv-rpg__head"><span class="rtv-rpg__title">⚔ Combate</span>' +
      '<span class="rtv-rpg__turn"></span><button class="rtv-rpg__x" title="Cerrar">×</button></div>' +
      '<div class="rtv-rpg__fighters"></div><div class="rtv-rpg__log"></div>' +
      '<div class="rtv-rpg__actions">' +
      '<button data-cmd=":rpg join">Unirse</button>' +
      '<button data-cmd=":rpg start">Iniciar</button>' +
      '<button class="rtv-rpg__atk">Atacar</button>' +
      '<button data-cmd=":rpg pass">Pasar</button>' +
      '<button data-cmd=":rpg status">Estado</button></div>' +
      '<div class="rtv-rpg__targets" style="display:none"></div>';
    document.body.appendChild(root);
    el.root = root;
    el.turn = root.querySelector(".rtv-rpg__turn");
    el.fighters = root.querySelector(".rtv-rpg__fighters");
    el.log = root.querySelector(".rtv-rpg__log");
    el.targets = root.querySelector(".rtv-rpg__targets");

    root.querySelector(".rtv-rpg__x").addEventListener("click", function () {
      state.visible = false; render();
    });
    root.querySelectorAll("[data-cmd]").forEach(function (b) {
      b.addEventListener("click", function () { sendChat(b.getAttribute("data-cmd")); });
    });
    root.querySelector(".rtv-rpg__atk").addEventListener("click", showTargets);
  }

  function showTargets() {
    el.targets.innerHTML = "";
    // You can only attack on your own turn, so the current-turn fighter is you —
    // exclude them so you never see yourself as a target.
    var meKey = key(state.turn);
    var alive = state.order.map(function (k) { return state.fighters[k]; })
      .filter(function (f) { return f && !f.dead && key(f.name) !== meKey; });
    if (!alive.length) { el.targets.style.display = "none"; return; }
    alive.forEach(function (f) {
      var b = document.createElement("button");
      b.textContent = f.name;
      b.addEventListener("click", function () {
        sendChat(":rpg attack " + f.name);
        el.targets.style.display = "none";
      });
      el.targets.appendChild(b);
    });
    el.targets.style.display = el.targets.style.display === "flex" ? "none" : "flex";
  }

  function render() {
    build();
    el.root.style.display = state.visible ? "block" : "none";
    if (!state.visible) return;
    el.turn.textContent = state.ended ? "Combate terminado"
      : (state.round ? "Ronda " + state.round + (state.turn ? " · turno de " + state.turn : "") : "Esperando…");

    var rows = state.order.map(function (k) {
      var f = state.fighters[k]; if (!f) return "";
      var pct = f.max > 0 ? Math.max(0, Math.min(100, Math.round((f.hp / f.max) * 100))) : 0;
      var isTurn = key(f.name) === key(state.turn);
      return '<div class="rtv-f' + (f.dead ? " is-dead" : "") + (isTurn ? " is-turn" : "") + '">' +
        '<span class="rtv-f__name">' + (isTurn ? "▶ " : "") + escapeHtml(f.name) + (f.dead ? " 💀" : "") + "</span>" +
        '<span class="rtv-f__bar"><i style="width:' + pct + '%"></i></span>' +
        '<span class="rtv-f__hp">' + Math.max(0, f.hp) + "/" + f.max + "</span></div>";
    }).join("");
    el.fighters.innerHTML = rows || '<div class="rtv-rpg__empty">Sin combatientes. Pulsa Unirse.</div>';

    el.log.innerHTML = state.log.slice(-8).map(function (l) {
      return "<div>" + escapeHtml(l) + "</div>";
    }).join("");
    el.log.scrollTop = el.log.scrollHeight;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* -------------------------- read combat from chat ----------------------- */
  function scanNode(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.classList && node.classList.contains("chat-bubble")) parseLine(node.textContent);
    var bubbles = node.querySelectorAll && node.querySelectorAll(".chat-bubble");
    if (bubbles) for (var i = 0; i < bubbles.length; i++) parseLine(bubbles[i].textContent);
  }

  function startHud() {
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) scanNode(added[j]);
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startHud);
  } else {
    startHud();
  }
})();
