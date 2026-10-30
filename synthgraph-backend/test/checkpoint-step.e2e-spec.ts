import { createHash, randomBytes } from 'node:crypto';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module.js';
import { ApiKey } from '../src/database/entities/api-key.entity.js';
import { Dataset } from '../src/database/entities/dataset.entity.js';
import { DatasetVersion } from '../src/database/entities/dataset-version.entity.js';
import { EvaluationResult } from '../src/database/entities/evaluation-result.entity.js';
import { Experiment } from '../src/database/entities/experiment.entity.js';
import { Project } from '../src/database/entities/project.entity.js';
import { TrainingRun } from '../src/database/entities/training-run.entity.js';
import { User } from '../src/database/entities/user.entity.js';
import { AddCheckpointStepToEvaluationResults1789015000000 } from '../src/database/migrations/1789015000000-AddCheckpointStepToEvaluationResults.js';

describe('Evaluation checkpoint step (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let apiKeyA: string;
  let apiKeyB: string;
  let runA: TrainingRun;
  let runB: TrainingRun;
  let datasetVersionA: DatasetVersion;

  const rawKey = () => `sg_${randomBytes(32).toString('hex')}`;
  const hash = (key: string) => createHash('sha256').update(key).digest('hex');
  const tag = randomBytes(6).toString('hex');

  const evaluationsPath = (run: TrainingRun) => `/training-runs/${run.id}/evaluations`;
  const post = (key: string, path: string, body: Record<string, unknown>) =>
    request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${key}`).send(body);
  const get = (key: string, path: string) =>
    request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${key}`);
  const countFor = (run: TrainingRun) =>
    dataSource.getRepository(EvaluationResult).countBy({ trainingRunId: run.id });
  const create = (body: Record<string, unknown>) =>
    post(apiKeyA, evaluationsPath(runA), {
      datasetVersionId: datasetVersionA.id,
      metrics: { accuracy: 0.9 },
      ...body,
    });

  async function makeUser(label: string) {
    const users = dataSource.getRepository(User);
    const user = await users.save(users.create({ email: `checkpoint-${label}-${tag}@example.com` }));
    const key = rawKey();
    const keys = dataSource.getRepository(ApiKey);
    await keys.save(
      keys.create({ userId: user.id, keyPrefix: key.slice(0, 16), keyHash: hash(key), revokedAt: null }),
    );
    const project = await dataSource
      .getRepository(Project)
      .save(dataSource.getRepository(Project).create({ userId: user.id, name: `Checkpoint ${label}`, description: null }));
    const experiment = await dataSource
      .getRepository(Experiment)
      .save(
        dataSource
          .getRepository(Experiment)
          .create({ projectId: project.id, name: `Checkpoint ${label}`, description: null }),
      );
    const runs = dataSource.getRepository(TrainingRun);
    const run = await runs.save(
      runs.create({
        experimentId: experiment.id,
        name: `Run ${label}`,
        description: null,
        trainer: { name: 'pytorch', version: '2.8.0', type: 'rl' },
        parameters: {},
        metrics: {},
        metadata: {},
      }),
    );
    const datasets = dataSource.getRepository(Dataset);
    const dataset = await datasets.save(
      datasets.create({ userId: user.id, name: `Dataset ${label}`, description: null, metadata: {} }),
    );
    const versions = dataSource.getRepository(DatasetVersion);
    const version = await versions.save(
      versions.create({
        datasetId: dataset.id,
        version: 'v1',
        uri: `s3://checkpoint-${label}/v1`,
        format: 'image',
        size: null,
        checksum: `checksum-${label}`,
        metadata: {},
      }),
    );
    return { key, run, version };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    dataSource = app.get(DataSource);

    const a = await makeUser('a');
    const b = await makeUser('b');
    apiKeyA = a.key;
    runA = a.run;
    datasetVersionA = a.version;
    apiKeyB = b.key;
    runB = b.run;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('recording', () => {
    it('stores the checkpoint step and returns it on create, get and list', async () => {
      const created = await create({ name: 'final', checkpointStep: 20160 }).expect(201);
      expect(created.body.checkpointStep).toBe(20160);

      const fetched = await get(apiKeyA, `/evaluation-results/${created.body.id}`).expect(200);
      expect(fetched.body.checkpointStep).toBe(20160);

      const listed = await get(apiKeyA, evaluationsPath(runA)).expect(200);
      const found = listed.body.find((e: { id: string }) => e.id === created.body.id);
      expect(found.checkpointStep).toBe(20160);
    });

    it('stores the exact column value', async () => {
      const created = await create({ checkpointStep: 500 }).expect(201);

      const rows = await dataSource.query(
        'SELECT checkpoint_step FROM evaluation_results WHERE id = $1',
        [created.body.id],
      );
      expect(rows[0].checkpoint_step).toBe(500);
    });

    it('is null when no checkpoint step is sent', async () => {
      const created = await create({}).expect(201);

      expect(created.body.checkpointStep).toBeNull();
      const fetched = await get(apiKeyA, `/evaluation-results/${created.body.id}`).expect(200);
      expect(fetched.body.checkpointStep).toBeNull();
    });

    it('never reads a step out of the name or the metadata', async () => {
      const created = await create({
        name: 'go1-eval-run3-step20160',
        metadata: { checkpointStep: 99, step: 7 },
      }).expect(201);

      expect(created.body.checkpointStep).toBeNull();
      expect(created.body.metadata).toEqual({ checkpointStep: 99, step: 7 });
    });

    it('accepts an explicit null, zero, and the largest 32-bit value', async () => {
      expect((await create({ checkpointStep: null }).expect(201)).body.checkpointStep).toBeNull();
      expect((await create({ checkpointStep: 0 }).expect(201)).body.checkpointStep).toBe(0);
      expect((await create({ checkpointStep: 2147483647 }).expect(201)).body.checkpointStep).toBe(
        2147483647,
      );
    });

    it('keeps two evaluations of one run at their own steps', async () => {
      const first = await create({ name: 'first', checkpointStep: 100 }).expect(201);
      const second = await create({ name: 'second', checkpointStep: 200 }).expect(201);

      expect(first.body.checkpointStep).toBe(100);
      expect(second.body.checkpointStep).toBe(200);
    });
  });

  describe('validation', () => {
    it.each([
      ['negative', -1],
      ['fractional', 1.5],
      ['a string', '10'],
      ['a boolean', true],
      ['an array', [1]],
      ['an object', { step: 1 }],
      ['past the 32-bit limit', 2147483648],
    ])('rejects a checkpoint step that is %s and writes nothing', async (_label, value) => {
      const before = await countFor(runA);

      await create({ checkpointStep: value }).expect(400);

      expect(await countFor(runA)).toBe(before);
    });

    it('rejects an unknown field next to it', async () => {
      await create({ checkpointStep: 5, checkpoint: 5 }).expect(400);
    });
  });

  describe('authorization is unchanged', () => {
    it('cannot attach an evaluation to another user run, whatever the step', async () => {
      const before = await countFor(runB);

      await post(apiKeyA, evaluationsPath(runB), {
        datasetVersionId: datasetVersionA.id,
        metrics: { accuracy: 0.9 },
        checkpointStep: 10,
      }).expect(404);

      expect(await countFor(runB)).toBe(before);
    });

    it('cannot read another user evaluation or its step', async () => {
      const created = await create({ checkpointStep: 42 }).expect(201);

      await get(apiKeyB, `/evaluation-results/${created.body.id}`).expect(404);
      await get(apiKeyB, evaluationsPath(runA)).expect(404);
    });

    it('still requires an API key', async () => {
      await request(app.getHttpServer())
        .post(evaluationsPath(runA))
        .send({ datasetVersionId: datasetVersionA.id, metrics: {}, checkpointStep: 1 })
        .expect(401);
    });
  });

  describe('existing evaluations', () => {
    it('keep a null step: the migration adds the column without a backfill', async () => {
      const repository = dataSource.getRepository(EvaluationResult);
      // Written the way a row from before this column existed looks: no step.
      const legacy = await repository.save(
        repository.create({
          trainingRunId: runA.id,
          datasetVersionId: datasetVersionA.id,
          name: 'legacy-step9000',
          metrics: { accuracy: 0.5 },
          metadata: {},
        }),
      );

      const fetched = await get(apiKeyA, `/evaluation-results/${legacy.id}`).expect(200);
      expect(fetched.body.checkpointStep).toBeNull();
    });
  });

  describe('migration', () => {
    it('can be reverted and applied again, leaving the schema as it was', async () => {
      const migration = new AddCheckpointStepToEvaluationResults1789015000000();
      const queryRunner = dataSource.createQueryRunner();
      const columnType = async () =>
        queryRunner.query(
          `SELECT data_type, is_nullable, column_default FROM information_schema.columns
           WHERE table_name = 'evaluation_results' AND column_name = 'checkpoint_step'`,
        );

      // Postgres DDL is transactional, so this leaves the database untouched.
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        expect(await columnType()).toHaveLength(1);

        await migration.down(queryRunner);
        expect(await columnType()).toHaveLength(0);

        await migration.up(queryRunner);
        const [column] = await columnType();
        expect(column).toEqual({
          data_type: 'integer',
          is_nullable: 'YES',
          column_default: null,
        });

        // The database itself refuses a negative step, not only the API.
        await queryRunner.query('SAVEPOINT before_negative');
        await expect(
          queryRunner.query(
            `INSERT INTO evaluation_results (training_run_id, dataset_version_id, metrics, checkpoint_step)
             VALUES ($1, $2, '{}'::jsonb, -1)`,
            [runA.id, datasetVersionA.id],
          ),
        ).rejects.toThrow(/CHK_evaluation_results_checkpoint_step_non_negative/);
        await queryRunner.query('ROLLBACK TO SAVEPOINT before_negative');
      } finally {
        await queryRunner.rollbackTransaction();
        await queryRunner.release();
      }

    });
  });
});
