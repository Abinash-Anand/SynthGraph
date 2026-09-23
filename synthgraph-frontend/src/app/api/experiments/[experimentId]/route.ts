import { NextResponse } from "next/server";
import { getSession } from "@/features/auth/server/session";
import { updateExperimentSchema } from "@/features/experiments/schemas/experiment-schemas";
import { archiveExperiment, updateExperiment } from "@/features/experiments/server/experiments-api";
import { NotFoundError } from "@/shared/http/errors";
import { toFieldErrors } from "@/shared/lib/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ experimentId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { experimentId } = await params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request body." }, { status: 400 });
  }

  const parsed = updateExperimentSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Check the highlighted fields.", fields: toFieldErrors(parsed.error) },
      { status: 422 },
    );
  }

  try {
    const experiment = await updateExperiment(session.apiKey, experimentId, {
      name: parsed.data.name,
      description: parsed.data.description || undefined,
    });
    return NextResponse.json({ ok: true, experiment });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ ok: false, error: "Experiment not found." }, { status: 404 });
    }
    console.error("experiments.update_failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not update the experiment. Please try again." },
      { status: 502 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ experimentId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { experimentId } = await params;

  try {
    await archiveExperiment(session.apiKey, experimentId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ ok: false, error: "Experiment not found." }, { status: 404 });
    }
    console.error("experiments.archive_failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not archive the experiment. Please try again." },
      { status: 502 },
    );
  }
}
