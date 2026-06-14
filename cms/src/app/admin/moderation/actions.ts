"use server";

import { revalidatePath } from "next/cache";
import { execute, queryOne } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";

type ActionResult = { type: "error" | "success"; text: string };

async function requireStaff() {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) return null;
  return session;
}

interface BanTargetRow {
  id: number;
  ip_current: string | null;
  machine_id: string | null;
}

/** Ban a user by username for a number of hours. */
export async function banUserByName(
  username: string,
  reason: string,
  hours: number,
): Promise<ActionResult> {
  const staff = await requireStaff();
  if (!staff) {
    return { type: "error", text: "No autorizado." };
  }

  const name = (username ?? "").trim();
  if (!name) {
    return { type: "error", text: "El usuario es obligatorio." };
  }

  const cleanReason = (reason ?? "").trim() || "Sin motivo especificado";
  const dur = Number(hours);
  if (!Number.isFinite(dur) || dur <= 0) {
    return { type: "error", text: "Las horas deben ser un número positivo." };
  }

  // Resolve the user. machine_id may not exist on every schema, so be defensive.
  let user: BanTargetRow | null = null;
  try {
    user = await queryOne<BanTargetRow>(
      "SELECT id, ip_current, machine_id FROM users WHERE username = :name",
      { name },
    );
  } catch {
    user = await queryOne<BanTargetRow>(
      "SELECT id, ip_current FROM users WHERE username = :name",
      { name },
    );
  }

  if (!user) {
    return { type: "error", text: `No se encontró ningún usuario llamado "${name}".` };
  }

  const now = Math.floor(Date.now() / 1000);
  const expire = now + Math.floor(dur * 3600);

  try {
    await execute(
      `INSERT INTO bans
         (user_id, ip, machine_id, user_staff_id, timestamp, ban_expire, ban_reason, type, cfh_topic)
       VALUES
         (:userId, :ip, :machineId, :staffId, :ts, :expire, :reason, 'USER', 0)`,
      {
        userId: user.id,
        ip: user.ip_current ?? "",
        machineId: user.machine_id ?? "",
        staffId: staff.userId,
        ts: now,
        expire,
        reason: cleanReason,
      },
    );
  } catch (err) {
    return {
      type: "error",
      text: `No se pudo banear: ${err instanceof Error ? err.message : "error desconocido"}`,
    };
  }

  revalidatePath("/admin/moderation");
  return { type: "success", text: `${name} baneado durante ${dur} ${dur === 1 ? "hora" : "horas"}.` };
}

/** Lift (delete) a ban by id. Called from a per-row form. */
export async function deleteBan(formData: FormData): Promise<void> {
  const staff = await requireStaff();
  if (!staff) return;

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;

  await execute("DELETE FROM bans WHERE id = :id", { id });
  revalidatePath("/admin/moderation");
}
