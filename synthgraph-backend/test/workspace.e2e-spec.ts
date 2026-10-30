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
import { Experiment } from '../src/database/entities/experiment.entity.js';
import { GenerationDatasetReference } from '../src/database/entities/generation-dataset-reference.entity.js';
import {
  Generation,
  GenerationStatus,
} from '../src/database/entities/generation.entity.js';
import { Project } from '../src/database/entities/project.entity.js';
import { TrainingRunMetric } from '../src/database/entities/training-run-metric.entity.js';
import {
  TrainingRun,
  TrainingRunStatus,
} from '../src/database/entities/training-run.entity.js';
import { User } from '../src/database/entities/user.entity.js';

// The workspace route must return what the separate routes return, piece for
// piece; this compares them against the live routes for the same data.
describe('Experiment workspace (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let userA: User;
  let userB: User;
  let projectA: Project;
  let experimentA: Experiment;
  let experimentEmptyA: Experiment;
  let datasetVersion: DatasetVersion;
  let datasetId: string;
  let runs: TrainingRun[];
  let generations: Generation[];

  let apiKeyA: string;
  let apiKeyB: string;

  const rawKey = () => `sg_${randomBytes(32).toString('hex')}`;
  const hash = (key: string) => createHash('sha256').update(key).digest('hex');
  const get = (path: string, key: string = apiKeyA) =>
    request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${key}`);

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
    const generationRepository = dataSource.getRepository(Generation);
    const datasets = dataSource.getRepository(Dataset);
    const datasetVersions = dataSource.getRepository(DatasetVersion);
    const references = dataSource.getRepository(GenerationDatasetReference);

    const tag = randomBytes(8).toString('hex');
    userA = await users.save(users.create({ email: `workspace-a-${tag}@example.com` }));
    userB = await users.save(users.create({ email: `workspace-b-${tag}@example.com` }));
    apiKeyA = rawKey();
    apiKeyB = rawKey();
    await apiKeys.save([
      apiKeys.create({ userId: userA.id, keyPrefix: apiKeyA.slice(0, 16), keyHash: hash(apiKeyA), revokedAt: null }),
      apiKeys.create({ userId: userB.id, keyPrefix: apiKeyB.slice(0, 16), keyHash: hash(apiKeyB), revokedAt: null }),
    ]);

    projectA = await projects.save(
      projects.create({ userId: userA.id, name: 'Workspace Project A', description: null }),
    );
    experimentA = await experiments.save(
      experiments.create({ projectId: projectA.id, name: 'Workspace Experiment', description: 'parity' }),
    );
    experimentEmptyA = await experiments.save(
      experiments.create({ projectId: projectA.id, name: 'Workspace Empty', description: null }),
    );

    const dataset = await datasets.save(
      datasets.create({ userId: userA.id, name: 'Workspace Dataset', description: null, metadata: {} }),
    );
    datasetId = dataset.id;
    datasetVersion = await datasetVersions.save(
      datasetVersions.create({
        datasetId: dataset.id,
        version: 'v1',
        uri: 's3://bucket/workspace-v1',
        format: null,
        size: null,
        checksum: null,
        metadata: {},
      }),
    );

    // Three completed runs a day apart: the third trains with a different
    // trainer version, so it drifts from the two before it.
    runs = [];
    for (const [index, version] of ['1.0.0', '1.0.0', '2.0.0'].entries()) {
      const at = new Date(Date.UTC(2026, 0, 1 + index));
      runs.push(
        await trainingRuns.save(
          trainingRuns.create({
            experimentId: experimentA.id,
            name: `workspace-run-${index + 1}`,
            description: null,
            trainer: { name: 'ppo', version, type: 'rl' },
            parameters: { seed: index + 1 },
            metrics: {},
            metadata: { gpu: 'A100' },
            status: TrainingRunStatus.Completed,
            startedAt: at,
            completedAt: at,
            createdAt: at,
            captureStatus: null,
          }),
        ),
      );
    }

    for (const [index, run] of runs.entries()) {
      await metrics.save(
        Array.from({ length: 8 }, (_, step) =>
          metrics.create({
            trainingRunId: run.id,
            step,
            metrics: { loss: 10 - step * (index + 1) * 0.3, reward: step * 2, label: 'ignored' },
          }),
        ),
      );
      await evaluations.save(
        evaluations.create({
          trainingRunId: run.id,
          datasetVersionId: datasetVersion.id,
          name: `eval-${index + 1}`,
          metrics: { mAP: 0.5 + index / 10 },
          metadata: {},
        }),
      );
    }

    generations = [];
    for (const index of [1, 2]) {
      generations.push(
        await generationRepository.save(
          generationRepository.create({
            experimentId: experimentA.id,
            name: `workspace-generation-${index}`,
            description: null,
            generator: { name: 'blender', version: '4.2.0', type: '3d_renderer' },
            parameters: { samples: 64 * index },
            reproducibility: { seed: index, code_version: 'abc123', environment: { os: 'test' } },
            inputs: [],
            outputs: [],
            status: GenerationStatus.Completed,
            startedAt: new Date(),
            completedAt: new Date(),
            metadata: {},
          }),
        ),
      );
    }
    await references.save(
      references.create({ generationId: generations[0].id, datasetVersionId: datasetVersion.id, role: 'input' }),
    );
  });

  afterAll(async () => {
    const generationIds = generations.map((generation) => generation.id);
    const runIds = runs.map((run) => run.id);

    await dataSource.getRepository(GenerationDatasetReference).delete({ generationId: generations[0].id });
    await dataSource.getRepository(Generation).delete(generationIds);
    await dataSource.getRepository(EvaluationResult).delete({ datasetVersionId: datasetVersion.id });
    await dataSource.getRepository(TrainingRunMetric).createQueryBuilder().delete().where('training_run_id IN (:...runIds)', { runIds }).execute();
    await dataSource.getRepository(TrainingRun).delete(runIds);
    await dataSource.getRepository(Experiment).delete([experimentA.id, experimentEmptyA.id]);
    await dataSource.getRepository(DatasetVersion).delete(datasetVersion.id);
    await dataSource.getRepository(Dataset).delete(datasetId);
    await dataSource.getRepository(Project).delete(projectA.id);
    await dataSource.getRepository(ApiKey).delete({ userId: userA.id });
    await dataSource.getRepository(ApiKey).delete({ userId: userB.id });
    await dataSource.getRepository(User).delete([userA.id, userB.id]);

    await app.close();
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get(`/experiments/${experimentA.id}/workspace`).expect(401);
  });

  it('is not found for an experiment that belongs to someone else', async () => {
    await get(`/experiments/${experimentA.id}/workspace`, apiKeyB).expect(404);
  });

  it('returns exactly what the separate routes return, piece by piece', async () => {
    const response = await get(`/experiments/${experimentA.id}/workspace`).expect(200);
    const workspace = response.body;

    // Every part reports how long it took, so a slow load can be attributed.
    const serverTiming: string = response.headers['server-timing'];
    for (const part of ['experiment', 'correlation', 'runs_list', 'health', 'drift', 'metrics_evaluations', 'generations_list', 'manifests', 'total']) {
      expect(serverTiming.split(', ').map((entry) => entry.split(';')[0])).toContain(part);
      expect(serverTiming).toMatch(/;dur=\d+\.\d/);
    }

    const experiment = (await get(`/experiments/${experimentA.id}`).expect(200)).body;
    const correlation = (await get(`/reports/parameter-correlation?experimentId=${experimentA.id}`).expect(200)).body;
    const runList = (await get(`/experiments/${experimentA.id}/training-runs`).expect(200)).body;
    const generationList = (await get(`/experiments/${experimentA.id}/generations`).expect(200)).body;

    expect(workspace.experiment).toEqual(experiment);
    expect(workspace.correlation).toEqual(correlation);
    expect(workspace.trainingRuns.map((entry: { run: unknown }) => entry.run)).toEqual(runList);
    expect(workspace.generations.map((entry: { generation: unknown }) => entry.generation)).toEqual(generationList);

    for (const entry of workspace.trainingRuns) {
      const id = entry.run.id;
      expect(entry.metrics).toEqual((await get(`/training-runs/${id}/metrics`).expect(200)).body);
      expect(entry.evaluations).toEqual((await get(`/training-runs/${id}/evaluations`).expect(200)).body);
      expect(entry.health).toEqual((await get(`/reports/training-run-health?trainingRunId=${id}`).expect(200)).body);
      expect(entry.drift).toEqual((await get(`/reports/training-run-drift?trainingRunId=${id}`).expect(200)).body);
    }

    for (const entry of workspace.generations) {
      expect(entry.manifest).toEqual(
        (await get(`/generations/${entry.generation.id}/reproduction-manifest`).expect(200)).body,
      );
    }

    // The fixtures are not vacuous: there is something to compare.
    expect(workspace.trainingRuns).toHaveLength(3);
    expect(workspace.trainingRuns[0].metrics).toHaveLength(8);
    expect(workspace.trainingRuns[0].health.metrics.length).toBeGreaterThan(0);
    const drifted = workspace.trainingRuns.find(
      (entry: { run: { id: string } }) => entry.run.id === runs[2].id,
    );
    expect(drifted.drift.drift.map((d: { field: string }) => d.field)).toContain('trainer.version');
    expect(workspace.generations).toHaveLength(2);
    const referenced = workspace.generations.find(
      (entry: { generation: { id: string } }) => entry.generation.id === generations[0].id,
    );
    expect(referenced.manifest.datasetReferences).toHaveLength(1);
  });

  it('returns empty lists for an experiment with nothing in it', async () => {
    const workspace = (await get(`/experiments/${experimentEmptyA.id}/workspace`).expect(200)).body;

    expect(workspace.experiment.id).toBe(experimentEmptyA.id);
    expect(workspace.trainingRuns).toEqual([]);
    expect(workspace.generations).toEqual([]);
  });

  it('lists every manifest in one request, equal to the per-generation route', async () => {
    const batch = (await get(`/experiments/${experimentA.id}/reproduction-manifests`).expect(200)).body;
    const generationList = (await get(`/experiments/${experimentA.id}/generations`).expect(200)).body;

    expect(batch.map((manifest: { generation: { id: string } }) => manifest.generation.id)).toEqual(
      generationList.map((generation: { id: string }) => generation.id),
    );
    for (const manifest of batch) {
      expect(manifest).toEqual(
        (await get(`/generations/${manifest.generation.id}/reproduction-manifest`).expect(200)).body,
      );
    }
    await get(`/experiments/${experimentA.id}/reproduction-manifests`, apiKeyB).expect(404);
  });

  describe('whole-experiment health and drift', () => {
    it('lists every run\'s report, equal to the per-run routes', async () => {
      const health = (await get(`/reports/experiment-training-run-health?experimentId=${experimentA.id}`).expect(200)).body;
      const drift = (await get(`/reports/experiment-training-run-drift?experimentId=${experimentA.id}`).expect(200)).body;

      expect(health.experimentId).toBe(experimentA.id);
      expect(drift.experimentId).toBe(experimentA.id);
      expect(health.runs).toHaveLength(3);
      expect(drift.runs).toHaveLength(3);

      // Same order as the run list (newest first), whatever that order is.
      const runList = (await get(`/experiments/${experimentA.id}/training-runs`).expect(200)).body;
      expect(health.runs.map((r: { trainingRunId: string }) => r.trainingRunId)).toEqual(
        runList.map((r: { id: string }) => r.id),
      );
      expect(drift.runs.map((r: { trainingRunId: string }) => r.trainingRunId)).toEqual(
        runList.map((r: { id: string }) => r.id),
      );

      for (const [index, run] of runList.entries()) {
        expect(health.runs[index]).toEqual(
          (await get(`/reports/training-run-health?trainingRunId=${run.id}`).expect(200)).body,
        );
        expect(drift.runs[index]).toEqual(
          (await get(`/reports/training-run-drift?trainingRunId=${run.id}`).expect(200)).body,
        );
      }
    });

    it('honours windowSize like the per-run route', async () => {
      const health = (
        await get(`/reports/experiment-training-run-health?experimentId=${experimentA.id}&windowSize=3`).expect(200)
      ).body;
      const single = (
        await get(`/reports/training-run-health?trainingRunId=${runs[0].id}&windowSize=3`).expect(200)
      ).body;

      expect(health.windowSize).toBe(3);
      expect(
        health.runs.find((r: { trainingRunId: string }) => r.trainingRunId === runs[0].id),
      ).toEqual(single);
    });

    it('is not found for someone else\'s experiment and rejects a bad id', async () => {
      await get(`/reports/experiment-training-run-health?experimentId=${experimentA.id}`, apiKeyB).expect(404);
      await get(`/reports/experiment-training-run-drift?experimentId=${experimentA.id}`, apiKeyB).expect(404);
      await get('/reports/experiment-training-run-health?experimentId=not-a-uuid').expect(400);
    });
  });
});
