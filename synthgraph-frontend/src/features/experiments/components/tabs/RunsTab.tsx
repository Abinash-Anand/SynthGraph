"use client";

import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  useTable,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { CaptureStatusBadge } from "@/features/training-runs/components/CaptureStatusBadge";
import { TrainingRunStatusBadge } from "@/features/training-runs/components/TrainingRunStatusBadge";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/shared/lib/format";
import type { EnrichedTrainingRun } from "../../types/experiment-workspace";

function durationLabel(run: EnrichedTrainingRun["run"]): string {
  if (!run.startedAt || !run.completedAt) return "—";
  const seconds = (new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000;
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric },
});

const columnHelper = createColumnHelper<typeof features, EnrichedTrainingRun>();

const columns = columnHelper.columns([
  columnHelper.accessor((row) => row.run.name, {
    id: "name",
    header: "Name",
    cell: (info) => <span className="text-research-ink">{info.getValue()}</span>,
  }),
  columnHelper.accessor((row) => row.run.status, {
    id: "status",
    header: "Status",
    cell: (info) => <TrainingRunStatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor((row) => row.run.captureStatus?.status ?? null, {
    id: "capture",
    header: "Capture",
    cell: (info) => <CaptureStatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor((row) => row.run.createdAt, {
    id: "created",
    header: "Created",
    cell: (info) => <span className="tabular-nums text-research-ink-muted">{formatDateTime(info.getValue())}</span>,
  }),
  columnHelper.accessor((row) => durationLabel(row.run), {
    id: "duration",
    header: "Duration",
    cell: (info) => <span className="tabular-nums text-research-ink-muted">{info.getValue()}</span>,
  }),
  columnHelper.accessor((row) => row.metrics.length, {
    id: "steps",
    header: "Steps",
    cell: (info) => <span className="tabular-nums text-research-ink-muted">{info.getValue()}</span>,
  }),
  columnHelper.accessor((row) => row.evaluations.length, {
    id: "evaluations",
    header: "Evaluations",
    cell: (info) => <span className="tabular-nums text-research-ink-muted">{info.getValue()}</span>,
  }),
]);

export function RunsTab({
  runs,
  selectedId,
  onSelect,
}: {
  runs: EnrichedTrainingRun[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "created", desc: true }]);

  const table = useTable({
    features,
    columns,
    data: runs,
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: (row) => row.run.id,
  });

  if (runs.length === 0) {
    return <p className="text-[13.5px] text-research-ink-muted">No training runs yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-research-border">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-research-border bg-research-panel">
              {headerGroup.headers.map((header) => (
                <th key={header.id} scope="col" className="px-3 py-2.5 text-left">
                  <button
                    type="button"
                    onClick={header.column.getToggleSortingHandler()}
                    className="mono-label flex items-center gap-1 text-research-ink-muted transition-colors hover:text-research-ink"
                  >
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                    {{ asc: " ▲", desc: " ▼" }[header.column.getIsSorted() as string] ?? ""}
                  </button>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={cn(
                "relative border-b border-research-border last:border-b-0 transition-colors",
                row.id === selectedId ? "bg-research-accent-subtle/10" : "hover:bg-research-subtle/60",
              )}
            >
              {row.getAllCells().map((cell, index) => (
                <td key={cell.id} className="relative px-3 py-2.5">
                  {index === 0 ? (
                    // `<tr tabIndex>` is not reliably focusable across
                    // browsers (confirmed directly, not assumed) - a real
                    // <button> absolutely positioned over the row, via
                    // `position:relative` on the <tr> as its containing
                    // block, is the standard accessible pattern for
                    // "click/focus anywhere in this row" without adding
                    // an extra table column.
                    <button
                      type="button"
                      aria-pressed={row.id === selectedId}
                      aria-label={`View ${row.original.run.name}`}
                      onClick={() => onSelect(row.id)}
                      className="absolute inset-0 cursor-pointer"
                    />
                  ) : null}
                  <table.FlexRender cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
