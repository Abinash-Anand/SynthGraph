import Link from "next/link";
import { GenerationStatusBadge } from "@/features/generations/components/GenerationStatusBadge";
import type { GenerationDataReference } from "@/features/generations/types/generation";
import { formatDateTime } from "@/shared/lib/format";
import { KeyValueList } from "@/shared/ui/KeyValueList";
import type { EnrichedGeneration } from "../../types/experiment-workspace";

function ReferenceList({ references }: { references: GenerationDataReference[] }) {
  if (references.length === 0) return <p className="text-[13px] text-research-ink-muted">None</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {references.map((reference) => (
        <li key={reference.id} className="rounded-md border border-research-border bg-research-subtle/40 p-2.5">
          <p className="truncate text-[13px] text-research-ink">{reference.name ?? reference.id}</p>
          {reference.uri ? (
            <p className="truncate font-mono text-[10.5px] text-research-ink-muted">{reference.uri}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function GenerationInspector({
  enriched,
  projectId,
  experimentId,
}: {
  enriched: EnrichedGeneration;
  projectId: string;
  experimentId: string;
}) {
  const { generation } = enriched;

  return (
    <div className="flex flex-col gap-6 p-5">
      <div>
        <p className="mono-label text-research-ink-muted">Generation</p>
        <h3 className="mt-1 text-[16px] font-medium text-research-ink">{generation.name}</h3>
        <div className="mt-2">
          <GenerationStatusBadge status={generation.status} />
        </div>
      </div>

      <KeyValueList
        rows={[
          { label: "Generator", value: generation.generator.name },
          ...(generation.generator.version ? [{ label: "Version", value: generation.generator.version }] : []),
          { label: "Created", value: formatDateTime(generation.created_at) },
        ]}
      />

      <div>
        <p className="mono-label mb-2 text-research-ink-muted">Configuration</p>
        <KeyValueList
          rows={Object.entries(generation.parameters).map(([key, value]) => ({
            label: key,
            value: typeof value === "object" ? JSON.stringify(value) : String(value),
          }))}
          raw={generation.parameters}
        />
      </div>

      <div>
        <p className="mono-label mb-2 text-research-ink-muted">Inputs ({generation.inputs.length})</p>
        <ReferenceList references={generation.inputs} />
      </div>

      <div>
        <p className="mono-label mb-2 text-research-ink-muted">Outputs ({generation.outputs.length})</p>
        <ReferenceList references={generation.outputs} />
      </div>

      <Link
        href={`/dashboard/projects/${projectId}/experiments/${experimentId}/generations/${generation.id}`}
        className="text-[13px] text-research-accent-hover underline underline-offset-2"
      >
        Open full generation page →
      </Link>
    </div>
  );
}
