import { NextResponse } from "next/server";
import { getSession } from "@/features/auth/server/session";
import { updateProjectSchema } from "@/features/projects/schemas/project-schemas";
import { archiveProject, updateProject } from "@/features/projects/server/projects-api";
import { NotFoundError } from "@/shared/http/errors";
import { toFieldErrors } from "@/shared/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
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

  const parsed = updateProjectSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Check the highlighted fields.", fields: toFieldErrors(parsed.error) },
      { status: 422 },
    );
  }

  try {
    const project = await updateProject(session.apiKey, projectId, {
      name: parsed.data.name,
      description: parsed.data.description || undefined,
    });
    return NextResponse.json({ ok: true, project });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
    }
    console.error("projects.update_failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not update the project. Please try again." },
      { status: 502 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { projectId } = await params;

  try {
    await archiveProject(session.apiKey, projectId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Archiving is not idempotent on the backend (unlike API-key revoke) -
    // an already-archived project genuinely 404s, and that's real
    // information worth surfacing rather than swallowing as success.
    if (error instanceof NotFoundError) {
      return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
    }
    console.error("projects.archive_failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not archive the project. Please try again." },
      { status: 502 },
    );
  }
}
