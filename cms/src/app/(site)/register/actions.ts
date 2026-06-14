"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { queryOne, execute } from "@/lib/db";
import {
  hashPassword,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import { config } from "@/lib/config";

export type FormResult = { type: "error" | "success"; text: string };

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Every habbo joins with effectively-unlimited coins and permanent Habbo Club.
const UNLIMITED_CREDITS = 1_000_000_000;
const HC_DURATION = 4_000_000_000; // ~126 years from join — i.e. forever

async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "127.0.0.1";
}

export async function registerAction(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!USERNAME_RE.test(username)) {
    return {
      type: "error",
      text: "El usuario debe tener 3–20 caracteres: letras, números o guiones bajos.",
    };
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

  const existing = await queryOne<{ id: number }>(
    "SELECT id FROM users WHERE username = :u",
    { u: username },
  );
  if (existing) {
    return { type: "error", text: "Ese nombre de usuario ya está en uso." };
  }

  const now = Math.floor(Date.now() / 1000);
  const ip = await clientIp();
  const hashed = await hashPassword(password);

  const result = await execute(
    `INSERT INTO users
       (username, real_name, password, mail, account_created, last_login,
        last_online, motto, look, gender, rank, credits, pixels, points,
        auth_ticket, ip_register, ip_current, home_room)
     VALUES
       (:username, :real_name, :password, :mail, :account_created, :last_login,
        :last_online, :motto, :look, :gender, :rank, :credits, :pixels, :points,
        :auth_ticket, :ip_register, :ip_current, :home_room)`,
    {
      username,
      real_name: username,
      password: hashed,
      mail: email,
      account_created: now,
      last_login: now,
      last_online: now,
      motto: config.hotel.defaultMotto,
      look: config.hotel.defaultLook,
      gender: "M",
      rank: 1,
      credits: UNLIMITED_CREDITS,
      pixels: config.hotel.startPixels,
      points: config.hotel.startPoints,
      auth_ticket: "",
      ip_register: ip,
      ip_current: ip,
      home_room: 0,
    },
  );

  const userId = result.insertId;

  // Grant permanent Habbo Club so every new habbo joins with HC forever.
  await execute(
    `INSERT INTO users_subscriptions
       (user_id, subscription_type, timestamp_start, duration, active)
     VALUES (:userId, 'HABBO_CLUB', :now, :duration, 1)`,
    { userId, now, duration: HC_DURATION },
  );

  const token = await createSessionToken({ userId, username, rank: 1 });
  await setSessionCookie(token);

  redirect("/me");
}
