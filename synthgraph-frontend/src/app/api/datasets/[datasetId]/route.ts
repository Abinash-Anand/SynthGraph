import { NextResponse } from "next/server";
import { getSession } from "@/features/auth/server/session";
import { updateDatasetSchema } from "@/features/datasets/schemas/dataset-schemas";
import { archiveDataset, updateDataset } from "@/features/datasets/server/datasets-api";
import { NotFoundError } from "@/shared/http/errors";
import { toFieldErrors } from "@/shared/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ datasetId: string }> }) {
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

  const parsed = updateDatasetSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Check the highlighted fields.", fields: toFieldErrors(parsed.error) },
      { status: 422 },
    );
  }

  try {
    const dataset = await updateDataset(session.apiKey, datasetId, {
      name: parsed.data.name,
      description: parsed.data.description || undefined,
    });
    return NextResponse.json({ ok: true, dataset });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ ok: false, error: "Dataset not found." }, { status: 404 });
    }
    console.error("datasets.update_failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not update the dataset. Please try again." },
      { status: 502 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ datasetId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { datasetId } = await params;

  try {
    await archiveDataset(session.apiKey, datasetId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ ok: false, error: "Dataset not found." }, { status: 404 });
    }
    console.error("datasets.archive_failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not archive the dataset. Please try again." },
      { status: 502 },
    );
  }
}
