"use client";

import dynamic from "next/dynamic";
import type { EChartsCoreOption } from "echarts/core";
import { useMemo } from "react";
import type { ParameterCorrelation, ParameterCorrelationReport } from "../types/report";

const EChart = dynamic(() => import("@/shared/charts/EChart").then((m) => m.EChart), {
  ssr: false,
  loading: () => <div className="h-[220px] animate-pulse rounded-lg bg-surface-2" />,
});

const SERIES_COLORS = ["#37c9de", "#8b5cf6", "#46b97e", "#d9a441", "#5b8dfb", "#d9584c"];

export function ParameterCorrelationView({ report }: { report: ParameterCorrelationReport }) {
  if (report.correlations.length === 0) {
    return (
      <p className="text-[13.5px] text-ink-faint">
        {report.runCount < 2
          ? "Need at least 2 training runs in this experiment to correlate parameters with outcomes."
          : "No varying parameters found across this experiment's training runs."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {report.correlations.map((correlation) => (
        <CorrelationTable key={correlation.parameterKey} correlation={correlation} />
      ))}
    </div>
  );
}

function CorrelationTable({ correlation }: { correlation: ParameterCorrelation }) {
  const metricKeys = Array.from(
    new Set(correlation.groups.flatMap((group) => Object.keys(group.metrics))),
  ).sort();

  const chartOption = useMemo<EChartsCoreOption>(() => {
    // Metrics can live on wildly different scales (e.g. mAP 0-1 vs. reward
    // in the hundreds) - sharing one axis squashes the smaller series to
    // invisibility. Up to 2 metrics get their own axis (a standard
    // dual-axis pattern); beyond that, per-metric axes get visually
    // confusing, so it falls back to one shared axis.
    const dualAxis = metricKeys.length <= 2;

    return {
      backgroundColor: "transparent",
      textStyle: { fontFamily: "var(--font-sans)" },
      grid: { left: 56, right: dualAxis && metricKeys.length === 2 ? 56 : 16, top: 32, bottom: 32 },
      legend: {
        top: 0,
        textStyle: { color: "#a1a1aa", fontSize: 11 },
        icon: "roundRect",
        itemWidth: 10,
        itemHeight: 10,
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "#18181b",
        borderColor: "#27272a",
        textStyle: { color: "#f4f4f5", fontSize: 12 },
      },
      xAxis: {
        type: "category",
        data: correlation.groups.map((g) => g.value),
        axisLine: { lineStyle: { color: "#27272a" } },
        axisLabel: { color: "#a1a1aa", fontSize: 11 },
      },
      yAxis: dualAxis
        ? metricKeys.map((metricKey, index) => ({
            type: "value",
            name: metricKey,
            nameTextStyle: { color: SERIES_COLORS[index % SERIES_COLORS.length], fontSize: 10 },
            position: index === 0 ? "left" : "right",
            axisLine: { show: true, lineStyle: { color: SERIES_COLORS[index % SERIES_COLORS.length] } },
            splitLine: { lineStyle: { color: "#1f1f23" } },
            axisLabel: { color: "#71717a", fontSize: 11 },
          }))
        : {
            type: "value",
            axisLine: { show: false },
            splitLine: { lineStyle: { color: "#1f1f23" } },
            axisLabel: { color: "#71717a", fontSize: 11 },
          },
      series: metricKeys.map((metricKey, index) => ({
        name: metricKey,
        type: "bar",
        yAxisIndex: dualAxis ? index : 0,
        data: correlation.groups.map((g) => g.metrics[metricKey]?.avg ?? null),
        itemStyle: { color: SERIES_COLORS[index % SERIES_COLORS.length] },
      })),
    };
  }, [correlation, metricKeys]);

  return (
    <div>
      <p className="mb-2 font-mono text-[12px] text-ink">{correlation.parameterKey}</p>
      {metricKeys.length > 0 ? (
        <div className="mb-4">
          <EChart option={chartOption} height={220} />
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
              {metricKeys.map((metricKey) => (
                <th
                  key={metricKey}
                  scope="col"
                  className="px-3 py-2 text-left font-mono text-[11px] text-ink-faint"
                >
                  {metricKey} (avg)
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {correlation.groups.map((group) => (
              <tr key={group.value} className="border-b border-line last:border-b-0">
                <td className="px-3 py-2 text-ink">{group.value}</td>
                <td className="px-3 py-2 text-ink-muted">{group.runCount}</td>
                {metricKeys.map((metricKey) => (
                  <td key={metricKey} className="px-3 py-2 text-ink">
                    {group.metrics[metricKey] ? group.metrics[metricKey].avg.toFixed(4) : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
