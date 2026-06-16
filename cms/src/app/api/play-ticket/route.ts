import { NextRequest, NextResponse } from "next/server";
import { getOwnerSession } from "@/lib/auth";
import { getAvatarForOwner } from "@/lib/owners";
import { issueSsoTicket } from "@/lib/sso";
import { config } from "@/lib/config";

/**
 * POST /api/play-ticket { avatarId } → { url }
 * Mints a fresh SSO ticket for ONE avatar the session owner owns and returns
 * the Nitro client URL. Refuses avatars the owner does not own.
 */
export async function POST(request: NextRequest) {
  const session = await getOwnerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let avatarId: number;
  try {
    const body = await request.json();
    avatarId = Number(body?.avatarId);
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!Number.isInteger(avatarId)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const avatar = await getAvatarForOwner(session.ownerId, avatarId);
  if (!avatar) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const ticket = await issueSsoTicket(avatar.id);
  const url = `${config.hotel.clientUrl}/?sso=${encodeURIComponent(ticket)}`;
  return NextResponse.json({ url });
}
