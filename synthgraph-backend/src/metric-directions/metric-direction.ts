// Declared metric direction: whether a bigger or a smaller value of a metric is
// better, as stated by whoever logs it.
//
// This is metadata about a metric, so the backend owns it (registry entries
// ARCH-001 and ARCH-006). It is never inferred from a metric's name or prefix:
// a metric without a declaration has no direction (unknown), and nothing here
// or downstream treats unknown as "higher" or "lower".

import { BadRequestException } from '@nestjs/common';

export const METRIC_DIRECTIONS = ['maximize', 'minimize', 'neutral'] as const;
export type MetricDirection = (typeof METRIC_DIRECTIONS)[number];

export const MAX_DECLARATIONS_PER_REQUEST = 100;
export const MAX_METRIC_KEY_LENGTH = 200;

export function isMetricDirection(value: unknown): value is MetricDirection {
  return (
    typeof value === 'string' &&
    (METRIC_DIRECTIONS as readonly string[]).includes(value)
  );
}

/**
 * Validates a `{ metricKey: direction }` request body. Keys are exact metric
 * keys: no patterns, no prefixes. Anything not understood is rejected, never
 * guessed at or dropped.
 */
export function parseMetricDirections(
  input: unknown,
): Record<string, MetricDirection> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new BadRequestException(
      'directions must be an object mapping metric keys to a direction',
    );
  }

  const entries = Object.entries(input as Record<string, unknown>);

  if (entries.length === 0) {
    throw new BadRequestException('directions must declare at least one metric');
  }
  if (entries.length > MAX_DECLARATIONS_PER_REQUEST) {
    throw new BadRequestException(
      `directions can declare at most ${MAX_DECLARATIONS_PER_REQUEST} metrics per request`,
    );
  }

  const parsed: Record<string, MetricDirection> = {};
  for (const [metricKey, direction] of entries) {
    assertMetricKey(metricKey);
    if (!isMetricDirection(direction)) {
      throw new BadRequestException(
        `direction for "${metricKey}" must be one of ${METRIC_DIRECTIONS.join(', ')}`,
      );
    }
    parsed[metricKey] = direction;
  }
  return parsed;
}

export function assertMetricKey(metricKey: unknown): asserts metricKey is string {
  if (
    typeof metricKey !== 'string' ||
    metricKey.length === 0 ||
    metricKey.length > MAX_METRIC_KEY_LENGTH
  ) {
    throw new BadRequestException(
      `a metric key must be a string of 1 to ${MAX_METRIC_KEY_LENGTH} characters`,
    );
  }
}

export type HealthTrend =
  | 'increasing'
  | 'decreasing'
  | 'flat'
  | 'insufficient_data';

export type HealthVerdict = 'improving' | 'worsening' | 'neutral';

/**
 * Whether a trend is good news. Decided here, from the declared direction, so
 * every client reads the same verdict. Without a declared direction (null), or
 * with a `neutral` one, or without a real movement, there is no verdict.
 */
export function healthVerdict(
  trend: HealthTrend,
  direction: MetricDirection | null,
): HealthVerdict {
  if (direction === null || direction === 'neutral') return 'neutral';
  if (trend === 'flat' || trend === 'insufficient_data') return 'neutral';
  const improving = (trend === 'increasing') === (direction === 'maximize');
  return improving ? 'improving' : 'worsening';
}

/**
 * One metric's direction across several experiments, for reports that span
 * them. A direction is stated only when every experiment that reports the
 * metric declares the same one. If they differ, or some have not declared it,
 * the metric is `mixed` and has no direction: a report cannot pick a winner
 * between experiments that disagree about what "better" means.
 */
export type AggregatedMetricDirection = {
  direction: MetricDirection | null;
  mixed: boolean;
};

export function aggregateMetricDirections(
  reporting: ReadonlyArray<{
    experimentId: string;
    metricKeys: Iterable<string>;
  }>,
  declared: ReadonlyMap<string, Readonly<Record<string, MetricDirection>>>,
): Record<string, AggregatedMetricDirection> {
  const experimentsByKey = new Map<string, Set<string>>();
  for (const { experimentId, metricKeys } of reporting) {
    for (const metricKey of metricKeys) {
      const set = experimentsByKey.get(metricKey) ?? new Set<string>();
      set.add(experimentId);
      experimentsByKey.set(metricKey, set);
    }
  }

  const result: Record<string, AggregatedMetricDirection> = {};
  for (const [metricKey, experimentIds] of experimentsByKey) {
    const values = [...experimentIds].map(
      (experimentId) => declared.get(experimentId)?.[metricKey] ?? null,
    );
    const declaredValues = values.filter(
      (value): value is MetricDirection => value !== null,
    );
    // Nothing declared anywhere: unknown, and not worth an entry.
    if (declaredValues.length === 0) continue;

    const agree =
      declaredValues.length === values.length &&
      declaredValues.every((value) => value === declaredValues[0]);
    result[metricKey] = agree
      ? { direction: declaredValues[0], mixed: false }
      : { direction: null, mixed: true };
  }
  return result;
}
