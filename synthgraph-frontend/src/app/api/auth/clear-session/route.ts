import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/features/auth/server/session";

/**
 * Deletes the session cookie, then redirects. Exists because only Route
 * Handlers/Server Actions/middleware can mutate cookies in the App
 * Router — a Server Component (like (dashboard)/layout.tsx) that found an
 * invalid session must redirect here rather than straight to /login, or
 * the stale cookie stays put and middleware's presence check immediately
 * bounces /login back to /dashboard, looping forever.
 */
export async function GET(request: Request) {
  await clearSessionCookie();

  const url = new URL(request.url);
  const next = url.searchParams.get("next");
  const target = next && next.startsWith("/") ? next : "/login";

  return NextResponse.redirect(new URL(target, request.url));
}
