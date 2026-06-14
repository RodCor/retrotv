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
    return { type: "error", text: "Debes iniciar sesión." };
  }

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const user = await queryOne<DbUser>(
    "SELECT * FROM users WHERE id = :id",
    { id: session.userId },
  );
  if (!user) {
    return { type: "error", text: "Cuenta no encontrada." };
  }

  const ok = await verifyPassword(current, user.password);
  if (!ok) {
    return { type: "error", text: "La contraseña actual es incorrecta." };
  }

  if (next.length < 4) {
    return {
      type: "error",
      text: "La nueva contraseña debe tener al menos 4 caracteres.",
    };
  }
  if (next !== confirm) {
    return { type: "error", text: "Las contraseñas no coinciden." };
  }

  const hash = await hashPassword(next);
  await execute("UPDATE users SET password = :p WHERE id = :id", {
    p: hash,
    id: session.userId,
  });

  return { type: "success", text: "¡Contraseña cambiada!" };
}
