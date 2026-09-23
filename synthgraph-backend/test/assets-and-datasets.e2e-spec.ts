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

    it('paginates the asset list via limit/offset', async () => {
      // Self-contained: creates its own two assets (most recent, by the
      // list's createdAt DESC order) so the two pages are deterministic
      // regardless of how many other assets userA already has.
      const older = await request(app.getHttpServer())
        .post('/assets')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'Pagination Older Asset', type: 'model' })
        .expect(201);

      const newer = await request(app.getHttpServer())
        .post('/assets')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'Pagination Newer Asset', type: 'model' })
        .expect(201);

      const firstPage = await request(app.getHttpServer())
        .get('/assets?limit=1&offset=0')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(firstPage.body).toHaveLength(1);
      expect(firstPage.body[0].id).toBe(newer.body.id);

      const secondPage = await request(app.getHttpServer())
        .get('/assets?limit=1&offset=1')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(secondPage.body).toHaveLength(1);
      expect(secondPage.body[0].id).toBe(older.body.id);

      await assetRepository.delete([older.body.id, newer.body.id]);
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

    it('paginates the asset version list via limit/offset', async () => {
      // Self-contained: creates two extra versions under the shared
      // asset fixture and cleans them up, rather than relying on the
      // single "version 1" fixture created earlier in this file.
      const older = await request(app.getHttpServer())
        .post(`/assets/${assetId}/versions`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ version: 'pagination-older', uri: 's3://bucket/older.bin' })
        .expect(201);

      const newer = await request(app.getHttpServer())
        .post(`/assets/${assetId}/versions`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ version: 'pagination-newer', uri: 's3://bucket/newer.bin' })
        .expect(201);

      const firstPage = await request(app.getHttpServer())
        .get(`/assets/${assetId}/versions?limit=1&offset=0`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(firstPage.body).toHaveLength(1);
      expect(firstPage.body[0].id).toBe(newer.body.id);

      const secondPage = await request(app.getHttpServer())
        .get(`/assets/${assetId}/versions?limit=1&offset=1`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(secondPage.body).toHaveLength(1);
      expect(secondPage.body[0].id).toBe(older.body.id);

      await assetVersionRepository.delete([older.body.id, newer.body.id]);
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

    it('updates name and description via PATCH', async () => {
      const created = await request(app.getHttpServer())
        .post('/assets')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'Patch Original Asset', description: 'Original' })
        .expect(201);

      const patched = await request(app.getHttpServer())
        .patch(`/assets/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'Patch Updated Asset', description: 'Updated' })
        .expect(200);

      expect(patched.body).toMatchObject({
        id: created.body.id,
        name: 'Patch Updated Asset',
        description: 'Updated',
      });

      await assetRepository.delete(created.body.id);
    });

    it('rejects an empty PATCH body', async () => {
      const created = await request(app.getHttpServer())
        .post('/assets')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'Patch Empty Asset' })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/assets/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({})
        .expect(400);

      await assetRepository.delete(created.body.id);
    });

    it('does not allow patching another user asset', async () => {
      const created = await request(app.getHttpServer())
        .post('/assets')
        .set('Authorization', `Bearer ${apiKeyB}`)
        .send({ name: 'Patch User B Asset' })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/assets/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'Hijacked' })
        .expect(404);

      await assetRepository.delete(created.body.id);
    });

    it('archives an asset via DELETE, hiding it from GET and list', async () => {
      const created = await request(app.getHttpServer())
        .post('/assets')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'Archive Me Asset' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/assets/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/assets/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(404);

      const listed = await request(app.getHttpServer())
        .get('/assets?limit=200')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(
        listed.body.some(
          (asset: { id: string }) => asset.id === created.body.id,
        ),
      ).toBe(false);

      // Archiving an already-archived asset is not idempotent - matches
      // ApiKeyManagementService.revoke()'s convention elsewhere in this API.
      await request(app.getHttpServer())
        .delete(`/assets/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(404);

      await assetRepository.delete(created.body.id);
    });

    it('does not allow archiving another user asset', async () => {
      const created = await request(app.getHttpServer())
        .post('/assets')
        .set('Authorization', `Bearer ${apiKeyB}`)
        .send({ name: 'Archive User B Asset' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/assets/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(404);

      await assetRepository.delete(created.body.id);
    });

    describe('ownership isolation', () => {
      it('prevents user B from retrieving user A asset', async () => {
        await request(app.getHttpServer())
          .get(`/assets/${assetId}`)
          .set('Authorization', `Bearer ${apiKeyB}`)
          .expect(404);
      });

      it('prevents user B from listing user A asset versions', async () => {
        await request(app.getHttpServer())
          .get(`/assets/${assetId}/versions`)
          .set('Authorization', `Bearer ${apiKeyB}`)
          .expect(404);
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

      it('returns 404 when listing versions under a nonexistent asset', async () => {
        await request(app.getHttpServer())
          .get('/assets/00000000-0000-0000-0000-000000000000/versions')
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

    it('paginates the dataset list via limit/offset', async () => {
      // Self-contained: creates its own two datasets (most recent, by the
      // list's createdAt DESC order) so the two pages are deterministic
      // regardless of how many other datasets userA already has.
      const older = await request(app.getHttpServer())
        .post('/datasets')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'Pagination Older Dataset' })
        .expect(201);

      const newer = await request(app.getHttpServer())
        .post('/datasets')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'Pagination Newer Dataset' })
        .expect(201);

      const firstPage = await request(app.getHttpServer())
        .get('/datasets?limit=1&offset=0')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(firstPage.body).toHaveLength(1);
      expect(firstPage.body[0].id).toBe(newer.body.id);

      const secondPage = await request(app.getHttpServer())
        .get('/datasets?limit=1&offset=1')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(secondPage.body).toHaveLength(1);
      expect(secondPage.body[0].id).toBe(older.body.id);

      await datasetRepository.delete([older.body.id, newer.body.id]);
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

    it('paginates the dataset version list via limit/offset', async () => {
      // Self-contained: creates two extra versions under the shared
      // dataset fixture and cleans them up, rather than relying on the
      // single "version 1" fixture created earlier in this file.
      const older = await request(app.getHttpServer())
        .post(`/datasets/${datasetId}/versions`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({
          version: 'pagination-older',
          uri: 's3://bucket/older.parquet',
        })
        .expect(201);

      const newer = await request(app.getHttpServer())
        .post(`/datasets/${datasetId}/versions`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({
          version: 'pagination-newer',
          uri: 's3://bucket/newer.parquet',
        })
        .expect(201);

      const firstPage = await request(app.getHttpServer())
        .get(`/datasets/${datasetId}/versions?limit=1&offset=0`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(firstPage.body).toHaveLength(1);
      expect(firstPage.body[0].id).toBe(newer.body.id);

      const secondPage = await request(app.getHttpServer())
        .get(`/datasets/${datasetId}/versions?limit=1&offset=1`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(secondPage.body).toHaveLength(1);
      expect(secondPage.body[0].id).toBe(older.body.id);

      await datasetVersionRepository.delete([older.body.id, newer.body.id]);
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

    it('updates name and description via PATCH', async () => {
      const created = await request(app.getHttpServer())
        .post('/datasets')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'Patch Original Dataset', description: 'Original' })
        .expect(201);

      const patched = await request(app.getHttpServer())
        .patch(`/datasets/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'Patch Updated Dataset', description: 'Updated' })
        .expect(200);

      expect(patched.body).toMatchObject({
        id: created.body.id,
        name: 'Patch Updated Dataset',
        description: 'Updated',
      });

      await datasetRepository.delete(created.body.id);
    });

    it('rejects an empty PATCH body', async () => {
      const created = await request(app.getHttpServer())
        .post('/datasets')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'Patch Empty Dataset' })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/datasets/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({})
        .expect(400);

      await datasetRepository.delete(created.body.id);
    });

    it('does not allow patching another user dataset', async () => {
      const created = await request(app.getHttpServer())
        .post('/datasets')
        .set('Authorization', `Bearer ${apiKeyB}`)
        .send({ name: 'Patch User B Dataset' })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/datasets/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'Hijacked' })
        .expect(404);

      await datasetRepository.delete(created.body.id);
    });

    it('archives a dataset via DELETE, hiding it from GET and list', async () => {
      const created = await request(app.getHttpServer())
        .post('/datasets')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .send({ name: 'Archive Me Dataset' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/datasets/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/datasets/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(404);

      const listed = await request(app.getHttpServer())
        .get('/datasets?limit=200')
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(200);

      expect(
        listed.body.some(
          (dataset: { id: string }) => dataset.id === created.body.id,
        ),
      ).toBe(false);

      // Archiving an already-archived dataset is not idempotent - matches
      // ApiKeyManagementService.revoke()'s convention elsewhere in this API.
      await request(app.getHttpServer())
        .delete(`/datasets/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(404);

      await datasetRepository.delete(created.body.id);
    });

    it('does not allow archiving another user dataset', async () => {
      const created = await request(app.getHttpServer())
        .post('/datasets')
        .set('Authorization', `Bearer ${apiKeyB}`)
        .send({ name: 'Archive User B Dataset' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/datasets/${created.body.id}`)
        .set('Authorization', `Bearer ${apiKeyA}`)
        .expect(404);

      await datasetRepository.delete(created.body.id);
    });

    describe('ownership isolation', () => {
      it('prevents user B from retrieving user A dataset', async () => {
        await request(app.getHttpServer())
          .get(`/datasets/${datasetId}`)
          .set('Authorization', `Bearer ${apiKeyB}`)
          .expect(404);
      });

      it('prevents user B from listing user A dataset versions', async () => {
        await request(app.getHttpServer())
          .get(`/datasets/${datasetId}/versions`)
          .set('Authorization', `Bearer ${apiKeyB}`)
          .expect(404);
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

      it('returns 404 when listing versions under a nonexistent dataset', async () => {
        await request(app.getHttpServer())
          .get('/datasets/00000000-0000-0000-0000-000000000000/versions')
          .set('Authorization', `Bearer ${apiKeyA}`)
          .expect(404);
      });
    });
  });
});
