import { NextResponse } from "next/server";
import { getSession } from "@/features/auth/server/session";
import { createAssetVersionSchema } from "@/features/assets/schemas/asset-schemas";
import { createAssetVersion } from "@/features/assets/server/assets-api";
import { toFieldErrors } from "@/shared/lib/validation";

export async function POST(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { assetId } = await params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request body." }, { status: 400 });
  }

  const parsed = createAssetVersionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Check the highlighted fields.", fields: toFieldErrors(parsed.error) },
      { status: 422 },
    );
  }

  try {
    const version = await createAssetVersion(session.apiKey, assetId, {
      version: parsed.data.version,
      uri: parsed.data.uri,
      size: parsed.data.size,
      checksum: parsed.data.checksum || undefined,
      metadata: parsed.data.metadata,
    });
    return NextResponse.json({ ok: true, version });
  } catch (error) {
    console.error("asset_versions.create_failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not create the version. Please try again." },
      { status: 502 },
    );
  }
}
