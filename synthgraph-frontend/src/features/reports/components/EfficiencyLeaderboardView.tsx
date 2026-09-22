"use client";

import dynamic from "next/dynamic";
import type { EChartsCoreOption } from "echarts/core";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { SelectField } from "@/components/ui/Field";
import type { EfficiencyLeaderboard } from "../types/report";

const EChart = dynamic(() => import("@/shared/charts/EChart").then((m) => m.EChart), {
  ssr: false,
  loading: () => <div className="h-[280px] animate-pulse rounded-lg bg-surface-2" />,
});

function formatDuration(seconds: number): string {
  const hours = seconds / 3600;
  if (hours >= 1) return `${hours.toFixed(1)}h`;
  const minutes = seconds / 60;
  if (minutes >= 1) return `${minutes.toFixed(1)}m`;
  return `${seconds}s`;
}

// Deliberately client-side: which metric matters and whether higher is
// "better" is a per-researcher, per-metric judgment call the backend
// can't make - it just hands over duration + every evaluation.
export function EfficiencyLeaderboardView({ leaderboard }: { leaderboard: EfficiencyLeaderboard }) {
  const metricKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const run of leaderboard.runs) {
      for (const evaluation of run.evaluations) {
        for (const [key, value] of Object.entries(evaluation.metrics)) {
          if (typeof value === "number") keys.add(key);
        }
      }
    }
    return Array.from(keys).sort();
  }, [leaderboard.runs]);

  const [metricKey, setMetricKey] = useState(metricKeys[0] ?? "");
  const activeMetricKey = metricKeys.includes(metricKey) ? metricKey : (metricKeys[0] ?? "");

  const rows = useMemo(() => {
    return leaderboard.runs
      .map((run) => {
        const values = run.evaluations
          .map((evaluation) => evaluation.metrics[activeMetricKey])
          .filter((value): value is number => typeof value === "number");
        const bestValue = values.length > 0 ? Math.max(...values) : null;
        // A sub-second duration (rapid test data, or a genuinely
        // instantaneous run) would otherwise divide by ~0 and produce a
        // misleading Infinity that sorts above every real result.
        const perHour =
          bestValue !== null && run.durationSeconds > 0
            ? bestValue / (run.durationSeconds / 3600)
            : null;
        return { run, bestValue, perHour };
      })
      .sort((a, b) => (b.perHour ?? -Infinity) - (a.perHour ?? -Infinity));
  }, [leaderboard.runs, activeMetricKey]);

  const scatterOption = useMemo<EChartsCoreOption>(() => {
    const points = rows
      .filter((r) => r.bestValue !== null)
      .map((r) => ({
        value: [r.run.durationSeconds / 3600, r.bestValue],
        name: r.run.name,
      }));
    return {
      backgroundColor: "transparent",
      textStyle: { fontFamily: "var(--font-sans)" },
      grid: { left: 56, right: 24, top: 20, bottom: 40 },
      tooltip: {
        trigger: "item",
        backgroundColor: "#18181b",
        borderColor: "#27272a",
        textStyle: { color: "#f4f4f5", fontSize: 12 },
        formatter: (params: unknown) => {
          const p = params as { name: string; value: [number, number] };
          return `${p.name}<br/>${p.value[0].toFixed(2)}h · ${activeMetricKey} ${p.value[1].toFixed(4)}`;
        },
      },
      xAxis: {
        type: "value",
        name: "duration (hours)",
        nameLocation: "middle",
        nameGap: 28,
        nameTextStyle: { color: "#71717a", fontSize: 11 },
        axisLine: { lineStyle: { color: "#27272a" } },
        splitLine: { lineStyle: { color: "#1f1f23" } },
        axisLabel: { color: "#71717a", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        name: activeMetricKey,
        nameTextStyle: { color: "#71717a", fontSize: 11 },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: "#1f1f23" } },
        axisLabel: { color: "#71717a", fontSize: 11 },
      },
      series: [
        {
          type: "scatter",
          symbolSize: 12,
          itemStyle: { color: "#8b5cf6" },
          data: points,
        },
      ],
    };
  }, [rows, activeMetricKey]);

  if (leaderboard.runs.length === 0) {
    return (
      <p className="text-[13.5px] text-ink-faint">
        No completed training runs with recorded durations yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {metricKeys.length > 0 ? (
        <div className="max-w-[260px]">
          <SelectField
            label="Rank by metric"
            value={activeMetricKey}
            onChange={setMetricKey}
            options={metricKeys}
          />
        </div>
      ) : (
        <p className="text-[13.5px] text-ink-faint">
          No numeric evaluation metrics recorded yet — showing duration only.
        </p>
      )}

      {activeMetricKey ? <EChart option={scatterOption} height={280} /> : null}

      <div className="flex flex-col gap-2">
        {rows.map(({ run, bestValue, perHour }) => (
          <Card key={run.trainingRunId} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="truncate text-[14.5px] font-medium text-ink">{run.name}</p>
              <p className="mt-0.5 font-mono text-[11px] text-ink-faint">
                {formatDuration(run.durationSeconds)} training time
              </p>
            </div>
            <div className="shrink-0 text-right">
              {bestValue !== null ? (
                <>
                  <p className="font-mono text-[14px] text-ink">{bestValue.toFixed(4)}</p>
                  <p className="font-mono text-[11px] text-ink-faint">
                    {perHour !== null
                      ? `${perHour.toFixed(4)} / hour`
                      : "duration too short to rate"}
                  </p>
                </>
              ) : (
                <p className="text-[13px] text-ink-faint">
                  No {activeMetricKey || "metric"} recorded
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
