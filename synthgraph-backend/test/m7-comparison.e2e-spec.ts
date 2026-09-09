import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash, randomBytes } from 'node:crypto';
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

describe('M7 Generation comparison (e2e)', () => {
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

  let generationA: Generation;
  let generationB: Generation;
  let generationC: Generation;
  let generationOtherUser: Generation;

  let apiKeyA: string;
  let apiKeyB: string;

  function createRawApiKey(): string {
    return `sg_${randomBytes(32).toString('hex')}`;
  }

  function hashApiKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }

  async function createGeneration(
    experimentId: string,
    name: string,
    parameters: Record<string, unknown>,
  ): Promise<Generation> {
    return generationRepository.save(
      generationRepository.create({
        experimentId,
        name,
        description: `Comparison generation: ${name}`,
        generator: {
          name: 'blender',
          version: '4.2.0',
        },
        parameters,
        reproducibility: {
          seed: 42,
          code_version: 'abc123',
        },
        inputs: [],
        outputs: [],
        status: GenerationStatus.Completed,
        startedAt: new Date(),
        completedAt: new Date(),
        metadata: {},
      }),
    );
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleFixture.createNestApplication();

    await app.init();

    dataSource = moduleFixture.get(DataSource);

    userRepository = dataSource.getRepository(User);
    apiKeyRepository = dataSource.getRepository(ApiKey);
    projectRepository = dataSource.getRepository(Project);
    experimentRepository = dataSource.getRepository(Experiment);
    generationRepository = dataSource.getRepository(Generation);

    userA = await userRepository.save(
      userRepository.create({
        email: `m7-comparison-a-${randomBytes(8).toString('hex')}@example.com`,
      }),
    );

    userB = await userRepository.save(
      userRepository.create({
        email: `m7-comparison-b-${randomBytes(8).toString('hex')}@example.com`,
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
        name: 'M7 Comparison Project A',
        description: null,
      }),
    );

    projectB = await projectRepository.save(
      projectRepository.create({
        userId: userB.id,
        name: 'M7 Comparison Project B',
        description: null,
      }),
    );

    experimentA = await experimentRepository.save(
      experimentRepository.create({
        projectId: projectA.id,
        name: 'M7 Comparison Experiment A',
        description: null,
      }),
    );

    experimentB = await experimentRepository.save(
      experimentRepository.create({
        projectId: projectB.id,
        name: 'M7 Comparison Experiment B',
        description: null,
      }),
    );

    generationA = await createGeneration(
      experimentA.id,
      'Low Occlusion',
      {
        lighting: 'low',
        occlusion: 0.1,
      },
    );

    generationB = await createGeneration(
      experimentA.id,
      'Medium Occlusion',
      {
        lighting: 'medium',
        occlusion: 0.3,
      },
    );

    generationC = await createGeneration(
      experimentA.id,
      'High Occlusion',
      {
        lighting: 'high',
        occlusion: 0.6,
      },
    );

    generationOtherUser = await createGeneration(
      experimentB.id,
      'Other User Generation',
      {
        lighting: 'other',
        occlusion: 0.9,
      },
    );
  });

  afterAll(async () => {
    await generationRepository.delete([
      generationA.id,
      generationB.id,
      generationC.id,
      generationOtherUser.id,
    ]);

    await experimentRepository.delete([
      experimentA.id,
      experimentB.id,
    ]);

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
      .post('/generations/compare')
      .send({
        generationIds: [
          generationA.id,
          generationB.id,
        ],
      })
      .expect(401);
  });

  it('compares two generations owned by the authenticated user', async () => {
    const response = await request(app.getHttpServer())
      .post('/generations/compare')
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        generationIds: [
          generationA.id,
          generationB.id,
        ],
      })
      .expect(201);

    expect(response.body.generations).toHaveLength(2);

    expect(
      response.body.generations.map(
        (generation: { id: string }) => generation.id,
      ),
    ).toEqual([
      generationA.id,
      generationB.id,
    ]);
  });

  it('supports comparing more than two generations', async () => {
    const response = await request(app.getHttpServer())
      .post('/generations/compare')
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        generationIds: [
          generationA.id,
          generationB.id,
          generationC.id,
        ],
      })
      .expect(201);

    expect(response.body.generations).toHaveLength(3);

    expect(
      response.body.generations.map(
        (generation: { id: string }) => generation.id,
      ),
    ).toEqual([
      generationA.id,
      generationB.id,
      generationC.id,
    ]);
  });

  it('removes duplicate generation IDs', async () => {
    const response = await request(app.getHttpServer())
      .post('/generations/compare')
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        generationIds: [
          generationA.id,
          generationA.id,
          generationB.id,
        ],
      })
      .expect(201);

    expect(response.body.generations).toHaveLength(2);

    expect(
      response.body.generations.map(
        (generation: { id: string }) => generation.id,
      ),
    ).toEqual([
      generationA.id,
      generationB.id,
    ]);
  });

  it('rejects fewer than two distinct generations', async () => {
    await request(app.getHttpServer())
      .post('/generations/compare')
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        generationIds: [
          generationA.id,
          generationA.id,
        ],
      })
      .expect(400);
  });

  it('rejects fewer than two generation IDs', async () => {
    await request(app.getHttpServer())
      .post('/generations/compare')
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        generationIds: [generationA.id],
      })
      .expect(400);
  });

  it('rejects more than ten generation IDs', async () => {
    const generationIds = Array.from(
      { length: 11 },
      () => generationA.id,
    );

    await request(app.getHttpServer())
      .post('/generations/compare')
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        generationIds,
      })
      .expect(400);
  });

  it('rejects invalid generation IDs', async () => {
    await request(app.getHttpServer())
      .post('/generations/compare')
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        generationIds: [
          'not-a-uuid',
          generationB.id,
        ],
      })
      .expect(400);
  });

  it('does not allow comparison with another user generation', async () => {
    await request(app.getHttpServer())
      .post('/generations/compare')
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        generationIds: [
          generationA.id,
          generationOtherUser.id,
        ],
      })
      .expect(404);
  });

  it('does not allow an unknown generation ID', async () => {
    const unknownGenerationId =
      '33333333-3333-4333-8333-333333333333';

    await request(app.getHttpServer())
      .post('/generations/compare')
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        generationIds: [
          generationA.id,
          unknownGenerationId,
        ],
      })
      .expect(404);
  });
});