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
}

function parseSheet(formData: FormData): SheetInput {
  return {
    name: String(formData.get("name") ?? "").trim().slice(0, 80),
    maxHp: clampInt(formData.get("max_hp"), 1, 9999, 100),
    atk: clampInt(formData.get("atk"), 0, 999, 10),
    def: clampInt(formData.get("def"), 0, 999, 10),
    spd: clampInt(formData.get("spd"), 0, 999, 10),
    maxResource: clampInt(formData.get("max_resource"), 0, 9999, 100),
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

  try {
    await execute(
      `INSERT INTO rpg_characters
         (user_id, ruleset_id, name, hp, max_hp, resource, max_resource, atk, def, spd)
       VALUES (:uid, 1, :name, :maxHp, :maxHp, :maxResource, :maxResource, :atk, :def, :spd)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name), max_hp = VALUES(max_hp), hp = VALUES(max_hp),
         max_resource = VALUES(max_resource), resource = VALUES(max_resource),
         atk = VALUES(atk), def = VALUES(def), spd = VALUES(spd)`,
      { uid: user.id, name, maxHp: s.maxHp, maxResource: s.maxResource, atk: s.atk, def: s.def, spd: s.spd },
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
  try {
    await execute(
      `UPDATE rpg_characters
          SET name = :name, max_hp = :maxHp, hp = LEAST(hp, :maxHp),
              max_resource = :maxResource, atk = :atk, def = :def, spd = :spd
        WHERE id = :id`,
      { id, name: s.name, maxHp: s.maxHp, maxResource: s.maxResource, atk: s.atk, def: s.def, spd: s.spd },
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
