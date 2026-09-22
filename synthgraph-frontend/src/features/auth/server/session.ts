import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { z } from "zod";
import { SESSION_COOKIE_NAME } from "../constants";
import type { User } from "../types/user";
import { getMeByApiKey } from "./auth-api";

const sessionCookieSchema = z.object({
  apiKeyId: z.string().min(1),
  apiKey: z.string().min(1),
});

export type SessionCookie = z.infer<typeof sessionCookieSchema>;

export type Session = {
  user: User;
  apiKeyId: string;
  apiKey: string;
};

export async function setSessionCookie(value: SessionCookie): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, JSON.stringify(value), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // "lax", not "strict": strict can drop the cookie on a cross-site
    // top-level navigation into /dashboard, bouncing an otherwise-valid
    // session to /login.
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days — a bounded browser-side lifetime.
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

/**
 * Reads the cookie without validating the key against the backend — used
 * by logout, which needs `apiKeyId` to attempt revocation even if the key
 * has already gone bad server-side (in which case there's nothing to
 * revoke, but the cookie should still be cleared client-side).
 */
export async function readSessionCookie(): Promise<SessionCookie | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = sessionCookieSchema.safeParse(parsedJson);
  return result.success ? result.data : null;
}

/**
 * The authoritative "who is logged in" check: one `GET /auth/me/api-key`
 * call per navigation (via React's `cache()`, so repeated calls within the
 * same request/render don't re-fetch), which also supplies the Topbar's
 * "signed in as ..." email — not wasted work, the same cost relocated to
 * where it's actually needed.
 *
 * A malformed cookie or a key the backend no longer accepts both resolve
 * to `null` (logged-out), never a thrown error — callers redirect through
 * `/api/auth/clear-session` rather than calling `redirect()` directly here,
 * since only Route Handlers/Server Actions/middleware can mutate cookies.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const cookie = await readSessionCookie();
  if (!cookie) return null;

  try {
    const user = await getMeByApiKey(cookie.apiKey);
    return { user, apiKeyId: cookie.apiKeyId, apiKey: cookie.apiKey };
  } catch {
    return null;
  }
});

/**
 * For use inside (dashboard) pages: the layout already redirects on a
 * missing session, but TypeScript can't see that across files. Calling
 * getSession() again here is cheap (deduped per-request by cache()) and
 * gives each page a properly non-null, type-narrowed Session.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    redirect("/api/auth/clear-session?next=/login");
  }
  return session;
}
