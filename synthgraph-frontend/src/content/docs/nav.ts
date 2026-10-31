// The structure of the documentation site: one source for the sidebar, the
// previous and next links, the search index, the sitemap and the checks that
// every page has a file. A page appears here only when its .mdx file exists,
// and nav.test.ts fails if the two drift apart.
//
// Plain TypeScript with no path aliases, so node --test can run it.

export type DocPage = {
  /** Path under src/content/docs without the extension. "index" is /docs itself. */
  slug: string;
  title: string;
  /** One sentence, used as the page description and in search. */
  description: string;
};

export type DocSection = {
  title: string;
  pages: DocPage[];
};

export const DOCS_NAV: DocSection[] = [
  {
    title: "Get started",
    pages: [
      {
        slug: "index",
        title: "Introduction",
        description: "What SynthGraph is, what it records, and what it does not do.",
      },
      {
        slug: "quickstart",
        title: "Quickstart",
        description: "Record a generation, a training run and an evaluation, and see them in the dashboard.",
      },
    ],
  },
];

export function docHref(slug: string): string {
  return slug === "index" ? "/docs" : `/docs/${slug}`;
}

export function allDocPages(): Array<DocPage & { section: string; href: string }> {
  return DOCS_NAV.flatMap((section) =>
    section.pages.map((page) => ({ ...page, section: section.title, href: docHref(page.slug) })),
  );
}

export function findDocPage(slug: string) {
  return allDocPages().find((page) => page.slug === slug) ?? null;
}

/** The page before and after this one in reading order, or null at either end. */
export function neighbours(slug: string) {
  const pages = allDocPages();
  const index = pages.findIndex((page) => page.slug === slug);
  if (index === -1) return { previous: null, next: null };
  return { previous: pages[index - 1] ?? null, next: pages[index + 1] ?? null };
}

/** Converts the URL segments after /docs into a slug. No segments means the introduction. */
export function slugFromSegments(segments: string[] | undefined): string {
  return segments && segments.length > 0 ? segments.join("/") : "index";
}
