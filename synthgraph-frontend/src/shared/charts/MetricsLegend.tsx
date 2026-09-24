"use client";

import { useState } from "react";
import { SERIES_COLORS } from "./series-colors";

const VISIBLE_LIMIT = 5;

/**
 * An external, DOM-rendered legend above the chart canvas - the chart's own
 * ECharts legend is disabled (see MetricsLineChart) because it lives inside
 * the fixed-height plot area: with 15+ series selected it wraps to several
 * rows and collides into the axis labels at the top of the grid. This can
 * never do that, since it isn't part of the chart's own layout box - it
 * caps itself at 5 visible badges and tucks the rest behind a "+N more"
 * toggle instead of growing without bound.
 */
export function MetricsLegend({ keys }: { keys: string[] }) {
  const [expanded, setExpanded] = useState(false);

  if (keys.length === 0) return null;

  const visible = expanded ? keys : keys.slice(0, VISIBLE_LIMIT);
  const hiddenCount = keys.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {visible.map((key, index) => (
        <span key={key} className="inline-flex min-w-0 max-w-[220px] items-center gap-1.5">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-sm"
            style={{ backgroundColor: SERIES_COLORS[index % SERIES_COLORS.length] }}
          />
          <span className="truncate font-mono text-[11px] text-research-ink-muted" title={key}>
            {key}
          </span>
        </span>
      ))}
      {hiddenCount > 0 || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="shrink-0 font-mono text-[11px] text-research-accent-hover underline underline-offset-2 hover:text-research-accent"
        >
          {expanded ? "Show less" : `+${hiddenCount} more`}
        </button>
      ) : null}
    </div>
  );
}
