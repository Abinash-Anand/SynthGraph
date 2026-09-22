"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea, TextField } from "@/components/ui/Field";
import {
  createExperimentSchema,
  type CreateExperimentFieldErrors,
  type CreateExperimentRequest,
} from "@/features/experiments/schemas/experiment-schemas";
import type { Experiment } from "@/features/experiments/types/experiment";
import { toFieldErrors } from "@/shared/lib/validation";

type Status = "idle" | "submitting" | "error";

const EMPTY: CreateExperimentRequest = { name: "", description: "" };

type CreateResponse = {
  ok: boolean;
  error?: string;
  fields?: CreateExperimentFieldErrors;
  experiment?: Experiment;
};

export function CreateExperimentForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [values, setValues] = useState<CreateExperimentRequest>(EMPTY);
  const [errors, setErrors] = useState<CreateExperimentFieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof CreateExperimentRequest>(key: K) => (value: CreateExperimentRequest[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const parsed = createExperimentSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      setStatus("error");
      setFormError("Check the highlighted fields.");
      return;
    }

    setStatus("submitting");
    try {
      const response = await fetch(`/api/projects/${projectId}/experiments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: parsed.data.name,
          description: parsed.data.description || undefined,
        }),
      });
      const body = (await response.json()) as CreateResponse;

      if (!response.ok || !body.ok || !body.experiment) {
        setErrors(body.fields ?? {});
        setFormError(body.error ?? "Could not create the experiment. Please try again.");
        setStatus("error");
        return;
      }

      router.push(`/dashboard/projects/${projectId}/experiments/${body.experiment.id}`);
      router.refresh();
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
      setStatus("error");
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {formError ? (
        <div
          role="alert"
          className="rounded-lg border border-bad/40 bg-bad/[0.05] p-4 text-[14px] text-ink"
        >
          {formError}
        </div>
      ) : null}

      <TextField
        label="Name"
        required
        value={values.name}
        onChange={set("name")}
        error={errors.name}
      />
      <TextArea
        label="Description"
        value={values.description ?? ""}
        onChange={set("description")}
        error={errors.description}
      />

      <Button type="submit" size="lg" disabled={status === "submitting"} className="self-start">
        {status === "submitting" ? "Creating…" : "Create experiment"}
      </Button>
    </form>
  );
}
