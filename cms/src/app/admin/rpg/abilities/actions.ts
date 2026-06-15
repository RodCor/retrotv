"use server";

import { revalidatePath } from "next/cache";
import { execute } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";

type ActionResult = { type: "error" | "success"; text: string };

async function staffOk(): Promise<boolean> {
  const s = await getSession();
  return !!s && isStaff(s.rank);
}

const SHAPES = new Set(["self", "direct", "line", "cone", "area", "chase"]);
// Map the rich range shape onto the legacy area_shape enum the engine also reads.
const LEGACY: Record<string, string> = {
  self: "single", direct: "single", chase: "single", line: "line", cone: "cone", area: "radius",
};

interface AbilityInput {
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

function parse(formData: FormData): AbilityInput | { error: string } {
  const ruleset_id = Number(formData.get("ruleset_id") ?? 0);
  const name = String(formData.get("name") ?? "").trim().slice(0, 70);
  const rama = String(formData.get("rama") ?? "").trim().slice(0, 48);
  const tipo = String(formData.get("tipo") ?? "").trim().slice(0, 64);
  const rango = String(formData.get("rango") ?? "").trim().toUpperCase().slice(0, 4);
  const cost = Math.max(0, Math.floor(Number(formData.get("cost") ?? 0)));
  const formula = String(formData.get("formula") ?? "").trim().slice(0, 255);
  let range_shape = String(formData.get("range_shape") ?? "self").trim().toLowerCase();
  if (!SHAPES.has(range_shape)) range_shape = "self";
  const range_n = Math.max(0, Math.floor(Number(formData.get("range_n") ?? 0)));
  const area_size = Math.max(0, Math.floor(Number(formData.get("area_size") ?? 0)));
  const cooldown = Math.max(0, Math.floor(Number(formData.get("cooldown") ?? 0)));
  const effect_text = String(formData.get("effect_text") ?? "").trim().slice(0, 4000);

  if (!Number.isInteger(ruleset_id) || ruleset_id <= 0) return { error: "Ruleset no válido." };
  if (!name) return { error: "El nombre es obligatorio." };
  return { ruleset_id, name, rama, tipo, rango, cost, formula, range_shape, range_n, area_size, cooldown, effect_text };
}

export async function createAbility(_p: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await staffOk())) return { type: "error", text: "No autorizado." };
  const a = parse(formData);
  if ("error" in a) return { type: "error", text: a.error };
  try {
    await execute(
      `INSERT INTO rpg_abilities
         (ruleset_id, name, rama, tipo, rango, cost, formula, range_shape, range_n,
          area_shape, range_tiles, area_size, cooldown)
       VALUES (:ruleset_id, :name, :rama, :tipo, :rango, :cost, :formula, :range_shape, :range_n,
          :legacy, :range_n, :area_size, :cooldown)`,
      { ...a, legacy: LEGACY[a.range_shape] ?? "single" },
    );
  } catch (err) {
    return { type: "error", text: `No se pudo crear: ${(err as Error).message}` };
  }
  revalidatePath("/admin/rpg/abilities");
  return { type: "success", text: `Habilidad "${a.name}" creada. (Recarga el ruleset en la sala con :rpg ruleset para aplicarla.)` };
}

export async function updateAbility(_p: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await staffOk())) return { type: "error", text: "No autorizado." };
  const id = Number(formData.get("id") ?? 0);
  if (!Number.isInteger(id) || id <= 0) return { type: "error", text: "Id no válido." };
  const a = parse(formData);
  if ("error" in a) return { type: "error", text: a.error };
  try {
    await execute(
      `UPDATE rpg_abilities SET name=:name, rama=:rama, tipo=:tipo, rango=:rango, cost=:cost,
          formula=:formula, range_shape=:range_shape, range_n=:range_n, area_shape=:legacy,
          range_tiles=:range_n, area_size=:area_size, cooldown=:cooldown
        WHERE id=:id`,
      { ...a, legacy: LEGACY[a.range_shape] ?? "single", id },
    );
  } catch (err) {
    return { type: "error", text: `No se pudo actualizar: ${(err as Error).message}` };
  }
  revalidatePath("/admin/rpg/abilities");
  return { type: "success", text: "Habilidad actualizada." };
}

export async function deleteAbility(id: number): Promise<void> {
  if (!(await staffOk())) return;
  if (!Number.isInteger(id)) return;
  await execute("DELETE FROM rpg_abilities WHERE id = :id", { id });
  revalidatePath("/admin/rpg/abilities");
}
