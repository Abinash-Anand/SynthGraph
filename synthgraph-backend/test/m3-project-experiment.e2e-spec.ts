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

  let experimentA: Experiment;

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

    it('paginates the project list via limit/offset', async () => {
      // Self-contained rather than relying on fixture ordering from other
      // tests in this file: creates its own two projects (most recent, by
      // the list's createdAt DESC order) so the two pages are deterministic
      // regardless of how many other projects userA already has.
      const older = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'M3 Pagination Older', description: null })
        .expect(201);

      const newer = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'M3 Pagination Newer', description: null })
        .expect(201);

      const firstPage = await request(app.getHttpServer())
        .get('/projects?limit=1&offset=0')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(firstPage.body).toHaveLength(1);
      expect(firstPage.body[0].id).toBe(newer.body.id);

      const secondPage = await request(app.getHttpServer())
        .get('/projects?limit=1&offset=1')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(secondPage.body).toHaveLength(1);
      expect(secondPage.body[0].id).toBe(older.body.id);

      await projectRepository.delete([older.body.id, newer.body.id]);
    });

    it('rejects an out-of-range limit', async () => {
      await request(app.getHttpServer())
        .get('/projects?limit=500')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(400);
    });

    it('updates name and description via PATCH', async () => {
      const created = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'M3 Patch Original', description: 'Original' })
        .expect(201);

      const patched = await request(app.getHttpServer())
        .patch(`/projects/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'M3 Patch Updated', description: 'Updated' })
        .expect(200);

      expect(patched.body).toMatchObject({
        id: created.body.id,
        name: 'M3 Patch Updated',
        description: 'Updated',
      });

      await projectRepository.delete(created.body.id);
    });

    it('rejects an empty PATCH body', async () => {
      const created = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'M3 Patch Empty', description: null })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/projects/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({})
        .expect(400);

      await projectRepository.delete(created.body.id);
    });

    it('does not allow patching another user project', async () => {
      const created = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${apiKeyB}`)
        .send({ name: 'M3 Patch User B', description: null })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/projects/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'Hijacked' })
        .expect(404);

      await projectRepository.delete(created.body.id);
    });

    it('archives a project via DELETE, hiding it from GET and list', async () => {
      const created = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'M3 Archive Me', description: null })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/projects/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/projects/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(404);

      const listed = await request(app.getHttpServer())
        .get('/projects?limit=200')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(
        listed.body.some(
          (project: { id: string }) => project.id === created.body.id,
        ),
      ).toBe(false);

      // Archiving an already-archived project is not idempotent - matches
      // ApiKeyManagementService.revoke()'s convention elsewhere in this API.
      await request(app.getHttpServer())
        .delete(`/projects/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(404);

      await projectRepository.delete(created.body.id);
    });

    it('does not allow archiving another user project', async () => {
      const created = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${apiKeyB}`)
        .send({ name: 'M3 Archive User B', description: null })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/projects/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(404);

      await projectRepository.delete(created.body.id);
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

      experimentA = await experimentRepository.findOneByOrFail({
        id: response.body.id,
      });
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

    it('paginates the experiment list via limit/offset', async () => {
      // Self-contained rather than relying on fixture ordering from other
      // tests in this file: creates its own two experiments (most recent,
      // by the list's createdAt DESC order) so the two pages are
      // deterministic regardless of how many other experiments projectA
      // already has.
      const older = await request(app.getHttpServer())
        .post(`/projects/${projectA.id}/experiments`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'M3 Pagination Older Experiment', description: null })
        .expect(201);

      const newer = await request(app.getHttpServer())
        .post(`/projects/${projectA.id}/experiments`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'M3 Pagination Newer Experiment', description: null })
        .expect(201);

      const firstPage = await request(app.getHttpServer())
        .get(`/projects/${projectA.id}/experiments?limit=1&offset=0`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(firstPage.body).toHaveLength(1);
      expect(firstPage.body[0].id).toBe(newer.body.id);

      const secondPage = await request(app.getHttpServer())
        .get(`/projects/${projectA.id}/experiments?limit=1&offset=1`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(secondPage.body).toHaveLength(1);
      expect(secondPage.body[0].id).toBe(older.body.id);

      await experimentRepository.delete([older.body.id, newer.body.id]);
    });

    it('retrieves an experiment nested under its project', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectA.id}/experiments/${experimentA.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: experimentA.id,
        projectId: projectA.id,
        name: 'M3 Experiment A',
      });
    });

    it('retrieves an experiment via the flat top-level route', async () => {
      const response = await request(app.getHttpServer())
        .get(`/experiments/${experimentA.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: experimentA.id,
        projectId: projectA.id,
        name: 'M3 Experiment A',
      });
    });

    it('updates name and description via PATCH', async () => {
      const created = await request(app.getHttpServer())
        .post(`/projects/${projectA.id}/experiments`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'M3 Experiment Patch Original', description: 'Original' })
        .expect(201);

      const patched = await request(app.getHttpServer())
        .patch(`/experiments/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'M3 Experiment Patch Updated', description: 'Updated' })
        .expect(200);

      expect(patched.body).toMatchObject({
        id: created.body.id,
        name: 'M3 Experiment Patch Updated',
        description: 'Updated',
      });

      await experimentRepository.delete(created.body.id);
    });

    it('rejects an empty PATCH body', async () => {
      const created = await request(app.getHttpServer())
        .post(`/projects/${projectA.id}/experiments`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'M3 Experiment Patch Empty', description: null })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/experiments/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({})
        .expect(400);

      await experimentRepository.delete(created.body.id);
    });

    it('does not allow patching another user experiment', async () => {
      const created = await request(app.getHttpServer())
        .post(`/projects/${projectA.id}/experiments`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'M3 Experiment Patch User B', description: null })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/experiments/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyB}`)
        .send({ name: 'Hijacked' })
        .expect(404);

      await experimentRepository.delete(created.body.id);
    });

    it('archives an experiment via DELETE, hiding it from GET and list', async () => {
      const created = await request(app.getHttpServer())
        .post(`/projects/${projectA.id}/experiments`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'M3 Experiment Archive Me', description: null })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/experiments/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/experiments/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(404);

      const listed = await request(app.getHttpServer())
        .get(`/projects/${projectA.id}/experiments?limit=200`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(
        listed.body.some(
          (experiment: { id: string }) => experiment.id === created.body.id,
        ),
      ).toBe(false);

      // Archiving an already-archived experiment is not idempotent - matches
      // ApiKeyManagementService.revoke()'s convention elsewhere in this API.
      await request(app.getHttpServer())
        .delete(`/experiments/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(404);

      await experimentRepository.delete(created.body.id);
    });

    it('does not allow archiving another user experiment', async () => {
      const created = await request(app.getHttpServer())
        .post(`/projects/${projectA.id}/experiments`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'M3 Experiment Archive User B', description: null })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/experiments/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyB}`)
        .expect(404);

      await experimentRepository.delete(created.body.id);
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

    it('prevents user B from retrieving user A experiment via the flat route', async () => {
      await request(app.getHttpServer())
        .get(`/experiments/${experimentA.id}`)
        .set('Authorization', `Bearer ${apiKeyB}`)
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

    it('returns 404 for a nonexistent experiment via the flat route', async () => {
      await request(app.getHttpServer())
        .get('/experiments/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(404);
    });
  });
});
