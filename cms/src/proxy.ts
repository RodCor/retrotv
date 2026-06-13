import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { config as appConfig } from "@/lib/config";

const secretKey = new TextEncoder().encode(appConfig.session.secret);
const ADMIN_MIN_RANK = Number(process.env.ADMIN_MIN_RANK ?? 5);

/**
 * Next.js 16 "proxy" (formerly middleware). Runs on the Node.js runtime.
 * Guards authenticated areas (/me) and the staff CRM (/admin).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(appConfig.session.cookieName)?.value;

  let payload: { userId?: number; rank?: number } | null = null;
  if (token) {
    try {
      const verified = await jwtVerify(token, secretKey);
      payload = verified.payload as { userId?: number; rank?: number };
    } catch {
      payload = null;
    }
  }

  const isAuthed = !!payload?.userId;
  const isStaff = (payload?.rank ?? 0) >= ADMIN_MIN_RANK;

  if (pathname.startsWith("/admin")) {
    if (!isAuthed) return redirectTo(request, "/login");
    if (!isStaff) return redirectTo(request, "/me");
  }

  if (pathname.startsWith("/me")) {
    if (!isAuthed) return redirectTo(request, "/login");
  }

  return NextResponse.next();
}

function redirectTo(request: NextRequest, path: string) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/me/:path*"],
};
