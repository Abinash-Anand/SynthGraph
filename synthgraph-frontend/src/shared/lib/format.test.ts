import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDurationSeconds, formatMetricValue } from "./format.ts";

describe("formatMetricValue", () => {
  it("keeps the digits that distinguish small values", () => {
    assert.equal(formatMetricValue(0.0007600045064464211), "0.00076");
    assert.equal(formatMetricValue(0.002114666160196066), "0.002115");
    assert.equal(formatMetricValue(0.003424976719543338), "0.003425");
  });

  it("rounds mid-range values to four significant figures", () => {
    assert.equal(formatMetricValue(575.9020817279816), "575.9");
    assert.equal(formatMetricValue(0.92536), "0.9254");
    assert.equal(formatMetricValue(0.9108), "0.9108");
  });

  it("leaves integers exact and groups thousands", () => {
    assert.equal(formatMetricValue(20), "20");
    assert.equal(formatMetricValue(40320), "40,320");
    assert.equal(formatMetricValue(-3), "-3");
  });

  it("goes scientific for tiny and huge magnitudes", () => {
    assert.equal(formatMetricValue(0.00000123), "1.230e-6");
    assert.equal(formatMetricValue(2.5e12 + 0.5), "2.500e+12");
  });

  it("shows non-finite values instead of garbage", () => {
    assert.equal(formatMetricValue(Number.NaN), "NaN");
    assert.equal(formatMetricValue(Number.POSITIVE_INFINITY), "∞");
    assert.equal(formatMetricValue(Number.NEGATIVE_INFINITY), "-∞");
  });

  it("formats zero as zero", () => {
    assert.equal(formatMetricValue(0), "0");
  });
});

describe("formatDurationSeconds", () => {
  it("picks a unit by magnitude", () => {
    assert.equal(formatDurationSeconds(45), "45s");
    assert.equal(formatDurationSeconds(560), "9.3m");
    assert.equal(formatDurationSeconds(7200), "2.0h");
  });
});
