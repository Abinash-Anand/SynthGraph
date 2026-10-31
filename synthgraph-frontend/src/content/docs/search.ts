// Search over the documentation: every word typed must appear, as a whole or
// part of a word, in the page title, the heading or the text. No fuzzy
// matching, so a query that matches nothing says so instead of guessing.

export type SearchEntry = {
  title: string;
  section: string;
  href: string;
  /** The heading this entry points at, or null for the start of the page. */
  heading: string | null;
  /** The prose under the heading. Code blocks are not searched. */
  body: string;
};

export type SearchHit = SearchEntry & {
  /** A short piece of the text around the match, when the match was in the text. */
  snippet: string | null;
};

const SNIPPET_LENGTH = 110;

function tokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

function snippetAround(body: string, token: string): string {
  const at = body.toLowerCase().indexOf(token);
  if (at === -1) return body.slice(0, SNIPPET_LENGTH);
  const start = Math.max(0, at - 30);
  const text = body.slice(start, start + SNIPPET_LENGTH).trim();
  return `${start > 0 ? "…" : ""}${text}${start + SNIPPET_LENGTH < body.length ? "…" : ""}`;
}

/** Entries that contain every word of the query, best first. An empty query matches nothing. */
export function searchDocs(entries: readonly SearchEntry[], query: string, limit = 25): SearchHit[] {
  const words = tokens(query);
  if (words.length === 0) return [];

  const hits: Array<{ hit: SearchHit; score: number }> = [];
  for (const entry of entries) {
    const heading = (entry.heading ?? "").toLowerCase();
    const title = entry.title.toLowerCase();
    const body = entry.body.toLowerCase();
    if (!words.every((word) => heading.includes(word) || title.includes(word) || body.includes(word))) continue;

    let score = 0;
    for (const word of words) {
      if (heading.includes(word)) score += 10;
      else if (title.includes(word)) score += 5;
      else score += 1;
    }
    // A heading hit beats a page-title hit on the same page: it is more specific.
    if (entry.heading === null) score -= 1;

    const inText = !words.every((word) => heading.includes(word) || title.includes(word));
    const firstWordInText = words.find((word) => !heading.includes(word) && !title.includes(word));
    hits.push({
      hit: { ...entry, snippet: inText && firstWordInText ? snippetAround(entry.body, firstWordInText) : null },
      score,
    });
  }

  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.hit);
}
