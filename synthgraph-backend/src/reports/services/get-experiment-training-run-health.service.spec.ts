import { NotFoundException } from '@nestjs/common';

import { GetExperimentTrainingRunHealthService } from './get-experiment-training-run-health.service.js';
import { buildTrainingRunHealthReport } from './get-training-run-health.service.js';

const metricRow = (step: number, value: number) =>
  ({ step, metrics: { loss: value, label: 'not-a-number' } }) as never;

describe('GetExperimentTrainingRunHealthService', () => {
  const reportsRepository = { findRecentMetricsForTrainingRun: vi.fn() };
  const experimentRepository = { findByIdForUser: vi.fn() };
  const trainingRunRepository = { findAllForExperiment: vi.fn() };
  const metricDirectionsService = { forExperiment: vi.fn() };

  let service: GetExperimentTrainingRunHealthService;

  beforeEach(() => {
    vi.clearAllMocks();
    metricDirectionsService.forExperiment.mockResolvedValue({});
    service = new GetExperimentTrainingRunHealthService(
      reportsRepository as never,
      experimentRepository as never,
      trainingRunRepository as never,
      metricDirectionsService as never,
    );
  });

  it('returns one report per run, in run order, identical to the per-run builder', async () => {
    experimentRepository.findByIdForUser.mockResolvedValue({ id: 'experiment-1' });
    trainingRunRepository.findAllForExperiment.mockResolvedValue([{ id: 'run-a' }, { id: 'run-b' }]);
    const rowsByRun: Record<string, unknown[]> = {
      'run-a': [metricRow(1, 1.0), metricRow(2, 0.8), metricRow(3, 0.6)],
      'run-b': [metricRow(1, 5)],
    };
    reportsRepository.findRecentMetricsForTrainingRun.mockImplementation(
      async (runId: string) => rowsByRun[runId],
    );

    const report = await service.execute('experiment-1', 'user-1', 100, 0, 3);

    expect(report.experimentId).toBe('experiment-1');
    expect(report.windowSize).toBe(3);
    expect(report.runs.map((r) => r.trainingRunId)).toEqual(['run-a', 'run-b']);
    expect(report.runs[0]).toEqual(buildTrainingRunHealthReport('run-a', 3, rowsByRun['run-a'] as never));
    expect(report.runs[0].metrics[0].trend).toBe('decreasing');
    expect(report.runs[1].metrics[0].trend).toBe('insufficient_data');
    expect(trainingRunRepository.findAllForExperiment).toHaveBeenCalledWith('experiment-1', 100, 0);
    expect(reportsRepository.findRecentMetricsForTrainingRun).toHaveBeenCalledWith('run-a', 3);
  });

  it('gives each metric the direction declared in the experiment, and a verdict from it', async () => {
    experimentRepository.findByIdForUser.mockResolvedValue({ id: 'experiment-1' });
    trainingRunRepository.findAllForExperiment.mockResolvedValue([{ id: 'run-a' }]);
    reportsRepository.findRecentMetricsForTrainingRun.mockResolvedValue([
      metricRow(1, 1.0),
      metricRow(2, 0.8),
      metricRow(3, 0.6),
    ]);
    metricDirectionsService.forExperiment.mockResolvedValue({ loss: 'minimize' });

    const report = await service.execute('experiment-1', 'user-1', 100, 0, 3);

    expect(metricDirectionsService.forExperiment).toHaveBeenCalledWith('experiment-1');
    expect(report.runs[0].metrics[0]).toMatchObject({
      metricKey: 'loss',
      trend: 'decreasing',
      direction: 'minimize',
      verdict: 'improving',
    });
  });

  it('has no direction and no verdict for a metric nobody declared', async () => {
    experimentRepository.findByIdForUser.mockResolvedValue({ id: 'experiment-1' });
    trainingRunRepository.findAllForExperiment.mockResolvedValue([{ id: 'run-a' }]);
    reportsRepository.findRecentMetricsForTrainingRun.mockResolvedValue([
      metricRow(1, 1.0),
      metricRow(2, 0.8),
      metricRow(3, 0.6),
    ]);

    const report = await service.execute('experiment-1', 'user-1', 100, 0, 3);

    expect(report.runs[0].metrics[0]).toMatchObject({
      trend: 'decreasing',
      direction: null,
      verdict: 'neutral',
    });
  });

  it('defaults the window to the per-run route\'s default', async () => {
    experimentRepository.findByIdForUser.mockResolvedValue({ id: 'experiment-1' });
    trainingRunRepository.findAllForExperiment.mockResolvedValue([{ id: 'run-a' }]);
    reportsRepository.findRecentMetricsForTrainingRun.mockResolvedValue([]);

    const report = await service.execute('experiment-1', 'user-1', 100, 0);

    expect(report.windowSize).toBe(5);
    expect(report.runs[0]).toEqual({ trainingRunId: 'run-a', windowSize: 5, metrics: [] });
  });

  it('is not found when the experiment is not the user\'s', async () => {
    experimentRepository.findByIdForUser.mockResolvedValue(null);

    await expect(service.execute('experiment-1', 'user-1', 100, 0)).rejects.toBeInstanceOf(NotFoundException);
    expect(trainingRunRepository.findAllForExperiment).not.toHaveBeenCalled();
  });
});
