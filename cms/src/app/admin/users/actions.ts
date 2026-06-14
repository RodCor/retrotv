"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { execute, queryOne } from "@/lib/db";
import { getSession, isStaff, hashPassword } from "@/lib/auth";

type ActionResult = { type: "error" | "success"; text: string };

async function requireStaff(): Promise<
  | { ok: true; session: { userId: number; username: string; rank: number } }
  | { ok: false; result: ActionResult }
> {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) {
    return {
      ok: false,
      result: { type: "error", text: "No autorizado — se requiere acceso de staff." },
    };
  }
  return { ok: true, session };
}

function toInt(value: FormDataEntryValue | null): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function toNonNegInt(value: FormDataEntryValue | null): number {
  return Math.max(0, toInt(value));
}

/* ---------------------------- currency ---------------------------- */

export async function updateUserCurrency(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await requireStaff();
  if (!auth.ok) return auth.result;

  const userId = toInt(formData.get("userId"));
  const credits = toNonNegInt(formData.get("credits"));
  const duckets = toNonNegInt(formData.get("duckets"));
  const diamonds = toNonNegInt(formData.get("diamonds"));
  const points = toNonNegInt(formData.get("points"));

  if (!userId) return { type: "error", text: "Usuario no válido." };

  try {
    await execute(
      "UPDATE users SET credits = :credits, pixels = :duckets, points = :points WHERE id = :userId",
      { credits, duckets, points, userId },
    );
    try {
      await execute(
        "UPDATE users_settings SET credits = :credits WHERE user_id = :userId",
        { credits, userId },
      );
    } catch {}
    await execute(
      `INSERT INTO users_currency (user_id, type, amount)
       VALUES (:userId, 5, :diamonds)
       ON DUPLICATE KEY UPDATE amount = :diamonds`,
      { userId, diamonds },
    );
  } catch {
    return { type: "error", text: "No se pudieron actualizar las monedas." };
  }

  revalidatePath(`/admin/users/${userId}`);
  return {
    type: "success",
    text: `Monedas actualizadas: ${credits}c / ${duckets} duckets / ${diamonds} diamantes / ${points} pts.`,
  };
}

/* ------------------------------ rank ------------------------------ */

export async function updateUserRank(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await requireStaff();
  if (!auth.ok) return auth.result;

  const userId = toInt(formData.get("userId"));
  const rank = toInt(formData.get("rank"));

  if (!userId) return { type: "error", text: "Usuario no válido." };
  if (rank < 1) return { type: "error", text: "Rango no válido." };

  try {
    await execute("UPDATE users SET rank = :rank WHERE id = :userId", {
      rank,
      userId,
    });
  } catch {
    return { type: "error", text: "No se pudo actualizar el rango." };
  }

  revalidatePath(`/admin/users/${userId}`);
  return { type: "success", text: `Rango establecido en ${rank}.` };
}

/* ----------------------------- profile ---------------------------- */

export async function updateUserProfile(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await requireStaff();
  if (!auth.ok) return auth.result;

  const userId = toInt(formData.get("userId"));
  const motto = String(formData.get("motto") ?? "").slice(0, 255);
  const look = String(formData.get("look") ?? "").trim();
  const mail = String(formData.get("mail") ?? "").trim();

  if (!userId) return { type: "error", text: "Usuario no válido." };
  if (!look) return { type: "error", text: "La figura no puede estar vacía." };

  try {
    await execute(
      "UPDATE users SET motto = :motto, look = :look, mail = :mail WHERE id = :userId",
      { motto, look, mail, userId },
    );
  } catch {
    return { type: "error", text: "No se pudo actualizar el perfil." };
  }

  revalidatePath(`/admin/users/${userId}`);
  return { type: "success", text: "Perfil actualizado." };
}

/* -------------------------- reset password ------------------------ */

export async function resetUserPassword(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await requireStaff();
  if (!auth.ok) return auth.result;

  const userId = toInt(formData.get("userId"));
  const newPass = String(formData.get("newPass") ?? "");

  if (!userId) return { type: "error", text: "Usuario no válido." };
  if (newPass.length < 6) {
    return { type: "error", text: "La contraseña debe tener al menos 6 caracteres." };
  }

  try {
    const hashed = await hashPassword(newPass);
    await execute("UPDATE users SET password = :password WHERE id = :userId", {
      password: hashed,
      userId,
    });
  } catch {
    return { type: "error", text: "No se pudo restablecer la contraseña." };
  }

  revalidatePath(`/admin/users/${userId}`);
  return { type: "success", text: "Contraseña restablecida correctamente." };
}

/* ------------------------------- ban ------------------------------ */

export async function banUser(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await requireStaff();
  if (!auth.ok) return auth.result;

  const userId = toInt(formData.get("userId"));
  const staffId = toInt(formData.get("staffId")) || auth.session.userId;
  const reason = String(formData.get("reason") ?? "").trim();
  const hours = toInt(formData.get("hours"));

  if (!userId) return { type: "error", text: "Usuario no válido." };
  if (!reason) return { type: "error", text: "El motivo del baneo es obligatorio." };
  if (hours <= 0) return { type: "error", text: "La duración del baneo debe ser mayor que 0 horas." };

  const now = Math.floor(Date.now() / 1000);
  const expire = now + hours * 3600;

  try {
    await execute(
      `INSERT INTO bans
        (user_id, ip, machine_id, user_staff_id, timestamp, ban_expire, ban_reason, type, cfh_topic)
       VALUES
        (:userId, '', '', :staffId, :timestamp, :expire, :reason, 'USER', 0)`,
      {
        userId,
        staffId,
        timestamp: now,
        expire,
        reason,
      },
    );
  } catch {
    return { type: "error", text: "No se pudo banear al usuario." };
  }

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin");
  return {
    type: "success",
    text: `Usuario baneado durante ${hours}h: ${reason}`,
  };
}

/* ------------------------------ delete ---------------------------- */

export async function deleteUser(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await requireStaff();
  if (!auth.ok) return auth.result;

  const userId = toInt(formData.get("userId"));
  if (!userId) return { type: "error", text: "Usuario no válido." };

  try {
    await execute("DELETE FROM users WHERE id = :userId", { userId });
  } catch {
    return { type: "error", text: "No se pudo eliminar al usuario." };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  redirect("/admin/users");
}

/* ---------------------------- badges ---------------------------- */

export async function giveBadge(
  userId: number,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await requireStaff();
  if (!auth.ok) return auth.result;
  if (!Number.isInteger(userId) || userId <= 0) {
    return { type: "error", text: "Usuario no válido." };
  }
  const code = String(formData.get("badge_code") ?? "").trim().slice(0, 32);
  if (!code) return { type: "error", text: "Escribe un código de placa." };

  try {
    const dup = await queryOne<{ id: number }>(
      "SELECT id FROM users_badges WHERE user_id = :u AND badge_code = :c",
      { u: userId, c: code },
    );
    if (dup) return { type: "error", text: `El usuario ya tiene la placa "${code}".` };
    await execute(
      "INSERT INTO users_badges (user_id, slot_id, badge_code) VALUES (:u, 0, :c)",
      { u: userId, c: code },
    );
  } catch (err) {
    return { type: "error", text: `No se pudo otorgar la placa: ${(err as Error).message}` };
  }

  revalidatePath(`/admin/users/${userId}`);
  return {
    type: "success",
    text: `Placa "${code}" otorgada. (El usuario debe volver a entrar para verla.)`,
  };
}

export async function removeBadge(userId: number, badgeId: number): Promise<void> {
  const auth = await requireStaff();
  if (!auth.ok) return;
  if (!Number.isInteger(badgeId) || !Number.isInteger(userId)) return;
  await execute("DELETE FROM users_badges WHERE id = :id AND user_id = :u", {
    id: badgeId,
    u: userId,
  });
  revalidatePath(`/admin/users/${userId}`);
}
