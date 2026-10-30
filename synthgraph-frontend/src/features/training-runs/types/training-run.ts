import type { DatasetVersion } from "@/features/datasets/types/dataset";

export type TrainingRunStatus = "pending" | "running" | "completed" | "failed";
export type CaptureStatusValue = "complete" | "partial" | "unknown";

export type CaptureIntegration = {
  attached: boolean;
  closed: boolean;
};

export type CaptureStatus = {
  status: CaptureStatusValue;
  integrations: Record<string, CaptureIntegration>;
};

export type TrainingRunTrainer = {
  name: string;
  version?: string;
  type?: string;
};

/**
 * A generation a training run was recorded as using. Recorded by whoever ran
 * the training, never worked out from names or timestamps. A generation can be in
 * another experiment of the same project, so its experiment and name are carried.
 */
export type GenerationReference = {
  generationId: string;
  generationName: string;
  experimentId: string;
  createdAt: string;
};

/**
 * Raw entity, camelCase. `datasets` is NOT a real column — the backend
 * populates it server-side (from TrainingRunDatasetReference rows) on
 * get/list/create responses. `captureStatus` is nullable and DISTINCT from
 * `{}`: null means an old SDK never reported capture status at all, `{}`
 * means it explicitly reported no integrations attached — don't conflate
 * the two in the UI.
 */
export type TrainingRun = {
  id: string;
  experimentId: string;
  name: string;
  description: string | null;
  trainer: TrainingRunTrainer;
  parameters: Record<string, unknown>;
  /** Summary/aggregate metrics on the run itself — distinct from the
   * per-step TrainingRunMetric rows (see training-run-metric.ts). */
  metrics: Record<string, unknown>;
  status: TrainingRunStatus;
  startedAt: string | null;
  completedAt: string | null;
  metadata: Record<string, unknown>;
  captureStatus: CaptureStatus | null;
  createdAt: string;
  updatedAt: string;
  datasets?: DatasetVersion[];
  /**
   * The generations this run was recorded as using. Empty (or absent, from a backend
   * that predates it) means none was recorded, not that none was used.
   */
  generationReferences?: GenerationReference[];
};
