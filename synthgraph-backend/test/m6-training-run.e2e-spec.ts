import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash, randomBytes } from 'node:crypto';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';

import { AppModule } from '../src/app.module.js';
import { ApiKey } from '../src/database/entities/api-key.entity.js';
import { Experiment } from '../src/database/entities/experiment.entity.js';
import { Project } from '../src/database/entities/project.entity.js';
import { User } from '../src/database/entities/user.entity.js';

describe('M7 Experiment search (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let userRepository: Repository<User>;
  let apiKeyRepository: Repository<ApiKey>;
  let projectRepository: Repository<Project>;
  let experimentRepository: Repository<Experiment>;

  let userA: User;
  let userB: User;

  let projectA: Project;
  let projectB: Project;

  let experimentA: Experiment;
  let experimentB: Experiment;

  let apiKeyA: string;
  let apiKeyB: string;

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

    userA = await userRepository.save(
      userRepository.create({
        email: `m7-search-a-${randomBytes(8).toString('hex')}@example.com`,
      }),
    );

    userB = await userRepository.save(
      userRepository.create({
        email: `m7-search-b-${randomBytes(8).toString('hex')}@example.com`,
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
        name: 'M7 Search Project A',
        description: 'Search test project',
      }),
    );

    projectB = await projectRepository.save(
      projectRepository.create({
        userId: userB.id,
        name: 'M7 Search Project B',
        description: 'Search isolation project',
      }),
    );

    experimentA = await experimentRepository.save(
      experimentRepository.create({
        projectId: projectA.id,
        name: 'Rainy Driving Experiment',
        description: 'Synthetic rainy driving scenes',
      }),
    );

    experimentB = await experimentRepository.save(
      experimentRepository.create({
        projectId: projectA.id,
        name: 'Sunny Driving Experiment',
        description: 'Synthetic sunny driving scenes',
      }),
    );
  });

  afterAll(async () => {
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
      .get(`/projects/${projectA.id}/experiments`)
      .expect(401);
  });

  it('searches experiments by name', async () => {
    const response = await request(app.getHttpServer())
      .get(`/projects/${projectA.id}/experiments`)
      .query({ search: 'Rainy' })
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      id: experimentA.id,
      name: 'Rainy Driving Experiment',
    });
  });

  it('searches experiments by description', async () => {
    const response = await request(app.getHttpServer())
      .get(`/projects/${projectA.id}/experiments`)
      .query({ search: 'sunny driving' })
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      id: experimentB.id,
      name: 'Sunny Driving Experiment',
    });
  });

  it('returns an empty result when nothing matches', async () => {
    const response = await request(app.getHttpServer())
      .get(`/projects/${projectA.id}/experiments`)
      .query({ search: 'does-not-exist' })
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('does not allow another user to search the project', async () => {
    await request(app.getHttpServer())
      .get(`/projects/${projectA.id}/experiments`)
      .query({ search: 'Rainy' })
      .set('Authorization', `Bearer ${apiKeyB}`)
      .expect(404);
  });
});