import { NextResponse } from "next/server";
import { createApiKey } from "@/features/api-keys/server/api-keys-api";
import { getSession } from "@/features/auth/server/session";

/** Creates an additional API key for the signed-in user (Settings page). */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  try {
    const created = await createApiKey(session.apiKey);
    return NextResponse.json({ ok: true, apiKey: created });
  } catch (error) {
    console.error("api-keys.create_failed", error);
    return NextResponse.json({ ok: false, error: "Could not create a new API key." }, { status: 502 });
  }
}
