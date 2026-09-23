"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { JsonTree } from "./JsonTree";

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
  const [copied, setCopied] = useState(false);

  const copyRaw = async () => {
    if (raw === undefined) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(raw, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowRaw((v) => !v)}
              className="font-mono text-[11px] tracking-[0.08em] text-research-ink-muted uppercase transition-colors hover:text-research-accent-hover"
            >
              {showRaw ? "Hide raw JSON" : "View raw JSON"}
            </button>
            {showRaw ? (
              <button
                type="button"
                onClick={copyRaw}
                className="font-mono text-[11px] tracking-[0.08em] text-research-ink-muted uppercase transition-colors hover:text-research-accent-hover"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            ) : null}
          </div>
          {showRaw ? (
            // Collapsible per-node, not a flat dump - lets a large nested
            // object (e.g. a domain-randomization config) be explored one
            // branch at a time. max-h/overflow-y bounds it inside a fixed-
            // width rail instead of growing the rail unboundedly.
            <div className="mt-2 max-h-[420px] overflow-y-auto rounded-lg border border-research-border bg-research-bg p-3">
              <JsonTree value={raw} />
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
      <dt className="min-w-0 text-[13px] text-research-ink-muted">{label}</dt>
      <dd className={cn("min-w-0 font-mono text-[13px] text-research-ink", "tabular-nums", "break-all")}>
        {value}
      </dd>
    </>
  );
}
