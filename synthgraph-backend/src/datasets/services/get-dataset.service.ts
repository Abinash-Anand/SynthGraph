import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Dataset } from '../../database/entities/dataset.entity.js';
import { DATASET_REPOSITORY } from '../repositories/dataset.tokens.js';
import type { DatasetRepository } from '../repositories/dataset.repository.js';

@Injectable()
export class GetDatasetService {
  constructor(
    @Inject(DATASET_REPOSITORY)
    private readonly datasetRepository: DatasetRepository,
  ) {}

  async execute(
    datasetId: string,
    userId: string,
  ): Promise<Dataset> {
    const dataset =
      await this.datasetRepository.findByIdForUser(
        datasetId,
        userId,
      );

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    return dataset;
  }
}