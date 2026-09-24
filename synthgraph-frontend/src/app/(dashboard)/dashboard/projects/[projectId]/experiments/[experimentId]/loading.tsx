// Mirrors the actual shape of ExperimentWorkspace (header + action row +
// stats line, a 6-tab strip, then the three-pane canvas/inspector split)
// instead of the generic title-plus-blocks skeleton used elsewhere - this
// is the most complex page in the app, so a shape mismatch here is where
// the perceived layout shift is worst.
const TAB_LABELS = ["Overview", "Runs", "Lineage", "Metrics", "Parameters", "Reproduction"];

export default function ExperimentDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 border-b border-line pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="h-7 w-64 animate-pulse rounded bg-surface-2" />
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="h-9 w-20 animate-pulse rounded-md bg-surface-2" />
            ))}
          </div>
        </div>
        <div className="h-3.5 w-72 animate-pulse rounded bg-surface-2/70" />
      </div>

      <div className="flex gap-4 overflow-hidden border-b border-line pb-3">
        {TAB_LABELS.map((label) => (
          <div key={label} className="h-4 animate-pulse rounded bg-surface-2" style={{ width: `${label.length * 7}px` }} />
        ))}
      </div>

      <div className="flex items-start gap-6 xl:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="h-20 animate-pulse rounded-xl border border-line bg-surface/40" />
            ))}
          </div>
          <div className="h-40 animate-pulse rounded-xl border border-line bg-surface/40" />
          <div className="h-40 animate-pulse rounded-xl border border-line bg-surface/40" />
        </div>
        <div className="hidden w-[380px] shrink-0 xl:block">
          <div className="h-[520px] animate-pulse rounded-xl border border-line bg-surface/40" />
        </div>
      </div>
    </div>
  );
}
