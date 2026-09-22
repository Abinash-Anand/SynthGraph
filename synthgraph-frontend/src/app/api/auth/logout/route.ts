import { NextResponse } from "next/server";
import { revokeApiKey } from "@/features/api-keys/server/api-keys-api";
import { clearSessionCookie, readSessionCookie } from "@/features/auth/server/session";
import { NotFoundError } from "@/shared/http/errors";

export async function POST() {
  const cookie = await readSessionCookie();

  if (cookie) {
    try {
      await revokeApiKey(cookie.apiKey, cookie.apiKeyId);
    } catch (error) {
      // Already revoked/gone is fine (backend revoke is idempotent-safe);
      // any other failure is logged but must not block clearing the
      // cookie — the user asked to log out, and the browser-side
      // credential should go away regardless.
      if (!(error instanceof NotFoundError)) {
        console.error("auth.logout.revoke_failed", error);
      }
    }
  }

  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
