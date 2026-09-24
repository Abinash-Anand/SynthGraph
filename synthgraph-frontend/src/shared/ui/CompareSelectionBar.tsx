"use client";

/**
 * Replaces the old top-header Cancel/Compare buttons for the workspace's
 * multi-select compare flow - a sticky bar keeps the action reachable
 * without scrolling back up, and reads as a distinct "you're in a
 * selection mode" state rather than two buttons competing with the rest
 * of the header's actions.
 */
export function CompareSelectionBar({
  count,
  min = 2,
  max = 10,
  label,
  onCancel,
  onConfirm,
}: {
  count: number;
  min?: number;
  max?: number;
  /** e.g. "generations" or "training runs" */
  label: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 sm:px-6">
      <div className="flex w-full max-w-[560px] items-center justify-between gap-4 rounded-xl border border-research-border bg-research-elevated px-5 py-3 shadow-2xl">
        <p className="min-w-0 truncate text-[13.5px] text-research-ink">
          <span className="font-medium tabular-nums">{count}</span>
          <span className="text-research-ink-muted"> of {max} {label} selected</span>
          {count < min ? (
            <span className="text-research-ink-muted"> · select at least {min}</span>
          ) : null}
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-research-border bg-research-panel px-3.5 py-2 text-[13px] font-medium text-research-ink transition-colors hover:border-research-accent-subtle"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={count < min}
            onClick={onConfirm}
            className="rounded-md bg-research-accent px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-research-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Compare ({count})
          </button>
        </div>
      </div>
    </div>
  );
}
