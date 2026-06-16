import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { config } from "./config";
import { queryOne } from "./db";

const secretKey = new TextEncoder().encode(config.session.secret);

export interface SessionPayload {
  ownerId: number;   // the logged-in identity (website account)
  ownerName: string;
  userId: number;    // the active avatar shown to the rest of the CMS
  username: string;
  rank: number;
  [key: string]: unknown;
}

export interface DbUser {
  id: number;
  username: string;
  password: string;
  mail: string | null;
  rank: number;
  look: string;
  motto: string;
  credits: number;
  pixels: number;
  points: number;
  gender: "M" | "F";
  auth_ticket: string;
  account_created: number;
  last_login: number;
  last_online: number;
  online: string;
  home_room: number;
}

/* ----------------------------- password hashing ---------------------------- */

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  if (!hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/* -------------------------------- sessions --------------------------------- */

export async function createSessionToken(
  payload: SessionPayload,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${config.session.maxAgeSeconds}s`)
    .sign(secretKey);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(config.session.cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: config.session.maxAgeSeconds,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(config.session.cookieName);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(config.session.cookieName)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** Fetch the full DB user for the current session, or null. */
export async function getCurrentUser(): Promise<DbUser | null> {
  const session = await getSession();
  if (!session) return null;
  return queryOne<DbUser>("SELECT * FROM users WHERE id = :id", {
    id: session.userId,
  });
}

/**
 * The minimum rank considered "staff" / able to access the admin CRM.
 * Arcturus default ranks: 1 = user, 7+ = high staff. We gate the CRM at >= 5.
 */
export const ADMIN_MIN_RANK = Number(process.env.ADMIN_MIN_RANK ?? 5);

export function isStaff(rank: number): boolean {
  return rank >= ADMIN_MIN_RANK;
}

/**
 * Like getSession but guarantees an owner identity. Older cookies issued
 * before multi-account lack ownerId; treat those as logged-out so the user
 * re-authenticates into the owner model.
 */
export async function getOwnerSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session || typeof session.ownerId !== "number") return null;
  return session;
}
