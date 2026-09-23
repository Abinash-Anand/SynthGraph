"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea, TextField } from "@/components/ui/Field";
import {
  updateAssetSchema,
  type UpdateAssetFieldErrors,
  type UpdateAssetRequest,
} from "@/features/assets/schemas/asset-schemas";
import type { Asset } from "@/features/assets/types/asset";
import { formatDate } from "@/shared/lib/format";
import { toFieldErrors } from "@/shared/lib/validation";
import { ResearchBadge } from "@/shared/ui/ResearchBadge";

type Mode = "view" | "editing" | "archiving";

type UpdateResponse = { ok: boolean; error?: string; fields?: UpdateAssetFieldErrors; asset?: Asset };

export function AssetDetailHeader({ asset: initialAsset }: { asset: Asset }) {
  const router = useRouter();
  const [asset, setAsset] = useState(initialAsset);
  const [mode, setMode] = useState<Mode>("view");
  const [values, setValues] = useState<UpdateAssetRequest>({
    name: asset.name,
    description: asset.description ?? "",
  });
  const [errors, setErrors] = useState<UpdateAssetFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const set = <K extends keyof UpdateAssetRequest>(key: K) => (value: UpdateAssetRequest[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const startEditing = () => {
    setValues({ name: asset.name, description: asset.description ?? "" });
    setErrors({});
    setFormError(null);
    setMode("editing");
  };

  const onSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const parsed = updateAssetSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      setFormError("Check the highlighted fields.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: parsed.data.name,
          description: parsed.data.description || undefined,
        }),
      });
      const body = (await response.json()) as UpdateResponse;

      if (!response.ok || !body.ok || !body.asset) {
        setErrors(body.fields ?? {});
        setFormError(body.error ?? "Could not update the asset. Please try again.");
        return;
      }

      setAsset(body.asset);
      setMode("view");
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
      const response = await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setFormError(body?.error ?? "Could not archive the asset. Please try again.");
        setPending(false);
        return;
      }
      router.push("/dashboard/assets");
      router.refresh();
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
      setPending(false);
    }
  };

  if (mode === "editing") {
    return (
      <form onSubmit={onSave} noValidate className="flex flex-col gap-4">
        {formError ? (
          <div role="alert" className="rounded-lg border border-bad/40 bg-bad/[0.05] p-3 text-[13.5px] text-ink">
            {formError}
          </div>
        ) : null}
        <TextField label="Name" required value={values.name ?? ""} onChange={set("name")} error={errors.name} />
        <TextArea
          label="Description"
          value={values.description ?? ""}
          onChange={set("description")}
          error={errors.description}
        />
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setMode("view")} disabled={pending}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[22px] font-medium tracking-[-0.01em] text-research-ink">{asset.name}</h1>
            {asset.type ? <ResearchBadge>{asset.type}</ResearchBadge> : null}
          </div>
          {asset.description ? (
            <p className="mt-1 text-[14px] text-research-ink-muted">{asset.description}</p>
          ) : null}
          <p className="mt-2 font-mono text-[11px] text-research-ink-muted">
            Created {formatDate(asset.createdAt)}
          </p>
        </div>

        {mode === "archiving" ? (
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-research-ink-muted">Archive this asset?</span>
            <Button size="sm" variant="secondary" onClick={() => setMode("view")} disabled={pending}>
              Cancel
            </Button>
            <Button size="sm" onClick={onArchive} disabled={pending}>
              {pending ? "Archiving…" : "Confirm"}
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={startEditing}>
              Rename
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode("archiving")}>
              Archive
            </Button>
          </div>
        )}
      </div>
      {mode === "view" && formError ? (
        <div role="alert" className="mt-3 rounded-lg border border-bad/40 bg-bad/[0.05] p-3 text-[13.5px] text-ink">
          {formError}
        </div>
      ) : null}
    </div>
  );
}
