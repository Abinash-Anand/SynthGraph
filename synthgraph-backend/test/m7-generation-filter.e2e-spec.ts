import { INestApplication, ValidationPipe } from '@nestjs/common';
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

describe('M7 Generation parameter filtering (e2e)', () => {
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

  let rainyGeneration: Generation;
  let sunnyGeneration: Generation;
  let highOcclusionGeneration: Generation;
  let otherUserGeneration: Generation;

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
        description: null,
        generator: {
          name: 'blender',
          version: '4.2.0',
        },
        parameters,
        reproducibility: {
          seed: 42,
        },
        inputs: [],
        outputs: [],
        status: GenerationStatus.Pending,
        startedAt: null,
        completedAt: null,
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
        email: `m7-filter-a-${randomBytes(8).toString('hex')}@example.com`,
      }),
    );

    userB = await userRepository.save(
      userRepository.create({
        email: `m7-filter-b-${randomBytes(8).toString('hex')}@example.com`,
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
        name: 'M7 Filter Project A',
        description: null,
      }),
    );

    projectB = await projectRepository.save(
      projectRepository.create({
        userId: userB.id,
        name: 'M7 Filter Project B',
        description: null,
      }),
    );

    experimentA = await experimentRepository.save(
      experimentRepository.create({
        projectId: projectA.id,
        name: 'M7 Filter Experiment A',
        description: null,
      }),
    );

    experimentB = await experimentRepository.save(
      experimentRepository.create({
        projectId: projectB.id,
        name: 'M7 Filter Experiment B',
        description: null,
      }),
    );

    rainyGeneration = await createGeneration(
      experimentA.id,
      'Rainy Generation',
      {
        weather: 'rain',
        occlusion: 0.2,
        samples: 512,
      },
    );

    sunnyGeneration = await createGeneration(
      experimentA.id,
      'Sunny Generation',
      {
        weather: 'sunny',
        occlusion: 0.2,
        samples: 512,
      },
    );

    highOcclusionGeneration = await createGeneration(
      experimentA.id,
      'High Occlusion Generation',
      {
        weather: 'rain',
        occlusion: 0.8,
        samples: 1024,
      },
    );

    otherUserGeneration = await createGeneration(
      experimentB.id,
      'Other User Generation',
      {
        weather: 'rain',
        occlusion: 0.8,
      },
    );
  });

  afterAll(async () => {
    await generationRepository.delete([
      rainyGeneration.id,
      sunnyGeneration.id,
      highOcclusionGeneration.id,
      otherUserGeneration.id,
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
      .get(`/experiments/${experimentA.id}/generations`)
      .query({
        parameters: JSON.stringify({
          weather: 'rain',
        }),
      })
      .expect(401);
  });

  it('returns all generations when no parameter filter is supplied', async () => {
    const response = await request(app.getHttpServer())
      .get(`/experiments/${experimentA.id}/generations`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200);

    expect(response.body).toHaveLength(3);
  });

  it('filters generations by an exact parameter match', async () => {
    const response = await request(app.getHttpServer())
      .get(`/experiments/${experimentA.id}/generations`)
      .query({
        parameters: JSON.stringify({
          weather: 'rain',
        }),
      })
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200);

    const ids = (
      response.body as Array<{ id: string }>
    ).map(({ id }) => id);

    expect(ids).toEqual(
      expect.arrayContaining([
        rainyGeneration.id,
        highOcclusionGeneration.id,
      ]),
    );

    expect(ids).not.toContain(sunnyGeneration.id);
  });

  it('supports filtering by multiple parameter values', async () => {
    const response = await request(app.getHttpServer())
      .get(`/experiments/${experimentA.id}/generations`)
      .query({
        parameters: JSON.stringify({
          weather: 'rain',
          occlusion: 0.8,
        }),
      })
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe(
      highOcclusionGeneration.id,
    );
  });

  it('returns an empty result when no generation matches', async () => {
    const response = await request(app.getHttpServer())
      .get(`/experiments/${experimentA.id}/generations`)
      .query({
        parameters: JSON.stringify({
          weather: 'snow',
        }),
      })
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('rejects malformed parameter JSON', async () => {
    await request(app.getHttpServer())
      .get(`/experiments/${experimentA.id}/generations`)
      .query({
        parameters: '{invalid-json',
      })
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(400);
  });

  it('rejects parameter arrays', async () => {
    await request(app.getHttpServer())
      .get(`/experiments/${experimentA.id}/generations`)
      .query({
        parameters: JSON.stringify([
          'weather',
          'rain',
        ]),
      })
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(400);
  });

  it('does not allow another user to access the experiment', async () => {
    await request(app.getHttpServer())
      .get(`/experiments/${experimentA.id}/generations`)
      .query({
        parameters: JSON.stringify({
          weather: 'rain',
        }),
      })
      .set('Authorization', `Bearer ${apiKeyB}`)
      .expect(404);
  });
});