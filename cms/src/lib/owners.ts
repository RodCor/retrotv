import "server-only";
import { headers } from "next/headers";
import { query, queryOne, execute } from "./db";
import { hashPassword } from "./auth";
import { config } from "./config";

export interface OwnerRow {
  id: number;
  username: string;
  email: string | null;
  password: string;
  primary_user_id: number | null;
  max_avatars: number | null;
  banned: number;
  ban_reason: string | null;
  created: number;
  last_login: number | null;
}

export interface AvatarRow {
  id: number;
  username: string;
  look: string;
  motto: string;
  rank: number;
  credits: number;
  last_login: number | null;
  gender: string;
  owner_id: number | null;
}

const GLOBAL_CAP_KEY = "retrotv.multiaccount.max_avatars";
const DEFAULT_CAP = 5;

// Same "join with unlimited coins + permanent HC" defaults registration uses.
const UNLIMITED_CREDITS = 1_000_000_000;
const SUB_INT_MAX = 2_147_483_647;
const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

export async function globalAvatarCap(): Promise<number> {
  const row = await queryOne<{ value: string }>(
    "SELECT `value` FROM emulator_settings WHERE `key` = :k",
    { k: GLOBAL_CAP_KEY },
  );
  const n = Number(row?.value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_CAP;
}

export async function effectiveCap(owner: Pick<OwnerRow, "max_avatars">): Promise<number> {
  if (owner.max_avatars && owner.max_avatars > 0) return owner.max_avatars;
  return globalAvatarCap();
}

export async function getOwnerById(id: number): Promise<OwnerRow | null> {
  return queryOne<OwnerRow>("SELECT * FROM account_owners WHERE id = :id", { id });
}

/**
 * Resolve an owner from a login string: exact username first; otherwise a
 * UNIQUELY-matching email. Returns "ambiguous" when an email matches >1 owner
 * (migrated emails are not unique), so the caller can ask for the username.
 */
export async function resolveOwnerByLogin(
  login: string,
): Promise<OwnerRow | "ambiguous" | null> {
  const l = login.trim();
  if (!l) return null;
  const byName = await queryOne<OwnerRow>(
    "SELECT * FROM account_owners WHERE username = :l",
    { l },
  );
  if (byName) return byName;
  const byEmail = await query<OwnerRow>(
    "SELECT * FROM account_owners WHERE email = :l LIMIT 2",
    { l },
  );
  if (byEmail.length === 1) return byEmail[0];
  if (byEmail.length > 1) return "ambiguous";
  return null;
}

export async function getOwnerAvatars(ownerId: number): Promise<AvatarRow[]> {
  return query<AvatarRow>(
    `SELECT id, username, look, motto, rank, credits, last_login, gender, owner_id
       FROM users WHERE owner_id = :o ORDER BY id`,
    { o: ownerId },
  );
}

/** An avatar row ONLY if it belongs to the given owner (ownership guard). */
export async function getAvatarForOwner(
  ownerId: number,
  avatarId: number,
): Promise<AvatarRow | null> {
  return queryOne<AvatarRow>(
    `SELECT id, username, look, motto, rank, credits, last_login, gender, owner_id
       FROM users WHERE id = :a AND owner_id = :o`,
    { a: avatarId, o: ownerId },
  );
}

async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "127.0.0.1";
}

export type CreateAvatarResult = { id: number } | { error: string };

/**
 * Create a native Arcturus `users` row owned by `ownerId`, with the same
 * starter defaults registration applies (unlimited credits, permanent HC,
 * default look). The avatar gets a random password — it never logs in
 * directly; only the owner does, then SSO carries it into the hotel.
 *
 * Pass `enforceCap=false` only for the very first avatar created alongside a
 * brand-new owner (the owner has no avatars yet by definition).
 */
export async function createAvatar(
  ownerId: number,
  username: string,
  gender: "M" | "F",
  enforceCap = true,
): Promise<CreateAvatarResult> {
  const name = username.trim();
  if (!USERNAME_RE.test(name)) {
    return { error: "El usuario debe tener 3–20 caracteres: letras, números o guiones bajos." };
  }

  const taken = await queryOne<{ id: number }>(
    "SELECT id FROM users WHERE username = :u",
    { u: name },
  );
  if (taken) return { error: "Ese nombre de avatar ya está en uso." };

  if (enforceCap) {
    const owner = await getOwnerById(ownerId);
    if (!owner) return { error: "Cuenta no encontrada." };
    const cap = await effectiveCap(owner);
    const countRow = await queryOne<{ n: number }>(
      "SELECT COUNT(*) AS n FROM users WHERE owner_id = :o",
      { o: ownerId },
    );
    if (Number(countRow?.n ?? 0) >= cap) {
      return { error: `Has alcanzado el máximo de ${cap} avatares.` };
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const ip = await clientIp();
  // Random, unusable-by-the-user emulator password (login is owner-only).
  const randomPass = await hashPassword(`avatar-${ownerId}-${now}-${Math.random()}`);

  const result = await execute(
    `INSERT INTO users
       (username, real_name, password, mail, account_created, last_login,
        last_online, motto, look, gender, rank, credits, pixels, points,
        auth_ticket, ip_register, ip_current, home_room, owner_id)
     VALUES
       (:username, :real_name, :password, :mail, :now, :now,
        :now, :motto, :look, :gender, 1, :credits, :pixels, :points,
        '', :ip, :ip, 0, :ownerId)`,
    {
      username: name,
      real_name: name,
      password: randomPass,
      mail: "",
      now,
      motto: config.hotel.defaultMotto,
      look: config.hotel.defaultLook,
      gender,
      credits: UNLIMITED_CREDITS,
      pixels: config.hotel.startPixels,
      points: config.hotel.startPoints,
      ip,
      ownerId,
    },
  );
  const id = result.insertId;

  await execute(
    `INSERT INTO users_subscriptions
       (user_id, subscription_type, timestamp_start, duration, active)
     VALUES (:id, 'HABBO_CLUB', :now, :duration, 1)`,
    { id, now, duration: SUB_INT_MAX - now },
  );

  return { id };
}
