"use client";

import { useActionState, useState } from "react";
import {
  ACard, ABtn, Field, FormMsg, Tag,
  Save, Plus, Pencil, X, Trash2,
} from "@/components/admin-ui";
import { Swords, Heart, Shield, Zap, Sparkles } from "lucide-react";
import { Modal } from "@/components/modal";
import { avatarImageUrl } from "@/lib/habbo-imaging";
import { saveCharacter, updateCharacter, deleteCharacter } from "./actions";

export interface CharacterRow {
  id: number;
  user_id: number;
  username: string;
  look: string;
  name: string;
  max_hp: number;
  atk: number;
  def: number;
  spd: number;
  max_resource: number;
}

function StatFields({ d }: { d?: Partial<CharacterRow> }) {
  return (
    <>
      <Field label="Nombre del personaje" name="name" maxLength={80} defaultValue={d?.name} placeholder="(por defecto, el usuario)" className="w-full" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="HP" name="max_hp" type="number" min={1} max={9999} defaultValue={d?.max_hp ?? 100} />
        <Field label="Ataque" name="atk" type="number" min={0} max={999} defaultValue={d?.atk ?? 10} />
        <Field label="Defensa" name="def" type="number" min={0} max={999} defaultValue={d?.def ?? 10} />
        <Field label="Velocidad" name="spd" type="number" min={0} max={999} defaultValue={d?.spd ?? 10} />
        <Field label="Recurso" name="max_resource" type="number" min={0} max={9999} defaultValue={d?.max_resource ?? 100} />
      </div>
    </>
  );
}

export function CreateCharacterModal() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveCharacter, null);
  return (
    <>
      <ABtn type="button" variant="primary" onClick={() => setOpen(true)}>
        <Plus size={14} strokeWidth={2} /> Nueva ficha
      </ABtn>
      <Modal open={open} onClose={() => setOpen(false)} title="Ficha de personaje" subtitle="Stats RPG de un usuario" icon={<Swords size={18} strokeWidth={2} />} size="lg">
        <form action={action} className="space-y-4">
          <Field label="Usuario" name="username" required placeholder="AdminTest" className="w-full" />
          <StatFields />
          <div className="flex items-center justify-end gap-3 border-t pt-3" style={{ borderColor: "var(--line)" }}>
            <FormMsg message={state} />
            <ABtn type="submit" variant="primary" disabled={pending}>
              <Save size={14} strokeWidth={2} />{pending ? "Guardando…" : "Guardar ficha"}
            </ABtn>
          </div>
        </form>
      </Modal>
    </>
  );
}

function Stat({ icon, value }: { icon: React.ReactNode; value: number }) {
  return <span className="inline-flex items-center gap-1 text-xs font-semibold">{icon}{value}</span>;
}

export function CharacterCard({ character: c }: { character: CharacterRow }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateCharacter, null);
  return (
    <ACard>
      <div>
        <div className="flex flex-wrap items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="av-head" style={{ width: 44, height: 44 }} src={avatarImageUrl(c.look, { headOnly: true, size: "m" })} alt={c.username} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{c.name}</span>
              <Tag color="cyan">{c.username}</Tag>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1" style={{ color: "var(--ink-soft)" }}>
              <Stat icon={<Heart size={12} strokeWidth={2} className="text-rose-400" />} value={c.max_hp} />
              <Stat icon={<Swords size={12} strokeWidth={2} className="text-amber-400" />} value={c.atk} />
              <Stat icon={<Shield size={12} strokeWidth={2} className="text-sky-400" />} value={c.def} />
              <Stat icon={<Zap size={12} strokeWidth={2} className="text-yellow-300" />} value={c.spd} />
              <Stat icon={<Sparkles size={12} strokeWidth={2} className="text-violet-400" />} value={c.max_resource} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ABtn type="button" variant="default" size="xs" onClick={() => setEditing((v) => !v)} title="Editar"><Pencil size={13} strokeWidth={2} /></ABtn>
            <form action={deleteCharacter.bind(null, c.id)} onSubmit={(e) => { if (!window.confirm(`¿Eliminar la ficha de ${c.username}?`)) e.preventDefault(); }}>
              <ABtn type="submit" variant="danger" size="xs" title="Eliminar"><Trash2 size={13} strokeWidth={2} /></ABtn>
            </form>
          </div>
        </div>
        {editing && (
          <form action={action} className="news-edit-panel">
            <input type="hidden" name="id" value={c.id} />
            <StatFields d={c} />
            <div className="flex items-center gap-2">
              <ABtn type="submit" variant="primary" disabled={pending}><Save size={13} strokeWidth={2} />{pending ? "Guardando…" : "Guardar"}</ABtn>
              <ABtn type="button" variant="default" onClick={() => setEditing(false)}><X size={13} strokeWidth={2} /> Cerrar</ABtn>
              <FormMsg message={state} />
            </div>
          </form>
        )}
      </div>
    </ACard>
  );
}
