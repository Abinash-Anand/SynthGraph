import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readHeadings, readSections } from "./headings.ts";

describe("readHeadings", () => {
  it("returns h2 and h3 headings with github-slugger ids", () => {
    const headings = readHeadings("# Title\n\n## First part\n\ntext\n\n### A `code` heading\n\n#### Skipped\n");
    assert.deepEqual(headings, [
      { id: "first-part", text: "First part", level: 2 },
      { id: "a-code-heading", text: "A code heading", level: 3 },
    ]);
  });

  it("ignores headings inside code fences", () => {
    const source = "## Real\n\n```bash\n## not a heading\n```\n\n## After\n";
    assert.deepEqual(readHeadings(source).map((h) => h.text), ["Real", "After"]);
  });

  it("numbers repeated headings the way rehype-slug does", () => {
    const ids = readHeadings("## Setup\n\n## Setup\n\n## Setup\n").map((h) => h.id);
    assert.deepEqual(ids, ["setup", "setup-1", "setup-2"]);
  });

  it("strips links and emphasis from the text", () => {
    assert.deepEqual(readHeadings("## Use [the CLI](/docs/cli) *now*\n"), [
      { id: "use-the-cli-now", text: "Use the CLI now", level: 2 },
    ]);
  });

  it("handles Windows line endings and an empty page", () => {
    assert.deepEqual(readHeadings("## One\r\n\r\n## Two\r\n").map((h) => h.id), ["one", "two"]);
    assert.deepEqual(readHeadings(""), []);
  });
});

describe("readSections", () => {
  const source = [
    "Intro line with a [link](/docs).",
    "",
    "## First",
    "",
    "Some **bold** prose.",
    "",
    "```bash",
    "pip install secret-code-word",
    "```",
    "",
    "- a list item",
    "",
    "### Second",
    "",
    "<Callout>Inside a tag</Callout>",
    "",
    "| a | b |",
  ].join("\n");

  it("splits the page at h2 and h3 headings and keeps the prose before the first one", () => {
    const sections = readSections(source);
    assert.deepEqual(sections.map((s) => s.heading), [null, "First", "Second"]);
    assert.equal(sections[0].body, "Intro line with a link.");
  });

  it("keeps prose, drops markup, and leaves code blocks out", () => {
    const [, first, second] = readSections(source);
    assert.equal(first.body, "Some bold prose. a list item");
    assert.ok(!first.body.includes("secret-code-word"));
    assert.equal(second.body, "Inside a tag a b");
  });

  it("agrees with readHeadings on ids", () => {
    const ids = readSections(source).flatMap((s) => (s.id ? [s.id] : []));
    assert.deepEqual(ids, readHeadings(source).map((h) => h.id));
  });
});
