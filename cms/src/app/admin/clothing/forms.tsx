"use client";

import { useActionState, useState } from "react";
import { ACard, ABtn, Field, FormMsg, Save, Shirt } from "@/components/admin-ui";
import { avatarImageUrl } from "@/lib/habbo-imaging";
import { saveUserLook } from "./actions";

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
