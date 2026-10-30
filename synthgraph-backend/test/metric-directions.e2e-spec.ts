import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash, randomBytes } from 'node:crypto';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module.js';
import { ApiKey } from '../src/database/entities/api-key.entity.js';
import { Dataset } from '../src/database/entities/dataset.entity.js';
import { DatasetVersion } from '../src/database/entities/dataset-version.entity.js';
import { EvaluationResult } from '../src/database/entities/evaluation-result.entity.js';
import { ExperimentMetricDirection } from '../src/database/entities/experiment-metric-direction.entity.js';
import { Experiment } from '../src/database/entities/experiment.entity.js';
import { Project } from '../src/database/entities/project.entity.js';
import { TrainingRunMetric } from '../src/database/entities/training-run-metric.entity.js';
import {
  TrainingRun,
  TrainingRunStatus,
} from '../src/database/entities/training-run.entity.js';
import { User } from '../src/database/entities/user.entity.js';
import { CreateExperimentMetricDirections1789010000000 } from '../src/database/migrations/1789010000000-CreateExperimentMetricDirections.js';

describe('Declared metric direction (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let userA: User;
  let userB: User;
  let projectA: Project;
  let projectB: Project;
  let expA1: Experiment;
  let expA2: Experiment;
  let expB: Experiment;
  let runA1a: TrainingRun;
  let runA1b: TrainingRun;
  let runA2: TrainingRun;
  let datasetId: string;
  let datasetVersion: DatasetVersion;

  let apiKeyA: string;
  let apiKeyB: string;

  const rawKey = () => `sg_${randomBytes(32).toString('hex')}`;
  const hash = (key: string) => createHash('sha256').update(key).digest('hex');
  const as = (key: string) => ({
    get: (path: string) =>
      request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${key}`),
    post: (path: string) =>
      request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${key}`),
    put: (path: string) =>
      request(app.getHttpServer()).put(path).set('Authorization', `Bearer ${key}`),
  });
  const a = () => as(apiKeyA);
  const directionsPath = (experiment: Experiment) =>
    `/experiments/${experiment.id}/metric-directions`;

  async function clearDeclarations() {
    await dataSource
      .getRepository(ExperimentMetricDirection)
      .createQueryBuilder()
      .delete()
      .where('experiment_id IN (:...ids)', {
        ids: [expA1.id, expA2.id, expB.id],
      })
      .execute();
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
    const users = dataSource.getRepository(User);
    const apiKeys = dataSource.getRepository(ApiKey);
    const projects = dataSource.getRepository(Project);
    const experiments = dataSource.getRepository(Experiment);
    const trainingRuns = dataSource.getRepository(TrainingRun);
    const metrics = dataSource.getRepository(TrainingRunMetric);
    const evaluations = dataSource.getRepository(EvaluationResult);
    const datasets = dataSource.getRepository(Dataset);
    const datasetVersions = dataSource.getRepository(DatasetVersion);

    const tag = randomBytes(8).toString('hex');
    userA = await users.save(users.create({ email: `directions-a-${tag}@example.com` }));
    userB = await users.save(users.create({ email: `directions-b-${tag}@example.com` }));
    apiKeyA = rawKey();
    apiKeyB = rawKey();
    await apiKeys.save([
      apiKeys.create({ userId: userA.id, keyPrefix: apiKeyA.slice(0, 16), keyHash: hash(apiKeyA), revokedAt: null }),
      apiKeys.create({ userId: userB.id, keyPrefix: apiKeyB.slice(0, 16), keyHash: hash(apiKeyB), revokedAt: null }),
    ]);

    projectA = await projects.save(projects.create({ userId: userA.id, name: 'Directions A', description: null }));
    projectB = await projects.save(projects.create({ userId: userB.id, name: 'Directions B', description: null }));
    expA1 = await experiments.save(experiments.create({ projectId: projectA.id, name: 'A1', description: null }));
    expA2 = await experiments.save(experiments.create({ projectId: projectA.id, name: 'A2', description: null }));
    expB = await experiments.save(experiments.create({ projectId: projectB.id, name: 'B', description: null }));

    const dataset = await datasets.save(
      datasets.create({ userId: userA.id, name: 'Directions Dataset', description: null, metadata: {} }),
    );
    datasetId = dataset.id;
    datasetVersion = await datasetVersions.save(
      datasetVersions.create({
        datasetId: dataset.id,
        version: 'v1',
        uri: 's3://bucket/directions-v1',
        format: null,
        size: null,
        checksum: null,
        metadata: {},
      }),
    );

    const makeRun = (experiment: Experiment, name: string, minute: number) => {
      const at = new Date(Date.UTC(2026, 0, 1, 0, minute));
      return trainingRuns.save(
        trainingRuns.create({
          experimentId: experiment.id,
          name,
          description: null,
          trainer: { name: 'ppo', version: '1.0.0', type: 'rl' },
          parameters: { seed: minute },
          metrics: {},
          metadata: {},
          status: TrainingRunStatus.Completed,
          startedAt: at,
          completedAt: new Date(at.getTime() + 60_000),
          createdAt: at,
          captureStatus: null,
        }),
      );
    };
    runA1a = await makeRun(expA1, 'a1-a', 1);
    runA1b = await makeRun(expA1, 'a1-b', 2);
    runA2 = await makeRun(expA2, 'a2', 3);

    // A falling loss, a rising reward and a rising spread, on the last 3 steps.
    for (const run of [runA1a, runA1b, runA2]) {
      await metrics.save(
        Array.from({ length: 5 }, (_, step) =>
          metrics.create({
            trainingRunId: run.id,
            step,
            metrics: { loss: 10 - step * 2, reward: step * 3, reward_std: step + 1, cpu: 50 },
          }),
        ),
      );
    }

    const evaluate = (run: TrainingRun, name: string, values: Record<string, number>) =>
      evaluations.save(
        evaluations.create({
          trainingRunId: run.id,
          datasetVersionId: datasetVersion.id,
          name,
          metrics: values,
          metadata: {},
        }),
      );
    await evaluate(runA1a, 'e-a1-a', { collision_rate: 0.02, reward: 0.5, episode_length: 100 });
    await evaluate(runA1b, 'e-a1-b', { collision_rate: 0.08, reward: 0.7, episode_length: 120 });
    await evaluate(runA2, 'e-a2', { collision_rate: 0.05, reward: 0.6, episode_length: 90 });
  });

  afterAll(async () => {
    await clearDeclarations();
    const runIds = [runA1a.id, runA1b.id, runA2.id];
    await dataSource.getRepository(EvaluationResult).delete({ datasetVersionId: datasetVersion.id });
    await dataSource
      .getRepository(TrainingRunMetric)
      .createQueryBuilder()
      .delete()
      .where('training_run_id IN (:...runIds)', { runIds })
      .execute();
    await dataSource.getRepository(TrainingRun).delete(runIds);
    await dataSource.getRepository(Experiment).delete([expA1.id, expA2.id, expB.id]);
    await dataSource.getRepository(DatasetVersion).delete(datasetVersion.id);
    await dataSource.getRepository(Dataset).delete(datasetId);
    await dataSource.getRepository(Project).delete([projectA.id, projectB.id]);
    await dataSource.getRepository(ApiKey).delete({ userId: userA.id });
    await dataSource.getRepository(ApiKey).delete({ userId: userB.id });
    await dataSource.getRepository(User).delete([userA.id, userB.id]);
    await app.close();
  });

  afterEach(async () => {
    await clearDeclarations();
  });

  describe('authorization', () => {
    it('requires authentication', async () => {
      await request(app.getHttpServer()).get(directionsPath(expA1)).expect(401);
      await request(app.getHttpServer()).post(directionsPath(expA1)).send({ directions: { loss: 'minimize' } }).expect(401);
      await request(app.getHttpServer()).put(directionsPath(expA1)).send({}).expect(401);
    });

    it('is not found for an experiment that belongs to someone else, on every route', async () => {
      await as(apiKeyB).get(directionsPath(expA1)).expect(404);
      await as(apiKeyB).post(directionsPath(expA1)).send({ directions: { loss: 'minimize' } }).expect(404);
      await as(apiKeyB)
        .put(directionsPath(expA1))
        .send({ metricKey: 'loss', direction: 'maximize', correctionNote: 'x' })
        .expect(404);
      // Nothing was written by the rejected requests.
      expect((await a().get(directionsPath(expA1)).expect(200)).body.directions).toEqual({});
    });

    it('rejects a malformed experiment id', async () => {
      await a().get('/experiments/not-a-uuid/metric-directions').expect(400);
    });
  });

  describe('declaring', () => {
    it('stores declared directions and reads them back; undeclared metrics are absent', async () => {
      const response = await a()
        .post(directionsPath(expA1))
        .send({ directions: { loss: 'minimize', 'eval/episode_reward': 'maximize', episode_length: 'neutral' } })
        .expect(200);

      expect(response.body).toEqual({
        experimentId: expA1.id,
        directions: { loss: 'minimize', 'eval/episode_reward': 'maximize', episode_length: 'neutral' },
      });
      expect((await a().get(directionsPath(expA1)).expect(200)).body.directions).toEqual(response.body.directions);
      expect(response.body.directions).not.toHaveProperty('cpu');
    });

    it('is idempotent: declaring the same direction again changes nothing', async () => {
      await a().post(directionsPath(expA1)).send({ directions: { loss: 'minimize' } }).expect(200);
      const again = await a()
        .post(directionsPath(expA1))
        .send({ directions: { loss: 'minimize', reward: 'maximize' } })
        .expect(200);

      expect(again.body.directions).toEqual({ loss: 'minimize', reward: 'maximize' });
    });

    it('rejects a conflicting declaration with a clear 409 and keeps the original', async () => {
      await a().post(directionsPath(expA1)).send({ directions: { loss: 'minimize' } }).expect(200);

      const conflict = await a()
        .post(directionsPath(expA1))
        .send({ directions: { loss: 'maximize' } })
        .expect(409);

      expect(conflict.body.code).toBe('metric_direction_conflict');
      expect(conflict.body.conflicts).toEqual([
        { metricKey: 'loss', declared: 'minimize', requested: 'maximize' },
      ]);
      expect(conflict.body.message).toMatch(/"loss"/);
      expect(conflict.body.message).toMatch(/Nothing was changed/);
      expect((await a().get(directionsPath(expA1)).expect(200)).body.directions).toEqual({ loss: 'minimize' });
    });

    it('is all or nothing: a request with a conflict stores none of its new metrics', async () => {
      await a().post(directionsPath(expA1)).send({ directions: { loss: 'minimize' } }).expect(200);

      await a()
        .post(directionsPath(expA1))
        .send({ directions: { brand_new: 'maximize', loss: 'maximize', another_new: 'minimize' } })
        .expect(409);

      expect((await a().get(directionsPath(expA1)).expect(200)).body.directions).toEqual({ loss: 'minimize' });
    });

    it('lets exactly one of two simultaneous conflicting declarations win', async () => {
      const results = await Promise.all([
        a().post(directionsPath(expA1)).send({ directions: { race_metric: 'maximize' } }),
        a().post(directionsPath(expA1)).send({ directions: { race_metric: 'minimize' } }),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      const stored = (await a().get(directionsPath(expA1)).expect(200)).body.directions.race_metric;
      const winner = results.find((r) => r.status === 200)!.body.directions.race_metric;
      expect(stored).toBe(winner);
    });

    it('keeps declarations independent per experiment, even within one project', async () => {
      await a().post(directionsPath(expA1)).send({ directions: { reward: 'maximize' } }).expect(200);
      await a().post(directionsPath(expA2)).send({ directions: { reward: 'minimize' } }).expect(200);

      expect((await a().get(directionsPath(expA1)).expect(200)).body.directions).toEqual({ reward: 'maximize' });
      expect((await a().get(directionsPath(expA2)).expect(200)).body.directions).toEqual({ reward: 'minimize' });
    });

    it.each([
      ['an unknown direction', { directions: { loss: 'lower' } }],
      ['no directions', { directions: {} }],
      ['a non-object', { directions: 'maximize' }],
      ['an array', { directions: ['maximize'] }],
      ['a direction of the wrong type', { directions: { loss: 1 } }],
    ])('rejects %s with a 400', async (_label, body) => {
      await a().post(directionsPath(expA1)).send(body).expect(400);
    });

    it('rejects too many declarations and stores nothing', async () => {
      const tooMany = Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`m${i}`, 'neutral']));
      await a().post(directionsPath(expA1)).send({ directions: tooMany }).expect(400);
      expect((await a().get(directionsPath(expA1)).expect(200)).body.directions).toEqual({});
    });

    it('stores a key with wildcard characters as an exact key and never as a pattern', async () => {
      await a().post(directionsPath(expA1)).send({ directions: { 'eval/*': 'maximize' } }).expect(200);

      // "eval/loss" is not covered by "eval/*": it is simply undeclared.
      const body = (await a().get(directionsPath(expA1)).expect(200)).body;
      expect(body.directions).toEqual({ 'eval/*': 'maximize' });
      expect(body.directions).not.toHaveProperty('eval/loss');
    });
  });

  describe('explicit correction', () => {
    it('requires a note', async () => {
      await a().post(directionsPath(expA1)).send({ directions: { loss: 'minimize' } }).expect(200);
      await a().put(directionsPath(expA1)).send({ metricKey: 'loss', direction: 'maximize' }).expect(400);
      await a()
        .put(directionsPath(expA1))
        .send({ metricKey: 'loss', direction: 'maximize', correctionNote: '' })
        .expect(400);
    });

    it('has nothing to correct for a metric that was never declared', async () => {
      const response = await a()
        .put(directionsPath(expA1))
        .send({ metricKey: 'never_declared', direction: 'maximize', correctionNote: 'x' })
        .expect(404);
      expect(response.body.message).toMatch(/Declare it first/);
    });

    it('changes a declared direction, and records when and why', async () => {
      await a().post(directionsPath(expA1)).send({ directions: { 'eval/reward': 'minimize' } }).expect(200);

      const response = await a()
        .put(directionsPath(expA1))
        .send({ metricKey: 'eval/reward', direction: 'maximize', correctionNote: 'declared the wrong way round' })
        .expect(200);

      expect(response.body.directions).toEqual({ 'eval/reward': 'maximize' });
      const row = await dataSource
        .getRepository(ExperimentMetricDirection)
        .findOneByOrFail({ experimentId: expA1.id, metricKey: 'eval/reward' });
      expect(row.correctionNote).toBe('declared the wrong way round');
      expect(row.correctedAt).toBeInstanceOf(Date);
    });

    it('leaves an unchanged direction untouched and unrecorded', async () => {
      await a().post(directionsPath(expA1)).send({ directions: { loss: 'minimize' } }).expect(200);
      await a()
        .put(directionsPath(expA1))
        .send({ metricKey: 'loss', direction: 'minimize', correctionNote: 'no change' })
        .expect(200);

      const row = await dataSource
        .getRepository(ExperimentMetricDirection)
        .findOneByOrFail({ experimentId: expA1.id, metricKey: 'loss' });
      expect(row.correctedAt).toBeNull();
      expect(row.correctionNote).toBeNull();
    });

    it('rejects an invalid direction', async () => {
      await a().post(directionsPath(expA1)).send({ directions: { loss: 'minimize' } }).expect(200);
      await a()
        .put(directionsPath(expA1))
        .send({ metricKey: 'loss', direction: 'higher', correctionNote: 'x' })
        .expect(400);
    });
  });

  describe('health', () => {
    const health = async (run: TrainingRun) =>
      (await a().get(`/reports/training-run-health?trainingRunId=${run.id}&windowSize=3`).expect(200)).body;
    const metric = (body: { metrics: Array<{ metricKey: string }> }, key: string) =>
      body.metrics.find((m) => m.metricKey === key) as Record<string, unknown>;

    it('has no direction and no verdict for anything undeclared', async () => {
      const body = await health(runA1a);

      for (const key of ['loss', 'reward', 'reward_std']) {
        expect(metric(body, key)).toMatchObject({ direction: null, verdict: 'neutral' });
      }
      expect(metric(body, 'loss').trend).toBe('decreasing');
    });

    it('judges each trend from the declared direction', async () => {
      await a()
        .post(directionsPath(expA1))
        .send({ directions: { loss: 'minimize', reward: 'minimize', reward_std: 'neutral', cpu: 'maximize' } })
        .expect(200);
      const body = await health(runA1a);

      expect(metric(body, 'loss')).toMatchObject({ trend: 'decreasing', direction: 'minimize', verdict: 'improving' });
      expect(metric(body, 'reward')).toMatchObject({ trend: 'increasing', direction: 'minimize', verdict: 'worsening' });
      // A spread declared neutral gets no verdict, and a flat metric none either.
      expect(metric(body, 'reward_std')).toMatchObject({ trend: 'increasing', direction: 'neutral', verdict: 'neutral' });
      expect(metric(body, 'cpu')).toMatchObject({ trend: 'flat', direction: 'maximize', verdict: 'neutral' });
    });

    it('uses the experiment of the run it is asked about', async () => {
      await a().post(directionsPath(expA1)).send({ directions: { loss: 'minimize' } }).expect(200);

      expect(metric(await health(runA1a), 'loss')).toMatchObject({ direction: 'minimize' });
      // runA2 is in a different experiment that declared nothing.
      expect(metric(await health(runA2), 'loss')).toMatchObject({ direction: null, verdict: 'neutral' });
    });

    it('gives the whole-experiment and workspace routes the same verdicts as the per-run route', async () => {
      await a().post(directionsPath(expA1)).send({ directions: { loss: 'minimize', reward: 'maximize' } }).expect(200);

      const single = await health(runA1a);
      const experimentWide = (
        await a().get(`/reports/experiment-training-run-health?experimentId=${expA1.id}&windowSize=3`).expect(200)
      ).body.runs.find((r: { trainingRunId: string }) => r.trainingRunId === runA1a.id);
      const workspace = (await a().get(`/experiments/${expA1.id}/workspace`).expect(200)).body;

      expect(experimentWide).toEqual(single);
      expect(workspace.metricDirections).toEqual({ loss: 'minimize', reward: 'maximize' });
      const inWorkspace = workspace.trainingRuns.find((r: { run: { id: string } }) => r.run.id === runA1a.id).health;
      expect(metric(inWorkspace, 'loss')).toMatchObject({ direction: 'minimize', verdict: 'improving' });
    });
  });

  describe('reports across experiments', () => {
    it('states a direction only where every experiment reporting the metric agrees', async () => {
      await a().post(directionsPath(expA1)).send({ directions: { collision_rate: 'minimize', reward: 'maximize' } }).expect(200);
      await a().post(directionsPath(expA2)).send({ directions: { collision_rate: 'minimize', reward: 'minimize' } }).expect(200);

      const bestRuns = (await a().get(`/reports/best-runs?projectId=${projectA.id}`).expect(200)).body;
      const leaderboard = (await a().get(`/reports/efficiency-leaderboard?projectId=${projectA.id}`).expect(200)).body;

      for (const report of [bestRuns, leaderboard]) {
        expect(report.metricDirections.collision_rate).toEqual({ direction: 'minimize', mixed: false });
        expect(report.metricDirections.reward).toEqual({ direction: null, mixed: true });
        // Nobody declared it: unknown, so absent.
        expect(report.metricDirections).not.toHaveProperty('episode_length');
      }
    });

    it('is mixed when only some experiments declared the metric', async () => {
      await a().post(directionsPath(expA1)).send({ directions: { collision_rate: 'minimize' } }).expect(200);

      const bestRuns = (await a().get(`/reports/best-runs?projectId=${projectA.id}`).expect(200)).body;
      expect(bestRuns.metricDirections.collision_rate).toEqual({ direction: null, mixed: true });
    });

    it('still reports both extremes and picks no winner', async () => {
      await a().post(directionsPath(expA1)).send({ directions: { collision_rate: 'minimize' } }).expect(200);

      const bestRuns = (await a().get(`/reports/best-runs?projectId=${projectA.id}`).expect(200)).body;
      const record = bestRuns.records.find((r: { metricKey: string }) => r.metricKey === 'collision_rate');
      expect(record).toMatchObject({ maxValue: 0.08, minValue: 0.02 });
    });

    it('reports an experiment\'s own declarations on the parameter-correlation report', async () => {
      await a().post(directionsPath(expA1)).send({ directions: { reward: 'maximize' } }).expect(200);

      const report = (await a().get(`/reports/parameter-correlation?experimentId=${expA1.id}`).expect(200)).body;
      expect(report.metricDirections).toEqual({ reward: 'maximize' });
      const other = (await a().get(`/reports/parameter-correlation?experimentId=${expA2.id}`).expect(200)).body;
      expect(other.metricDirections).toEqual({});
    });
  });

  describe('migration', () => {
    it('can be reverted and applied again, leaving the schema as it was', async () => {
      const migration = new CreateExperimentMetricDirections1789010000000();
      const queryRunner = dataSource.createQueryRunner();
      const tableExists = async () =>
        (await queryRunner.query(`SELECT to_regclass('public.experiment_metric_directions') AS t`))[0].t !== null;
      const enumExists = async () =>
        (await queryRunner.query(`SELECT 1 FROM pg_type WHERE typname = 'metric_direction_enum'`)).length > 0;

      // Postgres DDL is transactional, so this leaves the database untouched.
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        expect(await tableExists()).toBe(true);
        await migration.down(queryRunner);
        expect(await tableExists()).toBe(false);
        expect(await enumExists()).toBe(false);

        await migration.up(queryRunner);
        expect(await tableExists()).toBe(true);
        expect(await enumExists()).toBe(true);

        const columns = await queryRunner.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_name = 'experiment_metric_directions' ORDER BY ordinal_position`,
        );
        expect(columns.map((c: { column_name: string }) => c.column_name)).toEqual([
          'experiment_id',
          'metric_key',
          'direction',
          'created_at',
          'corrected_at',
          'correction_note',
        ]);
        const primaryKey = await queryRunner.query(
          `SELECT a.attname FROM pg_index i
           JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
           WHERE i.indrelid = 'experiment_metric_directions'::regclass AND i.indisprimary
           ORDER BY a.attname`,
        );
        expect(primaryKey.map((p: { attname: string }) => p.attname)).toEqual(['experiment_id', 'metric_key']);
      } finally {
        await queryRunner.rollbackTransaction();
        await queryRunner.release();
      }
    });

    it('adds no rows: existing experiments start with nothing declared', async () => {
      const rows = await dataSource
        .getRepository(ExperimentMetricDirection)
        .count({ where: { experimentId: expA1.id } });
      expect(rows).toBe(0);
    });
  });
});
