"use client";

import dynamic from "next/dynamic";
import type { EChartsCoreOption } from "echarts/core";
import { useMemo, useState } from "react";
import { SelectField } from "@/components/ui/Field";
import { cn } from "@/lib/utils";
import { formatMetricValue, pluralize } from "@/shared/lib/format";
import { directionLabel, metricDirection } from "@/shared/lib/metric-semantics";
import { bestEvaluationValue, outcomeMetricKeys, preferredOutcomeKey } from "../../outcomes";
import {
  analyzeParameters,
  type ParameterEffect,
  ROLE_LABEL,
} from "../../parameter-model";
import type { EnrichedTrainingRun } from "../../types/experiment-workspace";

const EChart = dynamic(() => import("@/shared/charts/EChart").then((m) => m.EChart), {
  ssr: false,
  loading: () => <div className="h-[260px] animate-pulse rounded-lg bg-surface-2" />,
});

const RELIABILITY_LABEL = { ok: "reliable", low: "weak evidence", none: "not enough data" } as const;

function EffectRow({ effect, direction }: { effect: ParameterEffect; direction: ReturnType<typeof metricDirection> }) {
  const estimable = effect.effect !== null;
  // Which way the knob pushes the outcome, in terms of "better" when we know it.
  let leaning: string | null = null;
  if (effect.correlation !== null && Math.abs(effect.correlation) > 0.2) {
    const bigger = effect.correlation > 0;
    const better = direction === "neutral" ? null : direction === "higher" ? bigger : !bigger;
    leaning =
      better === null
        ? `bigger values go with ${bigger ? "higher" : "lower"} outcomes`
        : `bigger values tend to be ${better ? "better" : "worse"}`;
  }

  return (
    <li className="flex flex-col gap-1.5 rounded-lg border border-research-border px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("font-mono text-[13px]", estimable ? "text-research-ink" : "text-research-ink-muted")}>
            {effect.key}
          </span>
          <span className="rounded border border-research-border px-1.5 py-0.5 font-mono text-[10px] text-research-ink-muted">
            {ROLE_LABEL[effect.role]}
          </span>
        </div>
        <span
          className={cn(
            "font-mono text-[10.5px]",
            effect.reliability === "ok" ? "text-research-accent-hover" : "text-research-ink-muted",
          )}
        >
          {RELIABILITY_LABEL[effect.reliability]} · n={effect.n}
        </span>
      </div>

      {estimable ? (
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-research-border" aria-hidden>
            <div
              className={cn("h-full rounded-full", effect.reliability === "ok" ? "bg-research-accent" : "bg-research-accent-subtle")}
              style={{ width: `${Math.round((effect.effect ?? 0) * 100)}%` }}
            />
          </div>
          <span className="w-[140px] shrink-0 text-right font-mono text-[12px] tabular-nums text-research-ink-secondary">
            {effect.kind === "numeric"
              ? `rank corr ${effect.correlation !== null && effect.correlation > 0 ? "+" : ""}${(effect.correlation ?? 0).toFixed(2)}`
              : `${Math.round((effect.effect ?? 0) * 100)}% of variation`}
          </span>
        </div>
      ) : null}

      {leaning ? <p className="text-[12.5px] text-research-ink-secondary">{leaning}</p> : null}
      {effect.note ? <p className="text-[12.5px] text-research-ink-muted">{effect.note}</p> : null}
    </li>
  );
}

export function ParameterInsights({ runs }: { runs: EnrichedTrainingRun[] }) {
  const metricKeys = useMemo(() => outcomeMetricKeys(runs), [runs]);
  const [chosen, setChosen] = useState("");
  const metricKey = metricKeys.includes(chosen) ? chosen : preferredOutcomeKey(metricKeys);
  const direction = metricDirection(metricKey);

  const analysis = useMemo(() => {
    const analysisRuns = runs.map((r) => ({
      id: r.run.id,
      name: r.run.name,
      parameters: r.run.parameters,
      outcome: metricKey ? bestEvaluationValue(r, metricKey, direction) : null,
    }));
    return { runs: analysisRuns, result: analyzeParameters(analysisRuns) };
  }, [runs, metricKey, direction]);

  const { result } = analysis;
  const knobs = result.effects.filter((effect) => effect.role !== "seed");

  const parallelOption = useMemo<EChartsCoreOption | null>(() => {
    const plotted = knobs.map((effect) => effect.key);
    const usable = analysis.runs.filter((r) => r.outcome !== null);
    if (plotted.length < 2 || usable.length < 4) return null;

    const axes = plotted.map((key, dim) => {
      const values = usable.map((r) => r.parameters[key]);
      const numeric = values.every((v) => typeof v === "number" && Number.isFinite(v));
      return numeric
        ? { dim, name: key, type: "value" as const, scale: true }
        : {
            dim,
            name: key,
            type: "category" as const,
            data: Array.from(new Set(values.map((v) => (typeof v === "string" ? v : JSON.stringify(v))))),
          };
    });
    const outcomeDim = plotted.length;
    const outcomes = usable.map((r) => r.outcome as number);

    return {
      backgroundColor: "transparent",
      textStyle: { fontFamily: "var(--font-sans)" },
      parallelAxis: [
        ...axes.map((axis) => ({
          ...axis,
          nameTextStyle: { color: "#a1a1aa", fontSize: 11 },
          axisLine: { lineStyle: { color: "#3f3f46" } },
          axisLabel: { color: "#71717a", fontSize: 10 },
        })),
        {
          dim: outcomeDim,
          name: metricKey,
          type: "value",
          scale: true,
          nameTextStyle: { color: "#a1a1aa", fontSize: 11 },
          axisLine: { lineStyle: { color: "#3f3f46" } },
          axisLabel: { color: "#71717a", fontSize: 10, formatter: (v: number) => formatMetricValue(v) },
        },
      ],
      parallel: { left: 48, right: 64, top: 48, bottom: 28 },
      visualMap: {
        show: false,
        dimension: outcomeDim,
        min: Math.min(...outcomes),
        max: Math.max(...outcomes),
        // Higher-is-better reads purple; lower-is-better flips so purple is still "good".
        inRange: { color: direction === "lower" ? ["#a78bfa", "#3f3f46"] : ["#3f3f46", "#a78bfa"] },
      },
      tooltip: { confine: true,
      backgroundColor: "#18181b", borderColor: "#27272a", textStyle: { color: "#f4f4f5", fontSize: 12 } },
      series: [
        {
          type: "parallel",
          lineStyle: { width: 2, opacity: 0.85 },
          data: usable.map((r) => [
            ...plotted.map((key) => {
              const v = r.parameters[key];
              return typeof v === "number" || typeof v === "string" ? v : JSON.stringify(v);
            }),
            r.outcome,
          ]),
        },
      ],
    };
  }, [analysis.runs, knobs, metricKey, direction]);

  if (metricKeys.length === 0) {
    return (
      <p className="text-[13.5px] text-research-ink-muted">
        No evaluation results with an outcome metric (reward, accuracy, loss…) yet, so there is nothing to
        compare parameters against.
      </p>
    );
  }

  const noise = result.noiseFloor;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-[280px]">
          <SelectField label="Outcome" value={metricKey} onChange={setChosen} options={metricKeys} />
        </div>
        <p className="max-w-[52ch] text-[12px] text-research-ink-muted">
          Each run&apos;s outcome is its best evaluation of <span className="font-mono">{metricKey}</span> (
          {directionLabel(direction)}
          {direction === "neutral" ? ", so no better/worse reading is given" : ", inferred from the name"}).
          These are associations across {result.usableRuns} of {pluralize(result.totalRuns, "run")}, not proof of cause.
        </p>
      </div>

      {result.usableRuns < 2 ? (
        <p className="text-[13.5px] text-research-ink-muted">
          At least 2 runs with a recorded {metricKey} are needed to compare parameters.
        </p>
      ) : null}

      {result.seedOnly && noise ? (
        <div
          role="note"
          className="rounded-lg border border-research-accent-subtle/40 bg-research-accent-subtle/[0.06] p-4 text-[13.5px] text-research-ink-secondary"
        >
          <p className="font-medium text-research-ink">These runs differ only by seed.</p>
          <p className="mt-1">
            So the spread in <span className="font-mono">{metricKey}</span> —{" "}
            <span className="font-mono">
              {formatMetricValue(noise.min)} to {formatMetricValue(noise.max)}
            </span>
            {noise.coefficientOfVariation !== null
              ? `, ±${Math.round(noise.coefficientOfVariation * 100)}% around the mean`
              : ""}{" "}
            across {noise.n} runs — is run-to-run noise, not a parameter effect. Treat any future change smaller than
            this spread as indistinguishable from chance.
          </p>
        </div>
      ) : null}

      {knobs.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="mono-label text-research-ink-muted">Which parameters moved {metricKey}</h3>
          <ul className="flex flex-col gap-2">
            {knobs.map((effect) => (
              <EffectRow key={effect.key} effect={effect} direction={direction} />
            ))}
          </ul>
        </div>
      ) : null}

      {result.effects.some((e) => e.role === "seed") && !result.seedOnly && noise ? (
        <p className="text-[12.5px] text-research-ink-muted">
          Seeds also vary here. Outcome spread across all runs is {formatMetricValue(noise.min)} to{" "}
          {formatMetricValue(noise.max)}; seed noise is part of every difference above.
        </p>
      ) : null}

      {parallelOption ? (
        <div className="flex flex-col gap-2">
          <h3 className="mono-label text-research-ink-muted">Every run across the varying parameters</h3>
          <EChart option={parallelOption} height={280} />
          <p className="text-[12px] text-research-ink-muted">
            One line per run, coloured by {metricKey} (brighter is {direction === "lower" ? "lower" : "higher"}). Look
            for a bright cluster that shares a value on one axis.
          </p>
        </div>
      ) : null}
    </div>
  );
}
