// Reads the structure and the prose out of an MDX page. Pure, so it is tested on its own.
import GithubSlugger from "github-slugger";

export type DocHeading = { id: string; text: string; level: 2 | 3 };

/** A part of a page: the text before the first heading, or one heading and what follows it. */
export type DocSection = { id: string | null; heading: string | null; level: 2 | 3 | null; body: string };

/** Heading text as rehype-slug sees it: the plain text, without markup. */
function plainText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_]/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

/** Prose of one line of MDX: no links syntax, emphasis, tags or table pipes. */
function proseLine(line: string): string {
  return line
    .replace(/<[^>]*>/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_>|#]/g, " ")
    .replace(/^\s*[-+]\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Splits a page into sections at its h2 and h3 headings, keeping the prose of
 * each (code blocks are left out). Ids come from the same slugger rehype-slug
 * uses, so they match the ids in the rendered page, repeated headings included.
 * Headings of every level are slugged, so a repeated h1 or h4 still shifts the
 * numbering the way rehype-slug does.
 */
export function readSections(source: string): DocSection[] {
  const slugger = new GithubSlugger();
  const sections: DocSection[] = [{ id: null, heading: null, level: null, body: "" }];
  let inFence = false;
  for (const line of source.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) {
      const text = plainText(match[2]);
      const id = slugger.slug(text);
      const level = match[1].length;
      if (level === 2 || level === 3) sections.push({ id, heading: text, level, body: "" });
      continue;
    }
    const prose = proseLine(line);
    if (prose) {
      const current = sections[sections.length - 1];
      current.body = current.body ? `${current.body} ${prose}` : prose;
    }
  }
  return sections;
}

/** The h2 and h3 headings of a page, for the "On this page" rail. */
export function readHeadings(source: string): DocHeading[] {
  return readSections(source).flatMap((section) =>
    section.id && section.heading && section.level
      ? [{ id: section.id, text: section.heading, level: section.level }]
      : [],
  );
}
