import { createHash, randomBytes } from 'node:crypto';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module.js';
import { ApiKey } from '../src/database/entities/api-key.entity.js';
import { Asset } from '../src/database/entities/asset.entity.js';
import { Dataset } from '../src/database/entities/dataset.entity.js';
import { Experiment } from '../src/database/entities/experiment.entity.js';
import { Generation } from '../src/database/entities/generation.entity.js';
import { Project } from '../src/database/entities/project.entity.js';
import { TrainingRun } from '../src/database/entities/training-run.entity.js';
import { User } from '../src/database/entities/user.entity.js';

describe('M9 Search (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let userA: User;
  let userB: User;
  let apiKeyA: string;
  let apiKeyB: string;

  let projectA: Project;
  let experimentA: Experiment;
  let datasetA: Dataset;
  let assetA: Asset;
  let generationA: Generation;
  let trainingRunA: TrainingRun;

  let projectB: Project; // userB - must never appear in userA's search results

  let userRepository: ReturnType<DataSource['getRepository']>;
  let apiKeyRepository: ReturnType<DataSource['getRepository']>;
  let projectRepository: ReturnType<DataSource['getRepository']>;
  let experimentRepository: ReturnType<DataSource['getRepository']>;
  let datasetRepository: ReturnType<DataSource['getRepository']>;
  let assetRepository: ReturnType<DataSource['getRepository']>;
  let generationRepository: ReturnType<DataSource['getRepository']>;
  let trainingRunRepository: ReturnType<DataSource['getRepository']>;

  const NEEDLE = `Zylofind${randomBytes(4).toString('hex')}`;

  function createRawApiKey(): string {
    return `sg_${randomBytes(32).toString('hex')}`;
  }

  function hashApiKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
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

    userRepository = dataSource.getRepository(User);
    apiKeyRepository = dataSource.getRepository(ApiKey);
    projectRepository = dataSource.getRepository(Project);
    experimentRepository = dataSource.getRepository(Experiment);
    datasetRepository = dataSource.getRepository(Dataset);
    assetRepository = dataSource.getRepository(Asset);
    generationRepository = dataSource.getRepository(Generation);
    trainingRunRepository = dataSource.getRepository(TrainingRun);

    userA = await userRepository.save(
      userRepository.create({
        email: `m9-search-a-${randomBytes(8).toString('hex')}@example.com`,
      }),
    );
    userB = await userRepository.save(
      userRepository.create({
        email: `m9-search-b-${randomBytes(8).toString('hex')}@example.com`,
      }),
    );

    apiKeyA = createRawApiKey();
    apiKeyB = createRawApiKey();
    await apiKeyRepository.save([
      apiKeyRepository.create({
        userId: userA.id,
        keyPrefix: apiKeyA.slice(0, 16),
        keyHash: hashApiKey(apiKeyA),
        revokedAt: null,
      }),
      apiKeyRepository.create({
        userId: userB.id,
        keyPrefix: apiKeyB.slice(0, 16),
        keyHash: hashApiKey(apiKeyB),
        revokedAt: null,
      }),
    ]);

    projectA = await projectRepository.save(
      projectRepository.create({
        userId: userA.id,
        name: `${NEEDLE} Project`,
        description: null,
      }),
    );

    experimentA = await experimentRepository.save(
      experimentRepository.create({
        projectId: projectA.id,
        name: `${NEEDLE} Experiment`,
        description: null,
      }),
    );

    datasetA = await datasetRepository.save(
      datasetRepository.create({
        userId: userA.id,
        name: `${NEEDLE} Dataset`,
        description: null,
        metadata: {},
      }),
    );

    assetA = await assetRepository.save(
      assetRepository.create({
        userId: userA.id,
        name: `${NEEDLE} Asset`,
        type: null,
        description: null,
        metadata: {},
      }),
    );

    generationA = await generationRepository.save(
      generationRepository.create({
        experimentId: experimentA.id,
        name: `${NEEDLE} Generation`,
        description: null,
        generator: { name: 'blender' },
        parameters: {},
        reproducibility: {},
        inputs: [],
        outputs: [],
        metadata: {},
      }),
    );

    trainingRunA = await trainingRunRepository.save(
      trainingRunRepository.create({
        experimentId: experimentA.id,
        name: `${NEEDLE} Training Run`,
        description: null,
        trainer: { name: 'custom' },
        parameters: {},
        metrics: {},
        metadata: {},
      }),
    );

    // userB owns a project with the exact same needle - proves cross-user
    // isolation isn't accidental (a bug that dropped the ownership WHERE
    // clause would still pass a test where only userA has matching data).
    projectB = await projectRepository.save(
      projectRepository.create({
        userId: userB.id,
        name: `${NEEDLE} Project`,
        description: null,
      }),
    );
  });

  afterAll(async () => {
    await trainingRunRepository.delete(trainingRunA.id);
    await generationRepository.delete(generationA.id);
    await assetRepository.delete(assetA.id);
    await datasetRepository.delete(datasetA.id);
    await experimentRepository.delete(experimentA.id);
    await projectRepository.delete([projectA.id, projectB.id]);
    await apiKeyRepository.delete({ userId: userA.id });
    await apiKeyRepository.delete({ userId: userB.id });
    await userRepository.delete([userA.id, userB.id]);
    await app.close();
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get('/search')
      .query({ q: NEEDLE })
      .expect(401);
  });

  it('requires a non-empty q parameter', async () => {
    await request(app.getHttpServer())
      .get('/search')
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(400);
  });

  it('finds a match in every entity type, scoped to the caller', async () => {
    const response = await request(app.getHttpServer())
      .get('/search')
      .query({ q: NEEDLE })
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200);

    const byType = Object.fromEntries(
      (response.body.results as Array<Record<string, unknown>>).map(
        (row) => [row.type, row],
      ),
    );

    expect(byType.project).toEqual({
      type: 'project',
      id: projectA.id,
      name: `${NEEDLE} Project`,
      projectId: projectA.id,
      experimentId: null,
    });
    expect(byType.experiment).toEqual({
      type: 'experiment',
      id: experimentA.id,
      name: `${NEEDLE} Experiment`,
      projectId: projectA.id,
      experimentId: experimentA.id,
    });
    expect(byType.dataset).toEqual({
      type: 'dataset',
      id: datasetA.id,
      name: `${NEEDLE} Dataset`,
      projectId: null,
      experimentId: null,
    });
    expect(byType.asset).toEqual({
      type: 'asset',
      id: assetA.id,
      name: `${NEEDLE} Asset`,
      projectId: null,
      experimentId: null,
    });
    expect(byType.generation).toEqual({
      type: 'generation',
      id: generationA.id,
      name: `${NEEDLE} Generation`,
      projectId: projectA.id,
      experimentId: experimentA.id,
    });
    expect(byType.trainingRun).toEqual({
      type: 'trainingRun',
      id: trainingRunA.id,
      name: `${NEEDLE} Training Run`,
      projectId: projectA.id,
      experimentId: experimentA.id,
    });

    // Exactly one project row - userB's identically-named project must not
    // leak into userA's results.
    const projectRows = (
      response.body.results as Array<{ type: string }>
    ).filter((row) => row.type === 'project');
    expect(projectRows).toHaveLength(1);
  });

  it('never returns another user data, even with an identical name', async () => {
    const response = await request(app.getHttpServer())
      .get('/search')
      .query({ q: NEEDLE })
      .set('Authorization', `Bearer ${apiKeyB}`)
      .expect(200);

    const projectRows = (
      response.body.results as Array<{ id: string }>
    ).filter((row) => row.id === projectA.id);
    expect(projectRows).toHaveLength(0);
  });

  it('returns an empty result set for a query with no matches', async () => {
    const response = await request(app.getHttpServer())
      .get('/search')
      .query({ q: 'no-such-entity-exists-anywhere' })
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200);

    expect(response.body.results).toEqual([]);
  });
});
