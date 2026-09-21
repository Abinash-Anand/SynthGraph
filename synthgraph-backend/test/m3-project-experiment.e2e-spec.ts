import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import request from 'supertest';
import { createHash, randomBytes } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { User } from '../src/database/entities/user.entity.js';
import { ApiKey } from '../src/database/entities/api-key.entity.js';
import { Project } from '../src/database/entities/project.entity.js';
import { Experiment } from '../src/database/entities/experiment.entity.js';

describe('M3 Project → Experiment workflow (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let userRepository: Repository<User>;
  let apiKeyRepository: Repository<ApiKey>;
  let projectRepository: Repository<Project>;
  let experimentRepository: Repository<Experiment>;

  let userA: User;
  let userB: User;

  let apiKeyA: string;
  let apiKeyB: string;

  let projectA: Project;
  let projectB: Project;

  function createRawApiKey(): string {
    return `sg_${randomBytes(32).toString('hex')}`;
  }

  function hashApiKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
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

    userA = await userRepository.save(
      userRepository.create({
        email: `m3-a-${randomBytes(8).toString('hex')}@example.com`,
      }),
    );

    userB = await userRepository.save(
      userRepository.create({
        email: `m3-b-${randomBytes(8).toString('hex')}@example.com`,
      }),
    );

    apiKeyA = createRawApiKey();
    apiKeyB = createRawApiKey();

    await apiKeyRepository.save(
      apiKeyRepository.create({
        userId: userA.id,
        keyPrefix: apiKeyA.slice(0, 16),
        keyHash: hashApiKey(apiKeyA),
        revokedAt: null,
      }),
    );

    await apiKeyRepository.save(
      apiKeyRepository.create({
        userId: userB.id,
        keyPrefix: apiKeyB.slice(0, 16),
        keyHash: hashApiKey(apiKeyB),
        revokedAt: null,
      }),
    );
  });

  afterAll(async () => {
    await experimentRepository
      .createQueryBuilder()
      .delete()
      .where('project_id IN (:...projectIds)', {
        projectIds: [projectA?.id, projectB?.id].filter(Boolean),
      })
      .execute();

    await projectRepository
      .createQueryBuilder()
      .delete()
      .where('id IN (:...projectIds)', {
        projectIds: [projectA?.id, projectB?.id].filter(Boolean),
      })
      .execute();

    await apiKeyRepository.delete({
      userId: userA.id,
    });

    await apiKeyRepository.delete({
      userId: userB.id,
    });

    await userRepository.delete(userA.id);
    await userRepository.delete(userB.id);

    await app.close();
  });

  describe('authentication', () => {
    it('rejects requests without an API key', async () => {
      await request(app.getHttpServer()).get('/projects').expect(401);
    });

    it('accepts a valid API key', async () => {
      await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);
    });
  });

  describe('projects', () => {
    it('creates a project for the authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({
          name: 'M3 Project A',
          description: 'M3 integration test',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'M3 Project A',
        description: 'M3 integration test',
      });

      expect(response.body.id).toEqual(expect.any(String));

      projectA = await projectRepository.findOneByOrFail({
        id: response.body.id,
      });

      expect(projectA.userId).toBe(userA.id);
    });

    it('retrieves a project belonging to the authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectA.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(response.body.id).toBe(projectA.id);
      expect(response.body.name).toBe('M3 Project A');
    });

    it('lists only projects belonging to the authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: projectA.id,
          }),
        ]),
      );

      expect(
        response.body.some(
          (project: { userId?: string; id: string }) =>
            project.id === projectB?.id,
        ),
      ).toBe(false);
    });
  });

  describe('experiments', () => {
    it('creates an experiment under the authenticated user project', async () => {
      const response = await request(app.getHttpServer())
        .post(`/projects/${projectA.id}/experiments`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({
          name: 'M3 Experiment A',
          description: 'Experiment created through API',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        projectId: projectA.id,
        name: 'M3 Experiment A',
        description: 'Experiment created through API',
      });

      expect(response.body.id).toEqual(expect.any(String));
    });

    it('lists experiments under the authenticated user project', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectA.id}/experiments`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            projectId: projectA.id,
            name: 'M3 Experiment A',
          }),
        ]),
      );
    });
  });

  describe('ownership isolation', () => {
    beforeAll(async () => {
      projectB = await projectRepository.save(
        projectRepository.create({
          userId: userB.id,
          name: 'M3 Project B',
          description: null,
        }),
      );
    });

    it('prevents user B from retrieving user A project', async () => {
      await request(app.getHttpServer())
        .get(`/projects/${projectA.id}`)
        .set('Authorization', `Bearer ${apiKeyB}`)
        .expect(404);
    });

    it('prevents user B from listing experiments under user A project', async () => {
      await request(app.getHttpServer())
        .get(`/projects/${projectA.id}/experiments`)
        .set('Authorization', `Bearer ${apiKeyB}`)
        .expect(404);
    });

    it('prevents user B from creating an experiment under user A project', async () => {
      await request(app.getHttpServer())
        .post(`/projects/${projectA.id}/experiments`)
        .set('Authorization', `Bearer ${apiKeyB}`)
        .send({
          name: 'Unauthorized Experiment',
        })
        .expect(404);
    });
  });

  describe('not found behavior', () => {
    it('returns 404 for a nonexistent project', async () => {
      await request(app.getHttpServer())
        .get('/projects/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(404);
    });

    it('returns 404 when creating an experiment under a nonexistent project', async () => {
      await request(app.getHttpServer())
        .post('/projects/00000000-0000-0000-0000-000000000000/experiments')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({
          name: 'Invalid Experiment',
        })
        .expect(404);
    });

    it('returns 404 for a nonexistent experiment', async () => {
      await request(app.getHttpServer())
        .get(
          `/projects/${projectA.id}/experiments/00000000-0000-0000-0000-000000000000`,
        )
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(404);
    });
  });
});
