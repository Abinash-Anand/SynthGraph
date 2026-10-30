import type { CaptureIssue, IntegrationHealth } from "../capture-model";
import type {
  AggregatedDirections,
  DeclaredDirection,
  HealthVerdict,
  MetricDirections,
} from "@/shared/lib/metric-direction";

export type CaptureCompletenessReport = {
  total: number;
  byStatus: {
    complete: number;
    partial: number;
    unknown: number;
  };
  byIntegration: Record<
    string,
    { total: number; attached: number; closed: number }
  >;
  /** The same integrations rated by the backend. Absent from a backend that predates it. */
  integrations?: IntegrationHealth[];
};

/** A run behind the report's counts, with what the backend found wrong with its capture. */
export type CaptureCompletenessRun = {
  trainingRunId: string;
  name: string;
  createdAt: string;
  /** The status the run reported, or null when it never reported capture. */
  captureStatus: "complete" | "partial" | "unknown" | null;
  projectId: string;
  projectName: string;
  experimentId: string;
  experimentName: string;
  issues: CaptureIssue[];
};

export type CaptureCompletenessRuns = {
  total: number;
  truncated: boolean;
  runs: CaptureCompletenessRun[];
};

export type EfficiencyLeaderboardEntry = {
  trainingRunId: string;
  name: string;
  durationSeconds: number;
  evaluations: Array<{
    id: string;
    name: string | null;
    metrics: Record<string, unknown>;
  }>;
};

export type EfficiencyLeaderboard = {
  runs: EfficiencyLeaderboardEntry[];
  /**
   * Declared directions across the experiments these runs belong to. Absent from a
   * backend that predates declared directions, which reads the same as nothing declared.
   */
  metricDirections?: AggregatedDirections;
};

export type ParameterCorrelationGroup = {
  value: string;
  runCount: number;
  metrics: Record<string, { avg: number; min: number; max: number }>;
};

export type ParameterCorrelation = {
  parameterKey: string;
  groups: ParameterCorrelationGroup[];
};

export type ParameterCorrelationReport = {
  experimentId: string;
  runCount: number;
  /** The directions declared in this experiment; a metric not listed has none. */
  metricDirections?: MetricDirections;
  correlations: ParameterCorrelation[];
};

export type TrainingRunHealthMetric = {
  metricKey: string;
  sampleCount: number;
  trend: "increasing" | "decreasing" | "flat" | "insufficient_data";
  slope: number | null;
  latestStep: number | null;
  latestValue: number | null;
  /** The declared direction, or null when none was declared. */
  direction?: DeclaredDirection | null;
  /** The backend's reading of the trend against the declared direction. */
  verdict?: HealthVerdict;
};

export type TrainingRunHealthReport = {
  trainingRunId: string;
  windowSize: number;
  metrics: TrainingRunHealthMetric[];
};

/** Every run of one experiment's health, in the same order as the run list. */
export type ExperimentTrainingRunHealthReport = {
  experimentId: string;
  windowSize: number;
  runs: TrainingRunHealthReport[];
};

export type TrainingRunSearchField = "parameters" | "metrics";
export type TrainingRunSearchOperator = "gt" | "gte" | "lt" | "lte" | "eq";

export type TrainingRunSearchMatch = {
  trainingRunId: string;
  name: string;
  experimentId: string;
  matchedValue: number;
};

export type TrainingRunSearchResult = {
  matches: TrainingRunSearchMatch[];
};

export type BestRunsRecord = {
  metricKey: string;
  maxValue: number;
  maxTrainingRunId: string;
  maxTrainingRunName: string;
  minValue: number;
  minTrainingRunId: string;
  minTrainingRunName: string;
};

export type BestRunsReport = {
  projectId: string | null;
  runCount: number;
  records: BestRunsRecord[];
  /** Declared directions across the experiments reporting each metric; undeclared metrics are absent. */
  metricDirections?: AggregatedDirections;
};

export type TrainingRunDriftEntry = {
  field: string;
  currentValue: unknown;
  baselineValue: unknown;
};

export type TrainingRunDriftReport = {
  trainingRunId: string;
  baselineRunCount: number;
  drift: TrainingRunDriftEntry[];
};

/** Every run of one experiment's drift, in the same order as the run list. */
export type ExperimentTrainingRunDriftReport = {
  experimentId: string;
  runs: TrainingRunDriftReport[];
};

export type DatasetImpactMetric = {
  metricKey: string;
  avg: number;
  highestValue: number;
  highestTrainingRunId: string;
  highestTrainingRunName: string;
  lowestValue: number;
  lowestTrainingRunId: string;
  lowestTrainingRunName: string;
};

export type DatasetImpactReport = {
  datasetVersionId: string;
  generationCount: number;
  trainingRuns: Array<{ trainingRunId: string; name: string; status: string }>;
  metrics: DatasetImpactMetric[];
};

export type TrainingRunKeysReport = {
  keys: string[];
};
