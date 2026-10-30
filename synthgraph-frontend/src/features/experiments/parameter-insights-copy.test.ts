import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PARAMETER_ANALYSIS_BADGE, PARAMETER_ANALYSIS_INTRO, PARAMETER_ANALYSIS_TITLE } from "./parameter-insights-copy.ts";

describe("the parameter analysis framing", () => {
  it("is labelled exploratory, next to the title", () => {
    // Regression: the section was headed "What moved the outcome" with no hint that it is
    // computed in the browser for a metric the viewer picks.
    assert.equal(PARAMETER_ANALYSIS_BADGE, "Exploratory");
    assert.equal(PARAMETER_ANALYSIS_TITLE, "What moved the outcome");
  });

  it("says it is not an official result, where it is computed, and that it is not cause", () => {
    assert.match(PARAMETER_ANALYSIS_INTRO, /exploratory view, not an official SynthGraph result/i);
    assert.match(PARAMETER_ANALYSIS_INTRO, /in your browser/);
    assert.match(PARAMETER_ANALYSIS_INTRO, /outcome metric you pick/);
    assert.match(PARAMETER_ANALYSIS_INTRO, /association, not cause/);
  });

  it("keeps the earlier promise about trust and the number of runs", () => {
    assert.match(PARAMETER_ANALYSIS_INTRO, /how much to trust that given how many runs there are/);
  });
});
