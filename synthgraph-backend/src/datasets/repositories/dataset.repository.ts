import type { Dataset } from '../../database/entities/dataset.entity.js';

export interface DatasetRepository {
  create(dataset: Dataset): Promise<Dataset>;

  findByIdForUser(
    datasetId: string,
    userId: string,
  ): Promise<Dataset | null>;

  findAllForUser(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<Dataset[]>;

  update(
    datasetId: string,
    userId: string,
    changes: { name?: string; description?: string },
  ): Promise<boolean>;

  archive(datasetId: string, userId: string): Promise<boolean>;
}