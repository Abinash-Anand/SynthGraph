"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import type { CaptureIntegration, CaptureStatus, CaptureStatusValue } from "../types/training-run";

const STATUS_OPTIONS: CaptureStatusValue[] = ["complete", "partial", "unknown"];

type IntegrationRow = { name: string; attached: boolean; closed: boolean };

function toRows(integrations: Record<string, CaptureIntegration>): IntegrationRow[] {
  return Object.entries(integrations).map(([name, value]) => ({ name, ...value }));
}

function toIntegrations(rows: IntegrationRow[]): Record<string, CaptureIntegration> {
  const result: Record<string, CaptureIntegration> = {};
  for (const row of rows) {
    if (!row.name.trim()) continue;
    result[row.name.trim()] = { attached: row.attached, closed: row.closed };
  }
  return result;
}

export function CaptureStatusControl({
  trainingRunId,
  current,
}: {
  trainingRunId: string;
  current: CaptureStatus | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<CaptureStatusValue>(current?.status ?? "unknown");
  const [rows, setRows] = useState<IntegrationRow[]>(
    current ? toRows(current.integrations) : [],
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Update capture status
      </Button>
    );
  }

  const addRow = () => setRows((current) => [...current, { name: "", attached: false, closed: false }]);
  const removeRow = (index: number) => setRows((current) => current.filter((_, i) => i !== index));
  const updateRow = (index: number, patch: Partial<IntegrationRow>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const onSubmit = async () => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/training-runs/${trainingRunId}/capture-status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, integrations: toIntegrations(rows) }),
      });
      const body = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !body.ok) {
        setError(body.error ?? "Could not update capture status.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface/40 p-4">
      {error ? <p className="text-[13px] text-bad">{error}</p> : null}

      <SelectField
        label="Status"
        value={status}
        onChange={(value) => setStatus(value as CaptureStatusValue)}
        options={STATUS_OPTIONS}
      />

      <div className="flex flex-col gap-2">
        <p className="text-[13.5px] text-ink">Integrations</p>
        {rows.map((row, index) => (
          <div key={index} className="flex items-end gap-3">
            <div className="flex-1">
              <TextField
                label="Name"
                value={row.name}
                onChange={(value) => updateRow(index, { name: value })}
                placeholder="e.g. wandb"
              />
            </div>
            <label className="flex items-center gap-1.5 pb-2.5 text-[13px] text-ink-muted">
              <input
                type="checkbox"
                checked={row.attached}
                onChange={(event) => updateRow(index, { attached: event.target.checked })}
              />
              Attached
            </label>
            <label className="flex items-center gap-1.5 pb-2.5 text-[13px] text-ink-muted">
              <input
                type="checkbox"
                checked={row.closed}
                onChange={(event) => updateRow(index, { closed: event.target.checked })}
              />
              Closed
            </label>
            <Button type="button" size="sm" variant="ghost" onClick={() => removeRow(index)}>
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" size="sm" variant="secondary" onClick={addRow} className="self-start">
          Add integration
        </Button>
      </div>

      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={onSubmit}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
