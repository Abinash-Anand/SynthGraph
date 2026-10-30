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
import { Generation, GenerationStatus } from '../src/database/entities/generation.entity.js';
import { GenerationDatasetReference } from '../src/database/entities/generation-dataset-reference.entity.js';
import { Project } from '../src/database/entities/project.entity.js';
import { TrainingRun } from '../src/database/entities/training-run.entity.js';
import { TrainingRunDatasetReference } from '../src/database/entities/training-run-dataset-reference.entity.js';
import { User } from '../src/database/entities/user.entity.js';
import { AddProjectIdToDatasets1789020000000 } from '../src/database/migrations/1789020000000-AddProjectIdToDatasets.js';

describe('Dataset project scope (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const tag = randomBytes(6).toString('hex');
  const rawKey = () => `sg_${randomBytes(32).toString('hex')}`;
  const hash = (key: string) => createHash('sha256').update(key).digest('hex');

  let keyA: string;
  let keyB: string;
  let userA: User;
  let userB: User;
  // Project 1 has two experiments; project 2 has one. All belong to user A.
  let project1: Project;
  let project2: Project;
  let exp1a: Experiment;
  let exp1b: Experiment;
  let exp2: Experiment;
  // User B's own project, to prove other users' records stay invisible.
  let expB: Experiment;

  const post = (key: string, path: string, body: Record<string, unknown>) =>
    request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${key}`).send(body);
  const get = (key: string, path: string) =>
    request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${key}`);

  async function makeGeneration(experiment: Experiment) {
    const repository = dataSource.getRepository(Generation);
    return repository.save(
      repository.create({
        experimentId: experiment.id,
        name: `gen-${randomBytes(3).toString('hex')}`,
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

  /** A dataset with `versions` versions, owned by user A and not scoped to any project. */
  async function makeDataset(versions = 2, owner: User = userA) {
    const datasets = dataSource.getRepository(Dataset);
    const dataset = await datasets.save(
      datasets.create({
        userId: owner.id,
        name: `ds-${randomBytes(3).toString('hex')}`,
        description: null,
        metadata: {},
      }),
    );
    const versionRepository = dataSource.getRepository(DatasetVersion);
    const created: DatasetVersion[] = [];
    for (let i = 1; i <= versions; i++) {
      created.push(
        await versionRepository.save(
          versionRepository.create({
            datasetId: dataset.id,
            version: `v${i}`,
            uri: `s3://scope-${tag}/${dataset.id}/v${i}`,
            format: 'image',
            size: null,
            checksum: `sum-${dataset.id}-${i}`,
            metadata: {},
          }),
        ),
      );
    }
    return { dataset, versions: created };
  }

  const scopeOf = async (datasetId: string) =>
    (await dataSource.getRepository(Dataset).findOneByOrFail({ id: datasetId })).projectId;

  const refGeneration = (key: string, generation: Generation, version: DatasetVersion, role = 'output') =>
    post(key, `/generations/${generation.id}/datasets`, { datasetVersionId: version.id, role });
  const refRun = (key: string, run: TrainingRun, version: DatasetVersion, role = 'training') =>
    post(key, `/training-runs/${run.id}/datasets`, { datasetVersionId: version.id, role });
  const evaluate = (key: string, run: TrainingRun, version: DatasetVersion) =>
    post(key, `/training-runs/${run.id}/evaluations`, {
      datasetVersionId: version.id,
      metrics: { accuracy: 0.9 },
    });

  const refCount = async (datasetVersionId: string) =>
    (await dataSource.getRepository(GenerationDatasetReference).countBy({ datasetVersionId })) +
    (await dataSource.getRepository(TrainingRunDatasetReference).countBy({ datasetVersionId })) +
    (await dataSource.getRepository(EvaluationResult).countBy({ datasetVersionId }));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    dataSource = app.get(DataSource);

    const users = dataSource.getRepository(User);
    userA = await users.save(users.create({ email: `scope-a-${tag}@example.com` }));
    userB = await users.save(users.create({ email: `scope-b-${tag}@example.com` }));
    keyA = rawKey();
    keyB = rawKey();
    const keys = dataSource.getRepository(ApiKey);
    await keys.save([
      keys.create({ userId: userA.id, keyPrefix: keyA.slice(0, 16), keyHash: hash(keyA), revokedAt: null }),
      keys.create({ userId: userB.id, keyPrefix: keyB.slice(0, 16), keyHash: hash(keyB), revokedAt: null }),
    ]);

    const projects = dataSource.getRepository(Project);
    project1 = await projects.save(projects.create({ userId: userA.id, name: `Scope 1 ${tag}`, description: null }));
    project2 = await projects.save(projects.create({ userId: userA.id, name: `Scope 2 ${tag}`, description: null }));
    const projectB = await projects.save(projects.create({ userId: userB.id, name: `Scope B ${tag}`, description: null }));
    const experiments = dataSource.getRepository(Experiment);
    exp1a = await experiments.save(experiments.create({ projectId: project1.id, name: '1a', description: null }));
    exp1b = await experiments.save(experiments.create({ projectId: project1.id, name: '1b', description: null }));
    exp2 = await experiments.save(experiments.create({ projectId: project2.id, name: '2', description: null }));
    expB = await experiments.save(experiments.create({ projectId: projectB.id, name: 'B', description: null }));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('scoping on first reference', () => {
    it('scopes an unscoped dataset to the project of a generation that references it', async () => {
      const { dataset, versions } = await makeDataset();
      expect(await scopeOf(dataset.id)).toBeNull();

      await refGeneration(keyA, await makeGeneration(exp1a), versions[0]).expect(201);

      expect(await scopeOf(dataset.id)).toBe(project1.id);
    });

    it('scopes it from a training run reference', async () => {
      const { dataset, versions } = await makeDataset();

      await refRun(keyA, await makeRun(exp2), versions[0]).expect(201);

      expect(await scopeOf(dataset.id)).toBe(project2.id);
    });

    it('scopes it from an evaluation', async () => {
      const { dataset, versions } = await makeDataset();

      await evaluate(keyA, await makeRun(exp1a), versions[0]).expect(201);

      expect(await scopeOf(dataset.id)).toBe(project1.id);
    });

    it('returns the project on the dataset response, null when unscoped', async () => {
      const { dataset, versions } = await makeDataset();
      expect((await get(keyA, `/datasets/${dataset.id}`).expect(200)).body.projectId).toBeNull();

      await refGeneration(keyA, await makeGeneration(exp1a), versions[0]).expect(201);

      expect((await get(keyA, `/datasets/${dataset.id}`).expect(200)).body.projectId).toBe(project1.id);
    });
  });

  describe('reuse inside a project', () => {
    it('allows another experiment of the same project to use the dataset', async () => {
      const { versions } = await makeDataset();
      await refGeneration(keyA, await makeGeneration(exp1a), versions[0]).expect(201);

      await refGeneration(keyA, await makeGeneration(exp1b), versions[0]).expect(201);
      await refRun(keyA, await makeRun(exp1b), versions[0]).expect(201);
      await evaluate(keyA, await makeRun(exp1a), versions[0]).expect(201);
    });

    it('allows one generation to produce, and one run to consume, several versions', async () => {
      const { versions } = await makeDataset(3);
      const generation = await makeGeneration(exp1a);
      const run = await makeRun(exp1a);

      for (const version of versions) {
        await refGeneration(keyA, generation, version).expect(201);
        await refRun(keyA, run, version).expect(201);
      }

      expect(await dataSource.getRepository(GenerationDatasetReference).countBy({ generationId: generation.id })).toBe(3);
      expect(await dataSource.getRepository(TrainingRunDatasetReference).countBy({ trainingRunId: run.id })).toBe(3);
    });

    it('still reports a duplicate reference as the existing 409, not a cross-project error', async () => {
      const { versions } = await makeDataset();
      const generation = await makeGeneration(exp1a);
      await refGeneration(keyA, generation, versions[0]).expect(201);

      const duplicate = await refGeneration(keyA, generation, versions[0]).expect(409);

      expect(duplicate.body.code).toBeUndefined();
    });
  });

  describe('across projects', () => {
    it('rejects a generation in another project, and writes nothing', async () => {
      const { dataset, versions } = await makeDataset();
      await refGeneration(keyA, await makeGeneration(exp1a), versions[0]).expect(201);
      const before = await refCount(versions[0].id);

      const rejected = await refGeneration(keyA, await makeGeneration(exp2), versions[0]).expect(409);

      expect(rejected.body.code).toBe('cross_project_reference');
      expect(rejected.body.message).toMatch(/different project/);
      expect(rejected.body.datasetId).toBe(dataset.id);
      expect(await refCount(versions[0].id)).toBe(before);
      expect(await scopeOf(dataset.id)).toBe(project1.id);
    });

    it('rejects a training run in another project', async () => {
      const { versions } = await makeDataset();
      await refGeneration(keyA, await makeGeneration(exp1a), versions[0]).expect(201);

      const rejected = await refRun(keyA, await makeRun(exp2), versions[0]).expect(409);

      expect(rejected.body.code).toBe('cross_project_reference');
    });

    it('rejects an evaluation in another project, and creates none', async () => {
      const { versions } = await makeDataset();
      await refGeneration(keyA, await makeGeneration(exp1a), versions[0]).expect(201);
      const run = await makeRun(exp2);

      const rejected = await evaluate(keyA, run, versions[0]).expect(409);

      expect(rejected.body.code).toBe('cross_project_reference');
      expect(await dataSource.getRepository(EvaluationResult).countBy({ trainingRunId: run.id })).toBe(0);
    });

    it('applies to the whole dataset: another version of it is also that project\'s', async () => {
      const { versions } = await makeDataset(2);
      await refGeneration(keyA, await makeGeneration(exp1a), versions[0]).expect(201);

      // v2 has never been referenced, but its dataset belongs to project 1.
      const rejected = await refRun(keyA, await makeRun(exp2), versions[1]).expect(409);

      expect(rejected.body.code).toBe('cross_project_reference');
    });

    it('keeps the datasets of two projects apart', async () => {
      const first = await makeDataset();
      const second = await makeDataset();
      await refGeneration(keyA, await makeGeneration(exp1a), first.versions[0]).expect(201);
      await refGeneration(keyA, await makeGeneration(exp2), second.versions[0]).expect(201);

      expect(await scopeOf(first.dataset.id)).toBe(project1.id);
      expect(await scopeOf(second.dataset.id)).toBe(project2.id);
      await refRun(keyA, await makeRun(exp2), first.versions[0]).expect(409);
      await refRun(keyA, await makeRun(exp1b), second.versions[0]).expect(409);
    });
  });

  describe('datasets that existed before the rule', () => {
    const referenceFromGeneration = async (experiment: Experiment, version: DatasetVersion) => {
      const generation = await makeGeneration(experiment);
      // Written straight to the table, the way a reference made before this rule looks.
      await dataSource.getRepository(GenerationDatasetReference).save(
        dataSource.getRepository(GenerationDatasetReference).create({
          generationId: generation.id,
          datasetVersionId: version.id,
          role: 'output',
        }),
      );
    };

    it('is scoped by a new reference when everything already referencing it is in that project', async () => {
      const { dataset, versions } = await makeDataset();
      await referenceFromGeneration(exp1a, versions[0]);

      await refRun(keyA, await makeRun(exp1b), versions[0]).expect(201);

      expect(await scopeOf(dataset.id)).toBe(project1.id);
    });

    it('rejects a reference from another project when only one project already uses it', async () => {
      const { dataset, versions } = await makeDataset();
      await referenceFromGeneration(exp1a, versions[0]);

      const rejected = await refRun(keyA, await makeRun(exp2), versions[0]).expect(409);

      expect(rejected.body.code).toBe('cross_project_reference');
      // A failed request does not scope the dataset.
      expect(await scopeOf(dataset.id)).toBeNull();
    });

    it('stays unscoped and accepts references when it is already used by two projects', async () => {
      const { dataset, versions } = await makeDataset();
      await referenceFromGeneration(exp1a, versions[0]);
      await referenceFromGeneration(exp2, versions[0]);

      await refRun(keyA, await makeRun(exp1a), versions[0]).expect(201);
      await refRun(keyA, await makeRun(exp2), versions[1]).expect(201);

      expect(await scopeOf(dataset.id)).toBeNull();
    });

    it('never changes a reference that already exists', async () => {
      const { versions } = await makeDataset();
      await referenceFromGeneration(exp1a, versions[0]);
      await referenceFromGeneration(exp2, versions[0]);
      const before = await dataSource.getRepository(GenerationDatasetReference).find({
        where: { datasetVersionId: versions[0].id },
        order: { generationId: 'ASC' },
      });

      await refRun(keyA, await makeRun(exp1a), versions[0]).expect(201);

      const after = await dataSource.getRepository(GenerationDatasetReference).find({
        where: { datasetVersionId: versions[0].id },
        order: { generationId: 'ASC' },
      });
      expect(after).toEqual(before);
    });
  });

  describe('simultaneous first references', () => {
    it('lets exactly one project claim an unscoped dataset', async () => {
      const { dataset, versions } = await makeDataset();
      const [g1, g2] = [await makeGeneration(exp1a), await makeGeneration(exp2)];

      const results = await Promise.all([
        refGeneration(keyA, g1, versions[0]),
        refGeneration(keyA, g2, versions[1]),
      ]);

      const statuses = results.map((r) => r.status).sort();
      expect(statuses).toEqual([201, 409]);
      const winner = results.find((r) => r.status === 201) === results[0] ? project1.id : project2.id;
      expect(await scopeOf(dataset.id)).toBe(winner);
      expect(results.find((r) => r.status === 409)?.body.code).toBe('cross_project_reference');
    });
  });

  describe('authorization is unchanged', () => {
    it("cannot reference another user's dataset, and does not scope it", async () => {
      const { dataset, versions } = await makeDataset(1, userB);

      await refGeneration(keyA, await makeGeneration(exp1a), versions[0]).expect(404);

      expect(await scopeOf(dataset.id)).toBeNull();
    });

    it("cannot attach to another user's generation or run", async () => {
      const { dataset, versions } = await makeDataset();
      const foreignGeneration = await makeGeneration(expB);
      const foreignRun = await makeRun(expB);

      await refGeneration(keyA, foreignGeneration, versions[0]).expect(404);
      await refRun(keyA, foreignRun, versions[0]).expect(404);
      await evaluate(keyA, foreignRun, versions[0]).expect(404);

      expect(await scopeOf(dataset.id)).toBeNull();
    });
  });

  describe('migration', () => {
    it('can be reverted and applied again, leaving the schema as it was', async () => {
      const migration = new AddProjectIdToDatasets1789020000000();
      const queryRunner = dataSource.createQueryRunner();
      const column = () =>
        queryRunner.query(
          `SELECT data_type, is_nullable, column_default FROM information_schema.columns
           WHERE table_name = 'datasets' AND column_name = 'project_id'`,
        );

      // Postgres DDL is transactional, so this leaves the database untouched.
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        expect(await column()).toHaveLength(1);

        await migration.down(queryRunner);
        expect(await column()).toHaveLength(0);

        await migration.up(queryRunner);
        expect(await column()).toEqual([
          { data_type: 'uuid', is_nullable: 'YES', column_default: null },
        ]);
        const fk = await queryRunner.query(
          `SELECT confrelid::regclass::text AS target FROM pg_constraint WHERE conname = 'FK_datasets_project_id'`,
        );
        expect(fk).toEqual([{ target: 'projects' }]);
        const index = await queryRunner.query(
          `SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_datasets_project_id'`,
        );
        expect(index).toHaveLength(1);
      } finally {
        await queryRunner.rollbackTransaction();
        await queryRunner.release();
      }
    });

    it('leaves existing datasets unscoped', async () => {
      const { dataset } = await makeDataset();

      expect(await scopeOf(dataset.id)).toBeNull();
    });
  });
});
