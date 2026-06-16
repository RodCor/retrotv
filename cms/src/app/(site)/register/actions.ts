"use server";

import { redirect } from "next/navigation";
import { queryOne, execute } from "@/lib/db";
import {
  hashPassword,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import { createAvatar } from "@/lib/owners";

export type FormResult = { type: "error" | "success"; text: string };

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerAction(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!USERNAME_RE.test(username)) {
    return { type: "error", text: "El usuario debe tener 3–20 caracteres: letras, números o guiones bajos." };
  }
  if (!EMAIL_RE.test(email)) {
    return { type: "error", text: "Introduce un correo electrónico válido." };
  }
  if (password.length < 4) {
    return { type: "error", text: "La contraseña debe tener al menos 4 caracteres." };
  }
  if (password !== confirm) {
    return { type: "error", text: "Las contraseñas no coinciden." };
  }

  // Owner username and the first avatar share the chosen name; both must be free.
  const ownerTaken = await queryOne<{ id: number }>(
    "SELECT id FROM account_owners WHERE username = :u",
    { u: username },
  );
  const avatarTaken = await queryOne<{ id: number }>(
    "SELECT id FROM users WHERE username = :u",
    { u: username },
  );
  if (ownerTaken || avatarTaken) {
    return { type: "error", text: "Ese nombre de usuario ya está en uso." };
  }

  const now = Math.floor(Date.now() / 1000);
  const hashed = await hashPassword(password);

  // 1) Create the owner (website credential).
  const ownerResult = await execute(
    `INSERT INTO account_owners (username, email, password, created)
     VALUES (:username, :email, :password, :now)`,
    { username, email, password: hashed, now },
  );
  const ownerId = ownerResult.insertId;

  // 2) Create its first avatar (cap not enforced — owner has none yet).
  const avatar = await createAvatar(ownerId, username, "M", false);
  if ("error" in avatar) {
    // Roll back the orphan owner so the user can retry cleanly.
    await execute("DELETE FROM account_owners WHERE id = :id", { id: ownerId });
    return { type: "error", text: avatar.error };
  }

  // 3) Point the owner at its primary avatar.
  await execute(
    "UPDATE account_owners SET primary_user_id = :avatarId WHERE id = :ownerId",
    { avatarId: avatar.id, ownerId },
  );

  const token = await createSessionToken({
    ownerId,
    ownerName: username,
    userId: avatar.id,
    username,
    rank: 1,
  });
  await setSessionCookie(token);

  redirect("/me");
}
