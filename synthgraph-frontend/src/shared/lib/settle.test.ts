import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { settle } from "./settle.ts";

describe("settle", () => {
  it("resolves to the value", async () => {
    assert.deepEqual(await settle(Promise.resolve(42)), { ok: true, value: 42 });
  });

  it("turns a rejection into a result instead of rejecting", async () => {
    const error = new Error("boom");
    assert.deepEqual(await settle(Promise.reject(error)), { ok: false, error });
  });

  it("leaves nothing unhandled when the caller is busy elsewhere first", async () => {
    const early = settle(Promise.reject(new Error("late look")));
    await new Promise((resolve) => setTimeout(resolve, 10));
    const result = await early;
    assert.equal(result.ok, false);
  });
});
