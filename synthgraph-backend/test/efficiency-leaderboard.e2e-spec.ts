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
import {
  TrainingRun,
  TrainingRunStatus,
} from '../src/database/entities/training-run.entity.js';
import { User } from '../src/database/entities/user.entity.js';

type Row = {
  trainingRunId: string;
  value: number;
  perHour: number | null;
  pareto: boolean;
  dominatedBy: string | null;
};
type SetAnalysis = {
  datasetVersionId: string;
  runCount: number;
  rankings: Partial<Record<'maximize' | 'minimize', { rows: Row[] }>>;
};

describe('Efficiency leaderboard analysis (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const tag = randomBytes(6).toString('hex');
  const rawKey = () => `sg_${randomBytes(32).toString('hex')}`;
  const hash = (key: string) => createHash('sha256').update(key).digest('hex');

  let keyA: string;
  let keyB: string;
  let project: Project;
  let otherProject: Project;
  let experiment: Experiment;
  let otherExperiment: Experiment;
  let clearSet: DatasetVersion;
  let rainSet: DatasetVersion;
  let userBSet: DatasetVersion;
  const run: Record<string, TrainingRun> = {};

  const get = (key: string, path: string) =>
    request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${key}`);
  const leaderboard = async (query = `?projectId=${project.id}`) =>
    (await get(keyA, `/reports/efficiency-leaderboard${query}`).expect(200))
      .body;
  const setOf = (body: any, metric: string, set: DatasetVersion): SetAnalysis =>
    body.analysis[metric].sets.find(
      (s: SetAnalysis) => s.datasetVersionId === set.id,
    );
  const ids = (rows: Row[] | undefined) => rows?.map((r) => r.trainingRunId);

  async function makeRun(
    target: Experiment,
    name: string,
    minutes: number,
    status = TrainingRunStatus.Completed,
  ) {
    const repository = dataSource.getRepository(TrainingRun);
    const startedAt = new Date('2026-01-01T00:00:00Z');
    run[name] = await repository.save(
      repository.create({
        experimentId: target.id,
        name,
        description: null,
        trainer: { name: 'ultralytics', version: '8', type: 'detector' },
        parameters: {},
        metrics: {},
        metadata: {},
        status,
        startedAt,
        completedAt: new Date(startedAt.getTime() + minutes * 60_000),
        captureStatus: null,
      }),
    );
  }

  async function evaluate(
    name: string,
    set: DatasetVersion,
    metrics: Record<string, unknown>,
    checkpointStep: number | null = null,
  ) {
    const repository = dataSource.getRepository(EvaluationResult);
    await repository.save(
      repository.create({
        trainingRunId: run[name].id,
        datasetVersionId: set.id,
        name: `eval-${name}`,
        checkpointStep,
        metrics,
        metadata: {},
      }),
    );
  }

  async function makeSet(userId: string, name: string) {
    const datasets = dataSource.getRepository(Dataset);
    const versions = dataSource.getRepository(DatasetVersion);
    const dataset = await datasets.save(
      datasets.create({ userId, name, description: null, metadata: {} }),
    );
    return versions.save(
      versions.create({
        datasetId: dataset.id,
        version: 'v1',
        uri: `s3://bucket/${name}`,
        format: null,
        size: null,
        checksum: null,
        metadata: {},
      }),
    );
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    dataSource = app.get(DataSource);

    const users = dataSource.getRepository(User);
    const userA = await users.save(
      users.create({ email: `eff-a-${tag}@example.com` }),
    );
    const userB = await users.save(
      users.create({ email: `eff-b-${tag}@example.com` }),
    );
    keyA = rawKey();
    keyB = rawKey();
    const keys = dataSource.getRepository(ApiKey);
    await keys.save([
      keys.create({
        userId: userA.id,
        keyPrefix: keyA.slice(0, 16),
        keyHash: hash(keyA),
        revokedAt: null,
      }),
      keys.create({
        userId: userB.id,
        keyPrefix: keyB.slice(0, 16),
        keyHash: hash(keyB),
        revokedAt: null,
      }),
    ]);

    const projects = dataSource.getRepository(Project);
    project = await projects.save(
      projects.create({
        userId: userA.id,
        name: `Eff ${tag}`,
        description: null,
      }),
    );
    otherProject = await projects.save(
      projects.create({
        userId: userB.id,
        name: `Eff B ${tag}`,
        description: null,
      }),
    );
    const experiments = dataSource.getRepository(Experiment);
    experiment = await experiments.save(
      experiments.create({
        projectId: project.id,
        name: 'rain',
        description: null,
      }),
    );
    otherExperiment = await experiments.save(
      experiments.create({
        projectId: otherProject.id,
        name: 'other',
        description: null,
      }),
    );

    clearSet = await makeSet(userA.id, `test-clear-${tag}`);
    rainSet = await makeSet(userA.id, `test-heavy-rain-${tag}`);
    userBSet = await makeSet(userB.id, `b-set-${tag}`);

    // `broad` is scored on both sets; `quick` and `slow` only on the rain set.
    await makeRun(experiment, 'broad', 30);
    await makeRun(experiment, 'quick', 20);
    await makeRun(experiment, 'slow', 90);
    await makeRun(experiment, 'unscored', 10);
    await makeRun(experiment, 'still-running', 5, TrainingRunStatus.Running);

    await evaluate('broad', clearSet, { mAP50: 0.81, loss: 0.3 }, 50);
    await evaluate('broad', rainSet, { mAP50: 0.52, loss: 0.9 }, 50);
    // A second checkpoint on the SAME set: the better one counts, not a blend.
    await evaluate('broad', rainSet, { mAP50: 0.58, loss: 0.7 }, 100);
    await evaluate('quick', rainSet, { mAP50: 0.6, loss: 0.5 });
    await evaluate('slow', rainSet, { mAP50: 0.55, loss: 0.4 });
    await evaluate('unscored', clearSet, { other: 'text' });
    await evaluate('still-running', rainSet, { mAP50: 0.99 });

    await makeRun(otherExperiment, 'b-run', 10);
    await evaluate('b-run', userBSet, { mAP50: 0.99 });
  });

  afterAll(async () => {
    await app.close();
  });

  it('declares nothing and ranks both directions, with the reason', async () => {
    const body = await leaderboard();
    expect(body.analysis.mAP50.direction).toBeNull();
    expect(body.analysis.mAP50.directionStatus).toBe('undeclared');
    const rain = setOf(body, 'mAP50', rainSet);
    expect(Object.keys(rain.rankings).sort()).toEqual(['maximize', 'minimize']);
  });

  it('never merges evaluation sets: the same run has a separate score on each', async () => {
    const body = await leaderboard();
    const clear = setOf(body, 'mAP50', clearSet);
    const rain = setOf(body, 'mAP50', rainSet);

    // The old merged value for `broad` was 0.81 whichever set you looked at.
    expect(clear.rankings.maximize?.rows).toEqual([
      expect.objectContaining({ trainingRunId: run.broad.id, value: 0.81 }),
    ]);
    const broadOnRain = rain.rankings.maximize?.rows.find(
      (r) => r.trainingRunId === run.broad.id,
    );
    expect(broadOnRain?.value).toBe(0.58);
  });

  it("takes a run's best checkpoint within one set", async () => {
    const body = await leaderboard();
    const rain = setOf(body, 'mAP50', rainSet);
    expect(
      rain.rankings.minimize?.rows.find((r) => r.trainingRunId === run.broad.id)
        ?.value,
    ).toBe(0.52);
    expect(
      rain.rankings.maximize?.rows.find((r) => r.trainingRunId === run.broad.id)
        ?.value,
    ).toBe(0.58);
  });

  it('marks the frontier and who dominates, per set', async () => {
    const body = await leaderboard();
    const rain = setOf(body, 'mAP50', rainSet);
    const rows = rain.rankings.maximize!.rows;
    // quick (20 min, 0.6) beats broad (30 min, 0.58) and slow (90 min, 0.55) on both axes.
    expect(ids(rows)![0]).toBe(run.quick.id);
    const byId = Object.fromEntries(rows.map((r) => [r.trainingRunId, r]));
    expect(byId[run.quick.id].pareto).toBe(true);
    expect(byId[run.broad.id]).toMatchObject({
      pareto: false,
      dominatedBy: run.quick.id,
    });
    expect(byId[run.slow.id]).toMatchObject({
      pareto: false,
      dominatedBy: run.quick.id,
    });
    expect(byId[run.quick.id].perHour).toBeCloseTo(0.6 / (20 / 60), 6);
    // On the clear set broad is alone, so nothing from the rain set beats it.
    expect(
      setOf(body, 'mAP50', clearSet).rankings.maximize?.rows[0].pareto,
    ).toBe(true);
  });

  it('counts the runs scored on each set and lists the busiest set first', async () => {
    const body = await leaderboard();
    expect(
      body.analysis.mAP50.sets.map((s: SetAnalysis) => s.runCount),
    ).toEqual([3, 1]);
    expect(body.analysis.mAP50.sets[0].datasetVersionId).toBe(rainSet.id);
  });

  it('names the evaluation sets', async () => {
    const body = await leaderboard();
    expect(body.evaluationSets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          datasetVersionId: clearSet.id,
          datasetName: `test-clear-${tag}`,
          version: 'v1',
        }),
        expect.objectContaining({
          datasetVersionId: rainSet.id,
          datasetName: `test-heavy-rain-${tag}`,
        }),
      ]),
    );
    expect(
      body.evaluationSets.map(
        (s: { datasetVersionId: string }) => s.datasetVersionId,
      ),
    ).not.toContain(userBSet.id);
  });

  it('adds the evaluation set and checkpoint step to each run evaluation, keeping the old fields', async () => {
    const body = await leaderboard();
    const broad = body.runs.find(
      (r: { trainingRunId: string }) => r.trainingRunId === run.broad.id,
    );
    expect(broad.durationSeconds).toBe(1800);
    expect(broad.evaluations).toHaveLength(3);
    expect(broad.evaluations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'eval-broad',
          metrics: { mAP50: 0.81, loss: 0.3 },
          datasetVersionId: clearSet.id,
          checkpointStep: 50,
        }),
      ]),
    );
  });

  it('ranks only completed runs and only numeric values', async () => {
    const body = await leaderboard();
    const runIds = body.runs.map(
      (r: { trainingRunId: string }) => r.trainingRunId,
    );
    expect(runIds).not.toContain(run['still-running'].id);
    const rain = setOf(body, 'mAP50', rainSet);
    expect(ids(rain.rankings.maximize?.rows)).not.toContain(
      run['still-running'].id,
    );
    // A text value is not a metric to rank.
    expect(body.analysis).not.toHaveProperty('other');
    // A run with no numeric value for the metric is left out of its ranking.
    expect(
      ids(setOf(body, 'mAP50', clearSet).rankings.maximize?.rows),
    ).not.toContain(run.unscored.id);
  });

  describe('a declared direction', () => {
    const declare = (target: Experiment, directions: Record<string, string>) =>
      request(app.getHttpServer())
        .post(`/experiments/${target.id}/metric-directions`)
        .set('Authorization', `Bearer ${keyA}`)
        .send({ directions })
        .expect(200);

    it('ranks one way only', async () => {
      await declare(experiment, {
        mAP50: 'maximize',
        loss: 'minimize',
        calibration: 'neutral',
      });

      const body = await leaderboard();
      expect(body.analysis.mAP50).toMatchObject({
        direction: 'maximize',
        directionStatus: 'declared',
      });
      expect(Object.keys(setOf(body, 'mAP50', rainSet).rankings)).toEqual([
        'maximize',
      ]);
      expect(body.analysis.loss).toMatchObject({
        direction: 'minimize',
        directionStatus: 'declared',
      });
      expect(Object.keys(setOf(body, 'loss', rainSet).rankings)).toEqual([
        'minimize',
      ]);
    });

    it('uses the declared direction to decide the frontier', async () => {
      const body = await leaderboard();
      const rows = setOf(body, 'loss', rainSet).rankings.minimize!.rows;
      // quick (20 min, 0.5) and slow (90 min, 0.4) trade time for quality: both on the frontier.
      // broad (30 min, 0.7) is slower and worse than quick.
      expect(ids(rows)).toEqual([run.slow.id, run.quick.id, run.broad.id]);
      expect(rows.map((r) => r.pareto)).toEqual([true, true, false]);
      expect(rows[2].dominatedBy).toBe(run.quick.id);
      // Minimizing has no per-hour rate.
      expect(rows.every((r) => r.perHour === null)).toBe(true);
    });

    it('treats a metric declared neutral as having no better direction', async () => {
      await evaluate('quick', rainSet, { calibration: 0.1 });
      const body = await leaderboard();
      expect(body.analysis.calibration).toMatchObject({
        direction: null,
        directionStatus: 'neutral',
      });
      expect(
        Object.keys(setOf(body, 'calibration', rainSet).rankings).sort(),
      ).toEqual(['maximize', 'minimize']);
    });

    it('treats experiments that disagree as having no better direction', async () => {
      const experiments = dataSource.getRepository(Experiment);
      const second = await experiments.save(
        experiments.create({
          projectId: project.id,
          name: 'second',
          description: null,
        }),
      );
      await makeRun(second, 'disagrees', 15);
      await evaluate('disagrees', rainSet, { mAP50: 0.4 });
      await declare(second, { mAP50: 'minimize' });

      const body = await leaderboard();
      expect(body.metricDirections.mAP50).toEqual({
        direction: null,
        mixed: true,
      });
      expect(body.analysis.mAP50).toMatchObject({
        direction: null,
        directionStatus: 'mixed',
      });
      expect(
        Object.keys(setOf(body, 'mAP50', rainSet).rankings).sort(),
      ).toEqual(['maximize', 'minimize']);
    });
  });

  describe('isolation', () => {
    it("never includes another user's runs, sets or scores", async () => {
      const body = await leaderboard('');
      const runIds = body.runs.map(
        (r: { trainingRunId: string }) => r.trainingRunId,
      );
      expect(runIds).not.toContain(run['b-run'].id);
      const analysed = JSON.stringify(body.analysis);
      expect(analysed).not.toContain(userBSet.id);
      expect(analysed).not.toContain(run['b-run'].id);
    });

    it('gives user B only their own analysis', async () => {
      const body = (
        await get(keyB, '/reports/efficiency-leaderboard').expect(200)
      ).body;
      expect(
        body.runs.map((r: { trainingRunId: string }) => r.trainingRunId),
      ).toEqual([run['b-run'].id]);
      expect(
        body.evaluationSets.map(
          (s: { datasetVersionId: string }) => s.datasetVersionId,
        ),
      ).toEqual([userBSet.id]);
    });

    it('requires an API key', async () => {
      await request(app.getHttpServer())
        .get('/reports/efficiency-leaderboard')
        .expect(401);
    });
  });

  it('answers with empty analysis for a project with no completed runs', async () => {
    const projects = dataSource.getRepository(Project);
    const empty = await projects.save(
      projects.create({
        userId: (
          await dataSource
            .getRepository(User)
            .findOneByOrFail({ email: `eff-a-${tag}@example.com` })
        ).id,
        name: `Empty ${tag}`,
        description: null,
      }),
    );
    const body = await leaderboard(`?projectId=${empty.id}`);
    expect(body).toMatchObject({ runs: [], evaluationSets: [], analysis: {} });
  });
});
