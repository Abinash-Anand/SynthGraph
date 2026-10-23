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
};

export type LineageEdge = {
  id: string;
  source: string;
  target: string;
  /** Not recorded provenance - guessed from timing within one experiment. */
  inferred?: boolean;
};

type DataRef = { id: string; name?: string; uri?: string; type?: string };

export type LineageGenerationInput = {
  id: string;
  name: string;
  generator: { name: string };
  status: string;
  inputs: DataRef[];
  outputs: DataRef[];
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
  };
  evaluations: Array<{ id: string; name: string | null }>;
};

export type LineageModel = {
  nodes: LineageNode[];
  edges: LineageEdge[];
  /** Generations with no recorded path to any training run. */
  unlinkedGenerationIds: string[];
  inferredEdgeCount: number;
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

function timeOf(...values: Array<string | null | undefined>): number | null {
  for (const value of values) {
    if (value) {
      const time = Date.parse(value);
      if (!Number.isNaN(time)) return time;
    }
  }
  return null;
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

  const addEdge = (source: string, target: string, inferred = false) => {
    const id = `${source}->${target}`;
    if (!edges.has(id)) edges.set(id, { id, source, target, inferred: inferred || undefined });
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
    }
  }

  // A pure-input node that turned out to also be consumed at column 2 (a
  // run lists it as a dataset version) belongs with the other datasets.
  for (const id of producedIds) {
    const node = nodes.get(id);
    if (node) node.layer = 2;
  }

  // Which generations already have a recorded path to a run?
  const recorded = Array.from(edges.values());
  const runNodeIds = new Set(runs.map(({ run }) => `training-run:${run.id}`));
  const unlinked: string[] = [];
  for (const generation of generations) {
    const genId = `generation:${generation.id}`;
    const reach = reachableTo([genId], recorded);
    if (![...reach].some((id) => runNodeIds.has(id))) unlinked.push(generation.id);
  }

  // Without any recorded link, the only honest statement is "same
  // experiment, and the run began after the generation finished". Flagged
  // as inferred so the UI never presents it as provenance.
  let inferredEdgeCount = 0;
  for (const generation of generations) {
    if (!unlinked.includes(generation.id)) continue;
    const available = timeOf(generation.completed_at, generation.started_at, generation.created_at);
    for (const { run } of runs) {
      const began = timeOf(run.startedAt, run.createdAt);
      if (available !== null && began !== null && began < available) continue;
      addEdge(`generation:${generation.id}`, `training-run:${run.id}`, true);
      inferredEdgeCount++;
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
    unlinkedGenerationIds: unlinked,
    inferredEdgeCount,
  };
}

export type Reach = { upstream: LineageNode[]; downstream: LineageNode[]; viaInferred: boolean };

/** Everything a node depends on and everything that depends on it. */
export function reachOf(nodeId: string, model: Pick<LineageModel, "nodes" | "edges">): Reach {
  const byId = new Map(model.nodes.map((node) => [node.id, node]));
  const forward = new Map<string, LineageEdge[]>();
  const backward = new Map<string, LineageEdge[]>();
  for (const edge of model.edges) {
    forward.set(edge.source, [...(forward.get(edge.source) ?? []), edge]);
    backward.set(edge.target, [...(backward.get(edge.target) ?? []), edge]);
  }

  let viaInferred = false;
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
        if (edge.inferred) viaInferred = true;
        queue.push(next);
        const node = byId.get(next);
        if (node) found.push(node);
      }
    }
    return found;
  };

  const downstream = walk(forward, (edge) => edge.target);
  const upstream = walk(backward, (edge) => edge.source);
  return { upstream, downstream, viaInferred };
}

export function countByKind(nodes: LineageNode[]): Partial<Record<LineageNodeKind, number>> {
  const counts: Partial<Record<LineageNodeKind, number>> = {};
  for (const node of nodes) counts[node.kind] = (counts[node.kind] ?? 0) + 1;
  return counts;
}
