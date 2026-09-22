import { NextResponse } from "next/server";
import { getSession } from "@/features/auth/server/session";
import { updateStatusSchema } from "@/features/training-runs/schemas/training-run-schemas";
import { updateTrainingRunStatus } from "@/features/training-runs/server/training-runs-api";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request body." }, { status: 400 });
  }

  const parsed = updateStatusSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid status." }, { status: 422 });
  }

  try {
    const trainingRun = await updateTrainingRunStatus(session.apiKey, id, parsed.data.status);
    return NextResponse.json({ ok: true, trainingRun });
  } catch (error) {
    console.error("training_runs.update_status_failed", error);
    return NextResponse.json({ ok: false, error: "Could not update the status." }, { status: 502 });
  }
}
