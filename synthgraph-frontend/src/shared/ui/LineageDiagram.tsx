import Link from "next/link";

export type LineageNode = {
  key: string;
  label: string;
  sublabel?: string;
  href?: string;
  /** One of the --color-node-* tokens in globals.css, e.g. "--color-node-dataset". */
  colorVar: string;
};

export type LineageColumn = {
  title: string;
  nodes: LineageNode[];
  emptyLabel: string;
};

/**
 * A left-to-right flow of node columns (e.g. Inputs -> This Generation ->
 * Outputs), using the same entity-identity color tokens the marketing
 * site's 3D graph uses, so a chip's color always means the same entity
 * type everywhere in the product. Deliberately simple — one connector
 * between whole columns, not a full graph layout with per-node edges —
 * since the underlying data (a generation's inputs/outputs, a training
 * run's dataset references) is column-shaped, not a general graph.
 */
export function LineageDiagram({ columns }: { columns: LineageColumn[] }) {
  return (
    <div className="flex items-start gap-3 overflow-x-auto pb-1">
      {columns.map((column, index) => (
        <div key={column.title} className="flex items-start gap-3">
          {index > 0 ? <Arrow /> : null}
          <div className="flex w-[200px] shrink-0 flex-col gap-2">
            <p className="mono-label">{column.title}</p>
            {column.nodes.length === 0 ? (
              <p className="text-[12.5px] text-ink-faint">{column.emptyLabel}</p>
            ) : (
              column.nodes.map((node) => <NodeChip key={node.key} node={node} />)
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function NodeChip({ node }: { node: LineageNode }) {
  const content = (
    <div
      className="rounded-md border bg-surface/40 px-3 py-2 transition-colors duration-200 hover:bg-surface-2/60"
      style={{ borderColor: `color-mix(in oklab, var(${node.colorVar}) 45%, transparent)` }}
    >
      <p className="truncate text-[13px] text-ink">{node.label}</p>
      {node.sublabel ? (
        <p className="mt-0.5 truncate font-mono text-[10.5px] text-ink-faint">{node.sublabel}</p>
      ) : null}
    </div>
  );

  if (!node.href) return content;
  return (
    <Link href={node.href} className="block">
      {content}
    </Link>
  );
}

function Arrow() {
  return (
    <svg
      width="20"
      height="18"
      viewBox="0 0 20 18"
      fill="none"
      aria-hidden
      className="mt-7 shrink-0 text-ink-faint"
    >
      <path
        d="M0 9h17m0 0l-5-5m5 5l-5 5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
