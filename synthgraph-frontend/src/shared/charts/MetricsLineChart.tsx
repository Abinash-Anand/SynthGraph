"use client";

import type { EChartsCoreOption } from "echarts/core";
import { useMemo } from "react";
import type { TrainingRunMetric } from "@/features/training-runs/types/training-run-metric";
import { EChart } from "./EChart";
import { extractMetricKeys } from "./MetricKeyPicker";

// Cycles through the app's existing design tokens rather than inventing new
// chart colors (same reasoning as the hand-rolled MetricsChart it replaces).
const SERIES_COLORS = [
  "#37c9de", // cyan
  "#8b5cf6", // research accent
  "#46b97e", // ok
  "#d9a441", // warn
  "#5b8dfb", // blue
  "#d9584c", // bad
];

export function MetricsLineChart({
  metrics,
  selectedKeys,
  height = 320,
  logScale = false,
  smoothing = false,
}: {
  metrics: TrainingRunMetric[];
  /** Restricts which series are drawn. Omit to draw every numeric key
   * (the old, unfiltered behavior). */
  selectedKeys?: Set<string>;
  height?: number;
  /** Log-scaled Y axis, useful for loss curves spanning orders of
   * magnitude - falls back to linear if any plotted value is <= 0, since
   * a log axis can't represent those. */
  logScale?: boolean;
  /** Exponential-moving-average smoothing over the raw values, toggled
   * instead of always overlaying both (matches the audit's simple
   * raw/smoothed toggle, not a tunable slider). */
  smoothing?: boolean;
}) {
  const option = useMemo<EChartsCoreOption>(
    () => buildOption(metrics, selectedKeys, logScale, smoothing),
    [metrics, selectedKeys, logScale, smoothing],
  );

  if (metrics.length === 0) {
    return <p className="text-[13.5px] text-research-ink-muted">No step metrics recorded.</p>;
  }

  if (selectedKeys && selectedKeys.size === 0) {
    return <p className="text-[13.5px] text-research-ink-muted">No metrics selected.</p>;
  }

  return <EChart option={option} height={height} />;
}

const SMOOTHING_ALPHA = 0.2;

function smoothValues(values: (number | null)[]): (number | null)[] {
  let ema: number | null = null;
  return values.map((value) => {
    if (value === null) return ema;
    ema = ema === null ? value : SMOOTHING_ALPHA * value + (1 - SMOOTHING_ALPHA) * ema;
    return ema;
  });
}

function buildOption(
  metrics: TrainingRunMetric[],
  selectedKeys: Set<string> | undefined,
  logScale: boolean,
  smoothing: boolean,
): EChartsCoreOption {
  const sorted = [...metrics].sort((a, b) => a.step - b.step);
  const steps = Array.from(new Set(sorted.map((m) => m.step))).sort((a, b) => a - b);

  const allKeys = extractMetricKeys(sorted);
  const metricKeys = selectedKeys ? allKeys.filter((key) => selectedKeys.has(key)) : allKeys;

  const valueByStepAndKey = new Map<number, Record<string, number>>();
  for (const row of sorted) {
    valueByStepAndKey.set(row.step, row.metrics as Record<string, number>);
  }

  const series = metricKeys.map((key, index) => {
    const raw = steps.map((step) => valueByStepAndKey.get(step)?.[key] ?? null);
    return {
      name: key,
      type: "line" as const,
      showSymbol: false,
      lineStyle: { width: 2, color: SERIES_COLORS[index % SERIES_COLORS.length] },
      itemStyle: { color: SERIES_COLORS[index % SERIES_COLORS.length] },
      data: smoothing ? smoothValues(raw) : raw,
      connectNulls: true,
    };
  });

  const plottedValues = series.flatMap((s) => s.data).filter((v): v is number => v !== null);
  const useLogAxis = logScale && plottedValues.length > 0 && plottedValues.every((v) => v > 0);

  return {
    backgroundColor: "transparent",
    textStyle: { fontFamily: "var(--font-sans)" },
    grid: { left: 48, right: 16, top: 36, bottom: 32 },
    legend: {
      top: 0,
      textStyle: { color: "#a1a1aa", fontSize: 11 },
      icon: "roundRect",
      itemWidth: 10,
      itemHeight: 10,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "#18181b",
      borderColor: "#27272a",
      textStyle: { color: "#f4f4f5", fontSize: 12 },
    },
    xAxis: {
      type: "category",
      name: "step",
      nameLocation: "middle",
      nameGap: 24,
      nameTextStyle: { color: "#71717a", fontSize: 11 },
      data: steps,
      axisLine: { lineStyle: { color: "#27272a" } },
      axisLabel: { color: "#71717a", fontSize: 11 },
    },
    yAxis: {
      type: useLogAxis ? "log" : "value",
      axisLine: { show: false },
      splitLine: { lineStyle: { color: "#1f1f23" } },
      axisLabel: { color: "#71717a", fontSize: 11 },
    },
    series,
  };
}
