"use client";

import { useActionState, useState } from "react";
import { ACard, ABtn, Field, FormMsg, Save, Shirt, Plus, Pencil, Check, X } from "@/components/admin-ui";
import { avatarImageUrl } from "@/lib/habbo-imaging";
import { saveUserLook, createClothing, renameClothing } from "./actions";

const DEFAULT_LOOK = "hr-100-0.hd-180-1.ch-210-66.lg-270-82.sh-290-80";

export function SetLookForm() {
  const [state, action, pending] = useActionState(saveUserLook, null);
  const [look, setLook] = useState(DEFAULT_LOOK);

  const trimmed = look.trim();
  const previewUrl = trimmed ? avatarImageUrl(trimmed, { size: "l" }) : null;

  return (
    <ACard title="Establecer la figura de un usuario" icon={<Shirt size={16} strokeWidth={2} />}>
      <form action={action} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-3">
          <p className="text-xs" style={{ color: "var(--muted, #777)" }}>
            Pega una cadena de figura y un usuario destino para sobrescribir su figura.
          </p>

          <Field
            label="Usuario destino"
            name="username"
            required
            placeholder="CoolHabbo"
          />

          <Field
            label="Cadena de figura"
            name="look"
            required
            value={look}
            onChange={(e) => setLook(e.target.value)}
            placeholder="hr-100-0.hd-180-1.ch-210-66…"
          />

          <div>
            <ABtn variant="primary" type="submit" disabled={pending}>
              <Save size={14} strokeWidth={2} />
              {pending ? "Aplicando…" : "Aplicar figura"}
            </ABtn>
            <FormMsg message={state} />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-2 md:min-w-[150px]">
          <span className="alabel">Vista previa en vivo</span>
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Vista previa del avatar"
              className="rt-avatar"
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <div
              className="flex items-center justify-center rounded-md px-6 py-8 text-xs"
              style={{
                color: "var(--muted, #777)",
                border: "1px dashed var(--border, #2a2a35)",
              }}
            >
              Sin figura
            </div>
          )}
        </div>
      </form>
    </ACard>
  );
}

/** Create a new purchasable clothing entry (name + figure sets). */
export function CreateClothingForm() {
  const [state, action, pending] = useActionState(createClothing, null);
  return (
    <form action={action} className="space-y-3">
      <Field label="Nombre" name="name" required maxLength={64} placeholder="Sombrero de fiesta" className="w-full" />
      <Field label="Conjuntos de figura" name="setid" required placeholder="3030 o 3331,3334" className="w-full" />
      <ABtn type="submit" variant="primary" disabled={pending}>
        <Plus size={14} strokeWidth={2} />
        {pending ? "Añadiendo…" : "Añadir"}
      </ABtn>
      <FormMsg message={state} />
    </form>
  );
}

/** Inline edit for a clothing row: pencil -> name + setid inputs + save/cancel. */
export function EditClothingRow({ id, name, setid }: { id: number; name: string; setid: string }) {
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return (
      <ABtn type="button" variant="default" size="xs" onClick={() => setEditing(true)} title="Editar">
        <Pencil size={13} strokeWidth={2} />
      </ABtn>
    );
  }
  return (
    <form action={renameClothing.bind(null, id)} className="flex items-center gap-1">
      <input
        name="name" defaultValue={name} autoFocus maxLength={64}
        className="afield" style={{ width: 130, padding: "0.25rem 0.45rem", fontSize: "0.78rem" }}
        placeholder="Nombre"
      />
      <input
        name="setid" defaultValue={setid}
        className="afield" style={{ width: 100, padding: "0.25rem 0.45rem", fontSize: "0.78rem" }}
        placeholder="3030"
      />
      <ABtn type="submit" variant="primary" size="xs" title="Guardar"><Check size={13} strokeWidth={2} /></ABtn>
      <ABtn type="button" variant="default" size="xs" onClick={() => setEditing(false)} title="Cancelar"><X size={13} strokeWidth={2} /></ABtn>
    </form>
  );
}
