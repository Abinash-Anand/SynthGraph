import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLineage,
  countByKind,
  describeLinkGap,
  type LineageGenerationInput,
  type LineageRunInput,
  reachOf,
} from "./lineage-model.ts";

function gen(id: string, over: Partial<LineageGenerationInput> = {}): LineageGenerationInput {
  return {
    id,
    name: `gen-${id}`,
    generator: { name: "sim" },
    status: "completed",
    inputs: [],
    outputs: [],
    started_at: "2026-09-24T21:00:00Z",
    completed_at: "2026-09-24T21:01:00Z",
    created_at: "2026-09-24T21:00:00Z",
    ...over,
  };
}

function run(id: string, over: Partial<LineageRunInput["run"]> = {}, evaluations: LineageRunInput["evaluations"] = []): LineageRunInput {
  return {
    run: {
      id,
      name: `run-${id}`,
      trainer: { name: "ppo" },
      status: "completed",
      captureStatus: { status: "complete" },
      startedAt: "2026-09-24T22:00:00Z",
      createdAt: "2026-09-24T22:00:00Z",
      ...over,
    },
    evaluations,
  };
}

describe("buildLineage - recorded links", () => {
  const generations = [gen("g1", { outputs: [{ id: "dv1", name: "frames", uri: "s3://x" }] })];
  const runs = [run("r1", { datasets: [{ id: "dv1", version: "v1" }] }, [{ id: "e1", name: "eval" }])];
  const model = buildLineage(generations, runs);

  it("joins a generation's output and the run that consumed it into one node", () => {
    const datasets = model.nodes.filter((n) => n.kind === "dataset");
    assert.equal(datasets.length, 1);
    assert.equal(datasets[0].id, "dataset-version:dv1");
    assert.ok(model.edges.some((e) => e.source === "generation:g1" && e.target === "dataset-version:dv1"));
    assert.ok(model.edges.some((e) => e.source === "dataset-version:dv1" && e.target === "training-run:r1"));
  });

  it("records no inferred links when the path exists", () => {
    assert.deepEqual(model.unlinkedGenerationIds, []);
    assert.equal(model.inferredEdgeCount, 0);
    assert.ok(model.edges.every((e) => !e.inferred));
  });

  it("walks the full chain in both directions", () => {
    const reach = reachOf("dataset-version:dv1", model);
    assert.deepEqual(countByKind(reach.downstream), { "training-run": 1, evaluation: 1 });
    assert.deepEqual(countByKind(reach.upstream), { generation: 1 });
    assert.equal(reach.viaInferred, false);
  });
});

describe("buildLineage - nothing recorded", () => {
  const generations = [gen("g1"), gen("g2")];
  const runs = [run("r1"), run("r2")];
  const model = buildLineage(generations, runs);

  it("reports every generation as unlinked", () => {
    assert.deepEqual(model.unlinkedGenerationIds, ["g1", "g2"]);
  });

  it("falls back to clearly-flagged inferred edges", () => {
    assert.equal(model.inferredEdgeCount, 4);
    assert.ok(model.edges.filter((e) => e.target.startsWith("training-run:")).every((e) => e.inferred === true));
  });

  it("marks reach through inferred edges as inferred", () => {
    const reach = reachOf("generation:g1", model);
    assert.equal(reach.viaInferred, true);
    assert.equal(countByKind(reach.downstream)["training-run"], 2);
  });

  it("does not link a generation to a run that began before it finished", () => {
    const late = buildLineage(
      [gen("late", { completed_at: "2026-09-25T00:00:00Z" })],
      [run("early", { startedAt: "2026-09-24T22:00:00Z" })],
    );
    assert.equal(late.inferredEdgeCount, 0);
  });
});

describe("buildLineage - tone and layers", () => {
  it("flags failed and partially-captured nodes", () => {
    const model = buildLineage(
      [gen("g", { status: "failed" })],
      [run("a", { status: "failed" }), run("b", { captureStatus: { status: "partial" } }), run("c")],
    );
    const tone = (id: string) => model.nodes.find((n) => n.id === id)?.tone;
    assert.equal(tone("generation:g"), "bad");
    assert.equal(tone("training-run:a"), "bad");
    assert.equal(tone("training-run:b"), "warn");
    assert.equal(tone("training-run:c"), undefined);
  });

  it("puts a pure input before the generation and a produced dataset after it", () => {
    const model = buildLineage(
      [gen("g", { inputs: [{ id: "raw" }], outputs: [{ id: "out" }] })],
      [],
    );
    const layer = (id: string) => model.nodes.find((n) => n.id === id)?.layer;
    assert.equal(layer("dataset-version:raw"), 0);
    assert.equal(layer("generation:g"), 1);
    assert.equal(layer("dataset-version:out"), 2);
  });

  it("keeps assets distinct from datasets", () => {
    const model = buildLineage([gen("g", { inputs: [{ id: "tex", type: "asset" }] })], []);
    assert.equal(model.nodes.find((n) => n.id === "asset:tex")?.kind, "asset");
  });
});

describe("buildLineage - links recorded through the SDK's dataset attach", () => {
  it("connects a generation to a run through a dataset version listed only in datasetReferences", () => {
    const model = buildLineage(
      [gen("g1", { datasetReferences: [{ datasetVersionId: "dv1", role: "output" }] })],
      [run("r1", { datasets: [{ id: "dv1", version: "v1", uri: "s3://x" }] })],
    );
    assert.ok(model.edges.some((e) => e.source === "generation:g1" && e.target === "dataset-version:dv1" && !e.inferred));
    assert.ok(model.edges.some((e) => e.source === "dataset-version:dv1" && e.target === "training-run:r1"));
    assert.deepEqual(model.unlinkedGenerationIds, []);
    assert.equal(model.inferredEdgeCount, 0);
    // The run's own dataset record names the node; the bare id is only a fallback.
    assert.equal(model.nodes.find((n) => n.id === "dataset-version:dv1")?.label, "v1");
  });

  it("draws an input reference into the generation, not out of it", () => {
    const model = buildLineage(
      [gen("g1", { datasetReferences: [{ datasetVersionId: "raw", role: "input" }] })],
      [],
    );
    assert.ok(model.edges.some((e) => e.source === "dataset-version:raw" && e.target === "generation:g1"));
    assert.equal(model.nodes.find((n) => n.id === "dataset-version:raw")?.layer, 0);
  });

  it("falls back to a short id label for a dataset nothing names", () => {
    const model = buildLineage(
      [gen("g1", { datasetReferences: [{ datasetVersionId: "5e04c3a7-bfe3-46f9", role: "output" }] })],
      [],
    );
    assert.equal(model.nodes.find((n) => n.id === "dataset-version:5e04c3a7-bfe3-46f9")?.label, "Dataset 5e04c3a7");
  });
});

describe("buildLineage - evaluations name their dataset", () => {
  it("links the dataset version an evaluation was scored against, even if nothing else links it", () => {
    const model = buildLineage(
      [],
      [run("r1", {}, [{ id: "e1", name: "eval", datasetVersionId: "dv9" }])],
    );
    assert.ok(model.edges.some((e) => e.source === "dataset-version:dv9" && e.target === "evaluation:e1" && !e.inferred));
    assert.equal(model.nodes.find((n) => n.id === "dataset-version:dv9")?.layer, 2);
  });

  it("shares one node between evaluations on the same dataset", () => {
    const model = buildLineage(
      [],
      [run("r1", {}, [
        { id: "e1", name: "a", datasetVersionId: "dv9" },
        { id: "e2", name: "b", datasetVersionId: "dv9" },
      ])],
    );
    assert.equal(model.nodes.filter((n) => n.kind === "dataset").length, 1);
    assert.equal(model.edges.filter((e) => e.source === "dataset-version:dv9").length, 2);
  });

  it("does not guess a run link for a generation whose dataset was evaluated on", () => {
    const model = buildLineage(
      [gen("g1", { datasetReferences: [{ datasetVersionId: "dv9", role: "output" }] })],
      [run("r1", {}, [{ id: "e1", name: "eval", datasetVersionId: "dv9" }])],
    );
    assert.deepEqual(model.unlinkedGenerationIds, []);
    assert.equal(model.inferredEdgeCount, 0);
    const reach = reachOf("generation:g1", model);
    assert.equal(countByKind(reach.downstream).evaluation, 1);
  });

  it("keeps the run's dataset label when an evaluation reaches the same version first", () => {
    const model = buildLineage(
      [],
      [
        run("r1", {}, [{ id: "e1", name: "eval", datasetVersionId: "dv1" }]),
        run("r2", { datasets: [{ id: "dv1", version: "release-3" }] }),
      ],
    );
    assert.equal(model.nodes.find((n) => n.id === "dataset-version:dv1")?.label, "release-3");
  });
});

describe("buildLineage - runs recorded a dataset that no generation claims", () => {
  const trained = (id: string, startedAt = "2026-09-24T22:00:00Z") =>
    run(id, { startedAt, datasets: [{ id: "dv-1", version: "1.0.0", uri: "D:/data" }] }, [
      { id: `e-${id}`, name: "eval" },
    ]);

  it("guesses generation -> dataset, not a line over the dataset to each run", () => {
    const model = buildLineage([gen("g1")], [trained("r1"), trained("r2")]);

    assert.deepEqual(model.unclaimedDatasetIds, ["dataset-version:dv-1"]);
    const guessed = model.edges.filter((e) => e.inferred);
    assert.deepEqual(guessed.map((e) => [e.source, e.target]), [["generation:g1", "dataset-version:dv-1"]]);
    assert.equal(model.inferredEdgeCount, 1);
    assert.ok(!model.edges.some((e) => e.source === "generation:g1" && e.target.startsWith("training-run:")));
  });

  it("keeps the real run -> dataset links solid and reaches results through the guess", () => {
    const model = buildLineage([gen("g1")], [trained("r1")]);

    assert.ok(model.edges.some((e) => e.source === "dataset-version:dv-1" && e.target === "training-run:r1" && !e.inferred));
    const reach = reachOf("generation:g1", model);
    assert.equal(reach.viaInferred, true);
    assert.equal(countByKind(reach.downstream)["training-run"], 1);
    assert.equal(countByKind(reach.downstream).evaluation, 1);
  });

  it("does not guess when every run began before the generation finished", () => {
    const model = buildLineage(
      [gen("g1", { completed_at: "2026-09-25T00:00:00Z" })],
      [trained("r1", "2026-09-24T22:00:00Z")],
    );
    assert.equal(model.inferredEdgeCount, 0);
  });

  it("is not triggered by a dataset that a generation does claim", () => {
    const model = buildLineage(
      [
        gen("g1", { datasetReferences: [{ datasetVersionId: "dv-1", role: "output" }] }),
        gen("g2"),
      ],
      [trained("r1")],
    );
    assert.deepEqual(model.unclaimedDatasetIds, []);
    // g1 is linked; g2 is not, and with nothing unclaimed it falls back to guessing a run.
    assert.deepEqual(model.unlinkedGenerationIds, ["g2"]);
    assert.ok(model.edges.some((e) => e.inferred && e.source === "generation:g2" && e.target === "training-run:r1"));
  });

  it("ignores datasets that only an evaluation used", () => {
    const model = buildLineage(
      [gen("g1")],
      [run("r1", {}, [{ id: "e1", name: "eval", datasetVersionId: "held-out" }])],
    );
    assert.deepEqual(model.unclaimedDatasetIds, []);
    // Falls back to the run, not to the held-out set.
    assert.ok(model.edges.some((e) => e.inferred && e.target === "training-run:r1"));
    assert.ok(!model.edges.some((e) => e.inferred && e.target === "dataset-version:held-out"));
  });
});

describe("describeLinkGap", () => {
  const trained = (id: string) => run(id, { datasets: [{ id: "dv-1", version: "1.0.0" }] });

  it("names the dataset the runs recorded and says the generation side is what is missing", () => {
    const model = buildLineage([gen("g1")], [trained("r1")]);
    const text = describeLinkGap(model, 1, true) ?? "";
    assert.match(text, /training runs recorded dataset 1.0.0/);
    assert.match(text, /no generation claims to have produced it/);
    assert.match(text, /generation.dataset(...)/);
  });

  it("counts generations when only some are unlinked", () => {
    // g1 produced dv-2 and r-claimed trained on it; r-orphan trained on dv-1, which nobody claims.
    const model = buildLineage(
      [gen("g1", { datasetReferences: [{ datasetVersionId: "dv-2", role: "output" }] }), gen("g2")],
      [run("r-claimed", { datasets: [{ id: "dv-2", version: "v2" }] }), trained("r-orphan")],
    );
    const text = describeLinkGap(model, 2, true) ?? "";
    // An unclaimed dataset is claimed by NO generation, however many are unlinked.
    assert.match(text, /no generation claims to have produced it/);
    assert.match(text, /1 of 2 generations have no recorded link at all/);
    assert.doesNotMatch(text, /generations claim to have produced/);
  });

  it("falls back to the plain wording when the runs recorded no datasets either", () => {
    const model = buildLineage([gen("g1")], [run("r1")]);
    assert.match(describeLinkGap(model, 1, true) ?? "", /No dataset links were recorded/);
  });

  it("says nothing when everything is linked or there are no runs", () => {
    const linked = buildLineage(
      [gen("g1", { datasetReferences: [{ datasetVersionId: "dv-1", role: "output" }] })],
      [trained("r1")],
    );
    assert.equal(describeLinkGap(linked, 1, true), null);
    assert.equal(describeLinkGap(buildLineage([gen("g1")], []), 1, false), null);
  });

  it("abbreviates a long list of datasets", () => {
    const runs = [1, 2, 3].map((n) => run(`r${n}`, { datasets: [{ id: `dv-${n}`, version: `v${n}` }] }));
    const text = describeLinkGap(buildLineage([gen("g1")], runs), 1, true) ?? "";
    assert.match(text, /datasets v1, v2 and 1 more/);
  });
});
