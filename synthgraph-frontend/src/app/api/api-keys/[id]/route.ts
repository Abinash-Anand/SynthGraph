import { NextResponse } from "next/server";
import { revokeApiKey } from "@/features/api-keys/server/api-keys-api";
import { getSession } from "@/features/auth/server/session";
import { NotFoundError } from "@/shared/http/errors";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;

  try {
    await revokeApiKey(session.apiKey, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Already gone is success, per the backend's idempotent-safe revoke.
    if (error instanceof NotFoundError) {
      return NextResponse.json({ ok: true });
    }
    console.error("api-keys.revoke_failed", error);
    return NextResponse.json({ ok: false, error: "Could not revoke that key." }, { status: 502 });
  }
}
