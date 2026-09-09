import { Inject, Injectable } from '@nestjs/common';

import { Dataset } from '../../database/entities/dataset.entity.js';

import { DATASET_REPOSITORY } from '../repositories/dataset.tokens.js';
import type { DatasetRepository } from '../repositories/dataset.repository.js';

@Injectable()
export class CreateDatasetService {
  constructor(
    @Inject(DATASET_REPOSITORY)
    private readonly datasetRepository: DatasetRepository,
  ) {}

  async execute(
    userId: string,
    input: {
      name: string;
      description?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<Dataset> {
    const dataset = Object.assign(new Dataset(), {
      userId,
      name: input.name,
      description: input.description ?? null,
      metadata: input.metadata ?? {},
    });

    return this.datasetRepository.create(dataset);
  }
}