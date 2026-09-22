"use client";

import { useState, type ReactNode } from "react";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { cn } from "@/lib/utils";

export type KeyValueRow = { label: string; value: ReactNode };

/**
 * design.md's Progressive Disclosure pattern: structured key:value rows as
 * the primary view, raw JSON tucked behind an explicit toggle - never the
 * other way around.
 */
export function KeyValueList({
  rows,
  raw,
  emptyLabel = "None",
}: {
  rows: KeyValueRow[];
  raw?: unknown;
  emptyLabel?: string;
}) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {rows.length === 0 ? (
        <p className="text-[13.5px] text-research-ink-muted">{emptyLabel}</p>
      ) : (
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
          {rows.map((row) => (
            <FieldRow key={row.label} label={row.label} value={row.value} />
          ))}
        </dl>
      )}
      {raw !== undefined ? (
        <div>
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="font-mono text-[11px] tracking-[0.08em] text-research-ink-muted uppercase transition-colors hover:text-research-accent-hover"
          >
            {showRaw ? "Hide raw JSON" : "View raw JSON"}
          </button>
          {showRaw ? (
            <div className="mt-2">
              <CodeBlock language="json" code={JSON.stringify(raw, null, 2)} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <dt className="text-[13px] text-research-ink-muted">{label}</dt>
      <dd className={cn("font-mono text-[13px] text-research-ink", "tabular-nums")}>{value}</dd>
    </>
  );
}
