import { LINEAGE_NODES, NODE_COLOR } from "@/data/demo-data";

const CHAIN = ["generation", "dataset", "training", "evaluation"];

/**
 * Shown when WebGL is unavailable or a scene fails. It carries the same
 * information the 3D graph carries — the chain, and what each record holds.
 */
export function GraphFallback() {
  const nodes = CHAIN.map((id) => LINEAGE_NODES.find((node) => node.id === id)).filter(
    (node) => node !== undefined,
  );

  return (
    <ol className="flex w-full max-w-3xl flex-col gap-3 p-6 sm:flex-row sm:items-stretch">
      {nodes.map((node, index) => (
        <li key={node.id} className="flex flex-1 items-center gap-3">
          <div className="flex-1 rounded-lg border border-line bg-surface/70 p-4">
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: NODE_COLOR[node.kind] }}
              />
              <span className="font-mono text-[10px] tracking-[0.16em] text-ink-muted uppercase">
                {node.title}
              </span>
            </div>
            {node.lines.map((line) => (
              <p key={line} className="mt-1 font-mono text-[11px] text-ink-dim">
                {line}
              </p>
            ))}
          </div>
          {index < nodes.length - 1 ? (
            <span aria-hidden className="hidden text-ink-faint sm:block">
              →
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
