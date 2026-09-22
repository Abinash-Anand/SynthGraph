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
