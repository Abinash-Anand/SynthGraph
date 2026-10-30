// What the backend says a metric's direction is. The frontend does not decide
// it: a direction is declared through the SDK, stored per experiment, and read
// back here (registry entry ARCH-001). A metric nobody declared has no
// direction, and nothing in this file guesses one from its name.
//
// Relative-import friendly (no "@/" alias, no React) so the model tests can run
// under plain Node.

/** What a researcher can declare: bigger is better, smaller is better, or neither. */
export type DeclaredDirection = "maximize" | "minimize" | "neutral";

/** The experiment's declarations; a metric that is not listed has none (unknown). */
export type MetricDirections = Readonly<Record<string, DeclaredDirection>>;

/**
 * One metric's direction across several experiments, as the backend reports it
 * for project-wide reports. `direction` is set only when every experiment that
 * reports the metric declared the same one; otherwise it is `mixed`.
 */
export type AggregatedDirection = { direction: DeclaredDirection | null; mixed: boolean };
export type AggregatedDirections = Readonly<Record<string, AggregatedDirection>>;

/** The only directions that can say one value beats another. */
export type RankingDirection = "maximize" | "minimize";

/** The backend's judgement of a trend for a metric with a declared direction. */
export type HealthVerdict = "improving" | "worsening" | "neutral";

// Own properties only: a metric called "constructor" or "toString" must not
// read as declared because of what every object inherits.
function ownValue<T>(record: Readonly<Record<string, T>> | null | undefined, key: string): T | undefined {
  if (!record || !Object.hasOwn(record, key)) return undefined;
  return record[key];
}

/** The declared direction of one metric, or null when it was never declared. */
export function declaredDirection(
  directions: MetricDirections | null | undefined,
  metricKey: string,
): DeclaredDirection | null {
  return ownValue(directions, metricKey) ?? null;
}

/** The direction of a metric across experiments; null when undeclared or mixed. */
export function aggregatedDirection(
  directions: AggregatedDirections | null | undefined,
  metricKey: string,
): { direction: DeclaredDirection | null; mixed: boolean } {
  const entry = ownValue(directions, metricKey);
  return entry ? { direction: entry.direction, mixed: entry.mixed } : { direction: null, mixed: false };
}

/** Only maximize and minimize can rank values; neutral and unknown cannot. */
export function rankingDirection(direction: DeclaredDirection | null | undefined): RankingDirection | null {
  return direction === "maximize" || direction === "minimize" ? direction : null;
}

/** Whether a metric has a direction that can pick a best value. */
export function canRank(directions: MetricDirections | null | undefined, metricKey: string): boolean {
  return rankingDirection(declaredDirection(directions, metricKey)) !== null;
}

export function directionLabel(direction: DeclaredDirection | null): string {
  if (direction === "maximize") return "higher is better (declared)";
  if (direction === "minimize") return "lower is better (declared)";
  if (direction === "neutral") return "declared as having no better direction";
  return "no direction declared";
}

/** The reason a metric cannot be ranked, for text next to a view that would otherwise rank it. */
export function noRankingReason(direction: DeclaredDirection | null, mixed = false): string {
  if (mixed) return "Experiments disagree about, or have not all declared, which direction is better for this metric.";
  if (direction === "neutral") return "This metric was declared as having no better direction.";
  return "No direction has been declared for this metric.";
}

export function verdictOf(verdict: HealthVerdict | null | undefined): HealthVerdict {
  return verdict === "improving" || verdict === "worsening" ? verdict : "neutral";
}
