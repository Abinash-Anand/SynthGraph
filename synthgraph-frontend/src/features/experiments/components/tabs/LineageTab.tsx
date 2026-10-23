"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { buildLineage } from "../../lineage-model";
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
        generations.map((g) => g.generation),
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

  const unlinked = model.unlinkedGenerationIds.length;
  const hasRuns = trainingRuns.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {unlinked > 0 && hasRuns ? (
        <p
          role="note"
          className="rounded-lg border border-research-border bg-research-panel px-4 py-3 text-[13px] text-research-ink-secondary"
        >
          {unlinked === generations.length
            ? "No dataset links were recorded between these generations and the training runs."
            : `${unlinked} of ${generations.length} generations have no recorded link to a training run.`}{" "}
          The dashed lines are a guess from timing within this experiment, not recorded provenance. Register each
          generation&apos;s outputs and each run&apos;s dataset versions in the SDK to make them solid.
        </p>
      ) : null}

      <LineageGraph
        nodes={model.nodes}
        edges={model.edges}
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
    </div>
  );
}
