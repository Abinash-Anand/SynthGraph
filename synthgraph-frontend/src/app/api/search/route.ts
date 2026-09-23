import { NextResponse } from "next/server";
import { getSession } from "@/features/auth/server/session";
import { searchAll } from "@/features/search/server/search-api";

/**
 * Client-polled by the command palette on every keystroke (debounced) -
 * needs a Route Handler rather than calling searchAll from a Server
 * Component, since the palette is a live-typing Client Component.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ ok: true, results: [] });
  }

  try {
    const { results } = await searchAll(session.apiKey, q);
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    console.error("search.fetch_failed", error);
    return NextResponse.json({ ok: false, error: "Search failed." }, { status: 502 });
  }
}
