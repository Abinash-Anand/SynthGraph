import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EFFICIENCY_UNAVAILABLE,
  closeResultsSpread,
  defaultMetricKey,
  defaultSetId,
  efficiencyRows,
  evaluationSetOptions,
  paddedAxisRange,
  paretoPath,
  rankableMetricKeys,
} from "./efficiency-model.ts";

const runs = [
  { trainingRunId: "fast", name: "Fast", durationSeconds: 600 },
  { trainingRunId: "slow", name: "Slow", durationSeconds: 3600 },
  { trainingRunId: "none", name: "None", durationSeconds: 300 },
];

// What the backend sends for one metric on two evaluation sets.
const analysis = {
  sets: [
    {
      datasetVersionId: "rain",
      runCount: 2,
      rankings: {
        maximize: {
          rows: [
            { trainingRunId: "slow", value: 0.9, perHour: 0.9, pareto: true, dominatedBy: null },
            { trainingRunId: "fast", value: 0.7, perHour: 4.2, pareto: true, dominatedBy: null },
          ],
        },
        minimize: {
          rows: [{ trainingRunId: "fast", value: 0.7, perHour: null, pareto: true, dominatedBy: null }],
        },
      },
    },
    {
      datasetVersionId: "clear",
      runCount: 1,
      rankings: {
        maximize: {
          rows: [{ trainingRunId: "fast", value: 0.95, perHour: 5.7, pareto: true, dominatedBy: null }],
        },
      },
    },
  ],
};

describe("rankableMetricKeys", () => {
  it("drops time and system readings and puts outcomes first", () => {
    const keys = rankableMetricKeys({ elapsed_seconds: {}, episode_reward: {}, cpu_percent: {}, epochs: {} });
    assert.deepEqual(keys, ["episode_reward", "epochs"]);
  });

  it("is empty without an analysis", () => {
    assert.deepEqual(rankableMetricKeys(undefined), []);
    assert.deepEqual(rankableMetricKeys(null), []);
    assert.deepEqual(rankableMetricKeys({}), []);
  });
});

describe("defaultMetricKey", () => {
  it("prefers a metric with a declared direction over an earlier one", () => {
    assert.equal(
      defaultMetricKey(["epochs", "episode_reward"], { episode_reward: { direction: "maximize", mixed: false } }),
      "episode_reward",
    );
  });
  it("does not prefer a metric because of its name", () => {
    assert.equal(defaultMetricKey(["epochs", "episode_reward"], {}), "epochs");
    assert.equal(defaultMetricKey(["epochs", "episode_reward"], undefined), "epochs");
  });
  it("does not prefer a neutral or mixed metric", () => {
    assert.equal(
      defaultMetricKey(["a", "b", "c"], {
        a: { direction: "neutral", mixed: false },
        b: { direction: null, mixed: true },
        c: { direction: "minimize", mixed: false },
      }),
      "c",
    );
  });
  it("falls back to the first key, then empty", () => {
    assert.equal(defaultMetricKey(["epochs"], {}), "epochs");
    assert.equal(defaultMetricKey([], {}), "");
  });
});

describe("defaultSetId", () => {
  it("is the set the backend lists first", () => {
    assert.equal(defaultSetId(analysis), "rain");
  });
  it("is empty without sets", () => {
    assert.equal(defaultSetId(undefined), "");
    assert.equal(defaultSetId({ sets: [] }), "");
  });
});

describe("efficiencyRows", () => {
  it("shows the order and values the backend sent for the chosen set and direction", () => {
    const rows = efficiencyRows(runs, analysis, "rain", "maximize");
    assert.deepEqual(
      rows.map((row) => [row.runId, row.value, row.perHour, row.pareto]),
      [
        ["slow", 0.9, 0.9, true],
        ["fast", 0.7, 4.2, true],
        ["none", null, null, false],
      ],
    );
  });

  it("does not carry a score from one evaluation set to another", () => {
    const clear = efficiencyRows(runs, analysis, "clear", "maximize");
    assert.equal(clear.find((row) => row.runId === "fast")?.value, 0.95);
    // "slow" was not scored on this set: it has no value here, whatever it scored elsewhere.
    assert.equal(clear.find((row) => row.runId === "slow")?.value, null);
  });

  it("joins the dominating run's name", () => {
    const rows = efficiencyRows(
      runs,
      {
        sets: [
          {
            datasetVersionId: "s",
            runCount: 2,
            rankings: {
              maximize: {
                rows: [
                  { trainingRunId: "fast", value: 0.9, perHour: 5, pareto: true, dominatedBy: null },
                  { trainingRunId: "slow", value: 0.5, perHour: 0.5, pareto: false, dominatedBy: "fast" },
                ],
              },
            },
          },
        ],
      },
      "s",
      "maximize",
    );
    assert.deepEqual(rows.find((row) => row.runId === "slow")?.dominatedBy, { runId: "fast", name: "Fast" });
  });

  it("lists the runs fastest first, unranked, when no direction is chosen", () => {
    const rows = efficiencyRows(runs, analysis, "rain", null);
    assert.deepEqual(rows.map((row) => row.runId), ["none", "fast", "slow"]);
    assert.ok(rows.every((row) => row.value === null && !row.pareto && row.dominatedBy === null));
  });

  it("lists the runs unranked for a set or direction the backend did not rank", () => {
    assert.deepEqual(efficiencyRows(runs, analysis, "missing", "maximize").map((row) => row.value), [null, null, null]);
    assert.deepEqual(efficiencyRows(runs, analysis, "clear", "minimize").map((row) => row.value), [null, null, null]);
    assert.deepEqual(efficiencyRows(runs, undefined, "", "maximize").map((row) => row.runId), ["none", "fast", "slow"]);
  });
});

describe("evaluationSetOptions", () => {
  const names = [
    { datasetVersionId: "rain", datasetName: "test-heavy-rain", version: "v1" },
    { datasetVersionId: "clear", datasetName: "test-clear", version: "v2" },
  ];
  it("labels each set with its dataset, version and run count", () => {
    assert.deepEqual(evaluationSetOptions(analysis.sets, names), [
      { id: "rain", label: "test-heavy-rain v1 · 2 runs" },
      { id: "clear", label: "test-clear v2 · 1 run" },
    ]);
  });
  it("tells apart two sets that would read the same", () => {
    const twin = [
      { datasetVersionId: "aaaaaaaa-1", datasetName: "x", version: "v1" },
      { datasetVersionId: "bbbbbbbb-2", datasetName: "x", version: "v1" },
    ];
    const labels = evaluationSetOptions(
      [
        { datasetVersionId: "aaaaaaaa-1", runCount: 2 },
        { datasetVersionId: "bbbbbbbb-2", runCount: 2 },
      ],
      twin,
    ).map((option) => option.label);
    assert.equal(new Set(labels).size, 2);
  });
  it("copes with a set the backend sent no name for", () => {
    assert.match(evaluationSetOptions([{ datasetVersionId: "q", runCount: 1 }], [])[0].label, /Unnamed evaluation set/);
  });
});

describe("EFFICIENCY_UNAVAILABLE", () => {
  it("says the ranking is not available, not that there is nothing to rank", () => {
    assert.match(EFFICIENCY_UNAVAILABLE, /not available from this backend version/);
  });
});

describe("paretoPath", () => {
  it("returns the frontier fastest-first in hours", () => {
    const rows = efficiencyRows(
      [
        { trainingRunId: "a", name: "a", durationSeconds: 1800 },
        { trainingRunId: "b", name: "b", durationSeconds: 7200 },
        { trainingRunId: "c", name: "c", durationSeconds: 9000 },
      ],
      {
        sets: [
          {
            datasetVersionId: "s",
            runCount: 3,
            rankings: {
              maximize: {
                rows: [
                  { trainingRunId: "b", value: 0.9, perHour: 0.45, pareto: true, dominatedBy: null },
                  { trainingRunId: "a", value: 0.6, perHour: 1.2, pareto: true, dominatedBy: null },
                  { trainingRunId: "c", value: 0.4, perHour: 0.16, pareto: false, dominatedBy: "a" },
                ],
              },
            },
          },
        ],
      },
      "s",
      "maximize",
    );
    assert.deepEqual(paretoPath(rows), [
      [0.5, 0.6],
      [2, 0.9],
    ]);
  });
});

describe("paddedAxisRange", () => {
  it("does not zoom a tiny gap into a cliff", () => {
    const range = paddedAxisRange([0.7107, 0.7122]);
    assert.ok(range);
    // The 0.0015 gap is a sliver of the axis, not the whole of it.
    assert.ok((0.7122 - 0.7107) / (range.max - range.min) < 0.1);
    assert.ok(range.min < 0.7107 && range.max > 0.7122);
  });

  it("pads a spread-out set by half its spread", () => {
    const range = paddedAxisRange([10, 20]);
    // spread 10 -> pad 5 (half the spread beats 5% of the typical value, 0.75)
    assert.deepEqual(range, { min: 5, max: 25 });
  });

  it("copes with one value, all zeros, and no values", () => {
    assert.ok(paddedAxisRange([0.5]));
    assert.deepEqual(paddedAxisRange([0, 0]), { min: -1, max: 1 });
    assert.equal(paddedAxisRange([]), null);
    assert.equal(paddedAxisRange([Number.NaN]), null);
  });
});

describe("closeResultsSpread", () => {
  it("flags results within two percent of each other", () => {
    const spread = closeResultsSpread([0.7107, 0.7122]);
    assert.ok(spread !== null && spread < 0.01);
  });
  it("is quiet when results are clearly apart or there is only one", () => {
    assert.equal(closeResultsSpread([0.5, 0.9]), null);
    assert.equal(closeResultsSpread([0.7]), null);
    assert.equal(closeResultsSpread([0, 0]), null);
  });
});
