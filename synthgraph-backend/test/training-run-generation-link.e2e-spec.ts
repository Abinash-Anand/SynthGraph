import { createHash, randomBytes } from 'node:crypto';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module.js';
import { ApiKey } from '../src/database/entities/api-key.entity.js';
import { Experiment } from '../src/database/entities/experiment.entity.js';
import { Generation, GenerationStatus } from '../src/database/entities/generation.entity.js';
import { Project } from '../src/database/entities/project.entity.js';
import { TrainingRun } from '../src/database/entities/training-run.entity.js';
import { User } from '../src/database/entities/user.entity.js';
import { CreateTrainingRunGenerationRefs1789025000000 } from '../src/database/migrations/1789025000000-CreateTrainingRunGenerationRefs.js';

describe('Training run to generation link (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const tag = randomBytes(6).toString('hex');
  const rawKey = () => `sg_${randomBytes(32).toString('hex')}`;
  const hash = (key: string) => createHash('sha256').update(key).digest('hex');

  let keyA: string;
  let keyB: string;
  let userA: User;
  let userB: User;
  // Project 1 has two experiments, project 2 has one; all user A's. expB is user B's.
  let project1: Project;
  let exp1a: Experiment;
  let exp1b: Experiment;
  let exp2: Experiment;
  let expB: Experiment;

  const as = (key: string) => ({
    get: (path: string) => request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${key}`),
    post: (path: string, body: Record<string, unknown> = {}) =>
      request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${key}`).send(body),
    patch: (path: string, body: Record<string, unknown> = {}) =>
      request(app.getHttpServer()).patch(path).set('Authorization', `Bearer ${key}`).send(body),
    put: (path: string, body: Record<string, unknown> = {}) =>
      request(app.getHttpServer()).put(path).set('Authorization', `Bearer ${key}`).send(body),
    delete: (path: string) => request(app.getHttpServer()).delete(path).set('Authorization', `Bearer ${key}`),
  });
  const a = () => as(keyA);

  async function makeGeneration(experiment: Experiment, name?: string) {
    const repository = dataSource.getRepository(Generation);
    return repository.save(
      repository.create({
        experimentId: experiment.id,
        name: name ?? `gen-${randomBytes(3).toString('hex')}`,
        description: null,
        generator: { name: 'blender', version: '4.2.0' },
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
  }

  async function makeRun(experiment: Experiment) {
    const repository = dataSource.getRepository(TrainingRun);
    return repository.save(
      repository.create({
        experimentId: experiment.id,
        name: `run-${randomBytes(3).toString('hex')}`,
        description: null,
        trainer: { name: 'pytorch', version: '2.8.0', type: 'rl' },
        parameters: {},
        metrics: {},
        metadata: {},
      }),
    );
  }

  const link = (run: TrainingRun, generation: Generation, key = keyA) =>
    as(key).post(`/training-runs/${run.id}/generations`, { generationId: generation.id });
  const rowCount = async (runId: string) =>
    Number(
      (await dataSource.query('SELECT count(*)::int AS n FROM training_run_generation_refs WHERE training_run_id = $1', [runId]))[0].n,
    );

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    dataSource = app.get(DataSource);

    const users = dataSource.getRepository(User);
    userA = await users.save(users.create({ email: `link-a-${tag}@example.com` }));
    userB = await users.save(users.create({ email: `link-b-${tag}@example.com` }));
    keyA = rawKey();
    keyB = rawKey();
    const keys = dataSource.getRepository(ApiKey);
    await keys.save([
      keys.create({ userId: userA.id, keyPrefix: keyA.slice(0, 16), keyHash: hash(keyA), revokedAt: null }),
      keys.create({ userId: userB.id, keyPrefix: keyB.slice(0, 16), keyHash: hash(keyB), revokedAt: null }),
    ]);
    const projects = dataSource.getRepository(Project);
    project1 = await projects.save(projects.create({ userId: userA.id, name: `Link 1 ${tag}`, description: null }));
    const project2 = await projects.save(projects.create({ userId: userA.id, name: `Link 2 ${tag}`, description: null }));
    const projectB = await projects.save(projects.create({ userId: userB.id, name: `Link B ${tag}`, description: null }));
    const experiments = dataSource.getRepository(Experiment);
    exp1a = await experiments.save(experiments.create({ projectId: project1.id, name: '1a', description: null }));
    exp1b = await experiments.save(experiments.create({ projectId: project1.id, name: '1b', description: null }));
    exp2 = await experiments.save(experiments.create({ projectId: project2.id, name: '2', description: null }));
    expB = await experiments.save(experiments.create({ projectId: projectB.id, name: 'B', description: null }));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('recording a link', () => {
    it('records a link inside one experiment and returns it', async () => {
      const run = await makeRun(exp1a);
      const generation = await makeGeneration(exp1a, 'rain pass');

      const response = await link(run, generation).expect(201);

      expect(response.body).toEqual({
        trainingRunId: run.id,
        generationId: generation.id,
        generationName: 'rain pass',
        experimentId: exp1a.id,
        createdAt: expect.any(String),
      });
      expect(await rowCount(run.id)).toBe(1);
    });

    it('allows a generation from another experiment of the same project', async () => {
      const run = await makeRun(exp1a);
      const generation = await makeGeneration(exp1b, 'other experiment');

      const response = await link(run, generation).expect(201);

      expect(response.body.experimentId).toBe(exp1b.id);
    });

    it('allows one run to use many generations, and one generation many runs', async () => {
      const run = await makeRun(exp1a);
      const generations = [await makeGeneration(exp1a), await makeGeneration(exp1a), await makeGeneration(exp1b)];
      for (const generation of generations) await link(run, generation).expect(201);

      const other = await makeRun(exp1b);
      await link(other, generations[0]).expect(201);

      expect(await rowCount(run.id)).toBe(3);
      expect(await rowCount(other.id)).toBe(1);
    });

    it('rejects a duplicate with the existing 409 and records nothing more', async () => {
      const run = await makeRun(exp1a);
      const generation = await makeGeneration(exp1a);
      await link(run, generation).expect(201);

      const duplicate = await link(run, generation).expect(409);

      expect(duplicate.body.message).toMatch(/already exists/);
      expect(duplicate.body.code).toBeUndefined();
      expect(await rowCount(run.id)).toBe(1);
    });

    it('lets exactly one of two identical simultaneous requests win', async () => {
      const run = await makeRun(exp1a);
      const generation = await makeGeneration(exp1a);

      const results = await Promise.all([link(run, generation), link(run, generation)]);

      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(await rowCount(run.id)).toBe(1);
    });
  });

  describe('across projects', () => {
    it('rejects a generation from another project and records nothing', async () => {
      const run = await makeRun(exp1a);
      const generation = await makeGeneration(exp2);

      const response = await link(run, generation).expect(409);

      expect(response.body.code).toBe('cross_project_reference');
      expect(response.body.message).toMatch(/different project/);
      expect(response.body.generationId).toBe(generation.id);
      expect(await rowCount(run.id)).toBe(0);
    });

    it('rejects it the other way round too', async () => {
      const run = await makeRun(exp2);

      await link(run, await makeGeneration(exp1b)).expect(409);

      expect(await rowCount(run.id)).toBe(0);
    });
  });

  describe('authorization', () => {
    it("cannot link another user's run", async () => {
      const foreignRun = await makeRun(expB);
      const generation = await makeGeneration(exp1a);

      await link(foreignRun, generation).expect(404);

      expect(await rowCount(foreignRun.id)).toBe(0);
    });

    it("cannot link another user's generation", async () => {
      const run = await makeRun(exp1a);
      const foreignGeneration = await makeGeneration(expB);

      await link(run, foreignGeneration).expect(404);

      expect(await rowCount(run.id)).toBe(0);
    });

    it('reports an unknown run or generation as 404', async () => {
      const run = await makeRun(exp1a);
      const unknown = '00000000-0000-4000-8000-000000000009';

      await a().post(`/training-runs/${unknown}/generations`, { generationId: (await makeGeneration(exp1a)).id }).expect(404);
      await a().post(`/training-runs/${run.id}/generations`, { generationId: unknown }).expect(404);
    });

    it("cannot read another user's links", async () => {
      const run = await makeRun(exp1a);
      await link(run, await makeGeneration(exp1a)).expect(201);

      await as(keyB).get(`/training-runs/${run.id}/generations`).expect(404);
    });

    it('requires an API key', async () => {
      const run = await makeRun(exp1a);
      await request(app.getHttpServer())
        .post(`/training-runs/${run.id}/generations`)
        .send({ generationId: (await makeGeneration(exp1a)).id })
        .expect(401);
      await request(app.getHttpServer()).get(`/training-runs/${run.id}/generations`).expect(401);
    });
  });

  describe('validation', () => {
    it.each([
      ['a missing generationId', {}],
      ['a non-UUID generationId', { generationId: 'abc' }],
      ['a number', { generationId: 5 }],
      ['an unknown field', { generationId: '00000000-0000-4000-8000-000000000009', role: 'input' }],
    ])('rejects %s', async (_label, body) => {
      const run = await makeRun(exp1a);

      await a().post(`/training-runs/${run.id}/generations`, body as Record<string, unknown>).expect(400);

      expect(await rowCount(run.id)).toBe(0);
    });

    it('rejects a run id that is not a UUID', async () => {
      await a().post('/training-runs/not-a-uuid/generations', { generationId: '00000000-0000-4000-8000-000000000009' }).expect(400);
    });
  });

  describe('reading links', () => {
    it('lists them oldest first, and an empty list when there are none', async () => {
      const run = await makeRun(exp1a);
      expect((await a().get(`/training-runs/${run.id}/generations`).expect(200)).body).toEqual([]);

      const first = await makeGeneration(exp1a, 'first');
      const second = await makeGeneration(exp1b, 'second');
      await link(run, first).expect(201);
      await link(run, second).expect(201);

      const listed = await a().get(`/training-runs/${run.id}/generations`).expect(200);

      expect(listed.body.map((r: { generationName: string }) => r.generationName)).toEqual(['first', 'second']);
      expect(listed.body[1]).toMatchObject({
        trainingRunId: run.id,
        generationId: second.id,
        experimentId: exp1b.id,
      });
    });

    it('paginates with limit and offset', async () => {
      const run = await makeRun(exp1a);
      for (const name of ['p1', 'p2', 'p3']) await link(run, await makeGeneration(exp1a, name)).expect(201);

      const page = await a().get(`/training-runs/${run.id}/generations?limit=1&offset=1`).expect(200);

      expect(page.body.map((r: { generationName: string }) => r.generationName)).toEqual(['p2']);
    });

    it('shows them on the run, on the run list and on the workspace', async () => {
      const run = await makeRun(exp1a);
      const unlinked = await makeRun(exp1a);
      const generation = await makeGeneration(exp1b, 'used');
      await link(run, generation).expect(201);
      const expected = [
        {
          generationId: generation.id,
          generationName: 'used',
          experimentId: exp1b.id,
          createdAt: expect.any(String),
        },
      ];

      const single = await a().get(`/training-runs/${run.id}`).expect(200);
      expect(single.body.generationReferences).toEqual(expected);

      const listed = await a().get(`/experiments/${exp1a.id}/training-runs`).expect(200);
      const byId = new Map<string, { generationReferences: unknown[] }>(
        listed.body.map((r: { id: string }) => [r.id, r]),
      );
      expect(byId.get(run.id)?.generationReferences).toEqual(expected);
      // A run with no recorded link has an empty list, not a missing field.
      expect(byId.get(unlinked.id)?.generationReferences).toEqual([]);

      const workspace = await a().get(`/experiments/${exp1a.id}/workspace`).expect(200);
      const inWorkspace = workspace.body.trainingRuns.find((t: { run: { id: string } }) => t.run.id === run.id);
      expect(inWorkspace.run.generationReferences).toEqual(expected);
    });

    it('leaves the run\'s dataset list as it was', async () => {
      const run = await makeRun(exp1a);
      await link(run, await makeGeneration(exp1a)).expect(201);

      const single = await a().get(`/training-runs/${run.id}`).expect(200);

      expect(single.body.datasets).toEqual([]);
    });

    it('gives an existing run no link: nothing is backfilled', async () => {
      const run = await makeRun(exp1a);
      // Generations in the same experiment, created around the same time, are not
      // taken to be linked.
      await makeGeneration(exp1a);

      expect((await a().get(`/training-runs/${run.id}`).expect(200)).body.generationReferences).toEqual([]);
      expect(await rowCount(run.id)).toBe(0);
    });
  });

  describe('links are exact and immutable', () => {
    it('has no route that changes or removes one', async () => {
      const run = await makeRun(exp1a);
      const generation = await makeGeneration(exp1a);
      await link(run, generation).expect(201);
      const path = `/training-runs/${run.id}/generations`;

      await a().put(path, { generationId: generation.id }).expect(404);
      await a().patch(path, { generationId: generation.id }).expect(404);
      await a().delete(path).expect(404);
      await a().delete(`${path}/${generation.id}`).expect(404);
      await a().patch(`${path}/${generation.id}`, {}).expect(404);

      expect(await rowCount(run.id)).toBe(1);
    });

    it('cannot be deleted by deleting the generation', async () => {
      const run = await makeRun(exp1a);
      const generation = await makeGeneration(exp1a);
      await link(run, generation).expect(201);

      await expect(
        dataSource.getRepository(Generation).delete(generation.id),
      ).rejects.toThrow(/FK_training_run_generation_refs_generation_id/);
      expect(await rowCount(run.id)).toBe(1);
    });
  });

  describe('migration', () => {
    it('can be reverted and applied again, leaving the schema as it was', async () => {
      const migration = new CreateTrainingRunGenerationRefs1789025000000();
      const queryRunner = dataSource.createQueryRunner();
      const tableExists = async () =>
        (await queryRunner.query(`SELECT to_regclass('public.training_run_generation_refs') AS t`))[0].t !== null;

      // Postgres DDL is transactional, so this leaves the database untouched.
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        expect(await tableExists()).toBe(true);

        await migration.down(queryRunner);
        expect(await tableExists()).toBe(false);

        await migration.up(queryRunner);
        expect(await tableExists()).toBe(true);

        const columns = await queryRunner.query(
          `SELECT column_name FROM information_schema.columns
            WHERE table_name = 'training_run_generation_refs' ORDER BY ordinal_position`,
        );
        expect(columns.map((c: { column_name: string }) => c.column_name)).toEqual([
          'training_run_id',
          'generation_id',
          'created_at',
        ]);
        const primaryKey = await queryRunner.query(
          `SELECT a.attname FROM pg_index i
             JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = 'training_run_generation_refs'::regclass AND i.indisprimary
            ORDER BY a.attname`,
        );
        expect(primaryKey.map((p: { attname: string }) => p.attname)).toEqual(['generation_id', 'training_run_id']);
        const rules = await queryRunner.query(
          `SELECT confdeltype FROM pg_constraint
            WHERE conrelid = 'training_run_generation_refs'::regclass AND contype = 'f'`,
        );
        // 'r' is RESTRICT
        expect(rules.map((r: { confdeltype: string }) => r.confdeltype)).toEqual(['r', 'r']);
      } finally {
        await queryRunner.rollbackTransaction();
        await queryRunner.release();
      }
    });

    it('adds no rows for existing runs', async () => {
      const run = await makeRun(exp1a);

      expect(await rowCount(run.id)).toBe(0);
    });
  });
});
