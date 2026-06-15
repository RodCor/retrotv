"use server";

import { revalidatePath } from "next/cache";
import { execute, queryOne } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";

type ActionResult = { type: "error" | "success"; text: string };

async function staffOk(): Promise<boolean> {
  const session = await getSession();
  return !!session && isStaff(session.rank);
}

function clampInt(v: FormDataEntryValue | null, min: number, max: number, def: number): number {
  const n = Math.floor(Number(String(v ?? "").trim()));
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

interface SheetInput {
  name: string;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  maxResource: number;
  level: number;
  arma: number;
  rango: string;
  clase: string;
}

function parseSheet(formData: FormData): SheetInput {
  return {
    name: String(formData.get("name") ?? "").trim().slice(0, 80),
    maxHp: clampInt(formData.get("max_hp"), 1, 99999, 100),
    atk: clampInt(formData.get("atk"), 0, 9999, 10),
    def: clampInt(formData.get("def"), 0, 9999, 10),
    spd: clampInt(formData.get("spd"), 0, 9999, 10),
    maxResource: clampInt(formData.get("max_resource"), 0, 99999, 100),
    level: clampInt(formData.get("level"), 1, 999, 1),
    arma: clampInt(formData.get("arma"), 0, 9999, 0),
    rango: String(formData.get("rango") ?? "D").trim().toUpperCase().slice(0, 4) || "D",
    clase: String(formData.get("clase") ?? "").trim().slice(0, 48),
  };
}

/** Create or replace a user's character sheet (one per user, default ruleset). */
export async function saveCharacter(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await staffOk())) return { type: "error", text: "No autorizado." };

  const username = String(formData.get("username") ?? "").trim();
  if (!username) return { type: "error", text: "El usuario es obligatorio." };

  const user = await queryOne<{ id: number; username: string }>(
    "SELECT id, username FROM users WHERE username = :u",
    { u: username },
  );
  if (!user) return { type: "error", text: `No existe el usuario "${username}".` };

  const s = parseSheet(formData);
  const name = s.name || user.username;
  const rulesetId = clampInt(formData.get("ruleset_id"), 1, 999999, 1);

  try {
    await execute(
      `INSERT INTO rpg_characters
         (user_id, ruleset_id, name, hp, max_hp, resource, max_resource, atk, def, spd,
          level, arma, rango, clase)
       VALUES (:uid, :ruleset, :name, :maxHp, :maxHp, :maxResource, :maxResource, :atk, :def, :spd,
          :level, :arma, :rango, :clase)
       ON DUPLICATE KEY UPDATE
         ruleset_id = VALUES(ruleset_id),
         name = VALUES(name), max_hp = VALUES(max_hp), hp = VALUES(max_hp),
         max_resource = VALUES(max_resource), resource = VALUES(max_resource),
         atk = VALUES(atk), def = VALUES(def), spd = VALUES(spd),
         level = VALUES(level), arma = VALUES(arma), rango = VALUES(rango), clase = VALUES(clase)`,
      {
        uid: user.id, ruleset: rulesetId, name,
        maxHp: s.maxHp, maxResource: s.maxResource, atk: s.atk, def: s.def, spd: s.spd,
        level: s.level, arma: s.arma, rango: s.rango, clase: s.clase,
      },
    );
  } catch (err) {
    return { type: "error", text: `No se pudo guardar: ${(err as Error).message}` };
  }

  revalidatePath("/admin/rpg");
  return { type: "success", text: `Ficha guardada para ${user.username}.` };
}

/** Edit an existing sheet by its id. */
export async function updateCharacter(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await staffOk())) return { type: "error", text: "No autorizado." };
  const id = Number(String(formData.get("id") ?? "").trim());
  if (!Number.isInteger(id) || id <= 0) return { type: "error", text: "Id no válido." };

  const s = parseSheet(formData);
  const rulesetId = clampInt(formData.get("ruleset_id"), 1, 999999, 1);
  try {
    await execute(
      `UPDATE rpg_characters
          SET ruleset_id = :ruleset, name = :name, max_hp = :maxHp, hp = LEAST(hp, :maxHp),
              max_resource = :maxResource, atk = :atk, def = :def, spd = :spd,
              level = :level, arma = :arma, rango = :rango, clase = :clase
        WHERE id = :id`,
      {
        id, ruleset: rulesetId, name: s.name,
        maxHp: s.maxHp, maxResource: s.maxResource, atk: s.atk, def: s.def, spd: s.spd,
        level: s.level, arma: s.arma, rango: s.rango, clase: s.clase,
      },
    );
  } catch (err) {
    return { type: "error", text: `No se pudo actualizar: ${(err as Error).message}` };
  }
  revalidatePath("/admin/rpg");
  return { type: "success", text: "Ficha actualizada." };
}

export async function deleteCharacter(id: number): Promise<void> {
  if (!(await staffOk())) return;
  if (!Number.isInteger(id)) return;
  await execute("DELETE FROM rpg_characters WHERE id = :id", { id });
  revalidatePath("/admin/rpg");
}
