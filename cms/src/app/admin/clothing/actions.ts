"use server";

import { revalidatePath } from "next/cache";
import { execute, queryOne } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";

type ActionResult = { type: "error" | "success"; text: string };

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
    return { type: "error", text: "Not authorised." };
  }

  const username = String(formData.get("username") ?? "").trim();
  const look = String(formData.get("look") ?? "").trim();

  if (!username) {
    return { type: "error", text: "Username is required." };
  }
  if (!isValidLook(look)) {
    return {
      type: "error",
      text: "Look is invalid. Use a figure string like hr-100-0.hd-180-1…",
    };
  }

  const user = await queryOne<{ id: number; username: string }>(
    "SELECT id, username FROM users WHERE username = :username",
    { username },
  );
  if (!user) {
    return { type: "error", text: `No user named "${username}".` };
  }

  try {
    const res = await execute(
      "UPDATE users SET look = :look WHERE id = :id",
      { look, id: user.id },
    );
    if (res.affectedRows === 0) {
      return { type: "error", text: "No rows updated." };
    }
  } catch (err) {
    return {
      type: "error",
      text: `Failed to update look: ${(err as Error).message}`,
    };
  }

  revalidatePath("/admin/clothing");
  return { type: "success", text: `Updated look for ${user.username}.` };
}
