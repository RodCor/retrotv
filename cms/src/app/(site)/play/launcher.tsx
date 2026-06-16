"use client";

import { useState } from "react";
import { avatarImageUrl } from "@/lib/habbo-imaging";

export interface LaunchAvatar {
  id: number;
  username: string;
  look: string;
}

async function ticketFor(avatarId: number): Promise<string | null> {
  const res = await fetch("/api/play-ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ avatarId }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { url?: string };
  return data.url ?? null;
}

export function PlayLauncher({
  avatars,
  preselectId,
}: {
  avatars: LaunchAvatar[];
  preselectId?: number;
}) {
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(preselectId ? [preselectId] : avatars.length === 1 ? [avatars[0].id] : []),
  );
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const toggle = (id: number) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Single user click → mint a ticket per avatar, open each in its own tab.
  async function launch() {
    const ids = avatars.filter((a) => selected.has(a.id)).map((a) => a.id);
    if (ids.length === 0) return;
    setBusy(true);
    setNote(null);
    let opened = 0;
    for (let i = 0; i < ids.length; i++) {
      const url = await ticketFor(ids[i]);
      if (!url) continue;
      if (i === 0) {
        window.location.assign(url); // first in the current tab
      } else {
        const w = window.open(url, `retrotv_${ids[i]}`);
        if (w) opened++;
      }
    }
    if (ids.length > 1 && opened < ids.length - 1) {
      setNote("Tu navegador bloqueó algunas pestañas. Permite las ventanas emergentes de este sitio para abrir todos los avatares.");
    }
    setBusy(false);
  }

  return (
    <div className="play-launcher">
      <div className="play-grid">
        {avatars.map((a) => {
          const on = selected.has(a.id);
          return (
            <button
              key={a.id}
              type="button"
              className={on ? "play-card play-card-on" : "play-card"}
              onClick={() => toggle(a.id)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="avatar-fullbody" src={avatarImageUrl(a.look, { size: "l" })} alt={a.username} />
              <span className="play-name">{a.username}</span>
              <span className="play-check">{on ? "✓" : ""}</span>
            </button>
          );
        })}
      </div>
      <div className="play-actions">
        <button className="hbtn hbtn-primary" type="button" onClick={launch} disabled={busy || selected.size === 0}>
          {busy ? "Abriendo…" : selected.size > 1 ? `Jugar (${selected.size} pestañas)` : "Jugar"}
        </button>
      </div>
      {note && <p className="msg-error">{note}</p>}
    </div>
  );
}
