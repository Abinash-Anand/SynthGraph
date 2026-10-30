"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { buildLineage, describeLinkGap } from "../../lineage-model";
import type { EnrichedGeneration, EnrichedTrainingRun, SelectedEntity } from "../../types/experiment-workspace";

// @xyflow/react is a sizeable dependency (canvas/graph engine + its own
// CSS) - only load it when the Lineage tab actually renders, not as part
// of every Experiment Detail page's initial bundle.
const LineageGraph = dynamic(
  () => import("@/shared/lineage/LineageGraph").then((m) => m.LineageGraph),
  { ssr: false, loading: () => <div className="h-[460px] animate-pulse rounded-xl bg-research-panel" /> },
);

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
  const model = useMemo(
    () =>
      buildLineage(
        // The manifest carries the links made by the SDK's
        // generation.dataset(...) - a separate table from the generation's
        // own inputs/outputs, so it has to be merged in explicitly.
        generations.map((g) => ({ ...g.generation, datasetReferences: g.manifest?.datasetReferences })),
        trainingRuns,
      ),
    [generations, trainingRuns],
  );

  const selectedNodeId =
    selected?.type === "generation"
      ? `generation:${selected.id}`
      : selected?.type === "run"
        ? `training-run:${selected.id}`
        : selected?.type === "evaluation"
          ? `evaluation:${selected.id}`
          : null;

  const gapNote = describeLinkGap(model, generations.length, trainingRuns.length > 0);

  return (
    <div className="flex flex-col gap-3">
      {gapNote ? (
        <p
          role="note"
          className="rounded-lg border border-research-border bg-research-panel px-4 py-3 text-[13px] text-research-ink-secondary"
        >
          {gapNote}
        </p>
      ) : null}

      <LineageGraph
        nodes={model.nodes}
        edges={model.edges}
        selectedId={selectedNodeId}
        onNodeSelect={(id, kind) => {
          // A generation of another experiment is not loaded here, so there is nothing to inspect.
          if (model.nodes.find((node) => node.id === id)?.external) return;
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
    </div>
  );
}
