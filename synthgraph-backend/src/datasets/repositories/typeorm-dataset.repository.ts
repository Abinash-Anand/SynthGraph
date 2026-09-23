import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Dataset } from '../../database/entities/dataset.entity.js';
import type { DatasetRepository } from './dataset.repository.js';

@Injectable()
export class TypeOrmDatasetRepository implements DatasetRepository {
  constructor(
    @InjectRepository(Dataset)
    private readonly repository: Repository<Dataset>,
  ) {}

  async create(dataset: Dataset): Promise<Dataset> {
    return this.repository.save(dataset);
  }

  async findByIdForUser(
    datasetId: string,
    userId: string,
  ): Promise<Dataset | null> {
    return this.repository.findOne({
      where: {
        id: datasetId,
        userId,
        archivedAt: IsNull(),
      },
    });
  }

  async findAllForUser(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<Dataset[]> {
    return this.repository.find({
      where: {
        userId,
        archivedAt: IsNull(),
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
      skip: offset,
    });
  }

  async update(
    datasetId: string,
    userId: string,
    changes: { name?: string; description?: string },
  ): Promise<boolean> {
    const result = await this.repository.update(
      { id: datasetId, userId, archivedAt: IsNull() },
      changes,
    );

    return result.affected === 1;
  }

  async archive(datasetId: string, userId: string): Promise<boolean> {
    const result = await this.repository.update(
      { id: datasetId, userId, archivedAt: IsNull() },
      { archivedAt: new Date() },
    );

    return result.affected === 1;
  }
}