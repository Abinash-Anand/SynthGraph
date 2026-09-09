import { Inject, Injectable } from '@nestjs/common';

import { DatasetVersion } from '../../database/entities/dataset-version.entity.js';

import { DATASET_VERSION_REPOSITORY } from '../repositories/dataset.tokens.js';

import type { DatasetVersionRepository } from '../repositories/dataset-version.repository.js';

@Injectable()
export class ListDatasetVersionsService {
  constructor(
    @Inject(DATASET_VERSION_REPOSITORY)
    private readonly repository: DatasetVersionRepository,
  ) {}

  async execute(
    datasetId: string,
    userId: string,
  ): Promise<DatasetVersion[]> {
    return this.repository.findAllForDataset(
      datasetId,
      userId,
    );
  }
}