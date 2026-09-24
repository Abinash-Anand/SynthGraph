import { NextResponse } from "next/server";
import { getSession } from "@/features/auth/server/session";
import { getTrainingRunKeys } from "@/features/reports/server/reports-api";
import type { TrainingRunSearchField } from "@/features/reports/types/report";

const VALID_FIELDS: TrainingRunSearchField[] = ["parameters", "metrics"];

/**
 * Backs the Training Run Search form's Key autocomplete - needs a Route
 * Handler since the field selector is client-side and must refetch the key
 * list whenever it changes, unlike the rest of this report which is a
 * plain server-rendered page driven by the URL's searchParams.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const field = searchParams.get("field");
  if (!field || !VALID_FIELDS.includes(field as TrainingRunSearchField)) {
    return NextResponse.json({ ok: false, error: "Invalid or missing field." }, { status: 400 });
  }
  const projectId = searchParams.get("projectId") ?? undefined;

  try {
    const { keys } = await getTrainingRunKeys(session.apiKey, field as TrainingRunSearchField, projectId);
    return NextResponse.json({ ok: true, keys });
  } catch (error) {
    console.error("reports.training_run_keys_failed", error);
    return NextResponse.json({ ok: false, error: "Failed to load keys." }, { status: 502 });
  }
}
