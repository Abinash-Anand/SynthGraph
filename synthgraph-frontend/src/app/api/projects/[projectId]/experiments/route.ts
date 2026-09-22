import { NextResponse } from "next/server";
import { getSession } from "@/features/auth/server/session";
import { createExperimentSchema } from "@/features/experiments/schemas/experiment-schemas";
import { createExperiment } from "@/features/experiments/server/experiments-api";
import { toFieldErrors } from "@/shared/lib/validation";

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { projectId } = await params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request body." }, { status: 400 });
  }

  const parsed = createExperimentSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Check the highlighted fields.", fields: toFieldErrors(parsed.error) },
      { status: 422 },
    );
  }

  try {
    const experiment = await createExperiment(session.apiKey, projectId, {
      name: parsed.data.name,
      description: parsed.data.description || undefined,
    });
    return NextResponse.json({ ok: true, experiment });
  } catch (error) {
    console.error("experiments.create_failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not create the experiment. Please try again." },
      { status: 502 },
    );
  }
}
