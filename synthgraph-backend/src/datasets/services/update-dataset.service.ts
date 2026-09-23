import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Dataset } from '../../database/entities/dataset.entity.js';
import type { DatasetRepository } from '../repositories/dataset.repository.js';
import { DATASET_REPOSITORY } from '../repositories/dataset.tokens.js';

@Injectable()
export class UpdateDatasetService {
  constructor(
    @Inject(DATASET_REPOSITORY)
    private readonly datasetRepository: DatasetRepository,
  ) {}

  async execute(
    datasetId: string,
    userId: string,
    changes: { name?: string; description?: string },
  ): Promise<Dataset> {
    if (changes.name === undefined && changes.description === undefined) {
      throw new BadRequestException(
        'At least one of name or description must be provided',
      );
    }

    const updated = await this.datasetRepository.update(
      datasetId,
      userId,
      changes,
    );

    if (!updated) {
      throw new NotFoundException('Dataset not found');
    }

    const dataset = await this.datasetRepository.findByIdForUser(
      datasetId,
      userId,
    );

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    return dataset;
  }
}
