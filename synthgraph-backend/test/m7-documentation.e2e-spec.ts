import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash, randomBytes } from 'node:crypto';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';

import { AppModule } from '../src/app.module.js';
import { ApiKey } from '../src/database/entities/api-key.entity.js';
import {
  Generation,
  GenerationStatus,
} from '../src/database/entities/generation.entity.js';
import { Experiment } from '../src/database/entities/experiment.entity.js';
import { Project } from '../src/database/entities/project.entity.js';
import { User } from '../src/database/entities/user.entity.js';

describe('M7 Documentation export (e2e)', () => {
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

  let generationA: Generation;
  let generationB: Generation;

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
    generationRepository = dataSource.getRepository(Generation);

    userA = await userRepository.save(
      userRepository.create({
        email: `m7-docs-a-${randomBytes(8).toString('hex')}@example.com`,
      }),
    );

    userB = await userRepository.save(
      userRepository.create({
        email: `m7-docs-b-${randomBytes(8).toString('hex')}@example.com`,
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
        name: 'M7 Documentation Project A',
        description: null,
      }),
    );

    projectB = await projectRepository.save(
      projectRepository.create({
        userId: userB.id,
        name: 'M7 Documentation Project B',
        description: null,
      }),
    );

    experimentA = await experimentRepository.save(
      experimentRepository.create({
        projectId: projectA.id,
        name: 'Documentation Experiment',
        description: 'Experiment documentation test',
      }),
    );

    experimentB = await experimentRepository.save(
      experimentRepository.create({
        projectId: projectB.id,
        name: 'Private Experiment',
        description: null,
      }),
    );

    generationA = await generationRepository.save(
      generationRepository.create({
        experimentId: experimentA.id,
        name: 'Documentation Generation',
        description: 'Generation used for documentation export',
        generator: {
          name: 'blender',
          version: '4.2.0',
        },
        parameters: {
          lighting: 'rainy',
          occlusion: 0.3,
        },
        reproducibility: {
          seed: 42,
          code_version: 'abc123',
        },
        inputs: [
          {
            id: 'asset-1',
            uri: 'file:///data/model.blend',
          },
        ],
        outputs: [
          {
            id: 'dataset-1',
            uri: 'file:///data/output',
          },
        ],
        status: GenerationStatus.Completed,
        startedAt: new Date(),
        completedAt: new Date(),
        metadata: {},
      }),
    );

    generationB = await generationRepository.save(
      generationRepository.create({
        experimentId: experimentB.id,
        name: 'Private Generation',
        description: null,
        generator: {
          name: 'unity',
        },
        parameters: {},
        reproducibility: {},
        inputs: [],
        outputs: [],
        status: GenerationStatus.Completed,
        startedAt: new Date(),
        completedAt: new Date(),
        metadata: {},
      }),
    );
  });

  afterAll(async () => {
    await generationRepository.delete([
      generationA.id,
      generationB.id,
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
      .get(
        `/generations/${generationA.id}/documentation`,
      )
      .expect(401);
  });

  it('returns structured Markdown documentation', async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/generations/${generationA.id}/documentation`,
      )
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200);

    expect(response.headers['content-type']).toMatch(
      /text\/markdown/,
    );

    expect(response.text).toContain(
      '# Generation: Documentation Generation',
    );

    expect(response.text).toContain(
      '## Generation',
    );

    expect(response.text).toContain(
      `- ID: ${generationA.id}`,
    );

    expect(response.text).toContain(
      `- Experiment ID: ${experimentA.id}`,
    );

    expect(response.text).toContain(
      '## Description',
    );

    expect(response.text).toContain(
      'Generation used for documentation export',
    );

    expect(response.text).toContain(
      '## Generator',
    );

    expect(response.text).toContain(
      '"name": "blender"',
    );

    expect(response.text).toContain(
      '## Parameters',
    );

    expect(response.text).toContain(
      '"lighting": "rainy"',
    );

    expect(response.text).toContain(
      '## Reproducibility',
    );

    expect(response.text).toContain(
      '"seed": 42',
    );

    expect(response.text).toContain(
      '## Inputs',
    );

    expect(response.text).toContain(
      '## Outputs',
    );

    expect(response.text).toContain(
      '## Dataset References',
    );
  });

  it('does not expose another user generation', async () => {
    await request(app.getHttpServer())
      .get(
        `/generations/${generationB.id}/documentation`,
      )
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(404);
  });

  it('returns 404 for an unknown generation', async () => {
    const unknownGenerationId =
      '22222222-2222-4222-8222-222222222222';

    await request(app.getHttpServer())
      .get(
        `/generations/${unknownGenerationId}/documentation`,
      )
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(404);
  });
});