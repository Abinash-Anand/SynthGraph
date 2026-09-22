import { NextResponse } from "next/server";
import { getSession } from "@/features/auth/server/session";
import { createDatasetVersionSchema } from "@/features/datasets/schemas/dataset-schemas";
import { createDatasetVersion } from "@/features/datasets/server/datasets-api";
import { toFieldErrors } from "@/shared/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ datasetId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { datasetId } = await params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request body." }, { status: 400 });
  }

  const parsed = createDatasetVersionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Check the highlighted fields.", fields: toFieldErrors(parsed.error) },
      { status: 422 },
    );
  }

  try {
    const version = await createDatasetVersion(session.apiKey, datasetId, {
      version: parsed.data.version,
      uri: parsed.data.uri,
      format: parsed.data.format || undefined,
      size: parsed.data.size,
      checksum: parsed.data.checksum || undefined,
      metadata: parsed.data.metadata,
    });
    return NextResponse.json({ ok: true, version });
  } catch (error) {
    console.error("dataset_versions.create_failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not create the version. Please try again." },
      { status: 502 },
    );
  }
}
