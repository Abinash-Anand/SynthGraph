import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLineage,
  countByKind,
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
