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

// Regression coverage for a real bug: the DB's own unique constraint on
// generation_dataset_refs is a 3-column key (generation_id, dataset_version_id,
// role), but the repository's exists() check used to only compare
// (generationId, datasetVersionId) - so referencing the same dataset version
// from the same generation under a second, different role incorrectly threw
// a 409 even though the database itself would have permitted it.
describe('M11 Generation dataset reference role uniqueness (e2e)', () => {
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

  let user: User;
  let project: Project;
  let experiment: Experiment;
  let apiKey: string;
  let generation: Generation;
  let datasetVersion: DatasetVersion;

  function createRawApiKey(): string {
    return `sg_${randomBytes(32).toString('hex')}`;
  }

  function hashApiKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
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

    userRepository = dataSource.getRepository(User);
    apiKeyRepository = dataSource.getRepository(ApiKey);
    projectRepository = dataSource.getRepository(Project);
    experimentRepository = dataSource.getRepository(Experiment);
    generationRepository = dataSource.getRepository(Generation);
    datasetRepository = dataSource.getRepository(Dataset);
    datasetVersionRepository = dataSource.getRepository(DatasetVersion);
    generationDatasetReferenceRepository = dataSource.getRepository(
      GenerationDatasetReference,
    );

    user = await userRepository.save(
      userRepository.create({
        email: `m11-role-${randomBytes(8).toString('hex')}@example.com`,
      }),
    );

    apiKey = createRawApiKey();

    await apiKeyRepository.save(
      apiKeyRepository.create({
        userId: user.id,
        keyPrefix: apiKey.slice(0, 16),
        keyHash: hashApiKey(apiKey),
        revokedAt: null,
      }),
    );

    project = await projectRepository.save(
      projectRepository.create({
        userId: user.id,
        name: 'M11 Role Project',
        description: null,
      }),
    );

    experiment = await experimentRepository.save(
      experimentRepository.create({
        projectId: project.id,
        name: 'M11 Role Experiment',
        description: null,
      }),
    );

    generation = await generationRepository.save(
      generationRepository.create({
        experimentId: experiment.id,
        name: 'M11 Role Generation',
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

    const dataset = await datasetRepository.save(
      datasetRepository.create({
        userId: user.id,
        name: 'M11 Role Dataset',
        description: null,
        metadata: {},
      }),
    );

    datasetVersion = await datasetVersionRepository.save(
      datasetVersionRepository.create({
        datasetId: dataset.id,
        version: '1',
        uri: 's3://researcher/m11-role',
        format: 'image',
        size: 100,
        checksum: 'sha256:m11-role',
        metadata: {},
      }),
    );
  });

  afterAll(async () => {
    await generationDatasetReferenceRepository.delete({
      generationId: generation.id,
    });

    await generationRepository.delete(generation.id);
    await experimentRepository.delete(experiment.id);
    await datasetVersionRepository.delete(datasetVersion.id);
    await projectRepository.delete(project.id);
    await apiKeyRepository.delete({ userId: user.id });
    await userRepository.delete(user.id);

    await app.close();
  });

  it('allows referencing the same dataset version under a second, different role', async () => {
    await request(app.getHttpServer())
      .post(`/generations/${generation.id}/datasets`)
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ datasetVersionId: datasetVersion.id, role: 'input' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/generations/${generation.id}/datasets`)
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ datasetVersionId: datasetVersion.id, role: 'validation' })
      .expect(201);

    const references = await generationDatasetReferenceRepository.find({
      where: { generationId: generation.id },
      order: { role: 'ASC' },
    });

    expect(references.map((r) => r.role)).toEqual(['input', 'validation']);
  });

  it('rejects referencing the same dataset version under the same role twice', async () => {
    await request(app.getHttpServer())
      .post(`/generations/${generation.id}/datasets`)
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ datasetVersionId: datasetVersion.id, role: 'input' })
      .expect(409);
  });
});
