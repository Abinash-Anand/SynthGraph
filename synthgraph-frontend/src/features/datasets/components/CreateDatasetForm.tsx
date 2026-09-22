"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { JsonField, TextArea, TextField } from "@/components/ui/Field";
import {
  createDatasetSchema,
  type CreateDatasetFieldErrors,
  type CreateDatasetInput,
} from "@/features/datasets/schemas/dataset-schemas";
import type { Dataset } from "@/features/datasets/types/dataset";
import { toFieldErrors } from "@/shared/lib/validation";

type Status = "idle" | "submitting" | "error";

const EMPTY: CreateDatasetInput = { name: "", description: "", metadata: "" };

type CreateResponse = { ok: boolean; error?: string; fields?: CreateDatasetFieldErrors; dataset?: Dataset };

export function CreateDatasetForm() {
  const router = useRouter();
  const [values, setValues] = useState<CreateDatasetInput>(EMPTY);
  const [errors, setErrors] = useState<CreateDatasetFieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof CreateDatasetInput>(key: K) => (value: CreateDatasetInput[K]) => {
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

    const parsed = createDatasetSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      setStatus("error");
      setFormError("Check the highlighted fields.");
      return;
    }

    setStatus("submitting");
    try {
      // Send the raw pre-transform values, not `parsed.data` — the Route
      // Handler re-validates with the same schema and does the one
      // JSON-string→object transform; sending an already-transformed
      // object here would fail that re-validation (it expects a string).
      const response = await fetch("/api/datasets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = (await response.json()) as CreateResponse;

      if (!response.ok || !body.ok || !body.dataset) {
        setErrors(body.fields ?? {});
        setFormError(body.error ?? "Could not create the dataset. Please try again.");
        setStatus("error");
        return;
      }

      router.push(`/dashboard/datasets/${body.dataset.id}`);
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
      <JsonField
        label="Metadata"
        hint="Optional JSON object."
        value={values.metadata ?? ""}
        onChange={set("metadata")}
        error={errors.metadata}
      />

      <Button type="submit" size="lg" disabled={status === "submitting"} className="self-start">
        {status === "submitting" ? "Creating…" : "Create dataset"}
      </Button>
    </form>
  );
}
