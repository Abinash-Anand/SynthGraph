import type {
  ComparedTrainingRun,
  TrainingRunDifference,
} from "@/features/comparisons/types/comparison";
import type { ComparisonRow } from "./parameter-diff";

// `field: null` rows (ID, Created) are never highlighted — same reasoning
// as generations' own FIXED_ROWS: two distinct records trivially always
// have different ids/creation times, not a useful diff signal.
const FIXED_ROWS: Array<{
  label: string;
  field: string | null;
  getValue: (run: ComparedTrainingRun) => unknown;
}> = [
  { label: "ID", field: null, getValue: (r) => r.id },
  { label: "Status", field: "status", getValue: (r) => r.status },
  {
    label: "Trainer",
    field: "trainer",
    getValue: (r) => `${r.trainer.name}${r.trainer.version ? ` @ ${r.trainer.version}` : ""}`,
  },
  { label: "Started", field: "startedAt", getValue: (r) => r.startedAt },
  { label: "Completed", field: "completedAt", getValue: (r) => r.completedAt },
  { label: "Created", field: null, getValue: (r) => r.createdAt },
];

/**
 * Mirrors buildComparisonRows exactly, extended with metrics.* alongside
 * parameters.* — a training run's recorded outcome numbers are as much a
 * point of comparison as its hyperparameters. `differs` is read from the
 * backend's own `differences` field, not recomputed here.
 */
export function buildTrainingRunComparisonRows(
  trainingRuns: ComparedTrainingRun[],
  differences: TrainingRunDifference[],
): ComparisonRow[] {
  const differingFields = new Set(differences.map((difference) => difference.field));
  const rows: ComparisonRow[] = [];

  for (const { label, field, getValue } of FIXED_ROWS) {
    rows.push({
      label,
      values: trainingRuns.map((run) => formatValue(getValue(run))),
      differs: field !== null && differingFields.has(field),
    });
  }

  const parameterKeys = Array.from(
    new Set(trainingRuns.flatMap((r) => Object.keys(r.parameters))),
  ).sort();
  for (const key of parameterKeys) {
    const field = `parameters.${key}`;
    rows.push({
      label: field,
      values: trainingRuns.map((run) => formatValue(run.parameters[key])),
      differs: differingFields.has(field),
    });
  }

  const metricKeys = Array.from(
    new Set(trainingRuns.flatMap((r) => Object.keys(r.metrics))),
  ).sort();
  for (const key of metricKeys) {
    const field = `metrics.${key}`;
    rows.push({
      label: field,
      values: trainingRuns.map((run) => formatValue(run.metrics[key])),
      differs: differingFields.has(field),
    });
  }

  return rows;
}

function formatValue(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
