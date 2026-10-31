import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { PRODUCT, SDK_INSTALL_COMMAND } from "./product.ts";
import { RECORD_SNIPPET } from "./snippets.ts";

const DIR = path.dirname(fileURLToPath(import.meta.url));

describe("website code samples", () => {
  it("the record sample is the quickstart's code, which was run against the SDK", () => {
    const quickstart = readFileSync(path.join(DIR, "..", "content", "docs", "quickstart.mdx"), "utf8").replace(/\r\n/g, "\n");
    const fence = /```python\n([\s\S]*?)```/.exec(quickstart);
    assert.ok(fence, "the quickstart has a python block");
    assert.equal(RECORD_SNIPPET.trim(), fence[1].trim());
  });

  it("starts and completes the training run, which a with block does not do", () => {
    assert.match(RECORD_SNIPPET, /training\.start\(\)/);
    assert.match(RECORD_SNIPPET, /training\.complete\(\)/);
    assert.doesNotMatch(RECORD_SNIPPET, /with experiment\.training/);
  });
});

describe("install command", () => {
  it("installs from GitHub until the repository version is on PyPI", () => {
    if (PRODUCT.sdkOnPyPI) assert.equal(SDK_INSTALL_COMMAND, "pip install synthgraph-sdk");
    else assert.match(SDK_INSTALL_COMMAND, /git\+https:\/\/github\.com\/.+#subdirectory=synthgraph-sdk-cli/);
  });
});
