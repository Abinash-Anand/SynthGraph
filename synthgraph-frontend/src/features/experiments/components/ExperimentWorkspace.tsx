"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import type { Experiment } from "@/features/experiments/types/experiment";
import type { ParameterCorrelationReport } from "@/features/reports/types/report";
import { WorkspaceTourAutoStart } from "@/features/onboarding/components/WorkspaceTourAutoStart";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { pushSearchParams } from "@/shared/lib/shallow-url";
import { ResearchWorkspace } from "@/shared/layout/ResearchWorkspace";
import { Tabs } from "@/shared/ui/Tabs";
import type { EnrichedGeneration, EnrichedTrainingRun, SelectedEntity } from "../types/experiment-workspace";
import { findParentGeneration, parseSelectedEntity, serializeSelectedEntity } from "../types/experiment-workspace";
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
  workspaceTourDue = false,
}: {
  workspaceTourDue?: boolean;
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
  const reducedMotion = useReducedMotion();

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
      pushSearchParams(next);
    },
    [searchParams],
  );

  const setTab = useCallback(
    (tab: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("tab", tab);
      pushSearchParams(next);
    },
    [searchParams],
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
    const parentGeneration = findParentGeneration(selectedGeneration, generations);
    inspector = (
      <GenerationInspector
        enriched={selectedGeneration}
        projectId={projectId}
        experimentId={experimentId}
        onCompareWithParent={
          parentGeneration
            ? () => router.push(`/dashboard/compare?ids=${parentGeneration.generation.id},${selectedGeneration.generation.id}`)
            : undefined
        }
      />
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
          metricDirections={correlationReport.metricDirections ?? {}}
          // An evaluation belongs to a run, so selecting one anywhere
          // (e.g. in Lineage) must put this tab on that run - otherwise the
          // chart shows one run while the inspector describes another's.
          selectedRunId={
            selected?.type === "run" ? selected.id : (selectedEvaluationRun?.run.id ?? null)
          }
          onSelectRun={(id) => setSelected({ type: "run", id })}
        />
      );
      break;
    case "parameters":
      canvas = <ParametersTab runs={trainingRuns} correlationReport={correlationReport} />;
      break;
    case "reproduction":
      canvas = <ReproductionTab generations={generations} experiment={experiment} runs={trainingRuns} />;
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
      <WorkspaceTourAutoStart due={workspaceTourDue} />
      <div data-tour="ws-tabs">
        <Tabs tabs={TABS} />
      </div>
      <ResearchWorkspace
        canvas={
          // The outgoing tab is dropped at once and only the incoming one
          // fades in: waiting out an exit animation first put a fixed
          // ~200 ms between every click and the new content.
          <AnimatePresence initial={false}>
            <motion.div
              key={activeTab}
              initial={reducedMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
            >
              {canvas}
            </motion.div>
          </AnimatePresence>
        }
        inspector={
          inspector ? (
            <AnimatePresence initial={false}>
              <motion.div
                key={serializeSelectedEntity(selected) ?? "none"}
                initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
              >
                {inspector}
              </motion.div>
            </AnimatePresence>
          ) : null
        }
        inspectorTitle={inspectorTitle}
        inspectorKey={serializeSelectedEntity(selected) ?? "none"}
      />
    </div>
  );
}
