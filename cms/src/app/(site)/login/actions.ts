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
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { type: "error", text: "Enter your username and password." };
  }

  const user = await queryOne<DbUser>(
    "SELECT * FROM users WHERE username = :u",
    { u: username },
  );

  if (!user || !(await verifyPassword(password, user.password))) {
    return { type: "error", text: "Invalid username or password." };
  }

  const now = Math.floor(Date.now() / 1000);
  const ip = await clientIp();
  await execute(
    "UPDATE users SET last_login = :now, ip_current = :ip WHERE id = :id",
    { now, ip, id: user.id },
  );

  const token = await createSessionToken({
    userId: user.id,
    username: user.username,
    rank: user.rank,
  });
  await setSessionCookie(token);

  redirect("/me");
}
