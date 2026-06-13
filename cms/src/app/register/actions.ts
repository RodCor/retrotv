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
      text: "Username must be 3–20 characters, letters, numbers or underscores only.",
    };
  }
  if (!EMAIL_RE.test(email)) {
    return { type: "error", text: "Please enter a valid email address." };
  }
  if (password.length < 4) {
    return { type: "error", text: "Password must be at least 4 characters." };
  }
  if (password !== confirm) {
    return { type: "error", text: "Passwords do not match." };
  }

  const existing = await queryOne<{ id: number }>(
    "SELECT id FROM users WHERE username = :u",
    { u: username },
  );
  if (existing) {
    return { type: "error", text: "That username is already taken." };
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
      credits: config.hotel.startCredits,
      pixels: config.hotel.startPixels,
      points: config.hotel.startPoints,
      auth_ticket: "",
      ip_register: ip,
      ip_current: ip,
      home_room: 0,
    },
  );

  const userId = result.insertId;
  const token = await createSessionToken({ userId, username, rank: 1 });
  await setSessionCookie(token);

  redirect("/me");
}
