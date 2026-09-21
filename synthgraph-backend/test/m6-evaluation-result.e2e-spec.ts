import { createHash, randomBytes } from 'node:crypto';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module.js';
import { ApiKey } from '../src/database/entities/api-key.entity.js';
import { Dataset } from '../src/database/entities/dataset.entity.js';
import { DatasetVersion } from '../src/database/entities/dataset-version.entity.js';
import { Experiment } from '../src/database/entities/experiment.entity.js';
import { Project } from '../src/database/entities/project.entity.js';
import { TrainingRun } from '../src/database/entities/training-run.entity.js';
import { User } from '../src/database/entities/user.entity.js';

describe('M6 EvaluationResult E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let userA: User;
  let userB: User;

  let apiKeyA: string;
  let apiKeyB: string;

  let trainingRunA: TrainingRun;
  let trainingRunB: TrainingRun;

  let datasetVersionA: DatasetVersion;
  let datasetVersionB: DatasetVersion;

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

    const userRepository = dataSource.getRepository(User);
    const projectRepository = dataSource.getRepository(Project);
    const experimentRepository = dataSource.getRepository(Experiment);
    const trainingRunRepository = dataSource.getRepository(TrainingRun);
    const datasetRepository = dataSource.getRepository(Dataset);
    const datasetVersionRepository =
      dataSource.getRepository(DatasetVersion);
    const apiKeyRepository = dataSource.getRepository(ApiKey);

    userA = await userRepository.save(
      userRepository.create({
        email: `evaluation-a-${randomBytes(8).toString('hex')}@example.com`,
      }),
    );

    userB = await userRepository.save(
      userRepository.create({
        email: `evaluation-b-${randomBytes(8).toString('hex')}@example.com`,
      }),
    );

    const projectA = await projectRepository.save(
      projectRepository.create({
        userId: userA.id,
        name: 'Evaluation Project A',
        description: null,
      }),
    );

    const projectB = await projectRepository.save(
      projectRepository.create({
        userId: userB.id,
        name: 'Evaluation Project B',
        description: null,
      }),
    );

    const experimentA = await experimentRepository.save(
      experimentRepository.create({
        projectId: projectA.id,
        name: 'Evaluation Experiment A',
        description: null,
      }),
    );

    const experimentB = await experimentRepository.save(
      experimentRepository.create({
        projectId: projectB.id,
        name: 'Evaluation Experiment B',
        description: null,
      }),
    );

    trainingRunA = await trainingRunRepository.save(
      trainingRunRepository.create({
        experimentId: experimentA.id,
        name: 'Training Run A',
        description: null,
        trainer: {
          name: 'pytorch',
          version: '2.8.0',
          type: 'image-classification',
        },
        parameters: {
          epochs: 10,
        },
        metrics: {},
        metadata: {},
      }),
    );

    trainingRunB = await trainingRunRepository.save(
      trainingRunRepository.create({
        experimentId: experimentB.id,
        name: 'Training Run B',
        description: null,
        trainer: {
          name: 'pytorch',
          version: '2.8.0',
          type: 'image-classification',
        },
        parameters: {
          epochs: 10,
        },
        metrics: {},
        metadata: {},
      }),
    );

    const datasetA = await datasetRepository.save(
      datasetRepository.create({
        userId: userA.id,
        name: 'Evaluation Dataset A',
        description: null,
        metadata: {},
      }),
    );

    const datasetB = await datasetRepository.save(
      datasetRepository.create({
        userId: userB.id,
        name: 'Evaluation Dataset B',
        description: null,
        metadata: {},
      }),
    );

    datasetVersionA = await datasetVersionRepository.save(
      datasetVersionRepository.create({
        datasetId: datasetA.id,
        version: 'v1',
        uri: 's3://evaluation-a/v1',
        format: 'image',
        size: null,
        checksum: 'checksum-a',
        metadata: {},
      }),
    );

    datasetVersionB = await datasetVersionRepository.save(
      datasetVersionRepository.create({
        datasetId: datasetB.id,
        version: 'v1',
        uri: 's3://evaluation-b/v1',
        format: 'image',
        size: null,
        checksum: 'checksum-b',
        metadata: {},
      }),
    );

    const rawKeyA = `sg_${randomBytes(32).toString('hex')}`;
    const rawKeyB = `sg_${randomBytes(32).toString('hex')}`;

    await apiKeyRepository.save(
      apiKeyRepository.create({
        userId: userA.id,
        keyPrefix: rawKeyA.slice(0, 16),
        keyHash: createHash('sha256')
          .update(rawKeyA)
          .digest('hex'),
        revokedAt: null,
      }),
    );

    await apiKeyRepository.save(
      apiKeyRepository.create({
        userId: userB.id,
        keyPrefix: rawKeyB.slice(0, 16),
        keyHash: createHash('sha256')
          .update(rawKeyB)
          .digest('hex'),
        revokedAt: null,
      }),
    );

    apiKeyA = rawKeyA;
    apiKeyB = rawKeyB;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates an evaluation result for an owned TrainingRun and DatasetVersion', async () => {
    const response = await request(app.getHttpServer())
      .post(`/training-runs/${trainingRunA.id}/evaluations`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        datasetVersionId: datasetVersionA.id,
        metrics: {
          accuracy: 0.91,
          map: 0.84,
        },
        metadata: {
          framework: 'pytorch',
        },
      })
      .expect(201);

    expect(response.body.id).toEqual(expect.any(String));
    expect(response.body.trainingRunId).toBe(trainingRunA.id);
    expect(response.body.datasetVersionId).toBe(datasetVersionA.id);
    expect(response.body.metrics).toEqual({
      accuracy: 0.91,
      map: 0.84,
    });
    expect(response.body.metadata).toEqual({
      framework: 'pytorch',
    });
  });

  it('retrieves an owned evaluation result', async () => {
    const createResponse = await request(app.getHttpServer())
      .post(`/training-runs/${trainingRunA.id}/evaluations`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        datasetVersionId: datasetVersionA.id,
        metrics: {
          accuracy: 0.93,
        },
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/evaluation-results/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.id).toBe(createResponse.body.id);
        expect(response.body.trainingRunId).toBe(trainingRunA.id);
        expect(response.body.datasetVersionId).toBe(datasetVersionA.id);
        expect(response.body.metrics).toEqual({
          accuracy: 0.93,
        });
      });
  });

  it('persists the exact DatasetVersion used for evaluation', async () => {
    const createResponse = await request(app.getHttpServer())
      .post(`/training-runs/${trainingRunA.id}/evaluations`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        datasetVersionId: datasetVersionA.id,
        metrics: {
          accuracy: 0.95,
        },
      })
      .expect(201);

    const repository = dataSource.getRepository(
      'evaluation_results',
    );

    const stored = await repository.findOneBy({
      id: createResponse.body.id,
    });

    expect(stored).not.toBeNull();

    expect(
      stored?.dataset_version_id ?? stored?.datasetVersionId,
    ).toBe(datasetVersionA.id);
  });

  it('rejects a nonexistent DatasetVersion', async () => {
    const nonexistentDatasetVersionId =
      '00000000-0000-4000-8000-000000000001';

    await request(app.getHttpServer())
      .post(`/training-runs/${trainingRunA.id}/evaluations`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        datasetVersionId: nonexistentDatasetVersionId,
        metrics: {
          accuracy: 0.8,
        },
      })
      .expect(404);
  });

  it('rejects another user DatasetVersion', async () => {
    await request(app.getHttpServer())
      .post(`/training-runs/${trainingRunA.id}/evaluations`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        datasetVersionId: datasetVersionB.id,
        metrics: {
          accuracy: 0.8,
        },
      })
      .expect(404);
  });

  it('rejects attaching an evaluation to another user TrainingRun', async () => {
    await request(app.getHttpServer())
      .post(`/training-runs/${trainingRunB.id}/evaluations`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        datasetVersionId: datasetVersionA.id,
        metrics: {
          accuracy: 0.8,
        },
      })
      .expect(404);
  });

  it('rejects retrieving another user evaluation result', async () => {
    const createResponse = await request(app.getHttpServer())
      .post(`/training-runs/${trainingRunA.id}/evaluations`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        datasetVersionId: datasetVersionA.id,
        metrics: {
          accuracy: 0.9,
        },
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/evaluation-results/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${apiKeyB}`)
      .expect(404);
  });

  it('rejects a request without an API key', async () => {
    await request(app.getHttpServer())
      .post(`/training-runs/${trainingRunA.id}/evaluations`)
      .send({
        datasetVersionId: datasetVersionA.id,
        metrics: {
          accuracy: 0.8,
        },
      })
      .expect(401);
  });

  it('rejects an invalid API key', async () => {
    await request(app.getHttpServer())
      .post(`/training-runs/${trainingRunA.id}/evaluations`)
      .set('Authorization', 'Bearer sg_invalid-key')
      .send({
        datasetVersionId: datasetVersionA.id,
        metrics: {
          accuracy: 0.8,
        },
      })
      .expect(401);
  });

  it('allows the same DatasetVersion to be evaluated more than once', async () => {
    const first = await request(app.getHttpServer())
      .post(`/training-runs/${trainingRunA.id}/evaluations`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        datasetVersionId: datasetVersionA.id,
        metrics: {
          accuracy: 0.88,
        },
      })
      .expect(201);

    const second = await request(app.getHttpServer())
      .post(`/training-runs/${trainingRunA.id}/evaluations`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        datasetVersionId: datasetVersionA.id,
        metrics: {
          accuracy: 0.89,
        },
      })
      .expect(201);

    expect(second.body.id).not.toBe(first.body.id);
    expect(second.body.datasetVersionId).toBe(datasetVersionA.id);
  });
});