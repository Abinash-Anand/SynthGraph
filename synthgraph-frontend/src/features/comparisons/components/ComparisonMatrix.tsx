"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { cn } from "@/lib/utils";
import { formatMetricValue } from "@/shared/lib/format";
import {
  diffLines,
  diffStats,
  displayLines,
  familyWarning,
  groupRows,
  isDifference,
  isExpandable,
  type MatrixRow,
  numericDelta,
} from "../lib/comparison-model";

export type MatrixColumn = { id: string; name: string; href?: string };

function formatDelta(baseline: unknown, value: unknown): string | null {
  const delta = numericDelta(baseline, value);
  if (!delta) return null;
  const sign = delta.absolute > 0 ? "+" : "−";
  const absolute = formatMetricValue(Math.abs(delta.absolute));
  if (delta.percent === null) return `${sign}${absolute}`;
  const percent = Math.abs(delta.percent) >= 10 ? Math.round(Math.abs(delta.percent)) : Math.abs(delta.percent).toFixed(1);
  return `${sign}${absolute}, ${sign}${percent}%`;
}

/**
 * The transposed matrix (fields down, compared records across) shared by the
 * generation and training-run comparisons. A semantic HTML table rather than
 * @tanstack/react-table: that library's row-per-record model doesn't fit this
 * shape (see frontendarchitecture.md's "libraries render the model, not
 * become it").
 *
 * One column is the baseline and every other cell is judged against it. That
 * used to be implicit (always the first column, unlabelled), which made a
 * highlighted cell read as "wrong" rather than "different from column one".
 */
export function ComparisonMatrix({
  columns,
  rows,
  records,
  noun,
}: {
  columns: MatrixColumn[];
  rows: MatrixRow[];
  /** The full records, for the "view raw data" section. */
  records: Array<{ id: string; name: string; value: unknown }>;
  /** "generation" | "training run" - used in copy. */
  noun: string;
}) {
  const [baselineIndex, setBaselineIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const baseline = Math.min(baselineIndex, columns.length - 1);
  const differingTotal = rows.filter(isDifference).length;
  const timesDiffer = rows.some((row) => row.informational && row.differs);
  const groups = useMemo(() => groupRows(rows), [rows]);
  const warning = useMemo(() => familyWarning(rows), [rows]);

  const toggle = (key: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 rounded-xl border border-research-border bg-research-panel p-4">
        <p className="text-[13.5px] text-research-ink">
          {differingTotal === 0 ? (
            "No differences found across these fields."
          ) : (
            <>
              <span className="font-medium text-research-accent-hover">{differingTotal}</span> of {rows.length} fields
              differ.{" "}
              <span className="text-research-ink-muted">
                Compared with <span className="text-research-ink-secondary">{columns[baseline]?.name}</span>.
              </span>
            </>
          )}
        </p>
        {differingTotal > 0 ? (
          <div className="flex flex-wrap gap-2">
            {groups
              .filter((group) => group.differing > 0)
              .map((group) => (
                <span
                  key={group.name}
                  className="rounded-full border border-research-border px-2.5 py-1 font-mono text-[11px] text-research-ink-secondary"
                >
                  {group.name} · {group.differing}
                </span>
              ))}
          </div>
        ) : null}
        {warning ? (
          <p role="note" className="text-[12.5px] text-research-warning">
            {warning}
          </p>
        ) : null}
        {timesDiffer ? (
          <p className="text-[12px] text-research-ink-muted">
            Start and finish times differ between any two records, so they aren&apos;t counted as differences.
          </p>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-research-border">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-research-border bg-research-panel align-bottom">
              <th
                scope="col"
                className="sticky left-0 z-[1] bg-research-panel px-3 py-2.5 text-left font-mono text-[11px] text-research-ink-muted"
              >
                field
              </th>
              {columns.map((column, index) => (
                <th key={column.id} scope="col" className="px-3 py-2.5 text-left font-normal text-research-ink">
                  <div className="flex flex-col items-start gap-1">
                    {column.href ? (
                      <Link
                        href={column.href}
                        className="font-medium underline underline-offset-2 hover:text-research-accent-hover"
                      >
                        {column.name}
                      </Link>
                    ) : (
                      <span className="font-medium">{column.name}</span>
                    )}
                    {index === baseline ? (
                      <span className="rounded border border-research-accent-subtle px-1.5 py-0.5 font-mono text-[10px] text-research-accent-hover">
                        BASELINE
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setBaselineIndex(index)}
                        title={`Compare everything against this ${noun} instead`}
                        className="font-mono text-[10px] text-research-ink-muted underline underline-offset-2 hover:text-research-ink"
                      >
                        use as baseline
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const visible = showAll ? group.rows : group.rows.filter(isDifference);
              if (visible.length === 0) return null;
              return (
                <Fragment key={group.name}>
                  <tr className="border-b border-research-border bg-research-subtle/50">
                    <th
                      colSpan={columns.length + 1}
                      scope="colgroup"
                      className="px-3 py-1.5 text-left font-mono text-[11px] font-normal text-research-ink-muted"
                    >
                      {group.name}
                      <span className="ml-2 text-research-ink-muted/70">
                        {group.differing} of {group.rows.length} differ
                      </span>
                    </th>
                  </tr>
                  {visible.map((row) => (
                    <tr
                      key={row.label}
                      className={cn(
                        "border-b border-research-border align-top last:border-b-0",
                        isDifference(row) && "bg-research-warning/[0.04]",
                      )}
                    >
                      <td
                        className="sticky left-0 z-[1] max-w-[200px] truncate bg-research-bg px-3 py-2.5 font-mono text-[11px] text-research-ink-muted"
                        title={row.label}
                      >
                        {row.label.replace(/^(parameters|metrics)\./, "")}
                      </td>
                      {row.values.map((display, index) => {
                        const key = `${row.label}:${index}`;
                        const raw = row.raw?.[index];
                        const baseRaw = row.raw?.[baseline];
                        const isBaseline = index === baseline;
                        const differsFromBaseline = isDifference(row) && display !== row.values[baseline];
                        const expandable = isExpandable(raw, display);
                        const expanded = open.has(key);
                        const delta = !isBaseline ? formatDelta(baseRaw, raw) : null;

                        let body: React.ReactNode;
                        if (expanded) {
                          const lines = displayLines(raw);
                          if (!isBaseline && differsFromBaseline) {
                            const ops = diffLines(displayLines(baseRaw), lines);
                            const stats = diffStats(ops);
                            body = (
                              <div className="min-w-[260px]">
                                <p className="mb-1 font-mono text-[10.5px] text-research-ink-muted">
                                  vs baseline: +{stats.added} / −{stats.removed} lines
                                </p>
                                <pre className="max-h-[320px] overflow-auto rounded-md border border-research-border bg-research-bg p-2 font-mono text-[11.5px] leading-[1.5]">
                                  {ops.map((op, i) => (
                                    <span
                                      key={i}
                                      className={cn(
                                        "block whitespace-pre-wrap break-all",
                                        op.kind === "add" && "bg-research-success/10 text-research-success",
                                        op.kind === "remove" && "bg-research-error/10 text-research-error",
                                        op.kind === "same" && "text-research-ink-muted",
                                      )}
                                    >
                                      {op.kind === "add" ? "+ " : op.kind === "remove" ? "− " : "  "}
                                      {op.text}
                                    </span>
                                  ))}
                                </pre>
                              </div>
                            );
                          } else {
                            body = (
                              <pre className="max-h-[320px] min-w-[220px] overflow-auto whitespace-pre-wrap break-all rounded-md border border-research-border bg-research-bg p-2 font-mono text-[11.5px] leading-[1.5] text-research-ink-secondary">
                                {lines.join("\n")}
                              </pre>
                            );
                          }
                        } else {
                          body = (
                            <span className="block max-w-[260px] truncate" title={display}>
                              {raw === undefined ? <span className="text-research-ink-muted">—</span> : display}
                            </span>
                          );
                        }

                        return (
                          <td
                            key={index}
                            className={cn(
                              "px-3 py-2.5",
                              differsFromBaseline ? "font-medium text-research-warning" : "text-research-ink",
                            )}
                          >
                            <div className="flex items-start gap-1.5">
                              {expandable ? (
                                <button
                                  type="button"
                                  onClick={() => toggle(key)}
                                  aria-expanded={expanded}
                                  aria-label={expanded ? "Collapse value" : "Expand value"}
                                  className="mt-0.5 shrink-0 font-mono text-[10px] text-research-ink-muted hover:text-research-ink"
                                >
                                  {expanded ? "▾" : "▸"}
                                </button>
                              ) : null}
                              <div className="min-w-0">
                                {body}
                                {delta && !expanded ? (
                                  <span className="font-mono text-[10.5px] font-normal text-research-ink-muted">
                                    {delta}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length > differingTotal ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="self-start font-mono text-[11px] tracking-[0.08em] text-research-ink-muted uppercase transition-colors hover:text-research-accent-hover"
        >
          {showAll ? "Show only differences" : `Show all ${rows.length} fields`}
        </button>
      ) : null}

      <div>
        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          className="font-mono text-[11px] tracking-[0.08em] text-research-ink-muted uppercase transition-colors hover:text-research-accent-hover"
        >
          {showRaw ? "Hide raw data" : "View raw data"}
        </button>
        {showRaw ? (
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {records.map((record) => (
              <div key={record.id}>
                <p className="mb-1.5 truncate text-[12.5px] text-research-ink-secondary">{record.name}</p>
                <CodeBlock language="json" code={JSON.stringify(record.value, null, 2)} />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
