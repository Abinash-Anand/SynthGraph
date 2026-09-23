import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash, randomBytes } from 'node:crypto';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';

import { AppModule } from '../src/app.module.js';
import { ApiKey } from '../src/database/entities/api-key.entity.js';
import { Dataset } from '../src/database/entities/dataset.entity.js';
import { DatasetVersion } from '../src/database/entities/dataset-version.entity.js';
import { Experiment } from '../src/database/entities/experiment.entity.js';
import { GenerationDatasetReference } from '../src/database/entities/generation-dataset-reference.entity.js';
import {
  Generation,
  GenerationStatus,
} from '../src/database/entities/generation.entity.js';
import { Project } from '../src/database/entities/project.entity.js';
import { User } from '../src/database/entities/user.entity.js';

describe('M7 Reproduction manifest (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let userRepository: Repository<User>;
  let apiKeyRepository: Repository<ApiKey>;
  let projectRepository: Repository<Project>;
  let experimentRepository: Repository<Experiment>;
  let generationRepository: Repository<Generation>;
  let datasetRepository: Repository<Dataset>;
  let datasetVersionRepository: Repository<DatasetVersion>;
  let generationDatasetReferenceRepository: Repository<GenerationDatasetReference>;

  let userA: User;
  let userB: User;

  let projectA: Project;
  let projectB: Project;

  let experimentA: Experiment;
  let experimentB: Experiment;

  let apiKeyA: string;
  let apiKeyB: string;

  let generationA: Generation;
  let generationB: Generation;

  let datasetVersion: DatasetVersion;

  function createRawApiKey(): string {
    return `sg_${randomBytes(32).toString('hex')}`;
  }

  function hashApiKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
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

    userRepository = dataSource.getRepository(User);
    apiKeyRepository = dataSource.getRepository(ApiKey);
    projectRepository = dataSource.getRepository(Project);
    experimentRepository = dataSource.getRepository(Experiment);
    generationRepository = dataSource.getRepository(Generation);
    datasetRepository = dataSource.getRepository(Dataset);
    datasetVersionRepository =
      dataSource.getRepository(DatasetVersion);
    generationDatasetReferenceRepository = dataSource.getRepository(
      GenerationDatasetReference,
    );

    userA = await userRepository.save(
      userRepository.create({
        email: `m7-reproduction-a-${randomBytes(8).toString('hex')}@example.com`,
      }),
    );

    userB = await userRepository.save(
      userRepository.create({
        email: `m7-reproduction-b-${randomBytes(8).toString('hex')}@example.com`,
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
        name: 'M7 Reproduction Project A',
        description: null,
      }),
    );

    projectB = await projectRepository.save(
      projectRepository.create({
        userId: userB.id,
        name: 'M7 Reproduction Project B',
        description: null,
      }),
    );

    experimentA = await experimentRepository.save(
      experimentRepository.create({
        projectId: projectA.id,
        name: 'Reproduction Experiment A',
        description: 'Manifest test',
      }),
    );

    experimentB = await experimentRepository.save(
      experimentRepository.create({
        projectId: projectB.id,
        name: 'Reproduction Experiment B',
        description: null,
      }),
    );

    generationA = await generationRepository.save(
      generationRepository.create({
        experimentId: experimentA.id,
        name: 'Rainy Scene Generation',
        description: 'Reproduction generation',
        generator: {
          name: 'blender',
          version: '4.2.0',
          type: '3d_renderer',
        },
        parameters: {
          samples: 512,
          weather: 'rain',
        },
        reproducibility: {
          seed: 42,
          code_version: 'abc123',
          environment: {
            renderer: 'cycles',
          },
          configuration_hash: 'sha256:configuration',
        },
        inputs: [
          {
            id: 'asset-1',
            uri: 'file:///data/model.blend',
            name: 'model.blend',
            type: '3d_model',
          },
        ],
        outputs: [
          {
            id: 'dataset-1',
            uri: 'file:///data/output',
            name: 'output',
            format: 'image',
          },
        ],
        status: GenerationStatus.Completed,
        startedAt: new Date(),
        completedAt: new Date(),
        metadata: {},
      }),
    );

    generationB = await generationRepository.save(
      generationRepository.create({
        experimentId: experimentB.id,
        name: 'User B Generation',
        description: null,
        generator: {
          name: 'unity',
          version: '6',
        },
        parameters: {
          weather: 'sunny',
        },
        reproducibility: {
          seed: 99,
        },
        inputs: [],
        outputs: [],
        status: GenerationStatus.Completed,
        startedAt: new Date(),
        completedAt: new Date(),
        metadata: {},
      }),
    );

    const dataset = await datasetRepository.save(
      datasetRepository.create({
        userId: userA.id,
        name: 'Rainy Dataset',
        description: 'External dataset reference',
        metadata: {},
      }),
    );

    datasetVersion = await datasetVersionRepository.save(
      datasetVersionRepository.create({
        datasetId: dataset.id,
        version: '1',
        uri: 's3://researcher/rainy-v1',
        format: 'image',
        size: 100,
        checksum: 'sha256:dataset',
        metadata: {},
      }),
    );

    await request(app.getHttpServer())
      .post(`/generations/${generationA.id}/datasets`)
      .set('Authorization', `Bearer ${apiKeyA}`)
      .send({
        datasetVersionId: datasetVersion.id,
        role: 'input',
      })
      .expect(201);
  });

  afterAll(async () => {
    // generation_dataset_refs has an ON DELETE RESTRICT FK to generations,
    // so the reference created in beforeAll (generationA <-> datasetVersion)
    // must be deleted before the generation itself, not after.
    await generationDatasetReferenceRepository.delete({
      generationId: generationA.id,
    });

    await generationRepository.delete([
      generationA.id,
      generationB.id,
    ]);

    await experimentRepository.delete([
      experimentA.id,
      experimentB.id,
    ]);

    await datasetVersionRepository.delete(
      datasetVersion.id,
    );

    await projectRepository.delete([
      projectA.id,
      projectB.id,
    ]);

    await apiKeyRepository.delete({
      userId: userA.id,
    });

    await apiKeyRepository.delete({
      userId: userB.id,
    });

    await userRepository.delete([
      userA.id,
      userB.id,
    ]);

    await app.close();
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get(
        `/generations/${generationA.id}/reproduction-manifest`,
      )
      .expect(401);
  });

  it('generates a reproduction manifest containing generation provenance', async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/generations/${generationA.id}/reproduction-manifest`,
      )
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200);

    expect(response.body).toMatchObject({
      schemaVersion: '1.0',
      generation: {
        id: generationA.id,
        experimentId: experimentA.id,
        name: 'Rainy Scene Generation',
        description: 'Reproduction generation',
        generator: {
          name: 'blender',
          version: '4.2.0',
          type: '3d_renderer',
        },
        parameters: {
          samples: 512,
          weather: 'rain',
        },
        reproducibility: {
          seed: 42,
          code_version: 'abc123',
          configuration_hash: 'sha256:configuration',
        },
        status: 'completed',
      },
    });

    // Additive `normalized` field alongside the existing `generation`
    // field (untouched). Unlike `generation`, `normalized` includes
    // timestamps - the one thing the manifest's own nested shape lacks.
    expect(response.body.normalized).toMatchObject({
      id: generationA.id,
      experimentId: experimentA.id,
      name: 'Rainy Scene Generation',
      status: 'completed',
    });
    expect(response.body.normalized.createdAt).toEqual(expect.any(String));
    expect(response.body.normalized.updatedAt).toEqual(expect.any(String));
  });

  it('includes exact dataset version references', async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/generations/${generationA.id}/reproduction-manifest`,
      )
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200);

    expect(response.body.datasetReferences).toEqual([
      {
        datasetVersionId: datasetVersion.id,
        role: 'input',
      },
    ]);
  });

  it('classifies known/supplied/external fields from a fully-populated generation', async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/generations/${generationA.id}/reproduction-manifest`,
      )
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(200);

    expect(response.body.classification).toEqual({
      known: [
        { field: 'Generator', value: 'blender' },
        { field: 'Generator version', value: '4.2.0' },
        { field: 'Seed', value: '42' },
        { field: 'Code version', value: 'abc123' },
        { field: 'Configuration hash', value: 'sha256:configuration' },
      ],
      supplied: [{ field: 'renderer', value: 'cycles' }],
      missing: [],
      external: [{ field: 'input', value: datasetVersion.id }],
    });
  });

  it('does not expose another user generation', async () => {
    await request(app.getHttpServer())
      .get(
        `/generations/${generationB.id}/reproduction-manifest`,
      )
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(404);
  });

  it('returns 404 for an unknown generation', async () => {
    const unknownGenerationId =
      '11111111-1111-4111-8111-111111111111';

    await request(app.getHttpServer())
      .get(
        `/generations/${unknownGenerationId}/reproduction-manifest`,
      )
      .set('Authorization', `Bearer ${apiKeyA}`)
      .expect(404);
  });
});