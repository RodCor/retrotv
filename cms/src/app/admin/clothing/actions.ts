"use server";

import { revalidatePath } from "next/cache";
import { execute, queryOne } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";

type ActionResult = { type: "error" | "success"; text: string };

async function requireStaff(): Promise<ActionResult | null> {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) {
    return { type: "error", text: "No autorizado." };
  }
  return null;
}

/** Keep only digits and commas, collapse stray commas, e.g. "3030" or "3331,3334". */
function cleanSetid(raw: string): string {
  return raw
    .replace(/[^0-9,]/g, "")
    .replace(/,+/g, ",")
    .replace(/^,|,$/g, "");
}

/**
 * A Habbo figure string looks like "hr-100-0.hd-180-1.ch-210-66...".
 * We allow the standard set / part / colour token charset only.
 */
function isValidLook(look: string): boolean {
  if (!look || look.length > 512) return false;
  return /^[a-z0-9.\-]+$/i.test(look) && look.includes("-");
}

export async function saveUserLook(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) {
    return { type: "error", text: "No autorizado." };
  }

  const username = String(formData.get("username") ?? "").trim();
  const look = String(formData.get("look") ?? "").trim();

  if (!username) {
    return { type: "error", text: "El usuario es obligatorio." };
  }
  if (!isValidLook(look)) {
    return {
      type: "error",
      text: "La figura no es válida. Usa una cadena de figura como hr-100-0.hd-180-1…",
    };
  }

  const user = await queryOne<{ id: number; username: string }>(
    "SELECT id, username FROM users WHERE username = :username",
    { username },
  );
  if (!user) {
    return { type: "error", text: `No existe ningún usuario llamado "${username}".` };
  }

  try {
    const res = await execute(
      "UPDATE users SET look = :look WHERE id = :id",
      { look, id: user.id },
    );
    if (res.affectedRows === 0) {
      return { type: "error", text: "No se actualizó ninguna fila." };
    }
  } catch (err) {
    return {
      type: "error",
      text: `No se pudo actualizar la figura: ${(err as Error).message}`,
    };
  }

  revalidatePath("/admin/clothing");
  return { type: "success", text: `Figura actualizada para ${user.username}.` };
}

/* ------------------------------ clothing CRUD ------------------------------ */

export async function createClothing(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const denied = await requireStaff();
  if (denied) return denied;

  const name = String(formData.get("name") ?? "").trim().slice(0, 64);
  const setid = cleanSetid(String(formData.get("setid") ?? "").trim());

  if (!name) {
    return { type: "error", text: "El nombre es obligatorio." };
  }
  if (!setid) {
    return { type: "error", text: "Los conjuntos de figura son obligatorios (ej. 3030 o 3331,3334)." };
  }

  try {
    await execute(
      "INSERT INTO catalog_clothing (name, setid) VALUES (:name, :setid)",
      { name, setid },
    );
  } catch (err) {
    return {
      type: "error",
      text: `No se pudo crear la ropa: ${(err as Error).message}`,
    };
  }

  revalidatePath("/admin/clothing");
  return { type: "success", text: `Ropa "${name}" creada.` };
}

export async function renameClothing(id: number, formData: FormData): Promise<void> {
  const denied = await requireStaff();
  if (denied) return;
  if (!Number.isInteger(id)) return;

  const name = String(formData.get("name") ?? "").trim().slice(0, 64);
  const setid = cleanSetid(String(formData.get("setid") ?? "").trim());
  if (!name || !setid) return;

  try {
    await execute(
      "UPDATE catalog_clothing SET name = :name, setid = :setid WHERE id = :id",
      { name, setid, id },
    );
  } catch {
    /* invalid value — ignore rather than crash the page */
  }
  revalidatePath("/admin/clothing");
}

/** Edit form variant returning a result (kept for parity with create). */
export async function updateClothing(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const denied = await requireStaff();
  if (denied) return denied;

  const id = Number(String(formData.get("id") ?? "").trim());
  const name = String(formData.get("name") ?? "").trim().slice(0, 64);
  const setid = cleanSetid(String(formData.get("setid") ?? "").trim());

  if (!Number.isInteger(id) || id <= 0) {
    return { type: "error", text: "Identificador de ropa no válido." };
  }
  if (!name) {
    return { type: "error", text: "El nombre es obligatorio." };
  }
  if (!setid) {
    return { type: "error", text: "Los conjuntos de figura son obligatorios (ej. 3030 o 3331,3334)." };
  }

  try {
    await execute(
      "UPDATE catalog_clothing SET name = :name, setid = :setid WHERE id = :id",
      { name, setid, id },
    );
  } catch (err) {
    return {
      type: "error",
      text: `No se pudo actualizar la ropa: ${(err as Error).message}`,
    };
  }

  revalidatePath("/admin/clothing");
  return { type: "success", text: `Ropa "${name}" actualizada.` };
}

export async function deleteClothing(id: number): Promise<void> {
  const denied = await requireStaff();
  if (denied) return;
  if (!Number.isInteger(id)) return;

  await execute("DELETE FROM catalog_clothing WHERE id = :id", { id });
  revalidatePath("/admin/clothing");
}
