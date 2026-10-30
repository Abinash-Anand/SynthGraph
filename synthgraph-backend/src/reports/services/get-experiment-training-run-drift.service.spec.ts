import { NotFoundException } from '@nestjs/common';

import { GetExperimentTrainingRunDriftService } from './get-experiment-training-run-drift.service.js';
import { buildTrainingRunDriftReport } from './get-training-run-drift.service.js';

const run = (id: string, version: string, createdAt: string) =>
  ({
    id,
    experimentId: 'experiment-1',
    trainer: { name: 'PPO', version, type: 'brax' },
    metadata: {},
    createdAt: new Date(createdAt),
  });

describe('GetExperimentTrainingRunDriftService', () => {
  const reportsRepository = { findPriorCompletedTrainingRunsInExperiment: vi.fn() };
  const experimentRepository = { findByIdForUser: vi.fn() };
  const trainingRunRepository = { findAllForExperiment: vi.fn() };

  let service: GetExperimentTrainingRunDriftService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GetExperimentTrainingRunDriftService(
      reportsRepository as never,
      experimentRepository as never,
      trainingRunRepository as never,
    );
  });

  it('returns one report per run, each using that run\'s own baseline', async () => {
    const first = run('run-1', '0.14.2', '2026-01-01T00:00:00Z');
    const second = run('run-2', '0.15.0', '2026-01-02T00:00:00Z');
    experimentRepository.findByIdForUser.mockResolvedValue({ id: 'experiment-1' });
    trainingRunRepository.findAllForExperiment.mockResolvedValue([first, second]);
    reportsRepository.findPriorCompletedTrainingRunsInExperiment.mockImplementation(
      async (_experimentId: string, _before: Date, runId: string) => (runId === 'run-1' ? [] : [first]),
    );

    const report = await service.execute('experiment-1', 'user-1', 100, 0);

    expect(report.experimentId).toBe('experiment-1');
    expect(report.runs).toEqual([
      { trainingRunId: 'run-1', baselineRunCount: 0, drift: [] },
      buildTrainingRunDriftReport(second as never, [first] as never),
    ]);
    expect(report.runs[1].drift).toEqual([
      { field: 'trainer.version', currentValue: '0.15.0', baselineValue: '0.14.2' },
    ]);
    expect(reportsRepository.findPriorCompletedTrainingRunsInExperiment).toHaveBeenCalledWith(
      'experiment-1',
      second.createdAt,
      'run-2',
    );
  });

  it('is not found when the experiment is not the user\'s', async () => {
    experimentRepository.findByIdForUser.mockResolvedValue(null);

    await expect(service.execute('experiment-1', 'user-1', 100, 0)).rejects.toBeInstanceOf(NotFoundException);
    expect(trainingRunRepository.findAllForExperiment).not.toHaveBeenCalled();
  });
});
