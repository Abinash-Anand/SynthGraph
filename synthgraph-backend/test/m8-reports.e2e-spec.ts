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
  let experimentA1: Experiment;
  let experimentA2: Experiment;
  let experimentB: Experiment;

  let runA1: TrainingRun; // completed, lr=0.01, capture unknown (null)
  let runA2: TrainingRun; // completed, lr=0.1, capture partial (wandb attached, not closed)
  let runA3: TrainingRun; // pending (no timestamps), capture complete (wandb attached+closed)
  let runB1: TrainingRun; // belongs to userB - must never appear in userA's reports

  let datasetA: Dataset;
  let datasetVersionA: DatasetVersion;

  let userRepository: ReturnType<DataSource['getRepository']>;
  let apiKeyRepository: ReturnType<DataSource['getRepository']>;
  let projectRepository: ReturnType<DataSource['getRepository']>;
  let experimentRepository: ReturnType<DataSource['getRepository']>;
  let trainingRunRepository: ReturnType<DataSource['getRepository']>;
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
    await trainingRunRepository.delete([
      runA1.id,
      runA2.id,
      runA3.id,
      runB1.id,
    ]);
    await experimentRepository.delete([
      experimentA1.id,
      experimentA2.id,
      experimentB.id,
    ]);
    await projectRepository.delete([projectA.id, projectB.id]);
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
      const response = await request(app.getHttpServer())
        .get('/reports/capture-completeness')
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
      const response = await request(app.getHttpServer())
        .get('/reports/efficiency-leaderboard')
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
});
