import type { Dataset } from '../../database/entities/dataset.entity.js';

export const DATASET_REPOSITORY = Symbol('DATASET_REPOSITORY');

export interface DatasetRepository {
  create(dataset: Dataset): Promise<Dataset>;

  findByIdForUser(
    datasetId: string,
    userId: string,
  ): Promise<Dataset | null>;

  findAllForUser(userId: string): Promise<Dataset[]>;
}