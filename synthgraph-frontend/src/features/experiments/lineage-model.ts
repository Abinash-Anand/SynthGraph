// Builds the lineage graph from an experiment's generations and runs. Pure,
// with structural input types (the real Generation / EnrichedTrainingRun
// objects satisfy them) so it's unit-testable without the app's types.

export type LineageNodeKind = "dataset" | "asset" | "generation" | "training-run" | "evaluation";
export type LineageTone = "bad" | "warn";

export type LineageNode = {
  id: string;
  kind: LineageNodeKind;
  label: string;
  sublabel?: string;
  /** Column: 0 inputs, 1 generations, 2 produced datasets, 3 runs, 4 evaluations. */
  layer: number;
  /** Something worth a glance: a failed generation/run, or capture that isn't complete. */
  tone?: LineageTone;
  /**
   * A generation recorded as used by a run here, but belonging to another experiment of
   * the project: it is not loaded in this workspace, so it has no inspector.
   */
  external?: boolean;
};

export type LineageEdge = {
  id: string;
  source: string;
  target: string;
};

type DataRef = { id: string; name?: string; uri?: string; type?: string };

export type LineageGenerationInput = {
  id: string;
  name: string;
  generator: { name: string };
  status: string;
  inputs: DataRef[];
  outputs: DataRef[];
  /**
   * Dataset versions attached through the SDK's `generation.dataset(...)`.
   * That call writes a separate link table (surfaced as the manifest's
   * `datasetReferences`), NOT the generation's own `inputs`/`outputs`, so a
   * graph built from inputs/outputs alone misses every link made that way.
   */
  datasetReferences?: Array<{ datasetVersionId: string; role: string }>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type LineageRunInput = {
  run: {
    id: string;
    name: string;
    trainer: { name: string };
    status: string;
    captureStatus: { status: string } | null;
    startedAt: string | null;
    createdAt: string;
    datasets?: Array<{ id: string; version: string; uri?: string }>;
    /** Generations this run was recorded as using. */
    generationReferences?: Array<{ generationId: string; generationName?: string; experimentId?: string }>;
  };
  /** `datasetVersionId` is the dataset version the evaluation was run against (required by the backend). */
  evaluations: Array<{ id: string; name: string | null; datasetVersionId?: string }>;
};

export type LineageModel = {
  nodes: LineageNode[];
  edges: LineageEdge[];
  /** Generations with no recorded path to any training run. */
  unlinkedGenerationIds: string[];
  /**
   * Dataset versions a training run recorded using that no generation claims to
   * have produced. This is the precise shape of the usual gap: the run side was
   * recorded, the generation side wasn't.
   */
  unclaimedDatasetIds: string[];
};

function refNode(ref: DataRef): { id: string; kind: LineageNodeKind } {
  // The same dataset version is referenced by a generation's output and by
  // the run that trained on it, so both must resolve to ONE node keyed by
  // the underlying id. Keying generation refs separately (as before) left a
  // generation's output and its consumer as two unconnected nodes even when
  // the link had been recorded.
  const asset = ref.type?.toLowerCase().includes("asset") ?? false;
  return asset ? { id: `asset:${ref.id}`, kind: "asset" } : { id: `dataset-version:${ref.id}`, kind: "dataset" };
}

// A dataset version we only know by id (no run lists it, no output ref names it).
function placeholderLabel(versionId: string): string {
  return `Dataset ${versionId.slice(0, 8)}`;
}

function reachableTo(startIds: string[], edges: LineageEdge[]): Set<string> {
  const forward = new Map<string, string[]>();
  for (const edge of edges) forward.set(edge.source, [...(forward.get(edge.source) ?? []), edge.target]);
  const seen = new Set(startIds);
  const queue = [...startIds];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of forward.get(current) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

export function buildLineage(generations: LineageGenerationInput[], runs: LineageRunInput[]): LineageModel {
  const nodes = new Map<string, LineageNode>();
  const edges = new Map<string, LineageEdge>();
  const producedIds = new Set<string>();

  const addEdge = (source: string, target: string) => {
    const id = `${source}->${target}`;
    if (!edges.has(id)) edges.set(id, { id, source, target });
  };

  for (const generation of generations) {
    const genId = `generation:${generation.id}`;
    nodes.set(genId, {
      id: genId,
      kind: "generation",
      label: generation.name,
      sublabel: generation.generator.name,
      layer: 1,
      tone: generation.status === "failed" ? "bad" : undefined,
    });

    for (const output of generation.outputs) {
      const { id, kind } = refNode(output);
      producedIds.add(id);
      nodes.set(id, { id, kind, label: output.name ?? output.id, sublabel: output.uri, layer: 2 });
      addEdge(genId, id);
    }
    for (const input of generation.inputs) {
      const { id, kind } = refNode(input);
      // Something a generation produces anywhere is a column-2 node even
      // when another generation also consumes it; a pure input sits at 0.
      if (!nodes.has(id)) {
        nodes.set(id, { id, kind, label: input.name ?? input.id, sublabel: input.uri, layer: 0 });
      }
      addEdge(id, genId);
    }

    for (const reference of generation.datasetReferences ?? []) {
      const id = `dataset-version:${reference.datasetVersionId}`;
      const isInput = reference.role.toLowerCase() === "input";
      if (!nodes.has(id)) {
        nodes.set(id, {
          id,
          kind: "dataset",
          label: placeholderLabel(reference.datasetVersionId),
          layer: isInput ? 0 : 2,
        });
      }
      if (isInput) addEdge(id, genId);
      else {
        producedIds.add(id);
        addEdge(genId, id);
      }
    }
  }

  for (const { run, evaluations } of runs) {
    const runId = `training-run:${run.id}`;
    const capture = run.captureStatus?.status;
    nodes.set(runId, {
      id: runId,
      kind: "training-run",
      label: run.name,
      sublabel: run.trainer.name,
      layer: 3,
      tone: run.status === "failed" ? "bad" : capture === "partial" || capture === "unknown" ? "warn" : undefined,
    });

    // A recorded link from a generation to this run. Solid like every recorded edge. It
    // needs no dataset in between, which is what simulator-driven training lacks. A
    // generation from another experiment of the project is not in this workspace, so it
    // is drawn as a node of its own, by the name the link carries.
    for (const reference of run.generationReferences ?? []) {
      const referencedId = `generation:${reference.generationId}`;
      if (!nodes.has(referencedId)) {
        nodes.set(referencedId, {
          id: referencedId,
          kind: "generation",
          label: reference.generationName ?? reference.generationId.slice(0, 8),
          sublabel: "another experiment",
          layer: 1,
          external: true,
        });
      }
      addEdge(referencedId, runId);
    }

    for (const version of run.datasets ?? []) {
      const versionId = `dataset-version:${version.id}`;
      const existing = nodes.get(versionId);
      nodes.set(versionId, {
        id: versionId,
        kind: "dataset",
        label: version.version,
        sublabel: version.uri ?? existing?.sublabel,
        layer: 2,
      });
      producedIds.add(versionId);
      addEdge(versionId, runId);
    }

    for (const evaluation of evaluations) {
      const evalId = `evaluation:${evaluation.id}`;
      nodes.set(evalId, { id: evalId, kind: "evaluation", label: evaluation.name ?? evaluation.id, layer: 4 });
      addEdge(runId, evalId);

      // Every evaluation names the dataset version it was scored against -
      // a recorded link that exists even when nothing else was linked.
      if (evaluation.datasetVersionId) {
        const versionId = `dataset-version:${evaluation.datasetVersionId}`;
        if (!nodes.has(versionId)) {
          nodes.set(versionId, {
            id: versionId,
            kind: "dataset",
            label: placeholderLabel(evaluation.datasetVersionId),
            layer: 2,
          });
        }
        producedIds.add(versionId);
        addEdge(versionId, evalId);
      }
    }
  }

  // A pure-input node that turned out to also be consumed at column 2 (a
  // run lists it as a dataset version) belongs with the other datasets.
  for (const id of producedIds) {
    const node = nodes.get(id);
    if (node) node.layer = 2;
  }

  // Which generations have a recorded path to a run?
  const recorded = Array.from(edges.values());
  // A path to an evaluation counts as much as one to a run: it proves a
  // recorded relationship to a result (a generation's dataset that was later
  // evaluated on).
  const resultNodeIds = new Set([
    ...runs.map(({ run }) => `training-run:${run.id}`),
    ...runs.flatMap(({ evaluations }) => evaluations.map((evaluation) => `evaluation:${evaluation.id}`)),
  ]);
  const unlinked: string[] = [];
  for (const generation of generations) {
    const genId = `generation:${generation.id}`;
    const reach = reachableTo([genId], recorded);
    if (![...reach].some((id) => resultNodeIds.has(id))) unlinked.push(generation.id);
  }

  // Training datasets nobody claims: a run says it trained on this version,
  // but no generation says it produced it. Both sides are recorded facts; the
  // graph states the gap and draws nothing to bridge it. Evaluation-only datasets
  // don't count - a held-out test set often comes from somewhere else entirely.
  const claimed = new Set(
    Array.from(edges.values())
      .filter((edge) => edge.source.startsWith("generation:") && edge.target.startsWith("dataset-version:"))
      .map((edge) => edge.target),
  );
  const consumed = new Set<string>();
  for (const { run } of runs) {
    for (const version of run.datasets ?? []) consumed.add(`dataset-version:${version.id}`);
  }
  const unclaimedDatasetIds = Array.from(consumed).filter((id) => !claimed.has(id));

  return {
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
    unlinkedGenerationIds: unlinked,
    unclaimedDatasetIds,
  };
}

export type Reach = { upstream: LineageNode[]; downstream: LineageNode[] };

/** Everything a node depends on and everything that depends on it. */
export function reachOf(nodeId: string, model: Pick<LineageModel, "nodes" | "edges">): Reach {
  const byId = new Map(model.nodes.map((node) => [node.id, node]));
  const forward = new Map<string, LineageEdge[]>();
  const backward = new Map<string, LineageEdge[]>();
  for (const edge of model.edges) {
    forward.set(edge.source, [...(forward.get(edge.source) ?? []), edge]);
    backward.set(edge.target, [...(backward.get(edge.target) ?? []), edge]);
  }

  const walk = (graph: Map<string, LineageEdge[]>, pick: (edge: LineageEdge) => string): LineageNode[] => {
    const seen = new Set<string>([nodeId]);
    const queue = [nodeId];
    const found: LineageNode[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const edge of graph.get(current) ?? []) {
        const next = pick(edge);
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
        const node = byId.get(next);
        if (node) found.push(node);
      }
    }
    return found;
  };

  const downstream = walk(forward, (edge) => edge.target);
  const upstream = walk(backward, (edge) => edge.source);
  return { upstream, downstream };
}

export function countByKind(nodes: LineageNode[]): Partial<Record<LineageNodeKind, number>> {
  const counts: Partial<Record<LineageNodeKind, number>> = {};
  for (const node of nodes) counts[node.kind] = (counts[node.kind] ?? 0) + 1;
  return counts;
}

const SDK_HINT =
  "Record each generation's output with generation.dataset(...), or tell a run which generation it used with training.use(generation), to connect them.";

/**
 * A note about generations the graph shows without a link, or null when there are none.
 * Says *which* link is missing: "no links recorded" used to be printed even when the
 * runs had recorded their datasets and only the generation side was missing. Nothing is
 * drawn to bridge a gap: a connection appears only once someone records it.
 */
export function describeLinkGap(model: LineageModel, generationCount: number, hasRuns: boolean): string | null {
  const unlinked = model.unlinkedGenerationIds.length;
  if (unlinked === 0 || !hasRuns) return null;

  const partial = unlinked === generationCount ? "" : ` ${unlinked} of ${generationCount} generations have no recorded link at all.`;
  const labels = model.unclaimedDatasetIds.map(
    (id) => model.nodes.find((node) => node.id === id)?.label ?? id.replace("dataset-version:", ""),
  );

  if (labels.length > 0) {
    const named = labels.length <= 2 ? labels.join(" and ") : `${labels.slice(0, 2).join(", ")} and ${labels.length - 2} more`;
    const subject = labels.length === 1 ? "dataset" : "datasets";
    return (
      `Your training runs recorded ${subject} ${named}, but no generation claims to have produced ${labels.length === 1 ? "it" : "them"}.${partial} ` +
      `Nothing recorded connects those generations to a run, so no line is drawn for them. ${SDK_HINT}`
    );
  }
  const lead =
    unlinked === generationCount
      ? "No dataset links were recorded between these generations and the training runs."
      : `${unlinked} of ${generationCount} generations have no recorded link to a training run.`;
  return `${lead} Nothing recorded connects them, so no line is drawn. Register each generation's outputs and each run's dataset versions in the SDK, or tell a run which generation it used with training.use(generation), to connect them.`;
}
