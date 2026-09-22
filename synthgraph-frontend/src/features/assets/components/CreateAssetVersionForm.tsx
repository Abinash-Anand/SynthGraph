"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { JsonField, TextField } from "@/components/ui/Field";
import {
  createAssetVersionSchema,
  type CreateAssetVersionFieldErrors,
  type CreateAssetVersionInput,
} from "@/features/assets/schemas/asset-schemas";
import { toFieldErrors } from "@/shared/lib/validation";

type Status = "idle" | "submitting" | "error";

const EMPTY: CreateAssetVersionInput = { version: "", uri: "", size: "", checksum: "", metadata: "" };

type CreateResponse = { ok: boolean; error?: string; fields?: CreateAssetVersionFieldErrors };

export function CreateAssetVersionForm({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<CreateAssetVersionInput>(EMPTY);
  const [errors, setErrors] = useState<CreateAssetVersionFieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof CreateAssetVersionInput>(key: K) => (value: CreateAssetVersionInput[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Add version
      </Button>
    );
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const parsed = createAssetVersionSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      setStatus("error");
      setFormError("Check the highlighted fields.");
      return;
    }

    setStatus("submitting");
    try {
      const response = await fetch(`/api/assets/${assetId}/versions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = (await response.json()) as CreateResponse;

      if (!response.ok || !body.ok) {
        setErrors(body.fields ?? {});
        setFormError(body.error ?? "Could not create the version. Please try again.");
        setStatus("error");
        return;
      }

      setOpen(false);
      setValues(EMPTY);
      router.refresh();
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
      setStatus("error");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-lg border border-line bg-surface/40 p-4"
    >
      {formError ? (
        <div
          role="alert"
          className="rounded-lg border border-bad/40 bg-bad/[0.05] p-3 text-[13.5px] text-ink"
        >
          {formError}
        </div>
      ) : null}

      <TextField label="Version" required value={values.version} onChange={set("version")} error={errors.version} />
      <TextField label="URI" required value={values.uri} onChange={set("uri")} error={errors.uri} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Size (bytes)" value={values.size ?? ""} onChange={set("size")} error={errors.size} />
        <TextField label="Checksum" value={values.checksum ?? ""} onChange={set("checksum")} error={errors.checksum} />
      </div>
      <JsonField
        label="Metadata"
        hint="Optional JSON object."
        value={values.metadata ?? ""}
        onChange={set("metadata")}
        error={errors.metadata}
      />

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={status === "submitting"}>
          {status === "submitting" ? "Adding…" : "Add version"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
