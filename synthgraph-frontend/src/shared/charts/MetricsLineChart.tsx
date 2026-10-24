"use client";

import type { EChartsCoreOption } from "echarts/core";
import { useMemo } from "react";
import type { TrainingRunMetric } from "@/features/training-runs/types/training-run-metric";
import { formatMetricValue } from "@/shared/lib/format";
import { EChart } from "./EChart";
import { extractMetricKeys } from "./MetricKeyPicker";
import { MetricsLegend } from "./MetricsLegend";
import {
  domainIndexOf,
  normalizeValues,
  type Range,
  rangeOf,
  scalesDiverge,
  splitStepDomains,
  type StepDomain,
} from "./metric-series";
import { SERIES_COLORS } from "./series-colors";

const SYMBOL_STEP_LIMIT = 12;

export function MetricsLineChart({
  metrics,
  selectedKeys,
  height = 320,
  logScale = false,
  smoothing = false,
  normalize = false,
  onSuggestNormalize,
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
  /** Rescales every series onto 0..1 so shapes are comparable when the raw
   * scales differ wildly; the tooltip still shows the real values. */
  normalize?: boolean;
  /** Called with the suggestion when the plotted series' scales diverge
   * and normalize is off, so the owner can offer a one-click fix. */
  onSuggestNormalize?: () => void;
}) {
  const model = useMemo(() => buildModel(metrics, selectedKeys), [metrics, selectedKeys]);

  if (metrics.length === 0) {
    return <p className="text-[13.5px] text-research-ink-muted">No step metrics recorded.</p>;
  }

  if (selectedKeys && selectedKeys.size === 0) {
    return <p className="text-[13.5px] text-research-ink-muted">No metrics selected.</p>;
  }

  const diverging = !normalize && scalesDiverge(Array.from(model.ranges.values()));

  return (
    <div className="flex flex-col gap-3">
      {/* Rendered above the canvas, not as the chart's own legend - with
          15+ series selected, ECharts' built-in legend wraps to several
          rows and collides into the plot area's axis labels. An external
          legend can't do that; it just grows the page, and is itself
          capped (MetricsLegend) so it doesn't sprawl unboundedly either. */}
      <MetricsLegend keys={model.keys} />

      {diverging && onSuggestNormalize ? (
        <p className="rounded-lg border border-research-border bg-research-panel px-3 py-2 text-[12.5px] text-research-ink-secondary">
          These series are on very different scales, so the smaller ones flatten out.{" "}
          <button
            type="button"
            onClick={onSuggestNormalize}
            className="inline-block py-1.5 text-research-accent-hover underline underline-offset-2 hover:text-research-accent"
          >
            Normalize to compare their shapes
          </button>
        </p>
      ) : null}

      {model.domains.map((domain, index) => (
        <DomainChart
          key={`${domain.from}-${domain.to}`}
          metrics={metrics}
          model={model}
          domain={domain}
          domainIndex={index}
          showHeading={model.domains.length > 1}
          height={height}
          logScale={logScale}
          smoothing={smoothing}
          normalize={normalize}
        />
      ))}
    </div>
  );
}

type Model = {
  keys: string[];
  domains: StepDomain[];
  /** Per-key range across every domain, so normalising is consistent between panels. */
  ranges: Map<string, Range>;
};

function buildModel(metrics: TrainingRunMetric[], selectedKeys: Set<string> | undefined): Model {
  const sorted = [...metrics].sort((a, b) => a.step - b.step);
  const allKeys = extractMetricKeys(sorted);
  const keys = selectedKeys ? allKeys.filter((key) => selectedKeys.has(key)) : allKeys;

  // Only steps where a charted key actually has a value shape the domains,
  // so an unselected series can't introduce a scale break.
  const chartedSteps = sorted
    .filter((row) => keys.some((key) => typeof row.metrics[key] === "number"))
    .map((row) => row.step);

  const ranges = new Map<string, Range>();
  for (const key of keys) {
    const range = rangeOf(
      sorted.map((row) => row.metrics[key]).filter((v): v is number => typeof v === "number"),
    );
    if (range) ranges.set(key, range);
  }

  return { keys, domains: splitStepDomains(chartedSteps), ranges };
}

function domainLabel(domain: StepDomain): string {
  return domain.from === domain.to
    ? `Step ${formatMetricValue(domain.from)}`
    : `Steps ${formatMetricValue(domain.from)}–${formatMetricValue(domain.to)}`;
}

function DomainChart({
  metrics,
  model,
  domain,
  domainIndex,
  showHeading,
  height,
  logScale,
  smoothing,
  normalize,
}: {
  metrics: TrainingRunMetric[];
  model: Model;
  domain: StepDomain;
  domainIndex: number;
  showHeading: boolean;
  height: number;
  logScale: boolean;
  smoothing: boolean;
  normalize: boolean;
}) {
  const option = useMemo(
    () => buildOption(metrics, model, domain, domainIndex, logScale, smoothing, normalize),
    [metrics, model, domain, domainIndex, logScale, smoothing, normalize],
  );

  const pointCount = useMemo(
    () => new Set(metrics.filter((m) => domainIndexOf(model.domains, m.step) === domainIndex).map((m) => m.step)).size,
    [metrics, model.domains, domainIndex],
  );

  return (
    <div className="flex flex-col gap-1">
      {showHeading ? (
        <p className="font-mono text-[11px] text-research-ink-muted">
          {domainLabel(domain)}
          <span className="ml-2 text-research-ink-muted/70">
            {pointCount} logged {pointCount === 1 ? "point" : "points"} · separate scale, not comparable to the other panel
          </span>
        </p>
      ) : null}
      <EChart option={option} height={showHeading && pointCount <= 3 ? Math.round(height * 0.7) : height} />
    </div>
  );
}

const SMOOTHING_ALPHA = 0.2;

function smoothValues(values: number[]): number[] {
  let ema: number | null = null;
  return values.map((value) => {
    ema = ema === null ? value : SMOOTHING_ALPHA * value + (1 - SMOOTHING_ALPHA) * ema;
    return ema;
  });
}

function buildOption(
  metrics: TrainingRunMetric[],
  model: Model,
  domain: StepDomain,
  domainIndex: number,
  logScale: boolean,
  smoothing: boolean,
  normalize: boolean,
): EChartsCoreOption {
  const rows = [...metrics]
    .filter((row) => domainIndexOf(model.domains, row.step) === domainIndex)
    .sort((a, b) => a.step - b.step);
  const showSymbols = new Set(rows.map((r) => r.step)).size <= SYMBOL_STEP_LIMIT;

  const series = model.keys
    .map((key, index) => {
      const points = rows
        .filter((row) => typeof row.metrics[key] === "number")
        .map((row) => ({ step: row.step, value: row.metrics[key] as number }));
      if (points.length === 0) return null;

      const original = smoothing ? smoothValues(points.map((p) => p.value)) : points.map((p) => p.value);
      const plotted = normalize ? normalizeValues(original, model.ranges.get(key) ?? null) : original;
      const color = SERIES_COLORS[index % SERIES_COLORS.length];
      return {
        name: key,
        type: "line" as const,
        showSymbol: showSymbols,
        symbolSize: 6,
        lineStyle: { width: 2, color },
        itemStyle: { color },
        encode: { x: 0, y: 1 },
        // [step, plotted value, original value] - the tooltip reads the
        // third so normalising never hides the real number.
        data: points.map((p, i) => [p.step, plotted[i], original[i]]),
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const plottedValues = series.flatMap((s) => s.data.map((d) => d[1])).filter((v): v is number => typeof v === "number");
  const useLogAxis = !normalize && logScale && plottedValues.length > 0 && plottedValues.every((v) => v > 0);
  const single = domain.from === domain.to;

  return {
    backgroundColor: "transparent",
    textStyle: { fontFamily: "var(--font-sans)" },
    // Legend rendered externally by <MetricsLegend> instead (see
    // MetricsLineChart) - ECharts' own legend lives inside this grid box
    // and would collide with the axis labels once it wraps to more than a
    // row or two of series names.
    legend: { show: false },
    grid: { left: 56, right: 24, top: 16, bottom: 36 },
    tooltip: {
      trigger: "axis",
      confine: true,
      backgroundColor: "#18181b",
      borderColor: "#27272a",
      textStyle: { color: "#f4f4f5", fontSize: 12 },
      formatter: (params: unknown) => {
        const items = params as Array<{ seriesName: string; color: string; value: [number, number, number] }>;
        if (items.length === 0) return "";
        const header = `step ${formatMetricValue(items[0].value[0])}`;
        const lines = items.map(
          (item) =>
            `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${item.color};margin-right:6px"></span>${item.seriesName}: <b>${formatMetricValue(item.value[2])}</b>`,
        );
        return [header, ...lines].join("<br/>");
      },
    },
    xAxis: {
      type: "value",
      name: "step",
      nameLocation: "middle",
      nameGap: 24,
      nameTextStyle: { color: "#71717a", fontSize: 11 },
      // A single logged step has no range to span; pad it so the point sits
      // mid-axis instead of on the edge.
      min: single ? domain.from - 1 : domain.from,
      max: single ? domain.to + 1 : domain.to,
      minInterval: 1,
      axisLine: { lineStyle: { color: "#27272a" } },
      splitLine: { show: false },
      axisLabel: { color: "#71717a", fontSize: 11, formatter: (value: number) => formatMetricValue(value) },
    },
    yAxis: {
      type: useLogAxis ? "log" : "value",
      scale: !normalize,
      min: normalize ? -0.02 : undefined,
      max: normalize ? 1.02 : undefined,
      name: normalize ? "normalized (0–1 per series)" : undefined,
      nameTextStyle: { color: "#71717a", fontSize: 10, align: "left" },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: "#1f1f23" } },
      // Padding on the right side pushes tick numbers off the axis line
      // and away from the plot area's left edge - previously flush enough
      // to visually collide with whatever sat just outside the canvas.
      axisLabel: {
        color: "#71717a",
        fontSize: 11,
        padding: [0, 12, 0, 0],
        formatter: (value: number) => (normalize ? String(value) : formatMetricValue(value)),
      },
    },
    series,
  };
}
