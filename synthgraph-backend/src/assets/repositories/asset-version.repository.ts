import { AssetVersion } from '../../database/entities/asset-version.entity.js';

export interface AssetVersionRepository {
  create(version: AssetVersion): Promise<AssetVersion>;

  findByIdForUser(
    versionId: string,
    userId: string,
  ): Promise<AssetVersion | null>;

  findAllForAsset(
    assetId: string,
    userId: string,
  ): Promise<AssetVersion[]>;

  existsByAssetAndVersion(
    assetId: string,
    version: string,
  ): Promise<boolean>;
}
