"use client";

import { useActionState, useState } from "react";
import { avatarImageUrl } from "@/lib/habbo-imaging";
import {
  createAvatarAction,
  setPrimaryAction,
  switchAvatarAction,
  type FormResult,
} from "./actions";

export interface AvatarCard {
  id: number;
  username: string;
  look: string;
  motto: string;
  rank: number;
  credits: number;
}

export function AccountCarousel({
  avatars,
  primaryId,
  activeId,
  cap,
}: {
  avatars: AvatarCard[];
  primaryId: number | null;
  activeId: number;
  cap: number;
}) {
  const slots = avatars.length;
  const canCreate = slots < cap;
  const total = slots + (canCreate ? 1 : 0); // trailing "+" card
  const [index, setIndex] = useState(0);
  const [createState, createAction, creating] = useActionState(createAvatarAction, null);

  const go = (d: number) => setIndex((i) => (i + d + total) % total);
  const onCreateSlot = canCreate && index === slots;
  const current = onCreateSlot ? null : avatars[index];

  return (
    <div className="account-carousel">
      <div className="account-stage">
        <button type="button" className="carousel-arrow" onClick={() => go(-1)} aria-label="Anterior" disabled={total <= 1}>‹</button>

        {current ? (
          <div className="avatar-slide">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="avatar-fullbody" src={avatarImageUrl(current.look, { size: "l" })} alt={current.username} />
            <div className="avatar-meta">
              <h2>
                {current.username}
                {current.id === primaryId && <span className="pill">principal</span>}
                {current.id === activeId && <span className="pill pill-active">activo</span>}
              </h2>
              <p className="avatar-motto">{current.motto}</p>
              <p className="avatar-stats">Rango {current.rank} · {current.credits.toLocaleString()} créditos</p>

              <div className="avatar-actions">
                <a className="hbtn hbtn-primary" href={`/play?launch=${current.id}`}>Jugar</a>
                <form action={switchAvatarAction}>
                  <input type="hidden" name="avatarId" value={current.id} />
                  <button className="hbtn" type="submit" disabled={current.id === activeId}>Usar en la web</button>
                </form>
                <form action={setPrimaryAction}>
                  <input type="hidden" name="avatarId" value={current.id} />
                  <button className="hbtn" type="submit" disabled={current.id === primaryId}>Marcar principal</button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="avatar-slide avatar-create">
            <form action={createAction} className="create-form">
              <h2>Nuevo avatar</h2>
              <label>Nombre
                <input name="username" required minLength={3} maxLength={20} placeholder="MiAlt" />
              </label>
              <label>Género
                <select name="gender" defaultValue="M">
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </label>
              <button className="hbtn hbtn-primary" type="submit" disabled={creating}>
                {creating ? "Creando…" : "Crear avatar"}
              </button>
              {createState && (
                <p className={createState.type === "error" ? "msg-error" : "msg-ok"}>{createState.text}</p>
              )}
            </form>
          </div>
        )}

        <button type="button" className="carousel-arrow" onClick={() => go(1)} aria-label="Siguiente" disabled={total <= 1}>›</button>
      </div>

      <div className="carousel-dots">
        {Array.from({ length: total }).map((_, i) => (
          <button key={i} type="button" className={i === index ? "dot dot-on" : "dot"} onClick={() => setIndex(i)} aria-label={`Ir a ${i + 1}`} />
        ))}
      </div>
      <p className="cap-note">{slots} / {cap} avatares</p>
    </div>
  );
}
