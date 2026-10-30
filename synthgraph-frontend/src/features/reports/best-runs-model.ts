// Relative with an explicit extension (not the "@/" alias): the test runner
// is plain Node, which resolves neither aliases nor extensionless imports.
import {
  type AggregatedDirections,
  type DeclaredDirection,
  aggregatedDirection,
  rankingDirection,
} from "../../shared/lib/metric-direction.ts";
import { metricKind } from "../../shared/lib/metric-semantics.ts";

// Structural, not imported from ./types/report, so this module (and its
// test) stays free of anything but the shared metric helpers.
export type BestRunsRecordInput = {
  metricKey: string;
  maxValue: number;
  maxTrainingRunId: string;
  maxTrainingRunName: string;
  minValue: number;
  minTrainingRunId: string;
  minTrainingRunName: string;
};

export type RunValue = { value: number; runId: string; runName: string };

export type BestRunRow = {
  metricKey: string;
  /** The declared direction, or null when none was declared or the experiments disagree. */
  direction: DeclaredDirection | null;
  /** True when experiments reporting this metric declared different directions (or only some declared it). */
  mixed: boolean;
  /** Present only when a maximize or minimize direction is declared; otherwise both extremes are shown neutrally. */
  best: RunValue | null;
  worst: RunValue | null;
  high: RunValue;
  low: RunValue;
  /** True when every run recorded the same value, so "best" is meaningless. */
  flat: boolean;
};

export type BestRunsModel = {
  /** Outcome metrics with a declared direction first, then other outcomes. */
  outcomes: BestRunRow[];
  /** Time, system and throughput readings - kept, but out of the way. */
  readings: BestRunRow[];
};

export function buildBestRunsModel(
  records: BestRunsRecordInput[],
  directions: AggregatedDirections | null | undefined,
): BestRunsModel {
  const outcomes: BestRunRow[] = [];
  const readings: BestRunRow[] = [];

  for (const record of records) {
    const { direction, mixed } = aggregatedDirection(directions, record.metricKey);
    const ranking = rankingDirection(direction);
    const high: RunValue = { value: record.maxValue, runId: record.maxTrainingRunId, runName: record.maxTrainingRunName };
    const low: RunValue = { value: record.minValue, runId: record.minTrainingRunId, runName: record.minTrainingRunName };
    const row: BestRunRow = {
      metricKey: record.metricKey,
      direction,
      mixed,
      best: ranking === "maximize" ? high : ranking === "minimize" ? low : null,
      worst: ranking === "maximize" ? low : ranking === "minimize" ? high : null,
      high,
      low,
      flat: record.maxValue === record.minValue,
    };
    const kind = metricKind(record.metricKey);
    (kind === "outcome" || kind === "other" ? outcomes : readings).push(row);
  }

  const rank = (row: BestRunRow) => (row.best === null ? 1 : 0);
  outcomes.sort((a, b) => rank(a) - rank(b) || a.metricKey.localeCompare(b.metricKey));
  readings.sort((a, b) => a.metricKey.localeCompare(b.metricKey));
  return { outcomes, readings };
}
