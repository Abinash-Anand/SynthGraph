import type { Asset } from '../../database/entities/asset.entity.js';

export interface AssetRepository {
  create(asset: Asset): Promise<Asset>;

  findByIdForUser(
    assetId: string,
    userId: string,
  ): Promise<Asset | null>;

  findAllForUser(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<Asset[]>;
}
