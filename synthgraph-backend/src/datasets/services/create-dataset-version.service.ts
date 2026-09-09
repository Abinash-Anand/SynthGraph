import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatasetVersion } from '../../database/entities/dataset-version.entity.js';

import {
  DATASET_REPOSITORY,
  DATASET_VERSION_REPOSITORY,
} from '../repositories/dataset.tokens.js';

import type { DatasetRepository } from '../repositories/dataset.repository.js';
import type { DatasetVersionRepository } from '../repositories/dataset-version.repository.js';

@Injectable()
export class CreateDatasetVersionService {
  constructor(
    @Inject(DATASET_REPOSITORY)
    private readonly datasetRepository: DatasetRepository,

    @Inject(DATASET_VERSION_REPOSITORY)
    private readonly datasetVersionRepository: DatasetVersionRepository,
  ) {}

  async execute(
    userId: string,
    datasetId: string,
    input: {
      version: string;
      uri: string;
      format?: string;
      size?: number;
      checksum?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<DatasetVersion> {
    const dataset =
      await this.datasetRepository.findByIdForUser(
        datasetId,
        userId,
      );

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    const exists =
      await this.datasetVersionRepository.existsByDatasetAndVersion(
        datasetId,
        input.version,
      );

    if (exists) {
      throw new ConflictException(
        'Dataset version already exists',
      );
    }

    const datasetVersion = Object.assign(
      new DatasetVersion(),
      {
        datasetId,
        version: input.version,
        uri: input.uri,
        format: input.format ?? null,
        size:
          input.size === undefined
            ? null
            : String(input.size),
        checksum: input.checksum ?? null,
        metadata: input.metadata ?? {},
      },
    );

    return this.datasetVersionRepository.create(
      datasetVersion,
    );
  }
}