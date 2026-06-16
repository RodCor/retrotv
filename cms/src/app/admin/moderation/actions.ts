"use server";

import { revalidatePath } from "next/cache";
import { execute, queryOne, query } from "@/lib/db";
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
  owner_id: number | null;
}

/** Insert one Arcturus account ban for a single avatar id. */
async function banAvatar(
  avatar: BanTargetRow,
  staffId: number,
  reason: string,
  expire: number,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await execute(
    `INSERT INTO bans
       (user_id, ip, machine_id, user_staff_id, timestamp, ban_expire, ban_reason, type, cfh_topic)
     VALUES
       (:userId, :ip, :machineId, :staffId, :ts, :expire, :reason, 'account', 0)`,
    {
      userId: avatar.id,
      ip: avatar.ip_current ?? "",
      machineId: avatar.machine_id ?? "",
      staffId,
      ts: now,
      expire,
      reason,
    },
  );
}

async function loadBanTarget(name: string): Promise<BanTargetRow | null> {
  try {
    return await queryOne<BanTargetRow>(
      "SELECT id, ip_current, machine_id, owner_id FROM users WHERE username = :name",
      { name },
    );
  } catch {
    return await queryOne<BanTargetRow>(
      "SELECT id, ip_current, NULL AS machine_id, owner_id FROM users WHERE username = :name",
      { name },
    );
  }
}

/**
 * Ban a user by username. When `wholeOwner` is set, the ban cascades to every
 * avatar of the same owner and flags the owner account so it can't log into
 * the website either.
 */
export async function banUserByName(
  username: string,
  reason: string,
  hours: number,
  wholeOwner = false,
): Promise<ActionResult> {
  const staff = await requireStaff();
  if (!staff) return { type: "error", text: "No autorizado." };

  const name = (username ?? "").trim();
  if (!name) return { type: "error", text: "El usuario es obligatorio." };

  const cleanReason = (reason ?? "").trim() || "Sin motivo especificado";
  const dur = Number(hours);
  if (!Number.isFinite(dur) || dur <= 0) {
    return { type: "error", text: "Las horas deben ser un número positivo." };
  }

  const target = await loadBanTarget(name);
  if (!target) {
    return { type: "error", text: `No se encontró ningún usuario llamado "${name}".` };
  }

  const now = Math.floor(Date.now() / 1000);
  const expire = now + Math.floor(dur * 3600);

  try {
    if (wholeOwner && target.owner_id) {
      const siblings = await query<BanTargetRow>(
        "SELECT id, ip_current, machine_id, owner_id FROM users WHERE owner_id = :o",
        { o: target.owner_id },
      );
      for (const sib of siblings) {
        await banAvatar(sib, staff.userId, cleanReason, expire);
      }
      await execute(
        "UPDATE account_owners SET banned = 1, ban_reason = :reason WHERE id = :o",
        { reason: cleanReason, o: target.owner_id },
      );
      revalidatePath("/admin/moderation");
      return {
        type: "success",
        text: `Cuenta de ${name} baneada (${siblings.length} avatar(es)) durante ${dur} ${dur === 1 ? "hora" : "horas"}.`,
      };
    }

    await banAvatar(target, staff.userId, cleanReason, expire);
  } catch (err) {
    return {
      type: "error",
      text: `No se pudo banear: ${err instanceof Error ? err.message : "error desconocido"}`,
    };
  }

  revalidatePath("/admin/moderation");
  return { type: "success", text: `${name} baneado durante ${dur} ${dur === 1 ? "hora" : "horas"}.` };
}

/** Lift (delete) a ban by id; also clears the owner flag for that avatar's owner. */
export async function deleteBan(formData: FormData): Promise<void> {
  const staff = await requireStaff();
  if (!staff) return;

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;

  const ban = await queryOne<{ user_id: number }>(
    "SELECT user_id FROM bans WHERE id = :id",
    { id },
  );
  await execute("DELETE FROM bans WHERE id = :id", { id });
  if (ban) {
    await execute(
      `UPDATE account_owners SET banned = 0, ban_reason = NULL
        WHERE id = (SELECT owner_id FROM users WHERE id = :uid)`,
      { uid: ban.user_id },
    );
  }
  revalidatePath("/admin/moderation");
}
