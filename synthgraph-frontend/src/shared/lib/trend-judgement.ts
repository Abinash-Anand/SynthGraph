import { type MetricDirection, metricDirection, metricKind } from "./metric-semantics.ts";

export type Trend = "increasing" | "decreasing" | "flat" | "insufficient_data";
export type Judgement = "good" | "bad" | "neutral";

/**
 * Whether a trend is good news. The backend's trend is directionless on
 * purpose ("increasing" is good for reward and bad for loss), so this only
 * passes judgement when the metric's direction can be inferred from its
 * name - otherwise it stays neutral rather than colouring a guess.
 */
export function judgeTrend(trend: Trend, direction: MetricDirection): Judgement {
  if (direction === "neutral" || trend === "flat" || trend === "insufficient_data") return "neutral";
  const improving = (trend === "increasing") === (direction === "higher");
  return improving ? "good" : "bad";
}

export function judgeTrendFor(metricKey: string, trend: Trend): Judgement {
  return judgeTrend(trend, metricDirection(metricKey));
}

export type TrendSummary = { increasing: number; decreasing: number; flat: number; unknown: number; good: number; bad: number };

export function summarizeTrends(entries: Array<{ metricKey: string; trend: Trend }>): TrendSummary {
  const summary: TrendSummary = { increasing: 0, decreasing: 0, flat: 0, unknown: 0, good: 0, bad: 0 };
  for (const { metricKey, trend } of entries) {
    if (trend === "increasing") summary.increasing++;
    else if (trend === "decreasing") summary.decreasing++;
    else if (trend === "flat") summary.flat++;
    else summary.unknown++;
    const judgement = judgeTrendFor(metricKey, trend);
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
