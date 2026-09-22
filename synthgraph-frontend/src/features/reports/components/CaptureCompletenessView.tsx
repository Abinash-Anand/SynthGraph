"use client";

import dynamic from "next/dynamic";
import type { EChartsCoreOption } from "echarts/core";
import { useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { CaptureCompletenessReport } from "../types/report";

const EChart = dynamic(() => import("@/shared/charts/EChart").then((m) => m.EChart), {
  ssr: false,
  loading: () => <div className="h-[240px] animate-pulse rounded-lg bg-surface-2" />,
});

const STATUS_TONE = {
  complete: "ok",
  partial: "warn",
  unknown: "neutral",
} as const;

function buildIntegrationChartOption(
  integrations: Array<[string, { total: number; attached: number; closed: number }]>,
): EChartsCoreOption {
  return {
    backgroundColor: "transparent",
    textStyle: { fontFamily: "var(--font-sans)" },
    grid: { left: 90, right: 24, top: 36, bottom: 32 },
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
      type: "value",
      axisLine: { show: false },
      splitLine: { lineStyle: { color: "#1f1f23" } },
      axisLabel: { color: "#71717a", fontSize: 11 },
    },
    yAxis: {
      type: "category",
      data: integrations.map(([name]) => name),
      axisLine: { lineStyle: { color: "#27272a" } },
      axisLabel: { color: "#a1a1aa", fontSize: 12 },
    },
    series: [
      {
        name: "reported",
        type: "bar",
        data: integrations.map(([, counts]) => counts.total),
        itemStyle: { color: "#3f3f46" },
        barGap: "-100%",
        z: 1,
      },
      {
        name: "attached",
        type: "bar",
        data: integrations.map(([, counts]) => counts.attached),
        itemStyle: { color: "#5b8dfb" },
        barWidth: "45%",
        z: 2,
      },
      {
        name: "closed",
        type: "bar",
        data: integrations.map(([, counts]) => counts.closed),
        itemStyle: { color: "#22c55e" },
        barWidth: "22%",
        z: 3,
      },
    ],
  };
}

export function CaptureCompletenessView({ report }: { report: CaptureCompletenessReport }) {
  const { total, byStatus, byIntegration } = report;
  const statuses = Object.entries(byStatus) as Array<[keyof typeof byStatus, number]>;
  const integrations = Object.entries(byIntegration);
  const chartOption = useMemo(() => buildIntegrationChartOption(integrations), [integrations]);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {statuses.map(([status, count]) => (
          <Card key={status} className="p-5">
            <Badge tone={STATUS_TONE[status]} dot>
              {status}
            </Badge>
            <p className="mt-3 text-[28px] font-medium text-ink">{count}</p>
            <p className="mt-1 font-mono text-[11px] text-ink-faint">
              {total > 0 ? Math.round((count / total) * 100) : 0}% of {total} training runs
            </p>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mono-label mb-3">By integration</h2>
        {integrations.length === 0 ? (
          <p className="text-[13.5px] text-ink-faint">No integrations reported yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <EChart option={chartOption} height={Math.max(160, integrations.length * 56)} />
            <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line bg-surface/60">
                  <th scope="col" className="px-3 py-2 text-left font-mono text-[11px] text-ink-faint">
                    integration
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-mono text-[11px] text-ink-faint">
                    reported
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-mono text-[11px] text-ink-faint">
                    attached
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-mono text-[11px] text-ink-faint">
                    closed
                  </th>
                </tr>
              </thead>
              <tbody>
                {integrations.map(([name, counts]) => (
                  <tr key={name} className="border-b border-line last:border-b-0">
                    <td className="px-3 py-2 text-ink">{name}</td>
                    <td className="px-3 py-2 text-ink-muted">{counts.total}</td>
                    <td className="px-3 py-2 text-ink-muted">{counts.attached}</td>
                    <td className="px-3 py-2 text-ink-muted">{counts.closed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
