import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { PRODUCT, SDK_INSTALL_COMMAND } from "./product.ts";
import { RECORD_SNIPPET, RECORD_STEPS, excerpt } from "./snippets.ts";

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
    if (PRODUCT.sdkOnPyPI) assert.equal(SDK_INSTALL_COMMAND, "pip install synthgraph");
    else assert.match(SDK_INSTALL_COMMAND, /git\+https:\/\/github\.com\/.+#subdirectory=synthgraph-sdk-cli/);
  });
});

describe("the quickstart, one step at a time", () => {
  it("cuts every step out of the verified sample", () => {
    const flat = (text: string) => text.replace(/\s+/g, " ");
    for (const [name, code] of Object.entries(RECORD_STEPS)) {
      assert.ok(code.trim().length > 0, name);
      assert.ok(flat(RECORD_SNIPPET).includes(flat(code)), `${name} is not part of the verified sample`);
    }
  });

  it("starts each step at the left margin", () => {
    for (const code of Object.values(RECORD_STEPS)) assert.ok(!code.startsWith(" "));
  });

  it("covers what each step is about", () => {
    assert.match(RECORD_STEPS.generation, /seed=42/);
    assert.match(RECORD_STEPS.dataset, /uri="s3:/);
    assert.match(RECORD_STEPS.training, /training\.start\(\)/);
    assert.match(RECORD_STEPS.evaluation, /dataset_version_id=dataset/);
    assert.match(RECORD_STEPS.evaluation, /training\.complete\(\)/);
  });

  it("refuses an excerpt that is not there", () => {
    assert.throws(() => excerpt("a\nb", "zzz", "b"));
    assert.throws(() => excerpt("a\nb", "a", "zzz"));
  });
});
