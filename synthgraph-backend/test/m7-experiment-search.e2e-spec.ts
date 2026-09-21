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

  let apiKeyA: string;
  let apiKeyB: string;

  let rainExperiment: Experiment;
  let snowExperiment: Experiment;
  let vehicleDetectionExperiment: Experiment;
  let otherUserExperiment: Experiment;

  function createRawApiKey(): string {
    return `sg_${randomBytes(32).toString('hex')}`;
  }

  function hashApiKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }

  async function createExperiment(
    projectId: string,
    name: string,
    description: string | null,
  ): Promise<Experiment> {
    return experimentRepository.save(
      experimentRepository.create({
        projectId,
        name,
        description,
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
        description: null,
      }),
    );

    projectB = await projectRepository.save(
      projectRepository.create({
        userId: userB.id,
        name: 'M7 Search Project B',
        description: null,
      }),
    );

    rainExperiment = await createExperiment(
      projectA.id,
      'Rainy Weather Detection',
      'Detects vehicles under rain conditions',
    );

    snowExperiment = await createExperiment(
      projectA.id,
      'Snowy Weather Detection',
      'Detects vehicles under snow conditions',
    );

    vehicleDetectionExperiment = await createExperiment(
      projectA.id,
      'Baseline',
      'General vehicle detection baseline run',
    );

    otherUserExperiment = await createExperiment(
      projectB.id,
      'Rainy Weather Detection',
      'Owned by a different user',
    );
  });

  afterAll(async () => {
    await experimentRepository.delete([
      rainExperiment.id,
      snowExperiment.id,
      vehicleDetectionExperiment.id,
      otherUserExperiment.id,
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
      .query({ search: 'rain' })
      .expect(401);
  });

  it('returns all experiments in the project when no search is supplied', async () => {
    const response = await request(app.getHttpServer())
      .get(`/projects/${projectA.id}/experiments`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200);

    expect(response.body).toHaveLength(3);
  });

  it('matches experiments by name', async () => {
    const response = await request(app.getHttpServer())
      .get(`/projects/${projectA.id}/experiments`)
      .query({ search: 'Rainy' })
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200);

    const ids = (response.body as Array<{ id: string }>).map(({ id }) => id);

    expect(ids).toEqual([rainExperiment.id]);
  });

  it('matches experiments by description', async () => {
    const response = await request(app.getHttpServer())
      .get(`/projects/${projectA.id}/experiments`)
      .query({ search: 'snow conditions' })
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200);

    const ids = (response.body as Array<{ id: string }>).map(({ id }) => id);

    expect(ids).toEqual([snowExperiment.id]);
  });

  it('matches across both name and description with a shared term', async () => {
    const response = await request(app.getHttpServer())
      .get(`/projects/${projectA.id}/experiments`)
      .query({ search: 'vehicle' })
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200);

    const ids = (response.body as Array<{ id: string }>).map(({ id }) => id);

    expect(ids).toEqual(
      expect.arrayContaining([
        rainExperiment.id,
        snowExperiment.id,
        vehicleDetectionExperiment.id,
      ]),
    );
  });

  it('is case-insensitive', async () => {
    const response = await request(app.getHttpServer())
      .get(`/projects/${projectA.id}/experiments`)
      .query({ search: 'RAINY' })
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200);

    const ids = (response.body as Array<{ id: string }>).map(({ id }) => id);

    expect(ids).toEqual([rainExperiment.id]);
  });

  it('returns an empty result when nothing matches', async () => {
    const response = await request(app.getHttpServer())
      .get(`/projects/${projectA.id}/experiments`)
      .query({ search: 'thunderstorm' })
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('rejects a search term longer than 100 characters', async () => {
    await request(app.getHttpServer())
      .get(`/projects/${projectA.id}/experiments`)
      .query({ search: 'x'.repeat(101) })
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(400);
  });

  it('does not allow another user to search a project they do not own', async () => {
    await request(app.getHttpServer())
      .get(`/projects/${projectA.id}/experiments`)
      .query({ search: 'rain' })
      .set('Authorization', `Bearer ${apiKeyB}`)
      .expect(404);
  });

  it('never returns another user\'s experiments, even with a matching name', async () => {
    const response = await request(app.getHttpServer())
      .get(`/projects/${projectB.id}/experiments`)
      .query({ search: 'Rainy' })
      .set('Authorization', `Bearer ${apiKeyB}`)
      .expect(200);

    const ids = (response.body as Array<{ id: string }>).map(({ id }) => id);

    expect(ids).toEqual([otherUserExperiment.id]);
    expect(ids).not.toContain(rainExperiment.id);
  });
});
