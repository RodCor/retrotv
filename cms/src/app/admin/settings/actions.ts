"use server";

import { revalidatePath } from "next/cache";
import { execute } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";

type ActionResult = { type: "error" | "success"; text: string };

// Only these keys may be edited from the CRM.
const ALLOWED_KEYS = new Set<string>([
  "hotel.name",
  "hotel.max.rooms.per.user",
  "hotel.max.rooms.per.user.hc",
  "hotel.beta.enabled",
  "console.mode",
  "welcome.alert.enabled",
  "welcome.alert.message",
  "hotel.room.user.max",
  "maximum.bots.per.room",
  "maximum.pets.per.room",
  "imager.location.output.camera",
  "camera.url",
  "hotel.wardrobe.enabled",
  "rcon.commands.enabled",
  "chat.flood.protection.length",
  "message.too.long.length",
  "floortext.maxlength",
]);

/** Update a single emulator_settings value. `key` is a reserved word — backtick it. */
export async function updateSetting(
  key: string,
  value: string,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) {
    return { type: "error", text: "Not authorized." };
  }

  const k = (key ?? "").trim();
  if (!ALLOWED_KEYS.has(k)) {
    return { type: "error", text: "That setting cannot be edited here." };
  }

  const v = String(value ?? "");

  try {
    const result = await execute(
      "UPDATE emulator_settings SET `value` = :v WHERE `key` = :k",
      { v, k },
    );
    if (result.affectedRows === 0) {
      return { type: "error", text: `Setting "${k}" not found.` };
    }
  } catch (err) {
    return {
      type: "error",
      text: `Update failed: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }

  revalidatePath("/admin/settings");
  return {
    type: "success",
    text: `Saved. Restart the emulator for "${k}" to take effect.`,
  };
}

/** Enable/disable an installed emulator plugin (applied on next emulator restart). */
export async function togglePlugin(
  jar: string,
  enabled: boolean,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) {
    return { type: "error", text: "Not authorized." };
  }

  const j = (jar ?? "").trim();
  if (!j) return { type: "error", text: "Invalid plugin." };

  try {
    const result = await execute(
      "UPDATE cms_plugins SET enabled = :e WHERE jar = :j",
      { e: enabled ? 1 : 0, j },
    );
    if (result.affectedRows === 0) {
      return { type: "error", text: "Plugin not found in the registry." };
    }
  } catch (err) {
    return {
      type: "error",
      text: `Update failed: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }

  revalidatePath("/admin/settings");
  return {
    type: "success",
    text: `${enabled ? "Enabled" : "Disabled"} "${j}". Restart the emulator to apply.`,
  };
}
