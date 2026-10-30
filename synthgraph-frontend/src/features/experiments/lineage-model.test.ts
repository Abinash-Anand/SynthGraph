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

  it("has every generation linked when the path exists", () => {
    assert.deepEqual(model.unlinkedGenerationIds, []);
  });

  it("walks the full chain in both directions", () => {
    const reach = reachOf("dataset-version:dv1", model);
    assert.deepEqual(countByKind(reach.downstream), { "training-run": 1, evaluation: 1 });
    assert.deepEqual(countByKind(reach.upstream), { generation: 1 });
  });
});

describe("buildLineage - nothing recorded", () => {
  const generations = [gen("g1"), gen("g2")];
  const runs = [run("r1"), run("r2")];
  const model = buildLineage(generations, runs);

  it("reports every generation as unlinked", () => {
    assert.deepEqual(model.unlinkedGenerationIds, ["g1", "g2"]);
  });

  it("draws no line between a generation and a run when nothing records one", () => {
    assert.deepEqual(model.edges, []);
    assert.deepEqual(reachOf("generation:g1", model), { upstream: [], downstream: [] });
  });

  it("draws no line however the timing falls", () => {
    // A run that began after the generation finished, and one that began before it did.
    const after = buildLineage(
      [gen("g", { completed_at: "2026-09-24T21:01:00Z" })],
      [run("later", { startedAt: "2026-09-24T23:00:00Z" })],
    );
    const before = buildLineage(
      [gen("g", { completed_at: "2026-09-25T00:00:00Z" })],
      [run("earlier", { startedAt: "2026-09-24T22:00:00Z" })],
    );
    assert.deepEqual(after.edges, []);
    assert.deepEqual(before.edges, []);
    assert.deepEqual(after.unlinkedGenerationIds, ["g"]);
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
    assert.ok(model.edges.some((e) => e.source === "generation:g1" && e.target === "dataset-version:dv1"));
    assert.ok(model.edges.some((e) => e.source === "dataset-version:dv1" && e.target === "training-run:r1"));
    assert.deepEqual(model.unlinkedGenerationIds, []);
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
    assert.ok(model.edges.some((e) => e.source === "dataset-version:dv9" && e.target === "evaluation:e1"));
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

  it("connects a generation to an evaluation through the dataset it produced", () => {
    const model = buildLineage(
      [gen("g1", { datasetReferences: [{ datasetVersionId: "dv9", role: "output" }] })],
      [run("r1", {}, [{ id: "e1", name: "eval", datasetVersionId: "dv9" }])],
    );
    assert.deepEqual(model.unlinkedGenerationIds, []);
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

  it("names the gap and draws nothing to bridge it", () => {
    const model = buildLineage([gen("g1")], [trained("r1"), trained("r2")]);

    assert.deepEqual(model.unclaimedDatasetIds, ["dataset-version:dv-1"]);
    assert.deepEqual(model.unlinkedGenerationIds, ["g1"]);
    assert.ok(!model.edges.some((e) => e.source === "generation:g1" || e.target === "generation:g1"));
  });

  it("keeps the recorded dataset -> run links and gives the generation no way to reach them", () => {
    const model = buildLineage([gen("g1")], [trained("r1")]);

    assert.ok(model.edges.some((e) => e.source === "dataset-version:dv-1" && e.target === "training-run:r1"));
    assert.deepEqual(reachOf("generation:g1", model).downstream, []);
    assert.equal(countByKind(reachOf("dataset-version:dv-1", model).downstream)["training-run"], 1);
  });

  it("does not depend on when the run began", () => {
    const early = buildLineage([gen("g1", { completed_at: "2026-09-25T00:00:00Z" })], [trained("r1", "2026-09-24T22:00:00Z")]);
    const late = buildLineage([gen("g1", { completed_at: "2026-09-24T21:01:00Z" })], [trained("r1", "2026-09-25T09:00:00Z")]);

    assert.deepEqual(early.edges, late.edges);
    assert.deepEqual(early.unclaimedDatasetIds, late.unclaimedDatasetIds);
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
    // g1 is linked; g2 is not, and nothing connects it.
    assert.deepEqual(model.unlinkedGenerationIds, ["g2"]);
    assert.ok(!model.edges.some((e) => e.source === "generation:g2"));
  });

  it("ignores datasets that only an evaluation used", () => {
    const model = buildLineage(
      [gen("g1")],
      [run("r1", {}, [{ id: "e1", name: "eval", datasetVersionId: "held-out" }])],
    );
    assert.deepEqual(model.unclaimedDatasetIds, []);
    assert.ok(!model.edges.some((e) => e.source === "generation:g1"));
  });
});

describe("buildLineage - nothing is inferred", () => {
  it("has no inferred edge and no inference count in its result", () => {
    const model = buildLineage(
      [gen("g1"), gen("g2", { datasetReferences: [{ datasetVersionId: "dv1", role: "output" }] })],
      [run("r1", { datasets: [{ id: "dv1", version: "v1" }], generationReferences: [{ generationId: "g1" }] })],
    );

    assert.ok(model.edges.length > 0);
    for (const edge of model.edges) assert.deepEqual(Object.keys(edge).sort(), ["id", "source", "target"]);
    assert.deepEqual(Object.keys(model).sort(), ["edges", "nodes", "unclaimedDatasetIds", "unlinkedGenerationIds"]);
  });

  it("gives the same graph whatever the timestamps are", () => {
    const refs = { generationReferences: [{ generationId: "g1" }] };
    const base = buildLineage([gen("g1"), gen("g2")], [run("r1", refs), run("r2")]);
    const shifted = buildLineage(
      [
        gen("g1", { started_at: "2030-01-01T00:00:00Z", completed_at: "2030-01-01T00:01:00Z", created_at: "2030-01-01T00:00:00Z" }),
        gen("g2", { started_at: null, completed_at: null, created_at: "1999-01-01T00:00:00Z" }),
      ],
      [run("r1", { ...refs, startedAt: null, createdAt: "1990-01-01T00:00:00Z" }), run("r2", { startedAt: "2040-01-01T00:00:00Z" })],
    );

    assert.deepEqual(shifted.edges, base.edges);
    assert.deepEqual(shifted.unlinkedGenerationIds, base.unlinkedGenerationIds);
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

describe("buildLineage - recorded generation-to-run links", () => {
  const used = (generationId: string, name = `gen-${generationId}`, experimentId = "e1") => ({
    generationId,
    generationName: name,
    experimentId,
  });

  it("draws a solid edge from a generation to the run that recorded using it, with no dataset between", () => {
    const model = buildLineage([gen("g1")], [run("r1", { generationReferences: [used("g1")] })]);

    assert.ok(
      model.edges.some((e) => e.source === "generation:g1" && e.target === "training-run:r1"),
      "the recorded link is drawn",
    );
    assert.deepEqual(model.unlinkedGenerationIds, []);
    assert.equal(describeLinkGap(model, 1, true), null);
  });

  it("does not add a second node for a generation that is already in this experiment", () => {
    const model = buildLineage([gen("g1")], [run("r1", { generationReferences: [used("g1")] })]);

    assert.equal(model.nodes.filter((n) => n.id === "generation:g1").length, 1);
    assert.equal(model.nodes.find((n) => n.id === "generation:g1")?.external, undefined);
  });

  it("shows a generation from another experiment as a node of its own, by name", () => {
    const model = buildLineage([], [run("r1", { generationReferences: [used("g9", "sim pass", "e2")] })]);

    const node = model.nodes.find((n) => n.id === "generation:g9");
    assert.deepEqual(node, {
      id: "generation:g9",
      kind: "generation",
      label: "sim pass",
      sublabel: "another experiment",
      layer: 1,
      external: true,
    });
    assert.ok(model.edges.some((e) => e.source === "generation:g9" && e.target === "training-run:r1"));
  });

  it("falls back to a short id when the link carries no name", () => {
    const model = buildLineage([], [run("r1", { generationReferences: [{ generationId: "abcdef12-3456" }] })]);

    assert.equal(model.nodes.find((n) => n.external)?.label, "abcdef12");
  });

  it("shares one external node between runs that used the same generation", () => {
    const model = buildLineage(
      [],
      [
        run("r1", { generationReferences: [used("g9", "sim", "e2")] }),
        run("r2", { generationReferences: [used("g9", "sim", "e2")] }),
      ],
    );

    assert.equal(model.nodes.filter((n) => n.id === "generation:g9").length, 1);
    assert.equal(model.edges.filter((e) => e.source === "generation:g9").length, 2);
  });

  it("does not count an external generation among this experiment's unlinked ones", () => {
    const model = buildLineage([gen("g1")], [run("r1", { generationReferences: [used("g9", "sim", "e2")] })]);

    assert.deepEqual(model.unlinkedGenerationIds, ["g1"]);
  });

  it("links a run to many generations, and a generation to many runs", () => {
    const model = buildLineage(
      [gen("g1"), gen("g2")],
      [
        run("r1", { generationReferences: [used("g1"), used("g2")] }),
        run("r2", { generationReferences: [used("g1")] }),
      ],
    );

    const recorded = model.edges.filter((e) => e.source.startsWith("generation:") && e.target.startsWith("training-run:"));
    assert.equal(recorded.length, 3);
  });

  it("walks from the generation to the run's results and back, as recorded", () => {
    const model = buildLineage(
      [gen("g1")],
      [run("r1", { generationReferences: [used("g1")] }, [{ id: "e1", name: "eval" }])],
    );

    const down = reachOf("generation:g1", model);
    assert.deepEqual(down.downstream.map((n) => n.id).sort(), ["evaluation:e1", "training-run:r1"]);
    assert.deepEqual(reachOf("training-run:r1", model).upstream.map((n) => n.id), ["generation:g1"]);
  });

  it("draws no line for a generation with no recorded link, beside runs that recorded others", () => {
    const model = buildLineage(
      [gen("g1"), gen("g2")],
      [run("r1", { generationReferences: [used("g1")] }), run("r2")],
    );

    assert.ok(!model.edges.some((e) => e.source === "generation:g2"));
    assert.ok(!model.edges.some((e) => e.target === "training-run:r2"));
    assert.deepEqual(model.unlinkedGenerationIds, ["g2"]);
  });

  it("is unchanged for runs with no recorded generations", () => {
    const withField = buildLineage([gen("g1")], [run("r1", { generationReferences: [] })]);
    const without = buildLineage([gen("g1")], [run("r1")]);

    assert.deepEqual(withField, without);
  });

  it("says nothing is drawn for the gap, and never calls a line a guess", () => {
    const named = describeLinkGap(buildLineage([gen("g1")], [run("r1", { datasets: [{ id: "dv-1", version: "1.0.0" }] })]), 1, true) ?? "";
    const plain = describeLinkGap(buildLineage([gen("g1")], [run("r1")]), 1, true) ?? "";

    for (const text of [named, plain]) {
      assert.match(text, /no line is drawn/);
      assert.doesNotMatch(text, /dashed|guess|timing|infer/i);
    }
  });

  it("names the way to record a link in the gap note", () => {
    const model = buildLineage([gen("g1")], [run("r1")]);

    assert.match(describeLinkGap(model, 1, true) ?? "", /training\.use\(generation\)/);
  });
});
