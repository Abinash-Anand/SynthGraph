"use client";

import { useMemo } from "react";
import {
  LineageGraph,
  type LineageGraphEdge,
  type LineageGraphNode,
  type LineageNodeKind,
} from "@/shared/lineage/LineageGraph";
import type {
  EnrichedGeneration,
  EnrichedTrainingRun,
  SelectedEntity,
} from "../../types/experiment-workspace";

export function LineageTab({
  generations,
  trainingRuns,
  selected,
  onSelect,
}: {
  generations: EnrichedGeneration[];
  trainingRuns: EnrichedTrainingRun[];
  selected: SelectedEntity;
  onSelect: (entity: SelectedEntity) => void;
}) {
  const { nodes, edges } = useMemo(() => buildGraph(generations, trainingRuns), [generations, trainingRuns]);

  const selectedNodeId =
    selected?.type === "generation"
      ? `generation:${selected.id}`
      : selected?.type === "run"
        ? `training-run:${selected.id}`
        : selected?.type === "evaluation"
          ? `evaluation:${selected.id}`
          : null;

  return (
    <LineageGraph
      nodes={nodes}
      edges={edges}
      selectedId={selectedNodeId}
      onNodeSelect={(id, kind) => {
        if (kind === "generation") {
          onSelect({ type: "generation", id: id.replace("generation:", "") });
        } else if (kind === "training-run") {
          onSelect({ type: "run", id: id.replace("training-run:", "") });
        } else if (kind === "evaluation") {
          onSelect({ type: "evaluation", id: id.replace("evaluation:", "") });
        }
        // dataset/asset reference nodes have no inspector content in this
        // pass - see the Phase 4 plan's open items.
      }}
    />
  );
}

function buildGraph(
  generations: EnrichedGeneration[],
  trainingRuns: EnrichedTrainingRun[],
): { nodes: LineageGraphNode[]; edges: LineageGraphEdge[] } {
  const nodes: LineageGraphNode[] = [];
  const edges: LineageGraphEdge[] = [];
  const seenDatasetVersions = new Set<string>();

  for (const { generation } of generations) {
    const genId = `generation:${generation.id}`;
    nodes.push({ id: genId, kind: "generation", label: generation.name, sublabel: generation.generator.name, layer: 1 });

    for (const input of generation.inputs) {
      const refId = `gen-input:${generation.id}:${input.id}`;
      const isAsset = input.type?.toLowerCase().includes("asset") ?? false;
      const kind: LineageNodeKind = isAsset ? "asset" : "dataset";
      nodes.push({ id: refId, kind, label: input.name ?? input.id, sublabel: input.uri, layer: 0 });
      edges.push({ id: `${refId}->${genId}`, source: refId, target: genId });
    }

    for (const output of generation.outputs) {
      const refId = `gen-output:${generation.id}:${output.id}`;
      const isAsset = output.type?.toLowerCase().includes("asset") ?? false;
      const kind: LineageNodeKind = isAsset ? "asset" : "dataset";
      nodes.push({ id: refId, kind, label: output.name ?? output.id, sublabel: output.uri, layer: 2 });
      edges.push({ id: `${genId}->${refId}`, source: genId, target: refId });
    }
  }

  for (const { run, evaluations } of trainingRuns) {
    const runId = `training-run:${run.id}`;
    nodes.push({ id: runId, kind: "training-run", label: run.name, sublabel: run.trainer.name, layer: 3 });

    for (const version of run.datasets ?? []) {
      const versionId = `dataset-version:${version.id}`;
      if (!seenDatasetVersions.has(versionId)) {
        seenDatasetVersions.add(versionId);
        nodes.push({ id: versionId, kind: "dataset", label: version.version, sublabel: version.uri, layer: 2 });
      }
      edges.push({ id: `${versionId}->${runId}`, source: versionId, target: runId });
    }

    for (const evaluation of evaluations) {
      const evalId = `evaluation:${evaluation.id}`;
      nodes.push({ id: evalId, kind: "evaluation", label: evaluation.name ?? evaluation.id, layer: 4 });
      edges.push({ id: `${runId}->${evalId}`, source: runId, target: evalId });
    }
  }

  return { nodes, edges };
}
