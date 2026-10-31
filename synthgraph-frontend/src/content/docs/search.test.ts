import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { searchDocs, type SearchEntry } from "./search.ts";

const entries: SearchEntry[] = [
  { title: "Quickstart", section: "Get started", href: "/docs/quickstart", heading: null, body: "Record your first run." },
  {
    title: "Quickstart",
    section: "Get started",
    href: "/docs/quickstart#install",
    heading: "Install the SDK",
    body: "The SDK needs Python 3.11.",
  },
  {
    title: "Datasets and checksums",
    section: "Guides",
    href: "/docs/sdk/datasets",
    heading: "Opt-in checksums",
    body: "Pass compute_checksum to hash a local folder.",
  },
  {
    title: "Datasets and checksums",
    section: "Guides",
    href: "/docs/sdk/datasets#remote",
    heading: "Remote data",
    body: "A remote URI is an error: the SDK will not download data to hash it.",
  },
];

describe("searchDocs", () => {
  it("matches nothing for an empty or whitespace query", () => {
    assert.deepEqual(searchDocs(entries, ""), []);
    assert.deepEqual(searchDocs(entries, "   "), []);
  });

  it("says so when nothing matches instead of guessing", () => {
    assert.deepEqual(searchDocs(entries, "kubernetes"), []);
    // A fuzzy matcher would have found letters of this scattered through the text.
    assert.deepEqual(searchDocs(entries, "chcksm"), []);
  });

  it("needs every word to appear somewhere in the entry", () => {
    assert.equal(searchDocs(entries, "checksum python").length, 0);
    assert.equal(searchDocs(entries, "hash local").length, 1);
  });

  it("matches inside words, in any case", () => {
    assert.ok(searchDocs(entries, "CHECKSUM").length >= 1);
    assert.equal(searchDocs(entries, "install")[0].href, "/docs/quickstart#install");
  });

  it("ranks a heading match above a text match", () => {
    const hits = searchDocs(entries, "checksum");
    assert.equal(hits[0].href, "/docs/sdk/datasets");
  });

  it("ranks a heading above the start of its page for the same word", () => {
    const hits = searchDocs(entries, "quickstart");
    assert.equal(hits[0].heading, "Install the SDK");
  });

  it("gives a snippet around a text match and none for a heading match", () => {
    const text = searchDocs(entries, "download")[0];
    assert.match(text.snippet ?? "", /download/);
    const heading = searchDocs(entries, "remote data")[0];
    assert.equal(heading.snippet, null);
  });

  it("respects the limit", () => {
    assert.equal(searchDocs(entries, "a", 2).length, 2);
  });
});
