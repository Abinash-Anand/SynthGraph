import { createHash, randomBytes } from 'node:crypto';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module.js';
import { ApiKey } from '../src/database/entities/api-key.entity.js';
import { Experiment } from '../src/database/entities/experiment.entity.js';
import { Project } from '../src/database/entities/project.entity.js';
import {
  TrainingRun,
  type TrainingRunCaptureStatus,
} from '../src/database/entities/training-run.entity.js';
import { User } from '../src/database/entities/user.entity.js';

describe('Capture completeness runs (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const tag = randomBytes(6).toString('hex');
  const rawKey = () => `sg_${randomBytes(32).toString('hex')}`;
  const hash = (key: string) => createHash('sha256').update(key).digest('hex');

  let keyA: string;
  let keyB: string;
  let project1: Project;
  let project2: Project;
  let userBProject: Project;
  const ids: Record<string, string> = {};

  const get = (key: string, path: string) =>
    request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${key}`);

  const state = (attached: boolean, closed: boolean) => ({ attached, closed });
  const status = (
    value: 'complete' | 'partial' | 'unknown',
    integrations: TrainingRunCaptureStatus['integrations'] = {},
  ): TrainingRunCaptureStatus => ({ status: value, integrations });

  async function makeRun(
    experiment: Experiment,
    name: string,
    captureStatus: TrainingRunCaptureStatus | null,
  ) {
    const repository = dataSource.getRepository(TrainingRun);
    const run = await repository.save(
      repository.create({
        experimentId: experiment.id,
        name,
        description: null,
        trainer: { name: 'pytorch', version: '2.8.0', type: 'rl' },
        parameters: {},
        metrics: {},
        metadata: {},
        captureStatus,
      }),
    );
    ids[name] = run.id;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    dataSource = app.get(DataSource);

    const users = dataSource.getRepository(User);
    const userA = await users.save(users.create({ email: `cap-a-${tag}@example.com` }));
    const userB = await users.save(users.create({ email: `cap-b-${tag}@example.com` }));
    keyA = rawKey();
    keyB = rawKey();
    const keys = dataSource.getRepository(ApiKey);
    await keys.save([
      keys.create({ userId: userA.id, keyPrefix: keyA.slice(0, 16), keyHash: hash(keyA), revokedAt: null }),
      keys.create({ userId: userB.id, keyPrefix: keyB.slice(0, 16), keyHash: hash(keyB), revokedAt: null }),
    ]);
    const projects = dataSource.getRepository(Project);
    project1 = await projects.save(projects.create({ userId: userA.id, name: `Cap One ${tag}`, description: null }));
    project2 = await projects.save(projects.create({ userId: userA.id, name: `Cap Two ${tag}`, description: null }));
    userBProject = await projects.save(projects.create({ userId: userB.id, name: `Cap B ${tag}`, description: null }));
    const experiments = dataSource.getRepository(Experiment);
    const exp1 = await experiments.save(experiments.create({ projectId: project1.id, name: 'exp-one', description: null }));
    const exp2 = await experiments.save(experiments.create({ projectId: project2.id, name: 'exp-two', description: null }));
    await experiments.save(experiments.create({ projectId: userBProject.id, name: 'exp-b', description: null }));

    // Project 1: six runs.
    //   resource_monitor is reported by 4 of 6 (a majority); tb by 3 of 6 (exactly half).
    const both = { resource_monitor: state(true, true), tb: state(true, true) };
    await makeRun(exp1, 'r1-complete', status('complete', both));
    await makeRun(exp1, 'r2-complete', status('complete', both));
    await makeRun(exp1, 'r3-complete', status('complete', both));
    await makeRun(exp1, 'r4-partial', status('partial', { resource_monitor: state(true, false) }));
    await makeRun(exp1, 'r5-explicit-unknown', status('unknown'));
    await makeRun(exp1, 'r6-never-reported', null);
    // Project 2: four complete runs that report nothing.
    for (const n of [1, 2, 3, 4]) await makeRun(exp2, `p2-${n}`, status('complete'));
  });

  afterAll(async () => {
    await app.close();
  });

  const runsPath = (query = '') => `/reports/capture-completeness/runs${query}`;
  const scoped = (query = '') => runsPath(`?projectId=${project1.id}${query}`);
  const byName = (body: { runs: Array<{ trainingRunId: string }> }) =>
    new Map(body.runs.map((r) => [r.trainingRunId, r]));

  describe('which runs it lists', () => {
    it('lists the runs that need attention by default, newest first', async () => {
      const { body } = await get(keyA, scoped()).expect(200);

      expect(body.runs.map((r: { trainingRunId: string }) => r.trainingRunId)).toEqual([
        ids['r6-never-reported'],
        ids['r5-explicit-unknown'],
        ids['r4-partial'],
      ]);
      expect(body.total).toBe(6);
      expect(body.truncated).toBe(false);
    });

    it('names the project and experiment and the status each run reported', async () => {
      const { body } = await get(keyA, scoped()).expect(200);
      const runs = byName(body);

      expect(runs.get(ids['r4-partial'])).toMatchObject({
        name: 'r4-partial',
        captureStatus: 'partial',
        projectId: project1.id,
        projectName: `Cap One ${tag}`,
        experimentName: 'exp-one',
      });
      expect(runs.get(ids['r5-explicit-unknown'])).toMatchObject({ captureStatus: 'unknown' });
      // A run that never reported has no status of its own.
      expect(runs.get(ids['r6-never-reported'])).toMatchObject({ captureStatus: null });
    });

    it('lists exactly what the report counts as unknown: never reported and explicitly unknown', async () => {
      // Regression: the old drill-down's "unknown" listed only runs that never
      // reported, so a run that reported "unknown" was counted but never shown.
      const report = (await get(keyA, `/reports/capture-completeness?projectId=${project1.id}`).expect(200)).body;
      const { body } = await get(keyA, scoped('&status=unknown')).expect(200);

      expect(report.byStatus.unknown).toBe(2);
      expect(body.runs).toHaveLength(report.byStatus.unknown);
      expect(body.runs.map((r: { name: string }) => r.name).sort()).toEqual([
        'r5-explicit-unknown',
        'r6-never-reported',
      ]);
    });

    it('lists the partial and the complete runs when asked for them', async () => {
      const partial = (await get(keyA, scoped('&status=partial')).expect(200)).body;
      const complete = (await get(keyA, scoped('&status=complete')).expect(200)).body;

      expect(partial.runs.map((r: { name: string }) => r.name)).toEqual(['r4-partial']);
      expect(complete.runs.map((r: { name: string }) => r.name).sort()).toEqual([
        'r1-complete',
        'r2-complete',
        'r3-complete',
      ]);
    });

    it('keeps the counts and the lists in step for every status', async () => {
      const report = (await get(keyA, `/reports/capture-completeness?projectId=${project1.id}`).expect(200)).body;
      for (const s of ['complete', 'partial', 'unknown'] as const) {
        const { body } = await get(keyA, scoped(`&status=${s}`)).expect(200);
        expect(body.runs).toHaveLength(report.byStatus[s]);
      }
    });
  });

  describe('what is wrong with each run', () => {
    it('flags an integration attached but never closed', async () => {
      const { body } = await get(keyA, scoped()).expect(200);

      expect(byName(body).get(ids['r4-partial'])?.issues).toEqual(
        expect.arrayContaining([{ kind: 'never_closed', integration: 'resource_monitor' }]),
      );
    });

    it('flags a missing integration only when MORE than half of the runs report it', async () => {
      const { body } = await get(keyA, scoped()).expect(200);
      const silent = byName(body).get(ids['r6-never-reported']);

      // resource_monitor: 4 of 6 report it, so it is missing from this run.
      expect(silent?.issues).toContainEqual({
        kind: 'not_reported',
        integration: 'resource_monitor',
        reportedBy: 4,
        totalRuns: 6,
      });
      // tb: exactly 3 of 6 report it, which is not a majority.
      expect(silent?.issues.some((i: { integration: string }) => i.integration === 'tb')).toBe(false);
    });

    it('judges against the same scope as the report: the account, or one project', async () => {
      const account = (await get(keyA, runsPath()).expect(200)).body;
      const project = (await get(keyA, scoped()).expect(200)).body;

      // Across both projects resource_monitor is reported by 4 of 10 (not a majority);
      // inside project one it is 4 of 6.
      expect(account.total).toBe(10);
      expect(byName(account).get(ids['r6-never-reported'])?.issues).toEqual([]);
      expect(byName(project).get(ids['r6-never-reported'])?.issues).not.toEqual([]);
    });

    it('has no issues to report for a run that finished cleanly', async () => {
      const { body } = await get(keyA, scoped('&status=complete')).expect(200);

      for (const run of body.runs) expect(run.issues).toEqual([]);
    });
  });

  describe('the report gains the integrations rated', () => {
    it('adds left-open, close rate and coverage without changing the existing fields', async () => {
      const { body } = await get(keyA, `/reports/capture-completeness?projectId=${project1.id}`).expect(200);

      expect(body.total).toBe(6);
      expect(body.byStatus).toEqual({ complete: 3, partial: 1, unknown: 2 });
      expect(body.byIntegration.resource_monitor).toEqual({ total: 4, attached: 4, closed: 3 });
      const monitor = body.integrations.find((i: { integration: string }) => i.integration === 'resource_monitor');
      expect(monitor).toEqual({
        integration: 'resource_monitor',
        total: 4,
        attached: 4,
        closed: 3,
        dangling: 1,
        closeRate: 0.75,
        coverage: 4 / 6,
      });
    });
  });

  describe('size and scope', () => {
    it('says when more runs matched than were listed', async () => {
      const limited = (await get(keyA, scoped('&status=complete&limit=2')).expect(200)).body;
      const enough = (await get(keyA, scoped('&status=complete&limit=3')).expect(200)).body;

      expect(limited.runs).toHaveLength(2);
      expect(limited.truncated).toBe(true);
      expect(enough.runs).toHaveLength(3);
      expect(enough.truncated).toBe(false);
    });

    it("never lists another user's runs, even for that user's project id", async () => {
      const own = (await get(keyB, runsPath()).expect(200)).body;
      const foreign = (await get(keyB, `/reports/capture-completeness/runs?projectId=${project1.id}`).expect(200)).body;

      expect(own).toEqual({ total: 0, truncated: false, runs: [] });
      expect(foreign).toEqual({ total: 0, truncated: false, runs: [] });
    });
  });

  describe('request validation', () => {
    it('requires an API key', async () => {
      await request(app.getHttpServer()).get(runsPath()).expect(401);
    });

    it.each([
      ['an unknown status', '?status=bogus'],
      ['a project id that is not a UUID', '?projectId=nope'],
      ['a limit of zero', '?limit=0'],
      ['a limit over 100', '?limit=101'],
      ['a fractional limit', '?limit=1.5'],
      ['an unknown parameter', '?statuses=partial'],
    ])('rejects %s', async (_label, query) => {
      await get(keyA, runsPath(query)).expect(400);
    });
  });
});
