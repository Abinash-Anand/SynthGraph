"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import type { Experiment } from "@/features/experiments/types/experiment";
import type { ParameterCorrelationReport } from "@/features/reports/types/report";
import { ResearchWorkspace } from "@/shared/layout/ResearchWorkspace";
import { Tabs } from "@/shared/ui/Tabs";
import type { EnrichedGeneration, EnrichedTrainingRun, SelectedEntity } from "../types/experiment-workspace";
import { parseSelectedEntity, serializeSelectedEntity } from "../types/experiment-workspace";
import { ExperimentHeader } from "./ExperimentHeader";
import { EvaluationInspector } from "./inspector/EvaluationInspector";
import { GenerationInspector } from "./inspector/GenerationInspector";
import { TrainingRunInspector } from "./inspector/TrainingRunInspector";
import { LineageTab } from "./tabs/LineageTab";
import { MetricsTab } from "./tabs/MetricsTab";
import { OverviewTab } from "./tabs/OverviewTab";
import { ParametersTab } from "./tabs/ParametersTab";
import { ReproductionTab } from "./tabs/ReproductionTab";
import { RunsTab } from "./tabs/RunsTab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "runs", label: "Runs" },
  { id: "lineage", label: "Lineage" },
  { id: "metrics", label: "Metrics" },
  { id: "parameters", label: "Parameters" },
  { id: "reproduction", label: "Reproduction" },
];

export function ExperimentWorkspace({
  projectId,
  experimentId,
  experiment,
  generations,
  trainingRuns,
  correlationReport,
}: {
  projectId: string;
  experimentId: string;
  experiment: Experiment;
  generations: EnrichedGeneration[];
  trainingRuns: EnrichedTrainingRun[];
  correlationReport: ParameterCorrelationReport;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "overview";
  const selected = parseSelectedEntity(searchParams.get("entity"));

  const [compareMode, setCompareMode] = useState(false);
  const [compareTarget, setCompareTarget] = useState<"generation" | "trainingRun">("generation");
  const [compareSelection, setCompareSelection] = useState<Set<string>>(new Set());

  const toggleCompareSelection = useCallback((id: string) => {
    setCompareSelection((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else if (next.size < 10) next.add(id);
      return next;
    });
  }, []);

  const setSelected = useCallback(
    (entity: SelectedEntity) => {
      const next = new URLSearchParams(searchParams.toString());
      const serialized = serializeSelectedEntity(entity);
      if (serialized) next.set("entity", serialized);
      else next.delete("entity");
      router.push(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const setTab = useCallback(
    (tab: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("tab", tab);
      router.push(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const selectedRun = selected?.type === "run" ? trainingRuns.find((r) => r.run.id === selected.id) : undefined;
  const selectedGeneration =
    selected?.type === "generation" ? generations.find((g) => g.generation.id === selected.id) : undefined;
  const selectedEvaluationRun =
    selected?.type === "evaluation"
      ? trainingRuns.find((r) => r.evaluations.some((e) => e.id === selected.id))
      : undefined;
  const selectedEvaluation =
    selected?.type === "evaluation"
      ? selectedEvaluationRun?.evaluations.find((e) => e.id === selected.id)
      : undefined;

  let inspector: React.ReactNode = null;
  let inspectorTitle = "Inspector";
  if (selectedRun) {
    inspectorTitle = "Training run";
    inspector = (
      <TrainingRunInspector
        enriched={selectedRun}
        onSelectEvaluation={(id) => setSelected({ type: "evaluation", id })}
        onOpenMetrics={() => setTab("metrics")}
      />
    );
  } else if (selectedGeneration) {
    inspectorTitle = "Generation";
    inspector = (
      <GenerationInspector enriched={selectedGeneration} projectId={projectId} experimentId={experimentId} />
    );
  } else if (selectedEvaluation && selectedEvaluationRun) {
    inspectorTitle = "Evaluation";
    inspector = (
      <EvaluationInspector
        evaluation={selectedEvaluation}
        trainingRunName={selectedEvaluationRun.run.name}
        onSelectRun={() => setSelected({ type: "run", id: selectedEvaluationRun.run.id })}
      />
    );
  }

  let canvas: React.ReactNode;
  switch (activeTab) {
    case "runs":
      canvas = (
        <RunsTab
          runs={trainingRuns}
          selectedId={selected?.type === "run" ? selected.id : null}
          onSelect={(id) => setSelected({ type: "run", id })}
          compareMode={compareMode && compareTarget === "trainingRun"}
          compareSelection={compareSelection}
          onToggleCompareSelection={toggleCompareSelection}
        />
      );
      break;
    case "lineage":
      canvas = <LineageTab generations={generations} trainingRuns={trainingRuns} selected={selected} onSelect={setSelected} />;
      break;
    case "metrics":
      canvas = (
        <MetricsTab
          runs={trainingRuns}
          selectedRunId={selected?.type === "run" ? selected.id : null}
          onSelectRun={(id) => setSelected({ type: "run", id })}
        />
      );
      break;
    case "parameters":
      canvas = <ParametersTab runs={trainingRuns} correlationReport={correlationReport} />;
      break;
    case "reproduction":
      canvas = <ReproductionTab generations={generations} />;
      break;
    default:
      canvas = (
        <OverviewTab
          generations={generations}
          trainingRuns={trainingRuns}
          onSelectGeneration={(id) => setSelected({ type: "generation", id })}
          onSelectRun={(id) => setSelected({ type: "run", id })}
          compareMode={compareMode && compareTarget === "generation"}
          compareSelection={compareSelection}
          onToggleCompareSelection={toggleCompareSelection}
        />
      );
  }

  return (
    <div className="flex flex-col gap-6">
      <ExperimentHeader
        experiment={experiment}
        generations={generations.map((g) => g.generation)}
        trainingRuns={trainingRuns}
        activeTab={activeTab}
        onOpenReproduction={() => setTab("reproduction")}
        compareMode={compareMode}
        compareTarget={compareTarget}
        compareCount={compareSelection.size}
        onStartCompare={() => {
          const target = activeTab === "runs" ? "trainingRun" : "generation";
          setCompareTarget(target);
          setCompareMode(true);
          setCompareSelection(new Set());
          if (target === "generation") setTab("overview");
        }}
        onCancelCompare={() => {
          setCompareMode(false);
          setCompareSelection(new Set());
        }}
        onConfirmCompare={() => {
          const ids = Array.from(compareSelection).join(",");
          const path = compareTarget === "trainingRun" ? "/dashboard/compare/runs" : "/dashboard/compare";
          router.push(`${path}?ids=${ids}`);
        }}
      />
      <Tabs tabs={TABS} />
      <ResearchWorkspace
        canvas={
          <div key={activeTab} className="research-fade-in">
            {canvas}
          </div>
        }
        inspector={
          inspector ? (
            <div key={serializeSelectedEntity(selected) ?? "none"} className="research-fade-in">
              {inspector}
            </div>
          ) : null
        }
        inspectorTitle={inspectorTitle}
      />
    </div>
  );
}
