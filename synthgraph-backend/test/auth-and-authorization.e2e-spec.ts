import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { randomBytes } from 'node:crypto';

import { AppModule } from '../src/app.module.js';
import { ApiKey } from '../src/database/entities/api-key.entity.js';
import { Project } from '../src/database/entities/project.entity.js';
import { User } from '../src/database/entities/user.entity.js';

describe('Authentication and authorization (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  let userA: User;
  let userB: User;

  let projectA: Project;
  let projectB: Project;

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

    dataSource = moduleFixture.get<DataSource>(DataSource);

    const userRepository = dataSource.getRepository(User);
    const projectRepository = dataSource.getRepository(Project);

    userA = await userRepository.save(
      userRepository.create({
        email: `e2e-a-${Date.now()}@synthgraph.local`,
      }),
    );

    userB = await userRepository.save(
      userRepository.create({
        email: `e2e-b-${Date.now()}@synthgraph.local`,
      }),
    );

    projectA = await projectRepository.save(
      projectRepository.create({
        userId: userA.id,
        name: 'E2E Project A',
        description: 'Authentication and authorization test',
      }),
    );

    projectB = await projectRepository.save(
      projectRepository.create({
        userId: userB.id,
        name: 'E2E Project B',
        description: 'Authentication and authorization test',
      }),
    );
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      const projectRepository = dataSource.getRepository(Project);
      const userRepository = dataSource.getRepository(User);

      await projectRepository.delete({
        id: projectA.id,
      });

      await projectRepository.delete({
        id: projectB.id,
      });

      await userRepository.delete({
        id: userA.id,
      });

      await userRepository.delete({
        id: userB.id,
      });
    }

    await app.close();
  });

  it('rejects requests without an API key', async () => {
    await request(app.getHttpServer())
      .get(`/projects/${projectA.id}`)
      .expect(401);
  });

  it('rejects an invalid API key', async () => {
    await request(app.getHttpServer())
      .get(`/projects/${projectA.id}`)
      .set('Authorization', 'Bearer sg_invalid')
      .expect(401);
  });

  describe('register, login and identity', () => {
    const email = `e2e-bootstrap-${randomBytes(8).toString('hex')}@synthgraph.local`;
    const password = 'correct-horse-battery-staple';

    const otherEmail = `e2e-bootstrap-other-${randomBytes(8).toString('hex')}@synthgraph.local`;
    const otherPassword = 'another-correct-horse';

    let accessToken: string;
    let registeredUserId: string;

    let otherAccessToken: string;
    let otherUserId: string;

    afterAll(async () => {
      if (dataSource?.isInitialized) {
        const userIds = [registeredUserId, otherUserId].filter(Boolean);

        if (userIds.length > 0) {
          await dataSource
            .getRepository(ApiKey)
            .createQueryBuilder()
            .delete()
            .where('user_id IN (:...userIds)', { userIds })
            .execute();

          await dataSource
            .getRepository(User)
            .createQueryBuilder()
            .delete()
            .where('id IN (:...userIds)', { userIds })
            .execute();
        }
      }
    });

    it('registers a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password })
        .expect(201);

      expect(response.body.user).toMatchObject({ email });
      expect(response.body.user.id).toEqual(expect.any(String));

      registeredUserId = response.body.user.id;
    });

    it('rejects registering the same email twice', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password })
        .expect(409);
    });

    it('rejects login with the wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'wrong-password' })
        .expect(401);
    });

    it('logs in and returns a JWT', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(201);

      expect(response.body.user).toMatchObject({ email });
      expect(response.body.accessToken).toEqual(expect.any(String));

      accessToken = response.body.accessToken;
    });

    it('returns the current user for a valid JWT via /auth/me', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: registeredUserId,
        email,
      });
    });

    it('rejects /auth/me/api-key when authenticated with a JWT', async () => {
      await request(app.getHttpServer())
        .get('/auth/me/api-key')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });

    it('rejects /auth/me without any credentials', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    describe('api key lifecycle', () => {
      let apiKeyId: string;
      let rawApiKey: string;

      beforeAll(async () => {
        const registerResponse = await request(app.getHttpServer())
          .post('/auth/register')
          .send({ email: otherEmail, password: otherPassword })
          .expect(201);

        otherUserId = registerResponse.body.user.id;

        const loginResponse = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: otherEmail, password: otherPassword })
          .expect(201);

        otherAccessToken = loginResponse.body.accessToken;
      });

      it('creates an API key using the JWT', async () => {
        const response = await request(app.getHttpServer())
          .post('/api-keys')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(201);

        expect(response.body.key).toMatch(/^sg_/);
        expect(response.body.id).toEqual(expect.any(String));

        apiKeyId = response.body.id;
        rawApiKey = response.body.key;
      });

      it('authenticates resource requests with the newly created API key', async () => {
        const response = await request(app.getHttpServer())
          .get('/auth/me/api-key')
          .set('Authorization', `Bearer ${rawApiKey}`)
          .expect(200);

        expect(response.body).toMatchObject({
          id: registeredUserId,
          email,
        });
      });

      it('lists the created API key without exposing its secret', async () => {
        const response = await request(app.getHttpServer())
          .get('/api-keys')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: apiKeyId }),
          ]),
        );
        expect(JSON.stringify(response.body)).not.toContain(rawApiKey);
      });

      it('prevents another user from revoking this API key', async () => {
        await request(app.getHttpServer())
          .delete(`/api-keys/${apiKeyId}`)
          .set('Authorization', `Bearer ${otherAccessToken}`)
          .expect(404);
      });

      it('still authenticates with the API key after the failed cross-user revoke attempt', async () => {
        await request(app.getHttpServer())
          .get('/auth/me/api-key')
          .set('Authorization', `Bearer ${rawApiKey}`)
          .expect(200);
      });

      it('revokes the API key', async () => {
        await request(app.getHttpServer())
          .delete(`/api-keys/${apiKeyId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);
      });

      it('rejects requests using the revoked API key', async () => {
        await request(app.getHttpServer())
          .get('/auth/me/api-key')
          .set('Authorization', `Bearer ${rawApiKey}`)
          .expect(401);
      });

      it('rejects revoking a nonexistent API key', async () => {
        await request(app.getHttpServer())
          .delete('/api-keys/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(404);
      });
    });
  });
});
