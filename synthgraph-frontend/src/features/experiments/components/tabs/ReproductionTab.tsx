"use client";

import { useMemo, useState } from "react";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { cn } from "@/lib/utils";
import type { Experiment } from "@/features/experiments/types/experiment";
import type { ClassifiedField } from "@/features/reproduction/types/reproduction-manifest";
import { KeyValueList, type KeyValueRow } from "@/shared/ui/KeyValueList";
import { buildProvenanceMarkdown, reportFilename } from "../../provenance-report";
import {
  assessReproducibility,
  compareByRisk,
  GRADE_LABEL,
  type ReproAssessment,
  type ReproGrade,
  summarizeReproducibility,
} from "../../reproducibility-model";
import type { EnrichedGeneration, EnrichedTrainingRun } from "../../types/experiment-workspace";

function toRows(fields: ClassifiedField[]): KeyValueRow[] {
  return fields.map((field) => ({ label: field.field, value: field.value }));
}

function FieldGroup({ title, fields, tone }: { title: string; fields: ClassifiedField[]; tone: string }) {
  if (fields.length === 0) return null;
  return (
    <div>
      <p className={cn("mono-label mb-2", tone)}>{title}</p>
      <KeyValueList rows={toRows(fields)} />
    </div>
  );
}

const GRADE_TONE: Record<ReproGrade, string> = {
  reproducible: "border-research-success/50 text-research-success",
  mostly: "border-research-info/50 text-research-info",
  partial: "border-research-warning/50 text-research-warning",
  unknown: "border-research-border text-research-ink-muted",
};

function GradeChip({ assessment }: { assessment: ReproAssessment }) {
  return (
    <span className={cn("shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10.5px]", GRADE_TONE[assessment.grade])}>
      {GRADE_LABEL[assessment.grade]}
      {assessment.score !== null ? ` · ${Math.round(assessment.score * 100)}% recorded` : ""}
      {assessment.grade !== "reproducible" && assessment.blockerTags.length > 0
        ? ` · ${assessment.blockerTags.join(", ")}`
        : ""}
    </span>
  );
}

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ReproductionTab({
  generations,
  experiment,
  runs,
}: {
  generations: EnrichedGeneration[];
  experiment: Experiment;
  runs: EnrichedTrainingRun[];
}) {
  const assessed = useMemo(
    () =>
      generations
        .map((enriched) => ({
          enriched,
          assessment: assessReproducibility(
            enriched.manifest?.classification,
            enriched.manifest?.generation.reproducibility ?? enriched.generation.reproducibility,
          ),
        }))
        .sort((a, b) => compareByRisk(a.assessment, b.assessment)),
    [generations],
  );
  const summary = useMemo(() => summarizeReproducibility(assessed.map((a) => a.assessment)), [assessed]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  if (generations.length === 0) {
    return <p className="text-[13.5px] text-research-ink-muted">No generations yet.</p>;
  }

  const active = assessed.find((a) => a.enriched.generation.id === selectedId) ?? assessed[0];
  const { generation, manifest } = active.enriched;
  const { known, supplied, missing, external } = manifest?.classification ?? {
    known: [],
    supplied: [],
    missing: [],
    external: [],
  };

  const reportInput = () => ({
    generatedAt: new Date().toISOString(),
    experiment: { id: experiment.id, name: experiment.name, description: experiment.description },
    generations: assessed.map(({ enriched, assessment }) => ({
      id: enriched.generation.id,
      name: enriched.generation.name,
      status: enriched.generation.status,
      generatorName: enriched.generation.generator.name,
      generatorVersion: enriched.generation.generator.version,
      createdAt: enriched.generation.created_at,
      inputCount: enriched.generation.inputs.length,
      outputCount: enriched.generation.outputs.length,
      assessment,
    })),
    runs: runs.map((r) => ({
      id: r.run.id,
      name: r.run.name,
      status: r.run.status,
      trainerName: r.run.trainer.name,
      trainerVersion: r.run.trainer.version,
      captureStatus: r.run.captureStatus?.status ?? null,
      datasetVersions: (r.run.datasets ?? []).map((d) => d.version),
      evaluationCount: r.evaluations.length,
    })),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-xl border border-research-border bg-research-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-medium text-research-ink">Can this experiment be rebuilt?</h2>
            <p className="mt-1 max-w-[62ch] text-[13px] text-research-ink-muted">
              Based on what was recorded for each generation: its seed, code version, environment and inputs. This
              checks what was captured, not that the data or code still exist.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                download(reportFilename(experiment.name, "md"), buildProvenanceMarkdown(reportInput()), "text/markdown")
              }
              className="rounded-md border border-research-border bg-research-panel px-3 py-1.5 text-[12.5px] text-research-ink transition-colors hover:border-research-accent-subtle"
            >
              Download report (.md)
            </button>
            <button
              type="button"
              onClick={() =>
                download(
                  reportFilename(experiment.name, "json"),
                  JSON.stringify(reportInput(), null, 2),
                  "application/json",
                )
              }
              className="rounded-md border border-research-border bg-research-panel px-3 py-1.5 text-[12.5px] text-research-ink-muted transition-colors hover:border-research-accent-subtle hover:text-research-ink"
            >
              .json
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["reproducible", "mostly", "partial", "unknown"] as const).map((grade) =>
            summary.byGrade[grade] > 0 ? (
              <span
                key={grade}
                className={cn("rounded-full border px-2.5 py-1 font-mono text-[11px]", GRADE_TONE[grade])}
              >
                {summary.byGrade[grade]} {GRADE_LABEL[grade].toLowerCase()}
              </span>
            ) : null,
          )}
          {summary.averageScore !== null ? (
            <span className="rounded-full border border-research-border px-2.5 py-1 font-mono text-[11px] text-research-ink-muted">
              {Math.round(summary.averageScore * 100)}% of fields recorded on average
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-2">
          <p className="mono-label text-research-ink-muted">Generations, weakest first</p>
          <ul className="flex max-h-[520px] flex-col gap-1.5 overflow-y-auto pr-1">
            {assessed.map(({ enriched, assessment }) => {
              const isActive = enriched.generation.id === generation.id;
              return (
                <li key={enriched.generation.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(enriched.generation.id)}
                    aria-pressed={isActive}
                    className={cn(
                      "flex w-full flex-col items-start gap-1.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                      isActive
                        ? "border-research-accent bg-research-accent-subtle/10"
                        : "border-research-border hover:border-research-accent-subtle",
                    )}
                  >
                    <span className="w-full truncate text-[13px] text-research-ink">{enriched.generation.name}</span>
                    <GradeChip assessment={assessment} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-[15px] font-medium text-research-ink">{generation.name}</h3>
            <GradeChip assessment={active.assessment} />
          </div>

          {!manifest ? (
            <p className="text-[13.5px] text-research-error">
              Unavailable — this generation&rsquo;s reproduction manifest could not be loaded.
            </p>
          ) : (
            <div className="flex flex-col gap-5 rounded-xl border border-research-border bg-research-panel p-5">
              {active.assessment.blockers.length > 0 ? (
                <div className="rounded-lg border border-research-warning/40 bg-research-warning/[0.06] p-3">
                  <p className="mono-label mb-1.5 text-research-warning">Blocks an exact rebuild</p>
                  <ul className="flex flex-col gap-1 text-[13px] text-research-ink-secondary">
                    {active.assessment.blockers.map((blocker) => (
                      <li key={blocker}>{blocker}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {active.assessment.notes.length > 0 ? (
                <ul className="flex flex-col gap-1 text-[12.5px] text-research-ink-muted">
                  {active.assessment.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              ) : null}

              <FieldGroup title="Known" fields={known} tone="text-research-success" />
              <FieldGroup title="Supplied" fields={supplied} tone="text-research-info" />
              <FieldGroup title="External" fields={external} tone="text-research-accent-hover" />
              {missing.length > 0 ? (
                <div>
                  <p className="mono-label mb-2 text-research-warning">Missing</p>
                  <p className="text-[13px] text-research-ink-muted">{missing.join(", ")}</p>
                </div>
              ) : null}

              <div>
                <button
                  type="button"
                  onClick={() => setShowRaw((v) => !v)}
                  className="font-mono text-[11px] tracking-[0.08em] text-research-ink-muted uppercase transition-colors hover:text-research-accent-hover"
                >
                  {showRaw ? "Hide raw manifest" : "View raw manifest"}
                </button>
                {showRaw ? (
                  <div className="mt-2">
                    <CodeBlock language="json" code={JSON.stringify(manifest, null, 2)} />
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
