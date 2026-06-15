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
