import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/features/auth/constants";

// Next.js 16 renamed `middleware.ts`/`export function middleware` to
// `proxy.ts`/`export function proxy` — this is the current convention, not
// the `middleware.ts` name used in earlier Next.js versions.
export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};

/**
 * Cheap cookie-presence check only — no backend call. The authoritative
 * check (does this key still work) happens once per navigation in
 * (dashboard)/layout.tsx via getSession(), which also supplies the Topbar
 * email, so doing it here too would just duplicate that call for nothing.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard") && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if ((pathname === "/login" || pathname === "/register") && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}
