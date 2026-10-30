// The wording around the parameter analysis, in one place so its framing is tested.
//
// The analysis is exploratory: it depends on the outcome metric the viewer picks
// and is computed in the browser from the runs on screen. It is not a SynthGraph
// result that other clients or reports reproduce (registry entry ARCH-002, decided
// as exploratory on 2026-10-30).

export const PARAMETER_ANALYSIS_TITLE = "What moved the outcome";

/** Shown beside the title, so it is never read without the label. */
export const PARAMETER_ANALYSIS_BADGE = "Exploratory";

export const PARAMETER_ANALYSIS_INTRO =
  "An exploratory view, not an official SynthGraph result. It is worked out in your browser from the runs below, " +
  "for the outcome metric you pick: how strongly each varying parameter goes with that result, and how much to " +
  "trust that given how many runs there are. It shows association, not cause.";
