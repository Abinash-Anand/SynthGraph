import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import request from 'supertest';
import { DataSource, In, Repository } from 'typeorm';

import { AppModule } from '../src/app.module.js';
import { ApiKey } from '../src/database/entities/api-key.entity.js';
import { Dataset } from '../src/database/entities/dataset.entity.js';
import { DatasetVersion } from '../src/database/entities/dataset-version.entity.js';
import { Experiment } from '../src/database/entities/experiment.entity.js';
import { Project } from '../src/database/entities/project.entity.js';
import { TrainingRunDatasetReference } from '../src/database/entities/training-run-dataset-reference.entity.js';
import { TrainingRunMetric } from '../src/database/entities/training-run-metric.entity.js';
import { TrainingRun } from '../src/database/entities/training-run.entity.js';
import { User } from '../src/database/entities/user.entity.js';

describe('M6 Training run (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let userRepository: Repository<User>;
  let apiKeyRepository: Repository<ApiKey>;
  let projectRepository: Repository<Project>;
  let experimentRepository: Repository<Experiment>;
  let trainingRunRepository: Repository<TrainingRun>;
  let trainingRunDatasetReferenceRepository: Repository<TrainingRunDatasetReference>;
  let trainingRunMetricRepository: Repository<TrainingRunMetric>;
  let datasetRepository: Repository<Dataset>;
  let datasetVersionRepository: Repository<DatasetVersion>;

  let userA: User;
  let userB: User;

  let projectA: Project;
  let projectB: Project;

  let experimentA: Experiment;
  let experimentB: Experiment;

  let apiKeyA: string;
  let apiKeyB: string;

  let datasetVersion: DatasetVersion;
  let datasetVersionB: DatasetVersion;

  function createRawApiKey(): string {
    return `sg_${randomBytes(32).toString('hex')}`;
  }

  function hashApiKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
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
    trainingRunDatasetReferenceRepository = dataSource.getRepository(
      TrainingRunDatasetReference,
    );
    trainingRunMetricRepository =
      dataSource.getRepository(TrainingRunMetric);
    datasetRepository = dataSource.getRepository(Dataset);
    datasetVersionRepository =
      dataSource.getRepository(DatasetVersion);

    userA = await userRepository.save(
      userRepository.create({
        email: `m6-training-run-a-${randomBytes(8).toString('hex')}@example.com`,
      }),
    );

    userB = await userRepository.save(
      userRepository.create({
        email: `m6-training-run-b-${randomBytes(8).toString('hex')}@example.com`,
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
        name: 'M6 Training Run Project A',
        description: null,
      }),
    );

    projectB = await projectRepository.save(
      projectRepository.create({
        userId: userB.id,
        name: 'M6 Training Run Project B',
        description: null,
      }),
    );

    experimentA = await experimentRepository.save(
      experimentRepository.create({
        projectId: projectA.id,
        name: 'Training Run Experiment A',
        description: null,
      }),
    );

    experimentB = await experimentRepository.save(
      experimentRepository.create({
        projectId: projectB.id,
        name: 'Training Run Experiment B',
        description: null,
      }),
    );

    const dataset = await datasetRepository.save(
      datasetRepository.create({
        userId: userA.id,
        name: 'Training Dataset',
        description: null,
        metadata: {},
      }),
    );

    datasetVersion = await datasetVersionRepository.save(
      datasetVersionRepository.create({
        datasetId: dataset.id,
        version: '1',
        uri: 's3://researcher/training-v1',
        format: 'image',
        size: 100,
        checksum: 'sha256:dataset',
        metadata: {},
      }),
    );

    const datasetB = await datasetRepository.save(
      datasetRepository.create({
        userId: userB.id,
        name: 'User B Dataset',
        description: null,
        metadata: {},
      }),
    );

    datasetVersionB = await datasetVersionRepository.save(
      datasetVersionRepository.create({
        datasetId: datasetB.id,
        version: '1',
        uri: 's3://researcher-b/training-v1',
        format: 'image',
        size: 100,
        checksum: 'sha256:dataset-b',
        metadata: {},
      }),
    );
  });

  afterAll(async () => {
    // training_run_metrics, training_run_dataset_refs and evaluation_results
    // all RESTRICT-reference training_runs, so anything this spec created
    // under a training run must go before the training run itself.
    const trainingRuns = await trainingRunRepository.find({
      where: [
        { experimentId: experimentA.id },
        { experimentId: experimentB.id },
      ],
    });
    const trainingRunIds = trainingRuns.map((run) => run.id);

    if (trainingRunIds.length > 0) {
      await trainingRunMetricRepository.delete({
        trainingRunId: In(trainingRunIds),
      });
      await trainingRunDatasetReferenceRepository.delete({
        trainingRunId: In(trainingRunIds),
      });
      await trainingRunRepository.delete(trainingRunIds);
    }

    await experimentRepository.delete([
      experimentA.id,
      experimentB.id,
    ]);

    await datasetVersionRepository.delete([
      datasetVersion.id,
      datasetVersionB.id,
    ]);
    await datasetRepository.delete({
      name: In(['Training Dataset', 'User B Dataset']),
    });

    await projectRepository.delete([
      projectA.id,
      projectB.id,
    ]);

    await apiKeyRepository.delete({
      userId: userA.id,
    });

    await apiKeyRepository.delete({
      userId: userB.id,
    });

    await userRepository.delete([
      userA.id,
      userB.id,
    ]);

    await app.close();
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get(`/experiments/${experimentA.id}/training-runs`)
      .expect(401);
  });

  it('creates a training run in the pending state', async () => {
    const response = await request(app.getHttpServer())
      .post(`/experiments/${experimentA.id}/training-runs`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        name: 'YOLO run',
        trainer: { name: 'yolo', type: 'pytorch', version: '2.1' },
        parameters: { epochs: 50 },
      })
      .expect(201);

    expect(response.body).toMatchObject({
      experimentId: experimentA.id,
      name: 'YOLO run',
      status: 'pending',
      trainer: { name: 'yolo', type: 'pytorch', version: '2.1' },
      parameters: { epochs: 50 },
      captureStatus: null,
    });
  });

  it('rejects a training run missing required fields', async () => {
    await request(app.getHttpServer())
      .post(`/experiments/${experimentA.id}/training-runs`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ trainer: { name: 'yolo' } })
      .expect(400);
  });

  it('rejects an unknown field once ValidationPipe is whitelisting', async () => {
    await request(app.getHttpServer())
      .post(`/experiments/${experimentA.id}/training-runs`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        name: 'run',
        trainer: { name: 'yolo' },
        parameters: {},
        notAField: true,
      })
      .expect(400);
  });

  it('lists training runs for an experiment', async () => {
    const created = await request(app.getHttpServer())
      .post(`/experiments/${experimentA.id}/training-runs`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        name: 'List target',
        trainer: { name: 'yolo' },
        parameters: {},
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/experiments/${experimentA.id}/training-runs`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200);

    expect(
      (response.body as Array<{ id: string }>).map((run) => run.id),
    ).toContain(created.body.id);
  });

  it('does not allow another user to list training runs for a project they do not own', async () => {
    await request(app.getHttpServer())
      .get(`/experiments/${experimentA.id}/training-runs`)
      .set('Authorization', `Bearer ${apiKeyB}`)
      .expect(404);
  });

  it('gets a training run by id and returns 404 for another user', async () => {
    const created = await request(app.getHttpServer())
      .post(`/experiments/${experimentA.id}/training-runs`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ name: 'Gettable', trainer: { name: 'yolo' }, parameters: {} })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/training-runs/${created.body.id}`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/training-runs/${created.body.id}`)
      .set('Authorization', `Bearer ${apiKeyB}`)
      .expect(404);
  });

  it('returns 404 for an unknown training run id', async () => {
    await request(app.getHttpServer())
      .get(`/training-runs/${randomUUID()}`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(404);
  });

  it('walks the full start/complete lifecycle', async () => {
    const created = await request(app.getHttpServer())
      .post(`/experiments/${experimentA.id}/training-runs`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ name: 'Lifecycle run', trainer: { name: 'yolo' }, parameters: {} })
      .expect(201);

    const started = await request(app.getHttpServer())
      .patch(`/training-runs/${created.body.id}`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ status: 'running' })
      .expect(200);

    expect(started.body.status).toBe('running');
    expect(started.body.startedAt).not.toBeNull();

    const completed = await request(app.getHttpServer())
      .patch(`/training-runs/${created.body.id}`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ status: 'completed' })
      .expect(200);

    expect(completed.body.status).toBe('completed');
    expect(completed.body.completedAt).not.toBeNull();
  });

  it('rejects an invalid lifecycle transition', async () => {
    const created = await request(app.getHttpServer())
      .post(`/experiments/${experimentA.id}/training-runs`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ name: 'Invalid transition', trainer: { name: 'yolo' }, parameters: {} })
      .expect(201);

    // pending -> completed is not a valid transition; only running -> {completed, failed} is.
    await request(app.getHttpServer())
      .patch(`/training-runs/${created.body.id}`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ status: 'completed' })
      .expect(409);
  });

  it('attaches a dataset reference to a training run', async () => {
    const created = await request(app.getHttpServer())
      .post(`/experiments/${experimentA.id}/training-runs`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ name: 'Dataset run', trainer: { name: 'yolo' }, parameters: {} })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/training-runs/${created.body.id}/datasets`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ datasetVersionId: datasetVersion.id, role: 'training' })
      .expect(201);

    expect(response.body).toMatchObject({
      trainingRunId: created.body.id,
      datasetVersionId: datasetVersion.id,
      role: 'training',
    });

    const reference = await trainingRunDatasetReferenceRepository.findOneBy({
      trainingRunId: created.body.id,
      datasetVersionId: datasetVersion.id,
      role: 'training',
    });
    expect(reference).not.toBeNull();
  });

  it('does not allow attaching a dataset version owned by another user', async () => {
    const created = await request(app.getHttpServer())
      .post(`/experiments/${experimentA.id}/training-runs`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ name: 'Cross-user dataset attempt', trainer: { name: 'yolo' }, parameters: {} })
      .expect(201);

    // created.body.id (training run) is owned by userA; datasetVersionB is
    // owned by userB - CreateTrainingRunDatasetReferenceService checks both
    // independently, so attaching userB's dataset to userA's training run
    // must be rejected even though userA authenticated successfully and
    // owns the training run itself.
    await request(app.getHttpServer())
      .post(`/training-runs/${created.body.id}/datasets`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ datasetVersionId: datasetVersionB.id, role: 'training' })
      .expect(404);

    const reference = await trainingRunDatasetReferenceRepository.findOneBy({
      trainingRunId: created.body.id,
      datasetVersionId: datasetVersionB.id,
    });
    expect(reference).toBeNull();
  });

  it('logs and lists training metrics in step order', async () => {
    const created = await request(app.getHttpServer())
      .post(`/experiments/${experimentA.id}/training-runs`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ name: 'Metrics run', trainer: { name: 'yolo' }, parameters: {} })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/training-runs/${created.body.id}/metrics`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ step: 200, metrics: { loss: 0.31 } })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/training-runs/${created.body.id}/metrics`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ step: 100, metrics: { loss: 0.42 } })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/training-runs/${created.body.id}/metrics`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200);

    expect(
      (response.body as Array<{ step: number }>).map((m) => m.step),
    ).toEqual([100, 200]);
  });

  describe('capture-status', () => {
    it('reports and reads back a complete capture status', async () => {
      const created = await request(app.getHttpServer())
        .post(`/experiments/${experimentA.id}/training-runs`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'Capture complete', trainer: { name: 'yolo' }, parameters: {} })
        .expect(201);

      const patched = await request(app.getHttpServer())
        .patch(`/training-runs/${created.body.id}/capture-status`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({
          status: 'complete',
          integrations: {
            resource_monitor: { attached: true, closed: true },
          },
        })
        .expect(200);

      expect(patched.body.captureStatus).toEqual({
        status: 'complete',
        integrations: {
          resource_monitor: { attached: true, closed: true },
        },
      });

      const fetched = await request(app.getHttpServer())
        .get(`/training-runs/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(fetched.body.captureStatus.status).toBe('complete');
    });

    it('rejects an invalid capture-status value', async () => {
      const created = await request(app.getHttpServer())
        .post(`/experiments/${experimentA.id}/training-runs`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'Bad status', trainer: { name: 'yolo' }, parameters: {} })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/training-runs/${created.body.id}/capture-status`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ status: 'bogus', integrations: {} })
        .expect(400);
    });

    it('rejects a capture-status report missing integrations', async () => {
      const created = await request(app.getHttpServer())
        .post(`/experiments/${experimentA.id}/training-runs`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'Missing integrations', trainer: { name: 'yolo' }, parameters: {} })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/training-runs/${created.body.id}/capture-status`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ status: 'complete' })
        .expect(400);
    });

    it('returns 404 reporting capture status for a training run owned by another user', async () => {
      const created = await request(app.getHttpServer())
        .post(`/experiments/${experimentA.id}/training-runs`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'Owned by A', trainer: { name: 'yolo' }, parameters: {} })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/training-runs/${created.body.id}/capture-status`)
        .set('Authorization', `Bearer ${apiKeyB}`)
        .send({ status: 'complete', integrations: {} })
        .expect(404);
    });

    it('filters training runs by captureStatus=complete/partial/unknown', async () => {
      const unknownRun = await request(app.getHttpServer())
        .post(`/experiments/${experimentA.id}/training-runs`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'Filter unknown', trainer: { name: 'yolo' }, parameters: {} })
        .expect(201);

      const completeRun = await request(app.getHttpServer())
        .post(`/experiments/${experimentA.id}/training-runs`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'Filter complete', trainer: { name: 'yolo' }, parameters: {} })
        .expect(201);
      await request(app.getHttpServer())
        .patch(`/training-runs/${completeRun.body.id}/capture-status`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({
          status: 'complete',
          integrations: { resource_monitor: { attached: true, closed: true } },
        })
        .expect(200);

      const partialRun = await request(app.getHttpServer())
        .post(`/experiments/${experimentA.id}/training-runs`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'Filter partial', trainer: { name: 'yolo' }, parameters: {} })
        .expect(201);
      await request(app.getHttpServer())
        .patch(`/training-runs/${partialRun.body.id}/capture-status`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({
          status: 'partial',
          integrations: { skrl_writer: { attached: true, closed: false } },
        })
        .expect(200);

      const unknownResponse = await request(app.getHttpServer())
        .get(`/experiments/${experimentA.id}/training-runs`)
        .query({ captureStatus: 'unknown' })
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);
      const unknownIds = (unknownResponse.body as Array<{ id: string }>).map(
        (run) => run.id,
      );
      expect(unknownIds).toContain(unknownRun.body.id);
      expect(unknownIds).not.toContain(completeRun.body.id);
      expect(unknownIds).not.toContain(partialRun.body.id);

      const completeResponse = await request(app.getHttpServer())
        .get(`/experiments/${experimentA.id}/training-runs`)
        .query({ captureStatus: 'complete' })
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);
      const completeIds = (completeResponse.body as Array<{ id: string }>).map(
        (run) => run.id,
      );
      expect(completeIds).toContain(completeRun.body.id);
      expect(completeIds).not.toContain(unknownRun.body.id);
      expect(completeIds).not.toContain(partialRun.body.id);

      const partialResponse = await request(app.getHttpServer())
        .get(`/experiments/${experimentA.id}/training-runs`)
        .query({ captureStatus: 'partial' })
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);
      const partialIds = (partialResponse.body as Array<{ id: string }>).map(
        (run) => run.id,
      );
      expect(partialIds).toContain(partialRun.body.id);
      expect(partialIds).not.toContain(unknownRun.body.id);
      expect(partialIds).not.toContain(completeRun.body.id);
    });

    it('rejects an invalid captureStatus filter value', async () => {
      await request(app.getHttpServer())
        .get(`/experiments/${experimentA.id}/training-runs`)
        .query({ captureStatus: 'bogus' })
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(400);
    });
  });
});
