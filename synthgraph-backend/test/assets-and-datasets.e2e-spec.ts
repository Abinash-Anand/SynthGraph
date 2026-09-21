import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource, Repository } from 'typeorm';
import { createHash, randomBytes } from 'node:crypto';

import { AppModule } from '../src/app.module.js';
import { ApiKey } from '../src/database/entities/api-key.entity.js';
import { Asset } from '../src/database/entities/asset.entity.js';
import { AssetVersion } from '../src/database/entities/asset-version.entity.js';
import { Dataset } from '../src/database/entities/dataset.entity.js';
import { DatasetVersion } from '../src/database/entities/dataset-version.entity.js';
import { User } from '../src/database/entities/user.entity.js';

describe('Assets and datasets (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  let userRepository: Repository<User>;
  let apiKeyRepository: Repository<ApiKey>;
  let assetRepository: Repository<Asset>;
  let assetVersionRepository: Repository<AssetVersion>;
  let datasetRepository: Repository<Dataset>;
  let datasetVersionRepository: Repository<DatasetVersion>;

  let userA: User;
  let userB: User;

  let apiKeyA: string;
  let apiKeyB: string;

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
    assetRepository = dataSource.getRepository(Asset);
    assetVersionRepository = dataSource.getRepository(AssetVersion);
    datasetRepository = dataSource.getRepository(Dataset);
    datasetVersionRepository = dataSource.getRepository(DatasetVersion);

    userA = await userRepository.save(
      userRepository.create({
        email: `assets-datasets-a-${randomBytes(8).toString('hex')}@example.com`,
      }),
    );

    userB = await userRepository.save(
      userRepository.create({
        email: `assets-datasets-b-${randomBytes(8).toString('hex')}@example.com`,
      }),
    );

    apiKeyA = createRawApiKey();
    apiKeyB = createRawApiKey();

    await apiKeyRepository.save(
      apiKeyRepository.create({
        userId: userA.id,
        keyPrefix: apiKeyA.slice(0, 16),
        keyHash: hashApiKey(apiKeyA),
        revokedAt: null,
      }),
    );

    await apiKeyRepository.save(
      apiKeyRepository.create({
        userId: userB.id,
        keyPrefix: apiKeyB.slice(0, 16),
        keyHash: hashApiKey(apiKeyB),
        revokedAt: null,
      }),
    );
  });

  afterAll(async () => {
    await assetVersionRepository
      .createQueryBuilder()
      .delete()
      .where('asset_id IN (SELECT id FROM assets WHERE user_id IN (:...userIds))', {
        userIds: [userA.id, userB.id],
      })
      .execute();

    await assetRepository.delete({ userId: userA.id });
    await assetRepository.delete({ userId: userB.id });

    await datasetVersionRepository
      .createQueryBuilder()
      .delete()
      .where(
        'dataset_id IN (SELECT id FROM datasets WHERE user_id IN (:...userIds))',
        { userIds: [userA.id, userB.id] },
      )
      .execute();

    await datasetRepository.delete({ userId: userA.id });
    await datasetRepository.delete({ userId: userB.id });

    await apiKeyRepository.delete({ userId: userA.id });
    await apiKeyRepository.delete({ userId: userB.id });

    await userRepository.delete(userA.id);
    await userRepository.delete(userB.id);

    await app.close();
  });

  describe('assets', () => {
    let assetId: string;
    let assetVersionId: string;

    it('creates an asset for the authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .post('/assets')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'E2E asset', type: 'model' })
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'E2E asset',
        type: 'model',
      });
      expect(response.body.id).toEqual(expect.any(String));

      assetId = response.body.id;
    });

    it('retrieves the asset by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/assets/${assetId}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(response.body).toMatchObject({ id: assetId, name: 'E2E asset' });
    });

    it('lists assets for the authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/assets')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: assetId })]),
      );
    });

    it('creates a version for the asset', async () => {
      const response = await request(app.getHttpServer())
        .post(`/assets/${assetId}/versions`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ version: '1', uri: 's3://bucket/asset-v1.bin' })
        .expect(201);

      expect(response.body).toMatchObject({
        assetId,
        version: '1',
        uri: 's3://bucket/asset-v1.bin',
      });
      expect(response.body.id).toEqual(expect.any(String));

      assetVersionId = response.body.id;
    });

    it('lists versions for the asset', async () => {
      const response = await request(app.getHttpServer())
        .get(`/assets/${assetId}/versions`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: assetVersionId, version: '1' }),
        ]),
      );
    });

    it('retrieves an asset version by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/asset-versions/${assetVersionId}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: assetVersionId,
        assetId,
        version: '1',
      });
    });

    it('rejects creating an asset version with a missing required field', async () => {
      await request(app.getHttpServer())
        .post(`/assets/${assetId}/versions`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ version: '2' })
        .expect(400);
    });

    describe('ownership isolation', () => {
      it('prevents user B from retrieving user A asset', async () => {
        await request(app.getHttpServer())
          .get(`/assets/${assetId}`)
          .set('Authorization', `Bearer ${apiKeyB}`)
          .expect(404);
      });

      it('returns no versions when user B lists under user A asset', async () => {
        // ListAssetVersionsService doesn't check the parent asset's
        // ownership before listing, unlike ListExperimentsService and
        // ListTrainingRunsService - it relies solely on the version query's
        // own user_id join, which correctly returns nothing instead of
        // leaking data, but as 200 [] rather than 404.
        const response = await request(app.getHttpServer())
          .get(`/assets/${assetId}/versions`)
          .set('Authorization', `Bearer ${apiKeyB}`)
          .expect(200);

        expect(response.body).toEqual([]);
      });

      it('prevents user B from retrieving user A asset version', async () => {
        await request(app.getHttpServer())
          .get(`/asset-versions/${assetVersionId}`)
          .set('Authorization', `Bearer ${apiKeyB}`)
          .expect(404);
      });

      it("does not include user A's assets in user B's list", async () => {
        const response = await request(app.getHttpServer())
          .get('/assets')
          .set('Authorization', `Bearer ${apiKeyB}`)
          .expect(200);

        expect(
          response.body.some((asset: { id: string }) => asset.id === assetId),
        ).toBe(false);
      });
    });

    describe('not found behavior', () => {
      it('returns 404 for a nonexistent asset', async () => {
        await request(app.getHttpServer())
          .get('/assets/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${apiKeyA}`)
          .expect(404);
      });

      it('returns 404 when creating a version under a nonexistent asset', async () => {
        await request(app.getHttpServer())
          .post('/assets/00000000-0000-0000-0000-000000000000/versions')
          .set('Authorization', `Bearer ${apiKeyA}`)
          .send({ version: '1', uri: 's3://bucket/x.bin' })
          .expect(404);
      });

      it('returns 404 for a nonexistent asset version', async () => {
        await request(app.getHttpServer())
          .get('/asset-versions/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${apiKeyA}`)
          .expect(404);
      });
    });
  });

  describe('datasets', () => {
    let datasetId: string;
    let datasetVersionId: string;

    it('creates a dataset for the authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .post('/datasets')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'E2E dataset' })
        .expect(201);

      expect(response.body).toMatchObject({ name: 'E2E dataset' });
      expect(response.body.id).toEqual(expect.any(String));

      datasetId = response.body.id;
    });

    it('retrieves the dataset by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/datasets/${datasetId}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: datasetId,
        name: 'E2E dataset',
      });
    });

    it('lists datasets for the authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/datasets')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: datasetId })]),
      );
    });

    it('creates a version for the dataset', async () => {
      const response = await request(app.getHttpServer())
        .post(`/datasets/${datasetId}/versions`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ version: '1', uri: 's3://bucket/dataset-v1.parquet' })
        .expect(201);

      expect(response.body).toMatchObject({
        datasetId,
        version: '1',
        uri: 's3://bucket/dataset-v1.parquet',
      });
      expect(response.body.id).toEqual(expect.any(String));

      datasetVersionId = response.body.id;
    });

    it('lists versions for the dataset', async () => {
      const response = await request(app.getHttpServer())
        .get(`/datasets/${datasetId}/versions`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: datasetVersionId, version: '1' }),
        ]),
      );
    });

    it('retrieves a dataset version by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/dataset-versions/${datasetVersionId}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: datasetVersionId,
        datasetId,
        version: '1',
      });
    });

    it('rejects creating a dataset version with a missing required field', async () => {
      await request(app.getHttpServer())
        .post(`/datasets/${datasetId}/versions`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ version: '2' })
        .expect(400);
    });

    describe('ownership isolation', () => {
      it('prevents user B from retrieving user A dataset', async () => {
        await request(app.getHttpServer())
          .get(`/datasets/${datasetId}`)
          .set('Authorization', `Bearer ${apiKeyB}`)
          .expect(404);
      });

      it('returns no versions when user B lists under user A dataset', async () => {
        // Same inconsistency as asset versions above: ownership is enforced
        // via the version query's own user_id join (nothing leaks) but
        // surfaces as 200 [] instead of a 404 on the unowned parent.
        const response = await request(app.getHttpServer())
          .get(`/datasets/${datasetId}/versions`)
          .set('Authorization', `Bearer ${apiKeyB}`)
          .expect(200);

        expect(response.body).toEqual([]);
      });

      it('prevents user B from retrieving user A dataset version', async () => {
        await request(app.getHttpServer())
          .get(`/dataset-versions/${datasetVersionId}`)
          .set('Authorization', `Bearer ${apiKeyB}`)
          .expect(404);
      });

      it("does not include user A's datasets in user B's list", async () => {
        const response = await request(app.getHttpServer())
          .get('/datasets')
          .set('Authorization', `Bearer ${apiKeyB}`)
          .expect(200);

        expect(
          response.body.some(
            (dataset: { id: string }) => dataset.id === datasetId,
          ),
        ).toBe(false);
      });
    });

    describe('not found behavior', () => {
      it('returns 404 for a nonexistent dataset', async () => {
        await request(app.getHttpServer())
          .get('/datasets/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${apiKeyA}`)
          .expect(404);
      });

      it('returns 404 when creating a version under a nonexistent dataset', async () => {
        await request(app.getHttpServer())
          .post('/datasets/00000000-0000-0000-0000-000000000000/versions')
          .set('Authorization', `Bearer ${apiKeyA}`)
          .send({ version: '1', uri: 's3://bucket/x.parquet' })
          .expect(404);
      });

      it('returns 404 for a nonexistent dataset version', async () => {
        await request(app.getHttpServer())
          .get('/dataset-versions/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${apiKeyA}`)
          .expect(404);
      });
    });
  });
});
