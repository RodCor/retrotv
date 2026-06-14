"use server";

import { execute, queryOne } from "@/lib/db";
import {
  getSession,
  hashPassword,
  verifyPassword,
  type DbUser,
} from "@/lib/auth";

export type ActionState = { type: "error" | "success"; text: string };

export async function changePasswordAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) {
    return { type: "error", text: "You must be logged in." };
  }

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const user = await queryOne<DbUser>(
    "SELECT * FROM users WHERE id = :id",
    { id: session.userId },
  );
  if (!user) {
    return { type: "error", text: "Account not found." };
  }

  const ok = await verifyPassword(current, user.password);
  if (!ok) {
    return { type: "error", text: "Current password is incorrect." };
  }

  if (next.length < 4) {
    return {
      type: "error",
      text: "New password must be at least 4 characters.",
    };
  }
  if (next !== confirm) {
    return { type: "error", text: "New passwords do not match." };
  }

  const hash = await hashPassword(next);
  await execute("UPDATE users SET password = :p WHERE id = :id", {
    p: hash,
    id: session.userId,
  });

  return { type: "success", text: "Password changed!" };
}
