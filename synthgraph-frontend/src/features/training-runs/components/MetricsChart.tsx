import type { TrainingRunMetric } from "../types/training-run-metric";
import { MetricSeriesChart } from "./MetricSeriesChart";

// Cycles through existing design tokens rather than inventing new chart colors.
const COLORS = [
  "var(--color-cyan)",
  "var(--color-node-dataset)",
  "var(--color-node-asset)",
  "var(--color-ok)",
  "var(--color-warn)",
  "var(--color-blue)",
];

export function MetricsChart({ metrics }: { metrics: TrainingRunMetric[] }) {
  const numericKeys = Array.from(
    new Set(
      metrics.flatMap((metric) =>
        Object.entries(metric.metrics)
          .filter(([, value]) => typeof value === "number")
          .map(([key]) => key),
      ),
    ),
  ).sort();

  if (numericKeys.length === 0) {
    return <p className="text-[13.5px] text-ink-faint">No numeric metrics to chart.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {numericKeys.map((key, index) => {
        const points = metrics
          .filter((metric) => typeof metric.metrics[key] === "number")
          .map((metric) => ({ step: metric.step, value: metric.metrics[key] as number }));
        return (
          <MetricSeriesChart
            key={key}
            label={key}
            points={points}
            color={COLORS[index % COLORS.length]}
          />
        );
      })}
    </div>
  );
}
