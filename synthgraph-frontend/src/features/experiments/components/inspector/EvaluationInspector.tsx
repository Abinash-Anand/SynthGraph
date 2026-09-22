import type { EvaluationResult } from "@/features/evaluation-results/types/evaluation-result";
import { formatDateTime } from "@/shared/lib/format";
import { KeyValueList } from "@/shared/ui/KeyValueList";

export function EvaluationInspector({
  evaluation,
  trainingRunName,
  onSelectRun,
}: {
  evaluation: EvaluationResult;
  trainingRunName: string;
  onSelectRun: () => void;
}) {
  return (
    <div className="flex flex-col gap-6 p-5">
      <div>
        <p className="mono-label text-research-ink-muted">Evaluation</p>
        <h3 className="mt-1 text-[16px] font-medium text-research-ink">
          {evaluation.name ?? "Untitled evaluation"}
        </h3>
      </div>

      <KeyValueList
        rows={[
          { label: "Created", value: formatDateTime(evaluation.createdAt) },
          { label: "Dataset version", value: evaluation.datasetVersionId },
        ]}
      />

      <div>
        <p className="mono-label mb-2 text-research-ink-muted">Metrics</p>
        <KeyValueList
          rows={Object.entries(evaluation.metrics).map(([key, value]) => ({
            label: key,
            value: typeof value === "object" ? JSON.stringify(value) : String(value),
          }))}
          raw={evaluation.metrics}
        />
      </div>

      <button
        type="button"
        onClick={onSelectRun}
        className="text-left text-[13px] text-research-accent-hover underline underline-offset-2"
      >
        View training run: {trainingRunName} →
      </button>
    </div>
  );
}
