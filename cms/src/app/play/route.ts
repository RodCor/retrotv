import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { issueSsoTicket } from "@/lib/sso";
import { config } from "@/lib/config";

/**
 * GET /play — issues a fresh SSO ticket for the logged-in user and redirects
 * to the Nitro client at `${CLIENT_URL}/?sso=<ticket>`. Anonymous visitors are
 * sent to the login page first.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const ticket = await issueSsoTicket(session.userId);
  const target = `${config.hotel.clientUrl}/?sso=${encodeURIComponent(ticket)}`;
  return NextResponse.redirect(target);
}
