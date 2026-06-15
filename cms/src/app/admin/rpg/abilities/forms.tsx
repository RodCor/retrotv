"use client";

import { useActionState, useState } from "react";
import {
  ACard, ABtn, Field, Select, Textarea, FormMsg, Tag,
  Save, Plus, Pencil, X, Trash2,
} from "@/components/admin-ui";
import { Sparkles } from "lucide-react";
import { Modal } from "@/components/modal";
import { createAbility, updateAbility, deleteAbility } from "./actions";

export interface AbilityRow {
  id: number;
  ruleset_id: number;
  name: string;
  rama: string;
  tipo: string;
  rango: string;
  cost: number;
  formula: string;
  range_shape: string;
  range_n: number;
  area_size: number;
  cooldown: number;
  effect_text: string;
}

const SHAPES = ["self", "direct", "line", "cone", "area", "chase"];
const TIPOS = ["ofensiva", "defensiva", "suplementaria", "reactiva", "pasiva", "entrenamiento"];

function AbilityFields({ d, rulesetId }: { d?: Partial<AbilityRow>; rulesetId: number }) {
  return (
    <div className="space-y-3">
      <input type="hidden" name="ruleset_id" value={d?.ruleset_id ?? rulesetId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre" name="name" required maxLength={70} defaultValue={d?.name} className="w-full" />
        <Field label="Disciplina (rama)" name="rama" maxLength={48} defaultValue={d?.rama} placeholder="Zanjutsu, Cero…" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Select label="Tipo" name="tipo" defaultValue={d?.tipo ?? "ofensiva"}>
          {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Select label="Rango" name="rango" defaultValue={d?.rango ?? "D"}>
          {["D", "C", "B", "A", "S"].map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>
        <Field label="Coste" name="cost" type="number" min={0} defaultValue={d?.cost ?? 0} />
      </div>
      <Field label="Fórmula de daño" name="formula" maxLength={255} defaultValue={d?.formula}
        placeholder="NIVELx1.5 + FUE + DEF" className="w-full" />
      <div className="grid gap-3 sm:grid-cols-4">
        <Select label="Forma" name="range_shape" defaultValue={d?.range_shape ?? "self"}>
          {SHAPES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Field label="Alcance" name="range_n" type="number" min={0} defaultValue={d?.range_n ?? 0} />
        <Field label="Área" name="area_size" type="number" min={0} defaultValue={d?.area_size ?? 0} />
        <Field label="Recarga" name="cooldown" type="number" min={0} defaultValue={d?.cooldown ?? 0} />
      </div>
      <Textarea label="Efecto (texto completo, se muestra a los jugadores)" name="effect_text" rows={3}
        defaultValue={d?.effect_text} />
    </div>
  );
}

export function CreateAbilityModal({ rulesetId }: { rulesetId: number }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createAbility, null);
  return (
    <>
      <ABtn type="button" variant="primary" onClick={() => setOpen(true)}>
        <Plus size={14} strokeWidth={2} /> Nueva habilidad
      </ABtn>
      <Modal open={open} onClose={() => setOpen(false)} title="Nueva habilidad" subtitle="Personaliza el ruleset" icon={<Sparkles size={18} strokeWidth={2} />} size="lg">
        <form action={action} className="space-y-4">
          <AbilityFields rulesetId={rulesetId} />
          <div className="flex items-center justify-end gap-3 border-t pt-3" style={{ borderColor: "var(--line)" }}>
            <FormMsg message={state} />
            <ABtn type="submit" variant="primary" disabled={pending}>
              <Save size={14} strokeWidth={2} />{pending ? "Creando…" : "Crear"}
            </ABtn>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function AbilityCard({ ability: a }: { ability: AbilityRow }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateAbility, null);
  return (
    <ACard>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{a.name}</span>
          {a.rango && <Tag color="amber">{a.rango}</Tag>}
          {a.rama && <Tag color="cyan">{a.rama}</Tag>}
          {a.tipo && <span className="text-xs adim">{a.tipo}</span>}
          <span className="ml-auto flex shrink-0 items-center gap-1">
            <ABtn type="button" variant="default" size="xs" onClick={() => setEditing((v) => !v)} title="Editar"><Pencil size={13} strokeWidth={2} /></ABtn>
            <form action={deleteAbility.bind(null, a.id)} onSubmit={(e) => { if (!window.confirm(`¿Eliminar "${a.name}"?`)) e.preventDefault(); }}>
              <ABtn type="submit" variant="danger" size="xs" title="Eliminar"><Trash2 size={13} strokeWidth={2} /></ABtn>
            </form>
          </span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs adim">
          <span>coste {a.cost}</span>
          <span>{a.range_shape} {a.range_n}{a.area_size > 0 ? ` · área ${a.area_size}` : ""}</span>
          {a.formula && <span className="font-mono" style={{ color: "var(--amber-deep, #f5821f)" }}>{a.formula}</span>}
          {a.cooldown > 0 && <span>CD {a.cooldown}</span>}
        </div>
        {a.effect_text && <p className="mt-1 text-xs adim line-clamp-2">{a.effect_text}</p>}

        {editing && (
          <form action={action} className="news-edit-panel">
            <input type="hidden" name="id" value={a.id} />
            <AbilityFields d={a} rulesetId={a.ruleset_id} />
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
