import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatasetVersion } from '../../database/entities/dataset-version.entity.js';

import { DATASET_VERSION_REPOSITORY } from '../repositories/dataset.tokens.js';

import type { DatasetVersionRepository } from '../repositories/dataset-version.repository.js';

@Injectable()
export class GetDatasetVersionService {
  constructor(
    @Inject(DATASET_VERSION_REPOSITORY)
    private readonly repository: DatasetVersionRepository,
  ) {}

  async execute(
    versionId: string,
    userId: string,
  ): Promise<DatasetVersion> {
    const version =
      await this.repository.findByIdForUser(
        versionId,
        userId,
      );

    if (!version) {
      throw new NotFoundException(
        'Dataset version not found',
      );
    }

    return version;
  }
}