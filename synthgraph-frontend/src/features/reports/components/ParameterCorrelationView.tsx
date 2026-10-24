"use client";

import dynamic from "next/dynamic";
import type { EChartsCoreOption } from "echarts/core";
import { useMemo, useState } from "react";
import { SelectField } from "@/components/ui/Field";
import { classifyParameter } from "@/features/experiments/parameter-model";
import { formatMetricValue } from "@/shared/lib/format";
import { compareMetricKeys, metricDirection } from "@/shared/lib/metric-semantics";
import type { ParameterCorrelation, ParameterCorrelationReport } from "../types/report";

const EChart = dynamic(() => import("@/shared/charts/EChart").then((m) => m.EChart), {
  ssr: false,
  loading: () => <div className="h-[200px] animate-pulse rounded-lg bg-surface-2" />,
});

const BAR_COLOR = "#8b5cf6";

export function ParameterCorrelationView({ report }: { report: ParameterCorrelationReport }) {
  const metricKeys = useMemo(
    () =>
      Array.from(
        new Set(report.correlations.flatMap((c) => c.groups.flatMap((g) => Object.keys(g.metrics)))),
      ).sort(compareMetricKeys),
    [report.correlations],
  );
  const [chosen, setChosen] = useState("");
  const metricKey = metricKeys.includes(chosen)
    ? chosen
    : (metricKeys.find((key) => metricDirection(key) !== "neutral") ?? metricKeys[0] ?? "");

  if (report.correlations.length === 0) {
    return (
      <p className="text-[13.5px] text-ink-faint">
        {report.runCount < 2
          ? "Need at least 2 training runs in this experiment to correlate parameters with outcomes."
          : "No varying parameters found across this experiment's training runs."}
      </p>
    );
  }

  // A seed isn't a tuning knob: its "groups" are individual runs, so a bar
  // per seed is just a bar per run. Kept available, but out of the way.
  const knobs = report.correlations.filter((c) => classifyParameter(c.parameterKey) !== "seed");
  const seeds = report.correlations.filter((c) => classifyParameter(c.parameterKey) === "seed");

  return (
    <div className="flex flex-col gap-6">
      <div className="w-full max-w-[280px]">
        <SelectField label="Show average of" value={metricKey} onChange={setChosen} options={metricKeys} />
      </div>

      {knobs.map((correlation) => (
        <CorrelationCard key={correlation.parameterKey} correlation={correlation} metricKey={metricKey} />
      ))}

      {seeds.length > 0 ? (
        <details className="group rounded-lg border border-research-border">
          <summary className="cursor-pointer list-none px-4 py-3 text-[13px] text-research-ink-secondary hover:text-research-ink">
            <span className="mr-2 inline-block text-research-ink-muted transition-transform group-open:rotate-90">▸</span>
            Seed breakdown
            <span className="ml-2 text-research-ink-muted">run-to-run noise, not a tuning parameter</span>
          </summary>
          <div className="flex flex-col gap-6 border-t border-research-border p-4">
            {seeds.map((correlation) => (
              <CorrelationCard key={correlation.parameterKey} correlation={correlation} metricKey={metricKey} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function CorrelationCard({ correlation, metricKey }: { correlation: ParameterCorrelation; metricKey: string }) {
  const allMetricKeys = Array.from(
    new Set(correlation.groups.flatMap((group) => Object.keys(group.metrics))),
  ).sort(compareMetricKeys);
  const singleRunGroups = correlation.groups.every((group) => group.runCount === 1);

  const chartOption = useMemo<EChartsCoreOption>(
    () => ({
      backgroundColor: "transparent",
      textStyle: { fontFamily: "var(--font-sans)" },
      grid: { left: 64, right: 16, top: 16, bottom: 32 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        confine: true,
      backgroundColor: "#18181b",
        borderColor: "#27272a",
        textStyle: { color: "#f4f4f5", fontSize: 12 },
        valueFormatter: (value: number | null) => (value === null ? "—" : formatMetricValue(value)),
      },
      xAxis: {
        type: "category",
        data: correlation.groups.map((g) => g.value),
        axisLine: { lineStyle: { color: "#27272a" } },
        axisLabel: { color: "#a1a1aa", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        scale: true,
        axisLine: { show: false },
        splitLine: { lineStyle: { color: "#1f1f23" } },
        axisLabel: { color: "#71717a", fontSize: 11, formatter: (value: number) => formatMetricValue(value) },
      },
      series: [
        {
          name: metricKey,
          type: "bar",
          data: correlation.groups.map((g) => g.metrics[metricKey]?.avg ?? null),
          itemStyle: { color: BAR_COLOR },
        },
      ],
    }),
    [correlation, metricKey],
  );

  return (
    <div>
      <p className="mb-1 font-mono text-[12px] text-ink">{correlation.parameterKey}</p>
      {singleRunGroups ? (
        <p className="mb-2 text-[12px] text-research-ink-muted">
          Each value was used by one run, so each bar is a single result, not an average, and a gap between bars can&apos;t
          be told apart from run-to-run noise.
        </p>
      ) : null}
      {metricKey ? (
        <div className="mb-4">
          <EChart option={chartOption} height={200} />
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface/60">
              <th scope="col" className="px-3 py-2 text-left font-mono text-[11px] text-ink-faint">
                value
              </th>
              <th scope="col" className="px-3 py-2 text-left font-mono text-[11px] text-ink-faint">
                runs
              </th>
              {allMetricKeys.map((key) => (
                <th key={key} scope="col" className="px-3 py-2 text-left font-mono text-[11px] text-ink-faint">
                  {key} ({singleRunGroups ? "value" : "avg"})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {correlation.groups.map((group) => (
              <tr key={group.value} className="border-b border-line last:border-b-0">
                <td className="px-3 py-2 font-medium text-ink">{group.value}</td>
                <td className="px-3 py-2 text-ink-muted">{group.runCount}</td>
                {allMetricKeys.map((key) => {
                  const stats = group.metrics[key];
                  return (
                    <td key={key} className="px-3 py-2 tabular-nums text-ink" title={stats ? String(stats.avg) : undefined}>
                      {stats ? (
                        <>
                          {formatMetricValue(stats.avg)}
                          {group.runCount > 1 ? (
                            <span className="ml-1.5 text-[11px] text-ink-muted">
                              {formatMetricValue(stats.min)}–{formatMetricValue(stats.max)}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
