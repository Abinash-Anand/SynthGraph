"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { JsonField, TextArea, TextField } from "@/components/ui/Field";
import {
  createAssetSchema,
  type CreateAssetFieldErrors,
  type CreateAssetInput,
} from "@/features/assets/schemas/asset-schemas";
import type { Asset } from "@/features/assets/types/asset";
import { toFieldErrors } from "@/shared/lib/validation";

type Status = "idle" | "submitting" | "error";

const EMPTY: CreateAssetInput = { name: "", type: "", description: "", metadata: "" };

type CreateResponse = { ok: boolean; error?: string; fields?: CreateAssetFieldErrors; asset?: Asset };

export function CreateAssetForm() {
  const router = useRouter();
  const [values, setValues] = useState<CreateAssetInput>(EMPTY);
  const [errors, setErrors] = useState<CreateAssetFieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof CreateAssetInput>(key: K) => (value: CreateAssetInput[K]) => {
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

    const parsed = createAssetSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      setStatus("error");
      setFormError("Check the highlighted fields.");
      return;
    }

    setStatus("submitting");
    try {
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = (await response.json()) as CreateResponse;

      if (!response.ok || !body.ok || !body.asset) {
        setErrors(body.fields ?? {});
        setFormError(body.error ?? "Could not create the asset. Please try again.");
        setStatus("error");
        return;
      }

      router.push(`/dashboard/assets/${body.asset.id}`);
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
      <TextField
        label="Type"
        value={values.type ?? ""}
        onChange={set("type")}
        error={errors.type}
        placeholder="e.g. 3d-model, texture, hdri"
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
        {status === "submitting" ? "Creating…" : "Create asset"}
      </Button>
    </form>
  );
}
