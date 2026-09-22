import { NextResponse } from "next/server";
import { getSession } from "@/features/auth/server/session";
import { createProjectSchema } from "@/features/projects/schemas/project-schemas";
import { createProject } from "@/features/projects/server/projects-api";
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

  const parsed = createProjectSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Check the highlighted fields.", fields: toFieldErrors(parsed.error) },
      { status: 422 },
    );
  }

  try {
    const project = await createProject(session.apiKey, {
      name: parsed.data.name,
      description: parsed.data.description || undefined,
    });
    return NextResponse.json({ ok: true, project });
  } catch (error) {
    console.error("projects.create_failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not create the project. Please try again." },
      { status: 502 },
    );
  }
}
