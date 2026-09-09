import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { randomBytes } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { User } from '../src/database/entities/user.entity.js';
import { Project } from '../src/database/entities/project.entity.js';
import { Experiment } from '../src/database/entities/experiment.entity.js';

describe('M3 database integrity (e2e)', () => {
  let moduleFixture: TestingModule;
  let dataSource: DataSource;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    dataSource = moduleFixture.get(DataSource);
  });

  afterAll(async () => {
    await moduleFixture.close();
  });

  it('enforces the project → user foreign key', async () => {
    await expect(
      dataSource.query(
        `
        INSERT INTO projects (id, user_id, name, description, created_at, updated_at)
        VALUES (
          gen_random_uuid(),
          $1,
          'Invalid Project',
          NULL,
          NOW(),
          NOW()
        )
        `,
        [randomBytes(16).toString('hex')],
      ),
    ).rejects.toThrow();
  });

  it('enforces the experiment → project foreign key', async () => {
    const fakeProjectId = randomBytes(16).toString('hex');

    await expect(
      dataSource.query(
        `
        INSERT INTO experiments (
          id,
          project_id,
          name,
          description,
          created_at,
          updated_at
        )
        VALUES (
          gen_random_uuid(),
          $1,
          'Invalid Experiment',
          NULL,
          NOW(),
          NOW()
        )
        `,
        [fakeProjectId],
      ),
    ).rejects.toThrow();
  });

  it('prevents deleting a project that still has experiments', async () => {
    const user = await dataSource.getRepository(User).save(
      dataSource.getRepository(User).create({
        email: `m3-fk-${randomBytes(8).toString('hex')}@example.com`,
      }),
    );

    const project = await dataSource.getRepository(Project).save(
      dataSource.getRepository(Project).create({
        userId: user.id,
        name: 'RESTRICT Test Project',
        description: null,
      }),
    );

    await dataSource.getRepository(Experiment).save(
      dataSource.getRepository(Experiment).create({
        projectId: project.id,
        name: 'RESTRICT Test Experiment',
        description: null,
      }),
    );

    await expect(
      dataSource.getRepository(Project).delete(project.id),
    ).rejects.toThrow();

    await dataSource.getRepository(Experiment).delete({
      projectId: project.id,
    });

    await dataSource.getRepository(Project).delete(project.id);
    await dataSource.getRepository(User).delete(user.id);
  });
});
