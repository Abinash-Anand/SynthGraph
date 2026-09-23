import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash, randomBytes } from 'node:crypto';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';

import { AppModule } from '../src/app.module.js';
import { ApiKey } from '../src/database/entities/api-key.entity.js';
import { Experiment } from '../src/database/entities/experiment.entity.js';
import { Project } from '../src/database/entities/project.entity.js';
import {
  TrainingRun,
  TrainingRunStatus,
} from '../src/database/entities/training-run.entity.js';
import { User } from '../src/database/entities/user.entity.js';

describe('M10 Training run comparison (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let userRepository: Repository<User>;
  let apiKeyRepository: Repository<ApiKey>;
  let projectRepository: Repository<Project>;
  let experimentRepository: Repository<Experiment>;
  let trainingRunRepository: Repository<TrainingRun>;

  let userA: User;
  let userB: User;

  let projectA: Project;
  let projectB: Project;

  let experimentA: Experiment;
  let experimentB: Experiment;

  let runA: TrainingRun;
  let runB: TrainingRun;
  let runC: TrainingRun;
  let runOtherUser: TrainingRun;

  let apiKeyA: string;
  let apiKeyB: string;

  function createRawApiKey(): string {
    return `sg_${randomBytes(32).toString('hex')}`;
  }

  function hashApiKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }

  async function createTrainingRun(
    experimentId: string,
    name: string,
    parameters: Record<string, unknown>,
    metrics: Record<string, unknown>,
  ): Promise<TrainingRun> {
    return trainingRunRepository.save(
      trainingRunRepository.create({
        experimentId,
        name,
        description: `Comparison run: ${name}`,
        trainer: {
          name: 'custom',
          version: '1.0',
        },
        parameters,
        metrics,
        status: TrainingRunStatus.Completed,
        startedAt: new Date(),
        completedAt: new Date(),
        metadata: {},
      }),
    );
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    dataSource = moduleFixture.get(DataSource);

    userRepository = dataSource.getRepository(User);
    apiKeyRepository = dataSource.getRepository(ApiKey);
    projectRepository = dataSource.getRepository(Project);
    experimentRepository = dataSource.getRepository(Experiment);
    trainingRunRepository = dataSource.getRepository(TrainingRun);

    userA = await userRepository.save(
      userRepository.create({
        email: `m10-comparison-a-${randomBytes(8).toString('hex')}@example.com`,
      }),
    );

    userB = await userRepository.save(
      userRepository.create({
        email: `m10-comparison-b-${randomBytes(8).toString('hex')}@example.com`,
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
        name: 'M10 Comparison Project A',
        description: null,
      }),
    );

    projectB = await projectRepository.save(
      projectRepository.create({
        userId: userB.id,
        name: 'M10 Comparison Project B',
        description: null,
      }),
    );

    experimentA = await experimentRepository.save(
      experimentRepository.create({
        projectId: projectA.id,
        name: 'M10 Comparison Experiment A',
        description: null,
      }),
    );

    experimentB = await experimentRepository.save(
      experimentRepository.create({
        projectId: projectB.id,
        name: 'M10 Comparison Experiment B',
        description: null,
      }),
    );

    runA = await createTrainingRun(
      experimentA.id,
      'Low LR',
      { lr: 0.001, batch_size: 32 },
      { accuracy: 0.8 },
    );

    runB = await createTrainingRun(
      experimentA.id,
      'High LR',
      { lr: 0.01, batch_size: 32 },
      { accuracy: 0.9 },
    );

    runC = await createTrainingRun(
      experimentA.id,
      'Higher LR',
      { lr: 0.1, batch_size: 32 },
      { accuracy: 0.6 },
    );

    runOtherUser = await createTrainingRun(
      experimentB.id,
      'Other User Run',
      { lr: 0.5, batch_size: 64 },
      { accuracy: 0.5 },
    );
  });

  afterAll(async () => {
    await trainingRunRepository.delete([
      runA.id,
      runB.id,
      runC.id,
      runOtherUser.id,
    ]);

    await experimentRepository.delete([experimentA.id, experimentB.id]);

    await projectRepository.delete([projectA.id, projectB.id]);

    await apiKeyRepository.delete({ userId: userA.id });
    await apiKeyRepository.delete({ userId: userB.id });

    await userRepository.delete([userA.id, userB.id]);

    await app.close();
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .post('/training-runs/compare')
      .send({ trainingRunIds: [runA.id, runB.id] })
      .expect(401);
  });

  it('compares two training runs owned by the authenticated user', async () => {
    const response = await request(app.getHttpServer())
      .post('/training-runs/compare')
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ trainingRunIds: [runA.id, runB.id] })
      .expect(201);

    expect(response.body.trainingRuns).toHaveLength(2);
    expect(
      response.body.trainingRuns.map((run: { id: string }) => run.id),
    ).toEqual([runA.id, runB.id]);
  });

  it('computes differences for parameters and metrics that vary between runs', async () => {
    const response = await request(app.getHttpServer())
      .post('/training-runs/compare')
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ trainingRunIds: [runA.id, runB.id] })
      .expect(201);

    const lrDifference = response.body.differences.find(
      (difference: { field: string }) => difference.field === 'parameters.lr',
    );
    expect(lrDifference).toBeDefined();
    expect(lrDifference.values).toEqual({
      [runA.id]: 0.001,
      [runB.id]: 0.01,
    });

    const accuracyDifference = response.body.differences.find(
      (difference: { field: string }) => difference.field === 'metrics.accuracy',
    );
    expect(accuracyDifference).toBeDefined();
    expect(accuracyDifference.values).toEqual({
      [runA.id]: 0.8,
      [runB.id]: 0.9,
    });

    // batch_size is identical (32 in both fixtures) - must not show up.
    const batchSizeDifference = response.body.differences.find(
      (difference: { field: string }) =>
        difference.field === 'parameters.batch_size',
    );
    expect(batchSizeDifference).toBeUndefined();

    // status is identical (both Completed) - must not show up.
    const statusDifference = response.body.differences.find(
      (difference: { field: string }) => difference.field === 'status',
    );
    expect(statusDifference).toBeUndefined();
  });

  it('supports comparing more than two training runs', async () => {
    const response = await request(app.getHttpServer())
      .post('/training-runs/compare')
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ trainingRunIds: [runA.id, runB.id, runC.id] })
      .expect(201);

    expect(response.body.trainingRuns).toHaveLength(3);
    expect(
      response.body.trainingRuns.map((run: { id: string }) => run.id),
    ).toEqual([runA.id, runB.id, runC.id]);
  });

  it('removes duplicate training run IDs', async () => {
    const response = await request(app.getHttpServer())
      .post('/training-runs/compare')
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ trainingRunIds: [runA.id, runA.id, runB.id] })
      .expect(201);

    expect(response.body.trainingRuns).toHaveLength(2);
    expect(
      response.body.trainingRuns.map((run: { id: string }) => run.id),
    ).toEqual([runA.id, runB.id]);
  });

  it('rejects fewer than two distinct training runs', async () => {
    await request(app.getHttpServer())
      .post('/training-runs/compare')
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ trainingRunIds: [runA.id, runA.id] })
      .expect(400);
  });

  it('rejects fewer than two training run IDs', async () => {
    await request(app.getHttpServer())
      .post('/training-runs/compare')
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ trainingRunIds: [runA.id] })
      .expect(400);
  });

  it('rejects more than ten training run IDs', async () => {
    const trainingRunIds = Array.from({ length: 11 }, () => runA.id);

    await request(app.getHttpServer())
      .post('/training-runs/compare')
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ trainingRunIds })
      .expect(400);
  });

  it('rejects invalid training run IDs', async () => {
    await request(app.getHttpServer())
      .post('/training-runs/compare')
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ trainingRunIds: ['not-a-uuid', runB.id] })
      .expect(400);
  });

  it('does not allow comparison with another user training run', async () => {
    await request(app.getHttpServer())
      .post('/training-runs/compare')
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ trainingRunIds: [runA.id, runOtherUser.id] })
      .expect(404);
  });

  it('does not allow an unknown training run ID', async () => {
    const unknownTrainingRunId = '44444444-4444-4444-8444-444444444444';

    await request(app.getHttpServer())
      .post('/training-runs/compare')
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ trainingRunIds: [runA.id, unknownTrainingRunId] })
      .expect(404);
  });
});
