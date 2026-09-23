import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatasetVersion } from '../../database/entities/dataset-version.entity.js';

import { DATASET_REPOSITORY, DATASET_VERSION_REPOSITORY } from '../repositories/dataset.tokens.js';

import type { DatasetRepository } from '../repositories/dataset.repository.js';
import type { DatasetVersionRepository } from '../repositories/dataset-version.repository.js';

@Injectable()
export class ListDatasetVersionsService {
  constructor(
    @Inject(DATASET_VERSION_REPOSITORY)
    private readonly repository: DatasetVersionRepository,

    @Inject(DATASET_REPOSITORY)
    private readonly datasetRepository: DatasetRepository,
  ) {}

  async execute(
    datasetId: string,
    userId: string,
    limit: number,
    offset: number,
  ): Promise<DatasetVersion[]> {
    const dataset = await this.datasetRepository.findByIdForUser(
      datasetId,
      userId,
    );

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    return this.repository.findAllForDataset(
      datasetId,
      userId,
      limit,
      offset,
    );
  }
}