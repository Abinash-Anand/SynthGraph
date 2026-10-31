import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { allDocPages } from "../content/docs/nav.ts";

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir: string, ext: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full, ext);
    return ext.test(name) ? [full] : [];
  });
}

/** Every path a visitor can reach on the public site, from the files that define it. */
function knownRoutes(): Set<string> {
  const routes = new Set<string>(["/"]);
  const groups = [
    [path.join(SRC, "app", "(marketing)"), ""],
    [path.join(SRC, "app", "(auth)"), ""],
  ] as const;
  for (const [base, prefix] of groups) {
    for (const file of walk(base, /^page\.tsx$/)) {
      const rel = path.relative(base, path.dirname(file)).split(path.sep).join("/");
      routes.add(rel === "" ? "/" : `${prefix}/${rel}`);
    }
  }
  routes.add("/docs");
  for (const page of allDocPages()) routes.add(page.href);
  return routes;
}

const ROUTES = knownRoutes();

function internalTargets(source: string): string[] {
  const found: string[] = [];
  for (const match of source.matchAll(/href[=:]\s*[{]?\s*["'`](\/[^"'`#?\s]*)/g)) found.push(match[1]);
  return found;
}

describe("website links", () => {
  it("knows the pages it is checking against", () => {
    for (const route of ["/", "/product", "/how-it-works", "/docs", "/docs/quickstart", "/login", "/register", "/demo"]) {
      assert.ok(ROUTES.has(route), `expected ${route} to be a known route`);
    }
  });

  it("every internal link on a marketing page, section or the navigation points at a real page", () => {
    const files = [
      ...walk(path.join(SRC, "app", "(marketing)"), /\.tsx$/),
      ...walk(path.join(SRC, "components", "sections"), /\.tsx$/),
      ...walk(path.join(SRC, "components", "navigation"), /\.tsx$/),
      ...walk(path.join(SRC, "components", "demo"), /\.tsx$/),
      path.join(SRC, "data", "site.ts"),
    ];
    const broken: string[] = [];
    for (const file of files) {
      for (const target of internalTargets(readFileSync(file, "utf8"))) {
        const clean = target.replace(/\/$/, "") || "/";
        if (!ROUTES.has(clean)) broken.push(`${path.relative(SRC, file)} -> ${target}`);
      }
    }
    assert.deepEqual(broken, []);
  });

  it("every internal link in the documentation points at a real page", () => {
    const broken: string[] = [];
    for (const file of walk(path.join(SRC, "content", "docs"), /\.mdx$/)) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/\]\((\/[^)#\s]*)(#[^)]*)?\)/g)) {
        const clean = match[1].replace(/\/$/, "") || "/";
        if (!ROUTES.has(clean)) broken.push(`${path.relative(SRC, file)} -> ${match[0]}`);
      }
    }
    assert.deepEqual(broken, []);
  });

  it("the hero's calls to action exist", () => {
    assert.ok(existsSync(path.join(SRC, "content", "docs", "quickstart.mdx")));
  });
});
