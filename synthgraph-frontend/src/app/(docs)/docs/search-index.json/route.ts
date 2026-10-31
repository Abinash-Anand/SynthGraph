import { buildSearchIndex } from "@/lib/docs";

// Built once at build time. The docs search fetches it the first time it is opened.
export const dynamic = "force-static";

export function GET() {
  return Response.json(buildSearchIndex());
}
