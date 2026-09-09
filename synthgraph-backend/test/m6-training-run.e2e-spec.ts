import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { createHash, randomBytes } from 'node:crypto';

import { AppModule } from '../src/app.module.js';

import { ApiKey } from '../src/database/entities/api-key.entity.js';
import { Dataset } from '../src/database/entities/dataset.entity.js';
import { DatasetVersion } from '../src/database/entities/dataset-version.entity.js';
import { Experiment } from '../src/database/entities/experiment.entity.js';
import { Project } from '../src/database/entities/project.entity.js';
import { TrainingRun } from '../src/database/entities/training-run.entity.js';
import { TrainingRunDatasetReference } from '../src/database/entities/training-run-dataset-reference.entity.js';
import { User } from '../src/database/entities/user.entity.js';

describe('TrainingRun (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  let userA: User;
  let userB: User;

  let apiKeyA: string;
  let apiKeyB: string;

  let projectA: Project;
  let projectB: Project;

  let experimentA: Experiment;
  let experimentB: Experiment;

  let datasetA: Dataset;
  let datasetB: Dataset;

  let datasetVersionA: DatasetVersion;
  let datasetVersionB: DatasetVersion;

  let trainingRunA: TrainingRun;
  let trainingRunB: TrainingRun;

  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    const userRepository = dataSource.getRepository(User);
    const apiKeyRepository = dataSource.getRepository(ApiKey);
    const projectRepository = dataSource.getRepository(Project);
    const experimentRepository =
      dataSource.getRepository(Experiment);
    const datasetRepository =
      dataSource.getRepository(Dataset);
    const datasetVersionRepository =
      dataSource.getRepository(DatasetVersion);

    userA = await userRepository.save(
      userRepository.create({
        email: `m6-training-a-${Date.now()}@synthgraph.local`,
      }),
    );

    userB = await userRepository.save(
      userRepository.create({
        email: `m6-training-b-${Date.now()}@synthgraph.local`,
      }),
    );

    apiKeyA = `sg_${randomBytes(32).toString('hex')}`;
    apiKeyB = `sg_${randomBytes(32).toString('hex')}`;

    await apiKeyRepository.save(
      apiKeyRepository.create({
        userId: userA.id,
        keyPrefix: 'sg_',
        keyHash: createHash('sha256')
          .update(apiKeyA)
          .digest('hex'),
        revokedAt: null,
      }),
    );

    await apiKeyRepository.save(
      apiKeyRepository.create({
        userId: userB.id,
        keyPrefix: 'sg_',
        keyHash: createHash('sha256')
          .update(apiKeyB)
          .digest('hex'),
        revokedAt: null,
      }),
    );

    projectA = await projectRepository.save(
      projectRepository.create({
        userId: userA.id,
        name: 'M6 Training Project A',
        description: 'TrainingRun test project A',
      }),
    );

    projectB = await projectRepository.save(
      projectRepository.create({
        userId: userB.id,
        name: 'M6 Training Project B',
        description: 'TrainingRun test project B',
      }),
    );

    experimentA = await experimentRepository.save(
      experimentRepository.create({
        projectId: projectA.id,
        name: 'M6 Experiment A',
        description: 'TrainingRun test experiment A',
      }),
    );

    experimentB = await experimentRepository.save(
      experimentRepository.create({
        projectId: projectB.id,
        name: 'M6 Experiment B',
        description: 'TrainingRun test experiment B',
      }),
    );

    datasetA = await datasetRepository.save(
      datasetRepository.create({
        userId: userA.id,
        name: 'M6 Dataset A',
        description: 'TrainingRun dataset test A',
        metadata: {},
      }),
    );

    datasetB = await datasetRepository.save(
      datasetRepository.create({
        userId: userB.id,
        name: 'M6 Dataset B',
        description: 'TrainingRun dataset test B',
        metadata: {},
      }),
    );

    datasetVersionA = await datasetVersionRepository.save(
      datasetVersionRepository.create({
        datasetId: datasetA.id,
        version: '1.0.0',
        uri: 's3://test/m6-dataset-a',
        format: 'image',
        size: 1024,
        hash: 'm6-dataset-a-hash',
        metadata: {},
      }),
    );

    datasetVersionB = await datasetVersionRepository.save(
      datasetVersionRepository.create({
        datasetId: datasetB.id,
        version: '1.0.0',
        uri: 's3://test/m6-dataset-b',
        format: 'image',
        size: 2048,
        hash: 'm6-dataset-b-hash',
        metadata: {},
      }),
    );
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      const trainingRunDatasetReferenceRepository =
        dataSource.getRepository(TrainingRunDatasetReference);

      const trainingRunRepository =
        dataSource.getRepository(TrainingRun);

      const datasetVersionRepository =
        dataSource.getRepository(DatasetVersion);

      const datasetRepository =
        dataSource.getRepository(Dataset);

      const experimentRepository =
        dataSource.getRepository(Experiment);

      const projectRepository =
        dataSource.getRepository(Project);

      const apiKeyRepository =
        dataSource.getRepository(ApiKey);

      const userRepository =
        dataSource.getRepository(User);

      if (trainingRunA) {
        await trainingRunDatasetReferenceRepository.delete({
          trainingRunId: trainingRunA.id,
        });

        await trainingRunRepository.delete({
          id: trainingRunA.id,
        });
      }

      if (trainingRunB) {
        await trainingRunDatasetReferenceRepository.delete({
          trainingRunId: trainingRunB.id,
        });

        await trainingRunRepository.delete({
          id: trainingRunB.id,
        });
      }

      if (datasetVersionA) {
        await datasetVersionRepository.delete({
          id: datasetVersionA.id,
        });
      }

      if (datasetVersionB) {
        await datasetVersionRepository.delete({
          id: datasetVersionB.id,
        });
      }

      if (datasetA) {
        await datasetRepository.delete({
          id: datasetA.id,
        });
      }

      if (datasetB) {
        await datasetRepository.delete({
          id: datasetB.id,
        });
      }

      if (experimentA) {
        await experimentRepository.delete({
          id: experimentA.id,
        });
      }

      if (experimentB) {
        await experimentRepository.delete({
          id: experimentB.id,
        });
      }

      if (projectA) {
        await projectRepository.delete({
          id: projectA.id,
        });
      }

      if (projectB) {
        await projectRepository.delete({
          id: projectB.id,
        });
      }

      await apiKeyRepository.delete({
        userId: userA.id,
      });

      await apiKeyRepository.delete({
        userId: userB.id,
      });

      if (userA) {
        await userRepository.delete({
          id: userA.id,
        });
      }

      if (userB) {
        await userRepository.delete({
          id: userB.id,
        });
      }
    }

    await app.close();
  });

  it('creates a TrainingRun for the authenticated user', async () => {
    const response = await request(app.getHttpServer())
      .post(`/experiments/${experimentA.id}/training-runs`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        name: 'User A Training Run',
        description: 'Baseline training run',
        trainer: {
          name: 'pytorch',
          version: '2.8.0',
          type: 'image-classification',
        },
        parameters: {
          epochs: 50,
          batch_size: 32,
          learning_rate: 0.001,
        },
        metadata: {
          gpu: 'RTX 4090',
        },
      })
      .expect(201);

    expect(response.body).toMatchObject({
      experimentId: experimentA.id,
      name: 'User A Training Run',
      description: 'Baseline training run',
      trainer: {
        name: 'pytorch',
        version: '2.8.0',
        type: 'image-classification',
      },
      parameters: {
        epochs: 50,
        batch_size: 32,
        learning_rate: 0.001,
      },
      metrics: {},
      status: 'pending',
      metadata: {
        gpu: 'RTX 4090',
      },
      startedAt: null,
      completedAt: null,
    });

    expect(response.body.id).toBeDefined();

    trainingRunA = response.body;
  });

  it('retrieves a TrainingRun owned by the authenticated user', async () => {
    const response = await request(app.getHttpServer())
      .get(`/training-runs/${trainingRunA.id}`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: trainingRunA.id,
      experimentId: experimentA.id,
      name: 'User A Training Run',
      status: 'pending',
    });
  });

  it('rejects retrieval of another user TrainingRun', async () => {
    const response = await request(app.getHttpServer())
      .post(`/experiments/${experimentB.id}/training-runs`)
      .set('Authorization', `Bearer ${apiKeyB}`)
      .send({
        name: 'User B Training Run',
        trainer: {
          name: 'pytorch',
          version: '2.8.0',
        },
        parameters: {
          epochs: 10,
        },
      })
      .expect(201);

    trainingRunB = response.body;

    await request(app.getHttpServer())
      .get(`/training-runs/${trainingRunB.id}`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(404);
  });

  it('creates a DatasetVersion reference for a TrainingRun', async () => {
    const response = await request(app.getHttpServer())
      .post(`/training-runs/${trainingRunA.id}/datasets`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        datasetVersionId: datasetVersionA.id,
        role: 'training',
      })
      .expect(201);

    expect(response.body).toEqual({
      trainingRunId: trainingRunA.id,
      datasetVersionId: datasetVersionA.id,
      role: 'training',
    });
  });

  it('rejects a duplicate TrainingRun DatasetVersion reference', async () => {
    const response = await request(app.getHttpServer())
      .post(`/training-runs/${trainingRunA.id}/datasets`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        datasetVersionId: datasetVersionA.id,
        role: 'training',
      })
      .expect(409);

    expect(response.body).toMatchObject({
      message: 'Training run dataset reference already exists',
      error: 'Conflict',
      statusCode: 409,
    });
  });

  it('allows the same DatasetVersion with a different role', async () => {
    const response = await request(app.getHttpServer())
      .post(`/training-runs/${trainingRunA.id}/datasets`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        datasetVersionId: datasetVersionA.id,
        role: 'validation',
      })
      .expect(201);

    expect(response.body).toEqual({
      trainingRunId: trainingRunA.id,
      datasetVersionId: datasetVersionA.id,
      role: 'validation',
    });
  });

  it('rejects attaching another user DatasetVersion', async () => {
    await request(app.getHttpServer())
      .post(`/training-runs/${trainingRunA.id}/datasets`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        datasetVersionId: datasetVersionB.id,
        role: 'training',
      })
      .expect(404);
  });

  it('rejects attaching a DatasetVersion to another user TrainingRun', async () => {
    await request(app.getHttpServer())
      .post(`/training-runs/${trainingRunB.id}/datasets`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        datasetVersionId: datasetVersionA.id,
        role: 'training',
      })
      .expect(404);
  });

  it('rejects requests without an API key', async () => {
    await request(app.getHttpServer())
      .get(`/training-runs/${trainingRunA.id}`)
      .expect(401);
  });

  it('rejects an invalid API key', async () => {
    await request(app.getHttpServer())
      .get(`/training-runs/${trainingRunA.id}`)
      .set('Authorization', 'Bearer sg_invalid')
      .expect(401);
  });
});