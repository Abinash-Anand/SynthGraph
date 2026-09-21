import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';

import { AppModule } from '../src/app.module.js';
import { ApiKey } from '../src/database/entities/api-key.entity.js';
import { Experiment } from '../src/database/entities/experiment.entity.js';
import {
  Generation,
  GenerationStatus,
} from '../src/database/entities/generation.entity.js';
import { Project } from '../src/database/entities/project.entity.js';
import { User } from '../src/database/entities/user.entity.js';

describe('M4 Generation provenance workflow (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let apiKeyRepository: Repository<ApiKey>;
  let projectRepository: Repository<Project>;
  let experimentRepository: Repository<Experiment>;
  let generationRepository: Repository<Generation>;
  let userA: User;
  let userB: User;
  let projectA: Project;
  let projectB: Project;
  let experimentA: Experiment;
  let experimentB: Experiment;
  let apiKeyA: string;
  let apiKeyB: string;

  const generationPayload = {
    name: 'Rainy Scene Generation',
    generator: {
      name: 'blender',
      version: '4.2.0',
      type: '3d_renderer',
    },
    parameters: {
      samples: 512,
      weather: 'rain',
    },
    reproducibility: {
      seed: 42,
      code_version: 'abc123',
      environment: { renderer: 'cycles' },
      configuration_hash: 'sha256:configuration',
    },
    inputs: [
      { id: 'existing-reference-id' },
      {
        id: 'asset-1',
        uri: 'file:///data/model.blend',
        name: 'model.blend',
        metadata: { role: 'scene' },
        type: '3d_model',
      },
    ],
    outputs: [
      {
        id: 'dataset-1',
        uri: 'file:///data/output',
        name: 'output',
        metadata: {},
        format: 'image',
        size: 10,
      },
    ],
  };

  function createRawApiKey(): string {
    return `sg_${randomBytes(32).toString('hex')}`;
  }

  function hashApiKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }

  async function createGeneration(name: string) {
    return request(app.getHttpServer())
      .post(`/experiments/${experimentA.id}/generations`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ ...generationPayload, name })
      .expect(201);
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
    generationRepository = dataSource.getRepository(Generation);

    userA = await userRepository.save(
      userRepository.create({
        email: `m4-a-${randomBytes(8).toString('hex')}@example.com`,
      }),
    );
    userB = await userRepository.save(
      userRepository.create({
        email: `m4-b-${randomBytes(8).toString('hex')}@example.com`,
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
        name: 'M4 Project A',
        description: null,
      }),
    );
    projectB = await projectRepository.save(
      projectRepository.create({
        userId: userB.id,
        name: 'M4 Project B',
        description: null,
      }),
    );
    experimentA = await experimentRepository.save(
      experimentRepository.create({
        projectId: projectA.id,
        name: 'M4 Experiment A',
        description: null,
      }),
    );
    experimentB = await experimentRepository.save(
      experimentRepository.create({
        projectId: projectB.id,
        name: 'M4 Experiment B',
        description: null,
      }),
    );
  });

  afterAll(async () => {
    await generationRepository.delete({ experimentId: experimentA.id });
    await generationRepository.delete({ experimentId: experimentB.id });
    await experimentRepository.delete([experimentA.id, experimentB.id]);
    await projectRepository.delete([projectA.id, projectB.id]);
    await apiKeyRepository.delete({ userId: userA.id });
    await apiKeyRepository.delete({ userId: userB.id });
    await userRepository.delete([userA.id, userB.id]);
    await app.close();
  });

  it('authenticates Generation requests', async () => {
    await request(app.getHttpServer())
      .post(`/experiments/${experimentA.id}/generations`)
      .send(generationPayload)
      .expect(401);
  });

  it('creates and persists an SDK-compatible Generation', async () => {
    const response = await createGeneration('Persisted Generation');

    expect(response.body).toMatchObject({
      experiment_id: experimentA.id,
      name: 'Persisted Generation',
      description: null,
      generator: generationPayload.generator,
      parameters: generationPayload.parameters,
      reproducibility: generationPayload.reproducibility,
      inputs: generationPayload.inputs,
      outputs: generationPayload.outputs,
      status: 'pending',
      started_at: null,
      completed_at: null,
      metadata: {},
    });
    expect(response.body.id).toEqual(expect.any(String));
    expect(response.body.created_at).toEqual(expect.any(String));

    const stored = await generationRepository.findOneByOrFail({
      id: response.body.id as string,
    });
    expect(stored.experimentId).toBe(experimentA.id);
    expect(stored.status).toBe(GenerationStatus.Pending);
    expect(stored.generator).toEqual(generationPayload.generator);
  });

  it.each([
    [{ ...generationPayload, name: '' }],
    [{ ...generationPayload, generator: { name: '' } }],
    [{ ...generationPayload, parameters: [] }],
    [{ ...generationPayload, reproducibility: { seed: 1.5 } }],
    [
      {
        ...generationPayload,
        reproducibility: { seed: Number.MAX_SAFE_INTEGER + 1 },
      },
    ],
    [{ ...generationPayload, inputs: [{ id: '' }] }],
    [
      {
        ...generationPayload,
        outputs: [{ id: 'output', size: Number.MAX_SAFE_INTEGER + 1 }],
      },
    ],
  ])('rejects an invalid creation payload', async (payload) => {
    await request(app.getHttpServer())
      .post(`/experiments/${experimentA.id}/generations`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send(payload)
      .expect(400);
  });

  it('enforces Experiment ownership during creation and listing', async () => {
    await request(app.getHttpServer())
      .post(`/experiments/${experimentA.id}/generations`)
      .set('Authorization', `Bearer ${apiKeyB}`)
      .send({ ...generationPayload, name: 'Unauthorized Generation' })
      .expect(404);

    await request(app.getHttpServer())
      .get(`/experiments/${experimentA.id}/generations`)
      .set('Authorization', `Bearer ${apiKeyB}`)
      .expect(404);
  });

  it('retrieves a Generation only for its owner', async () => {
    const created = await createGeneration('Retrievable Generation');

    const response = await request(app.getHttpServer())
      .get(`/generations/${created.body.id}`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200);

    expect(response.body.id).toBe(created.body.id);
    expect(response.body.experiment_id).toBe(experimentA.id);

    await request(app.getHttpServer())
      .get(`/generations/${created.body.id}`)
      .set('Authorization', `Bearer ${apiKeyB}`)
      .expect(404);
  });

  it('lists Generations newest first', async () => {
    const older = await createGeneration('Ordering Older');
    await new Promise((resolve) => setTimeout(resolve, 5));
    const newer = await createGeneration('Ordering Newer');

    const response = await request(app.getHttpServer())
      .get(`/experiments/${experimentA.id}/generations`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200);

    const ids = (response.body as Array<{ id: string }>).map(({ id }) => id);
    expect(ids.indexOf(newer.body.id as string)).toBeLessThan(
      ids.indexOf(older.body.id as string),
    );
  });

  it('enforces pending to running to completed lifecycle timestamps', async () => {
    const created = await createGeneration('Completed Lifecycle');

    const running = await request(app.getHttpServer())
      .patch(`/generations/${created.body.id}`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ status: 'running' })
      .expect(200);

    expect(running.body.status).toBe('running');
    expect(running.body.started_at).toEqual(expect.any(String));
    expect(running.body.completed_at).toBeNull();

    const completed = await request(app.getHttpServer())
      .patch(`/generations/${created.body.id}`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ status: 'completed' })
      .expect(200);

    expect(completed.body.status).toBe('completed');
    expect(completed.body.started_at).toBe(running.body.started_at);
    expect(completed.body.completed_at).toEqual(expect.any(String));
  });

  it('supports the running to failed lifecycle branch', async () => {
    const created = await createGeneration('Failed Lifecycle');

    await request(app.getHttpServer())
      .patch(`/generations/${created.body.id}`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ status: 'running' })
      .expect(200);

    const failed = await request(app.getHttpServer())
      .patch(`/generations/${created.body.id}`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ status: 'failed' })
      .expect(200);

    expect(failed.body.status).toBe('failed');
    expect(failed.body.completed_at).toEqual(expect.any(String));
  });

  it('rejects invalid lifecycle transitions', async () => {
    const created = await createGeneration('Invalid Lifecycle');

    await request(app.getHttpServer())
      .patch(`/generations/${created.body.id}`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ status: 'completed' })
      .expect(409);

    await request(app.getHttpServer())
      .patch(`/generations/${created.body.id}`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ status: 'pending' })
      .expect(400);
  });

  it('enforces provenance immutability after running starts', async () => {
    const created = await createGeneration('Immutable Provenance');

    await request(app.getHttpServer())
      .patch(`/generations/${created.body.id}`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ status: 'running' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/generations/${created.body.id}`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({ status: 'running', parameters: { samples: 1 } })
      .expect(400);

    await expect(
      dataSource.query(
        `UPDATE generations
         SET status = 'pending', started_at = NULL, completed_at = NULL
         WHERE id = $1`,
        [created.body.id],
      ),
    ).rejects.toThrow('Invalid Generation lifecycle transition');

    await expect(
      dataSource.query(`UPDATE generations SET parameters = $1 WHERE id = $2`, [
        { samples: 1 },
        created.body.id,
      ]),
    ).rejects.toThrow('Generation provenance is immutable');

    const unchanged = await generationRepository.findOneByOrFail({
      id: created.body.id as string,
    });
    expect(unchanged.status).toBe(GenerationStatus.Running);
    expect(unchanged.parameters).toEqual(generationPayload.parameters);
  });

  it('enforces lifecycle and Experiment foreign-key constraints', async () => {
    await expect(
      generationRepository.save(
        generationRepository.create({
          experimentId: randomUUID(),
          name: 'Invalid parent',
          description: null,
          generator: { name: 'test' },
          parameters: {},
          reproducibility: {},
          inputs: [],
          outputs: [],
          status: GenerationStatus.Pending,
          startedAt: null,
          completedAt: null,
          metadata: {},
        }),
      ),
    ).rejects.toThrow();

    const created = await createGeneration('Constraint Lifecycle');
    await expect(
      dataSource.query(
        `UPDATE generations SET status = 'completed' WHERE id = $1`,
        [created.body.id],
      ),
    ).rejects.toThrow();
    await expect(experimentRepository.delete(experimentA.id)).rejects.toThrow();
  });
});
