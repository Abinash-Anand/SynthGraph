import { type HealthVerdict, verdictOf } from "./metric-direction.ts";
import { metricKind } from "./metric-semantics.ts";

export type Trend = "increasing" | "decreasing" | "flat" | "insufficient_data";
export type Judgement = "good" | "bad" | "neutral";

/**
 * Whether a trend is good news, as the backend decided. The backend's trend is
 * directionless on purpose ("increasing" is good for reward and bad for loss);
 * the verdict is the backend's reading of it against the direction declared for
 * the metric. A metric with no declared (or a neutral) direction, a flat trend,
 * or a response from a backend that predates verdicts all read as neutral:
 * the frontend never works out good or bad for itself.
 */
export function judgementOf(verdict: HealthVerdict | null | undefined): Judgement {
  const v = verdictOf(verdict);
  return v === "improving" ? "good" : v === "worsening" ? "bad" : "neutral";
}

export type TrendSummary = { increasing: number; decreasing: number; flat: number; unknown: number; good: number; bad: number };

export function summarizeTrends(entries: Array<{ trend: Trend; verdict?: HealthVerdict | null }>): TrendSummary {
  const summary: TrendSummary = { increasing: 0, decreasing: 0, flat: 0, unknown: 0, good: 0, bad: 0 };
  for (const { trend, verdict } of entries) {
    if (trend === "increasing") summary.increasing++;
    else if (trend === "decreasing") summary.decreasing++;
    else if (trend === "flat") summary.flat++;
    else summary.unknown++;
    const judgement = judgementOf(verdict);
    if (judgement === "good") summary.good++;
    if (judgement === "bad") summary.bad++;
  }
  return summary;
}

/** Whether a metric is a model outcome, as opposed to machine telemetry - for ordering lists. */
export function isModelMetric(metricKey: string): boolean {
  const kind = metricKind(metricKey);
  return kind === "outcome" || kind === "other";
}
