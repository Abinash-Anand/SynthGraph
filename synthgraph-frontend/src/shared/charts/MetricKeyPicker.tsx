"use client";

import { useState } from "react";
import type { TrainingRunMetric } from "@/features/training-runs/types/training-run-metric";
import { cn } from "@/lib/utils";

// Deliberately has no dependency on EChart/MetricsLineChart - this file is
// statically imported by tab/inspector components so the metric-key list and
// selection state are available before the chart itself (dynamically
// imported, since ECharts is heavy) has loaded.

/** Every numeric metric key found across a run's step metrics, in first-
 * appearance order. Shared by the chart's own series-building and by
 * whatever renders the picker. */
export function extractMetricKeys(metrics: TrainingRunMetric[]): string[] {
  const metricKeys = new Set<string>();
  for (const row of metrics) {
    for (const [key, value] of Object.entries(row.metrics)) {
      if (typeof value === "number") metricKeys.add(key);
    }
  }
  return Array.from(metricKeys);
}

/**
 * Tracks which metric keys are selected, defaulting to the first 3 - resets
 * whenever the available key set actually changes (e.g. switching to a
 * different run), via React's documented "adjust state during render when a
 * prop changes" pattern rather than an effect.
 */
export function useMetricKeySelection(allKeys: string[]): [Set<string>, (key: string) => void] {
  const signature = allKeys.join("\u0000");
  const [prevSignature, setPrevSignature] = useState(signature);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(allKeys.slice(0, 3)));

  if (signature !== prevSignature) {
    setPrevSignature(signature);
    setSelected(new Set(allKeys.slice(0, 3)));
  }

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return [selected, toggle];
}

/** Pill-style multi-select for which metric series a chart should draw -
 * without this, a chart with many logged metrics draws every series at
 * once regardless of scale, becoming unreadable. */
export function MetricKeyPicker({
  keys,
  selected,
  onToggle,
}: {
  keys: string[];
  selected: Set<string>;
  onToggle: (key: string) => void;
}) {
  if (keys.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {keys.map((key) => {
        const active = selected.has(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            aria-pressed={active}
            className={cn(
              "rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors",
              active
                ? "border-research-accent bg-research-accent-subtle/15 text-research-ink"
                : "border-research-border text-research-ink-muted hover:border-research-accent-subtle",
            )}
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}
