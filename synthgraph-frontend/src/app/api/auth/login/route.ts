import { NextResponse } from "next/server";
import { createApiKey } from "@/features/api-keys/server/api-keys-api";
import { loginSchema } from "@/features/auth/schemas/auth-schemas";
import { loginUser } from "@/features/auth/server/auth-api";
import { setSessionCookie } from "@/features/auth/server/session";
import { AuthenticationError } from "@/shared/http/errors";
import { toFieldErrors } from "@/shared/lib/validation";

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request body." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Check the highlighted fields.", fields: toFieldErrors(parsed.error) },
      { status: 422 },
    );
  }

  let accessToken: string;
  try {
    const result = await loginUser(parsed.data);
    accessToken = result.accessToken;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ ok: false, error: "Incorrect email or password." }, { status: 401 });
    }
    console.error("auth.login.failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not sign you in. Please try again." },
      { status: 502 },
    );
  }

  // `accessToken` is the 15-minute login JWT. It lives only in this local
  // variable, used once to mint the session's real credential (a long-lived
  // API key), then discarded — never returned to the client, never
  // persisted, never logged.
  try {
    const created = await createApiKey(accessToken);
    await setSessionCookie({ apiKeyId: created.id, apiKey: created.key });
  } catch (error) {
    console.error("auth.login.mint_key_failed", error);
    // Login succeeded but minting failed: no cookie was set, so this is
    // safe to retry — no orphaned state.
    return NextResponse.json(
      { ok: false, error: "Signed in, but we could not prepare your session. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
