import { NextResponse } from "next/server";
import { getSession } from "@/features/auth/server/session";
import { createAssetSchema } from "@/features/assets/schemas/asset-schemas";
import { createAsset } from "@/features/assets/server/assets-api";
import { toFieldErrors } from "@/shared/lib/validation";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request body." }, { status: 400 });
  }

  const parsed = createAssetSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Check the highlighted fields.", fields: toFieldErrors(parsed.error) },
      { status: 422 },
    );
  }

  try {
    const asset = await createAsset(session.apiKey, {
      name: parsed.data.name,
      type: parsed.data.type || undefined,
      description: parsed.data.description || undefined,
      metadata: parsed.data.metadata,
    });
    return NextResponse.json({ ok: true, asset });
  } catch (error) {
    console.error("assets.create_failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not create the asset. Please try again." },
      { status: 502 },
    );
  }
}
