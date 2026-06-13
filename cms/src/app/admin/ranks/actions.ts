"use server";

import { revalidatePath } from "next/cache";
import { execute } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";

type ActionResult = { type: "error" | "success"; text: string };

async function requireStaff(): Promise<ActionResult | null> {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) {
    return { type: "error", text: "Unauthorized." };
  }
  return null;
}

export async function createRank(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const denied = await requireStaff();
  if (denied) return denied;

  const rank_name = String(formData.get("rank_name") ?? "").trim();
  const level = Number(formData.get("level"));
  const badge = String(formData.get("badge") ?? "").trim();
  const prefix = String(formData.get("prefix") ?? "").trim();
  const prefix_color = String(formData.get("prefix_color") ?? "").trim();

  if (!rank_name) {
    return { type: "error", text: "Rank name is required." };
  }
  if (!Number.isInteger(level) || level < 1) {
    return { type: "error", text: "Level must be a positive integer." };
  }

  try {
    await execute(
      `INSERT INTO permissions (rank_name, badge, level, prefix, prefix_color)
       VALUES (:rank_name, :badge, :level, :prefix, :prefix_color)`,
      { rank_name, badge, level, prefix, prefix_color },
    );
  } catch {
    return { type: "error", text: "Failed to create rank." };
  }

  revalidatePath("/admin/ranks");
  return { type: "success", text: `Rank "${rank_name}" created.` };
}

export async function updateRank(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const denied = await requireStaff();
  if (denied) return denied;

  const id = Number(formData.get("id"));
  const rank_name = String(formData.get("rank_name") ?? "").trim();
  const level = Number(formData.get("level"));
  const badge = String(formData.get("badge") ?? "").trim();

  if (!Number.isInteger(id) || id < 1) {
    return { type: "error", text: "Invalid rank id." };
  }
  if (!rank_name) {
    return { type: "error", text: "Rank name is required." };
  }
  if (!Number.isInteger(level) || level < 1) {
    return { type: "error", text: "Level must be a positive integer." };
  }

  try {
    await execute(
      `UPDATE permissions
       SET rank_name = :rank_name, level = :level, badge = :badge
       WHERE id = :id`,
      { rank_name, level, badge, id },
    );
  } catch {
    return { type: "error", text: "Failed to update rank." };
  }

  revalidatePath("/admin/ranks");
  return { type: "success", text: "Rank updated." };
}

export async function deleteRank(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const denied = await requireStaff();
  if (denied) return denied;

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) {
    return { type: "error", text: "Invalid rank id." };
  }

  try {
    await execute("DELETE FROM permissions WHERE id = :id", { id });
  } catch {
    return { type: "error", text: "Failed to delete rank." };
  }

  revalidatePath("/admin/ranks");
  return { type: "success", text: "Rank deleted." };
}
