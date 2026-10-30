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
  TrainingRunStatus,
  type TrainingRunCaptureStatus,
} from '../src/database/entities/training-run.entity.js';
import { User } from '../src/database/entities/user.entity.js';

describe('Experiment attention (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const tag = randomBytes(6).toString('hex');
  const rawKey = () => `sg_${randomBytes(32).toString('hex')}`;
  const hash = (key: string) => createHash('sha256').update(key).digest('hex');

  let keyA: string;
  let keyB: string;
  let experiment: Experiment;
  let emptyExperiment: Experiment;
  let foreignExperiment: Experiment;
  const ids: Record<string, string> = {};

  const get = (key: string, path: string) =>
    request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${key}`);

  const complete = (): TrainingRunCaptureStatus => ({
    status: 'complete',
    integrations: {},
  });

  async function makeRun(
    target: Experiment,
    name: string,
    over: Partial<{
      status: TrainingRunStatus;
      captureStatus: TrainingRunCaptureStatus | null;
      trainer: { name: string; version?: string; type?: string };
    }> = {},
  ) {
    const repository = dataSource.getRepository(TrainingRun);
    const run = await repository.save(
      repository.create({
        experimentId: target.id,
        name,
        description: null,
        trainer: over.trainer ?? { name: 'pytorch', version: '2.8.0', type: 'rl' },
        parameters: {},
        metrics: {},
        metadata: {},
        status: over.status ?? TrainingRunStatus.Completed,
        captureStatus: over.captureStatus === undefined ? complete() : over.captureStatus,
      }),
    );
    ids[name] = run.id;
    return run;
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
    const userA = await users.save(users.create({ email: `attn-a-${tag}@example.com` }));
    const userB = await users.save(users.create({ email: `attn-b-${tag}@example.com` }));
    keyA = rawKey();
    keyB = rawKey();
    const keys = dataSource.getRepository(ApiKey);
    await keys.save([
      keys.create({ userId: userA.id, keyPrefix: keyA.slice(0, 16), keyHash: hash(keyA), revokedAt: null }),
      keys.create({ userId: userB.id, keyPrefix: keyB.slice(0, 16), keyHash: hash(keyB), revokedAt: null }),
    ]);
    const projects = dataSource.getRepository(Project);
    const projectA = await projects.save(projects.create({ userId: userA.id, name: `Attn A ${tag}`, description: null }));
    const projectB = await projects.save(projects.create({ userId: userB.id, name: `Attn B ${tag}`, description: null }));
    const experiments = dataSource.getRepository(Experiment);
    experiment = await experiments.save(experiments.create({ projectId: projectA.id, name: 'attn', description: null }));
    emptyExperiment = await experiments.save(experiments.create({ projectId: projectA.id, name: 'empty', description: null }));
    foreignExperiment = await experiments.save(experiments.create({ projectId: projectB.id, name: 'foreign', description: null }));

    // Two clean completed runs first: they are the baseline later runs drift from.
    await makeRun(experiment, 'baseline-1');
    await makeRun(experiment, 'baseline-2');
    await makeRun(experiment, 'healthy');
    await makeRun(experiment, 'failed', { status: TrainingRunStatus.Failed });
    await makeRun(experiment, 'partial', { captureStatus: { status: 'partial', integrations: {} } });
    await makeRun(experiment, 'unknown', { captureStatus: { status: 'unknown', integrations: {} } });
    await makeRun(experiment, 'silent', { captureStatus: null });
    await makeRun(experiment, 'running-silent', {
      status: TrainingRunStatus.Running,
      captureStatus: null,
    });
    // A completed run joins the baseline of every later run, and a baseline the
    // earlier runs do not agree on gives no drift, so 'everything' (not completed,
    // so never in a baseline) comes before 'drifted'.
    await makeRun(experiment, 'everything', {
      status: TrainingRunStatus.Failed,
      captureStatus: { status: 'partial', integrations: {} },
      trainer: { name: 'tensorflow', version: '2.0.0', type: 'rl' },
    });
    await makeRun(experiment, 'drifted', {
      trainer: { name: 'jax', version: '0.4.0', type: 'rl' },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  const attentionPath = (target: Experiment) => `/reports/experiment-attention?experimentId=${target.id}`;

  it('flags exactly the runs the five checks flag, with the reasons and their order', async () => {
    const { body } = await get(keyA, attentionPath(experiment)).expect(200);

    expect(body.experimentId).toBe(experiment.id);
    expect(body.runsChecked).toBe(10);
    const byId = new Map(
      body.runs.map((r: { trainingRunId: string; reasons: unknown[] }) => [r.trainingRunId, r.reasons]),
    );
    expect([...byId.keys()].sort()).toEqual(
      [ids.failed, ids.partial, ids.unknown, ids.silent, ids['running-silent'], ids.drifted, ids.everything].sort(),
    );
    expect(byId.get(ids.failed)).toEqual([{ code: 'run_failed' }]);
    expect(byId.get(ids.partial)).toEqual([{ code: 'capture_partial' }]);
    expect(byId.get(ids.unknown)).toEqual([{ code: 'capture_unknown' }]);
    expect(byId.get(ids.silent)).toEqual([{ code: 'capture_not_reported' }]);
    expect(byId.get(ids['running-silent'])).toEqual([{ code: 'capture_not_reported' }]);
    expect(byId.get(ids.drifted)).toEqual([{ code: 'drift', driftFields: 2 }]);
  });

  it('leaves out the runs that are fine, including the baseline', async () => {
    const { body } = await get(keyA, attentionPath(experiment)).expect(200);

    const flagged = body.runs.map((r: { trainingRunId: string }) => r.trainingRunId);
    expect(flagged).not.toContain(ids['baseline-1']);
    expect(flagged).not.toContain(ids['baseline-2']);
    expect(flagged).not.toContain(ids.healthy);
  });

  it('lists every reason one run has, in the order of the checks', async () => {
    const { body } = await get(keyA, attentionPath(experiment)).expect(200);

    const everything = body.runs.find((r: { trainingRunId: string }) => r.trainingRunId === ids.everything);
    expect(everything.reasons.map((r: { code: string }) => r.code)).toEqual([
      'run_failed',
      'capture_partial',
      'drift',
    ]);
  });

  it('says which checks it performs', async () => {
    const { body } = await get(keyA, attentionPath(experiment)).expect(200);

    expect(body.checks).toEqual([
      { code: 'run_failed', description: 'failed runs' },
      { code: 'capture_partial', description: 'capture reported as partial' },
      { code: 'capture_unknown', description: 'capture reported as unknown' },
      { code: 'capture_not_reported', description: 'capture never reported' },
      { code: 'drift', description: 'drift from earlier completed runs' },
    ]);
  });

  it('agrees with the capture completeness counts for the same runs', async () => {
    const { body } = await get(keyA, attentionPath(experiment)).expect(200);
    const flaggedForCapture = new Set(
      body.runs
        .filter((r: { reasons: Array<{ code: string }> }) =>
          r.reasons.some((reason) => reason.code.startsWith('capture')),
        )
        .map((r: { trainingRunId: string }) => r.trainingRunId),
    );

    const rows: Array<{ id: string; status: string | null }> = await dataSource.query(
      `SELECT id, capture_status ->> 'status' AS status FROM training_runs WHERE experiment_id = $1`,
      [experiment.id],
    );
    // The report buckets a run by its status, a never-reported run as "unknown";
    // partial and unknown there are exactly the runs flagged for capture.
    const reportNeedsAttention = new Set(
      rows.filter((row) => ['partial', 'unknown', null].includes(row.status)).map((row) => row.id),
    );
    expect(flaggedForCapture).toEqual(reportNeedsAttention);
  });

  it('gives the workspace the same answer as the route', async () => {
    const route = (await get(keyA, attentionPath(experiment)).expect(200)).body;
    const workspace = (await get(keyA, `/experiments/${experiment.id}/workspace`).expect(200)).body;

    const { experimentId: _ignored, ...expected } = route;
    expect(workspace.attention).toEqual(expected);
  });

  it('has nothing to flag in an experiment with no runs, and still says what it checks', async () => {
    const { body } = await get(keyA, attentionPath(emptyExperiment)).expect(200);

    expect(body.runsChecked).toBe(0);
    expect(body.runs).toEqual([]);
    expect(body.checks).toHaveLength(5);
  });

  it('paginates the runs it checks like the run list', async () => {
    // The run list is newest first, so the first page is the last two runs created.
    const first = await get(keyA, `${attentionPath(experiment)}&limit=2&offset=0`).expect(200);
    expect(first.body.runsChecked).toBe(2);
    expect(first.body.runs.map((r: { trainingRunId: string }) => r.trainingRunId)).toEqual([
      ids.drifted,
      ids.everything,
    ]);

    // Offsetting past the flagged runs reaches the two baseline runs at the end.
    const last = await get(keyA, `${attentionPath(experiment)}&limit=2&offset=8`).expect(200);
    expect(last.body.runsChecked).toBe(2);
    expect(last.body.runs).toEqual([]);
  });

  describe('authorization', () => {
    it("is not found for another user's experiment, and reveals nothing", async () => {
      const response = await get(keyA, attentionPath(foreignExperiment)).expect(404);

      expect(response.body.runs).toBeUndefined();
      await get(keyB, `/experiments/${experiment.id}/workspace`).expect(404);
      await get(keyB, attentionPath(experiment)).expect(404);
    });

    it('requires an API key', async () => {
      await request(app.getHttpServer()).get(attentionPath(experiment)).expect(401);
    });

    it('rejects an experiment id that is not a UUID', async () => {
      await get(keyA, '/reports/experiment-attention?experimentId=nope').expect(400);
      await get(keyA, '/reports/experiment-attention').expect(400);
    });
  });
});
