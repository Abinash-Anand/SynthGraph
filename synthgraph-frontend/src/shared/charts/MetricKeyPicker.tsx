"use client";

import { useMemo, useState } from "react";
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

type MetricCategory = "rewards" | "accuracy" | "policy" | "system" | "other";

const CATEGORY_ORDER: MetricCategory[] = ["rewards", "accuracy", "policy", "system", "other"];

const CATEGORY_LABELS: Record<MetricCategory, string> = {
  rewards: "Rewards & Returns",
  accuracy: "Accuracy & Detection",
  policy: "Policy & Losses",
  system: "System Telemetry",
  other: "Other",
};

/**
 * Metric keys are free-form JSONB set by whatever SDK/trainer logged them
 * (RL loops, CV training scripts, custom harnesses) - there's no schema to
 * read a category from, so this buckets by naming convention instead.
 * Checked in this order (first match wins) so e.g. a reward sub-metric
 * ending in "_std" lands in Rewards rather than being pulled into Policy by
 * a looser "std" match meant for policy-distribution stats.
 */
function classifyMetricKey(key: string): MetricCategory {
  const lower = key.toLowerCase();

  if (lower.includes("reward") || lower.includes("episode")) return "rewards";
  if (lower.includes("accuracy") || lower.startsWith("metrics/")) return "accuracy";
  if (
    lower.includes("loss") ||
    lower.includes("entropy") ||
    lower.includes("policy") ||
    lower.includes("kl") ||
    lower.includes("clip") ||
    lower.includes("gradient") ||
    lower.includes("learning_rate") ||
    lower.startsWith("lr/") ||
    lower.includes("variance") ||
    lower.includes("std")
  ) {
    return "policy";
  }
  if (
    lower.includes("cpu") ||
    lower.includes("gpu") ||
    lower.includes("memory") ||
    lower.includes("walltime") ||
    lower.includes("time") ||
    lower.includes("sps") ||
    lower.includes("epoch") ||
    lower.includes("n_updates")
  ) {
    return "system";
  }
  return "other";
}

function groupByCategory(keys: string[]): Map<MetricCategory, string[]> {
  const groups = new Map<MetricCategory, string[]>();
  for (const key of keys) {
    const category = classifyMetricKey(key);
    const group = groups.get(category);
    if (group) group.push(key);
    else groups.set(category, [key]);
  }
  return groups;
}

/** Pill-style multi-select for which metric series a chart should draw,
 * grouped into collapsible categories with a search filter - a flat list of
 * 30+ raw metric keys (routine for an RL run logging per-limb reward terms,
 * or a CV run logging box/cls/dfl losses) becomes an unreadable, overflowing
 * wall of chips otherwise. */
export function MetricKeyPicker({
  keys,
  selected,
  onToggle,
}: {
  keys: string[];
  selected: Set<string>;
  onToggle: (key: string) => void;
}) {
  const [query, setQuery] = useState("");
  // Manually-toggled open/closed state, seeded once so whichever category
  // holds the default-selected keys starts expanded instead of every
  // category defaulting open (defeating the point) or closed (hiding the
  // active selection).
  const [openCategories, setOpenCategories] = useState<Set<MetricCategory>>(() => {
    const initial = new Set<MetricCategory>();
    for (const key of selected) initial.add(classifyMetricKey(key));
    return initial;
  });

  const grouped = useMemo(() => groupByCategory(keys), [keys]);
  const trimmedQuery = query.trim().toLowerCase();
  const isSearching = trimmedQuery.length > 0;

  if (keys.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={`Filter ${keys.length} metrics…`}
        className="w-full max-w-[280px] rounded-md border border-research-border bg-research-bg px-3 py-1.5 text-[12.5px] text-research-ink placeholder:text-research-ink-muted focus:border-research-accent-subtle focus:outline-none"
      />

      <div className="flex max-h-[320px] flex-col gap-1 overflow-y-auto rounded-lg border border-research-border p-1.5">
        {CATEGORY_ORDER.map((category) => {
          const categoryKeys = grouped.get(category);
          if (!categoryKeys || categoryKeys.length === 0) return null;

          const visibleKeys = isSearching
            ? categoryKeys.filter((key) => key.toLowerCase().includes(trimmedQuery))
            : categoryKeys;
          if (visibleKeys.length === 0) return null;

          const selectedCount = categoryKeys.filter((key) => selected.has(key)).length;
          const isOpen = isSearching ? true : openCategories.has(category);

          return (
            <details
              key={category}
              open={isOpen}
              // While searching, `open` is forced true and the summary's
              // own click is suppressed below - so this only ever fires
              // (and only ever needs to sync state) outside of search.
              onToggle={(event) => {
                if (isSearching) return;
                const nowOpen = event.currentTarget.open;
                setOpenCategories((prev) => {
                  const next = new Set(prev);
                  if (nowOpen) next.add(category);
                  else next.delete(category);
                  return next;
                });
              }}
              className="rounded-md"
            >
              <summary
                onClick={(event) => {
                  // Forced open while searching - block the native toggle
                  // so a stray click can't close it out from under the
                  // filtered results.
                  if (isSearching) event.preventDefault();
                }}
                className="flex cursor-pointer list-none items-center gap-2 rounded-md px-1.5 py-1 text-[11.5px] text-research-ink-muted hover:text-research-ink-secondary [&::-webkit-details-marker]:hidden"
              >
                <span className="font-mono">{isOpen ? "▾" : "▸"}</span>
                <span className="mono-label">{CATEGORY_LABELS[category]}</span>
                <span className="text-research-ink-muted">
                  ({selectedCount > 0 ? `${selectedCount}/` : ""}
                  {visibleKeys.length})
                </span>
              </summary>
              <div className="flex max-h-[180px] flex-wrap gap-1.5 overflow-y-auto px-1.5 py-1.5">
                {visibleKeys.map((key) => {
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
            </details>
          );
        })}
      </div>
    </div>
  );
}
