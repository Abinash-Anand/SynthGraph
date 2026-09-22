import { NextResponse } from "next/server";
import { getSession } from "@/features/auth/server/session";
import { createDatasetSchema } from "@/features/datasets/schemas/dataset-schemas";
import { createDataset } from "@/features/datasets/server/datasets-api";
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

  const parsed = createDatasetSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Check the highlighted fields.", fields: toFieldErrors(parsed.error) },
      { status: 422 },
    );
  }

  try {
    const dataset = await createDataset(session.apiKey, {
      name: parsed.data.name,
      description: parsed.data.description || undefined,
      metadata: parsed.data.metadata,
    });
    return NextResponse.json({ ok: true, dataset });
  } catch (error) {
    console.error("datasets.create_failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not create the dataset. Please try again." },
      { status: 502 },
    );
  }
}
