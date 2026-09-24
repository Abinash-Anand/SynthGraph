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
  correlations: ParameterCorrelation[];
};

export type TrainingRunHealthMetric = {
  metricKey: string;
  sampleCount: number;
  trend: "increasing" | "decreasing" | "flat" | "insufficient_data";
  slope: number | null;
  latestStep: number | null;
  latestValue: number | null;
};

export type TrainingRunHealthReport = {
  trainingRunId: string;
  windowSize: number;
  metrics: TrainingRunHealthMetric[];
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
