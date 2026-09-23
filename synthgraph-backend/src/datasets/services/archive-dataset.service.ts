import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { DatasetRepository } from '../repositories/dataset.repository.js';
import { DATASET_REPOSITORY } from '../repositories/dataset.tokens.js';

@Injectable()
export class ArchiveDatasetService {
  constructor(
    @Inject(DATASET_REPOSITORY)
    private readonly datasetRepository: DatasetRepository,
  ) {}

  async execute(datasetId: string, userId: string): Promise<void> {
    const archived = await this.datasetRepository.archive(datasetId, userId);

    if (!archived) {
      throw new NotFoundException('Dataset not found');
    }
  }
}
