"use server";

import { revalidatePath } from "next/cache";
import { execute } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";

async function requireStaff() {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function toggleStaffPick(id: number): Promise<void> {
  await requireStaff();
  await execute(
    "UPDATE rooms SET is_staff_picked = IF(is_staff_picked = '1', '0', '1') WHERE id = :id",
    { id },
  );
  revalidatePath("/admin/rooms");
}

export async function togglePublic(id: number): Promise<void> {
  await requireStaff();
  await execute(
    "UPDATE rooms SET is_public = IF(is_public = '1', '0', '1') WHERE id = :id",
    { id },
  );
  revalidatePath("/admin/rooms");
}

export async function deleteRoom(id: number): Promise<void> {
  await requireStaff();
  await execute("DELETE FROM rooms WHERE id = :id", { id });
  revalidatePath("/admin/rooms");
}
