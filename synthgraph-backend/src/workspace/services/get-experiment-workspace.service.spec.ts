import { NotFoundException } from '@nestjs/common';

import { GetExperimentWorkspaceService } from './get-experiment-workspace.service.js';

const generation = (id: string) =>
  ({
    id,
    experimentId: 'experiment-1',
    name: `generation-${id}`,
    description: null,
    generator: { name: 'blender', version: '4.2' },
    parameters: {},
    reproducibility: { seed: 1 },
    status: 'completed',
    inputs: [],
    outputs: [],
    metadata: {},
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    startedAt: null,
    completedAt: null,
  }) as never;

describe('GetExperimentWorkspaceService', () => {
  const getExperimentService = { executeForUser: vi.fn() };
  const parameterCorrelationService = { execute: vi.fn() };
  const listTrainingRunsService = { execute: vi.fn() };
  const listTrainingRunMetricsService = { execute: vi.fn() };
  const listEvaluationResultsService = { execute: vi.fn() };
  const healthService = { forTrainingRuns: vi.fn() };
  const driftService = { forTrainingRuns: vi.fn() };
  const listGenerationsService = { execute: vi.fn() };
  const manifestsService = { forGenerations: vi.fn() };
  const metricDirectionsService = { forExperiment: vi.fn() };

  let service: GetExperimentWorkspaceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GetExperimentWorkspaceService(
      getExperimentService as never,
      parameterCorrelationService as never,
      listTrainingRunsService as never,
      listTrainingRunMetricsService as never,
      listEvaluationResultsService as never,
      healthService as never,
      driftService as never,
      listGenerationsService as never,
      manifestsService as never,
      metricDirectionsService as never,
    );
    metricDirectionsService.forExperiment.mockResolvedValue({});
  });

  it('assembles the same pieces the separate routes return, aligned by run and generation', async () => {
    getExperimentService.executeForUser.mockResolvedValue({
      id: 'experiment-1',
    });
    parameterCorrelationService.execute.mockResolvedValue({
      experimentId: 'experiment-1',
    });
    listTrainingRunsService.execute.mockResolvedValue([
      { id: 'run-a' },
      { id: 'run-b' },
    ]);
    listTrainingRunMetricsService.execute.mockImplementation(
      async (runId: string) => [{ trainingRunId: runId }],
    );
    listEvaluationResultsService.execute.mockImplementation(
      async (runId: string) => [{ name: `eval-${runId}` }],
    );
    healthService.forTrainingRuns.mockResolvedValue([
      { trainingRunId: 'run-a' },
      { trainingRunId: 'run-b' },
    ]);
    driftService.forTrainingRuns.mockResolvedValue([
      { trainingRunId: 'run-a', baselineRunCount: 0, drift: [] },
      { trainingRunId: 'run-b', baselineRunCount: 1, drift: [] },
    ]);
    listGenerationsService.execute.mockResolvedValue([
      generation('g1'),
      generation('g2'),
    ]);
    manifestsService.forGenerations.mockResolvedValue([
      { id: 'm1' },
      { id: 'm2' },
    ]);

    const workspace = await service.execute('experiment-1', 'user-1');

    expect(workspace.experiment).toEqual({ id: 'experiment-1' });
    expect(workspace.metricDirections).toEqual({});
    expect(workspace.correlation).toEqual({ experimentId: 'experiment-1' });
    expect(workspace.trainingRuns.map((r) => r.run.id)).toEqual([
      'run-a',
      'run-b',
    ]);
    expect(workspace.trainingRuns[1]).toMatchObject({
      metrics: [{ trainingRunId: 'run-b' }],
      evaluations: [{ name: 'eval-run-b' }],
      health: { trainingRunId: 'run-b' },
      drift: { trainingRunId: 'run-b', baselineRunCount: 1 },
    });
    expect(workspace.generations.map((g) => g.generation.id)).toEqual([
      'g1',
      'g2',
    ]);
    expect(workspace.generations[0].generation).toHaveProperty(
      'experiment_id',
      'experiment-1',
    );
    expect(workspace.generations.map((g) => g.manifest)).toEqual([
      { id: 'm1' },
      { id: 'm2' },
    ]);
  });

  it('computes health, drift and manifests from the very lists it returns', async () => {
    getExperimentService.executeForUser.mockResolvedValue({
      id: 'experiment-1',
    });
    parameterCorrelationService.execute.mockResolvedValue({});
    const runs = [{ id: 'run-a' }];
    const generations = [generation('g1')];
    listTrainingRunsService.execute.mockResolvedValue(runs);
    listTrainingRunMetricsService.execute.mockResolvedValue([]);
    listEvaluationResultsService.execute.mockResolvedValue([]);
    healthService.forTrainingRuns.mockResolvedValue([
      { trainingRunId: 'run-a' },
    ]);
    driftService.forTrainingRuns.mockResolvedValue([
      { trainingRunId: 'run-a', baselineRunCount: 0, drift: [] },
    ]);
    listGenerationsService.execute.mockResolvedValue(generations);
    manifestsService.forGenerations.mockResolvedValue([{ id: 'm1' }]);

    await service.execute('experiment-1', 'user-1');

    expect(healthService.forTrainingRuns).toHaveBeenCalledWith(runs, undefined, {});
    expect(driftService.forTrainingRuns).toHaveBeenCalledWith(runs);
    expect(manifestsService.forGenerations).toHaveBeenCalledWith(generations);
    expect(listTrainingRunsService.execute).toHaveBeenCalledWith(
      'experiment-1',
      'user-1',
      undefined,
      100,
      0,
    );
  });

  it('flags attention from the very runs and drift it returns', async () => {
    getExperimentService.executeForUser.mockResolvedValue({ id: 'experiment-1' });
    parameterCorrelationService.execute.mockResolvedValue({});
    const runs = [
      { id: 'run-ok', status: 'completed', captureStatus: { status: 'complete' } },
      { id: 'run-bad', status: 'failed', captureStatus: null },
      { id: 'run-drift', status: 'completed', captureStatus: { status: 'complete' } },
    ];
    listTrainingRunsService.execute.mockResolvedValue(runs);
    listTrainingRunMetricsService.execute.mockResolvedValue([]);
    listEvaluationResultsService.execute.mockResolvedValue([]);
    healthService.forTrainingRuns.mockResolvedValue(runs.map((r) => ({ trainingRunId: r.id })));
    driftService.forTrainingRuns.mockResolvedValue([
      { trainingRunId: 'run-ok', baselineRunCount: 0, drift: [] },
      { trainingRunId: 'run-bad', baselineRunCount: 0, drift: [] },
      { trainingRunId: 'run-drift', baselineRunCount: 2, drift: [{}, {}] },
    ]);
    listGenerationsService.execute.mockResolvedValue([]);
    manifestsService.forGenerations.mockResolvedValue([]);

    const workspace = await service.execute('experiment-1', 'user-1');

    expect(workspace.attention.runsChecked).toBe(3);
    expect(workspace.attention.runs).toEqual([
      {
        trainingRunId: 'run-bad',
        reasons: [{ code: 'run_failed' }, { code: 'capture_not_reported' }],
      },
      {
        trainingRunId: 'run-drift',
        reasons: [{ code: 'drift', driftFields: 2 }],
      },
    ]);
    expect(workspace.attention.checks.map((check) => check.code)).toEqual([
      'run_failed',
      'capture_partial',
      'capture_unknown',
      'capture_not_reported',
      'drift',
    ]);
  });

  it("is not found, and returns nothing, when the experiment is not the user's", async () => {
    getExperimentService.executeForUser.mockRejectedValue(
      new NotFoundException('Experiment not found'),
    );
    parameterCorrelationService.execute.mockRejectedValue(
      new NotFoundException('Experiment not found'),
    );
    listTrainingRunsService.execute.mockRejectedValue(
      new NotFoundException('Experiment not found'),
    );
    listGenerationsService.execute.mockRejectedValue(
      new NotFoundException('Experiment not found'),
    );

    await expect(
      service.execute('experiment-1', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
