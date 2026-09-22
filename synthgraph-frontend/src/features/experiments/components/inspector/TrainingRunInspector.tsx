"use client";

import dynamic from "next/dynamic";
import { CaptureStatusBadge } from "@/features/training-runs/components/CaptureStatusBadge";
import { CaptureStatusControl } from "@/features/training-runs/components/CaptureStatusControl";
import { TrainingRunStatusBadge } from "@/features/training-runs/components/TrainingRunStatusBadge";
import { TrainingRunStatusControl } from "@/features/training-runs/components/TrainingRunStatusControl";
import { formatDateTime } from "@/shared/lib/format";
import { KeyValueList } from "@/shared/ui/KeyValueList";
import type { EnrichedTrainingRun } from "../../types/experiment-workspace";

const MetricsLineChart = dynamic(
  () => import("@/shared/charts/MetricsLineChart").then((m) => m.MetricsLineChart),
  { ssr: false, loading: () => <div className="h-[200px] animate-pulse rounded-lg bg-research-subtle" /> },
);

export function TrainingRunInspector({
  enriched,
  onSelectEvaluation,
}: {
  enriched: EnrichedTrainingRun;
  onSelectEvaluation: (id: string) => void;
}) {
  const { run, metrics, evaluations } = enriched;

  return (
    <div className="flex flex-col gap-6 p-5">
      <div>
        <p className="mono-label text-research-ink-muted">Training run</p>
        <h3 className="mt-1 text-[16px] font-medium text-research-ink">{run.name}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <TrainingRunStatusBadge status={run.status} />
          <CaptureStatusBadge status={run.captureStatus?.status ?? null} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <TrainingRunStatusControl trainingRunId={run.id} status={run.status} />
        <CaptureStatusControl trainingRunId={run.id} current={run.captureStatus} />
      </div>

      <KeyValueList
        rows={[
          { label: "Trainer", value: run.trainer.name },
          ...(run.trainer.version ? [{ label: "Version", value: run.trainer.version }] : []),
          { label: "Created", value: formatDateTime(run.createdAt) },
          ...(run.startedAt ? [{ label: "Started", value: formatDateTime(run.startedAt) }] : []),
          ...(run.completedAt ? [{ label: "Completed", value: formatDateTime(run.completedAt) }] : []),
        ]}
      />

      <div>
        <p className="mono-label mb-2 text-research-ink-muted">Configuration</p>
        <KeyValueList
          rows={Object.entries(run.parameters).map(([key, value]) => ({
            label: key,
            value: typeof value === "object" ? JSON.stringify(value) : String(value),
          }))}
          raw={run.parameters}
        />
      </div>

      {metrics.length > 0 ? (
        <div>
          <p className="mono-label mb-2 text-research-ink-muted">Metrics</p>
          <MetricsLineChart metrics={metrics} />
        </div>
      ) : null}

      {run.datasets && run.datasets.length > 0 ? (
        <div>
          <p className="mono-label mb-2 text-research-ink-muted">Datasets ({run.datasets.length})</p>
          <ul className="flex flex-col gap-1.5">
            {run.datasets.map((version) => (
              <li key={version.id} className="rounded-md border border-research-border bg-research-subtle/40 p-2.5">
                <p className="text-[13px] text-research-ink">{version.version}</p>
                <p className="truncate font-mono text-[10.5px] text-research-ink-muted">{version.uri}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <p className="mono-label mb-2 text-research-ink-muted">Evaluations ({evaluations.length})</p>
        {evaluations.length === 0 ? (
          <p className="text-[13px] text-research-ink-muted">None yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {evaluations.map((evaluation) => (
              <li key={evaluation.id}>
                <button
                  type="button"
                  onClick={() => onSelectEvaluation(evaluation.id)}
                  className="w-full rounded-md border border-research-border bg-research-subtle/40 p-2.5 text-left transition-colors hover:border-research-accent-subtle"
                >
                  <p className="text-[13px] text-research-ink">{evaluation.name ?? evaluation.id}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
