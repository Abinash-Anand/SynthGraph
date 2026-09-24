import { NextResponse } from "next/server";
import { getSession } from "@/features/auth/server/session";
import { getRecentEntities } from "@/features/search/server/search-api";
import type { SearchResultType } from "@/features/search/types/search";

const VALID_TYPES: SearchResultType[] = ["generation", "trainingRun"];

/**
 * Backs the compare-picker's on-focus "recent" dropdown - a distinct query
 * from /api/search since it has no `q` and orders by recency, not name.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  if (!type || !VALID_TYPES.includes(type as SearchResultType)) {
    return NextResponse.json({ ok: false, error: "Invalid or missing type." }, { status: 400 });
  }

  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  try {
    const { results } = await getRecentEntities(
      session.apiKey,
      type as Extract<SearchResultType, "generation" | "trainingRun">,
      limit,
    );
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    console.error("search.recent_failed", error);
    return NextResponse.json({ ok: false, error: "Search failed." }, { status: 502 });
  }
}
