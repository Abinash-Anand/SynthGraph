"use client";

import { useState } from "react";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { cn } from "@/lib/utils";
import { KeyValueList, type KeyValueRow } from "@/shared/ui/KeyValueList";
import type { ClassifiedField } from "@/features/reproduction/types/reproduction-manifest";
import type { EnrichedGeneration } from "../../types/experiment-workspace";

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

export function ReproductionTab({ generations }: { generations: EnrichedGeneration[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(generations[0]?.generation.id ?? null);
  const [showRaw, setShowRaw] = useState(false);

  if (generations.length === 0) {
    return <p className="text-[13.5px] text-research-ink-muted">No generations yet.</p>;
  }

  const active = generations.find((g) => g.generation.id === selectedId) ?? generations[0];
  const { known, supplied, missing, external } = active.manifest?.classification ?? {
    known: [],
    supplied: [],
    missing: [],
    external: [],
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-[320px]">
        <label className="flex flex-col gap-2 text-[13.5px] text-research-ink">
          Generation
          <select
            value={active.generation.id}
            onChange={(event) => setSelectedId(event.target.value)}
            className="w-full rounded-md border border-research-border bg-research-bg px-3.5 py-2.5 text-[14px] text-research-ink focus:border-research-accent-subtle focus:outline-none"
          >
            {generations.map((g) => (
              <option key={g.generation.id} value={g.generation.id} className="bg-research-panel text-research-ink">
                {g.generation.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!active.manifest ? (
        <p className="text-[13.5px] text-research-error">
          Unavailable — this generation&rsquo;s reproduction manifest could not be loaded.
        </p>
      ) : (
        <div className="flex flex-col gap-5 rounded-xl border border-research-border bg-research-panel p-5">
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
                <CodeBlock language="json" code={JSON.stringify(active.manifest, null, 2)} />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
