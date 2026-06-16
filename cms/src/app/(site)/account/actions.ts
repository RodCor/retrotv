"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { execute } from "@/lib/db";
import {
  getOwnerSession,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import {
  getOwnerById,
  getAvatarForOwner,
  createAvatar,
} from "@/lib/owners";

export type FormResult = { type: "error" | "success"; text: string };

/** Create a new avatar under the logged-in owner (cap enforced). */
export async function createAvatarAction(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const session = await getOwnerSession();
  if (!session) return { type: "error", text: "No autorizado." };

  const username = String(formData.get("username") ?? "").trim();
  const gender = String(formData.get("gender") ?? "M") === "F" ? "F" : "M";

  const result = await createAvatar(session.ownerId, username, gender);
  if ("error" in result) return { type: "error", text: result.error };

  revalidatePath("/account");
  return { type: "success", text: `Avatar "${username}" creado.` };
}

/** Set which avatar is the owner's default/active on next login. */
export async function setPrimaryAction(formData: FormData): Promise<void> {
  const session = await getOwnerSession();
  if (!session) return;
  const avatarId = Number(formData.get("avatarId"));
  if (!Number.isInteger(avatarId)) return;

  const avatar = await getAvatarForOwner(session.ownerId, avatarId);
  if (!avatar) return; // not yours → ignore

  await execute(
    "UPDATE account_owners SET primary_user_id = :a WHERE id = :o",
    { a: avatarId, o: session.ownerId },
  );
  revalidatePath("/account");
}

/** Switch the active avatar in the current session (re-issues the JWT). */
export async function switchAvatarAction(formData: FormData): Promise<void> {
  const session = await getOwnerSession();
  if (!session) return;
  const avatarId = Number(formData.get("avatarId"));
  if (!Number.isInteger(avatarId)) return;

  const avatar = await getAvatarForOwner(session.ownerId, avatarId);
  if (!avatar) return; // ownership guard

  const owner = await getOwnerById(session.ownerId);
  const token = await createSessionToken({
    ownerId: session.ownerId,
    ownerName: owner?.username ?? session.ownerName,
    userId: avatar.id,
    username: avatar.username,
    rank: avatar.rank,
  });
  await setSessionCookie(token);
  redirect("/account");
}
