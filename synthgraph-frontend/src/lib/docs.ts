import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { allDocPages } from "@/content/docs/nav";
import { readHeadings, readSections, type DocHeading } from "@/content/docs/headings";
import type { SearchEntry } from "@/content/docs/search";

export type { DocHeading, SearchEntry };

const CONTENT_DIR = path.join(process.cwd(), "src", "content", "docs");

/** Keeps the index small: the start of a section's prose is what makes it findable. */
const MAX_BODY_LENGTH = 900;

export function docSourcePath(slug: string): string {
  return path.join(CONTENT_DIR, `${slug}.mdx`);
}

function readSource(slug: string): string {
  return readFileSync(docSourcePath(slug), "utf8");
}

export function getHeadings(slug: string): DocHeading[] {
  return readHeadings(readSource(slug));
}

/**
 * Every page and every section of every page, with its prose, for the search
 * box. Served as /docs/search-index.json and fetched when search is first opened.
 */
export function buildSearchIndex(): SearchEntry[] {
  const entries: SearchEntry[] = [];
  for (const page of allDocPages()) {
    const sections = readSections(readSource(page.slug));
    entries.push({
      title: page.title,
      section: page.section,
      href: page.href,
      heading: null,
      body: `${page.description} ${sections[0].body}`.trim().slice(0, MAX_BODY_LENGTH),
    });
    for (const section of sections.slice(1)) {
      entries.push({
        title: page.title,
        section: page.section,
        href: `${page.href}#${section.id}`,
        heading: section.heading,
        body: section.body.slice(0, MAX_BODY_LENGTH),
      });
    }
  }
  return entries;
}
