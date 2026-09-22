/** Kept in the training-runs feature, not split out — metrics only ever
 * render inside a run's own detail page; there's no standalone route. */
export type TrainingRunMetric = {
  id: string;
  trainingRunId: string;
  step: number;
  /** Arbitrary JSON by convention (e.g. {loss, accuracy, ...}) — the
   * backend does not enforce a fixed shape. */
  metrics: Record<string, unknown>;
  createdAt: string;
};
