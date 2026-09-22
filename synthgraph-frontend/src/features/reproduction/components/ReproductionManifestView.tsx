import type { ReactNode } from "react";
import { CodeBlock } from "@/components/ui/CodeBlock";
import type { ReproductionManifest } from "../types/reproduction-manifest";

export function ReproductionManifestView({ manifest }: { manifest: ReproductionManifest }) {
  return (
    <div className="flex flex-col gap-8">
      <div
        role="note"
        className="rounded-lg border border-warn/35 bg-warn/5 p-4 text-[13.5px] text-ink"
      >
        This manifest does not include asset references, metadata, or timestamps — a known backend
        limitation. Schema version {manifest.schemaVersion}.
      </div>

      <Section title="Generation">
        <CodeBlock language="json" code={JSON.stringify(manifest.generation, null, 2)} />
      </Section>

      <Section title={`Dataset references (${manifest.datasetReferences.length})`}>
        {manifest.datasetReferences.length === 0 ? (
          <p className="text-[13.5px] text-ink-faint">None</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {manifest.datasetReferences.map((ref, index) => (
              <li key={index} className="rounded-md border border-line bg-surface/40 p-3">
                <p className="text-[13.5px] text-ink">{ref.role}</p>
                <p className="mt-0.5 font-mono text-[11px] text-ink-faint">{ref.datasetVersionId}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>
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
