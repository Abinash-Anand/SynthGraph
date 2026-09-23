import { NextResponse } from "next/server";
import { getSession } from "@/features/auth/server/session";
import { updateAssetSchema } from "@/features/assets/schemas/asset-schemas";
import { archiveAsset, updateAsset } from "@/features/assets/server/assets-api";
import { NotFoundError } from "@/shared/http/errors";
import { toFieldErrors } from "@/shared/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
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

  const parsed = updateAssetSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Check the highlighted fields.", fields: toFieldErrors(parsed.error) },
      { status: 422 },
    );
  }

  try {
    const asset = await updateAsset(session.apiKey, assetId, {
      name: parsed.data.name,
      description: parsed.data.description || undefined,
    });
    return NextResponse.json({ ok: true, asset });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ ok: false, error: "Asset not found." }, { status: 404 });
    }
    console.error("assets.update_failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not update the asset. Please try again." },
      { status: 502 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { assetId } = await params;

  try {
    await archiveAsset(session.apiKey, assetId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ ok: false, error: "Asset not found." }, { status: 404 });
    }
    console.error("assets.archive_failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not archive the asset. Please try again." },
      { status: 502 },
    );
  }
}
