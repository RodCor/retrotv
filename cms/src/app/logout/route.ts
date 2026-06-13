import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

/**
 * GET /logout — clears the session cookie and returns to the homepage.
 *
 * Next.js prefetches <Link> targets, which would otherwise fire this handler
 * (logging the user out!) just from rendering a link to it. Skip the side
 * effect on prefetch requests — only a real navigation logs out.
 */
export async function GET(request: NextRequest) {
  if (request.headers.get("Next-Router-Prefetch") === "1") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/", request.url));
}
