"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { queryOne, execute } from "@/lib/db";
import {
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  type DbUser,
} from "@/lib/auth";
import { resolveOwnerByLogin } from "@/lib/owners";

export type FormResult = { type: "error" | "success"; text: string };

async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "127.0.0.1";
}

export async function loginAction(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const login = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!login || !password) {
    return { type: "error", text: "Escribe tu nombre de usuario y contraseña." };
  }

  const owner = await resolveOwnerByLogin(login);
  if (owner === "ambiguous") {
    return { type: "error", text: "Ese correo pertenece a varias cuentas. Inicia sesión con tu nombre de usuario." };
  }
  if (!owner || !(await verifyPassword(password, owner.password))) {
    return { type: "error", text: "Usuario o contraseña incorrectos." };
  }
  if (owner.banned) {
    return { type: "error", text: "Esta cuenta está suspendida." };
  }

  // Load the active avatar (the owner's primary, or its first avatar).
  const avatar = await queryOne<DbUser>(
    `SELECT * FROM users
      WHERE owner_id = :ownerId
      ORDER BY (id = COALESCE(:primary, 0)) DESC, id ASC
      LIMIT 1`,
    { primary: owner.primary_user_id, ownerId: owner.id },
  );
  if (!avatar) {
    return { type: "error", text: "Tu cuenta no tiene ningún avatar. Contacta con el staff." };
  }

  const now = Math.floor(Date.now() / 1000);
  const ip = await clientIp();
  await execute(
    "UPDATE users SET last_login = :now, ip_current = :ip WHERE id = :id",
    { now, ip, id: avatar.id },
  );
  await execute("UPDATE account_owners SET last_login = :now WHERE id = :id", {
    now,
    id: owner.id,
  });

  const token = await createSessionToken({
    ownerId: owner.id,
    ownerName: owner.username,
    userId: avatar.id,
    username: avatar.username,
    rank: avatar.rank,
  });
  await setSessionCookie(token);

  redirect("/me");
}
