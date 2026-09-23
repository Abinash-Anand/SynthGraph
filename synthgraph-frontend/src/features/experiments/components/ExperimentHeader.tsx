"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  updateExperimentSchema,
  type UpdateExperimentFieldErrors,
  type UpdateExperimentRequest,
} from "@/features/experiments/schemas/experiment-schemas";
import type { Experiment } from "@/features/experiments/types/experiment";
import type { Generation } from "@/features/generations/types/generation";
import { formatDateTime } from "@/shared/lib/format";
import { toFieldErrors } from "@/shared/lib/validation";
import type { EnrichedTrainingRun } from "../types/experiment-workspace";

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const secondaryButtonClass =
  "rounded-md border border-research-border bg-research-panel px-3.5 py-2 text-[13px] font-medium text-research-ink transition-colors hover:border-research-accent-subtle";
const accentButtonClass =
  "rounded-md bg-research-accent px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-research-accent-hover disabled:cursor-not-allowed disabled:opacity-40";
const inputClass =
  "w-full rounded-md border border-research-border bg-research-panel px-3.5 py-2.5 text-[14.5px] text-research-ink placeholder:text-research-ink-muted focus:border-research-accent-subtle focus:outline-none";

type EntityMode = "view" | "editing" | "archiving";
type UpdateResponse = {
  ok: boolean;
  error?: string;
  fields?: UpdateExperimentFieldErrors;
  experiment?: Experiment;
};

export function ExperimentHeader({
  experiment: initialExperiment,
  generations,
  trainingRuns,
  activeTab,
  onOpenReproduction,
  compareMode,
  compareTarget,
  compareCount,
  onStartCompare,
  onCancelCompare,
  onConfirmCompare,
}: {
  experiment: Experiment;
  generations: Generation[];
  trainingRuns: EnrichedTrainingRun[];
  /** Decides what "Compare" offers to compare: training runs when already
   * on the Runs tab, generations everywhere else (matching where each
   * entity's own picker lives). */
  activeTab: string;
  onOpenReproduction: () => void;
  compareMode: boolean;
  compareTarget: "generation" | "trainingRun";
  compareCount: number;
  onStartCompare: () => void;
  onCancelCompare: () => void;
  onConfirmCompare: () => void;
}) {
  const router = useRouter();
  const [experiment, setExperiment] = useState(initialExperiment);
  const [entityMode, setEntityMode] = useState<EntityMode>("view");
  const [values, setValues] = useState<UpdateExperimentRequest>({
    name: experiment.name,
    description: experiment.description ?? "",
  });
  const [errors, setErrors] = useState<UpdateExperimentFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const completed = trainingRuns.filter((r) => r.run.status === "completed").length;
  const canCompare = activeTab === "runs" ? trainingRuns.length >= 2 : generations.length >= 2;

  const set = <K extends keyof UpdateExperimentRequest>(key: K) => (value: UpdateExperimentRequest[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const startEditing = () => {
    setValues({ name: experiment.name, description: experiment.description ?? "" });
    setErrors({});
    setFormError(null);
    setEntityMode("editing");
  };

  const onSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const parsed = updateExperimentSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      setFormError("Check the highlighted fields.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch(`/api/experiments/${experiment.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: parsed.data.name,
          description: parsed.data.description || undefined,
        }),
      });
      const body = (await response.json()) as UpdateResponse;

      if (!response.ok || !body.ok || !body.experiment) {
        setErrors(body.fields ?? {});
        setFormError(body.error ?? "Could not update the experiment. Please try again.");
        return;
      }

      setExperiment(body.experiment);
      setEntityMode("view");
      router.refresh();
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  };

  const onArchive = async () => {
    setPending(true);
    try {
      const response = await fetch(`/api/experiments/${experiment.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setFormError(body?.error ?? "Could not archive the experiment. Please try again.");
        setPending(false);
        return;
      }
      router.push(`/dashboard/projects/${experiment.projectId}`);
      router.refresh();
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
      setPending(false);
    }
  };

  if (entityMode === "editing") {
    return (
      <div className="border-b border-research-border pb-5">
        <form onSubmit={onSave} noValidate className="flex flex-col gap-3">
          {formError ? (
            <p className="text-[13px] text-bad" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] text-research-ink-muted" htmlFor="experiment-name">
              Name
            </label>
            <input
              id="experiment-name"
              className={inputClass}
              value={values.name ?? ""}
              onChange={(event) => set("name")(event.target.value)}
            />
            {errors.name ? <p className="text-[12px] text-bad">{errors.name}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] text-research-ink-muted" htmlFor="experiment-description">
              Description
            </label>
            <textarea
              id="experiment-description"
              rows={3}
              className={inputClass}
              value={values.description ?? ""}
              onChange={(event) => set("description")(event.target.value)}
            />
            {errors.description ? <p className="text-[12px] text-bad">{errors.description}</p> : null}
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={accentButtonClass}>
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setEntityMode("view")}
              className={secondaryButtonClass}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-b border-research-border pb-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-medium tracking-[-0.01em] text-research-ink">
            {experiment.name}
          </h1>
          {experiment.description ? (
            <p className="mt-1 text-[14px] text-research-ink-secondary">{experiment.description}</p>
          ) : null}
        </div>

        <div className="flex gap-2">
          {entityMode === "archiving" ? (
            <>
              <span className="self-center text-[13px] text-research-ink-muted">
                Archive this experiment?
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => setEntityMode("view")}
                className={secondaryButtonClass}
              >
                Cancel
              </button>
              <button type="button" disabled={pending} onClick={onArchive} className={accentButtonClass}>
                {pending ? "Archiving…" : "Confirm"}
              </button>
            </>
          ) : compareMode ? (
            <>
              <button
                type="button"
                onClick={onCancelCompare}
                className="rounded-md border border-research-border bg-research-panel px-3.5 py-2 text-[13px] font-medium text-research-ink transition-colors hover:border-research-accent-subtle"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={compareCount < 2}
                onClick={onConfirmCompare}
                className="rounded-md bg-research-accent px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-research-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                Compare ({compareCount})
              </button>
            </>
          ) : (
            <>
              {canCompare ? (
                <button
                  type="button"
                  onClick={onStartCompare}
                  className="rounded-md border border-research-border bg-research-panel px-3.5 py-2 text-[13px] font-medium text-research-ink transition-colors hover:border-research-accent-subtle"
                >
                  Compare
                </button>
              ) : null}
              <button
                type="button"
                onClick={onOpenReproduction}
                className="rounded-md border border-research-border bg-research-panel px-3.5 py-2 text-[13px] font-medium text-research-ink transition-colors hover:border-research-accent-subtle"
              >
                Reproduce
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadJson(`${experiment.name.replace(/\s+/g, "-").toLowerCase()}.json`, {
                    experiment,
                    generations,
                    trainingRuns: trainingRuns.map((r) => r.run),
                  })
                }
                className="rounded-md bg-research-accent px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-research-accent-hover"
              >
                Export
              </button>
              <button type="button" onClick={startEditing} className={secondaryButtonClass}>
                Rename
              </button>
              <button
                type="button"
                onClick={() => setEntityMode("archiving")}
                className={secondaryButtonClass}
              >
                Archive
              </button>
            </>
          )}
        </div>
      </div>

      {compareMode ? (
        <p className="text-[13px] text-research-accent-hover">
          {compareTarget === "trainingRun"
            ? "Select 2–10 training runs on the Runs tab, then confirm above."
            : "Select 2–10 generations on the Overview tab, then confirm above."}
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11.5px] text-research-ink-muted">
          <span>{generations.length} generations</span>
          <span>
            {completed}/{trainingRuns.length} runs completed
          </span>
          <span>Created {formatDateTime(experiment.createdAt)}</span>
        </div>
      )}
    </div>
  );
}
