import assert from "node:assert/strict";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { allDocPages, docHref, findDocPage, neighbours, slugFromSegments } from "./nav.ts";

const DIR = path.dirname(fileURLToPath(import.meta.url));

function mdxFiles(dir: string, prefix = ""): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return mdxFiles(full, `${prefix}${name}/`);
    return name.endsWith(".mdx") ? [`${prefix}${name.slice(0, -4)}`] : [];
  });
}

describe("docs navigation", () => {
  const pages = allDocPages();

  it("has a file for every page in the navigation", () => {
    for (const page of pages) {
      assert.ok(existsSync(path.join(DIR, `${page.slug}.mdx`)), `missing content/docs/${page.slug}.mdx`);
    }
  });

  it("lists every page file in the navigation", () => {
    const listed = new Set(pages.map((page) => page.slug));
    for (const file of mdxFiles(DIR)) {
      assert.ok(listed.has(file), `content/docs/${file}.mdx is not in the navigation`);
    }
  });

  it("has unique slugs and a title and description on every page", () => {
    assert.equal(new Set(pages.map((page) => page.slug)).size, pages.length);
    for (const page of pages) {
      assert.ok(page.title.length > 0, page.slug);
      assert.ok(page.description.length > 0, page.slug);
    }
  });

  it("serves the introduction at /docs and the rest under /docs/", () => {
    assert.equal(docHref("index"), "/docs");
    assert.equal(docHref("sdk/record-a-generation"), "/docs/sdk/record-a-generation");
    assert.equal(slugFromSegments(undefined), "index");
    assert.equal(slugFromSegments([]), "index");
    assert.equal(slugFromSegments(["sdk", "datasets"]), "sdk/datasets");
  });

  it("links previous and next in reading order, with nothing past either end", () => {
    const first = pages[0].slug;
    const last = pages[pages.length - 1].slug;
    assert.equal(neighbours(first).previous, null);
    assert.equal(neighbours(last).next, null);
    if (pages.length > 1) {
      assert.equal(neighbours(first).next?.slug, pages[1].slug);
      assert.equal(neighbours(last).previous?.slug, pages[pages.length - 2].slug);
    }
    assert.deepEqual(neighbours("does-not-exist"), { previous: null, next: null });
    assert.equal(findDocPage("does-not-exist"), null);
  });
});
