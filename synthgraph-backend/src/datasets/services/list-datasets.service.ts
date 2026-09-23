import { Inject, Injectable } from '@nestjs/common';

import { Dataset } from '../../database/entities/dataset.entity.js';
import { DATASET_REPOSITORY } from '../repositories/dataset.tokens.js';
import type { DatasetRepository } from '../repositories/dataset.repository.js';

@Injectable()
export class ListDatasetsService {
  constructor(
    @Inject(DATASET_REPOSITORY)
    private readonly datasetRepository: DatasetRepository,
  ) {}

  async execute(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<Dataset[]> {
    return this.datasetRepository.findAllForUser(userId, limit, offset);
  }
}