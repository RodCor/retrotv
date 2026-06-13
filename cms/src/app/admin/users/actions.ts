"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { execute } from "@/lib/db";
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
      result: { type: "error", text: "Unauthorized — staff access required." },
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

  if (!userId) return { type: "error", text: "Invalid user." };

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
    return { type: "error", text: "Failed to update currency." };
  }

  revalidatePath(`/admin/users/${userId}`);
  return {
    type: "success",
    text: `Currency updated: ${credits}c / ${duckets} duckets / ${diamonds} diamonds / ${points} pts.`,
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

  if (!userId) return { type: "error", text: "Invalid user." };
  if (rank < 1) return { type: "error", text: "Invalid rank." };

  try {
    await execute("UPDATE users SET rank = :rank WHERE id = :userId", {
      rank,
      userId,
    });
  } catch {
    return { type: "error", text: "Failed to update rank." };
  }

  revalidatePath(`/admin/users/${userId}`);
  return { type: "success", text: `Rank set to ${rank}.` };
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

  if (!userId) return { type: "error", text: "Invalid user." };
  if (!look) return { type: "error", text: "Look cannot be empty." };

  try {
    await execute(
      "UPDATE users SET motto = :motto, look = :look, mail = :mail WHERE id = :userId",
      { motto, look, mail, userId },
    );
  } catch {
    return { type: "error", text: "Failed to update profile." };
  }

  revalidatePath(`/admin/users/${userId}`);
  return { type: "success", text: "Profile updated." };
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

  if (!userId) return { type: "error", text: "Invalid user." };
  if (newPass.length < 6) {
    return { type: "error", text: "Password must be at least 6 characters." };
  }

  try {
    const hashed = await hashPassword(newPass);
    await execute("UPDATE users SET password = :password WHERE id = :userId", {
      password: hashed,
      userId,
    });
  } catch {
    return { type: "error", text: "Failed to reset password." };
  }

  revalidatePath(`/admin/users/${userId}`);
  return { type: "success", text: "Password reset successfully." };
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

  if (!userId) return { type: "error", text: "Invalid user." };
  if (!reason) return { type: "error", text: "Ban reason is required." };
  if (hours <= 0) return { type: "error", text: "Ban duration must be > 0 hours." };

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
    return { type: "error", text: "Failed to ban user." };
  }

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin");
  return {
    type: "success",
    text: `User banned for ${hours}h: ${reason}`,
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
  if (!userId) return { type: "error", text: "Invalid user." };

  try {
    await execute("DELETE FROM users WHERE id = :userId", { userId });
  } catch {
    return { type: "error", text: "Failed to delete user." };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  redirect("/admin/users");
}
