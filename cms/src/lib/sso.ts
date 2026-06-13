import "server-only";
import { randomBytes } from "crypto";
import { execute } from "./db";

/**
 * Generates a fresh single-sign-on ticket, stores it on the user row, and
 * returns it. The Nitro client is then opened at `${CLIENT_URL}?sso=<ticket>`;
 * the Arcturus emulator validates the ticket against `users.auth_ticket`.
 */
export async function issueSsoTicket(userId: number): Promise<string> {
  const ticket = `retrotv-${randomBytes(24).toString("hex")}`;
  await execute(
    "UPDATE users SET auth_ticket = :ticket WHERE id = :id",
    { ticket, id: userId },
  );
  return ticket;
}
