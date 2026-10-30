export type EvaluationResult = {
  id: string;
  trainingRunId: string;
  datasetVersionId: string;
  name: string | null;
  /**
   * The training step the caller recorded for this evaluation. Null (or absent, from
   * a backend that predates it) means none was recorded; it is never read from the name.
   */
  checkpointStep?: number | null;
  metrics: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
};
