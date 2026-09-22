"use client";

import { Fragment, useState } from "react";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { cn } from "@/lib/utils";
import type { EnrichedGeneration } from "../../types/experiment-workspace";

type ClassifiedField = { label: string; value: string };

// The backend's reproduction-manifest response has no Known/Supplied/
// Missing/External/Unavailable classification of its own - this is a
// documented FRONTEND inference rule (flagged as an open item in the
// Phase 4 plan), not something the backend asserts. "External" = the
// generation's own dataset references (real dependencies outside the
// generation record itself); everything else is either present ("Known"/
// "Supplied") or absent ("Missing") on the manifest's own fields.
function classify(enriched: EnrichedGeneration): {
  known: ClassifiedField[];
  supplied: ClassifiedField[];
  missing: string[];
  external: ClassifiedField[];
} {
  const manifest = enriched.manifest;
  if (!manifest) return { known: [], supplied: [], missing: [], external: [] };

  const { generator, reproducibility } = manifest.generation;
  const known: ClassifiedField[] = [{ label: "Generator", value: generator.name }];
  const missing: string[] = [];

  if (generator.version) known.push({ label: "Generator version", value: generator.version });
  else missing.push("Generator version");

  if (reproducibility.seed !== undefined) known.push({ label: "Seed", value: String(reproducibility.seed) });
  else missing.push("Seed");

  if (reproducibility.code_version) known.push({ label: "Code version", value: reproducibility.code_version });
  else missing.push("Code version");

  if (reproducibility.configuration_hash) {
    known.push({ label: "Configuration hash", value: reproducibility.configuration_hash });
  } else {
    missing.push("Configuration hash");
  }

  const supplied: ClassifiedField[] = [];
  if (reproducibility.environment && Object.keys(reproducibility.environment).length > 0) {
    for (const [key, value] of Object.entries(reproducibility.environment)) {
      supplied.push({ label: key, value: String(value) });
    }
  } else {
    missing.push("Environment");
  }

  const external: ClassifiedField[] = manifest.datasetReferences.map((ref) => ({
    label: ref.role,
    value: ref.datasetVersionId,
  }));

  return { known, supplied, missing, external };
}

function FieldGroup({ title, fields, tone }: { title: string; fields: ClassifiedField[]; tone: string }) {
  if (fields.length === 0) return null;
  return (
    <div>
      <p className={cn("mono-label mb-2", tone)}>{title}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5">
        {fields.map((field) => (
          <Fragment key={field.label}>
            <dt className="text-[13px] text-research-ink-muted">{field.label}</dt>
            <dd className="truncate font-mono text-[13px] text-research-ink">{field.value}</dd>
          </Fragment>
        ))}
      </dl>
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
  const { known, supplied, missing, external } = classify(active);

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
