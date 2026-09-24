"use client";

import type { EChartsCoreOption } from "echarts/core";
import { useMemo } from "react";
import type { TrainingRunMetric } from "@/features/training-runs/types/training-run-metric";
import { EChart } from "./EChart";
import { extractMetricKeys } from "./MetricKeyPicker";
import { MetricsLegend } from "./MetricsLegend";
import { SERIES_COLORS } from "./series-colors";

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

  const sorted = [...metrics].sort((a, b) => a.step - b.step);
  const allKeys = extractMetricKeys(sorted);
  const chartedKeys = selectedKeys ? allKeys.filter((key) => selectedKeys.has(key)) : allKeys;

  return (
    <div className="flex flex-col gap-2">
      {/* Rendered above the canvas, not as the chart's own legend - with
          15+ series selected, ECharts' built-in legend wraps to several
          rows and collides into the plot area's axis labels. An external
          legend can't do that; it just grows the page, and is itself
          capped (MetricsLegend) so it doesn't sprawl unboundedly either. */}
      <MetricsLegend keys={chartedKeys} />
      <EChart option={option} height={height} />
    </div>
  );
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
    // Legend rendered externally by <MetricsLegend> instead (see
    // MetricsLineChart) - ECharts' own legend lives inside this grid box
    // and would collide with the axis labels once it wraps to more than a
    // row or two of series names.
    legend: { show: false },
    grid: { left: 48, right: 16, top: 16, bottom: 32 },
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
      // Padding on the right side pushes tick numbers off the axis line
      // and away from the plot area's left edge - previously flush enough
      // to visually collide with whatever sat just outside the canvas.
      axisLabel: { color: "#71717a", fontSize: 11, padding: [0, 12, 0, 0] },
    },
    series,
  };
}
