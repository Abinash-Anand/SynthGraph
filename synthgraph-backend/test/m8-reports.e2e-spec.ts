import { createHash, randomBytes } from 'node:crypto';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module.js';
import { ApiKey } from '../src/database/entities/api-key.entity.js';
import { Dataset } from '../src/database/entities/dataset.entity.js';
import { DatasetVersion } from '../src/database/entities/dataset-version.entity.js';
import { EvaluationResult } from '../src/database/entities/evaluation-result.entity.js';
import { Experiment } from '../src/database/entities/experiment.entity.js';
import { Project } from '../src/database/entities/project.entity.js';
import { TrainingRunMetric } from '../src/database/entities/training-run-metric.entity.js';
import {
  TrainingRun,
  TrainingRunStatus,
} from '../src/database/entities/training-run.entity.js';
import { User } from '../src/database/entities/user.entity.js';

describe('M8 Reports (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let userA: User;
  let userB: User;
  let apiKeyA: string;
  let apiKeyB: string;

  let projectA: Project;
  let projectB: Project;
  let projectC: Project; // userA, but isolated from projectA's fleet-wide report counts
  let experimentA1: Experiment;
  let experimentA2: Experiment;
  let experimentB: Experiment;
  let experimentC: Experiment;

  let runA1: TrainingRun; // completed, lr=0.01, capture unknown (null)
  let runA2: TrainingRun; // completed, lr=0.1, capture partial (wandb attached, not closed)
  let runA3: TrainingRun; // pending (no timestamps), capture complete (wandb attached+closed)
  let runA4: TrainingRun; // completed, lr=0.02, metrics.finalLoss=0.05, has step-metric history
  let runA5: TrainingRun; // completed, only 1 step-metric row (insufficient_data case)
  let runB1: TrainingRun; // belongs to userB - must never appear in userA's reports

  let datasetA: Dataset;
  let datasetVersionA: DatasetVersion;

  let userRepository: ReturnType<DataSource['getRepository']>;
  let apiKeyRepository: ReturnType<DataSource['getRepository']>;
  let projectRepository: ReturnType<DataSource['getRepository']>;
  let experimentRepository: ReturnType<DataSource['getRepository']>;
  let trainingRunRepository: ReturnType<DataSource['getRepository']>;
  let trainingRunMetricRepository: ReturnType<DataSource['getRepository']>;
  let datasetRepository: ReturnType<DataSource['getRepository']>;
  let datasetVersionRepository: ReturnType<DataSource['getRepository']>;
  let evaluationResultRepository: ReturnType<DataSource['getRepository']>;

  function createRawApiKey(): string {
    return `sg_${randomBytes(32).toString('hex')}`;
  }

  function hashApiKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    dataSource = app.get(DataSource);

    userRepository = dataSource.getRepository(User);
    apiKeyRepository = dataSource.getRepository(ApiKey);
    projectRepository = dataSource.getRepository(Project);
    experimentRepository = dataSource.getRepository(Experiment);
    trainingRunRepository = dataSource.getRepository(TrainingRun);
    trainingRunMetricRepository = dataSource.getRepository(TrainingRunMetric);
    datasetRepository = dataSource.getRepository(Dataset);
    datasetVersionRepository = dataSource.getRepository(DatasetVersion);
    evaluationResultRepository = dataSource.getRepository(EvaluationResult);

    userA = await userRepository.save(
      userRepository.create({
        email: `m8-reports-a-${randomBytes(8).toString('hex')}@example.com`,
      }),
    );
    userB = await userRepository.save(
      userRepository.create({
        email: `m8-reports-b-${randomBytes(8).toString('hex')}@example.com`,
      }),
    );

    apiKeyA = createRawApiKey();
    apiKeyB = createRawApiKey();
    await apiKeyRepository.save([
      apiKeyRepository.create({
        userId: userA.id,
        keyPrefix: apiKeyA.slice(0, 16),
        keyHash: hashApiKey(apiKeyA),
        revokedAt: null,
      }),
      apiKeyRepository.create({
        userId: userB.id,
        keyPrefix: apiKeyB.slice(0, 16),
        keyHash: hashApiKey(apiKeyB),
        revokedAt: null,
      }),
    ]);

    projectA = await projectRepository.save(
      projectRepository.create({
        userId: userA.id,
        name: 'M8 Reports Project A',
        description: null,
      }),
    );
    projectB = await projectRepository.save(
      projectRepository.create({
        userId: userB.id,
        name: 'M8 Reports Project B',
        description: null,
      }),
    );
    // Isolated from projectA so the new health/search/best-runs fixtures
    // below never shift projectA's/experimentA1's existing fleet-wide
    // counts (capture-completeness, efficiency-leaderboard,
    // parameter-correlation are all already asserting exact totals there).
    projectC = await projectRepository.save(
      projectRepository.create({
        userId: userA.id,
        name: 'M8 Reports Project C',
        description: null,
      }),
    );

    experimentA1 = await experimentRepository.save(
      experimentRepository.create({
        projectId: projectA.id,
        name: 'M8 Reports Experiment A1',
        description: null,
      }),
    );
    experimentA2 = await experimentRepository.save(
      experimentRepository.create({
        projectId: projectA.id,
        name: 'M8 Reports Experiment A2',
        description: null,
      }),
    );
    experimentB = await experimentRepository.save(
      experimentRepository.create({
        projectId: projectB.id,
        name: 'M8 Reports Experiment B',
        description: null,
      }),
    );
    experimentC = await experimentRepository.save(
      experimentRepository.create({
        projectId: projectC.id,
        name: 'M8 Reports Experiment C',
        description: null,
      }),
    );

    const startedAt = new Date('2026-01-01T00:00:00.000Z');
    const completedAt = new Date('2026-01-01T01:00:00.000Z'); // 3600s duration

    runA1 = await trainingRunRepository.save(
      trainingRunRepository.create({
        experimentId: experimentA1.id,
        name: 'Run A1 (lr=0.01)',
        description: null,
        trainer: { name: 'pytorch', version: '2.8.0' },
        parameters: { lr: 0.01, epochs: 10 },
        metrics: {},
        metadata: {},
        status: TrainingRunStatus.Completed,
        startedAt,
        completedAt,
        captureStatus: null, // never reported -> "unknown"
      }),
    );

    runA2 = await trainingRunRepository.save(
      trainingRunRepository.create({
        experimentId: experimentA1.id,
        name: 'Run A2 (lr=0.1)',
        description: null,
        trainer: { name: 'pytorch', version: '2.8.0' },
        parameters: { lr: 0.1, epochs: 10 },
        metrics: {},
        metadata: {},
        status: TrainingRunStatus.Completed,
        startedAt,
        completedAt,
        captureStatus: {
          status: 'partial',
          integrations: { wandb: { attached: true, closed: false } },
        },
      }),
    );

    runA3 = await trainingRunRepository.save(
      trainingRunRepository.create({
        experimentId: experimentA2.id,
        name: 'Run A3 (still pending)',
        description: null,
        trainer: { name: 'pytorch', version: '2.8.0' },
        parameters: { lr: 0.05 },
        metrics: {},
        metadata: {},
        status: TrainingRunStatus.Pending,
        startedAt: null,
        completedAt: null,
        captureStatus: {
          status: 'complete',
          integrations: { wandb: { attached: true, closed: true } },
        },
      }),
    );

    runB1 = await trainingRunRepository.save(
      trainingRunRepository.create({
        experimentId: experimentB.id,
        name: 'Run B1 (other user)',
        description: null,
        trainer: { name: 'pytorch', version: '2.8.0' },
        parameters: { lr: 0.01 },
        metrics: {},
        metadata: {},
        status: TrainingRunStatus.Completed,
        startedAt,
        completedAt,
        captureStatus: {
          status: 'partial',
          integrations: { wandb: { attached: true, closed: false } },
        },
      }),
    );

    runA4 = await trainingRunRepository.save(
      trainingRunRepository.create({
        experimentId: experimentC.id,
        name: 'Run A4 (metric history)',
        description: null,
        trainer: { name: 'pytorch', version: '2.8.0' },
        parameters: { lr: 0.02 },
        metrics: { finalLoss: 0.05 },
        metadata: {},
        status: TrainingRunStatus.Completed,
        startedAt,
        completedAt,
        captureStatus: null,
      }),
    );

    runA5 = await trainingRunRepository.save(
      trainingRunRepository.create({
        experimentId: experimentC.id,
        name: 'Run A5 (single step)',
        description: null,
        trainer: { name: 'pytorch', version: '2.8.0' },
        parameters: {},
        metrics: {},
        metadata: {},
        status: TrainingRunStatus.Completed,
        startedAt,
        completedAt,
        captureStatus: null,
      }),
    );

    // accuracy strictly increases step-over-step (0.1 -> 0.5); loss is
    // constant - one run exercising both 'increasing' and 'flat' trends.
    await trainingRunMetricRepository.save(
      [1, 2, 3, 4, 5].map((step) =>
        trainingRunMetricRepository.create({
          trainingRunId: runA4.id,
          step,
          metrics: { accuracy: 0.1 * step, loss: 0.5 },
        }),
      ),
    );

    await trainingRunMetricRepository.save(
      trainingRunMetricRepository.create({
        trainingRunId: runA5.id,
        step: 1,
        metrics: { accuracy: 0.5 },
      }),
    );

    datasetA = await datasetRepository.save(
      datasetRepository.create({
        userId: userA.id,
        name: 'M8 Reports Dataset A',
        description: null,
        metadata: {},
      }),
    );
    datasetVersionA = await datasetVersionRepository.save(
      datasetVersionRepository.create({
        datasetId: datasetA.id,
        version: 'v1',
        uri: 's3://bucket/m8-reports-dataset-v1',
        format: null,
        size: null,
        checksum: null,
        metadata: {},
      }),
    );

    await evaluationResultRepository.save([
      evaluationResultRepository.create({
        trainingRunId: runA1.id,
        datasetVersionId: datasetVersionA.id,
        name: 'eval-a1',
        metrics: { mAP: 0.9 },
        metadata: {},
      }),
      evaluationResultRepository.create({
        trainingRunId: runA2.id,
        datasetVersionId: datasetVersionA.id,
        name: 'eval-a2',
        metrics: { mAP: 0.6 },
        metadata: {},
      }),
    ]);
  });

  afterAll(async () => {
    await evaluationResultRepository.delete({ trainingRunId: runA1.id });
    await evaluationResultRepository.delete({ trainingRunId: runA2.id });
    await datasetVersionRepository.delete(datasetVersionA.id);
    await datasetRepository.delete(datasetA.id);
    await trainingRunMetricRepository.delete({ trainingRunId: runA4.id });
    await trainingRunMetricRepository.delete({ trainingRunId: runA5.id });
    await trainingRunRepository.delete([
      runA1.id,
      runA2.id,
      runA3.id,
      runA4.id,
      runA5.id,
      runB1.id,
    ]);
    await experimentRepository.delete([
      experimentA1.id,
      experimentA2.id,
      experimentB.id,
      experimentC.id,
    ]);
    await projectRepository.delete([projectA.id, projectB.id, projectC.id]);
    await apiKeyRepository.delete({ userId: userA.id });
    await apiKeyRepository.delete({ userId: userB.id });
    await userRepository.delete([userA.id, userB.id]);
    await app.close();
  });

  describe('GET /reports/capture-completeness', () => {
    it('requires authentication', async () => {
      await request(app.getHttpServer())
        .get('/reports/capture-completeness')
        .expect(401);
    });

    it('counts by status and integration, scoped to the caller only', async () => {
      // Scoped to projectA specifically - userA also owns projectC (used by
      // the training-run-health/search/best-runs fixtures below), so an
      // unscoped fleet-wide count would no longer be exactly 3.
      const response = await request(app.getHttpServer())
        .get(`/reports/capture-completeness?projectId=${projectA.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(response.body.total).toBe(3);
      expect(response.body.byStatus).toEqual({
        complete: 1,
        partial: 1,
        unknown: 1,
      });
      expect(response.body.byIntegration.wandb).toEqual({
        total: 2,
        attached: 2,
        closed: 1,
      });
    });

    it('respects the optional projectId filter', async () => {
      const response = await request(app.getHttpServer())
        .get(`/reports/capture-completeness?projectId=${projectA.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(response.body.total).toBe(3);
    });

    it("never includes another user's training runs", async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/capture-completeness')
        .set('Authorization', `Bearer ${apiKeyB}`)
        .expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.byStatus).toEqual({
        complete: 0,
        partial: 1,
        unknown: 0,
      });
    });
  });

  describe('GET /reports/efficiency-leaderboard', () => {
    it('only includes completed runs with both timestamps set', async () => {
      // Scoped to projectA - see the capture-completeness note above on why
      // an unscoped query would now also pick up projectC's fixtures.
      const response = await request(app.getHttpServer())
        .get(`/reports/efficiency-leaderboard?projectId=${projectA.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      const runIds = response.body.runs.map(
        (run: { trainingRunId: string }) => run.trainingRunId,
      );
      expect(runIds.sort()).toEqual([runA1.id, runA2.id].sort());
      expect(runIds).not.toContain(runA3.id);
    });

    it('computes duration in seconds and includes evaluations', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/efficiency-leaderboard')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      const run1 = response.body.runs.find(
        (run: { trainingRunId: string }) => run.trainingRunId === runA1.id,
      );
      expect(run1.durationSeconds).toBe(3600);
      expect(run1.evaluations).toHaveLength(1);
      expect(run1.evaluations[0].metrics).toEqual({ mAP: 0.9 });
    });
  });

  describe('GET /reports/parameter-correlation', () => {
    it('requires experimentId', async () => {
      await request(app.getHttpServer())
        .get('/reports/parameter-correlation')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(400);
    });

    it('404s for an experiment that does not belong to the caller', async () => {
      await request(app.getHttpServer())
        .get(`/reports/parameter-correlation?experimentId=${experimentB.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(404);
    });

    it('groups by a varying parameter and computes per-metric stats', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/reports/parameter-correlation?experimentId=${experimentA1.id}`,
        )
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(response.body.runCount).toBe(2);

      const lrCorrelation = response.body.correlations.find(
        (correlation: { parameterKey: string }) =>
          correlation.parameterKey === 'lr',
      );
      expect(lrCorrelation).toBeDefined();
      expect(lrCorrelation.groups).toHaveLength(2);

      const group001 = lrCorrelation.groups.find(
        (group: { value: string }) => group.value === '0.01',
      );
      expect(group001.runCount).toBe(1);
      expect(group001.metrics.mAP).toEqual({ avg: 0.9, min: 0.9, max: 0.9 });

      // epochs is constant (10) across both runs - not varying, so it
      // must not show up as a correlation.
      const epochsCorrelation = response.body.correlations.find(
        (correlation: { parameterKey: string }) =>
          correlation.parameterKey === 'epochs',
      );
      expect(epochsCorrelation).toBeUndefined();
    });

    it('returns an empty report for an experiment with no training runs', async () => {
      const emptyExperiment = await experimentRepository.save(
        experimentRepository.create({
          projectId: projectA.id,
          name: 'M8 Reports Empty Experiment',
          description: null,
        }),
      );

      const response = await request(app.getHttpServer())
        .get(
          `/reports/parameter-correlation?experimentId=${emptyExperiment.id}`,
        )
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(response.body).toEqual({
        experimentId: emptyExperiment.id,
        runCount: 0,
        correlations: [],
      });

      await experimentRepository.delete(emptyExperiment.id);
    });
  });

  describe('GET /reports/training-run-health', () => {
    it('requires trainingRunId', async () => {
      await request(app.getHttpServer())
        .get('/reports/training-run-health')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(400);
    });

    it("404s for another user's training run", async () => {
      await request(app.getHttpServer())
        .get(`/reports/training-run-health?trainingRunId=${runB1.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(404);
    });

    it('classifies a strictly increasing metric as increasing and a constant one as flat', async () => {
      const response = await request(app.getHttpServer())
        .get(`/reports/training-run-health?trainingRunId=${runA4.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(response.body.windowSize).toBe(5);

      const accuracy = response.body.metrics.find(
        (m: { metricKey: string }) => m.metricKey === 'accuracy',
      );
      expect(accuracy.sampleCount).toBe(5);
      expect(accuracy.trend).toBe('increasing');
      expect(accuracy.slope).toBeCloseTo(0.1, 5);
      expect(accuracy.latestStep).toBe(5);
      expect(accuracy.latestValue).toBeCloseTo(0.5, 5);

      const loss = response.body.metrics.find(
        (m: { metricKey: string }) => m.metricKey === 'loss',
      );
      expect(loss.sampleCount).toBe(5);
      expect(loss.trend).toBe('flat');
    });

    it('reports insufficient_data with fewer than 2 sampled points', async () => {
      const response = await request(app.getHttpServer())
        .get(`/reports/training-run-health?trainingRunId=${runA5.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      const accuracy = response.body.metrics.find(
        (m: { metricKey: string }) => m.metricKey === 'accuracy',
      );
      expect(accuracy.sampleCount).toBe(1);
      expect(accuracy.trend).toBe('insufficient_data');
      expect(accuracy.slope).toBeNull();
    });
  });

  describe('GET /reports/training-run-search', () => {
    it('requires field, key, op, and value', async () => {
      await request(app.getHttpServer())
        .get('/reports/training-run-search')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(400);
    });

    it('filters parameters by a numeric range, scoped to the caller only', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/training-run-search?field=parameters&key=lr&op=gt&value=0.015')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      const ids = response.body.matches.map(
        (match: { trainingRunId: string }) => match.trainingRunId,
      );
      expect(ids.sort()).toEqual([runA2.id, runA3.id, runA4.id].sort());
      expect(ids).not.toContain(runA1.id);
      expect(ids).not.toContain(runB1.id);
    });

    it('filters metrics by a numeric range', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/training-run-search?field=metrics&key=finalLoss&op=lt&value=0.1')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(response.body.matches).toHaveLength(1);
      expect(response.body.matches[0].trainingRunId).toBe(runA4.id);
      expect(response.body.matches[0].matchedValue).toBe(0.05);
    });

    it('returns no matches for a key that is never numeric', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/training-run-search?field=parameters&key=nonexistent&op=gte&value=0')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(response.body.matches).toEqual([]);
    });
  });

  describe('GET /reports/best-runs', () => {
    it('reports the max and min per metric across the caller\'s completed runs', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/best-runs')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      const mAP = response.body.records.find(
        (record: { metricKey: string }) => record.metricKey === 'mAP',
      );
      expect(mAP.maxValue).toBe(0.9);
      expect(mAP.maxTrainingRunId).toBe(runA1.id);
      expect(mAP.minValue).toBe(0.6);
      expect(mAP.minTrainingRunId).toBe(runA2.id);
    });

    it("never includes another user's evaluations", async () => {
      const response = await request(app.getHttpServer())
        .get('/reports/best-runs')
        .set('Authorization', `Bearer ${apiKeyB}`)
        .expect(200);

      expect(response.body.records).toEqual([]);
    });
  });
});
