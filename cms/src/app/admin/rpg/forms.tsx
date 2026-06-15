"use client";

import { useActionState, useState } from "react";
import {
  ACard, ABtn, Field, Select, FormMsg, Tag,
  Save, Plus, Pencil, X, Trash2,
} from "@/components/admin-ui";
import { Swords, Heart, Shield, Zap, Sparkles } from "lucide-react";
import { Modal } from "@/components/modal";
import { avatarImageUrl } from "@/lib/habbo-imaging";
import { saveCharacter, updateCharacter, deleteCharacter } from "./actions";

export interface RulesetOption { id: number; name: string }

export interface CharacterRow {
  id: number;
  user_id: number;
  username: string;
  look: string;
  name: string;
  ruleset_id: number;
  max_hp: number;
  atk: number;
  def: number;
  spd: number;
  max_resource: number;
  level: number;
  arma: number;
  rango: string;
  clase: string;
}

function StatFields({ d, rulesets }: { d?: Partial<CharacterRow>; rulesets: RulesetOption[] }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre del personaje" name="name" maxLength={80} defaultValue={d?.name} placeholder="(por defecto, el usuario)" className="w-full" />
        <Select label="Ruleset" name="ruleset_id" defaultValue={String(d?.ruleset_id ?? rulesets[0]?.id ?? 1)}>
          {rulesets.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="HP" name="max_hp" type="number" min={1} max={99999} defaultValue={d?.max_hp ?? 100} />
        <Field label="Ataque" name="atk" type="number" min={0} max={9999} defaultValue={d?.atk ?? 10} />
        <Field label="Defensa" name="def" type="number" min={0} max={9999} defaultValue={d?.def ?? 10} />
        <Field label="Velocidad" name="spd" type="number" min={0} max={9999} defaultValue={d?.spd ?? 10} />
        <Field label="Recurso" name="max_resource" type="number" min={0} max={99999} defaultValue={d?.max_resource ?? 100} />
        <Field label="Nivel" name="level" type="number" min={1} max={999} defaultValue={d?.level ?? 1} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Arma" name="arma" type="number" min={0} max={9999} defaultValue={d?.arma ?? 0} />
        <Select label="Rango" name="rango" defaultValue={d?.rango ?? "D"}>
          {["D", "C", "B", "A", "S"].map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>
        <Field label="Clase" name="clase" maxLength={48} defaultValue={d?.clase} placeholder="Shinigami…" />
      </div>
    </>
  );
}

export function CreateCharacterModal({ rulesets }: { rulesets: RulesetOption[] }) {
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
          <StatFields rulesets={rulesets} />
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

export function CharacterCard({ character: c, rulesets }: { character: CharacterRow; rulesets: RulesetOption[] }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateCharacter, null);
  const rulesetName = rulesets.find((r) => r.id === c.ruleset_id)?.name;
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
              {c.rango && <Tag color="amber">{c.rango}</Tag>}
              {c.clase && <span className="text-xs adim">{c.clase}</span>}
              {rulesetName && <span className="ml-auto text-xs adim">{rulesetName} · Nv {c.level}</span>}
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
            <StatFields d={c} rulesets={rulesets} />
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
