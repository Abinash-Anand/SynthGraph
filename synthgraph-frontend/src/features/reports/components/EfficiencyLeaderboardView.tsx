"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { EChartsCoreOption } from "echarts/core";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { SelectField } from "@/components/ui/Field";
import { cn } from "@/lib/utils";
import { formatDurationSeconds, formatMetricValue } from "@/shared/lib/format";
import { type MetricDirection, directionLabel, metricDirection } from "@/shared/lib/metric-semantics";
import {
  analyzeEfficiency,
  defaultMetricKey,
  paretoPath,
  rankableMetricKeys,
} from "../efficiency-model";
import type { RunLink } from "../server/resolve-run-links";
import type { EfficiencyLeaderboard } from "../types/report";

const EChart = dynamic(() => import("@/shared/charts/EChart").then((m) => m.EChart), {
  ssr: false,
  loading: () => <div className="h-[300px] animate-pulse rounded-lg bg-surface-2" />,
});

const FRONTIER_COLOR = "#a78bfa";
const DOMINATED_COLOR = "#52525b";

type DirectionChoice = "higher" | "lower";

// Deliberately client-side: which metric matters and whether higher is
// "better" is a per-researcher judgment call the backend can't make - it
// just hands over duration + every evaluation. We infer a direction from the
// metric's name and let the user override it.
export function EfficiencyLeaderboardView({
  leaderboard,
  linksByRunId = {},
  projectScoped = false,
}: {
  leaderboard: EfficiencyLeaderboard;
  linksByRunId?: Record<string, RunLink>;
  /** True when the page is already filtered to one project. */
  projectScoped?: boolean;
}) {
  const metricKeys = useMemo(() => rankableMetricKeys(leaderboard.runs), [leaderboard.runs]);
  const [metricKey, setMetricKey] = useState(() => defaultMetricKey(metricKeys));
  const [override, setOverride] = useState<DirectionChoice | null>(null);

  const activeMetricKey = metricKeys.includes(metricKey) ? metricKey : defaultMetricKey(metricKeys);
  const inferred: MetricDirection = metricDirection(activeMetricKey);
  const direction: DirectionChoice = override ?? (inferred === "lower" ? "lower" : "higher");
  const directionIsAssumed = override === null && inferred === "neutral";

  const rows = useMemo(
    () => analyzeEfficiency(leaderboard.runs, activeMetricKey, direction),
    [leaderboard.runs, activeMetricKey, direction],
  );

  const projectCount = useMemo(() => {
    const ids = new Set<string>();
    for (const run of leaderboard.runs) {
      const link = linksByRunId[run.trainingRunId];
      if (link) ids.add(link.projectId);
    }
    return ids.size;
  }, [leaderboard.runs, linksByRunId]);
  const mixedProjects = !projectScoped && projectCount > 1;

  const scatterOption = useMemo<EChartsCoreOption>(() => {
    const scored = rows.filter((row) => row.value !== null);
    const frontier = paretoPath(rows);
    return {
      backgroundColor: "transparent",
      textStyle: { fontFamily: "var(--font-sans)" },
      grid: { left: 64, right: 32, top: 24, bottom: 44 },
      tooltip: {
        trigger: "item",
        backgroundColor: "#18181b",
        borderColor: "#27272a",
        textStyle: { color: "#f4f4f5", fontSize: 12 },
        formatter: (params: unknown) => {
          const p = params as { name: string; value: [number, number]; seriesType: string };
          if (p.seriesType !== "scatter") return "";
          return `${p.name}<br/>${formatDurationSeconds(p.value[0] * 3600)} · ${activeMetricKey} ${formatMetricValue(p.value[1])}`;
        },
      },
      xAxis: {
        type: "value",
        name: "training time (hours)",
        nameLocation: "middle",
        nameGap: 28,
        nameTextStyle: { color: "#71717a", fontSize: 11 },
        axisLine: { lineStyle: { color: "#27272a" } },
        splitLine: { lineStyle: { color: "#1f1f23" } },
        axisLabel: { color: "#71717a", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        scale: true,
        name: `${activeMetricKey} (${direction === "lower" ? "lower" : "higher"} is better)`,
        nameTextStyle: { color: "#71717a", fontSize: 11, align: "left" },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: "#1f1f23" } },
        axisLabel: { color: "#71717a", fontSize: 11, formatter: (value: number) => formatMetricValue(value) },
      },
      series: [
        {
          type: "line",
          silent: true,
          step: "end",
          showSymbol: false,
          z: 1,
          lineStyle: { color: FRONTIER_COLOR, type: "dashed", width: 1.5, opacity: 0.7 },
          data: frontier,
        },
        {
          type: "scatter",
          z: 2,
          symbolSize: 13,
          data: scored.map((row) => ({
            value: [row.durationSeconds / 3600, row.value],
            name: row.name,
            itemStyle: { color: row.pareto ? FRONTIER_COLOR : DOMINATED_COLOR },
            label: {
              show: row.pareto,
              formatter: row.name,
              position: "top",
              color: "#d4d4d8",
              fontSize: 11,
              distance: 8,
            },
          })),
        },
      ],
    };
  }, [rows, activeMetricKey, direction]);

  if (leaderboard.runs.length === 0) {
    return (
      <p className="text-[13.5px] text-ink-faint">
        No completed training runs with recorded durations yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {mixedProjects ? (
        <p
          role="note"
          className="rounded-lg border border-research-border bg-research-panel px-4 py-3 text-[13px] text-research-ink-secondary"
        >
          These {leaderboard.runs.length} runs come from {projectCount} different projects. Scores from different
          tasks aren&apos;t comparable, so pick one project above before drawing conclusions from this ranking.
        </p>
      ) : null}

      {metricKeys.length > 0 ? (
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-full max-w-[280px]">
            <SelectField
              label="Rank by metric"
              value={activeMetricKey}
              onChange={(next) => {
                setMetricKey(next);
                setOverride(null);
              }}
              options={metricKeys}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] text-research-ink-muted">Better means</span>
            <div role="group" aria-label="Better means" className="inline-flex rounded-md border border-research-border p-0.5">
              {(["higher", "lower"] as const).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  aria-pressed={direction === choice}
                  onClick={() => setOverride(choice)}
                  className={cn(
                    "rounded px-3 py-1.5 text-[13px] transition-colors",
                    direction === choice
                      ? "bg-research-accent-subtle/30 text-research-ink"
                      : "text-research-ink-muted hover:text-research-ink",
                  )}
                >
                  {choice === "higher" ? "↑ higher" : "↓ lower"}
                </button>
              ))}
            </div>
          </div>
          <p className="max-w-[44ch] pb-1 text-[12px] text-research-ink-muted">
            {directionIsAssumed
              ? "No direction could be inferred from this metric's name, so higher is assumed. Change it if that's wrong."
              : override
                ? `You set "${directionLabel(override)}".`
                : `Inferred from the name: ${directionLabel(inferred)}.`}
          </p>
        </div>
      ) : (
        <p className="text-[13.5px] text-ink-faint">
          No numeric outcome metrics (reward, accuracy, loss…) recorded yet. Timing and system readings aren&apos;t
          ranked because they describe the machine, not the model.
        </p>
      )}

      {activeMetricKey ? (
        <div>
          <EChart option={scatterOption} height={300} />
          <p className="mt-1 flex items-center gap-4 text-[12px] text-research-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: FRONTIER_COLOR }} /> best result for the time
              (frontier)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: DOMINATED_COLOR }} /> beaten by a faster, better run
            </span>
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {rows.map((row) => {
          const link = linksByRunId[row.runId];
          return (
            <Card key={row.runId} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {link ? (
                    <Link
                      href={`/dashboard/projects/${link.projectId}/experiments/${link.experimentId}?entity=run:${row.runId}`}
                      className="truncate text-[14.5px] font-medium text-ink underline underline-offset-2 hover:text-research-accent-hover"
                    >
                      {row.name}
                    </Link>
                  ) : (
                    <p className="truncate text-[14.5px] font-medium text-ink">{row.name}</p>
                  )}
                  {row.pareto ? (
                    <span className="rounded border border-research-accent-subtle px-1.5 py-0.5 font-mono text-[10px] text-research-accent-hover">
                      FRONTIER
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 font-mono text-[11px] text-ink-faint">
                  {formatDurationSeconds(row.durationSeconds)} training time
                  {row.dominatedBy ? ` · beaten by ${row.dominatedBy.name} (faster and better)` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {row.value !== null ? (
                  <>
                    <p className="font-mono text-[14px] text-ink" title={String(row.value)}>
                      {formatMetricValue(row.value)}
                    </p>
                    {row.perHour !== null ? (
                      <p className="font-mono text-[11px] text-ink-faint">{formatMetricValue(row.perHour)} / hour</p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-[13px] text-ink-faint">No {activeMetricKey || "metric"} recorded</p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
