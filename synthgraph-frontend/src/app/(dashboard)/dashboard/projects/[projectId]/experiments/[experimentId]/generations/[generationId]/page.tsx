import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { CopyableId } from "@/components/ui/CopyableId";
import { getSession, requireSession } from "@/features/auth/server/session";
import { GenerationStatusBadge } from "@/features/generations/components/GenerationStatusBadge";
import { getGeneration } from "@/features/generations/server/generations-api";
import type { GenerationDataReference } from "@/features/generations/types/generation";
import { NotFoundError } from "@/shared/http/errors";
import { formatDateTime } from "@/shared/lib/format";
import { LineageDiagram, type LineageNode } from "@/shared/ui/LineageDiagram";

type PageParams = { projectId: string; experimentId: string; generationId: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { generationId } = await params;
  const session = await getSession();
  if (!session) return {};
  try {
    const generation = await getGeneration(session.apiKey, generationId);
    return { title: generation.name };
  } catch {
    return {};
  }
}

export default async function GenerationDetailPage({ params }: { params: Promise<PageParams> }) {
  const { projectId, experimentId, generationId } = await params;
  const session = await requireSession();

  const generation = await getGeneration(session.apiKey, generationId).catch((error) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });

  // Defense in depth: there's no project/experiment-scoped "get generation"
  // backend route, only this flat lookup by id. A hand-edited URL with a
  // mismatched experimentId shouldn't produce a breadcrumb that lies about
  // which experiment this generation belongs to — ownership itself is
  // already enforced server-side by the API key.
  if (generation.experiment_id !== experimentId) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href={`/dashboard/projects/${projectId}/experiments/${experimentId}`}
          className="mono-label text-ink-faint transition-colors hover:text-ink"
        >
          ← Experiment
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-[22px] font-medium tracking-[-0.01em] text-ink">{generation.name}</h1>
          <GenerationStatusBadge status={generation.status} />
        </div>
        {generation.description ? (
          <p className="mt-1 text-[14px] text-ink-muted">{generation.description}</p>
        ) : null}
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] text-ink-faint">
          <div className="flex gap-1.5">
            <dt>Created</dt>
            <dd>{formatDateTime(generation.created_at)}</dd>
          </div>
          {generation.started_at ? (
            <div className="flex gap-1.5">
              <dt>Started</dt>
              <dd>{formatDateTime(generation.started_at)}</dd>
            </div>
          ) : null}
          {generation.completed_at ? (
            <div className="flex gap-1.5">
              <dt>Completed</dt>
              <dd>{formatDateTime(generation.completed_at)}</dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CopyableId id={generation.id} />
          <ButtonLink
            href={`/dashboard/projects/${projectId}/experiments/${experimentId}/generations/${generationId}/reproduction-manifest`}
            variant="ghost"
            size="sm"
          >
            Reproduction manifest
          </ButtonLink>
          <ButtonLink
            href={`/dashboard/projects/${projectId}/experiments/${experimentId}/generations/${generationId}/documentation`}
            variant="ghost"
            size="sm"
          >
            Documentation
          </ButtonLink>
        </div>
      </div>

      <Section title="Lineage">
        <LineageDiagram
          columns={[
            {
              title: `Inputs (${generation.inputs.length})`,
              emptyLabel: "None",
              nodes: generation.inputs.map(toLineageNode),
            },
            {
              title: "This generation",
              emptyLabel: "—",
              nodes: [
                {
                  key: generation.id,
                  label: generation.name,
                  sublabel: generation.generator.name,
                  colorVar: "--color-node-generation",
                },
              ],
            },
            {
              title: `Outputs (${generation.outputs.length})`,
              emptyLabel: "None",
              nodes: generation.outputs.map(toLineageNode),
            },
          ]}
        />
      </Section>

      <Section title="Generator">
        <CodeBlock language="json" code={JSON.stringify(generation.generator, null, 2)} />
      </Section>

      <Section title="Parameters">
        <CodeBlock language="json" code={JSON.stringify(generation.parameters, null, 2)} />
      </Section>

      <Section title="Reproducibility">
        <CodeBlock language="json" code={JSON.stringify(generation.reproducibility, null, 2)} />
      </Section>

      <div className="grid gap-8 sm:grid-cols-2">
        <Section title={`Inputs (${generation.inputs.length})`}>
          <DataReferenceList references={generation.inputs} />
        </Section>
        <Section title={`Outputs (${generation.outputs.length})`}>
          <DataReferenceList references={generation.outputs} />
        </Section>
      </div>

      {Object.keys(generation.metadata).length > 0 ? (
        <Section title="Metadata">
          <CodeBlock language="json" code={JSON.stringify(generation.metadata, null, 2)} />
        </Section>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mono-label mb-3">{title}</h2>
      {children}
    </div>
  );
}

// These are generic data references stored directly on the generation, not
// guaranteed to be real linkable Dataset/Asset entities (only the
// reproduction manifest's `datasetReferences` are) — so no href, and the
// dataset/asset color is a best-effort guess from the free-text `type`
// field, not an authoritative distinction.
function toLineageNode(reference: GenerationDataReference): LineageNode {
  const isAsset = reference.type?.toLowerCase().includes("asset") ?? false;
  return {
    key: reference.id,
    label: reference.name ?? reference.id,
    sublabel: reference.uri,
    colorVar: isAsset ? "--color-node-asset" : "--color-node-dataset",
  };
}

function DataReferenceList({ references }: { references: GenerationDataReference[] }) {
  if (references.length === 0) {
    return <p className="text-[13.5px] text-ink-faint">None</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {references.map((reference) => (
        <li key={reference.id} className="rounded-md border border-line bg-surface/40 p-3">
          <p className="truncate text-[13.5px] text-ink">{reference.name ?? reference.id}</p>
          {reference.uri ? (
            <p className="mt-0.5 truncate font-mono text-[11px] text-ink-faint">{reference.uri}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
