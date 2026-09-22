export type EvaluationResult = {
  id: string;
  trainingRunId: string;
  datasetVersionId: string;
  name: string | null;
  metrics: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
};
