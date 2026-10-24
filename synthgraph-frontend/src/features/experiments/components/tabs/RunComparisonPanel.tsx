"use client";

import dynamic from "next/dynamic";
import type { EChartsCoreOption } from "echarts/core";
import { useMemo, useState } from "react";
import { SelectField } from "@/components/ui/Field";
import { cn } from "@/lib/utils";
import { extractMetricKeys } from "@/shared/charts/MetricKeyPicker";
import {
  aggregateRuns,
  domainIndexOf,
  parseCheckpointStep,
  preferredSeriesKeys,
  splitStepDomains,
} from "@/shared/charts/metric-series";
import { SERIES_COLORS } from "@/shared/charts/series-colors";
import { formatMetricValue } from "@/shared/lib/format";
import { compareMetricKeys, directionLabel, metricDirection } from "@/shared/lib/metric-semantics";
import { bestEvaluationValue, outcomeMetricKeys, preferredOutcomeKey } from "../../outcomes";
import type { EnrichedTrainingRun } from "../../types/experiment-workspace";

const EChart = dynamic(() => import("@/shared/charts/EChart").then((m) => m.EChart), {
  ssr: false,
  loading: () => <div className="h-[280px] animate-pulse rounded-xl bg-research-panel" />,
});

const AXIS = { color: "#71717a", fontSize: 11 };
const TOOLTIP = {
  confine: true,
      backgroundColor: "#18181b",
  borderColor: "#27272a",
  textStyle: { color: "#f4f4f5", fontSize: 12 },
};
const MEAN_COLOR = "#f4f4f5";

type RunSeries = { id: string; name: string; color: string; points: Array<[number, number]> };

const SMOOTHING_ALPHA = 0.2;
function smooth(points: Array<[number, number]>): Array<[number, number]> {
  let ema: number | null = null;
  return points.map(([step, value]) => {
    ema = ema === null ? value : SMOOTHING_ALPHA * value + (1 - SMOOTHING_ALPHA) * ema;
    return [step, ema];
  });
}

function seriesFor(runs: EnrichedTrainingRun[], metricKey: string, smoothing: boolean): RunSeries[] {
  return runs.map((r, index) => {
    const raw = [...r.metrics]
      .filter((row) => typeof row.metrics[metricKey] === "number")
      .sort((a, b) => a.step - b.step)
      .map((row): [number, number] => [row.step, row.metrics[metricKey] as number]);
    return {
      id: r.run.id,
      name: r.run.name,
      color: SERIES_COLORS[index % SERIES_COLORS.length],
      points: smoothing ? smooth(raw) : raw,
    };
  });
}

function RunChips({
  series,
  hidden,
  onToggle,
}: {
  series: RunSeries[];
  hidden: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {series.map((s) => {
        const off = hidden.has(s.id);
        return (
          <button
            key={s.id}
            type="button"
            aria-pressed={!off}
            onClick={() => onToggle(s.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors",
              off
                ? "border-research-border text-research-ink-muted/60"
                : "border-research-border text-research-ink-secondary hover:border-research-accent-subtle",
            )}
          >
            <span
              aria-hidden
              className="size-2 rounded-sm"
              style={{ backgroundColor: off ? "transparent" : s.color, border: `1px solid ${s.color}` }}
            />
            {s.name}
          </button>
        );
      })}
    </div>
  );
}

function useHidden(): [Set<string>, (id: string) => void] {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return [hidden, toggle];
}

function ToggleChip({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors",
        checked
          ? "border-research-accent bg-research-accent-subtle/15 text-research-ink"
          : "border-research-border text-research-ink-muted hover:border-research-accent-subtle",
      )}
    >
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      {label}
    </label>
  );
}

/* ───────────────────────── training curves ───────────────────────── */

function overlayOption(series: RunSeries[], showBand: boolean, domain: { from: number; to: number }): EChartsCoreOption {
  const single = domain.from === domain.to;
  const inDomain = (step: number) => step >= domain.from && step <= domain.to;
  const visible = series.map((s) => ({ ...s, points: s.points.filter(([step]) => inDomain(step)) }));
  const band = showBand ? aggregateRuns(visible.map((s) => s.points)) : [];
  const symbols = new Set(visible.flatMap((s) => s.points.map(([step]) => step))).size <= 12;

  return {
    backgroundColor: "transparent",
    textStyle: { fontFamily: "var(--font-sans)" },
    legend: { show: false },
    grid: { left: 56, right: 24, top: 16, bottom: 36 },
    tooltip: {
      ...TOOLTIP,
      trigger: "axis",
      valueFormatter: (value: unknown) => (typeof value === "number" ? formatMetricValue(value) : "—"),
    },
    xAxis: {
      type: "value",
      name: "step",
      nameLocation: "middle",
      nameGap: 24,
      nameTextStyle: AXIS,
      min: single ? domain.from - 1 : domain.from,
      max: single ? domain.to + 1 : domain.to,
      minInterval: 1,
      axisLine: { lineStyle: { color: "#27272a" } },
      splitLine: { show: false },
      axisLabel: { ...AXIS, formatter: (v: number) => formatMetricValue(v) },
    },
    yAxis: {
      type: "value",
      scale: true,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: "#1f1f23" } },
      axisLabel: { ...AXIS, padding: [0, 12, 0, 0], formatter: (v: number) => formatMetricValue(v) },
    },
    series: [
      ...(band.length > 0
        ? [
            {
              name: "band-base",
              type: "line",
              stack: "band",
              silent: true,
              symbol: "none",
              lineStyle: { opacity: 0 },
              tooltip: { show: false },
              data: band.map((b) => [b.step, b.low]),
            },
            {
              name: "±1 std",
              type: "line",
              stack: "band",
              silent: true,
              symbol: "none",
              lineStyle: { opacity: 0 },
              areaStyle: { color: MEAN_COLOR, opacity: 0.12 },
              tooltip: { show: false },
              data: band.map((b) => [b.step, b.high - b.low]),
            },
            {
              name: "mean",
              type: "line",
              symbol: "none",
              lineStyle: { width: 2.5, color: MEAN_COLOR },
              itemStyle: { color: MEAN_COLOR },
              z: 5,
              data: band.map((b) => [b.step, b.mean]),
            },
          ]
        : []),
      ...visible
        .filter((s) => s.points.length > 0)
        .map((s) => ({
          name: s.name,
          type: "line",
          showSymbol: symbols,
          symbolSize: 6,
          lineStyle: { width: showBand ? 1.25 : 2, color: s.color, opacity: showBand ? 0.7 : 1 },
          itemStyle: { color: s.color },
          data: s.points,
        })),
    ],
  };
}

function TrainingCurves({ runs }: { runs: EnrichedTrainingRun[] }) {
  const keys = useMemo(() => {
    const all = new Set<string>();
    for (const r of runs) for (const key of extractMetricKeys(r.metrics)) all.add(key);
    return Array.from(all).sort(compareMetricKeys);
  }, [runs]);
  const [chosen, setChosen] = useState("");
  const metricKey = keys.includes(chosen) ? chosen : (preferredSeriesKeys(keys, 1)[0] ?? "");
  const [smoothing, setSmoothing] = useState(false);
  const [showBand, setShowBand] = useState(true);
  const [hidden, toggle] = useHidden();

  const series = useMemo(() => seriesFor(runs, metricKey, smoothing), [runs, metricKey, smoothing]);
  const live = series.filter((s) => !hidden.has(s.id) && s.points.length > 0);
  const domains = useMemo(
    () => splitStepDomains(live.flatMap((s) => s.points.map(([step]) => step))),
    [live],
  );
  const direction = metricDirection(metricKey);

  const rows = live.map((s) => {
    const values = s.points.map(([, v]) => v);
    const best = direction === "lower" ? Math.min(...values) : Math.max(...values);
    return { ...s, last: values[values.length - 1], best, steps: s.points[s.points.length - 1][0] };
  });
  const canBand = live.length >= 2;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-[360px]">
          <SelectField label="Metric" value={metricKey} onChange={setChosen} options={keys} />
        </div>
        <div className="flex shrink-0 gap-1.5">
          <ToggleChip label="Smoothed" checked={smoothing} onChange={setSmoothing} />
          {canBand ? <ToggleChip label="Mean ± std" checked={showBand} onChange={setShowBand} /> : null}
        </div>
      </div>

      <RunChips series={series.filter((s) => s.points.length > 0)} hidden={hidden} onToggle={toggle} />

      {live.length === 0 ? (
        <p className="text-[13.5px] text-research-ink-muted">No run recorded {metricKey}.</p>
      ) : (
        domains.map((domain) => {
          const count = new Set(
            live.flatMap((s) => s.points.map(([step]) => step)).filter((step) => domainIndexOf(domains, step) === domains.indexOf(domain)),
          ).size;
          return (
            <div key={`${domain.from}-${domain.to}`} className="flex flex-col gap-1">
              {domains.length > 1 ? (
                <p className="font-mono text-[11px] text-research-ink-muted">
                  {domain.from === domain.to
                    ? `Step ${formatMetricValue(domain.from)}`
                    : `Steps ${formatMetricValue(domain.from)}–${formatMetricValue(domain.to)}`}{" "}
                  · {count} logged · separate scale
                </p>
              ) : null}
              <EChart option={overlayOption(live, showBand && canBand, domain)} height={domains.length > 1 && count <= 3 ? 220 : 300} />
            </div>
          );
        })
      )}

      {showBand && canBand ? (
        <p className="text-[12px] text-research-ink-muted">
          The white line is the mean across runs and the shaded band is one standard deviation, drawn only at steps
          where at least two runs reported. With {live.length} runs this describes how much the runs disagree; it
          isn&apos;t a confidence interval.
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-research-border">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-research-border bg-research-panel">
                <th className="px-3 py-2.5 text-left font-mono text-[11px] text-research-ink-muted">run</th>
                <th className="px-3 py-2.5 text-left font-mono text-[11px] text-research-ink-muted">last</th>
                <th className="px-3 py-2.5 text-left font-mono text-[11px] text-research-ink-muted">
                  {direction === "lower" ? "lowest" : direction === "higher" ? "highest" : "max"}
                </th>
                <th className="px-3 py-2.5 text-left font-mono text-[11px] text-research-ink-muted">last step</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-research-border last:border-b-0">
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-2 text-research-ink">
                      <span aria-hidden className="size-2 rounded-sm" style={{ backgroundColor: row.color }} />
                      {row.name}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono tabular-nums text-research-ink" title={String(row.last)}>
                    {formatMetricValue(row.last)}
                  </td>
                  <td className="px-3 py-2.5 font-mono tabular-nums text-research-ink-secondary" title={String(row.best)}>
                    {formatMetricValue(row.best)}
                  </td>
                  <td className="px-3 py-2.5 font-mono tabular-nums text-research-ink-muted">{formatMetricValue(row.steps)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

/* ───────────────────── evaluation checkpoints ───────────────────── */

type CheckpointRun = { id: string; name: string; color: string; points: Array<[number, number]> };

function checkpointSeries(runs: EnrichedTrainingRun[], metricKey: string): { series: CheckpointRun[]; parsed: boolean } {
  let parsed = true;
  const series = runs.map((r, index): CheckpointRun => {
    const rows = r.evaluations
      .map((evaluation, order) => {
        const value = evaluation.metrics[metricKey];
        if (typeof value !== "number" || !Number.isFinite(value)) return null;
        const step = parseCheckpointStep(evaluation.name);
        if (step === null) parsed = false;
        return { step: step ?? order, value };
      })
      .filter((row): row is { step: number; value: number } => row !== null)
      .sort((a, b) => a.step - b.step);
    return {
      id: r.run.id,
      name: r.run.name,
      color: SERIES_COLORS[index % SERIES_COLORS.length],
      points: rows.map((row): [number, number] => [row.step, row.value]),
    };
  });
  return { series, parsed };
}

function EvaluationCheckpoints({ runs }: { runs: EnrichedTrainingRun[] }) {
  const keys = useMemo(() => outcomeMetricKeys(runs), [runs]);
  const [chosen, setChosen] = useState("");
  const metricKey = keys.includes(chosen) ? chosen : preferredOutcomeKey(keys);
  const [hidden, toggle] = useHidden();

  const { series, parsed } = useMemo(() => checkpointSeries(runs, metricKey), [runs, metricKey]);
  const withData = series.filter((s) => s.points.length > 0);
  const live = withData.filter((s) => !hidden.has(s.id));

  const option = useMemo<EChartsCoreOption>(
    () => ({
      backgroundColor: "transparent",
      textStyle: { fontFamily: "var(--font-sans)" },
      legend: { show: false },
      grid: { left: 64, right: 24, top: 16, bottom: 36 },
      tooltip: {
        ...TOOLTIP,
        trigger: "axis",
        valueFormatter: (value: unknown) => (typeof value === "number" ? formatMetricValue(value) : "—"),
      },
      xAxis: {
        type: "value",
        name: parsed ? "checkpoint step" : "evaluation order",
        nameLocation: "middle",
        nameGap: 24,
        nameTextStyle: AXIS,
        scale: true,
        axisLine: { lineStyle: { color: "#27272a" } },
        splitLine: { show: false },
        axisLabel: { ...AXIS, formatter: (v: number) => formatMetricValue(v) },
      },
      yAxis: {
        type: "value",
        scale: true,
        axisLine: { show: false },
        splitLine: { lineStyle: { color: "#1f1f23" } },
        axisLabel: { ...AXIS, formatter: (v: number) => formatMetricValue(v) },
      },
      series: live.map((s) => ({
        name: s.name,
        type: "line",
        symbolSize: 8,
        lineStyle: { width: 2, color: s.color },
        itemStyle: { color: s.color },
        data: s.points,
      })),
    }),
    [live, parsed],
  );

  if (keys.length === 0) {
    return (
      <p className="text-[13.5px] text-research-ink-muted">
        No evaluation results with an outcome metric yet.
      </p>
    );
  }

  const direction = metricDirection(metricKey);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-[360px]">
          <SelectField label="Evaluation metric" value={metricKey} onChange={setChosen} options={keys} />
        </div>
        <p className="max-w-[48ch] text-[12px] text-research-ink-muted">
          How each run scored at each evaluation checkpoint ({directionLabel(direction)}
          {direction === "neutral" ? "" : ", inferred"}).
          {parsed ? "" : " Checkpoint steps couldn't be read from the evaluation names, so they're shown in order."}
        </p>
      </div>
      <RunChips series={withData} hidden={hidden} onToggle={toggle} />
      {live.length === 0 ? (
        <p className="text-[13.5px] text-research-ink-muted">No run recorded {metricKey} in an evaluation.</p>
      ) : (
        <EChart option={option} height={260} />
      )}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-research-ink-muted">
        {runs.map((r, index) => {
          const best = metricKey ? bestEvaluationValue(r, metricKey, direction) : null;
          return (
            <span key={r.run.id} className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2 rounded-sm" style={{ backgroundColor: SERIES_COLORS[index % SERIES_COLORS.length] }} />
              {r.run.name}: best {best === null ? "—" : formatMetricValue(best)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function RunComparisonPanel({ runs }: { runs: EnrichedTrainingRun[] }) {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h3 className="mono-label text-research-ink-muted">Training curves, one line per run</h3>
        <TrainingCurves runs={runs} />
      </section>
      <section className="flex flex-col gap-3">
        <h3 className="mono-label text-research-ink-muted">Evaluation checkpoints</h3>
        <EvaluationCheckpoints runs={runs} />
      </section>
    </div>
  );
}
