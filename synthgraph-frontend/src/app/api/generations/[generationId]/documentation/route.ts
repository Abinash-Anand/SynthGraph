import { NextResponse } from "next/server";
import { getGenerationDocumentation } from "@/features/documentation/server/documentation-api";
import { getSession } from "@/features/auth/server/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ generationId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { generationId } = await params;

  try {
    const markdown = await getGenerationDocumentation(session.apiKey, generationId);
    return new NextResponse(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${generationId}.md"`,
      },
    });
  } catch (error) {
    console.error("documentation.download_failed", error);
    return NextResponse.json({ ok: false, error: "Could not load documentation." }, { status: 502 });
  }
}
