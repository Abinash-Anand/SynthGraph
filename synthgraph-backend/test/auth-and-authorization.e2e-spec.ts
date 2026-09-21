import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module.js';
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
});
