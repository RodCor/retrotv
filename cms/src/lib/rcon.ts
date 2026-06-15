import "server-only";
import net from "node:net";
import { config } from "@/lib/config";
import { query } from "@/lib/db";
import { ADMIN_MIN_RANK } from "@/lib/auth";

/**
 * Send a single RCON message to the Arcturus emulator and resolve with its raw
 * reply. The emulator protocol is one JSON object `{ key, data }` per
 * connection; the server writes a response and closes the socket.
 *
 * Note: the emulator only accepts RCON from IPs in `rcon.allowed` (config.ini).
 * Through Docker, the CMS appears as the bridge gateway IP, which must be listed.
 */
export function rconSend(
  key: string,
  data: Record<string, unknown> = {},
  timeoutMs = 2500,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: config.rcon.host, port: config.rcon.port });
    let response = "";
    let settled = false;
    const finish = (err: Error | null, val?: string) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (err) reject(err);
      else resolve(val ?? "");
    };
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => socket.write(JSON.stringify({ key, data })));
    socket.on("data", (b) => { response += b.toString(); });
    socket.on("end", () => finish(null, response));
    socket.on("close", () => finish(null, response));
    socket.on("timeout", () => finish(new Error("RCON timeout")));
    socket.on("error", (e) => finish(e));
  });
}

/**
 * Refresh the hotel-view news/Hall-of-Fame so admin edits show immediately.
 *
 * The emulator has no headless "reload hotelview" RCON command — the reload is a
 * user-context chat command (`:update_view`). So we run it via `executecommand`
 * as an online staff member if one is present. If nobody eligible is online, the
 * change still appears within the emulator's hourly auto-refresh (or via the
 * in-game `:update_view` command). Never throws — reloading is best-effort.
 */
/**
 * Reload the in-game catalog so new/edited furni offers appear immediately.
 * Unlike the hotel-view reload, `updatecatalog` is a headless RCON command — it
 * needs no online user — so this is reliably instant. Never throws.
 */
export async function reloadCatalog(): Promise<{ pushed: boolean }> {
  try {
    await rconSend("updatecatalog", {});
    return { pushed: true };
  } catch {
    return { pushed: false };
  }
}

/** Run a chat command as the highest-ranked online user (or null if none). */
async function runAsOnlineStaff(command: string): Promise<boolean> {
  const rows = await query<{ id: number }>(
    `SELECT id FROM users
      WHERE online = '1' AND rank >= :rank
      ORDER BY rank DESC LIMIT 1`,
    { rank: ADMIN_MIN_RANK },
  );
  const staff = rows[0];
  if (!staff) return false;
  await rconSend("executecommand", { user_id: staff.id, command });
  return true;
}

export async function reloadHotelView(): Promise<{ pushed: boolean }> {
  try {
    return { pushed: await runAsOnlineStaff(":update_view") };
  } catch {
    return { pushed: false };
  }
}

/**
 * Reload the emulator's furni definitions (items_base) so a newly-added furni is
 * usable without a restart. There's no headless RCON for this — `:update_items`
 * is a user-context command — so it runs as an online staff member if available.
 */
export async function reloadItems(): Promise<{ pushed: boolean }> {
  try {
    return { pushed: await runAsOnlineStaff(":update_items") };
  } catch {
    return { pushed: false };
  }
}
