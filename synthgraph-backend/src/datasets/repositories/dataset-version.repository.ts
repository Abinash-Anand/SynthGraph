import { DatasetVersion } from '../../database/entities/dataset-version.entity.js';

export interface DatasetVersionRepository {
  create(version: DatasetVersion): Promise<DatasetVersion>;

  findByIdForUser(
    versionId: string,
    userId: string,
  ): Promise<DatasetVersion | null>;

  findAllForDataset(
    datasetId: string,
    userId: string,
  ): Promise<DatasetVersion[]>;

  existsByDatasetAndVersion(
    datasetId: string,
    version: string,
  ): Promise<boolean>;
}