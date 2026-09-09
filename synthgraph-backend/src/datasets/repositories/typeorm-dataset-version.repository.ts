import { Repository } from 'typeorm';

import { DatasetVersion } from '../../database/entities/dataset-version.entity.js';
import { DatasetVersionRepository } from './dataset-version.repository.js';

export class TypeOrmDatasetVersionRepository
  implements DatasetVersionRepository
{
  constructor(
    private readonly repository: Repository<DatasetVersion>,
  ) {}

  async create(version: DatasetVersion): Promise<DatasetVersion> {
    return this.repository.save(version);
  }

  async findByIdForUser(
    versionId: string,
    userId: string,
  ): Promise<DatasetVersion | null> {
    return this.repository
      .createQueryBuilder('version')
      .innerJoin('version.dataset', 'dataset')
      .where('version.id = :versionId', { versionId })
      .andWhere('dataset.user_id = :userId', { userId })
      .getOne();
  }

  async findAllForDataset(
    datasetId: string,
    userId: string,
  ): Promise<DatasetVersion[]> {
    return this.repository
      .createQueryBuilder('version')
      .innerJoin('version.dataset', 'dataset')
      .where('version.dataset_id = :datasetId', { datasetId })
      .andWhere('dataset.user_id = :userId', { userId })
      .orderBy('version.created_at', 'DESC')
      .getMany();
  }

  async existsByDatasetAndVersion(
    datasetId: string,
    version: string,
  ): Promise<boolean> {
    return this.repository.exists({
      where: {
        datasetId,
        version,
      },
    });
  }
}