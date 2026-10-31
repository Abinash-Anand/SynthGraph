"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { EChartsCoreOption } from "echarts/core";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { SelectField } from "@/components/ui/Field";
import { cn } from "@/lib/utils";
import { formatDurationSeconds, formatMetricValue } from "@/shared/lib/format";
import {
  type RankingDirection,
  directionLabel,
  noRankingReason,
} from "@/shared/lib/metric-direction";
import {
  EFFICIENCY_UNAVAILABLE,
  closeResultsSpread,
  defaultMetricKey,
  defaultSetId,
  efficiencyRows,
  evaluationSetOptions,
  paddedAxisRange,
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

const CHOICES: Array<{ value: RankingDirection; label: string }> = [
  { value: "maximize", label: "↑ higher" },
  { value: "minimize", label: "↓ lower" },
];

// The ranking is the backend's: every metric ranked per evaluation set, with the
// frontier, value per hour and "beaten by" already decided. Scores are only ever
// ranked against scores on the same evaluation set. Which metric matters and
// which set to look at are the researcher's call; which direction is better is
// declared when the metric is logged. With no usable declaration the backend
// ranks both ways and the user chooses for this view; that choice is theirs, is
// not saved, and is labelled as such.
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
  const metricKeys = useMemo(() => rankableMetricKeys(leaderboard.analysis), [leaderboard.analysis]);
  const [metricKey, setMetricKey] = useState(() => defaultMetricKey(metricKeys, leaderboard.metricDirections));
  const [setChoice, setSetChoice] = useState("");
  const [override, setOverride] = useState<RankingDirection | null>(null);

  const activeMetricKey = metricKeys.includes(metricKey)
    ? metricKey
    : defaultMetricKey(metricKeys, leaderboard.metricDirections);
  const metricAnalysis = leaderboard.analysis?.[activeMetricKey];
  const setOptions = useMemo(
    () => evaluationSetOptions(metricAnalysis?.sets ?? [], leaderboard.evaluationSets ?? []),
    [metricAnalysis, leaderboard.evaluationSets],
  );
  const activeSetId = setOptions.some((option) => option.id === setChoice) ? setChoice : defaultSetId(metricAnalysis);
  const activeSet = metricAnalysis?.sets.find((set) => set.datasetVersionId === activeSetId);

  // The backend says whether this metric has a declared direction. Without one it
  // ranks both ways and the user picks; with one there is nothing to pick.
  const declaredRanking: RankingDirection | null = metricAnalysis?.direction ?? null;
  const direction: RankingDirection | null = declaredRanking ?? override;
  const declaredValue =
    metricAnalysis?.directionStatus === "neutral" ? "neutral" : declaredRanking;
  const declaredMixed = metricAnalysis?.directionStatus === "mixed";

  const rows = useMemo(
    () => efficiencyRows(leaderboard.runs, metricAnalysis, activeSetId, direction),
    [leaderboard.runs, metricAnalysis, activeSetId, direction],
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
    // Padded, not fitted: a tight fit made a 0.0015 gap fill the whole chart.
    const yRange = paddedAxisRange(scored.map((row) => row.value as number));
    const maxHours = Math.max(0, ...scored.map((row) => row.durationSeconds / 3600));
    return {
      backgroundColor: "transparent",
      textStyle: { fontFamily: "var(--font-sans)" },
      grid: { left: 64, right: 40, top: 24, bottom: 44 },
      tooltip: {
        trigger: "item",
        confine: true,
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
        min: 0,
        // Headroom on the right so the slowest run's label isn't cut off by the
        // chart edge (it was, on a phone).
        max: maxHours > 0 ? maxHours * 1.25 : undefined,
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
        min: yRange?.min,
        max: yRange?.max,
        name: `${activeMetricKey} (${direction === "minimize" ? "lower" : "higher"} is better)`,
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
          // Two nearby points otherwise print their names on top of each other.
          labelLayout: { hideOverlap: true },
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

  const closeSpread = closeResultsSpread(rows.flatMap((row) => (row.value === null ? [] : [row.value])));

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

      {leaderboard.analysis === undefined ? (
        <p role="note" className="text-[13px] text-research-ink-secondary">
          {EFFICIENCY_UNAVAILABLE}
        </p>
      ) : metricKeys.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-full max-w-[280px]">
              <SelectField
                label="Rank by metric"
                value={activeMetricKey}
                onChange={(next) => {
                  setMetricKey(next);
                  setSetChoice("");
                  setOverride(null);
                }}
                options={metricKeys}
              />
            </div>
            {setOptions.length > 0 ? (
              <div className="w-full max-w-[340px]">
                <SelectField
                  label="Evaluation set"
                  value={setOptions.find((option) => option.id === activeSetId)?.label ?? ""}
                  onChange={(label) => setSetChoice(setOptions.find((option) => option.label === label)?.id ?? "")}
                  options={setOptions.map((option) => option.label)}
                />
              </div>
            ) : null}
            {declaredRanking === null ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] text-research-ink-muted">Better means</span>
                <div
                  role="group"
                  aria-label="Better means"
                  className="inline-flex rounded-md border border-research-border p-0.5"
                >
                  {CHOICES.map(({ value: choice, label }) => (
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
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <p className="max-w-[44ch] pb-1 text-[12px] text-research-ink-muted">
              {declaredRanking
                ? `Direction: ${directionLabel(declaredRanking)}.`
                : override
                  ? `Your choice for this view: ${override === "maximize" ? "higher" : "lower"} is better. It is not saved.`
                  : `${noRankingReason(declaredValue, declaredMixed)} Choose how to compare these runs for this view; the choice is not saved.`}
            </p>
          </div>
          <p role="note" className="max-w-[72ch] text-[12px] text-research-ink-muted">
            {setOptions.length > 1
              ? `${activeMetricKey} was scored on ${setOptions.length} different evaluation sets. A run is ranked only against runs scored on the same set, so scores from different sets are never combined. `
              : ""}
            {activeSet
              ? `Showing ${activeSet.runCount} ${activeSet.runCount === 1 ? "run" : "runs"} scored on this set; a run's value is its best checkpoint on it.`
              : ""}
          </p>
        </div>
      ) : (
        <p className="text-[13.5px] text-ink-faint">
          No numeric outcome metrics (reward, accuracy, loss…) recorded yet. Timing and system readings aren&apos;t
          ranked because they describe the machine, not the model.
        </p>
      )}

      {activeMetricKey && direction ? (
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
          {closeSpread !== null ? (
            <p role="note" className="mt-2 text-[12.5px] text-research-warning">
              These results are within {(closeSpread * 100).toFixed(1)}% of each other, which may be within normal
              run-to-run variation. Treat the ranking as a tie unless you&apos;ve repeated the runs.
            </p>
          ) : null}
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
                      className="inline-block max-w-full truncate py-1 text-[14.5px] font-medium text-ink underline underline-offset-2 hover:text-research-accent-hover"
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
                  direction ? <p className="text-[13px] text-ink-faint">No {activeMetricKey || "metric"} on this evaluation set</p> : null
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
